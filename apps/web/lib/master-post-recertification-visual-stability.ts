import type { Build391ShellId } from "./master-theme-drift-governance";
import type { Build392VisualGovernanceRemediation } from "./master-visual-governance-remediation";

export const BUILD_393 = 393 as const;
export const BUILD_393_SCHEMA =
  "rosevear.ai-data-platform.post-recertification-visual-stability.v1" as const;
export const BUILD_393_THEME_VERSION = "rosevear-master-instrument.v1" as const;

export type Build393VisualStabilitySample = {
  sampleId: string;
  shellId: Build391ShellId;
  observedAt: string;
  themeVersion: string;
  navigationStable: boolean;
  instrumentKpisStable: boolean;
  semanticStatusesStable: boolean;
  authorityBoundaryStable: boolean;
  responsiveParityStable: boolean;
  independentlyObserved: boolean;
};

export type Build393RemediationEffectivenessReview = {
  reviewId: string;
  shellId: Build391ShellId;
  observedAt: string;
  stableWindowHours: number;
  recurrenceDetected: boolean;
  preventiveControlsEffective: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  reviewState: "EFFECTIVE" | "INEFFECTIVE" | "HOLD";
};

export type Build393RecurrencePreventionAudit = {
  auditId: string;
  observedAt: string;
  allFiveShellsCovered: boolean;
  noUnresolvedRecurrence: boolean;
  preventiveControlsVerified: boolean;
  ownerAccepted: boolean;
  independentlyVerified: boolean;
  auditState: "VERIFIED" | "HOLD" | "REJECTED";
};

const REQUIRED_SHELLS: readonly Build391ShellId[] = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
];

function uniqueShells(values: readonly Build391ShellId[]) {
  return [...new Set(values)];
}

export function assessBuild393PostRecertificationStability(input: {
  build392: Build392VisualGovernanceRemediation;
  stabilitySamples?: readonly Build393VisualStabilitySample[];
  remediatedShells?: readonly Build391ShellId[];
  effectivenessReviews?: readonly Build393RemediationEffectivenessReview[];
  recurrenceAudits?: readonly Build393RecurrencePreventionAudit[];
}) {
  const build392Eligible =
    input.build392.governanceState === "VISUAL_GOVERNANCE_STABLE" ||
    input.build392.governanceState === "VISUAL_GOVERNANCE_RECERTIFIED";

  const latestSampleByShell = new Map<Build391ShellId, Build393VisualStabilitySample>();
  for (const sample of [...(input.stabilitySamples ?? [])].sort((a, b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    if (!latestSampleByShell.has(sample.shellId)) {
      latestSampleByShell.set(sample.shellId, sample);
    }
  }

  const missingStabilityShells = REQUIRED_SHELLS.filter(
    (shellId) => !latestSampleByShell.has(shellId)
  );

  const recurrentDriftShells = REQUIRED_SHELLS.filter((shellId) => {
    const sample = latestSampleByShell.get(shellId);
    if (!sample) return false;
    return (
      sample.themeVersion !== BUILD_393_THEME_VERSION ||
      !sample.navigationStable ||
      !sample.instrumentKpisStable ||
      !sample.semanticStatusesStable ||
      !sample.authorityBoundaryStable ||
      !sample.responsiveParityStable ||
      !sample.independentlyObserved
    );
  });

  const remediatedShells = uniqueShells(input.remediatedShells ?? []);
  const latestReviewByShell = new Map<
    Build391ShellId,
    Build393RemediationEffectivenessReview
  >();
  for (const review of [...(input.effectivenessReviews ?? [])].sort((a, b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    if (!latestReviewByShell.has(review.shellId)) {
      latestReviewByShell.set(review.shellId, review);
    }
  }

  const remediationReviewRequiredShells = remediatedShells.filter(
    (shellId) => !latestReviewByShell.has(shellId)
  );

  const ineffectiveRemediationShells = remediatedShells.filter((shellId) => {
    const review = latestReviewByShell.get(shellId);
    if (!review) return false;
    return !(
      review.stableWindowHours >= 1 &&
      !review.recurrenceDetected &&
      review.preventiveControlsEffective &&
      review.ownerReviewed &&
      review.independentlyVerified &&
      review.reviewState === "EFFECTIVE"
    );
  });

  const newestSampleAt = [...latestSampleByShell.values()]
    .map((sample) => sample.observedAt)
    .sort()
    .at(-1);

  const latestRecurrenceAudit = [...(input.recurrenceAudits ?? [])].sort((a, b) =>
    b.observedAt.localeCompare(a.observedAt)
  )[0];

  const recurrencePreventionAuditComplete = Boolean(
    latestRecurrenceAudit &&
      (!newestSampleAt || latestRecurrenceAudit.observedAt.localeCompare(newestSampleAt) >= 0) &&
      latestRecurrenceAudit.allFiveShellsCovered &&
      latestRecurrenceAudit.noUnresolvedRecurrence &&
      latestRecurrenceAudit.preventiveControlsVerified &&
      latestRecurrenceAudit.ownerAccepted &&
      latestRecurrenceAudit.independentlyVerified &&
      latestRecurrenceAudit.auditState === "VERIFIED"
  );

  const governanceState =
    !build392Eligible
      ? ("HOLD_BUILD392_NOT_STABLE" as const)
      : missingStabilityShells.length > 0
        ? ("STABILITY_EVIDENCE_INCOMPLETE" as const)
        : recurrentDriftShells.length > 0
          ? ("DRIFT_RECURRENCE_DETECTED" as const)
          : remediationReviewRequiredShells.length > 0
            ? ("REMEDIATION_EFFECTIVENESS_REQUIRED" as const)
            : ineffectiveRemediationShells.length > 0
              ? ("REMEDIATION_EFFECTIVENESS_FAILED" as const)
              : !recurrencePreventionAuditComplete
                ? ("RECURRENCE_PREVENTION_AUDIT_REQUIRED" as const)
                : ("POST_RECERTIFICATION_STABILITY_VERIFIED" as const);

  return {
    schema: BUILD_393_SCHEMA,
    build: BUILD_393,
    themeVersion: BUILD_393_THEME_VERSION,
    build392Eligible,
    missingStabilityShells,
    recurrentDriftShells,
    remediatedShells,
    remediationReviewRequiredShells,
    ineffectiveRemediationShells,
    recurrencePreventionAuditComplete,
    governanceState,
    blockers: [
      ...(!build392Eligible
        ? ["Build 392 must be stable or re-certified before post-recertification monitoring can close."]
        : []),
      ...(missingStabilityShells.length
        ? ["Current stability samples are required for: " + missingStabilityShells.join(", ")]
        : []),
      ...(recurrentDriftShells.length
        ? ["Visual drift recurrence detected for: " + recurrentDriftShells.join(", ")]
        : []),
      ...(remediationReviewRequiredShells.length
        ? ["Remediation effectiveness review required for: " + remediationReviewRequiredShells.join(", ")]
        : []),
      ...(ineffectiveRemediationShells.length
        ? ["Remediation effectiveness failed for: " + ineffectiveRemediationShells.join(", ")]
        : []),
      ...(!recurrencePreventionAuditComplete &&
      missingStabilityShells.length === 0 &&
      recurrentDriftShells.length === 0 &&
      remediationReviewRequiredShells.length === 0 &&
      ineffectiveRemediationShells.length === 0
        ? ["Cross-shell recurrence-prevention audit requires all five shells, owner acceptance and independent verification."]
        : [])
    ],
    policy: {
      allFiveShellsRequireCurrentStabilityEvidence: true,
      remediatedShellsRequireEffectivenessReview: true,
      recurrenceBlocksVisualGovernanceClosure: true,
      preventionAuditMustFollowLatestStabilitySample: true,
      ownerAcceptanceRequired: true,
      independentVerificationRequired: true,
      deploymentGreenCannotProvePostRecertificationStability: true
    }
  };
}

export type Build393PostRecertificationStability = ReturnType<
  typeof assessBuild393PostRecertificationStability
>;
