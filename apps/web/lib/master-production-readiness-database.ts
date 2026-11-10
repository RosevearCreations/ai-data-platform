import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import {
  MASTER_OWNER_DECISIONS,
  MASTER_PRODUCTION_READINESS_DIMENSIONS,
  MASTER_PRODUCTION_READINESS_OUTCOMES,
  composeMasterProductionReadinessModel,
  validateMasterProductionReadinessAssertions,
  validateMasterProductionReadinessRun,
  type MasterOwnerDecision,
  type MasterProductionReadinessAssertion,
  type MasterProductionReadinessDimension,
  type MasterProductionReadinessOutcome
} from "./master-production-readiness-core";
import {
  MASTER_SHELL_SOURCE_IDS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";
import { listSourceOnboardingForUser } from "./source-onboarding-pilot-database";

type RunRow = {
  run_id: string;
  actor_user_id: string;
  source_id: MasterShellSourceId;
  readiness_version: string;
  reviewer: string;
  observed_at: Date;
  expires_at: Date;
  branch: string;
  commit_sha: string;
  notes: string | null;
  owner_decision: MasterOwnerDecision;
  owner_decision_evidence_uri: string | null;
  owner_decision_detail: string | null;
  owner_decided_at: Date | null;
  recorded_at: Date;
};

type AssertionRow = {
  assertion_id: string;
  run_id: string;
  dimension: MasterProductionReadinessDimension;
  outcome: MasterProductionReadinessOutcome;
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
    throw new Error("master_production_readiness_suite_admin_required");
  }
}

async function requireSuiteOwner(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(
    `select exists (
       select 1
       from app.workspace_members wm
       where wm.user_id=nullif(current_setting('app.user_id',true),'')
         and wm.role='owner'
     ) as allowed`
  );
  if (!result.rows[0]?.allowed) {
    throw new Error("master_production_readiness_suite_owner_required");
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
    throw new Error("master_production_readiness_source_invalid");
  }
  return sourceId as MasterShellSourceId;
}

function parseAssertions(values: unknown) {
  if (!Array.isArray(values)) {
    throw new Error("master_production_readiness_assertions_invalid");
  }

  const assertions = values.map((value) => {
    if (!value || typeof value !== "object") {
      throw new Error("master_production_readiness_assertion_invalid");
    }
    const item = value as Record<string, unknown>;
    const dimension = String(item.dimension ?? "");
    const outcome = String(item.outcome ?? "");

    if (!includes(MASTER_PRODUCTION_READINESS_DIMENSIONS, dimension)) {
      throw new Error("master_production_readiness_dimension_invalid");
    }
    if (!includes(MASTER_PRODUCTION_READINESS_OUTCOMES, outcome)) {
      throw new Error("master_production_readiness_outcome_invalid");
    }

    return {
      dimension,
      outcome,
      evidenceURI: String(item.evidenceURI ?? ""),
      detail: String(item.detail ?? "")
    } satisfies MasterProductionReadinessAssertion;
  });

  return validateMasterProductionReadinessAssertions(assertions);
}

function rowAssertions(
  runId: string,
  assertions: readonly AssertionRow[]
): MasterProductionReadinessAssertion[] {
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
  return validateMasterProductionReadinessRun({
    runId: row.run_id,
    sourceId: row.source_id,
    readinessVersion: Number(row.readiness_version),
    reviewer: row.reviewer,
    observedAt: row.observed_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    branch: row.branch,
    commitSha: row.commit_sha,
    notes: row.notes,
    ownerDecision: row.owner_decision,
    ownerDecisionEvidenceURI: row.owner_decision_evidence_uri,
    ownerDecisionDetail: row.owner_decision_detail,
    ownerDecidedAt: row.owner_decided_at?.toISOString() ?? null,
    recordedAt: row.recorded_at.toISOString(),
    assertions: rowAssertions(row.run_id, assertions)
  });
}

export async function listMasterProductionReadinessForUser(
  userId: string,
  now = new Date()
) {
  const [onboarding, evidence] = await Promise.all([
    listSourceOnboardingForUser(userId, now),
    withUserDatabase(userId, async (client) => {
      await requireSuiteAdmin(client);
      const runs = await client.query<RunRow>(
        `select distinct on (source_id)
           run_id,actor_user_id,source_id,readiness_version,reviewer,
           observed_at,expires_at,branch,commit_sha,notes,owner_decision,
           owner_decision_evidence_uri,owner_decision_detail,owner_decided_at,
           recorded_at
         from app.master_production_readiness_runs
         order by source_id,readiness_version desc,recorded_at desc`
      );
      const runIds = runs.rows.map((row) => row.run_id);
      const assertions =
        runIds.length === 0
          ? { rows: [] as AssertionRow[] }
          : await client.query<AssertionRow>(
              `select assertion_id,run_id,dimension,outcome,evidence_uri,
                      detail,recorded_at
               from app.master_production_readiness_assertions
               where run_id = any($1::uuid[])
               order by run_id,dimension`,
              [runIds]
            );
      return { runs: runs.rows, assertions: assertions.rows };
    })
  ]);

  const model = composeMasterProductionReadinessModel({
    runs: evidence.runs.map((row) => rowToRun(row, evidence.assertions)),
    now
  });

  return {
    ...model,
    sources: model.sources.map((source) => ({
      ...source,
      onboardingState:
        onboarding.sources.find((item) => item.sourceId === source.sourceId)
          ?.effectiveState ?? "HOLD"
    }))
  };
}

export async function recordMasterProductionReadinessRun(
  userId: string,
  input: {
    sourceId: unknown;
    reviewer: string;
    observedAt: string;
    expiresAt: string;
    branch: string;
    commitSha: string;
    notes?: string | null;
    ownerDecision: string;
    ownerDecisionEvidenceURI?: string | null;
    ownerDecisionDetail?: string | null;
    ownerDecidedAt?: string | null;
    assertions: unknown;
  }
) {
  const sourceId = parseSourceId(input.sourceId);
  const assertions = parseAssertions(input.assertions);
  const ownerDecision = String(input.ownerDecision ?? "");
  if (!includes(MASTER_OWNER_DECISIONS, ownerDecision)) {
    throw new Error("master_production_readiness_owner_decision_invalid");
  }

  const onboarding = await listSourceOnboardingForUser(userId);
  const onboardingState =
    onboarding.sources.find((item) => item.sourceId === sourceId)
      ?.effectiveState ?? "HOLD";

  const onboardingAssertion = assertions.find(
    (item) => item.dimension === "source-onboarding"
  );
  if (
    onboardingAssertion?.outcome === "pass" &&
    onboardingState !== "ONBOARDED"
  ) {
    throw new Error("master_production_readiness_onboarding_pass_not_supported");
  }

  if (ownerDecision === "accepted" && onboardingState !== "ONBOARDED") {
    throw new Error("master_production_readiness_acceptance_onboarding_required");
  }

  const now = new Date();

  return withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    if (ownerDecision !== "not-reviewed") {
      await requireSuiteOwner(client);
    }
    await client.query(
      "select pg_advisory_xact_lock(hashtext($1))",
      ["master-production-readiness:" + sourceId]
    );

    const current = await client.query<{ readiness_version: string }>(
      `select readiness_version
       from app.master_production_readiness_runs
       where source_id=$1
       order by readiness_version desc
       limit 1`,
      [sourceId]
    );

    const candidate = validateMasterProductionReadinessRun({
      runId: randomUUID(),
      sourceId,
      readinessVersion: Number(current.rows[0]?.readiness_version ?? 0) + 1,
      reviewer: String(input.reviewer),
      observedAt: String(input.observedAt),
      expiresAt: String(input.expiresAt),
      branch: String(input.branch),
      commitSha: String(input.commitSha),
      notes:
        input.notes === undefined || input.notes === null || input.notes === ""
          ? null
          : String(input.notes),
      ownerDecision,
      ownerDecisionEvidenceURI:
        input.ownerDecisionEvidenceURI === undefined ||
        input.ownerDecisionEvidenceURI === null ||
        input.ownerDecisionEvidenceURI === ""
          ? null
          : String(input.ownerDecisionEvidenceURI),
      ownerDecisionDetail:
        input.ownerDecisionDetail === undefined ||
        input.ownerDecisionDetail === null ||
        input.ownerDecisionDetail === ""
          ? null
          : String(input.ownerDecisionDetail),
      ownerDecidedAt:
        input.ownerDecidedAt === undefined ||
        input.ownerDecidedAt === null ||
        input.ownerDecidedAt === ""
          ? null
          : String(input.ownerDecidedAt),
      recordedAt: now.toISOString(),
      assertions
    });

    await client.query(
      `insert into app.master_production_readiness_runs (
         run_id,actor_user_id,source_id,readiness_version,reviewer,
         observed_at,expires_at,branch,commit_sha,notes,owner_decision,
         owner_decision_evidence_uri,owner_decision_detail,owner_decided_at
       ) values (
         $1,nullif(current_setting('app.user_id',true),''),$2,$3,$4,
         $5::timestamptz,$6::timestamptz,$7,$8,$9,$10,$11,$12,$13::timestamptz
       )`,
      [
        candidate.runId,
        candidate.sourceId,
        candidate.readinessVersion,
        candidate.reviewer,
        candidate.observedAt,
        candidate.expiresAt,
        candidate.branch,
        candidate.commitSha,
        candidate.notes,
        candidate.ownerDecision,
        candidate.ownerDecisionEvidenceURI,
        candidate.ownerDecisionDetail,
        candidate.ownerDecidedAt
      ]
    );

    for (const assertion of candidate.assertions) {
      await client.query(
        `insert into app.master_production_readiness_assertions (
           assertion_id,run_id,dimension,outcome,evidence_uri,detail
         ) values ($1,$2,$3,$4,$5,$6)`,
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
