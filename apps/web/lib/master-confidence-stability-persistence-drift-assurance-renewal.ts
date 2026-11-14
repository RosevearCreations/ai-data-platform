import type { Build391ShellId } from "./master-theme-drift-governance";
import type { Build397StabilityPersistenceConfidence } from "./master-recalibrated-stability-outcome-persistence-confidence";

export const BUILD_398 = 398 as const;
export const BUILD_398_SCHEMA =
  "rosevear.ai-data-platform.confidence-stability-persistence-drift-assurance-renewal.v1" as const;
export const BUILD_398_THEME_VERSION = "rosevear-master-instrument.v1" as const;
export const BUILD_398_MIN_CONFIDENCE_BPS = 7000 as const;
export const BUILD_398_MAX_CONFIDENCE_DROP_BPS = 1000 as const;
export const BUILD_398_MAX_PERSISTENCE_RISK_DRIFT_BPS = 500 as const;

export type Build398ConfidenceStabilityObservation = {
  observationId: string;
  shellId: Build391ShellId;
  observedAt: string;
  priorConfidenceBps: number;
  currentConfidenceBps: number;
  observationWindowHours: number;
  sampleCount: number;
  evidenceCurrent: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  stabilityState: "STABLE" | "DEGRADING" | "HOLD";
};

export type Build398InterventionPersistenceDrift = {
  driftId: string;
  shellId: Build391ShellId;
  observedAt: string;
  interventionOccurred: boolean;
  baselineRiskBps: number;
  currentRiskBps: number;
  riskDriftBps: number;
  observationWindowHours: number;
  recurrenceDetected: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  driftState: "NOT_REQUIRED" | "STABLE" | "DRIFTING" | "HOLD";
};

export type Build398EscalationAssuranceRenewal = {
  renewalId: string;
  shellId: Build391ShellId;
  observedAt: string;
  evidencePoints: number;
  confidenceEvidenceCurrent: boolean;
  thresholdEvidenceCurrent: boolean;
  persistenceEvidenceCurrent: boolean;
  ownerRenewed: boolean;
  independentlyVerified: boolean;
  renewalState: "RENEWED" | "HOLD" | "REJECTED";
};

const REQUIRED_SHELLS: readonly Build391ShellId[] = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
];

function latestByShell<T extends { shellId: Build391ShellId; observedAt: string }>(
  values: readonly T[]
) {
  const latest = new Map<Build391ShellId, T>();
  for (const item of [...values].sort((a, b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    if (!latest.has(item.shellId)) latest.set(item.shellId, item);
  }
  return latest;
}

function validBps(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 10_000;
}

export function assessBuild398AssuranceRenewal(input: {
  build397: Build397StabilityPersistenceConfidence;
  confidenceStability?: readonly Build398ConfidenceStabilityObservation[];
  persistenceDrift?: readonly Build398InterventionPersistenceDrift[];
  assuranceRenewals?: readonly Build398EscalationAssuranceRenewal[];
}) {
  const build397Eligible =
    input.build397.governanceState === "STABILITY_PERSISTENCE_CONFIDENCE_VERIFIED";

  const confidenceByShell = latestByShell(input.confidenceStability ?? []);
  const missingConfidenceStabilityShells = REQUIRED_SHELLS.filter(
    (shellId) => !confidenceByShell.has(shellId)
  );
  const degradingConfidenceShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = confidenceByShell.get(shellId);
    if (!item) return false;
    const confidenceDrop = Math.max(0, item.priorConfidenceBps - item.currentConfidenceBps);
    return !(
      validBps(item.priorConfidenceBps) &&
      validBps(item.currentConfidenceBps) &&
      item.currentConfidenceBps >= BUILD_398_MIN_CONFIDENCE_BPS &&
      confidenceDrop <= BUILD_398_MAX_CONFIDENCE_DROP_BPS &&
      item.observationWindowHours >= 24 &&
      item.sampleCount >= 3 &&
      item.evidenceCurrent &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.stabilityState === "STABLE"
    );
  });

  const driftByShell = latestByShell(input.persistenceDrift ?? []);
  const missingPersistenceDriftShells = REQUIRED_SHELLS.filter(
    (shellId) => !driftByShell.has(shellId)
  );
  const persistenceDriftShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = driftByShell.get(shellId);
    if (!item) return false;

    if (!item.interventionOccurred) {
      return !(
        item.riskDriftBps === 0 &&
        !item.recurrenceDetected &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.driftState === "NOT_REQUIRED"
      );
    }

    const expectedDrift = Math.max(0, item.currentRiskBps - item.baselineRiskBps);
    return !(
      validBps(item.baselineRiskBps) &&
      validBps(item.currentRiskBps) &&
      item.riskDriftBps === expectedDrift &&
      item.riskDriftBps <= BUILD_398_MAX_PERSISTENCE_RISK_DRIFT_BPS &&
      item.observationWindowHours >= 48 &&
      !item.recurrenceDetected &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.driftState === "STABLE"
    );
  });

  const renewalByShell = latestByShell(input.assuranceRenewals ?? []);
  const missingRenewalShells = REQUIRED_SHELLS.filter(
    (shellId) => !renewalByShell.has(shellId)
  );
  const invalidRenewalShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = renewalByShell.get(shellId);
    if (!item) return false;
    return !(
      item.evidencePoints >= 5 &&
      item.confidenceEvidenceCurrent &&
      item.thresholdEvidenceCurrent &&
      item.persistenceEvidenceCurrent &&
      item.ownerRenewed &&
      item.independentlyVerified &&
      item.renewalState === "RENEWED" &&
      !degradingConfidenceShells.includes(shellId) &&
      !persistenceDriftShells.includes(shellId)
    );
  });

  const governanceState =
    !build397Eligible
      ? ("HOLD_BUILD397_NOT_VERIFIED" as const)
      : missingConfidenceStabilityShells.length > 0
        ? ("CONFIDENCE_STABILITY_EVIDENCE_REQUIRED" as const)
        : degradingConfidenceShells.length > 0
          ? ("CONFIDENCE_STABILITY_DEGRADED" as const)
          : missingPersistenceDriftShells.length > 0
            ? ("PERSISTENCE_DRIFT_EVIDENCE_REQUIRED" as const)
            : persistenceDriftShells.length > 0
              ? ("INTERVENTION_PERSISTENCE_DRIFT_DETECTED" as const)
              : missingRenewalShells.length > 0
                ? ("ESCALATION_ASSURANCE_RENEWAL_REQUIRED" as const)
                : invalidRenewalShells.length > 0
                  ? ("ESCALATION_ASSURANCE_RENEWAL_INVALID" as const)
                  : ("POST_RECALIBRATION_ASSURANCE_RENEWED" as const);

  return {
    schema: BUILD_398_SCHEMA,
    build: BUILD_398,
    themeVersion: BUILD_398_THEME_VERSION,
    minimumConfidenceBps: BUILD_398_MIN_CONFIDENCE_BPS,
    maximumConfidenceDropBps: BUILD_398_MAX_CONFIDENCE_DROP_BPS,
    maximumPersistenceRiskDriftBps: BUILD_398_MAX_PERSISTENCE_RISK_DRIFT_BPS,
    build397Eligible,
    missingConfidenceStabilityShells,
    degradingConfidenceShells,
    missingPersistenceDriftShells,
    persistenceDriftShells,
    missingRenewalShells,
    invalidRenewalShells,
    governanceState,
    blockers: [
      ...(!build397Eligible
        ? ["Build 397 stability, persistence and confidence governance must be verified before Build 398 can close."]
        : []),
      ...(missingConfidenceStabilityShells.length
        ? ["Confidence stability evidence is missing for: " + missingConfidenceStabilityShells.join(", ")]
        : []),
      ...(degradingConfidenceShells.length
        ? ["Post-recalibration confidence is degrading or unverified for: " + degradingConfidenceShells.join(", ")]
        : []),
      ...(missingPersistenceDriftShells.length
        ? ["Intervention persistence drift evidence is missing for: " + missingPersistenceDriftShells.join(", ")]
        : []),
      ...(persistenceDriftShells.length
        ? ["Intervention persistence drift or recurrence is detected for: " + persistenceDriftShells.join(", ")]
        : []),
      ...(missingRenewalShells.length
        ? ["Escalation assurance renewal evidence is missing for: " + missingRenewalShells.join(", ")]
        : []),
      ...(invalidRenewalShells.length
        ? ["Escalation assurance renewal is invalid for: " + invalidRenewalShells.join(", ")]
        : [])
    ],
    policy: {
      confidenceMustRemainAboveMinimumAndWithinDropBudget: true,
      interventionPersistenceRiskDriftIsBounded: true,
      recurrenceBlocksAssuranceRenewal: true,
      ownerAndIndependentRenewalRequired: true,
      renewalRequiresCurrentConfidenceThresholdAndPersistenceEvidence: true,
      deploymentGreenCannotSubstituteForAssuranceRenewalEvidence: true
    }
  };
}

export type Build398AssuranceRenewal = ReturnType<
  typeof assessBuild398AssuranceRenewal
>;
