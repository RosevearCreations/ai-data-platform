import {
  MASTER_SHELL_SOURCE_IDS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";

export const SOURCE_ONBOARDING_BUILD = 348 as const;

export const SOURCE_ONBOARDING_PREREQUISITES = [
  "original-source-owned-evidence",
  "source-registry-readiness",
  "security-certification",
  "recovery-readiness",
  "rollback-readiness",
  "owner-pilot-authorization"
] as const;

export const SOURCE_ONBOARDING_OUTCOMES = [
  "pass",
  "fail",
  "blocked"
] as const;

export const SUPERVISED_PILOT_OUTCOMES = [
  "not-run",
  "pass",
  "fail",
  "blocked"
] as const;

export type SourceOnboardingPrerequisite =
  (typeof SOURCE_ONBOARDING_PREREQUISITES)[number];
export type SourceOnboardingOutcome =
  (typeof SOURCE_ONBOARDING_OUTCOMES)[number];
export type SupervisedPilotOutcome =
  (typeof SUPERVISED_PILOT_OUTCOMES)[number];

export type SourceOnboardingAssertion = {
  prerequisite: SourceOnboardingPrerequisite;
  outcome: SourceOnboardingOutcome;
  evidenceURI: string;
  detail: string;
};

export type SourceOnboardingRun = {
  runId: string;
  sourceId: MasterShellSourceId;
  onboardingVersion: number;
  reviewer: string;
  observedAt: string;
  expiresAt: string;
  branch: string;
  commitSha: string;
  notes: string | null;
  pilotOutcome: SupervisedPilotOutcome;
  pilotStartedAt: string | null;
  pilotEndedAt: string | null;
  pilotEvidenceURI: string | null;
  pilotDetail: string | null;
  recordedAt: string;
  assertions: SourceOnboardingAssertion[];
};

const SAFE_TEXT = /^[^\u0000-\u001f\u007f]{1,1200}$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$/;
const COMMIT = /^[a-f0-9]{7,64}$/;
const URI = /^(https:\/\/|urn:rosevear:evidence:)[^\s]{1,500}$/;

function validIso(value: unknown) {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function includes<T extends string>(
  values: readonly T[],
  value: unknown
): value is T {
  return typeof value === "string" && values.includes(value as T);
}

export function validateSourceOnboardingAssertions(
  assertions: SourceOnboardingAssertion[]
) {
  if (assertions.length !== SOURCE_ONBOARDING_PREREQUISITES.length) {
    throw new Error("source_onboarding_requires_six_prerequisites");
  }

  const seen = new Set<SourceOnboardingPrerequisite>();
  for (const assertion of assertions) {
    if (!includes(SOURCE_ONBOARDING_PREREQUISITES, assertion.prerequisite)) {
      throw new Error("source_onboarding_prerequisite_invalid");
    }
    if (!includes(SOURCE_ONBOARDING_OUTCOMES, assertion.outcome)) {
      throw new Error("source_onboarding_outcome_invalid");
    }
    if (!URI.test(assertion.evidenceURI)) {
      throw new Error("source_onboarding_evidence_uri_invalid");
    }
    if (!SAFE_TEXT.test(assertion.detail) || assertion.detail.length > 1200) {
      throw new Error("source_onboarding_detail_invalid");
    }
    if (seen.has(assertion.prerequisite)) {
      throw new Error("source_onboarding_duplicate_prerequisite");
    }
    seen.add(assertion.prerequisite);
  }

  for (const prerequisite of SOURCE_ONBOARDING_PREREQUISITES) {
    if (!seen.has(prerequisite)) {
      throw new Error("source_onboarding_prerequisite_missing");
    }
  }
  return assertions;
}

export function summarizeSourceOnboarding(
  assertions: readonly SourceOnboardingAssertion[],
  pilotOutcome: SupervisedPilotOutcome
) {
  const passed = assertions.filter((item) => item.outcome === "pass").length;
  const failed = assertions.filter((item) => item.outcome === "fail").length;
  const blocked = assertions.filter((item) => item.outcome === "blocked").length;

  const effectiveState =
    failed > 0
      ? "FAIL"
      : blocked > 0
        ? "HOLD"
        : pilotOutcome === "fail"
          ? "PILOT_FAILED"
          : pilotOutcome === "blocked"
            ? "HOLD"
            : pilotOutcome === "pass"
              ? "ONBOARDED"
              : "READY_FOR_PILOT";

  return {
    prerequisites: assertions.length,
    passed,
    failed,
    blocked,
    effectiveState
  } as const;
}

export function validateSourceOnboardingRun(input: SourceOnboardingRun) {
  if (!MASTER_SHELL_SOURCE_IDS.includes(input.sourceId)) {
    throw new Error("source_onboarding_source_invalid");
  }
  if (!Number.isSafeInteger(input.onboardingVersion) || input.onboardingVersion < 1) {
    throw new Error("source_onboarding_version_invalid");
  }
  if (!SAFE_TEXT.test(input.reviewer) || input.reviewer.length > 160) {
    throw new Error("source_onboarding_reviewer_invalid");
  }
  if (
    !validIso(input.observedAt) ||
    !validIso(input.expiresAt) ||
    Date.parse(input.expiresAt) <= Date.parse(input.observedAt)
  ) {
    throw new Error("source_onboarding_time_invalid");
  }
  if (!BRANCH.test(input.branch)) {
    throw new Error("source_onboarding_branch_invalid");
  }
  if (!COMMIT.test(input.commitSha)) {
    throw new Error("source_onboarding_commit_invalid");
  }
  if (
    input.notes !== null &&
    (!SAFE_TEXT.test(input.notes) || input.notes.length > 1200)
  ) {
    throw new Error("source_onboarding_notes_invalid");
  }
  if (!validIso(input.recordedAt)) {
    throw new Error("source_onboarding_recorded_at_invalid");
  }
  if (!includes(SUPERVISED_PILOT_OUTCOMES, input.pilotOutcome)) {
    throw new Error("source_onboarding_pilot_outcome_invalid");
  }

  validateSourceOnboardingAssertions(input.assertions);

  const hasPilotWindow =
    input.pilotStartedAt !== null ||
    input.pilotEndedAt !== null ||
    input.pilotEvidenceURI !== null ||
    input.pilotDetail !== null;

  if (input.pilotOutcome === "not-run") {
    if (hasPilotWindow) {
      throw new Error("source_onboarding_not_run_pilot_must_be_empty");
    }
  } else {
    if (
      !validIso(input.pilotStartedAt) ||
      !validIso(input.pilotEndedAt) ||
      Date.parse(input.pilotEndedAt) <= Date.parse(input.pilotStartedAt) ||
      input.pilotEvidenceURI === null ||
      !URI.test(input.pilotEvidenceURI) ||
      input.pilotDetail === null ||
      !SAFE_TEXT.test(input.pilotDetail)
    ) {
      throw new Error("source_onboarding_pilot_evidence_invalid");
    }
  }

  if (
    input.pilotOutcome !== "not-run" &&
    input.assertions.some((item) => item.outcome !== "pass")
  ) {
    throw new Error("source_onboarding_pilot_prerequisites_invalid");
  }

  return input;
}

function effectiveState(run: SourceOnboardingRun, now: Date) {
  if (Date.parse(run.expiresAt) <= now.getTime()) return "STALE" as const;
  return summarizeSourceOnboarding(run.assertions, run.pilotOutcome).effectiveState;
}

export function composeSourceOnboardingModel(input: {
  runs: SourceOnboardingRun[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const latest = new Map<MasterShellSourceId, SourceOnboardingRun>();

  for (const raw of input.runs) {
    const run = validateSourceOnboardingRun(raw);
    const current = latest.get(run.sourceId);
    if (
      !current ||
      run.onboardingVersion > current.onboardingVersion ||
      (run.onboardingVersion === current.onboardingVersion &&
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

  return {
    schema: "ai-data-platform.source-onboarding-pilot.v1",
    build: SOURCE_ONBOARDING_BUILD,
    generatedAt: now.toISOString(),
    prerequisites: [...SOURCE_ONBOARDING_PREREQUISITES],
    sources,
    summary: {
      sources: sources.length,
      onboarded: sources.filter((x) => x.effectiveState === "ONBOARDED").length,
      readyForPilot: sources.filter((x) => x.effectiveState === "READY_FOR_PILOT").length,
      hold: sources.filter((x) => x.effectiveState === "HOLD").length,
      failed: sources.filter((x) => x.effectiveState === "FAIL" || x.effectiveState === "PILOT_FAILED").length,
      stale: sources.filter((x) => x.effectiveState === "STALE").length
    },
    policy: {
      exactSixSources: true,
      oneSourcePilotAtATime: true,
      originalSourceOwnedEvidenceRequired: true,
      securityCertificationRequired: true,
      recoveryEvidenceRequired: true,
      rollbackEvidenceRequired: true,
      ownerPilotAuthorizationRequired: true,
      missingEvidenceRetainsHold: true,
      onboardingIsConnectionActivation: false,
      deploymentGreenImpliesOnboarded: false,
      sourceMutationPerformed: false,
      peerWritePerformed: false,
      externalProbePerformed: false,
      automaticHoldRelease: false
    }
  };
}

export type SourceOnboardingModel = ReturnType<
  typeof composeSourceOnboardingModel
>;
