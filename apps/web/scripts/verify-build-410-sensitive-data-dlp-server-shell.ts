import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";

import {
  BUILD_405_APPLICATION_IDS
} from "../lib/master-assurance-renewal-security-comms-recertification";
import {
  BUILD_410,
  BUILD_410_DATA_CLASSES,
  BUILD_410_PRIMARY_AUTOMATION_HOST_ROLE,
  BUILD_410_SERVER_MODULE_IDS,
  BUILD_410_SERVER_SHELL_ID,
  BUILD_410_SLAVE_SHELL_IDS,
  BUILD_410_THEME_PROFILE_IDS,
  assessBuild410Governance,
  type Build410ClassificationPolicy,
  type Build410EncryptionProfile,
  type Build410RedactionRetentionDlpAssurance,
  type Build410ServerShellModule,
  type Build410SlaveMonitoringProfile,
  type Build410ThemeProfile
} from "../lib/master-sensitive-data-dlp-server-shell";
import type { Build409GovernanceAssessment } from "../lib/master-event-message-v2-durable-replay";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  readFileSync(path.resolve(root, relative), "utf8");

assert.equal(BUILD_410, 410);
assert.equal(BUILD_405_APPLICATION_IDS.length, 7);
assert.equal(BUILD_410_DATA_CLASSES.length, 5);
assert.equal(BUILD_410_SERVER_MODULE_IDS.length, 3);
assert.equal(BUILD_410_SLAVE_SHELL_IDS.length, 2);
assert.equal(BUILD_410_THEME_PROFILE_IDS.length, 3);
assert.equal(BUILD_410_SERVER_SHELL_ID, "rosevear-server-shell");
assert.equal(
  BUILD_410_PRIMARY_AUTOMATION_HOST_ROLE,
  "rosevear-ai-hub-windows-server"
);

const observedAt = "2026-11-16T10:30:00.000Z";
const build409Verified = {
  governanceState:
    "EVENT_MESSAGE_V2_DURABLE_DELIVERY_AND_REPLAY_GOVERNANCE_VERIFIED"
} as unknown as Build409GovernanceAssessment;

const classificationPolicies: Build410ClassificationPolicy[] =
  BUILD_405_APPLICATION_IDS.flatMap((appId) =>
    BUILD_410_DATA_CLASSES.map((dataClass) => {
      const sensitive =
        dataClass === "D2_PERSONAL" ||
        dataClass === "D3_CONFIDENTIAL" ||
        dataClass === "D4_SECRET";
      const secret = dataClass === "D4_SECRET";
      return {
        policyId: "class-" + appId + "-" + dataClass,
        appId,
        dataClass,
        tlsRequired: true,
        atRestEncryptionRequired: sensitive,
        fieldLevelEncryptionRequired: secret,
        logRedactionRequired: sensitive,
        rawValueAllowedInLogs: !sensitive,
        rawValueAllowedInCrossAppMessages: !sensitive,
        rawValueAllowedInAuditEvidence: !sensitive,
        externalExportRequiresInspection: true,
        restrictedExportRequiresOwnerGate: sensitive,
        retentionPurposeBound: true,
        deletionEvidenceRequired: true,
        ownerReviewed: true,
        independentlyVerified: true,
        state: "CERTIFIED",
        observedAt
      };
    })
  );

const encryptionProfiles: Build410EncryptionProfile[] =
  BUILD_405_APPLICATION_IDS.map((appId) => ({
    profileId: "enc-" + appId,
    appId,
    transportTlsVerified: true,
    sensitiveAtRestEncryptionVerified: true,
    secretFieldEncryptionVerified: true,
    keyMaterialOutsideSourceControl: true,
    rawPrivateKeysInEvidence: false,
    keyRotationSupported: true,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "VERIFIED",
    observedAt
  }));

const redactionRetentionDlp: Build410RedactionRetentionDlpAssurance[] =
  BUILD_405_APPLICATION_IDS.map((appId) => ({
    assuranceId: "dlp-" + appId,
    appId,
    structuredLogRedactionVerified: true,
    tokenPasswordKeyPatternRedactionVerified: true,
    personalDataAuditMinimizationVerified: true,
    purposeBoundRetentionVerified: true,
    expiryDeletionWorkflowVerified: true,
    deletionEvidencePreserved: true,
    exportDlpInspectionVerified: true,
    restrictedExportOwnerGateVerified: true,
    rawSecretExfiltrationBlocked: true,
    crossTenantExportBlocked: true,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "ASSURED",
    observedAt
  }));

const serverModules: Build410ServerShellModule[] = [
  {
    moduleId: "ai-data-platform",
    displayName: "AI Data Platform",
    role: "Data & Intelligence",
    outerShellId: BUILD_410_SERVER_SHELL_ID,
    independentlyDisableable: true,
    ownerSwitchRequired: true,
    disabledStateFailsClosed: true,
    shellRemainsAvailableWhenDisabled: true,
    primaryAutomationHostRole: BUILD_410_PRIMARY_AUTOMATION_HOST_ROLE,
    cloudUiMayRemainIndependent: true,
    themeProfileSelectable: true,
    backgroundImageSlotSelectable: true,
    authorityPreserved: true,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "REGISTERED",
    observedAt
  },
  {
    moduleId: "rosevear-ai-hub",
    displayName: "Rosevear AI Hub",
    role: "AI, Home & Automation",
    outerShellId: BUILD_410_SERVER_SHELL_ID,
    independentlyDisableable: true,
    ownerSwitchRequired: true,
    disabledStateFailsClosed: true,
    shellRemainsAvailableWhenDisabled: true,
    primaryAutomationHostRole: BUILD_410_PRIMARY_AUTOMATION_HOST_ROLE,
    cloudUiMayRemainIndependent: true,
    themeProfileSelectable: true,
    backgroundImageSlotSelectable: true,
    authorityPreserved: true,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "REGISTERED",
    observedAt
  },
  {
    moduleId: "rosevear-comms-hub",
    displayName: "Rosevear Comms Hub",
    role: "Communications & Operations",
    outerShellId: BUILD_410_SERVER_SHELL_ID,
    independentlyDisableable: true,
    ownerSwitchRequired: true,
    disabledStateFailsClosed: true,
    shellRemainsAvailableWhenDisabled: true,
    primaryAutomationHostRole: BUILD_410_PRIMARY_AUTOMATION_HOST_ROLE,
    cloudUiMayRemainIndependent: true,
    themeProfileSelectable: true,
    backgroundImageSlotSelectable: true,
    authorityPreserved: true,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "REGISTERED",
    observedAt
  }
];

const slaveMonitoring: Build410SlaveMonitoringProfile[] =
  BUILD_410_SLAVE_SHELL_IDS.map((shellId) => ({
    profileId: "monitor-" + shellId,
    shellId,
    readOnlyByDefault: true,
    deploymentStatusVisible: true,
    runtimeHealthVisible: true,
    sourceRevisionVisible: true,
    signerReceiverStatusVisible: true,
    queueDeadLetterStatusVisible: true,
    latencyErrorStatusVisible: true,
    migrationStatusVisible: true,
    securityHoldsVisible: true,
    vercelQuotaVisible: true,
    unknownStateFailsClosed: true,
    monitoringMayGrantSlaveAuthority: false,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "REGISTERED",
    observedAt
  }));

const themeProfiles: Build410ThemeProfile[] =
  BUILD_410_THEME_PROFILE_IDS.map((profileId) => ({
    profileId,
    displayName:
      profileId === "night-ops"
        ? "Night Ops"
        : profileId === "copper-workshop"
          ? "Copper Workshop"
          : "Meadow Grid",
    colorsSelectable: true,
    backgroundImageSlotSelectable: true,
    semanticSecurityColorsImmutable: true,
    statusMeaningImmutable: true,
    themeMayHideSecurityState: false,
    appliesPerModule: true,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "CERTIFIED",
    observedAt
  }));

assert.equal(classificationPolicies.length, 35);
assert.equal(encryptionProfiles.length, 7);
assert.equal(redactionRetentionDlp.length, 7);
assert.equal(serverModules.length, 3);
assert.equal(slaveMonitoring.length, 2);
assert.equal(themeProfiles.length, 3);

assert.equal(
  assessBuild410Governance({
    build409: { governanceState: "HOLD" } as unknown as Build409GovernanceAssessment,
    classificationPolicies,
    encryptionProfiles,
    redactionRetentionDlp,
    serverModules,
    slaveMonitoring,
    themeProfiles
  }).governanceState,
  "HOLD_BUILD409_NOT_VERIFIED"
);

assert.equal(
  assessBuild410Governance({
    build409: build409Verified,
    classificationPolicies: classificationPolicies.slice(1),
    encryptionProfiles,
    redactionRetentionDlp,
    serverModules,
    slaveMonitoring,
    themeProfiles
  }).governanceState,
  "DATA_CLASSIFICATION_REQUIRED"
);

const badClassification = classificationPolicies.map((item) =>
  item.dataClass === "D4_SECRET" && item.appId === "ai-data-platform"
    ? { ...item, rawValueAllowedInLogs: true }
    : item
);
assert.equal(
  assessBuild410Governance({
    build409: build409Verified,
    classificationPolicies: badClassification,
    encryptionProfiles,
    redactionRetentionDlp,
    serverModules,
    slaveMonitoring,
    themeProfiles
  }).governanceState,
  "DATA_CLASSIFICATION_INVALID"
);

const badEncryption = encryptionProfiles.map((item, index) =>
  index === 0 ? { ...item, secretFieldEncryptionVerified: false } : item
);
assert.equal(
  assessBuild410Governance({
    build409: build409Verified,
    classificationPolicies,
    encryptionProfiles: badEncryption,
    redactionRetentionDlp,
    serverModules,
    slaveMonitoring,
    themeProfiles
  }).governanceState,
  "ENCRYPTION_ASSURANCE_INVALID"
);

const badDlp = redactionRetentionDlp.map((item, index) =>
  index === 0 ? { ...item, rawSecretExfiltrationBlocked: false } : item
);
assert.equal(
  assessBuild410Governance({
    build409: build409Verified,
    classificationPolicies,
    encryptionProfiles,
    redactionRetentionDlp: badDlp,
    serverModules,
    slaveMonitoring,
    themeProfiles
  }).governanceState,
  "DLP_ASSURANCE_INVALID"
);

const badModule = serverModules.map((item, index) =>
  index === 0 ? { ...item, independentlyDisableable: false } : item
);
assert.equal(
  assessBuild410Governance({
    build409: build409Verified,
    classificationPolicies,
    encryptionProfiles,
    redactionRetentionDlp,
    serverModules: badModule,
    slaveMonitoring,
    themeProfiles
  }).governanceState,
  "SERVER_SHELL_MODULE_REGISTRATION_INVALID"
);

const badMonitor = slaveMonitoring.map((item, index) =>
  index === 0 ? { ...item, monitoringMayGrantSlaveAuthority: true } : item
);
assert.equal(
  assessBuild410Governance({
    build409: build409Verified,
    classificationPolicies,
    encryptionProfiles,
    redactionRetentionDlp,
    serverModules,
    slaveMonitoring: badMonitor,
    themeProfiles
  }).governanceState,
  "SLAVE_MONITORING_PROFILE_INVALID"
);

const badTheme = themeProfiles.map((item, index) =>
  index === 0 ? { ...item, themeMayHideSecurityState: true } : item
);
assert.equal(
  assessBuild410Governance({
    build409: build409Verified,
    classificationPolicies,
    encryptionProfiles,
    redactionRetentionDlp,
    serverModules,
    slaveMonitoring,
    themeProfiles: badTheme
  }).governanceState,
  "SERVER_THEME_PROFILE_INVALID"
);

const verified = assessBuild410Governance({
  build409: build409Verified,
  classificationPolicies,
  encryptionProfiles,
  redactionRetentionDlp,
  serverModules,
  slaveMonitoring,
  themeProfiles
});

assert.equal(
  verified.governanceState,
  "SENSITIVE_DATA_DLP_AND_SERVER_SHELL_CONVERGENCE_ASSURED"
);
assert.equal(verified.counts.classificationPolicies, 35);
assert.equal(verified.counts.encryptionProfiles, 7);
assert.equal(verified.counts.dlpAssuranceProfiles, 7);
assert.equal(verified.counts.serverModules, 3);
assert.equal(verified.counts.slaveMonitoringProfiles, 2);
assert.equal(verified.counts.themeProfiles, 3);
assert.equal(verified.policy.serverShellId, "rosevear-server-shell");
assert.equal(verified.policy.outerShell, "ai-data-platform");
assert.equal(verified.policy.modulesIndependentlyDisableable, true);
assert.equal(verified.policy.disablingOneModuleMustNotStopShell, true);
assert.equal(verified.policy.homeAutomationOwnedByAiHubModule, true);
assert.equal(verified.policy.lockstepReleaseRequired, false);
assert.equal(verified.policy.rawSecretsInLogsAllowed, false);
assert.equal(verified.policy.productionGreenImpliesPhysicalServerUpdated, false);

const manifest = JSON.parse(
  source("../../.github/rosevear-sensitive-data-dlp-server-shell.v1.json")
);
assert.equal(manifest.serverShell.shellId, "rosevear-server-shell");
assert.equal(manifest.serverShell.outerShell, "ai-data-platform");
assert.equal(manifest.serverShell.modules.length, 3);
assert.equal(manifest.serverShell.disablingOneModuleMustNotStopShell, true);
assert.equal(manifest.themes.profiles.length, 3);
assert.deepEqual(manifest.slaveMonitoring.shells, ["yw", "icamp"]);
assert.equal(manifest.homeAutomationBoundary.module, "rosevear-ai-hub");
assert.equal(manifest.homeAutomationBoundary.hazardousAutonomousActionsRemainForbidden, true);

const migration = source(
  "../../db/migrations/0173_master_sensitive_data_dlp_server_shell.sql"
);
for (const token of [
  "master_build410_data_classification_policies",
  "master_build410_encryption_profiles",
  "master_build410_redaction_retention_dlp_assurance",
  "master_build410_server_shell_modules",
  "master_build410_slave_monitoring_profiles",
  "master_build410_theme_profiles",
  "rosevear-server-shell",
  "rosevear-ai-hub-windows-server",
  "force row level security",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source(
  "../../docs/BUILD_410_SENSITIVE_DATA_DLP_SERVER_SHELL.md"
);
for (const token of [
  "AI Data Platform becomes the Rosevear Server Shell",
  "Each module is independently disableable",
  "primary automation host role",
  "Night Ops",
  "Copper Workshop",
  "Meadow Grid",
  "Futuristic YW and iCamp",
  "Home automation remains inside the AI Hub module",
  "SENSITIVE_DATA_DLP_AND_SERVER_SHELL_CONVERGENCE_ASSURED"
]) assert.ok(docs.includes(token), "documentation token " + token);

const navigation = source("lib/master-instrument-navigation.ts");
for (const token of [
  'SERVER_SHELL_ID = "rosevear-server-shell"',
  'SERVER_SHELL_PRIMARY_AUTOMATION_HOST',
  '"Data & Intelligence"',
  '"AI, Home & Automation"',
  '"Communications & Operations"',
  "independentlyDisableable: true",
  "themeProfiles: SERVER_SHELL_THEME_PROFILES"
]) assert.ok(navigation.includes(token), "navigation token " + token);

const masterPage = source("app/master-suite/page.tsx");
for (const token of [
  "Build 410 · Rosevear Server Shell",
  "One Server Shell, Three Clear Server Modules",
  "Server module convergence",
  "Futuristic YW and iCamp status screens",
  "Build 410 sensitive-data assurance",
  "35 classification policies",
  "24/7 local automation boundary"
]) assert.ok(masterPage.includes(token), "Master Suite token " + token);

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build410_data_classification_policies"',
  '"master_build410_encryption_profiles"',
  '"master_build410_redaction_retention_dlp_assurance"',
  '"master_build410_server_shell_modules"',
  '"master_build410_slave_monitoring_profiles"',
  '"master_build410_theme_profiles"',
  '"0173_master_sensitive_data_dlp_server_shell.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-410-sensitive-data-dlp-server-shell.ts";
assert.equal(String(pkg.scripts["verify:build410"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 410 Sensitive Data Classification, Encryption, Redaction, Retention & Data-Loss Prevention Assurance + Rosevear Server Shell convergence verification passed."
);
