import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import {
  RELATIONSHIP_CERTIFICATION_DIMENSIONS,
  RELATIONSHIP_CERTIFICATION_OUTCOMES,
  RELATIONSHIP_PATTERNS,
  composeRelationshipCertificationModel,
  summarizeRelationshipAssertions,
  validateRelationshipAssertions,
  validateRelationshipCertificationRun,
  validateRelationshipShape,
  type RelationshipCertificationAssertion,
  type RelationshipCertificationDimension,
  type RelationshipCertificationOutcome,
  type RelationshipPattern
} from "./relationship-certification-core";
import {
  MASTER_SHELL_SOURCE_IDS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";

type RunRow = {
  run_id: string;
  actor_user_id: string;
  relationship_id: string;
  certification_version: string;
  relationship_pattern: RelationshipPattern;
  source_ids: MasterShellSourceId[];
  destination_ids: MasterShellSourceId[];
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
  dimension: RelationshipCertificationDimension;
  outcome: RelationshipCertificationOutcome;
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
    throw new Error("relationship_certification_suite_admin_required");
  }
}

function includes<T extends string>(
  values: readonly T[],
  value: string
): value is T {
  return values.includes(value as T);
}

function parseSourceIds(values: unknown): MasterShellSourceId[] {
  if (!Array.isArray(values)) {
    throw new Error("relationship_certification_source_list_invalid");
  }
  const parsed = values.map((value) => String(value));
  if (
    parsed.some(
      (value) =>
        !MASTER_SHELL_SOURCE_IDS.includes(value as MasterShellSourceId)
    )
  ) {
    throw new Error("relationship_certification_source_invalid");
  }
  return parsed as MasterShellSourceId[];
}

function parseAssertions(values: unknown) {
  if (!Array.isArray(values)) {
    throw new Error("relationship_certification_assertions_invalid");
  }
  const assertions = values.map((value) => {
    if (!value || typeof value !== "object") {
      throw new Error("relationship_certification_assertion_invalid");
    }
    const item = value as Record<string, unknown>;
    const dimension = String(item.dimension ?? "");
    const outcome = String(item.outcome ?? "");
    if (!includes(RELATIONSHIP_CERTIFICATION_DIMENSIONS, dimension)) {
      throw new Error("relationship_certification_dimension_invalid");
    }
    if (!includes(RELATIONSHIP_CERTIFICATION_OUTCOMES, outcome)) {
      throw new Error("relationship_certification_outcome_invalid");
    }
    return {
      dimension,
      outcome,
      evidenceURI: String(item.evidenceURI ?? ""),
      detail: String(item.detail ?? "")
    } satisfies RelationshipCertificationAssertion;
  });
  return validateRelationshipAssertions(assertions);
}

function rowAssertions(
  runId: string,
  assertions: readonly AssertionRow[]
): RelationshipCertificationAssertion[] {
  return assertions
    .filter((row) => row.run_id === runId)
    .map((row) => ({
      dimension: row.dimension,
      outcome: row.outcome,
      evidenceURI: row.evidence_uri,
      detail: row.detail
    }));
}

function rowToRun(
  row: RunRow,
  assertions: readonly AssertionRow[]
) {
  return validateRelationshipCertificationRun({
    runId: row.run_id,
    relationshipId: row.relationship_id,
    certificationVersion: Number(row.certification_version),
    pattern: row.relationship_pattern,
    sourceIds: row.source_ids,
    destinationIds: row.destination_ids,
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

export async function listRelationshipCertificationForUser(
  userId: string,
  now = new Date()
) {
  const rows = await withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    const runs = await client.query<RunRow>(
      `select distinct on (relationship_id)
         run_id,actor_user_id,relationship_id,certification_version,
         relationship_pattern,source_ids,destination_ids,overall_outcome,
         reviewer,observed_at,expires_at,branch,commit_sha,notes,recorded_at
       from app.master_relationship_certification_runs
       order by relationship_id,certification_version desc,recorded_at desc`
    );
    const runIds = runs.rows.map((row) => row.run_id);
    const assertions =
      runIds.length === 0
        ? { rows: [] as AssertionRow[] }
        : await client.query<AssertionRow>(
            `select assertion_id,run_id,dimension,outcome,evidence_uri,
                    detail,recorded_at
             from app.master_relationship_certification_assertions
             where run_id = any($1::uuid[])
             order by run_id,dimension`,
            [runIds]
          );
    return { runs: runs.rows, assertions: assertions.rows };
  });

  return composeRelationshipCertificationModel({
    runs: rows.runs.map((row) => rowToRun(row, rows.assertions)),
    now
  });
}

export async function recordRelationshipCertification(
  userId: string,
  input: {
    relationshipId: string;
    pattern: string;
    sourceIds: unknown;
    destinationIds: unknown;
    reviewer: string;
    observedAt: string;
    expiresAt: string;
    branch: string;
    commitSha: string;
    notes?: string | null;
    assertions: unknown;
  }
) {
  const sourceIds = parseSourceIds(input.sourceIds);
  const destinationIds = parseSourceIds(input.destinationIds);
  const pattern = String(input.pattern);
  if (!includes(RELATIONSHIP_PATTERNS, pattern)) {
    throw new Error("relationship_certification_pattern_invalid");
  }
  const relationship = validateRelationshipShape({
    relationshipId: String(input.relationshipId),
    pattern,
    sourceIds,
    destinationIds
  });
  const assertions = parseAssertions(input.assertions);
  const summary = summarizeRelationshipAssertions(assertions);

  return withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    await client.query(
      "select pg_advisory_xact_lock(hashtext($1))",
      ["relationship-certification:" + relationship.relationshipId]
    );

    const current = await client.query<{ certification_version: string }>(
      `select certification_version
       from app.master_relationship_certification_runs
       where relationship_id=$1
       order by certification_version desc
       limit 1`,
      [relationship.relationshipId]
    );

    const runId = randomUUID();
    const certificationVersion =
      Number(current.rows[0]?.certification_version ?? 0) + 1;

    const candidate = validateRelationshipCertificationRun({
      runId,
      relationshipId: relationship.relationshipId,
      certificationVersion,
      pattern: relationship.pattern,
      sourceIds: relationship.sourceIds,
      destinationIds: relationship.destinationIds,
      overallOutcome: summary.overallOutcome,
      reviewer: input.reviewer,
      observedAt: input.observedAt,
      expiresAt: input.expiresAt,
      branch: input.branch,
      commitSha: input.commitSha,
      notes:
        input.notes === undefined ||
        input.notes === null ||
        input.notes === ""
          ? null
          : input.notes,
      recordedAt: new Date().toISOString(),
      assertions
    });

    const runResult = await client.query<RunRow>(
      `insert into app.master_relationship_certification_runs (
        run_id,actor_user_id,relationship_id,certification_version,
        relationship_pattern,source_ids,destination_ids,overall_outcome,
        reviewer,observed_at,expires_at,branch,commit_sha,notes
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
      )
      returning *`,
      [
        candidate.runId,
        userId,
        candidate.relationshipId,
        candidate.certificationVersion,
        candidate.pattern,
        candidate.sourceIds,
        candidate.destinationIds,
        candidate.overallOutcome,
        candidate.reviewer,
        candidate.observedAt,
        candidate.expiresAt,
        candidate.branch,
        candidate.commitSha,
        candidate.notes
      ]
    );

    const assertionRows: AssertionRow[] = [];
    for (const assertion of candidate.assertions) {
      const result = await client.query<AssertionRow>(
        `insert into app.master_relationship_certification_assertions (
          assertion_id,run_id,dimension,outcome,evidence_uri,detail
        ) values ($1,$2,$3,$4,$5,$6)
        returning *`,
        [
          randomUUID(),
          candidate.runId,
          assertion.dimension,
          assertion.outcome,
          assertion.evidenceURI,
          assertion.detail
        ]
      );
      assertionRows.push(result.rows[0]);
    }

    return rowToRun(runResult.rows[0], assertionRows);
  });
}
