import {
  MASTER_SHELL_SOURCE_IDS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";

export const MASTER_PRODUCTION_READINESS_BUILD = 349 as const;

export const MASTER_PRODUCTION_READINESS_DIMENSIONS = [
  "source-onboarding",
  "operational-recovery",
  "accessibility",
  "production-safeguards",
  "rollback"
] as const;

export const MASTER_PRODUCTION_READINESS_OUTCOMES = [
  "pass",
  "fail",
  "blocked"
] as const;

export const MASTER_OWNER_DECISIONS = [
  "not-reviewed",
  "accepted",
  "rejected",
  "held"
] as const;

export type MasterProductionReadinessDimension =
  (typeof MASTER_PRODUCTION_READINESS_DIMENSIONS)[number];
export type MasterProductionReadinessOutcome =
  (typeof MASTER_PRODUCTION_READINESS_OUTCOMES)[number];
export type MasterOwnerDecision =
  (typeof MASTER_OWNER_DECISIONS)[number];

export type MasterProductionReadinessAssertion = {
  dimension: MasterProductionReadinessDimension;
  outcome: MasterProductionReadinessOutcome;
  evidenceURI: string;
  detail: string;
};

export type MasterProductionReadinessRun = {
  runId: string;
  sourceId: MasterShellSourceId;
  readinessVersion: number;
  reviewer: string;
  observedAt: string;
  expiresAt: string;
  branch: string;
  commitSha: string;
  notes: string | null;
  ownerDecision: MasterOwnerDecision;
  ownerDecisionEvidenceURI: string | null;
  ownerDecisionDetail: string | null;
  ownerDecidedAt: string | null;
  recordedAt: string;
  assertions: MasterProductionReadinessAssertion[];
};

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;
const SAFE_TEXT = /^[^\u0000-\u001f\u007f]{1,1200}$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$/;
const COMMIT = /^[a-f0-9]{7,64}$/;
const URI = /^(https:\/\/|urn:rosevear:evidence:)[^\s]{1,500}$/;

function includes<T extends string>(
  values: readonly T[],
  value: unknown
): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function validIso(value: unknown) {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

export function validateMasterProductionReadinessAssertions(
  assertions: MasterProductionReadinessAssertion[]
) {
  if (assertions.length !== MASTER_PRODUCTION_READINESS_DIMENSIONS.length) {
    throw new Error("master_production_readiness_requires_five_dimensions");
  }

  const seen = new Set<MasterProductionReadinessDimension>();
  for (const assertion of assertions) {
    if (!includes(MASTER_PRODUCTION_READINESS_DIMENSIONS, assertion.dimension)) {
      throw new Error("master_production_readiness_dimension_invalid");
    }
    if (!includes(MASTER_PRODUCTION_READINESS_OUTCOMES, assertion.outcome)) {
      throw new Error("master_production_readiness_outcome_invalid");
    }
    if (!URI.test(assertion.evidenceURI)) {
      throw new Error("master_production_readiness_evidence_uri_invalid");
    }
    if (!SAFE_TEXT.test(assertion.detail) || assertion.detail.length > 1200) {
      throw new Error("master_production_readiness_detail_invalid");
    }
    if (seen.has(assertion.dimension)) {
      throw new Error("master_production_readiness_duplicate_dimension");
    }
    seen.add(assertion.dimension);
  }

  for (const dimension of MASTER_PRODUCTION_READINESS_DIMENSIONS) {
    if (!seen.has(dimension)) {
      throw new Error("master_production_readiness_dimension_missing");
    }
  }

  return assertions;
}

export function summarizeMasterProductionReadiness(
  assertions: readonly MasterProductionReadinessAssertion[],
  ownerDecision: MasterOwnerDecision
) {
  const passed = assertions.filter((item) => item.outcome === "pass").length;
  const failed = assertions.filter((item) => item.outcome === "fail").length;
  const blocked = assertions.filter((item) => item.outcome === "blocked").length;

  const effectiveState =
    failed > 0 || ownerDecision === "rejected"
      ? "FAIL"
      : blocked > 0 || ownerDecision === "held"
        ? "HOLD"
        : passed !== MASTER_PRODUCTION_READINESS_DIMENSIONS.length
          ? "HOLD"
          : ownerDecision === "accepted"
            ? "ACCEPTED"
            : "READY_FOR_OWNER";

  return {
    dimensions: assertions.length,
    passed,
    failed,
    blocked,
    effectiveState
  } as const;
}

export function validateMasterProductionReadinessRun(
  input: MasterProductionReadinessRun
) {
  if (!SAFE_ID.test(input.runId)) {
    throw new Error("master_production_readiness_run_id_invalid");
  }
  if (!MASTER_SHELL_SOURCE_IDS.includes(input.sourceId)) {
    throw new Error("master_production_readiness_source_invalid");
  }
  if (!Number.isSafeInteger(input.readinessVersion) || input.readinessVersion < 1) {
    throw new Error("master_production_readiness_version_invalid");
  }
  if (!SAFE_TEXT.test(input.reviewer) || input.reviewer.length > 160) {
    throw new Error("master_production_readiness_reviewer_invalid");
  }
  if (
    !validIso(input.observedAt) ||
    !validIso(input.expiresAt) ||
    Date.parse(input.expiresAt) <= Date.parse(input.observedAt)
  ) {
    throw new Error("master_production_readiness_time_invalid");
  }
  if (!BRANCH.test(input.branch)) {
    throw new Error("master_production_readiness_branch_invalid");
  }
  if (!COMMIT.test(input.commitSha)) {
    throw new Error("master_production_readiness_commit_invalid");
  }
  if (
    input.notes !== null &&
    (!SAFE_TEXT.test(input.notes) || input.notes.length > 1200)
  ) {
    throw new Error("master_production_readiness_notes_invalid");
  }
  if (!includes(MASTER_OWNER_DECISIONS, input.ownerDecision)) {
    throw new Error("master_production_readiness_owner_decision_invalid");
  }
  if (!validIso(input.recordedAt)) {
    throw new Error("master_production_readiness_recorded_at_invalid");
  }

  validateMasterProductionReadinessAssertions(input.assertions);

  const hasOwnerEvidence =
    input.ownerDecisionEvidenceURI !== null ||
    input.ownerDecisionDetail !== null ||
    input.ownerDecidedAt !== null;

  if (input.ownerDecision === "not-reviewed") {
    if (hasOwnerEvidence) {
      throw new Error("master_production_readiness_unreviewed_owner_evidence_must_be_empty");
    }
  } else {
    if (
      input.ownerDecisionEvidenceURI === null ||
      !URI.test(input.ownerDecisionEvidenceURI) ||
      input.ownerDecisionDetail === null ||
      !SAFE_TEXT.test(input.ownerDecisionDetail) ||
      input.ownerDecidedAt === null ||
      !validIso(input.ownerDecidedAt) ||
      Date.parse(input.ownerDecidedAt) < Date.parse(input.observedAt) ||
      Date.parse(input.ownerDecidedAt) > Date.parse(input.expiresAt)
    ) {
      throw new Error("master_production_readiness_owner_evidence_invalid");
    }
  }

  if (
    input.ownerDecision === "accepted" &&
    input.assertions.some((item) => item.outcome !== "pass")
  ) {
    throw new Error("master_production_readiness_acceptance_prerequisites_invalid");
  }

  return input;
}

function effectiveState(
  run: MasterProductionReadinessRun,
  now: Date
) {
  if (Date.parse(run.expiresAt) <= now.getTime()) return "STALE" as const;
  return summarizeMasterProductionReadiness(
    run.assertions,
    run.ownerDecision
  ).effectiveState;
}

export function composeMasterProductionReadinessModel(input: {
  runs: MasterProductionReadinessRun[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const latest = new Map<MasterShellSourceId, MasterProductionReadinessRun>();

  for (const raw of input.runs) {
    const run = validateMasterProductionReadinessRun(raw);
    const current = latest.get(run.sourceId);
    if (
      !current ||
      run.readinessVersion > current.readinessVersion ||
      (run.readinessVersion === current.readinessVersion &&
        Date.parse(run.recordedAt) > Date.parse(current.recordedAt))
    ) {
      latest.set(run.sourceId, run);
    }
  }

  const sources = MASTER_SHELL_SOURCE_IDS.map((sourceId) => {
    const run = latest.get(sourceId) ?? null;
    return {
      sourceId,
      effectiveState: run ? effectiveState(run, now) : "HOLD",
      run
    };
  });

  const accepted = sources.filter((x) => x.effectiveState === "ACCEPTED").length;
  const readyForOwner = sources.filter(
    (x) => x.effectiveState === "READY_FOR_OWNER"
  ).length;
  const hold = sources.filter((x) => x.effectiveState === "HOLD").length;
  const failed = sources.filter((x) => x.effectiveState === "FAIL").length;
  const stale = sources.filter((x) => x.effectiveState === "STALE").length;

  const suiteEffectiveState =
    failed > 0
      ? "FAIL"
      : stale > 0
        ? "STALE"
        : hold > 0
          ? "HOLD"
          : readyForOwner > 0
            ? "READY_FOR_OWNER"
            : accepted === MASTER_SHELL_SOURCE_IDS.length
              ? "ACCEPTED"
              : "HOLD";

  return {
    schema: "ai-data-platform.master-production-readiness.v1",
    build: MASTER_PRODUCTION_READINESS_BUILD,
    generatedAt: now.toISOString(),
    dimensions: [...MASTER_PRODUCTION_READINESS_DIMENSIONS],
    sources,
    summary: {
      sources: sources.length,
      accepted,
      readyForOwner,
      hold,
      failed,
      stale,
      suiteEffectiveState
    },
    policy: {
      exactSixSources: true,
      sourceOnboardingRequired: true,
      recoveryEvidenceRequired: true,
      accessibilityEvidenceRequired: true,
      productionSafeguardsRequired: true,
      rollbackEvidenceRequired: true,
      ownerAcceptanceExplicit: true,
      deploymentGreenImpliesAcceptance: false,
      build348OnboardedImpliesAcceptance: false,
      acceptanceActivatesConnection: false,
      sourceSpecificGatesRemainAuthoritative: true,
      sourceMutationPerformed: false,
      peerWritePerformed: false,
      automaticRollbackPerformed: false,
      automaticHoldRelease: false
    }
  };
}

export type MasterProductionReadinessModel = ReturnType<
  typeof composeMasterProductionReadinessModel
>;
