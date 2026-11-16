import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_411_MODULE_ACTIONS,
  BUILD_411_WINDOWS_SERVICE_IDS,
  assessBuild411Governance,
  evaluateBuild411BreakGlassGrant,
  evaluateBuild411ModuleControlRequest,
  type Build411AuditCeremonyControl,
  type Build411BreakGlassPolicy,
  type Build411ModuleControlPolicy,
  type Build411PrivilegedOperationProfile,
  type Build411WindowsServiceCustodyProfile
} from "../lib/master-privileged-operations-server-custody";
import {
  BUILD_410_PRIMARY_AUTOMATION_HOST_ROLE,
  BUILD_410_SERVER_MODULE_IDS
} from "../lib/master-sensitive-data-dlp-server-shell";
import { BUILD_405_APPLICATION_IDS } from "../lib/master-assurance-renewal-security-comms-recertification";

const observedAt = "2026-11-16T20:00:00.000Z";

const privilegedProfiles: Build411PrivilegedOperationProfile[] =
  BUILD_405_APPLICATION_IDS.map((appId) => ({
    profileId: "b411-privileged-" + appId,
    appId,
    ownerGateRequired: true,
    ordinaryOperatorMaySelfAuthorize: false,
    requesterApproverSeparated: true,
    dualControlSupported: true,
    rawSecretsAllowedInAudit: false,
    immutableReceiptRequired: true,
    privilegeExpiryRequired: true,
    leastPrivilegeRequired: true,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "CERTIFIED",
    observedAt
  }));

const breakGlassPolicies: Build411BreakGlassPolicy[] =
  BUILD_405_APPLICATION_IDS.map((appId) => ({
    policyId: "b411-break-glass-" + appId,
    appId,
    normalPathReplacement: false,
    ownerApprovalRequired: true,
    twoDistinctCustodiansRequired: true,
    maximumMinutes: 30,
    singleUseRequired: true,
    expiryRequired: true,
    authorityTransferAllowed: false,
    rawSecretEvidenceAllowed: false,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "CERTIFIED",
    observedAt
  }));

const moduleControlPolicies: Build411ModuleControlPolicy[] =
  BUILD_410_SERVER_MODULE_IDS.map((moduleId) => ({
    policyId: "b411-module-" + moduleId,
    moduleId,
    disableOwnerGateRequired: true,
    enableOwnerGateRequired: true,
    enableIndependentCustodianRequired: true,
    restartOwnerGateRequired: true,
    restartIndependentCustodianRequired: true,
    disabledStateFailsClosed: true,
    shellRemainsAvailableWhenModuleDisabled: true,
    implicitCrossModuleActivationAllowed: false,
    moduleSwitchMayTransferAuthority: false,
    exactStateReceiptRequired: true,
    immutableAuditReceiptRequired: true,
    state: "CERTIFIED",
    observedAt
  }));

const serviceMap = {
  "rosevear-ai-hub-automation-host": "rosevear-ai-hub",
  "rosevear-ai-data-platform-worker": "ai-data-platform",
  "rosevear-comms-hub-worker": "rosevear-comms-hub"
} as const;

const windowsServiceCustody: Build411WindowsServiceCustodyProfile[] =
  BUILD_411_WINDOWS_SERVICE_IDS.map((serviceId) => ({
    custodyId: "b411-custody-" + serviceId,
    serviceId,
    moduleId: serviceMap[serviceId],
    hostRole: BUILD_410_PRIMARY_AUTOMATION_HOST_ROLE,
    leastPrivilegeServiceAccountRequired: true,
    osSecretStoreRequired: true,
    rawCredentialInSourceAllowed: false,
    automaticStartMayBeEnrolled: true,
    restartRequiresApprovedIntent: true,
    publicInboundRequired: false,
    physicalActivationRequiresHostReceipt: true,
    cloudGreenMayClaimPhysicalActivation: false,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "ENROLLED",
    observedAt
  }));

const auditCeremonies: Build411AuditCeremonyControl[] =
  BUILD_410_SERVER_MODULE_IDS.map((moduleId) => ({
    ceremonyId: "b411-ceremony-" + moduleId,
    moduleId,
    appendOnly: true,
    ownerReceiptRequired: true,
    independentCustodianReceiptRequiredForEnableRestart: true,
    actionDigestRequired: true,
    beforeAfterStateRequired: true,
    actorIdentityRequired: true,
    rawSecretEvidenceAllowed: false,
    expiryCheckedBeforeExecution: true,
    hostReceiptRequiredForPhysicalAction: true,
    state: "CERTIFIED",
    observedAt
  }));

const verified = assessBuild411Governance({
  build410: {
    governanceState: "SENSITIVE_DATA_DLP_AND_SERVER_SHELL_CONVERGENCE_ASSURED"
  },
  privilegedProfiles,
  breakGlassPolicies,
  moduleControlPolicies,
  windowsServiceCustody,
  auditCeremonies
});

assert.equal(
  verified.governanceState,
  "PRIVILEGED_OPERATIONS_AND_SERVER_MODULE_CUSTODY_ASSURED"
);
assert.equal(verified.counts.applications, 7);
assert.equal(verified.counts.serverModules, 3);
assert.equal(verified.counts.windowsServices, 3);
assert.equal(BUILD_411_MODULE_ACTIONS.length, 3);
assert.equal(verified.policy.breakGlassMaxMinutes, 30);
assert.equal(verified.policy.cloudExecutesPhysicalModuleControl, false);
assert.equal(verified.policy.productionGreenImpliesPhysicalServerUpdated, false);
assert.equal(verified.policy.productionGreenImpliesServiceRestarted, false);

const disable = evaluateBuild411ModuleControlRequest({
  moduleId: "ai-data-platform",
  action: "DISABLE",
  requesterRole: "owner",
  requesterUserId: "owner-a",
  reasonDigest: "sha256:" + "a".repeat(64)
});
assert.equal(disable.state, "AUTHORIZED_FOR_PROTECTED_HOST");
assert.equal(disable.dualControlRequired, false);

const heldEnable = evaluateBuild411ModuleControlRequest({
  moduleId: "rosevear-ai-hub",
  action: "ENABLE",
  requesterRole: "owner",
  requesterUserId: "owner-a",
  reasonDigest: "sha256:" + "b".repeat(64),
  independentCustodianReceiptVerified: false
});
assert.equal(
  heldEnable.state,
  "HOLD_INDEPENDENT_CUSTODIAN_RECEIPT_REQUIRED"
);

const approvedEnable = evaluateBuild411ModuleControlRequest({
  moduleId: "rosevear-ai-hub",
  action: "ENABLE",
  requesterRole: "owner",
  requesterUserId: "owner-a",
  reasonDigest: "sha256:" + "c".repeat(64),
  independentCustodianReceiptVerified: true,
  independentCustodianUserId: "custodian-b"
});
assert.equal(approvedEnable.state, "AUTHORIZED_FOR_PROTECTED_HOST");
assert.equal(approvedEnable.cloudExecutionAllowed, false);

const activeBreakGlass = evaluateBuild411BreakGlassGrant(
  {
    grantId: "grant-1",
    appId: "ai-data-platform",
    reasonDigest: "sha256:" + "d".repeat(64),
    ownerApprovalReceiptId: "owner-receipt",
    primaryCustodianId: "custodian-a",
    secondaryCustodianId: "custodian-b",
    issuedAt: "2026-11-16T20:00:00.000Z",
    expiresAt: "2026-11-16T20:20:00.000Z",
    singleUse: true,
    authorityTransferAllowed: false,
    rawSecretEvidencePresent: false
  },
  "2026-11-16T20:10:00.000Z"
);
assert.equal(activeBreakGlass.state, "ACTIVE");

const expiredBreakGlass = evaluateBuild411BreakGlassGrant(
  {
    grantId: "grant-2",
    appId: "ai-data-platform",
    reasonDigest: "sha256:" + "e".repeat(64),
    ownerApprovalReceiptId: "owner-receipt",
    primaryCustodianId: "custodian-a",
    secondaryCustodianId: "custodian-b",
    issuedAt: "2026-11-16T20:00:00.000Z",
    expiresAt: "2026-11-16T20:20:00.000Z",
    singleUse: true,
    authorityTransferAllowed: false,
    rawSecretEvidencePresent: false
  },
  "2026-11-16T20:31:00.000Z"
);
assert.equal(expiredBreakGlass.state, "EXPIRED");

const root = path.resolve(process.cwd(), "../..");
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const migration = source(
  "db/migrations/0174_master_privileged_operations_server_custody.sql"
);
for (const token of [
  "master_build411_privileged_operation_profiles",
  "master_build411_break_glass_policies",
  "master_build411_custodian_receipts",
  "master_build411_module_control_policies",
  "master_build411_module_control_intents",
  "master_build411_module_action_receipts",
  "master_build411_windows_service_custody",
  "master_build411_audit_ceremonies",
  "current_master_sysop_role()='owner'",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) {
  assert.ok(migration.includes(token), "migration token missing: " + token);
}

const route = source("apps/web/app/api/server-shell/module-control/route.ts");
assert.ok(route.includes("requestServerModuleControl"));
assert.ok(route.includes("status: 202"));

const database = source("apps/web/lib/server-module-control-database.ts");
assert.ok(database.includes("current_master_sysop_role()"));
assert.ok(database.includes("master_build411_custodian_receipts"));
assert.ok(database.includes("master_build411_module_control_intents"));
assert.ok(!database.includes("privateKey"));
assert.ok(!database.includes("service_role"));

const ui = source("apps/web/components/server-module-control-panel.tsx");
assert.ok(ui.includes("ENABLE"));
assert.ok(ui.includes("DISABLE"));
assert.ok(ui.includes("RESTART"));
assert.ok(ui.includes("No physical service change is claimed"));

const manifest = JSON.parse(
  source(".github/rosevear-privileged-operations-server-custody.v1.json")
);
assert.equal(manifest.build, 411);
assert.equal(manifest.serverShell.ownerAuthority, "master-sysop-owner");
assert.equal(manifest.breakGlass.maximumMinutes, 30);
assert.equal(
  manifest.releaseBoundary.productionGreenImpliesPhysicalWindowsHostUpdated,
  false
);

console.log(
  "Build 411 privileged operations, module control and Windows service custody verification passed."
);
