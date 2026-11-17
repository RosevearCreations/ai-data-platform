import { BUILD_405_APPLICATION_IDS } from "./master-assurance-renewal-security-comms-recertification";
import { MASTER_COMPLETION_AXES, type MasterCompletionAxis } from "./master-completion-core";
import {
  BUILD_410_SERVER_MODULE_IDS,
  BUILD_410_THEME_PROFILE_IDS,
  type Build410ServerModuleId,
  type Build410ThemeProfileId
} from "./master-sensitive-data-dlp-server-shell";
import type { Build412GovernanceAssessment } from "./master-security-incident-fusion";

export const BUILD_413 = 413 as const;
export const BUILD_413_SCHEMA =
  "rosevear.ai-data-platform.build413-acceptance-advancement.v1" as const;
export const BUILD_413_MIN_ADVANCEMENT_POINTS = 10 as const;

export const BUILD_413_ACCEPTANCE_DIMENSIONS = [
  "ROLE_DEVICE",
  "ACCESSIBILITY",
  "PERFORMANCE",
  "UX",
  "LOADING_DEGRADED"
] as const;

export type Build413ApplicationId = (typeof BUILD_405_APPLICATION_IDS)[number];
export type Build413AcceptanceDimension =
  (typeof BUILD_413_ACCEPTANCE_DIMENSIONS)[number];

export type Build413AcceptanceEvidence = {
  evidenceId: string;
  appId: Build413ApplicationId;
  dimension: Build413AcceptanceDimension;
  state: "PASS" | "PARTIAL" | "FAILED";
  acceptancePercent: number;
  criticalFailureCount: number;
  evidenceDigest: string;
  observedAt: string;
  expiresAt: string;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
};

export type Build413CompletionAdvancementEvidence = {
  evidenceId: string;
  appId: Build413ApplicationId;
  axis: MasterCompletionAxis;
  baselinePercent: number;
  targetPercent: number;
  observedPercent: number;
  denominatorHash: string;
  baselineDenominatorHash: string;
  evidenceDigest: string;
  observedAt: string;
  expiresAt: string;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "ADVANCED" | "PARTIAL" | "FAILED";
};

export type Build413ThemeSelectionEvidence = {
  selectionId: string;
  moduleId: Build410ServerModuleId;
  profileId: Build410ThemeProfileId;
  backgroundSlot: string;
  semanticStatusMeaningImmutable: boolean;
  securityStateVisible: boolean;
  ownerUserId: string;
  selectedAt: string;
};

function validPercent(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}
function validDigest(value: string) {
  return /^sha256:[a-f0-9]{64}$/.test(value);
}
function fresh(expiresAt: string, now: number) {
  return Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) > now;
}
function targetFor(baseline: number) {
  return Math.min(100, baseline + BUILD_413_MIN_ADVANCEMENT_POINTS);
}

export function evaluateBuild413Acceptance(input: {
  build412: Pick<Build412GovernanceAssessment, "governanceState">;
  acceptanceEvidence?: readonly Build413AcceptanceEvidence[];
  completionEvidence?: readonly Build413CompletionAdvancementEvidence[];
  themeSelections?: readonly Build413ThemeSelectionEvidence[];
  nowIso: string;
}) {
  const now = Date.parse(input.nowIso);
  const build412Eligible =
    input.build412.governanceState ===
    "SECURITY_INCIDENT_FUSION_AND_RECOVERY_ASSURED";

  const acceptanceByKey = new Map<string, Build413AcceptanceEvidence>();
  for (const item of input.acceptanceEvidence ?? []) {
    acceptanceByKey.set(item.appId + "::" + item.dimension, item);
  }
  const requiredAcceptanceKeys = BUILD_405_APPLICATION_IDS.flatMap((appId) =>
    BUILD_413_ACCEPTANCE_DIMENSIONS.map((dimension) => appId + "::" + dimension)
  );
  const missingAcceptance = requiredAcceptanceKeys.filter((key) => !acceptanceByKey.has(key));
  const staleAcceptance = requiredAcceptanceKeys.filter((key) => {
    const item = acceptanceByKey.get(key);
    return item ? !fresh(item.expiresAt, now) : false;
  });
  const invalidAcceptance = requiredAcceptanceKeys.filter((key) => {
    const item = acceptanceByKey.get(key);
    if (!item) return false;
    return !(
      item.state === "PASS" &&
      validPercent(item.acceptancePercent) &&
      item.acceptancePercent >= 90 &&
      item.criticalFailureCount === 0 &&
      validDigest(item.evidenceDigest) &&
      item.ownerReviewed &&
      item.independentlyVerified
    );
  });

  const completionByKey = new Map<string, Build413CompletionAdvancementEvidence>();
  for (const item of input.completionEvidence ?? []) {
    completionByKey.set(item.appId + "::" + item.axis, item);
  }
  const requiredCompletionKeys = BUILD_405_APPLICATION_IDS.flatMap((appId) =>
    MASTER_COMPLETION_AXES.map((axis) => appId + "::" + axis)
  );
  const missingCompletion = requiredCompletionKeys.filter((key) => !completionByKey.has(key));
  const staleCompletion = requiredCompletionKeys.filter((key) => {
    const item = completionByKey.get(key);
    return item ? !fresh(item.expiresAt, now) : false;
  });
  const invalidCompletion = requiredCompletionKeys.filter((key) => {
    const item = completionByKey.get(key);
    if (!item) return false;
    const minimumTarget = targetFor(item.baselinePercent);
    return !(
      validPercent(item.baselinePercent) &&
      validPercent(item.targetPercent) &&
      validPercent(item.observedPercent) &&
      item.targetPercent >= minimumTarget &&
      item.observedPercent >= item.targetPercent &&
      item.denominatorHash === item.baselineDenominatorHash &&
      /^[a-f0-9]{64}$/.test(item.denominatorHash) &&
      validDigest(item.evidenceDigest) &&
      item.ownerReviewed &&
      item.independentlyVerified &&
      item.state === "ADVANCED"
    );
  });

  const themeByModule = new Map<Build410ServerModuleId, Build413ThemeSelectionEvidence>();
  for (const item of input.themeSelections ?? []) themeByModule.set(item.moduleId, item);
  const missingThemeSelections = BUILD_410_SERVER_MODULE_IDS.filter(
    (moduleId) => !themeByModule.has(moduleId)
  );
  const invalidThemeSelections = BUILD_410_SERVER_MODULE_IDS.filter((moduleId) => {
    const item = themeByModule.get(moduleId);
    if (!item) return false;
    return !(
      BUILD_410_THEME_PROFILE_IDS.includes(item.profileId) &&
      item.semanticStatusMeaningImmutable &&
      item.securityStateVisible &&
      item.backgroundSlot.length <= 120
    );
  });

  const governanceState =
    !build412Eligible
      ? ("HOLD_BUILD412_NOT_ASSURED" as const)
      : missingAcceptance.length
        ? ("ACCEPTANCE_EVIDENCE_REQUIRED" as const)
        : staleAcceptance.length
          ? ("ACCEPTANCE_EVIDENCE_STALE" as const)
          : invalidAcceptance.length
            ? ("ACCEPTANCE_EVIDENCE_FAILED" as const)
            : missingCompletion.length
              ? ("COMPLETION_ADVANCEMENT_EVIDENCE_REQUIRED" as const)
              : staleCompletion.length
                ? ("COMPLETION_ADVANCEMENT_EVIDENCE_STALE" as const)
                : invalidCompletion.length
                  ? ("COMPLETION_ADVANCEMENT_NOT_PROVEN" as const)
                  : missingThemeSelections.length
                    ? ("SERVER_MODULE_THEME_SELECTION_EVIDENCE_REQUIRED" as const)
                    : invalidThemeSelections.length
                      ? ("SERVER_MODULE_THEME_SELECTION_INVALID" as const)
                      : ("SEVEN_APPLICATION_ACCEPTANCE_AND_ADVANCEMENT_ASSURED" as const);

  return {
    schema: BUILD_413_SCHEMA,
    build: BUILD_413,
    governanceState,
    build412Eligible,
    missingAcceptance,
    staleAcceptance,
    invalidAcceptance,
    missingCompletion,
    staleCompletion,
    invalidCompletion,
    missingThemeSelections,
    invalidThemeSelections,
    counts: {
      applications: BUILD_405_APPLICATION_IDS.length,
      acceptanceDimensions: BUILD_413_ACCEPTANCE_DIMENSIONS.length,
      requiredAcceptanceEvidence: requiredAcceptanceKeys.length,
      completionAxes: MASTER_COMPLETION_AXES.length,
      requiredCompletionAdvancementEvidence: requiredCompletionKeys.length,
      serverModules: BUILD_410_SERVER_MODULE_IDS.length,
      themeProfiles: BUILD_410_THEME_PROFILE_IDS.length
    },
    policy: {
      minimumAdvancementPoints: BUILD_413_MIN_ADVANCEMENT_POINTS,
      targetCappedAt100: true,
      denominatorMustRemainLocked: true,
      missingEvidenceMayAdvance: false,
      staleEvidenceMayAdvance: false,
      deploymentGreenMayAdvance: false,
      roleDeviceAcceptanceIsIndependentEvidence: true,
      accessibilityAcceptanceRequired: true,
      performanceAcceptanceRequired: true,
      uxAcceptanceRequired: true,
      loadingAndDegradedStateAcceptanceRequired: true,
      semanticStatusMeaningImmutable: true,
      themeMayHideSecurityState: false
    }
  };
}

export function build413AcceptanceSummary() {
  return {
    applications: [...BUILD_405_APPLICATION_IDS],
    acceptanceDimensions: [...BUILD_413_ACCEPTANCE_DIMENSIONS],
    completionAxes: [...MASTER_COMPLETION_AXES],
    serverModules: [...BUILD_410_SERVER_MODULE_IDS],
    themeProfiles: [...BUILD_410_THEME_PROFILE_IDS],
    requiredAcceptanceEvidence:
      BUILD_405_APPLICATION_IDS.length * BUILD_413_ACCEPTANCE_DIMENSIONS.length,
    requiredCompletionEvidence:
      BUILD_405_APPLICATION_IDS.length * MASTER_COMPLETION_AXES.length
  };
}
