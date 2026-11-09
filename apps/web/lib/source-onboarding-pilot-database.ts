import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import {
  SOURCE_ONBOARDING_OUTCOMES,
  SOURCE_ONBOARDING_PREREQUISITES,
  SUPERVISED_PILOT_OUTCOMES,
  composeSourceOnboardingModel,
  validateSourceOnboardingAssertions,
  validateSourceOnboardingRun,
  type SourceOnboardingAssertion,
  type SourceOnboardingOutcome,
  type SourceOnboardingPrerequisite,
  type SupervisedPilotOutcome
} from "./source-onboarding-pilot-core";
import {
  MASTER_SHELL_SOURCE_IDS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";
import { listMasterShellSourceRegistryForUser } from "./master-shell-source-registry-database";
import { listMasterSecurityCertificationForUser } from "./master-security-certification-database";

type RunRow = {
  run_id: string;
  actor_user_id: string;
  source_id: MasterShellSourceId;
  onboarding_version: string;
  reviewer: string;
  observed_at: Date;
  expires_at: Date;
  branch: string;
  commit_sha: string;
  notes: string | null;
  pilot_outcome: SupervisedPilotOutcome;
  pilot_started_at: Date | null;
  pilot_ended_at: Date | null;
  pilot_evidence_uri: string | null;
  pilot_detail: string | null;
  recorded_at: Date;
};

type AssertionRow = {
  assertion_id: string;
  run_id: string;
  prerequisite: SourceOnboardingPrerequisite;
  outcome: SourceOnboardingOutcome;
  evidence_uri: string;
  detail: string;
  recorded_at: Date;
};

async function requireSuiteAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(
    `select exists (
       select 1
       from app.workspace_members wm
       where wm.user_id=nullif(current_setting('app.user_id',true),'')
         and wm.role in ('owner','admin')
     ) as allowed`
  );
  if (!result.rows[0]?.allowed) {
    throw new Error("source_onboarding_suite_admin_required");
  }
}

function includes<T extends string>(values: readonly T[], value: string): value is T {
  return values.includes(value as T);
}

function parseSourceId(value: unknown): MasterShellSourceId {
  const sourceId = String(value ?? "");
  if (!MASTER_SHELL_SOURCE_IDS.includes(sourceId as MasterShellSourceId)) {
    throw new Error("source_onboarding_source_invalid");
  }
  return sourceId as MasterShellSourceId;
}

function parseAssertions(values: unknown) {
  if (!Array.isArray(values)) {
    throw new Error("source_onboarding_assertions_invalid");
  }
  const assertions = values.map((value) => {
    if (!value || typeof value !== "object") {
      throw new Error("source_onboarding_assertion_invalid");
    }
    const item = value as Record<string, unknown>;
    const prerequisite = String(item.prerequisite ?? "");
    const outcome = String(item.outcome ?? "");
    if (!includes(SOURCE_ONBOARDING_PREREQUISITES, prerequisite)) {
      throw new Error("source_onboarding_prerequisite_invalid");
    }
    if (!includes(SOURCE_ONBOARDING_OUTCOMES, outcome)) {
      throw new Error("source_onboarding_outcome_invalid");
    }
    return {
      prerequisite,
      outcome,
      evidenceURI: String(item.evidenceURI ?? ""),
      detail: String(item.detail ?? "")
    } satisfies SourceOnboardingAssertion;
  });
  return validateSourceOnboardingAssertions(assertions);
}

function rowAssertions(
  runId: string,
  assertions: readonly AssertionRow[]
): SourceOnboardingAssertion[] {
  return assertions
    .filter((row) => row.run_id === runId)
    .map((row) => ({
      prerequisite: row.prerequisite,
      outcome: row.outcome,
      evidenceURI: row.evidence_uri,
      detail: row.detail
    }));
}

function rowToRun(row: RunRow, assertions: readonly AssertionRow[]) {
  return validateSourceOnboardingRun({
    runId: row.run_id,
    sourceId: row.source_id,
    onboardingVersion: Number(row.onboarding_version),
    reviewer: row.reviewer,
    observedAt: row.observed_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    branch: row.branch,
    commitSha: row.commit_sha,
    notes: row.notes,
    pilotOutcome: row.pilot_outcome,
    pilotStartedAt: row.pilot_started_at?.toISOString() ?? null,
    pilotEndedAt: row.pilot_ended_at?.toISOString() ?? null,
    pilotEvidenceURI: row.pilot_evidence_uri,
    pilotDetail: row.pilot_detail,
    recordedAt: row.recorded_at.toISOString(),
    assertions: rowAssertions(row.run_id, assertions)
  });
}

export async function listSourceOnboardingForUser(
  userId: string,
  now = new Date()
) {
  const [registry, security, evidence] = await Promise.all([
    listMasterShellSourceRegistryForUser(userId, now),
    listMasterSecurityCertificationForUser(userId, now),
    withUserDatabase(userId, async (client) => {
      await requireSuiteAdmin(client);
      const runs = await client.query<RunRow>(
        `select distinct on (source_id)
           run_id,actor_user_id,source_id,onboarding_version,reviewer,
           observed_at,expires_at,branch,commit_sha,notes,pilot_outcome,
           pilot_started_at,pilot_ended_at,pilot_evidence_uri,pilot_detail,
           recorded_at
         from app.master_source_onboarding_runs
         order by source_id,onboarding_version desc,recorded_at desc`
      );
      const runIds = runs.rows.map((row) => row.run_id);
      const assertions =
        runIds.length === 0
          ? { rows: [] as AssertionRow[] }
          : await client.query<AssertionRow>(
              `select assertion_id,run_id,prerequisite,outcome,evidence_uri,
                      detail,recorded_at
               from app.master_source_onboarding_assertions
               where run_id = any($1::uuid[])
               order by run_id,prerequisite`,
              [runIds]
            );
      return { runs: runs.rows, assertions: assertions.rows };
    })
  ]);

  const model = composeSourceOnboardingModel({
    runs: evidence.runs.map((row) => rowToRun(row, evidence.assertions)),
    now
  });

  return {
    ...model,
    sources: model.sources.map((source) => ({
      ...source,
      registryState:
        registry.sources.find((item) => item.sourceId === source.sourceId)
          ?.effectiveStatus ?? "UNKNOWN",
      securityState:
        security.sources.find((item) => item.sourceId === source.sourceId)
          ?.effectiveState ?? "UNKNOWN"
    }))
  };
}

export async function recordSourceOnboardingRun(
  userId: string,
  input: {
    sourceId: unknown;
    reviewer: string;
    observedAt: string;
    expiresAt: string;
    branch: string;
    commitSha: string;
    notes?: string | null;
    pilotOutcome: string;
    pilotStartedAt?: string | null;
    pilotEndedAt?: string | null;
    pilotEvidenceURI?: string | null;
    pilotDetail?: string | null;
    assertions: unknown;
  }
) {
  const sourceId = parseSourceId(input.sourceId);
  const assertions = parseAssertions(input.assertions);
  const pilotOutcome = String(input.pilotOutcome ?? "");
  if (!includes(SUPERVISED_PILOT_OUTCOMES, pilotOutcome)) {
    throw new Error("source_onboarding_pilot_outcome_invalid");
  }

  const now = new Date();
  const [registry, security] = await Promise.all([
    listMasterShellSourceRegistryForUser(userId, now),
    listMasterSecurityCertificationForUser(userId, now)
  ]);

  const registryAssertion = assertions.find(
    (item) => item.prerequisite === "source-registry-readiness"
  );
  const registryState =
    registry.sources.find((item) => item.sourceId === sourceId)
      ?.effectiveStatus ?? "UNKNOWN";
  if (
    registryAssertion?.outcome === "pass" &&
    !["TEST_VERIFIED", "CONNECTED"].includes(registryState)
  ) {
    throw new Error("source_onboarding_registry_pass_not_supported");
  }

  const securityAssertion = assertions.find(
    (item) => item.prerequisite === "security-certification"
  );
  const securityState =
    security.sources.find((item) => item.sourceId === sourceId)
      ?.effectiveState ?? "UNKNOWN";
  if (
    securityAssertion?.outcome === "pass" &&
    securityState !== "PASS"
  ) {
    throw new Error("source_onboarding_security_pass_not_supported");
  }

  const candidateBase = {
    runId: randomUUID(),
    sourceId,
    onboardingVersion: 1,
    reviewer: String(input.reviewer),
    observedAt: String(input.observedAt),
    expiresAt: String(input.expiresAt),
    branch: String(input.branch),
    commitSha: String(input.commitSha),
    notes:
      input.notes === undefined || input.notes === null || input.notes === ""
        ? null
        : String(input.notes),
    pilotOutcome,
    pilotStartedAt:
      input.pilotStartedAt === undefined ||
      input.pilotStartedAt === null ||
      input.pilotStartedAt === ""
        ? null
        : String(input.pilotStartedAt),
    pilotEndedAt:
      input.pilotEndedAt === undefined ||
      input.pilotEndedAt === null ||
      input.pilotEndedAt === ""
        ? null
        : String(input.pilotEndedAt),
    pilotEvidenceURI:
      input.pilotEvidenceURI === undefined ||
      input.pilotEvidenceURI === null ||
      input.pilotEvidenceURI === ""
        ? null
        : String(input.pilotEvidenceURI),
    pilotDetail:
      input.pilotDetail === undefined ||
      input.pilotDetail === null ||
      input.pilotDetail === ""
        ? null
        : String(input.pilotDetail),
    recordedAt: now.toISOString(),
    assertions
  };

  return withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    await client.query(
      "select pg_advisory_xact_lock(hashtext($1))",
      ["master-source-onboarding-pilot"]
    );
    await client.query(
      "select pg_advisory_xact_lock(hashtext($1))",
      ["master-source-onboarding:" + sourceId]
    );

    const current = await client.query<{ onboarding_version: string }>(
      `select onboarding_version
       from app.master_source_onboarding_runs
       where source_id=$1
       order by onboarding_version desc
       limit 1`,
      [sourceId]
    );

    const candidate = validateSourceOnboardingRun({
      ...candidateBase,
      onboardingVersion:
        Number(current.rows[0]?.onboarding_version ?? 0) + 1
    });

    if (
      candidate.pilotStartedAt !== null &&
      candidate.pilotEndedAt !== null
    ) {
      const overlap = await client.query<{ overlapping: boolean }>(
        `select exists (
           select 1
           from app.master_source_onboarding_runs r
           where r.pilot_started_at is not null
             and r.pilot_ended_at is not null
             and r.pilot_started_at < $2::timestamptz
             and r.pilot_ended_at > $1::timestamptz
         ) as overlapping`,
        [candidate.pilotStartedAt, candidate.pilotEndedAt]
      );
      if (overlap.rows[0]?.overlapping) {
        throw new Error("source_onboarding_pilot_window_overlap");
      }
    }

    await client.query(
      `insert into app.master_source_onboarding_runs (
         run_id,actor_user_id,source_id,onboarding_version,reviewer,
         observed_at,expires_at,branch,commit_sha,notes,pilot_outcome,
         pilot_started_at,pilot_ended_at,pilot_evidence_uri,pilot_detail
       ) values (
         $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,
         $5::timestamptz,$6::timestamptz,$7,$8,$9,$10,
         $11::timestamptz,$12::timestamptz,$13,$14
       )`,
      [
        candidate.runId,
        candidate.sourceId,
        candidate.onboardingVersion,
        candidate.reviewer,
        candidate.observedAt,
        candidate.expiresAt,
        candidate.branch,
        candidate.commitSha,
        candidate.notes,
        candidate.pilotOutcome,
        candidate.pilotStartedAt,
        candidate.pilotEndedAt,
        candidate.pilotEvidenceURI,
        candidate.pilotDetail
      ]
    );

    for (const assertion of candidate.assertions) {
      await client.query(
        `insert into app.master_source_onboarding_assertions (
           assertion_id,run_id,prerequisite,outcome,evidence_uri,detail
         ) values ($1,$2,$3,$4,$5,$6)`,
        [
          randomUUID(),
          candidate.runId,
          assertion.prerequisite,
          assertion.outcome,
          assertion.evidenceURI,
          assertion.detail
        ]
      );
    }

    return candidate;
  });
}
