import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import {
  MASTER_SECURITY_CERTIFICATION_DIMENSIONS,
  MASTER_SECURITY_CERTIFICATION_OUTCOMES,
  composeMasterSecurityCertificationModel,
  summarizeMasterSecurityAssertions,
  validateMasterSecurityAssertions,
  validateMasterSecurityCertificationRun,
  type MasterSecurityCertificationAssertion,
  type MasterSecurityCertificationDimension,
  type MasterSecurityCertificationOutcome
} from "./master-security-certification-core";
import {
  MASTER_SHELL_SOURCE_IDS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";

type RunRow = {
  run_id: string;
  actor_user_id: string;
  source_id: MasterShellSourceId;
  certification_version: string;
  overall_outcome: "passed" | "failed" | "blocked";
  reviewer: string;
  observed_at: Date;
  expires_at: Date;
  branch: string;
  commit_sha: string;
  notes: string | null;
  recorded_at: Date;
};

type AssertionRow = {
  assertion_id: string;
  run_id: string;
  dimension: MasterSecurityCertificationDimension;
  outcome: MasterSecurityCertificationOutcome;
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
    throw new Error("master_security_certification_suite_admin_required");
  }
}

function includes<T extends string>(
  values: readonly T[],
  value: string
): value is T {
  return values.includes(value as T);
}

function parseSourceId(value: unknown): MasterShellSourceId {
  const sourceId = String(value ?? "");
  if (!MASTER_SHELL_SOURCE_IDS.includes(sourceId as MasterShellSourceId)) {
    throw new Error("master_security_certification_source_invalid");
  }
  return sourceId as MasterShellSourceId;
}

function parseAssertions(values: unknown) {
  if (!Array.isArray(values)) {
    throw new Error("master_security_certification_assertions_invalid");
  }
  const assertions = values.map((value) => {
    if (!value || typeof value !== "object") {
      throw new Error("master_security_certification_assertion_invalid");
    }
    const item = value as Record<string, unknown>;
    const dimension = String(item.dimension ?? "");
    const outcome = String(item.outcome ?? "");
    if (!includes(MASTER_SECURITY_CERTIFICATION_DIMENSIONS, dimension)) {
      throw new Error("master_security_certification_dimension_invalid");
    }
    if (!includes(MASTER_SECURITY_CERTIFICATION_OUTCOMES, outcome)) {
      throw new Error("master_security_certification_outcome_invalid");
    }
    return {
      dimension,
      outcome,
      evidenceURI: String(item.evidenceURI ?? ""),
      detail: String(item.detail ?? "")
    } satisfies MasterSecurityCertificationAssertion;
  });
  return validateMasterSecurityAssertions(assertions);
}

function rowAssertions(
  runId: string,
  assertions: readonly AssertionRow[]
): MasterSecurityCertificationAssertion[] {
  return assertions
    .filter((row) => row.run_id === runId)
    .map((row) => ({
      dimension: row.dimension,
      outcome: row.outcome,
      evidenceURI: row.evidence_uri,
      detail: row.detail
    }));
}

function rowToRun(row: RunRow, assertions: readonly AssertionRow[]) {
  return validateMasterSecurityCertificationRun({
    runId: row.run_id,
    sourceId: row.source_id,
    certificationVersion: Number(row.certification_version),
    overallOutcome: row.overall_outcome,
    reviewer: row.reviewer,
    observedAt: row.observed_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    branch: row.branch,
    commitSha: row.commit_sha,
    notes: row.notes,
    recordedAt: row.recorded_at.toISOString(),
    assertions: rowAssertions(row.run_id, assertions)
  });
}

export async function listMasterSecurityCertificationForUser(
  userId: string,
  now = new Date()
) {
  const rows = await withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    const runs = await client.query<RunRow>(
      `select distinct on (source_id)
         run_id,actor_user_id,source_id,certification_version,overall_outcome,
         reviewer,observed_at,expires_at,branch,commit_sha,notes,recorded_at
       from app.master_security_certification_runs
       order by source_id,certification_version desc,recorded_at desc`
    );
    const runIds = runs.rows.map((row) => row.run_id);
    const assertions =
      runIds.length === 0
        ? { rows: [] as AssertionRow[] }
        : await client.query<AssertionRow>(
            `select assertion_id,run_id,dimension,outcome,evidence_uri,
                    detail,recorded_at
             from app.master_security_certification_assertions
             where run_id = any($1::uuid[])
             order by run_id,dimension`,
            [runIds]
          );
    return { runs: runs.rows, assertions: assertions.rows };
  });

  return composeMasterSecurityCertificationModel({
    runs: rows.runs.map((row) => rowToRun(row, rows.assertions)),
    now
  });
}

export async function recordMasterSecurityCertification(
  userId: string,
  input: {
    sourceId: unknown;
    reviewer: string;
    observedAt: string;
    expiresAt: string;
    branch: string;
    commitSha: string;
    notes?: string | null;
    assertions: unknown;
  }
) {
  const sourceId = parseSourceId(input.sourceId);
  const assertions = parseAssertions(input.assertions);
  const summary = summarizeMasterSecurityAssertions(assertions);

  return withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    await client.query(
      "select pg_advisory_xact_lock(hashtext($1))",
      ["master-security-certification:" + sourceId]
    );

    const current = await client.query<{ certification_version: string }>(
      `select certification_version
       from app.master_security_certification_runs
       where source_id=$1
       order by certification_version desc
       limit 1`,
      [sourceId]
    );

    const runId = randomUUID();
    const certificationVersion =
      Number(current.rows[0]?.certification_version ?? 0) + 1;

    const candidate = validateMasterSecurityCertificationRun({
      runId,
      sourceId,
      certificationVersion,
      overallOutcome: summary.overallOutcome,
      reviewer: String(input.reviewer),
      observedAt: String(input.observedAt),
      expiresAt: String(input.expiresAt),
      branch: String(input.branch),
      commitSha: String(input.commitSha),
      notes: input.notes ? String(input.notes) : null,
      recordedAt: new Date().toISOString(),
      assertions
    });

    await client.query(
      `insert into app.master_security_certification_runs (
         run_id,actor_user_id,source_id,certification_version,overall_outcome,
         reviewer,observed_at,expires_at,branch,commit_sha,notes,recorded_at
       ) values (
         $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,
         $5,$6::timestamptz,$7::timestamptz,$8,$9,$10,now()
       )`,
      [
        candidate.runId,
        candidate.sourceId,
        candidate.certificationVersion,
        candidate.overallOutcome,
        candidate.reviewer,
        candidate.observedAt,
        candidate.expiresAt,
        candidate.branch,
        candidate.commitSha,
        candidate.notes
      ]
    );

    for (const assertion of candidate.assertions) {
      await client.query(
        `insert into app.master_security_certification_assertions (
           assertion_id,run_id,dimension,outcome,evidence_uri,detail,recorded_at
         ) values ($1,$2,$3,$4,$5,$6,now())`,
        [
          randomUUID(),
          candidate.runId,
          assertion.dimension,
          assertion.outcome,
          assertion.evidenceURI,
          assertion.detail
        ]
      );
    }

    return candidate;
  });
}
