export const UNIVERSAL_MODULE_MANIFEST_VERSION = 1 as const;
export const UNIVERSAL_HOST_CONTRACT_VERSION = 1 as const;
export const UNIVERSAL_MODULE_PROTOCOL_VERSION = 1 as const;
export const AI_DATA_MODULE_ID = "rosevear.ai-data-platform" as const;
export const AI_DATA_MODULE_VERSION = "1.0.0" as const;

export const HOST_ENVIRONMENTS = [
  "development",
  "test",
  "staging",
  "production"
] as const;

export type HostEnvironment = (typeof HOST_ENVIRONMENTS)[number];

export const MODULE_SURFACES = [
  {
    id: "data-library",
    route: "/data-library",
    mode: "embedded-or-deep-link",
    mutating: false
  },
  {
    id: "app-connections",
    route: "/app-connections",
    mode: "embedded-or-deep-link",
    mutating: false
  },
  {
    id: "integration-health",
    route: "/integration-health",
    mode: "embedded-or-deep-link",
    mutating: false
  },
  {
    id: "integration-certification",
    route: "/integration-certification",
    mode: "embedded-or-deep-link",
    mutating: false
  },
  {
    id: "production-learning",
    route: "/production-learning",
    mode: "embedded-or-deep-link",
    mutating: false
  }
] as const;

export const MODULE_HEADLESS_CAPABILITIES = [
  "manifest.read",
  "integration-health.read",
  "integration-certification.read",
  "data-contracts.read",
  "recovery-plan.read"
] as const;

export type ModuleHeadlessCapability =
  (typeof MODULE_HEADLESS_CAPABILITIES)[number];

export const MODULE_FEATURE_FLAGS = [
  "secretless-discovery",
  "runtime-identity-v1",
  "fail-closed-host-validation",
  "headless-read-capabilities",
  "headless-module-sdk-v1",
  "embedded-runtime-shell-v1",
  "secure-postmessage-boundary",
  "host-adapter-pack-v1",
  "credential-free-scaffold-generator",
  "signed-host-session-assertions-v1",
  "authenticated-user-context-bridge-v1",
  "host-reauthentication-handoff-v1",
  "tenant-workspace-resolution-v1",
  "explicit-tenant-mapping-v1",
  "rls-isolation-verification-v1",
  "capability-negotiation-v1",
  "least-privilege-grants-v1",
  "owner-controlled-capability-grants-v1",
  "host-navigation-bridge-v1",
  "governed-module-deep-links-v1",
  "command-palette-bridge-v1",
  "host-presentation-bridge-v1",
  "semantic-design-token-bridge-v1",
  "accessible-dialog-boundary-v1",
  "host-schema-discovery-v1",
  "universal-data-contract-resolver-v1",
  "mapping-profile-suggestions-v1",
  "schema-drift-integration-v1",
  "event-bus-host-bridge-v1",
  "event-subscription-pack-v1",
  "exact-event-type-contracts-v1",
  "replay-safe-event-receipt-correlation-v1",
  "workflow-action-plugin-v1",
  "typed-action-input-schema-v1",
  "idempotent-action-handoff-v1",
  "host-action-callback-receipts-v1",
  "shared-coordination-module-v1",
  "notification-module-api-v1",
  "task-follow-up-module-api-v1",
  "schedule-module-api-v1",
  "media-host-bridge-v1",
  "media-reference-registration-v1",
  "media-transfer-handoff-v1",
  "media-lifecycle-evidence-v1",
  "embedded-surface-descriptors"
] as const;

export type ModuleFeatureFlag = (typeof MODULE_FEATURE_FLAGS)[number];

export type HostRuntimeContext = {
  hostContractVersion: 1;
  hostApplication: {
    id: string;
    environment: HostEnvironment;
    instanceId: string;
  };
  subject: {
    id: string;
  };
  tenancy: {
    tenantId: string;
    workspaceId: string;
  };
  requestedCapabilities: ModuleHeadlessCapability[];
  featureFlags?: ModuleFeatureFlag[];
  auditCorrelationId: string;
  locale?: string;
  timeZone?: string;
  theme?: "light" | "dark" | "system";
};

export type ModuleRuntimeIdentity = {
  schema: "rosevear.ai-data-platform.module-runtime-identity.v1";
  moduleId: typeof AI_DATA_MODULE_ID;
  moduleVersion: typeof AI_DATA_MODULE_VERSION;
  protocolVersion: typeof UNIVERSAL_MODULE_PROTOCOL_VERSION;
  hostContractVersion: typeof UNIVERSAL_HOST_CONTRACT_VERSION;
  moduleInstanceId: string;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  hostInstanceId: string;
  authenticatedSubjectId: string;
  tenantId: string;
  workspaceId: string;
  auditCorrelationId: string;
  createdAt: string;
};

export type HostValidationResult =
  | {
      valid: true;
      errors: [];
      context: HostRuntimeContext;
    }
  | {
      valid: false;
      errors: string[];
      context: null;
    };

const HOST_CONTEXT_REQUIRED_FIELDS = [
  "hostContractVersion",
  "hostApplication.id",
  "hostApplication.environment",
  "hostApplication.instanceId",
  "subject.id",
  "tenancy.tenantId",
  "tenancy.workspaceId",
  "requestedCapabilities",
  "auditCorrelationId"
] as const;

const HOST_CONTEXT_OPTIONAL_FIELDS = [
  "featureFlags",
  "locale",
  "timeZone",
  "theme"
] as const;

export const UNIVERSAL_MODULE_MANIFEST = Object.freeze({
  schema: "rosevear.ai-data-platform.module-manifest.v1",
  manifestVersion: UNIVERSAL_MODULE_MANIFEST_VERSION,
  module: {
    id: AI_DATA_MODULE_ID,
    version: AI_DATA_MODULE_VERSION,
    displayName: "AI Data Platform",
    description:
      "Governed AI Data Platform module contract for supported host applications."
  },
  protocol: {
    id: "rosevear.module-host",
    version: UNIVERSAL_MODULE_PROTOCOL_VERSION
  },
  compatibility: {
    hostContractVersion: {
      minimum: UNIVERSAL_HOST_CONTRACT_VERSION,
      maximum: UNIVERSAL_HOST_CONTRACT_VERSION
    },
    moduleApiRange: ">=1.0.0 <2.0.0"
  },
  surfaces: MODULE_SURFACES,
  headlessCapabilities: MODULE_HEADLESS_CAPABILITIES,
  hostContext: {
    required: HOST_CONTEXT_REQUIRED_FIELDS,
    optional: HOST_CONTEXT_OPTIONAL_FIELDS,
    additionalProperties: false
  },
  featureFlags: MODULE_FEATURE_FLAGS,
  runtimeIdentity: {
    schema: "rosevear.ai-data-platform.module-runtime-identity.v1",
    generatedByModule: true,
    bindsHostApplication: true,
    bindsTenantAndWorkspace: true,
    carriesAuditCorrelation: true
  },
  security: {
    discoveryActivatesConnection: false,
    discoveryGrantsCapabilities: false,
    hostRequestedCapabilityIsAuthorization: false,
    sdkRequiresIndependentAuthorization: true,
    hostAdapterGrantsPlatformAuthority: false,
    embeddedMountGrantsPlatformAuthority: false,
    adapterPresenceGrantsAuthorization: false,
    scaffoldEmbedsCredentials: false,
    hostSessionSignatureRequired: true,
    hostSessionReplayGuardRequired: true,
    hostSessionGrantsPlatformAuthority: false,
    rawHostCredentialsAccepted: false,
    tenantAccessInferredFromHostSession: false,
    exactTenantWorkspaceMappingRequired: true,
    implicitCrossTenantFallbackAllowed: false,
    ambiguousTenantMappingAccepted: false,
    tenantResolutionGrantsPlatformAuthority: false,
    rlsVerificationRequiredForTenantResolution: true,
    capabilityDiscoveryGrantsAuthorization: false,
    hostRequestedCapabilityGrantsAuthorization: false,
    unrequestedCapabilitiesMayBeGranted: false,
    capabilityGrantExpiryRequired: true,
    capabilityGrantReviewRequired: true,
    tenantResolutionGrantsCapabilities: false,
    navigationRegistrationGrantsPlatformAuthority: false,
    deepLinkGrantsPlatformAuthority: false,
    commandPaletteGrantsPlatformAuthority: false,
    absoluteHostReturnUrlsAccepted: false,
    rawSecretsAcceptedInNavigationContext: false,
    navigationFallbackRequiresExplicitOptIn: true,
    hostStylingGrantsPlatformAuthority: false,
    hostStylingMayHideSecurityStates: false,
    hostStylingMayHideApprovalStates: false,
    rawHostCssAccepted: false,
    forcedColorsRemainAuthoritative: true,
    reducedMotionRemainsAuthoritative: true,
    schemaDiscoveryRequiresRawRecords: false,
    schemaDiscoveryGrantsPlatformAuthority: false,
    schemaDiscoveryActivatesConnection: false,
    mappingSuggestionAutoApproved: false,
    contractCompatibilityAuthorizesExchange: false,
    embeddedRuntimeInheritsRawHostSecrets: false,
    wildcardEmbedOriginsAllowed: false,
    frameAncestorsDefaultSelfOnly: true,
    rawSecretsAcceptedInHostContext: false,
    peerWritesEnabledByDiscovery: false,
    hostEventPublicationBypassesReview: false,
    hostSubscriptionAutoActivates: false,
    eventBridgeAcceptsRawPayloadBodies: false,
    eventBridgeRequiresExactEventContracts: true,
    eventBridgePreservesTenantEnvironmentScope: true,
    eventBridgeReleasesHeldRoutes: false,
    workflowRuleMatchExecutesHostAction: false,
    workflowApprovalExecutesHostAction: false,
    workflowActionCallbackProvesExternalSideEffect: false,
    workflowActionHandoffRequiresIndependentGrant: true,
    workflowActionPluginRequiresTypedInput: true,
    sharedCoordinationDiscoveryDispatchesOutbound: false,
    sharedCoordinationCommsRoutingGrantsAuthorization: false,
    sharedCoordinationPeerWritesRequested: false,
    sharedCoordinationScheduleConflictsAreLocalOnly: true,
    sharedCoordinationConsentGrantsDispatchAuthority: false,
    mediaHostBridgeAcceptsRawBinary: false,
    mediaHostBridgeTransfersBinary: false,
    mediaHostBridgeSensitiveCopyRequiresExplicitAuthorization: true,
    mediaHostBridgeDeletesSourceContent: false,
    mediaHostBridgeInfersOwnership: false,
    mediaHostBridgePreviewFetchesContent: false,
    ql266ResumedByDiscovery: false
  }
});

const APPLICATION_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{0,127}$/;
const AUDIT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{7,127}$/;
const LOCALE_PATTERN = /^[A-Za-z0-9-]{2,35}$/;
const TIME_ZONE_PATTERN = /^[A-Za-z0-9_+\/-]{1,80}$/;

const FORBIDDEN_SECRET_KEYS = new Set([
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "apikey",
  "accesstoken",
  "refreshtoken",
  "clientsecret",
  "privatekey"
]);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizedKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findForbiddenSecretPath(value: unknown, path = "context"): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenSecretPath(value[index], path + "[" + index + "]");
      if (found) return found;
    }
    return null;
  }

  const object = record(value);
  if (!object) return null;

  for (const [key, child] of Object.entries(object)) {
    if (FORBIDDEN_SECRET_KEYS.has(normalizedKey(key))) {
      return path + "." + key;
    }
    const found = findForbiddenSecretPath(child, path + "." + key);
    if (found) return found;
  }

  return null;
}

function rejectUnknownKeys(
  object: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  errors: string[]
) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(object)) {
    if (!allowedSet.has(key)) {
      errors.push(path + "." + key + " is not part of host contract v1.");
    }
  }
}

function validOpaqueId(value: unknown) {
  return typeof value === "string" && OPAQUE_ID_PATTERN.test(value);
}

function validateStringList(
  value: unknown,
  allowed: readonly string[],
  path: string,
  errors: string[]
) {
  if (!Array.isArray(value)) {
    errors.push(path + " must be an array.");
    return;
  }
  if (value.length > 64) {
    errors.push(path + " exceeds the 64-item contract limit.");
    return;
  }
  if (!value.every((item) => typeof item === "string")) {
    errors.push(path + " must contain only strings.");
    return;
  }
  if (new Set(value).size !== value.length) {
    errors.push(path + " must not contain duplicates.");
  }
  const allowedSet = new Set(allowed);
  for (const item of value) {
    if (!allowedSet.has(String(item))) {
      errors.push(path + " contains unsupported value: " + String(item));
    }
  }
}

export function validateUniversalHostContext(input: unknown): HostValidationResult {
  const errors: string[] = [];
  const secretPath = findForbiddenSecretPath(input);
  if (secretPath) {
    errors.push("Raw secret-like fields are forbidden in host context: " + secretPath);
  }

  const context = record(input);
  if (!context) {
    return {
      valid: false,
      errors: ["Host context must be a plain object.", ...errors],
      context: null
    };
  }

  rejectUnknownKeys(
    context,
    [
      "hostContractVersion",
      "hostApplication",
      "subject",
      "tenancy",
      "requestedCapabilities",
      "featureFlags",
      "auditCorrelationId",
      "locale",
      "timeZone",
      "theme"
    ],
    "context",
    errors
  );

  if (context.hostContractVersion !== UNIVERSAL_HOST_CONTRACT_VERSION) {
    errors.push(
      "Unsupported host contract version. Expected " +
        UNIVERSAL_HOST_CONTRACT_VERSION +
        "."
    );
  }

  const hostApplication = record(context.hostApplication);
  if (!hostApplication) {
    errors.push("hostApplication is required.");
  } else {
    rejectUnknownKeys(
      hostApplication,
      ["id", "environment", "instanceId"],
      "hostApplication",
      errors
    );
    if (
      typeof hostApplication.id !== "string" ||
      !APPLICATION_ID_PATTERN.test(hostApplication.id) ||
      hostApplication.id.length > 120
    ) {
      errors.push("hostApplication.id must be a stable lowercase dotted/dashed ID.");
    }
    if (
      typeof hostApplication.environment !== "string" ||
      !HOST_ENVIRONMENTS.includes(
        hostApplication.environment as HostEnvironment
      )
    ) {
      errors.push("hostApplication.environment is unsupported.");
    }
    if (!validOpaqueId(hostApplication.instanceId)) {
      errors.push("hostApplication.instanceId is invalid.");
    }
  }

  const subject = record(context.subject);
  if (!subject) {
    errors.push("subject is required.");
  } else {
    rejectUnknownKeys(subject, ["id"], "subject", errors);
    if (!validOpaqueId(subject.id)) {
      errors.push("subject.id is invalid.");
    }
  }

  const tenancy = record(context.tenancy);
  if (!tenancy) {
    errors.push("tenancy is required.");
  } else {
    rejectUnknownKeys(
      tenancy,
      ["tenantId", "workspaceId"],
      "tenancy",
      errors
    );
    if (!validOpaqueId(tenancy.tenantId)) {
      errors.push("tenancy.tenantId is invalid.");
    }
    if (!validOpaqueId(tenancy.workspaceId)) {
      errors.push("tenancy.workspaceId is invalid.");
    }
  }

  validateStringList(
    context.requestedCapabilities,
    MODULE_HEADLESS_CAPABILITIES,
    "requestedCapabilities",
    errors
  );

  if (context.featureFlags !== undefined) {
    validateStringList(
      context.featureFlags,
      MODULE_FEATURE_FLAGS,
      "featureFlags",
      errors
    );
  }

  if (
    typeof context.auditCorrelationId !== "string" ||
    !AUDIT_ID_PATTERN.test(context.auditCorrelationId)
  ) {
    errors.push("auditCorrelationId must be a safe 8-128 character correlation ID.");
  }

  if (
    context.locale !== undefined &&
    (typeof context.locale !== "string" ||
      !LOCALE_PATTERN.test(context.locale))
  ) {
    errors.push("locale is invalid.");
  }

  if (
    context.timeZone !== undefined &&
    (typeof context.timeZone !== "string" ||
      !TIME_ZONE_PATTERN.test(context.timeZone))
  ) {
    errors.push("timeZone is invalid.");
  }

  if (
    context.theme !== undefined &&
    !["light", "dark", "system"].includes(String(context.theme))
  ) {
    errors.push("theme is invalid.");
  }

  if (errors.length > 0) {
    return { valid: false, errors, context: null };
  }

  return {
    valid: true,
    errors: [],
    context: input as HostRuntimeContext
  };
}

export class UniversalHostContractError extends Error {
  readonly code = "universal_host_contract_invalid";
  readonly errors: string[];

  constructor(errors: string[]) {
    super("Universal host contract validation failed.");
    this.name = "UniversalHostContractError";
    this.errors = [...errors];
  }
}

function defaultModuleInstanceId() {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("Secure randomUUID support is required for module runtime identity.");
  }
  return "module_" + globalThis.crypto.randomUUID();
}

export function createModuleRuntimeIdentity(
  input: unknown,
  options?: {
    moduleInstanceId?: string;
    createdAt?: string;
  }
): ModuleRuntimeIdentity {
  const validation = validateUniversalHostContext(input);
  if (!validation.valid) {
    throw new UniversalHostContractError(validation.errors);
  }

  const moduleInstanceId =
    options?.moduleInstanceId ?? defaultModuleInstanceId();
  if (!validOpaqueId(moduleInstanceId)) {
    throw new UniversalHostContractError(["moduleInstanceId is invalid."]);
  }

  const createdAt = options?.createdAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(createdAt))) {
    throw new UniversalHostContractError(["createdAt is not a valid timestamp."]);
  }

  const context = validation.context;
  return Object.freeze({
    schema: "rosevear.ai-data-platform.module-runtime-identity.v1",
    moduleId: AI_DATA_MODULE_ID,
    moduleVersion: AI_DATA_MODULE_VERSION,
    protocolVersion: UNIVERSAL_MODULE_PROTOCOL_VERSION,
    hostContractVersion: UNIVERSAL_HOST_CONTRACT_VERSION,
    moduleInstanceId,
    hostApplicationId: context.hostApplication.id,
    hostEnvironment: context.hostApplication.environment,
    hostInstanceId: context.hostApplication.instanceId,
    authenticatedSubjectId: context.subject.id,
    tenantId: context.tenancy.tenantId,
    workspaceId: context.tenancy.workspaceId,
    auditCorrelationId: context.auditCorrelationId,
    createdAt
  });
}
