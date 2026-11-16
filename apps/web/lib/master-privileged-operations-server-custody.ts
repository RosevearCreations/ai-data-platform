import {
  BUILD_405_APPLICATION_IDS
} from "./master-assurance-renewal-security-comms-recertification";
import {
  BUILD_410_PRIMARY_AUTOMATION_HOST_ROLE,
  BUILD_410_SERVER_MODULE_IDS,
  type Build410GovernanceAssessment,
  type Build410ServerModuleId
} from "./master-sensitive-data-dlp-server-shell";

export const BUILD_411 = 411 as const;
export const BUILD_411_SCHEMA =
  "rosevear.ai-data-platform.privileged-operations-server-custody.v1" as const;

export const BUILD_411_MODULE_ACTIONS = [
  "ENABLE",
  "DISABLE",
  "RESTART"
] as const;
export type Build411ModuleAction = (typeof BUILD_411_MODULE_ACTIONS)[number];

export const BUILD_411_WINDOWS_SERVICE_IDS = [
  "rosevear-ai-hub-automation-host",
  "rosevear-ai-data-platform-worker",
  "rosevear-comms-hub-worker"
] as const;
export type Build411WindowsServiceId =
  (typeof BUILD_411_WINDOWS_SERVICE_IDS)[number];

export type Build411ApplicationId = (typeof BUILD_405_APPLICATION_IDS)[number];

export type Build411PrivilegedOperationProfile = {
  profileId: string;
  appId: Build411ApplicationId;
  ownerGateRequired: boolean;
  ordinaryOperatorMaySelfAuthorize: boolean;
  requesterApproverSeparated: boolean;
  dualControlSupported: boolean;
  rawSecretsAllowedInAudit: boolean;
  immutableReceiptRequired: boolean;
  privilegeExpiryRequired: boolean;
  leastPrivilegeRequired: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "CERTIFIED" | "HOLD" | "FAILED";
  observedAt: string;
};

export type Build411BreakGlassPolicy = {
  policyId: string;
  appId: Build411ApplicationId;
  normalPathReplacement: boolean;
  ownerApprovalRequired: boolean;
  twoDistinctCustodiansRequired: boolean;
  maximumMinutes: number;
  singleUseRequired: boolean;
  expiryRequired: boolean;
  authorityTransferAllowed: boolean;
  rawSecretEvidenceAllowed: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "CERTIFIED" | "HOLD" | "FAILED";
  observedAt: string;
};

export type Build411ModuleControlPolicy = {
  policyId: string;
  moduleId: Build410ServerModuleId;
  disableOwnerGateRequired: boolean;
  enableOwnerGateRequired: boolean;
  enableIndependentCustodianRequired: boolean;
  restartOwnerGateRequired: boolean;
  restartIndependentCustodianRequired: boolean;
  disabledStateFailsClosed: boolean;
  shellRemainsAvailableWhenModuleDisabled: boolean;
  implicitCrossModuleActivationAllowed: boolean;
  moduleSwitchMayTransferAuthority: boolean;
  exactStateReceiptRequired: boolean;
  immutableAuditReceiptRequired: boolean;
  state: "CERTIFIED" | "HOLD" | "FAILED";
  observedAt: string;
};

export type Build411WindowsServiceCustodyProfile = {
  custodyId: string;
  serviceId: Build411WindowsServiceId;
  moduleId: Build410ServerModuleId;
  hostRole: typeof BUILD_410_PRIMARY_AUTOMATION_HOST_ROLE;
  leastPrivilegeServiceAccountRequired: boolean;
  osSecretStoreRequired: boolean;
  rawCredentialInSourceAllowed: boolean;
  automaticStartMayBeEnrolled: boolean;
  restartRequiresApprovedIntent: boolean;
  publicInboundRequired: boolean;
  physicalActivationRequiresHostReceipt: boolean;
  cloudGreenMayClaimPhysicalActivation: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "ENROLLED" | "HOLD" | "FAILED";
  observedAt: string;
};

export type Build411AuditCeremonyControl = {
  ceremonyId: string;
  moduleId: Build410ServerModuleId;
  appendOnly: boolean;
  ownerReceiptRequired: boolean;
  independentCustodianReceiptRequiredForEnableRestart: boolean;
  actionDigestRequired: boolean;
  beforeAfterStateRequired: boolean;
  actorIdentityRequired: boolean;
  rawSecretEvidenceAllowed: boolean;
  expiryCheckedBeforeExecution: boolean;
  hostReceiptRequiredForPhysicalAction: boolean;
  state: "CERTIFIED" | "HOLD" | "FAILED";
  observedAt: string;
};

export type Build411BreakGlassGrant = {
  grantId: string;
  appId: Build411ApplicationId;
  reasonDigest: string;
  ownerApprovalReceiptId: string;
  primaryCustodianId: string;
  secondaryCustodianId: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  singleUse: boolean;
  usedAt?: string | null;
  authorityTransferAllowed: boolean;
  rawSecretEvidencePresent: boolean;
};

export function evaluateBuild411BreakGlassGrant(
  grant: Build411BreakGlassGrant,
  nowIso: string
) {
  const issued = Date.parse(grant.issuedAt);
  const expires = Date.parse(grant.expiresAt);
  const now = Date.parse(nowIso);
  const durationMinutes = (expires - issued) / 60_000;
  const reasonDigestValid = /^sha256:[a-f0-9]{64}$/.test(grant.reasonDigest);

  const state =
    !reasonDigestValid
      ? ("HOLD_REASON_DIGEST_INVALID" as const)
      : !grant.ownerApprovalReceiptId
        ? ("HOLD_OWNER_APPROVAL_REQUIRED" as const)
        : grant.primaryCustodianId === grant.secondaryCustodianId
          ? ("HOLD_TWO_DISTINCT_CUSTODIANS_REQUIRED" as const)
          : !Number.isFinite(durationMinutes) ||
              durationMinutes <= 0 ||
              durationMinutes > 30
            ? ("HOLD_BREAK_GLASS_WINDOW_INVALID" as const)
            : grant.singleUse !== true
              ? ("HOLD_SINGLE_USE_REQUIRED" as const)
              : grant.authorityTransferAllowed
                ? ("HOLD_AUTHORITY_TRANSFER_FORBIDDEN" as const)
                : grant.rawSecretEvidencePresent
                  ? ("HOLD_RAW_SECRET_EVIDENCE_FORBIDDEN" as const)
                  : grant.revokedAt
                    ? ("REVOKED" as const)
                    : grant.usedAt
                      ? ("CONSUMED" as const)
                      : now >= expires
                        ? ("EXPIRED" as const)
                        : now < issued
                          ? ("HOLD_NOT_YET_VALID" as const)
                          : ("ACTIVE" as const);

  return {
    state,
    durationMinutes,
    reasonDigestValid
  };
}

export function evaluateBuild411ModuleControlRequest(input: {
  moduleId: Build410ServerModuleId;
  action: Build411ModuleAction;
  requesterRole: "owner" | "operator" | null;
  requesterUserId: string;
  reasonDigest: string;
  independentCustodianUserId?: string | null;
  independentCustodianReceiptVerified?: boolean;
}) {
  const reasonDigestValid = /^sha256:[a-f0-9]{64}$/.test(input.reasonDigest);
  const dualControlRequired =
    input.action === "ENABLE" || input.action === "RESTART";

  const state =
    input.requesterRole !== "owner"
      ? ("HOLD_MASTER_SYSOP_OWNER_REQUIRED" as const)
      : !reasonDigestValid
        ? ("HOLD_REASON_DIGEST_INVALID" as const)
        : dualControlRequired &&
            !input.independentCustodianReceiptVerified
          ? ("HOLD_INDEPENDENT_CUSTODIAN_RECEIPT_REQUIRED" as const)
          : dualControlRequired &&
              (!input.independentCustodianUserId ||
                input.independentCustodianUserId === input.requesterUserId)
            ? ("HOLD_ADMINISTRATIVE_SEPARATION_REQUIRED" as const)
            : ("AUTHORIZED_FOR_PROTECTED_HOST" as const);

  return {
    moduleId: input.moduleId,
    action: input.action,
    dualControlRequired,
    reasonDigestValid,
    state,
    cloudExecutionAllowed: false,
    protectedWindowsHostExecutionRequired: true,
    authorityTransferAllowed: false
  };
}

function latestByKey<T>(items: readonly T[], key: (value: T) => string) {
  const map = new Map<string, T>();
  for (const item of items) map.set(key(item), item);
  return map;
}

export function assessBuild411Governance(input: {
  build410: Pick<Build410GovernanceAssessment, "governanceState">;
  privilegedProfiles?: readonly Build411PrivilegedOperationProfile[];
  breakGlassPolicies?: readonly Build411BreakGlassPolicy[];
  moduleControlPolicies?: readonly Build411ModuleControlPolicy[];
  windowsServiceCustody?: readonly Build411WindowsServiceCustodyProfile[];
  auditCeremonies?: readonly Build411AuditCeremonyControl[];
}) {
  const build410Eligible =
    input.build410.governanceState ===
    "SENSITIVE_DATA_DLP_AND_SERVER_SHELL_CONVERGENCE_ASSURED";

  const privileged = latestByKey(
    input.privilegedProfiles ?? [],
    (item) => item.appId
  );
  const missingPrivilegedProfiles = BUILD_405_APPLICATION_IDS.filter(
    (appId) => !privileged.has(appId)
  );
  const invalidPrivilegedProfiles = [...privileged.values()].filter(
    (item) =>
      !(
        item.ownerGateRequired &&
        item.ordinaryOperatorMaySelfAuthorize === false &&
        item.requesterApproverSeparated &&
        item.dualControlSupported &&
        item.rawSecretsAllowedInAudit === false &&
        item.immutableReceiptRequired &&
        item.privilegeExpiryRequired &&
        item.leastPrivilegeRequired &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "CERTIFIED"
      )
  );

  const breakGlass = latestByKey(
    input.breakGlassPolicies ?? [],
    (item) => item.appId
  );
  const missingBreakGlassPolicies = BUILD_405_APPLICATION_IDS.filter(
    (appId) => !breakGlass.has(appId)
  );
  const invalidBreakGlassPolicies = [...breakGlass.values()].filter(
    (item) =>
      !(
        item.normalPathReplacement === false &&
        item.ownerApprovalRequired &&
        item.twoDistinctCustodiansRequired &&
        item.maximumMinutes > 0 &&
        item.maximumMinutes <= 30 &&
        item.singleUseRequired &&
        item.expiryRequired &&
        item.authorityTransferAllowed === false &&
        item.rawSecretEvidenceAllowed === false &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "CERTIFIED"
      )
  );

  const modulePolicies = latestByKey(
    input.moduleControlPolicies ?? [],
    (item) => item.moduleId
  );
  const missingModuleControlPolicies = BUILD_410_SERVER_MODULE_IDS.filter(
    (moduleId) => !modulePolicies.has(moduleId)
  );
  const invalidModuleControlPolicies = [...modulePolicies.values()].filter(
    (item) =>
      !(
        item.disableOwnerGateRequired &&
        item.enableOwnerGateRequired &&
        item.enableIndependentCustodianRequired &&
        item.restartOwnerGateRequired &&
        item.restartIndependentCustodianRequired &&
        item.disabledStateFailsClosed &&
        item.shellRemainsAvailableWhenModuleDisabled &&
        item.implicitCrossModuleActivationAllowed === false &&
        item.moduleSwitchMayTransferAuthority === false &&
        item.exactStateReceiptRequired &&
        item.immutableAuditReceiptRequired &&
        item.state === "CERTIFIED"
      )
  );

  const services = latestByKey(
    input.windowsServiceCustody ?? [],
    (item) => item.serviceId
  );
  const missingServiceCustody = BUILD_411_WINDOWS_SERVICE_IDS.filter(
    (serviceId) => !services.has(serviceId)
  );
  const invalidServiceCustody = [...services.values()].filter(
    (item) =>
      !(
        item.hostRole === BUILD_410_PRIMARY_AUTOMATION_HOST_ROLE &&
        item.leastPrivilegeServiceAccountRequired &&
        item.osSecretStoreRequired &&
        item.rawCredentialInSourceAllowed === false &&
        item.automaticStartMayBeEnrolled &&
        item.restartRequiresApprovedIntent &&
        item.publicInboundRequired === false &&
        item.physicalActivationRequiresHostReceipt &&
        item.cloudGreenMayClaimPhysicalActivation === false &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "ENROLLED"
      )
  );

  const ceremonies = latestByKey(
    input.auditCeremonies ?? [],
    (item) => item.moduleId
  );
  const missingAuditCeremonies = BUILD_410_SERVER_MODULE_IDS.filter(
    (moduleId) => !ceremonies.has(moduleId)
  );
  const invalidAuditCeremonies = [...ceremonies.values()].filter(
    (item) =>
      !(
        item.appendOnly &&
        item.ownerReceiptRequired &&
        item.independentCustodianReceiptRequiredForEnableRestart &&
        item.actionDigestRequired &&
        item.beforeAfterStateRequired &&
        item.actorIdentityRequired &&
        item.rawSecretEvidenceAllowed === false &&
        item.expiryCheckedBeforeExecution &&
        item.hostReceiptRequiredForPhysicalAction &&
        item.state === "CERTIFIED"
      )
  );

  const governanceState =
    !build410Eligible
      ? ("HOLD_BUILD410_NOT_ASSURED" as const)
      : missingPrivilegedProfiles.length
        ? ("PRIVILEGED_OPERATION_PROFILE_REQUIRED" as const)
        : invalidPrivilegedProfiles.length
          ? ("PRIVILEGED_OPERATION_PROFILE_INVALID" as const)
          : missingBreakGlassPolicies.length
            ? ("BREAK_GLASS_POLICY_REQUIRED" as const)
            : invalidBreakGlassPolicies.length
              ? ("BREAK_GLASS_POLICY_INVALID" as const)
              : missingModuleControlPolicies.length
                ? ("SERVER_MODULE_CONTROL_POLICY_REQUIRED" as const)
                : invalidModuleControlPolicies.length
                  ? ("SERVER_MODULE_CONTROL_POLICY_INVALID" as const)
                  : missingServiceCustody.length
                    ? ("WINDOWS_SERVICE_CUSTODY_REQUIRED" as const)
                    : invalidServiceCustody.length
                      ? ("WINDOWS_SERVICE_CUSTODY_INVALID" as const)
                      : missingAuditCeremonies.length
                        ? ("AUDIT_CEREMONY_REQUIRED" as const)
                        : invalidAuditCeremonies.length
                          ? ("AUDIT_CEREMONY_INVALID" as const)
                          : ("PRIVILEGED_OPERATIONS_AND_SERVER_MODULE_CUSTODY_ASSURED" as const);

  return {
    schema: BUILD_411_SCHEMA,
    build: BUILD_411,
    build410Eligible,
    governanceState,
    missingPrivilegedProfiles,
    invalidPrivilegedProfiles,
    missingBreakGlassPolicies,
    invalidBreakGlassPolicies,
    missingModuleControlPolicies,
    invalidModuleControlPolicies,
    missingServiceCustody,
    invalidServiceCustody,
    missingAuditCeremonies,
    invalidAuditCeremonies,
    counts: {
      applications: BUILD_405_APPLICATION_IDS.length,
      serverModules: BUILD_410_SERVER_MODULE_IDS.length,
      windowsServices: BUILD_411_WINDOWS_SERVICE_IDS.length,
      moduleActions: BUILD_411_MODULE_ACTIONS.length
    },
    policy: {
      masterOwnerAuthority: "master-sysop-owner",
      primaryAutomationHostRole: BUILD_410_PRIMARY_AUTOMATION_HOST_ROLE,
      breakGlassMaxMinutes: 30,
      enableRestartRequireIndependentCustodian: true,
      disableRequiresOwner: true,
      cloudExecutesPhysicalModuleControl: false,
      protectedWindowsHostExecutesApprovedIntent: true,
      physicalActionRequiresHostReceipt: true,
      productionGreenImpliesPhysicalServerUpdated: false,
      productionGreenImpliesServiceRestarted: false,
      synchronizationProtocol: "1.1",
      lockstepReleaseRequired: false
    }
  };
}

export type Build411GovernanceAssessment = ReturnType<
  typeof assessBuild411Governance
>;
