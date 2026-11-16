import {
  BUILD_405_APPLICATION_IDS
} from "./master-assurance-renewal-security-comms-recertification";
import type { Build402ApplicationId } from "./master-forecast-recalibration-renewal-timing-linkage-continuity";
import type { Build409GovernanceAssessment } from "./master-event-message-v2-durable-replay";

export const BUILD_410 = 410 as const;
export const BUILD_410_SCHEMA =
  "rosevear.ai-data-platform.sensitive-data-dlp-server-shell.v1" as const;
export const BUILD_410_SERVER_SHELL_ID = "rosevear-server-shell" as const;
export const BUILD_410_PRIMARY_AUTOMATION_HOST_ROLE =
  "rosevear-ai-hub-windows-server" as const;

export const BUILD_410_DATA_CLASSES = [
  "D0_PUBLIC",
  "D1_INTERNAL",
  "D2_PERSONAL",
  "D3_CONFIDENTIAL",
  "D4_SECRET"
] as const;
export type Build410DataClass = (typeof BUILD_410_DATA_CLASSES)[number];

export const BUILD_410_SERVER_MODULE_IDS = [
  "ai-data-platform",
  "rosevear-ai-hub",
  "rosevear-comms-hub"
] as const;
export type Build410ServerModuleId =
  (typeof BUILD_410_SERVER_MODULE_IDS)[number];

export const BUILD_410_SLAVE_SHELL_IDS = ["yw", "icamp"] as const;
export type Build410SlaveShellId = (typeof BUILD_410_SLAVE_SHELL_IDS)[number];

export const BUILD_410_THEME_PROFILE_IDS = [
  "night-ops",
  "copper-workshop",
  "meadow-grid"
] as const;
export type Build410ThemeProfileId =
  (typeof BUILD_410_THEME_PROFILE_IDS)[number];

export type Build410ClassificationPolicy = {
  policyId: string;
  appId: Build402ApplicationId;
  dataClass: Build410DataClass;
  tlsRequired: boolean;
  atRestEncryptionRequired: boolean;
  fieldLevelEncryptionRequired: boolean;
  logRedactionRequired: boolean;
  rawValueAllowedInLogs: boolean;
  rawValueAllowedInCrossAppMessages: boolean;
  rawValueAllowedInAuditEvidence: boolean;
  externalExportRequiresInspection: boolean;
  restrictedExportRequiresOwnerGate: boolean;
  retentionPurposeBound: boolean;
  deletionEvidenceRequired: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "CERTIFIED" | "HOLD" | "FAILED";
  observedAt: string;
};

export type Build410EncryptionProfile = {
  profileId: string;
  appId: Build402ApplicationId;
  transportTlsVerified: boolean;
  sensitiveAtRestEncryptionVerified: boolean;
  secretFieldEncryptionVerified: boolean;
  keyMaterialOutsideSourceControl: boolean;
  rawPrivateKeysInEvidence: boolean;
  keyRotationSupported: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "VERIFIED" | "HOLD" | "FAILED";
  observedAt: string;
};

export type Build410RedactionRetentionDlpAssurance = {
  assuranceId: string;
  appId: Build402ApplicationId;
  structuredLogRedactionVerified: boolean;
  tokenPasswordKeyPatternRedactionVerified: boolean;
  personalDataAuditMinimizationVerified: boolean;
  purposeBoundRetentionVerified: boolean;
  expiryDeletionWorkflowVerified: boolean;
  deletionEvidencePreserved: boolean;
  exportDlpInspectionVerified: boolean;
  restrictedExportOwnerGateVerified: boolean;
  rawSecretExfiltrationBlocked: boolean;
  crossTenantExportBlocked: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "ASSURED" | "HOLD" | "FAILED";
  observedAt: string;
};

export type Build410ServerShellModule = {
  moduleId: Build410ServerModuleId;
  displayName: string;
  role: string;
  outerShellId: typeof BUILD_410_SERVER_SHELL_ID;
  independentlyDisableable: boolean;
  ownerSwitchRequired: boolean;
  disabledStateFailsClosed: boolean;
  shellRemainsAvailableWhenDisabled: boolean;
  primaryAutomationHostRole: typeof BUILD_410_PRIMARY_AUTOMATION_HOST_ROLE;
  cloudUiMayRemainIndependent: boolean;
  themeProfileSelectable: boolean;
  backgroundImageSlotSelectable: boolean;
  authorityPreserved: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "REGISTERED" | "HOLD" | "FAILED";
  observedAt: string;
};

export type Build410SlaveMonitoringProfile = {
  profileId: string;
  shellId: Build410SlaveShellId;
  readOnlyByDefault: boolean;
  deploymentStatusVisible: boolean;
  runtimeHealthVisible: boolean;
  sourceRevisionVisible: boolean;
  signerReceiverStatusVisible: boolean;
  queueDeadLetterStatusVisible: boolean;
  latencyErrorStatusVisible: boolean;
  migrationStatusVisible: boolean;
  securityHoldsVisible: boolean;
  vercelQuotaVisible: boolean;
  unknownStateFailsClosed: boolean;
  monitoringMayGrantSlaveAuthority: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "REGISTERED" | "HOLD" | "FAILED";
  observedAt: string;
};

export type Build410ThemeProfile = {
  profileId: Build410ThemeProfileId;
  displayName: string;
  colorsSelectable: boolean;
  backgroundImageSlotSelectable: boolean;
  semanticSecurityColorsImmutable: boolean;
  statusMeaningImmutable: boolean;
  themeMayHideSecurityState: boolean;
  appliesPerModule: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "CERTIFIED" | "HOLD" | "FAILED";
  observedAt: string;
};

function key(...parts: string[]) {
  return parts.join("::");
}

function latestByKey<T>(values: readonly T[], getKey: (value: T) => string) {
  const map = new Map<string, T>();
  for (const value of values) map.set(getKey(value), value);
  return map;
}

function sensitiveClass(dataClass: Build410DataClass) {
  return dataClass === "D2_PERSONAL" ||
    dataClass === "D3_CONFIDENTIAL" ||
    dataClass === "D4_SECRET";
}

export function assessBuild410Governance(input: {
  build409: Build409GovernanceAssessment;
  classificationPolicies?: readonly Build410ClassificationPolicy[];
  encryptionProfiles?: readonly Build410EncryptionProfile[];
  redactionRetentionDlp?: readonly Build410RedactionRetentionDlpAssurance[];
  serverModules?: readonly Build410ServerShellModule[];
  slaveMonitoring?: readonly Build410SlaveMonitoringProfile[];
  themeProfiles?: readonly Build410ThemeProfile[];
}) {
  const build409Eligible =
    input.build409.governanceState ===
    "EVENT_MESSAGE_V2_DURABLE_DELIVERY_AND_REPLAY_GOVERNANCE_VERIFIED";

  const classifications = latestByKey(
    input.classificationPolicies ?? [],
    (item) => key(item.appId, item.dataClass)
  );
  const requiredClassificationKeys = BUILD_405_APPLICATION_IDS.flatMap((appId) =>
    BUILD_410_DATA_CLASSES.map((dataClass) => key(appId, dataClass))
  );
  const missingClassificationPolicies = requiredClassificationKeys.filter(
    (item) => !classifications.has(item)
  );
  const invalidClassificationPolicies = [...classifications.values()].filter(
    (item) => {
      const sensitive = sensitiveClass(item.dataClass);
      const secret = item.dataClass === "D4_SECRET";
      return !(
        item.tlsRequired &&
        (!sensitive || item.atRestEncryptionRequired) &&
        (!secret || item.fieldLevelEncryptionRequired) &&
        (!sensitive || item.logRedactionRequired) &&
        (!sensitive || item.rawValueAllowedInLogs === false) &&
        (!sensitive || item.rawValueAllowedInCrossAppMessages === false) &&
        (!sensitive || item.rawValueAllowedInAuditEvidence === false) &&
        item.externalExportRequiresInspection &&
        (!sensitive || item.restrictedExportRequiresOwnerGate) &&
        item.retentionPurposeBound &&
        item.deletionEvidenceRequired &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "CERTIFIED"
      );
    }
  );

  const encryption = latestByKey(
    input.encryptionProfiles ?? [],
    (item) => item.appId
  );
  const missingEncryptionProfiles = BUILD_405_APPLICATION_IDS.filter(
    (appId) => !encryption.has(appId)
  );
  const invalidEncryptionProfiles = [...encryption.values()].filter(
    (item) =>
      !(
        item.transportTlsVerified &&
        item.sensitiveAtRestEncryptionVerified &&
        item.secretFieldEncryptionVerified &&
        item.keyMaterialOutsideSourceControl &&
        item.rawPrivateKeysInEvidence === false &&
        item.keyRotationSupported &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "VERIFIED"
      )
  );

  const dlp = latestByKey(
    input.redactionRetentionDlp ?? [],
    (item) => item.appId
  );
  const missingDlpAssurance = BUILD_405_APPLICATION_IDS.filter(
    (appId) => !dlp.has(appId)
  );
  const invalidDlpAssurance = [...dlp.values()].filter(
    (item) =>
      !(
        item.structuredLogRedactionVerified &&
        item.tokenPasswordKeyPatternRedactionVerified &&
        item.personalDataAuditMinimizationVerified &&
        item.purposeBoundRetentionVerified &&
        item.expiryDeletionWorkflowVerified &&
        item.deletionEvidencePreserved &&
        item.exportDlpInspectionVerified &&
        item.restrictedExportOwnerGateVerified &&
        item.rawSecretExfiltrationBlocked &&
        item.crossTenantExportBlocked &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "ASSURED"
      )
  );

  const modules = latestByKey(input.serverModules ?? [], (item) => item.moduleId);
  const missingServerModules = BUILD_410_SERVER_MODULE_IDS.filter(
    (moduleId) => !modules.has(moduleId)
  );
  const invalidServerModules = [...modules.values()].filter(
    (item) =>
      !(
        item.outerShellId === BUILD_410_SERVER_SHELL_ID &&
        item.independentlyDisableable &&
        item.ownerSwitchRequired &&
        item.disabledStateFailsClosed &&
        item.shellRemainsAvailableWhenDisabled &&
        item.primaryAutomationHostRole === BUILD_410_PRIMARY_AUTOMATION_HOST_ROLE &&
        item.cloudUiMayRemainIndependent &&
        item.themeProfileSelectable &&
        item.backgroundImageSlotSelectable &&
        item.authorityPreserved &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "REGISTERED"
      )
  );

  const monitoring = latestByKey(
    input.slaveMonitoring ?? [],
    (item) => item.shellId
  );
  const missingSlaveMonitoring = BUILD_410_SLAVE_SHELL_IDS.filter(
    (shellId) => !monitoring.has(shellId)
  );
  const invalidSlaveMonitoring = [...monitoring.values()].filter(
    (item) =>
      !(
        item.readOnlyByDefault &&
        item.deploymentStatusVisible &&
        item.runtimeHealthVisible &&
        item.sourceRevisionVisible &&
        item.signerReceiverStatusVisible &&
        item.queueDeadLetterStatusVisible &&
        item.latencyErrorStatusVisible &&
        item.migrationStatusVisible &&
        item.securityHoldsVisible &&
        item.vercelQuotaVisible &&
        item.unknownStateFailsClosed &&
        item.monitoringMayGrantSlaveAuthority === false &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "REGISTERED"
      )
  );

  const themes = latestByKey(input.themeProfiles ?? [], (item) => item.profileId);
  const missingThemeProfiles = BUILD_410_THEME_PROFILE_IDS.filter(
    (profileId) => !themes.has(profileId)
  );
  const invalidThemeProfiles = [...themes.values()].filter(
    (item) =>
      !(
        item.colorsSelectable &&
        item.backgroundImageSlotSelectable &&
        item.semanticSecurityColorsImmutable &&
        item.statusMeaningImmutable &&
        item.themeMayHideSecurityState === false &&
        item.appliesPerModule &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "CERTIFIED"
      )
  );

  const governanceState =
    !build409Eligible
      ? ("HOLD_BUILD409_NOT_VERIFIED" as const)
      : missingClassificationPolicies.length
        ? ("DATA_CLASSIFICATION_REQUIRED" as const)
        : invalidClassificationPolicies.length
          ? ("DATA_CLASSIFICATION_INVALID" as const)
          : missingEncryptionProfiles.length
            ? ("ENCRYPTION_ASSURANCE_REQUIRED" as const)
            : invalidEncryptionProfiles.length
              ? ("ENCRYPTION_ASSURANCE_INVALID" as const)
              : missingDlpAssurance.length
                ? ("DLP_ASSURANCE_REQUIRED" as const)
                : invalidDlpAssurance.length
                  ? ("DLP_ASSURANCE_INVALID" as const)
                  : missingServerModules.length
                    ? ("SERVER_SHELL_MODULE_REGISTRATION_REQUIRED" as const)
                    : invalidServerModules.length
                      ? ("SERVER_SHELL_MODULE_REGISTRATION_INVALID" as const)
                      : missingSlaveMonitoring.length
                        ? ("SLAVE_MONITORING_PROFILE_REQUIRED" as const)
                        : invalidSlaveMonitoring.length
                          ? ("SLAVE_MONITORING_PROFILE_INVALID" as const)
                          : missingThemeProfiles.length
                            ? ("SERVER_THEME_PROFILE_REQUIRED" as const)
                            : invalidThemeProfiles.length
                              ? ("SERVER_THEME_PROFILE_INVALID" as const)
                              : ("SENSITIVE_DATA_DLP_AND_SERVER_SHELL_CONVERGENCE_ASSURED" as const);

  return {
    schema: BUILD_410_SCHEMA,
    build: BUILD_410,
    build409Eligible,
    governanceState,
    missingClassificationPolicies,
    invalidClassificationPolicies,
    missingEncryptionProfiles,
    invalidEncryptionProfiles,
    missingDlpAssurance,
    invalidDlpAssurance,
    missingServerModules,
    invalidServerModules,
    missingSlaveMonitoring,
    invalidSlaveMonitoring,
    missingThemeProfiles,
    invalidThemeProfiles,
    counts: {
      applications: BUILD_405_APPLICATION_IDS.length,
      dataClasses: BUILD_410_DATA_CLASSES.length,
      classificationPolicies: requiredClassificationKeys.length,
      encryptionProfiles: BUILD_405_APPLICATION_IDS.length,
      dlpAssuranceProfiles: BUILD_405_APPLICATION_IDS.length,
      serverModules: BUILD_410_SERVER_MODULE_IDS.length,
      slaveMonitoringProfiles: BUILD_410_SLAVE_SHELL_IDS.length,
      themeProfiles: BUILD_410_THEME_PROFILE_IDS.length
    },
    policy: {
      serverShellId: BUILD_410_SERVER_SHELL_ID,
      outerShell: "ai-data-platform",
      primaryAutomationHostRole: BUILD_410_PRIMARY_AUTOMATION_HOST_ROLE,
      modulesIndependentlyDisableable: true,
      disablingOneModuleMustNotStopShell: true,
      perModuleThemesSupported: true,
      slaveMonitoringReadOnlyByDefault: true,
      homeAutomationOwnedByAiHubModule: true,
      synchronizationProtocol: "1.1",
      lockstepReleaseRequired: false,
      rawSecretsInLogsAllowed: false,
      rawSecretsInCrossAppMessagesAllowed: false,
      productionGreenImpliesPhysicalServerUpdated: false
    }
  };
}

export type Build410GovernanceAssessment = ReturnType<
  typeof assessBuild410Governance
>;
