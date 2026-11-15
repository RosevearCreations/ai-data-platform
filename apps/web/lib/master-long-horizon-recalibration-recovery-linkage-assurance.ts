import type { Build391ShellId } from "./master-theme-drift-governance";
import {
  BUILD_402_APPLICATION_REPOSITORIES,
  BUILD_402_MAX_FORECAST_ERROR_BPS,
  BUILD_402_MAX_LINKAGE_EVIDENCE_AGE_HOURS,
  BUILD_402_MAX_RENEWAL_LEAD_HOURS,
  BUILD_402_MIN_RENEWAL_LEAD_HOURS,
  BUILD_402_TOPOLOGY_ID,
  type Build402ApplicationId
} from "./master-forecast-recalibration-renewal-timing-linkage-continuity";
import type { Build403GovernanceAssessment } from "./master-recalibration-persistence-renewal-drift-linkage-recurrence-prevention";

export const BUILD_404 = 404 as const;
export const BUILD_404_SCHEMA =
  "rosevear.ai-data-platform.long-horizon-recalibration-recovery-linkage-assurance.v1" as const;
export const BUILD_404_THEME_VERSION = "rosevear-master-instrument.v1" as const;
export const BUILD_404_MIN_LONG_HORIZON_HOURS = 168 as const;
export const BUILD_404_MIN_RECALIBRATION_SAMPLES = 14 as const;
export const BUILD_404_MIN_RECOVERY_EFFECTIVENESS_HOURS = 72 as const;
export const BUILD_404_MIN_RECOVERY_EFFECTIVENESS_SAMPLES = 5 as const;
export const BUILD_404_MIN_LINKAGE_ASSURANCE_SAMPLES = 7 as const;

const REQUIRED_SHELLS: readonly Build391ShellId[] = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
];

const REQUIRED_APPLICATIONS = Object.keys(
  BUILD_402_APPLICATION_REPOSITORIES
) as Build402ApplicationId[];

export type Build404LongHorizonRecalibrationStability = {
  stabilityId: string;
  shellId: Build391ShellId;
  observedAt: string;
  observationWindowHours: number;
  sampleCount: number;
  maximumAbsoluteErrorBps: number;
  latestAbsoluteErrorBps: number;
  samplesOutsideBudget: number;
  recurrenceCount: number;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  stabilityState: "STABLE" | "DEGRADED" | "HOLD";
};

export type Build404RenewalDriftRecoveryEffectiveness = {
  effectivenessId: string;
  shellId: Build391ShellId;
  observedAt: string;
  driftEventCount: number;
  recoveredEventCount: number;
  observationWindowHours: number;
  sampleCount: number;
  latestPostRecoveryLeadHours: number;
  thresholdBreachCount: number;
  recurrenceCount: number;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  effectivenessState: "NOT_REQUIRED" | "EFFECTIVE" | "INEFFECTIVE" | "HOLD";
};

export type Build404LinkagePreventionAssurance = {
  assuranceId: string;
  appId: Build402ApplicationId;
  repository: string;
  topologyId: string;
  observedAt: string;
  productionMainSha: string;
  manifestSha256: string;
  evidenceAgeHours: number;
  observationWindowHours: number;
  sampleCount: number;
  selfIdentityMatches: boolean;
  canonicalTopologyMatches: boolean;
  validationAuthorityMatches: boolean;
  continuityBreakCount: number;
  staleEvidenceRecurrenceCount: number;
  authorityTransferCount: number;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  assuranceState: "ASSURED" | "DEGRADED" | "HOLD";
};

function latestByShell<T extends { shellId: Build391ShellId; observedAt: string }>(
  records: readonly T[]
) {
  const latest = new Map<Build391ShellId, T>();
  for (const item of [...records].sort((a, b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    if (!latest.has(item.shellId)) latest.set(item.shellId, item);
  }
  return latest;
}

function latestByApplication<
  T extends { appId: Build402ApplicationId; observedAt: string }
>(records: readonly T[]) {
  const latest = new Map<Build402ApplicationId, T>();
  for (const item of [...records].sort((a, b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    if (!latest.has(item.appId)) latest.set(item.appId, item);
  }
  return latest;
}

function validBps(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 10_000;
}

function validCount(value: number) {
  return Number.isInteger(value) && value >= 0;
}

function validLeadHours(value: number) {
  return Number.isInteger(value) && value >= 0;
}

function insideRenewalWindow(value: number) {
  return (
    value >= BUILD_402_MIN_RENEWAL_LEAD_HOURS &&
    value <= BUILD_402_MAX_RENEWAL_LEAD_HOURS
  );
}

function validHex(value: string, length: number) {
  return new RegExp("^[0-9a-f]{" + length + "}$").test(value);
}

export function assessBuild404Governance(input: {
  build403: Build403GovernanceAssessment;
  recalibrationStability?: readonly Build404LongHorizonRecalibrationStability[];
  recoveryEffectiveness?: readonly Build404RenewalDriftRecoveryEffectiveness[];
  linkageAssurance?: readonly Build404LinkagePreventionAssurance[];
}) {
  const build403Eligible =
    input.build403.governanceState ===
    "RECURRENCE_PREVENTION_GOVERNANCE_VERIFIED";

  const stabilityByShell = latestByShell(input.recalibrationStability ?? []);
  const missingStabilityShells = REQUIRED_SHELLS.filter(
    (shellId) => !stabilityByShell.has(shellId)
  );
  const unstableRecalibrationShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = stabilityByShell.get(shellId);
    if (!item) return false;

    return !(
      item.observationWindowHours >= BUILD_404_MIN_LONG_HORIZON_HOURS &&
      item.sampleCount >= BUILD_404_MIN_RECALIBRATION_SAMPLES &&
      validBps(item.maximumAbsoluteErrorBps) &&
      validBps(item.latestAbsoluteErrorBps) &&
      item.maximumAbsoluteErrorBps <= BUILD_402_MAX_FORECAST_ERROR_BPS &&
      item.latestAbsoluteErrorBps <= BUILD_402_MAX_FORECAST_ERROR_BPS &&
      item.samplesOutsideBudget === 0 &&
      item.recurrenceCount === 0 &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.stabilityState === "STABLE"
    );
  });

  const effectivenessByShell = latestByShell(input.recoveryEffectiveness ?? []);
  const missingRecoveryEffectivenessShells = REQUIRED_SHELLS.filter(
    (shellId) => !effectivenessByShell.has(shellId)
  );
  const ineffectiveRecoveryShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = effectivenessByShell.get(shellId);
    if (!item) return false;

    const baseValid =
      validCount(item.driftEventCount) &&
      validCount(item.recoveredEventCount) &&
      validCount(item.thresholdBreachCount) &&
      validCount(item.recurrenceCount) &&
      validLeadHours(item.latestPostRecoveryLeadHours) &&
      item.observationWindowHours >=
        BUILD_404_MIN_RECOVERY_EFFECTIVENESS_HOURS &&
      item.sampleCount >= BUILD_404_MIN_RECOVERY_EFFECTIVENESS_SAMPLES &&
      item.ownerReviewed &&
      item.independentlyVerified;

    if (!baseValid) return true;

    if (item.driftEventCount === 0) {
      return !(
        item.recoveredEventCount === 0 &&
        item.latestPostRecoveryLeadHours === 0 &&
        item.thresholdBreachCount === 0 &&
        item.recurrenceCount === 0 &&
        item.effectivenessState === "NOT_REQUIRED"
      );
    }

    return !(
      item.recoveredEventCount === item.driftEventCount &&
      insideRenewalWindow(item.latestPostRecoveryLeadHours) &&
      item.thresholdBreachCount === 0 &&
      item.recurrenceCount === 0 &&
      item.effectivenessState === "EFFECTIVE"
    );
  });

  const assuranceByApplication = latestByApplication(input.linkageAssurance ?? []);
  const missingAssuranceApplications = REQUIRED_APPLICATIONS.filter(
    (appId) => !assuranceByApplication.has(appId)
  );
  const degradedAssuranceApplications = REQUIRED_APPLICATIONS.filter((appId) => {
    const item = assuranceByApplication.get(appId);
    if (!item) return false;

    return !(
      item.repository === BUILD_402_APPLICATION_REPOSITORIES[appId] &&
      item.topologyId === BUILD_402_TOPOLOGY_ID &&
      validHex(item.productionMainSha, 40) &&
      validHex(item.manifestSha256, 64) &&
      item.evidenceAgeHours >= 0 &&
      item.evidenceAgeHours <= BUILD_402_MAX_LINKAGE_EVIDENCE_AGE_HOURS &&
      item.observationWindowHours >= BUILD_404_MIN_LONG_HORIZON_HOURS &&
      item.sampleCount >= BUILD_404_MIN_LINKAGE_ASSURANCE_SAMPLES &&
      item.selfIdentityMatches &&
      item.canonicalTopologyMatches &&
      item.validationAuthorityMatches &&
      item.continuityBreakCount === 0 &&
      item.staleEvidenceRecurrenceCount === 0 &&
      item.authorityTransferCount === 0 &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.assuranceState === "ASSURED"
    );
  });

  const governanceState =
    !build403Eligible
      ? ("HOLD_BUILD403_NOT_VERIFIED" as const)
      : missingStabilityShells.length
        ? ("LONG_HORIZON_RECALIBRATION_EVIDENCE_REQUIRED" as const)
        : unstableRecalibrationShells.length
          ? ("RECALIBRATION_LONG_HORIZON_INSTABILITY_DETECTED" as const)
          : missingRecoveryEffectivenessShells.length
            ? ("RENEWAL_RECOVERY_EFFECTIVENESS_EVIDENCE_REQUIRED" as const)
            : ineffectiveRecoveryShells.length
              ? ("RENEWAL_DRIFT_RECOVERY_INEFFECTIVE" as const)
              : missingAssuranceApplications.length
                ? ("LINKAGE_PREVENTION_ASSURANCE_EVIDENCE_REQUIRED" as const)
                : degradedAssuranceApplications.length
                  ? ("LINKAGE_PREVENTION_ASSURANCE_DEGRADED" as const)
                  : ("LONG_HORIZON_PREVENTION_ASSURANCE_GOVERNANCE_VERIFIED" as const);

  return {
    schema: BUILD_404_SCHEMA,
    build: BUILD_404,
    themeVersion: BUILD_404_THEME_VERSION,
    topologyId: BUILD_402_TOPOLOGY_ID,
    build403Eligible,
    missingStabilityShells,
    unstableRecalibrationShells,
    missingRecoveryEffectivenessShells,
    ineffectiveRecoveryShells,
    missingAssuranceApplications,
    degradedAssuranceApplications,
    governanceState,
    blockers: [
      ...(!build403Eligible
        ? ["Build 403 recurrence-prevention governance must be verified before Build 404 can close."]
        : []),
      ...(missingStabilityShells.length
        ? ["Long-horizon recalibration stability evidence is missing for: " + missingStabilityShells.join(", ")]
        : []),
      ...(unstableRecalibrationShells.length
        ? ["Recalibration persistence is unstable over the long horizon for: " + unstableRecalibrationShells.join(", ")]
        : []),
      ...(missingRecoveryEffectivenessShells.length
        ? ["Renewal drift recovery effectiveness evidence is missing for: " + missingRecoveryEffectivenessShells.join(", ")]
        : []),
      ...(ineffectiveRecoveryShells.length
        ? ["Renewal drift recovery is ineffective or recurrent for: " + ineffectiveRecoveryShells.join(", ")]
        : []),
      ...(missingAssuranceApplications.length
        ? ["Linkage prevention assurance evidence is missing for: " + missingAssuranceApplications.join(", ")]
        : []),
      ...(degradedAssuranceApplications.length
        ? ["Seven-application linkage prevention assurance is degraded for: " + degradedAssuranceApplications.join(", ")]
        : [])
    ],
    policy: {
      recalibrationAccuracyMustRemainWithin500BpsForSevenDays: true,
      recalibrationLongHorizonMinimumSamples:
        BUILD_404_MIN_RECALIBRATION_SAMPLES,
      allDetectedRenewalTimingDriftMustRecover: true,
      recoveryEffectivenessRequires72HoursAndFiveSamples: true,
      linkageAssuranceRequiresSevenDaysAndSevenSamplesPerApplication: true,
      continuityBreaksOrStaleRecurrenceBlockAssurance: true,
      authorityTransferRemainsForbidden: true,
      productionGreenCannotSubstituteForLongHorizonAssuranceEvidence: true
    }
  };
}

export type Build404GovernanceAssessment = ReturnType<
  typeof assessBuild404Governance
>;
