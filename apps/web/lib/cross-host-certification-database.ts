import { randomUUID } from "node:crypto";

import {
  compareHostCertifications,
  crossHostCertificationDescriptor,
  runUniversalHostCertification,
  type HostCertificationEvidenceInput,
  type UniversalHostCertification
} from "./cross-host-certification";
import { withUserDatabase } from "./database";

type RawRow = Record<string, unknown>;

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function dateIso(value: unknown) {
  return new Date(String(value)).toISOString();
}

async function requireWorkspaceAdmin(
  client: import("pg").PoolClient,
  workspaceId: string
) {
  const result = await client.query<{ role: string }>(
    `select role
     from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id',true),'')
     limit 1`,
    [workspaceId]
  );
  if (!["owner", "admin"].includes(result.rows[0]?.role ?? "")) {
    throw new Error("cross_host_workspace_admin_required");
  }
}

function runRow(row: RawRow) {
  return {
    runId: String(row.run_id),
    observationId: String(row.observation_id),
    moduleHostInstanceId: String(row.module_host_instance_id),
    workspaceId: String(row.workspace_id),
    suiteVersion: String(row.suite_version),
    evidenceKind: String(row.evidence_kind),
    compatibilityState: String(row.compatibility_state),
    healthState: String(row.health_state),
    passedCount: Number(row.passed_count),
    failedCount: Number(row.failed_count),
    blockedCount: Number(row.blocked_count),
    overallOutcome: String(row.overall_outcome),
    certificationClass: String(row.certification_class),
    liveCertified: row.live_certified === true,
    fixtureCertified: row.fixture_certified === true,
    regressionCount: Number(row.regression_count),
    regressions: array(row.regression_snapshot).map((item) =>
      object(item)
    ),
    certification: object(row.certification_snapshot),
    generatedAt: dateIso(row.generated_at)
  };
}

function observationRow(row: RawRow) {
  return {
    observationId: String(row.observation_id),
    moduleHostInstanceId: String(row.module_host_instance_id),
    workspaceId: String(row.workspace_id),
    evidenceKind: String(row.evidence_kind),
    observedModuleVersion: String(row.observed_module_version),
    hostContractVersion: Number(row.host_contract_version),
    protocolVersion: Number(row.protocol_version),
    adapterKind: String(row.adapter_kind),
    compatibilityEvidenceRefs: array(
      row.compatibility_evidence_refs
    ).map(String),
    checks: object(row.checks_snapshot),
    telemetry: object(row.telemetry_snapshot),
    observedAt: dateIso(row.observed_at),
    recordedAt: dateIso(row.recorded_at)
  };
}

function assertionRow(row: RawRow) {
  return {
    assertionId: String(row.assertion_id),
    runId: String(row.run_id),
    moduleHostInstanceId: String(row.module_host_instance_id),
    workspaceId: String(row.workspace_id),
    dimension: String(row.dimension),
    outcome: String(row.outcome),
    synthetic: row.synthetic === true,
    evidenceRefs: array(row.evidence_refs).map(String),
    detail: String(row.detail),
    checkedAt: dateIso(row.checked_at)
  };
}

function hostRow(row: RawRow) {
  return {
    moduleHostInstanceId: String(row.module_host_instance_id),
    workspaceId: String(row.workspace_id),
    hostApplicationId: String(row.host_application_id),
    hostInstanceId: String(row.host_instance_id),
    environment: String(row.environment),
    currentVersion: String(row.current_version),
    lastKnownGoodVersion: String(row.last_known_good_version),
    lifecycleState: String(row.lifecycle_state),
    hostContractVersion: Number(row.host_contract_version),
    protocolVersion: Number(row.protocol_version),
    adapterKind: String(row.adapter_kind) as
      | "react"
      | "nextjs"
      | "vite"
      | "vanilla"
      | "electron",
    updatedAt: dateIso(row.updated_at)
  };
}

export async function certifyModuleHost(
  userId: string,
  input: {
    moduleHostInstanceId: string;
    evidence: HostCertificationEvidenceInput;
  }
) {
  return withUserDatabase(userId, async (client) => {
    const hostResult = await client.query(
      `select
         i.*,
         e.host_contract_version,
         e.protocol_version,
         e.adapter_kind
       from app.module_host_instances i
       join app.module_host_enrollments e
         on e.enrollment_id=i.enrollment_id
       where i.module_host_instance_id=$1
       limit 1`,
      [String(input.moduleHostInstanceId ?? "")]
    );
    const host = hostResult.rows[0] as RawRow | undefined;
    if (!host) {
      throw new Error("cross_host_instance_not_found");
    }

    const workspaceId = String(host.workspace_id);
    await requireWorkspaceAdmin(client, workspaceId);

    const certification = runUniversalHostCertification({
      expected: {
        currentModuleVersion: String(host.current_version),
        hostContractVersion: Number(host.host_contract_version),
        protocolVersion: Number(host.protocol_version),
        adapterKind: String(host.adapter_kind) as
          | "react"
          | "nextjs"
          | "vite"
          | "vanilla"
          | "electron"
      },
      evidence: input.evidence
    });

    const previousResult = await client.query(
      `select certification_snapshot
       from app.module_host_certification_runs
       where module_host_instance_id=$1
       order by generated_at desc
       limit 1`,
      [String(host.module_host_instance_id)]
    );
    const previous = previousResult.rows[0]?.certification_snapshot
      ? (previousResult.rows[0]
          .certification_snapshot as UniversalHostCertification)
      : null;
    const regressions = compareHostCertifications(
      certification,
      previous
    );

    const observationId = randomUUID();
    const runId = randomUUID();

    await client.query(
      `insert into app.module_host_observations (
        observation_id,module_host_instance_id,owner_user_id,workspace_id,
        evidence_kind,observed_module_version,host_contract_version,
        protocol_version,adapter_kind,compatibility_evidence_refs,
        checks_snapshot,telemetry_snapshot,observed_at,recorded_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,
        $11::jsonb,$12::jsonb,$13,$3
      )`,
      [
        observationId,
        String(host.module_host_instance_id),
        userId,
        workspaceId,
        input.evidence.sourceKind,
        input.evidence.observedModuleVersion,
        input.evidence.hostContractVersion,
        input.evidence.protocolVersion,
        input.evidence.adapterKind,
        JSON.stringify(input.evidence.compatibilityEvidenceRefs),
        JSON.stringify(input.evidence.checks),
        JSON.stringify(certification.telemetry),
        certification.observedAt
      ]
    );

    const result = await client.query(
      `insert into app.module_host_certification_runs (
        run_id,observation_id,module_host_instance_id,owner_user_id,
        workspace_id,suite_version,evidence_kind,compatibility_state,
        health_state,passed_count,failed_count,blocked_count,
        overall_outcome,certification_class,live_certified,
        fixture_certified,regression_count,regression_snapshot,
        certification_snapshot,generated_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
        $15,$16,$17,$18::jsonb,$19::jsonb,$4
      )
      returning *`,
      [
        runId,
        observationId,
        String(host.module_host_instance_id),
        userId,
        workspaceId,
        certification.suiteVersion,
        certification.sourceKind,
        certification.compatibility.state,
        certification.health,
        certification.summary.passed,
        certification.summary.failed,
        certification.summary.blocked,
        certification.summary.overallOutcome,
        certification.certificationClass,
        certification.liveCertified,
        certification.fixtureCertified,
        regressions.length,
        JSON.stringify(regressions),
        JSON.stringify(certification)
      ]
    );

    for (const assertion of certification.assertions) {
      await client.query(
        `insert into app.module_host_certification_assertions (
          assertion_id,run_id,module_host_instance_id,owner_user_id,
          workspace_id,dimension,outcome,synthetic,evidence_refs,
          detail,generated_by
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$4
        )`,
        [
          randomUUID(),
          runId,
          String(host.module_host_instance_id),
          userId,
          workspaceId,
          assertion.dimension,
          assertion.outcome,
          assertion.synthetic,
          JSON.stringify(assertion.evidenceRefs),
          assertion.detail
        ]
      );
    }

    return runRow(result.rows[0] as RawRow);
  });
}

export async function listCrossHostCertificationForUser(
  userId: string
) {
  return withUserDatabase(userId, async (client) => {
    const [hostsResult, runsResult, observationsResult, assertionsResult] =
      await Promise.all([
        client.query(
          `select
             i.*,
             e.host_contract_version,
             e.protocol_version,
             e.adapter_kind
           from app.module_host_instances i
           join app.module_host_enrollments e
             on e.enrollment_id=i.enrollment_id
           order by i.updated_at desc
           limit 200`
        ),
        client.query(
          `select *
           from app.module_host_certification_runs
           order by generated_at desc
           limit 500`
        ),
        client.query(
          `select *
           from app.module_host_observations
           order by observed_at desc
           limit 500`
        ),
        client.query(
          `select *
           from app.module_host_certification_assertions
           where run_id in (
             select run_id
             from app.module_host_certification_runs
             order by generated_at desc
             limit 500
           )
           order by checked_at desc
           limit 5000`
        )
      ]);

    const hosts = hostsResult.rows.map((row) =>
      hostRow(row as RawRow)
    );
    const runs = runsResult.rows.map((row) =>
      runRow(row as RawRow)
    );
    const observations = observationsResult.rows.map((row) =>
      observationRow(row as RawRow)
    );
    const assertions = assertionsResult.rows.map((row) =>
      assertionRow(row as RawRow)
    );

    const latestRunByHost = new Map<string, ReturnType<typeof runRow>>();
    for (const run of runs) {
      if (!latestRunByHost.has(run.moduleHostInstanceId)) {
        latestRunByHost.set(run.moduleHostInstanceId, run);
      }
    }

    const compatibilityMatrix = hosts.map((host) => {
      const latest = latestRunByHost.get(
        host.moduleHostInstanceId
      );
      const certification = latest?.certification ?? {};
      const compatibility = object(
        certification.compatibility
      );
      return {
        moduleHostInstanceId: host.moduleHostInstanceId,
        hostApplicationId: host.hostApplicationId,
        hostInstanceId: host.hostInstanceId,
        environment: host.environment,
        adapterKind: host.adapterKind,
        expectedModuleVersion: host.currentVersion,
        hostContractVersion: host.hostContractVersion,
        protocolVersion: host.protocolVersion,
        compatibilityState:
          latest?.compatibilityState ?? "no-evidence",
        observedModuleVersion:
          typeof certification.observedAt === "string"
            ? observations.find(
                (item) =>
                  item.observationId === latest?.observationId
              )?.observedModuleVersion ?? null
            : null,
        versionMatch:
          typeof compatibility.moduleVersionMatch === "boolean"
            ? compatibility.moduleVersionMatch
            : null,
        hostContractMatch:
          typeof compatibility.hostContractMatch === "boolean"
            ? compatibility.hostContractMatch
            : null,
        protocolMatch:
          typeof compatibility.protocolMatch === "boolean"
            ? compatibility.protocolMatch
            : null,
        adapterMatch:
          typeof compatibility.adapterMatch === "boolean"
            ? compatibility.adapterMatch
            : null,
        healthState: latest?.healthState ?? "unknown",
        certificationClass:
          latest?.certificationClass ?? "not-certified",
        regressionCount: latest?.regressionCount ?? 0,
        generatedAt: latest?.generatedAt ?? null
      };
    });

    return {
      descriptor: crossHostCertificationDescriptor,
      hosts,
      compatibilityMatrix,
      runs,
      observations,
      assertions,
      summary: {
        hosts: hosts.length,
        liveCertified: runs.filter(
          (item, index, items) =>
            item.liveCertified &&
            items.findIndex(
              (candidate) =>
                candidate.moduleHostInstanceId ===
                item.moduleHostInstanceId
            ) === index
        ).length,
        fixtureCertified: runs.filter(
          (item, index, items) =>
            item.fixtureCertified &&
            items.findIndex(
              (candidate) =>
                candidate.moduleHostInstanceId ===
                item.moduleHostInstanceId
            ) === index
        ).length,
        hostsWithRegressions: compatibilityMatrix.filter(
          (item) => item.regressionCount > 0
        ).length
      }
    };
  });
}
