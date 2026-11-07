import type {
  HeadlessModuleCapabilityAuthorizer,
  HeadlessModuleContextProvider
} from "./headless-module-sdk";
import {
  HOST_ENVIRONMENTS,
  MODULE_HEADLESS_CAPABILITIES,
  validateUniversalHostContext,
  type HostEnvironment,
  type HostRuntimeContext,
  type ModuleHeadlessCapability
} from "./universal-module-contract";

export const CAPABILITY_NEGOTIATION_VERSION = "1.0.0" as const;
export const CAPABILITY_DISCOVERY_SCHEMA =
  "rosevear.ai-data-platform.capability-discovery.v1" as const;
export const CAPABILITY_GRANT_SCHEMA =
  "rosevear.ai-data-platform.capability-grant.v1" as const;
export const CAPABILITY_NEGOTIATION_SCHEMA =
  "rosevear.ai-data-platform.capability-negotiation.v1" as const;

export type CapabilityAccessClass = "read" | "write" | "action";

export type ModuleCapabilityDescriptor = {
  id: string;
  classification: CapabilityAccessClass;
  mutating: boolean;
  consequential: boolean;
  description: string;
};

export type ModuleCapabilityRegistry = {
  discover(): ModuleCapabilityDescriptor[] | Promise<ModuleCapabilityDescriptor[]>;
};

export type CapabilityGrantStatus = "approved" | "denied" | "revoked";

export type CapabilityGrantRecord = {
  schema: typeof CAPABILITY_GRANT_SCHEMA;
  grantId: string;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  hostInstanceId: string;
  subjectId: string;
  platformTenantId: string;
  workspaceId: string;
  capability: string;
  classification: CapabilityAccessClass;
  status: CapabilityGrantStatus;
  ownerDecisionBySubjectId: string;
  ownerDecisionAt: string;
  issuedAt: string;
  expiresAt: string;
  reviewAt: string;
};

export type CapabilityGrantScope = {
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  hostInstanceId: string;
  subjectId: string;
  platformTenantId: string;
  workspaceId: string;
};

export type CapabilityGrantStore = {
  listForScope(
    scope: CapabilityGrantScope
  ): CapabilityGrantRecord[] | Promise<CapabilityGrantRecord[]>;
};

export type CapabilityNegotiationContext = CapabilityGrantScope & {
  auditCorrelationId: string;
  requestedCapabilities: string[];
};

export type CapabilityDenialReason =
  | "not_discovered"
  | "grant_missing"
  | "grant_ambiguous"
  | "owner_denied"
  | "grant_revoked"
  | "grant_expired"
  | "review_required"
  | "grant_not_yet_valid"
  | "grant_classification_mismatch"
  | "grant_scope_mismatch"
  | "grant_invalid";

export type CapabilityProjectionEntry =
  | {
      capability: string;
      classification: CapabilityAccessClass;
      requested: false;
      discovered: true;
      callable: false;
      state: "available_not_requested";
      reason: "not_requested";
      explanation: string;
      grantId: null;
      expiresAt: null;
      reviewAt: null;
    }
  | {
      capability: string;
      classification: CapabilityAccessClass | null;
      requested: true;
      discovered: boolean;
      callable: false;
      state: "denied";
      reason: CapabilityDenialReason;
      explanation: string;
      grantId: string | null;
      expiresAt: string | null;
      reviewAt: string | null;
    }
  | {
      capability: string;
      classification: CapabilityAccessClass;
      requested: true;
      discovered: true;
      callable: true;
      state: "granted";
      reason: "owner_approved";
      explanation: string;
      grantId: string;
      expiresAt: string;
      reviewAt: string;
    };

export type CapabilityNegotiationAuditEvent = {
  schema: "rosevear.ai-data-platform.capability-negotiation-audit.v1";
  version: typeof CAPABILITY_NEGOTIATION_VERSION;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  hostInstanceId: string;
  subjectId: string;
  platformTenantId: string;
  workspaceId: string;
  auditCorrelationId: string;
  requestedCapabilities: string[];
  effectiveCapabilities: string[];
  deniedCapabilities: Array<{
    capability: string;
    reason: CapabilityDenialReason;
  }>;
  occurredAt: string;
};

export type CapabilityNegotiationAuditSink = {
  record(
    event: CapabilityNegotiationAuditEvent
  ): void | Promise<void>;
};

export type CapabilityNegotiationResult = {
  schema: typeof CAPABILITY_NEGOTIATION_SCHEMA;
  version: typeof CAPABILITY_NEGOTIATION_VERSION;
  discoverySchema: typeof CAPABILITY_DISCOVERY_SCHEMA;
  scope: CapabilityGrantScope;
  auditCorrelationId: string;
  requestedCapabilities: string[];
  discoveredCapabilities: ModuleCapabilityDescriptor[];
  effectiveCapabilities: string[];
  projections: CapabilityProjectionEntry[];
  leastPrivilegeApplied: true;
  discoveryGrantsAuthorization: false;
  unrequestedCapabilitiesGranted: false;
};

export type CapabilityNegotiatorOptions = {
  registry: ModuleCapabilityRegistry;
  grantStore: CapabilityGrantStore;
  auditSink?: CapabilityNegotiationAuditSink;
  now?: () => string;
};

export class CapabilityNegotiationError extends Error {
  readonly code:
    | "context_invalid"
    | "registry_invalid"
    | "grant_scope_mismatch"
    | "grant_invalid";

  constructor(code: CapabilityNegotiationError["code"], message: string) {
    super(message);
    this.name = "CapabilityNegotiationError";
    this.code = code;
  }
}

const APPLICATION_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const CAPABILITY_ID_PATTERN =
  /^[a-z][a-z0-9]*(?:[.:/_-][a-z0-9]+)*$/;
const OPAQUE_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{0,127}$/;
const AUDIT_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{7,127}$/;

function validOpaqueId(value: string) {
  return OPAQUE_ID_PATTERN.test(value);
}

function validCapabilityId(value: string) {
  return CAPABILITY_ID_PATTERN.test(value) && value.length <= 160;
}

function parseTimestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateContext(context: CapabilityNegotiationContext) {
  if (
    !APPLICATION_ID_PATTERN.test(context.hostApplicationId) ||
    !HOST_ENVIRONMENTS.includes(context.hostEnvironment) ||
    !validOpaqueId(context.hostInstanceId) ||
    !validOpaqueId(context.subjectId) ||
    !validOpaqueId(context.platformTenantId) ||
    !validOpaqueId(context.workspaceId) ||
    !AUDIT_ID_PATTERN.test(context.auditCorrelationId) ||
    !Array.isArray(context.requestedCapabilities) ||
    context.requestedCapabilities.some(
      (capability) => !validCapabilityId(capability)
    )
  ) {
    throw new CapabilityNegotiationError(
      "context_invalid",
      "Capability negotiation context is invalid."
    );
  }
}

function validateDescriptor(descriptor: ModuleCapabilityDescriptor) {
  if (
    !validCapabilityId(descriptor.id) ||
    !["read", "write", "action"].includes(descriptor.classification) ||
    typeof descriptor.mutating !== "boolean" ||
    typeof descriptor.consequential !== "boolean" ||
    typeof descriptor.description !== "string" ||
    descriptor.description.length < 1 ||
    descriptor.description.length > 240
  ) {
    throw new CapabilityNegotiationError(
      "registry_invalid",
      "Capability registry contains an invalid descriptor."
    );
  }

  if (
    descriptor.classification === "read" &&
    descriptor.mutating
  ) {
    throw new CapabilityNegotiationError(
      "registry_invalid",
      "Read capabilities cannot be marked mutating."
    );
  }

  if (
    descriptor.classification !== "read" &&
    !descriptor.mutating
  ) {
    throw new CapabilityNegotiationError(
      "registry_invalid",
      "Write/action capabilities must be marked mutating."
    );
  }
}

function scopeMatches(
  grant: CapabilityGrantRecord,
  scope: CapabilityGrantScope
) {
  return (
    grant.hostApplicationId === scope.hostApplicationId &&
    grant.hostEnvironment === scope.hostEnvironment &&
    grant.hostInstanceId === scope.hostInstanceId &&
    grant.subjectId === scope.subjectId &&
    grant.platformTenantId === scope.platformTenantId &&
    grant.workspaceId === scope.workspaceId
  );
}

function validateGrant(grant: CapabilityGrantRecord) {
  const ownerDecisionAt = parseTimestamp(grant.ownerDecisionAt);
  const issuedAt = parseTimestamp(grant.issuedAt);
  const expiresAt = parseTimestamp(grant.expiresAt);
  const reviewAt = parseTimestamp(grant.reviewAt);

  if (
    grant.schema !== CAPABILITY_GRANT_SCHEMA ||
    !validOpaqueId(grant.grantId) ||
    !APPLICATION_ID_PATTERN.test(grant.hostApplicationId) ||
    !HOST_ENVIRONMENTS.includes(grant.hostEnvironment) ||
    !validOpaqueId(grant.hostInstanceId) ||
    !validOpaqueId(grant.subjectId) ||
    !validOpaqueId(grant.platformTenantId) ||
    !validOpaqueId(grant.workspaceId) ||
    !validCapabilityId(grant.capability) ||
    !["read", "write", "action"].includes(grant.classification) ||
    !["approved", "denied", "revoked"].includes(grant.status) ||
    !validOpaqueId(grant.ownerDecisionBySubjectId) ||
    ownerDecisionAt === null ||
    issuedAt === null ||
    expiresAt === null ||
    reviewAt === null ||
    expiresAt <= issuedAt ||
    reviewAt <= issuedAt
  ) {
    throw new CapabilityNegotiationError(
      "grant_invalid",
      "Capability grant record is invalid."
    );
  }
}

function denialExplanation(reason: CapabilityDenialReason) {
  switch (reason) {
    case "not_discovered":
      return "The host requested a capability that is not present in the module capability registry.";
    case "grant_missing":
      return "No owner-controlled grant exists for this capability and exact host/user/tenant/workspace scope.";
    case "grant_ambiguous":
      return "More than one current grant decision exists for this capability and scope; authorization fails closed.";
    case "owner_denied":
      return "The owner-controlled grant decision explicitly denies this capability.";
    case "grant_revoked":
      return "The owner-controlled grant for this capability has been revoked.";
    case "grant_expired":
      return "The owner-controlled grant has expired.";
    case "review_required":
      return "The owner-controlled grant has reached its review date and must be reviewed before reuse.";
    case "grant_not_yet_valid":
      return "The owner-controlled grant is not yet valid.";
    case "grant_classification_mismatch":
      return "The grant classification does not match the discovered capability classification.";
    case "grant_scope_mismatch":
      return "The grant does not belong to the exact authenticated host/user/tenant/workspace scope.";
    case "grant_invalid":
      return "The grant record is malformed or has invalid lifecycle timestamps.";
  }
}

const LIVE_CAPABILITY_DESCRIPTIONS: Record<
  ModuleHeadlessCapability,
  string
> = {
  "manifest.read": "Read the governed module manifest.",
  "integration-health.read": "Read integration health evidence.",
  "integration-certification.read":
    "Read integration certification evidence.",
  "data-contracts.read": "Read governed data contract descriptors.",
  "recovery-plan.read": "Read safe recovery-plan evidence."
};

export function createLiveModuleCapabilityRegistry(): ModuleCapabilityRegistry {
  return {
    discover() {
      return MODULE_HEADLESS_CAPABILITIES.map((id) => ({
        id,
        classification: "read" as const,
        mutating: false,
        consequential: false,
        description: LIVE_CAPABILITY_DESCRIPTIONS[id]
      }));
    }
  };
}

export function createStaticModuleCapabilityRegistry(
  descriptors: ModuleCapabilityDescriptor[]
): ModuleCapabilityRegistry {
  return {
    discover() {
      return descriptors.map((descriptor) => ({ ...descriptor }));
    }
  };
}

export function createExactCapabilityGrantStore(
  grants: CapabilityGrantRecord[]
): CapabilityGrantStore {
  return {
    listForScope(scope) {
      return grants.filter((grant) => scopeMatches(grant, scope));
    }
  };
}

export function capabilityContextFromHostRuntime(
  context: HostRuntimeContext
): CapabilityNegotiationContext {
  return {
    hostApplicationId: context.hostApplication.id,
    hostEnvironment: context.hostApplication.environment,
    hostInstanceId: context.hostApplication.instanceId,
    subjectId: context.subject.id,
    platformTenantId: context.tenancy.tenantId,
    workspaceId: context.tenancy.workspaceId,
    auditCorrelationId: context.auditCorrelationId,
    requestedCapabilities: [...context.requestedCapabilities]
  };
}

export class CapabilityNegotiator {
  readonly schema = CAPABILITY_NEGOTIATION_SCHEMA;
  readonly version = CAPABILITY_NEGOTIATION_VERSION;

  private readonly options: CapabilityNegotiatorOptions;

  constructor(options: CapabilityNegotiatorOptions) {
    this.options = options;
  }

  async discover() {
    const descriptors = await this.options.registry.discover();
    const seen = new Set<string>();

    for (const descriptor of descriptors) {
      validateDescriptor(descriptor);
      if (seen.has(descriptor.id)) {
        throw new CapabilityNegotiationError(
          "registry_invalid",
          "Capability registry contains duplicate capability IDs."
        );
      }
      seen.add(descriptor.id);
    }

    return descriptors.map((descriptor) => ({ ...descriptor }));
  }

  async negotiate(
    context: CapabilityNegotiationContext
  ): Promise<CapabilityNegotiationResult> {
    validateContext(context);

    const discovered = await this.discover();
    const discoveredById = new Map(
      discovered.map((descriptor) => [descriptor.id, descriptor])
    );

    const requested = [...new Set(context.requestedCapabilities)];
    const scope: CapabilityGrantScope = {
      hostApplicationId: context.hostApplicationId,
      hostEnvironment: context.hostEnvironment,
      hostInstanceId: context.hostInstanceId,
      subjectId: context.subjectId,
      platformTenantId: context.platformTenantId,
      workspaceId: context.workspaceId
    };

    const grants = await this.options.grantStore.listForScope(scope);
    for (const grant of grants) {
      try {
        validateGrant(grant);
      } catch {
        throw new CapabilityNegotiationError(
          "grant_invalid",
          "Capability grant store returned an invalid grant."
        );
      }
      if (!scopeMatches(grant, scope)) {
        throw new CapabilityNegotiationError(
          "grant_scope_mismatch",
          "Capability grant store returned a grant outside the exact negotiation scope."
        );
      }
    }

    const now = Date.parse(this.options.now?.() ?? new Date().toISOString());
    if (!Number.isFinite(now)) {
      throw new CapabilityNegotiationError(
        "context_invalid",
        "Capability negotiator now() returned an invalid timestamp."
      );
    }

    const projections: CapabilityProjectionEntry[] = [];

    for (const descriptor of discovered) {
      if (!requested.includes(descriptor.id)) {
        projections.push({
          capability: descriptor.id,
          classification: descriptor.classification,
          requested: false,
          discovered: true,
          callable: false,
          state: "available_not_requested",
          reason: "not_requested",
          explanation:
            "The capability is discoverable but was not requested by the host; least privilege keeps it non-callable.",
          grantId: null,
          expiresAt: null,
          reviewAt: null
        });
      }
    }

    for (const capability of requested) {
      const descriptor = discoveredById.get(capability);
      if (!descriptor) {
        projections.push({
          capability,
          classification: null,
          requested: true,
          discovered: false,
          callable: false,
          state: "denied",
          reason: "not_discovered",
          explanation: denialExplanation("not_discovered"),
          grantId: null,
          expiresAt: null,
          reviewAt: null
        });
        continue;
      }

      const candidates = grants.filter(
        (grant) => grant.capability === capability
      );

      if (candidates.length === 0) {
        projections.push({
          capability,
          classification: descriptor.classification,
          requested: true,
          discovered: true,
          callable: false,
          state: "denied",
          reason: "grant_missing",
          explanation: denialExplanation("grant_missing"),
          grantId: null,
          expiresAt: null,
          reviewAt: null
        });
        continue;
      }

      if (candidates.length > 1) {
        projections.push({
          capability,
          classification: descriptor.classification,
          requested: true,
          discovered: true,
          callable: false,
          state: "denied",
          reason: "grant_ambiguous",
          explanation: denialExplanation("grant_ambiguous"),
          grantId: null,
          expiresAt: null,
          reviewAt: null
        });
        continue;
      }

      const grant = candidates[0];
      let denial: CapabilityDenialReason | null = null;

      if (grant.classification !== descriptor.classification) {
        denial = "grant_classification_mismatch";
      } else if (grant.status === "denied") {
        denial = "owner_denied";
      } else if (grant.status === "revoked") {
        denial = "grant_revoked";
      } else {
        const issuedAt = Date.parse(grant.issuedAt);
        const expiresAt = Date.parse(grant.expiresAt);
        const reviewAt = Date.parse(grant.reviewAt);

        if (issuedAt > now) {
          denial = "grant_not_yet_valid";
        } else if (expiresAt <= now) {
          denial = "grant_expired";
        } else if (reviewAt <= now) {
          denial = "review_required";
        }
      }

      if (denial) {
        projections.push({
          capability,
          classification: descriptor.classification,
          requested: true,
          discovered: true,
          callable: false,
          state: "denied",
          reason: denial,
          explanation: denialExplanation(denial),
          grantId: grant.grantId,
          expiresAt: grant.expiresAt,
          reviewAt: grant.reviewAt
        });
        continue;
      }

      projections.push({
        capability,
        classification: descriptor.classification,
        requested: true,
        discovered: true,
        callable: true,
        state: "granted",
        reason: "owner_approved",
        explanation:
          "The capability was requested, discovered, explicitly owner-approved for the exact scope, unexpired and not yet due for review.",
        grantId: grant.grantId,
        expiresAt: grant.expiresAt,
        reviewAt: grant.reviewAt
      });
    }

    const effectiveCapabilities = projections
      .filter(
        (
          projection
        ): projection is Extract<
          CapabilityProjectionEntry,
          { state: "granted" }
        > => projection.state === "granted"
      )
      .map((projection) => projection.capability);

    const deniedCapabilities = projections
      .filter(
        (
          projection
        ): projection is Extract<
          CapabilityProjectionEntry,
          { state: "denied" }
        > => projection.state === "denied"
      )
      .map((projection) => ({
        capability: projection.capability,
        reason: projection.reason
      }));

    await this.options.auditSink?.record({
      schema: "rosevear.ai-data-platform.capability-negotiation-audit.v1",
      version: CAPABILITY_NEGOTIATION_VERSION,
      ...scope,
      auditCorrelationId: context.auditCorrelationId,
      requestedCapabilities: requested,
      effectiveCapabilities,
      deniedCapabilities,
      occurredAt: new Date(now).toISOString()
    });

    return Object.freeze({
      schema: CAPABILITY_NEGOTIATION_SCHEMA,
      version: CAPABILITY_NEGOTIATION_VERSION,
      discoverySchema: CAPABILITY_DISCOVERY_SCHEMA,
      scope,
      auditCorrelationId: context.auditCorrelationId,
      requestedCapabilities: requested,
      discoveredCapabilities: discovered,
      effectiveCapabilities,
      projections,
      leastPrivilegeApplied: true,
      discoveryGrantsAuthorization: false,
      unrequestedCapabilitiesGranted: false
    });
  }
}

export function createLeastPrivilegeHeadlessAuthorizer(input: {
  negotiator: CapabilityNegotiator;
  contextProvider: HeadlessModuleContextProvider;
}): HeadlessModuleCapabilityAuthorizer {
  return {
    async authorize(request) {
      const rawContext = await input.contextProvider.getContext();
      const validation = validateUniversalHostContext(rawContext);
      if (!validation.valid) {
        return {
          allowed: false,
          reason:
            "Capability authorization denied because the host context is invalid."
        };
      }

      const context = validation.context;
      const runtime = request.runtimeIdentity;
      if (
        runtime.hostApplicationId !== context.hostApplication.id ||
        runtime.hostEnvironment !== context.hostApplication.environment ||
        runtime.hostInstanceId !== context.hostApplication.instanceId ||
        runtime.authenticatedSubjectId !== context.subject.id ||
        runtime.tenantId !== context.tenancy.tenantId ||
        runtime.workspaceId !== context.tenancy.workspaceId ||
        runtime.auditCorrelationId !== context.auditCorrelationId
      ) {
        return {
          allowed: false,
          reason:
            "Capability authorization denied because runtime identity does not match the current authenticated tenant/workspace context."
        };
      }

      const result = await input.negotiator.negotiate(
        capabilityContextFromHostRuntime(context)
      );
      const projection = result.projections.find(
        (candidate) =>
          candidate.capability === request.capability &&
          candidate.requested
      );

      if (!projection || !projection.callable) {
        return {
          allowed: false,
          reason:
            projection?.explanation ??
            "Capability authorization denied because no effective least-privilege grant exists."
        };
      }

      return {
        allowed: true,
        reason:
          "Capability authorization allowed by the current exact-scope owner-controlled grant."
      };
    }
  };
}
