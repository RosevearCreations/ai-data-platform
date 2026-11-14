import type { Build391ShellId } from "./master-theme-drift-governance";
import {
  BUILD_402_APPLICATION_REPOSITORIES,
  BUILD_402_MAX_FORECAST_ERROR_BPS,
  BUILD_402_MAX_LINKAGE_EVIDENCE_AGE_HOURS,
  BUILD_402_MAX_RENEWAL_LEAD_HOURS,
  BUILD_402_MIN_RENEWAL_LEAD_HOURS,
  BUILD_402_TOPOLOGY_ID,
  type Build402ApplicationId,
  type Build402GovernanceAssessment
} from "./master-forecast-recalibration-renewal-timing-linkage-continuity";

export const BUILD_403 = 403 as const;
export const BUILD_403_SCHEMA =
  "rosevear.ai-data-platform.recalibration-persistence-renewal-drift-linkage-recurrence-prevention.v1" as const;
export const BUILD_403_THEME_VERSION = "rosevear-master-instrument.v1" as const;
export const BUILD_403_MIN_RECALIBRATION_PERSISTENCE_HOURS = 72 as const;
export const BUILD_403_MIN_RECALIBRATION_PERSISTENCE_SAMPLES = 7 as const;
export const BUILD_403_MIN_TIMING_RECOVERY_HOURS = 24 as const;
export const BUILD_403_MIN_TIMING_RECOVERY_SAMPLES = 3 as const;
export const BUILD_403_MIN_LINKAGE_PREVENTION_WINDOW_HOURS = 72 as const;
export const BUILD_403_MIN_LINKAGE_PREVENTION_SAMPLES = 3 as const;

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

export type Build403RecalibrationPersistenceValidation = {
  persistenceId: string;
  shellId: Build391ShellId;
  observedAt: string;
  observationWindowHours: number;
  sampleCount: number;
  maximumAbsoluteErrorBps: number;
  latestAbsoluteErrorBps: number;
  recurrenceDetected: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  persistenceState: "PERSISTENT" | "DRIFTED" | "HOLD";
};

export type Build403RenewalTimingDriftRecovery = {
  recoveryId: string;
  shellId: Build391ShellId;
  observedAt: string;
  driftDetected: boolean;
  preRecoveryLeadHours: number;
  postRecoveryLeadHours: number;
  recoveryWindowHours: number;
  sampleCount: number;
  thresholdBreachOccurred: boolean;
  recurrenceDetected: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  recoveryState: "NOT_REQUIRED" | "RECOVERED" | "UNRECOVERED" | "HOLD";
};

export type Build403LinkageRecurrencePrevention = {
  preventionId: string;
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
  linkageRecurrenceDetected: boolean;
  staleEvidenceRecurrenceDetected: boolean;
  authorityTransferDetected: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  preventionState: "PREVENTED" | "RECURRENCE" | "HOLD";
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

export function assessBuild403Governance(input: {
  build402: Build402GovernanceAssessment;
  recalibrationPersistence?: readonly Build403RecalibrationPersistenceValidation[];
  renewalTimingRecovery?: readonly Build403RenewalTimingDriftRecovery[];
  linkageRecurrencePrevention?: readonly Build403LinkageRecurrencePrevention[];
}) {
  const build402Eligible =
    input.build402.governanceState ===
    "SEVEN_APPLICATION_CONTINUITY_GOVERNANCE_VERIFIED";

  const persistenceByShell = latestByShell(input.recalibrationPersistence ?? []);
  const missingPersistenceShells = REQUIRED_SHELLS.filter(
    (shellId) => !persistenceByShell.has(shellId)
  );
  const recalibrationPersistenceDriftShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = persistenceByShell.get(shellId);
    if (!item) return false;

    return !(
      item.observationWindowHours >=
        BUILD_403_MIN_RECALIBRATION_PERSISTENCE_HOURS &&
      item.sampleCount >= BUILD_403_MIN_RECALIBRATION_PERSISTENCE_SAMPLES &&
      validBps(item.maximumAbsoluteErrorBps) &&
      validBps(item.latestAbsoluteErrorBps) &&
      item.maximumAbsoluteErrorBps <= BUILD_402_MAX_FORECAST_ERROR_BPS &&
      item.latestAbsoluteErrorBps <= BUILD_402_MAX_FORECAST_ERROR_BPS &&
      !item.recurrenceDetected &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.persistenceState === "PERSISTENT"
    );
  });

  const recoveryByShell = latestByShell(input.renewalTimingRecovery ?? []);
  const missingTimingRecoveryShells = REQUIRED_SHELLS.filter(
    (shellId) => !recoveryByShell.has(shellId)
  );
  const unrecoveredTimingDriftShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = recoveryByShell.get(shellId);
    if (!item) return false;

    if (
      !validLeadHours(item.preRecoveryLeadHours) ||
      !validLeadHours(item.postRecoveryLeadHours)
    ) {
      return true;
    }

    if (!item.driftDetected) {
      const noRenewalRequired =
        item.preRecoveryLeadHours === 0 && item.postRecoveryLeadHours === 0;
      const remainsOptimal =
        insideRenewalWindow(item.preRecoveryLeadHours) &&
        item.preRecoveryLeadHours === item.postRecoveryLeadHours;

      return !(
        (noRenewalRequired || remainsOptimal) &&
        item.recoveryWindowHours >= 0 &&
        item.sampleCount >= 1 &&
        !item.thresholdBreachOccurred &&
        !item.recurrenceDetected &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.recoveryState === "NOT_REQUIRED"
      );
    }

    const preRecoveryWasDrifted =
      item.preRecoveryLeadHours < BUILD_402_MIN_RENEWAL_LEAD_HOURS ||
      item.preRecoveryLeadHours > BUILD_402_MAX_RENEWAL_LEAD_HOURS;

    return !(
      preRecoveryWasDrifted &&
      insideRenewalWindow(item.postRecoveryLeadHours) &&
      item.recoveryWindowHours >= BUILD_403_MIN_TIMING_RECOVERY_HOURS &&
      item.sampleCount >= BUILD_403_MIN_TIMING_RECOVERY_SAMPLES &&
      !item.thresholdBreachOccurred &&
      !item.recurrenceDetected &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.recoveryState === "RECOVERED"
    );
  });

  const preventionByApplication = latestByApplication(
    input.linkageRecurrencePrevention ?? []
  );
  const missingLinkagePreventionApplications = REQUIRED_APPLICATIONS.filter(
    (appId) => !preventionByApplication.has(appId)
  );
  const linkageRecurrenceApplications = REQUIRED_APPLICATIONS.filter((appId) => {
    const item = preventionByApplication.get(appId);
    if (!item) return false;

    return !(
      item.repository === BUILD_402_APPLICATION_REPOSITORIES[appId] &&
      item.topologyId === BUILD_402_TOPOLOGY_ID &&
      validHex(item.productionMainSha, 40) &&
      validHex(item.manifestSha256, 64) &&
      item.evidenceAgeHours >= 0 &&
      item.evidenceAgeHours <= BUILD_402_MAX_LINKAGE_EVIDENCE_AGE_HOURS &&
      item.observationWindowHours >=
        BUILD_403_MIN_LINKAGE_PREVENTION_WINDOW_HOURS &&
      item.sampleCount >= BUILD_403_MIN_LINKAGE_PREVENTION_SAMPLES &&
      item.selfIdentityMatches &&
      item.canonicalTopologyMatches &&
      item.validationAuthorityMatches &&
      !item.linkageRecurrenceDetected &&
      !item.staleEvidenceRecurrenceDetected &&
      !item.authorityTransferDetected &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.preventionState === "PREVENTED"
    );
  });

  const governanceState =
    !build402Eligible
      ? ("HOLD_BUILD402_NOT_VERIFIED" as const)
      : missingPersistenceShells.length
        ? ("RECALIBRATION_PERSISTENCE_EVIDENCE_REQUIRED" as const)
        : recalibrationPersistenceDriftShells.length
          ? ("RECALIBRATION_PERSISTENCE_DRIFT_DETECTED" as const)
          : missingTimingRecoveryShells.length
            ? ("RENEWAL_TIMING_RECOVERY_EVIDENCE_REQUIRED" as const)
            : unrecoveredTimingDriftShells.length
              ? ("RENEWAL_TIMING_DRIFT_NOT_RECOVERED" as const)
              : missingLinkagePreventionApplications.length
                ? ("LINKAGE_RECURRENCE_PREVENTION_EVIDENCE_REQUIRED" as const)
                : linkageRecurrenceApplications.length
                  ? ("LINKAGE_RECURRENCE_DETECTED" as const)
                  : ("RECURRENCE_PREVENTION_GOVERNANCE_VERIFIED" as const);

  return {
    schema: BUILD_403_SCHEMA,
    build: BUILD_403,
    themeVersion: BUILD_403_THEME_VERSION,
    topologyId: BUILD_402_TOPOLOGY_ID,
    build402Eligible,
    missingPersistenceShells,
    recalibrationPersistenceDriftShells,
    missingTimingRecoveryShells,
    unrecoveredTimingDriftShells,
    missingLinkagePreventionApplications,
    linkageRecurrenceApplications,
    governanceState,
    blockers: [
      ...(!build402Eligible
        ? ["Build 402 seven-application continuity governance must be verified before Build 403 can close."]
        : []),
      ...(missingPersistenceShells.length
        ? ["Recalibration persistence evidence is missing for: " + missingPersistenceShells.join(", ")]
        : []),
      ...(recalibrationPersistenceDriftShells.length
        ? ["Forecast accuracy failed to remain inside the 500-basis-point persistence budget for: " + recalibrationPersistenceDriftShells.join(", ")]
        : []),
      ...(missingTimingRecoveryShells.length
        ? ["Renewal timing recovery evidence is missing for: " + missingTimingRecoveryShells.join(", ")]
        : []),
      ...(unrecoveredTimingDriftShells.length
        ? ["Renewal timing drift is unrecovered, recurrent or unverified for: " + unrecoveredTimingDriftShells.join(", ")]
        : []),
      ...(missingLinkagePreventionApplications.length
        ? ["Linkage recurrence-prevention evidence is missing for: " + missingLinkagePreventionApplications.join(", ")]
        : []),
      ...(linkageRecurrenceApplications.length
        ? ["Seven-application linkage recurrence or stale/authority drift is present for: " + linkageRecurrenceApplications.join(", ")]
        : [])
    ],
    policy: {
      recalibrationMustPersistWithin500BpsFor72Hours: true,
      recalibrationPersistenceMinimumSamples:
        BUILD_403_MIN_RECALIBRATION_PERSISTENCE_SAMPLES,
      renewalTimingDriftMustRecoverIntoSixToTwentyFourHourWindow: true,
      timingRecoveryRequires24HoursAndThreeSamples: true,
      linkagePreventionRequires72HoursAndThreeSamplesPerApplication: true,
      staleEvidenceRecurrenceBlocksClosure: true,
      authorityTransferRemainsForbidden: true,
      productionGreenCannotSubstituteForPersistenceRecoveryOrPreventionEvidence:
        true
    }
  };
}

export type Build403GovernanceAssessment = ReturnType<
  typeof assessBuild403Governance
>;
