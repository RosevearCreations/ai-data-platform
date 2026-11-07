import type { HostEnvironment, HostRuntimeContext } from "./universal-module-contract";
import type { AuthenticatedHostSessionContext } from "./host-session-context-bridge";

export const TENANT_WORKSPACE_RESOLUTION_VERSION = "1.0.0" as const;
export const TENANT_WORKSPACE_MAPPING_SCHEMA =
  "rosevear.ai-data-platform.tenant-workspace-mapping.v1" as const;
export const TENANT_WORKSPACE_RESOLUTION_SCHEMA =
  "rosevear.ai-data-platform.tenant-workspace-resolution.v1" as const;

export type HostTenantContext = {
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  hostInstanceId: string;
  hostTenantId: string;
  hostOrganizationId: string | null;
  hostBusinessId: string | null;
  auditCorrelationId: string;
};

export type TenantWorkspaceMappingStatus = "active" | "disabled" | "deleted";

export type TenantWorkspaceMapping = {
  schema: typeof TENANT_WORKSPACE_MAPPING_SCHEMA;
  mappingId: string;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  hostTenantId: string;
  hostOrganizationId: string | null;
  hostBusinessId: string | null;
  platformTenantId: string;
  workspaceId: string;
  status: TenantWorkspaceMappingStatus;
  updatedAt: string;
};

export type TenantWorkspaceMappingStore = {
  listExactMappings(input: HostTenantContext):
    | TenantWorkspaceMapping[]
    | Promise<TenantWorkspaceMapping[]>;
};

export type WorkspaceRlsVerification = {
  verified: boolean;
  ownWorkspaceReadable: boolean;
  foreignWorkspaceDenied: boolean;
  crossTenantDenied: boolean;
  evidenceId: string;
};

export type WorkspaceRlsVerifier = {
  verify(input: {
    platformTenantId: string;
    workspaceId: string;
    hostApplicationId: string;
    hostEnvironment: HostEnvironment;
    auditCorrelationId: string;
  }): WorkspaceRlsVerification | Promise<WorkspaceRlsVerification>;
};

export type TenantWorkspaceAuditReason =
  | "resolved"
  | "host_identity_mismatch"
  | "mapping_missing"
  | "mapping_ambiguous"
  | "mapping_disabled"
  | "mapping_deleted"
  | "mapping_invalid"
  | "rls_verification_failed";

export type TenantWorkspaceAuditEvent = {
  schema: "rosevear.ai-data-platform.tenant-workspace-resolution-audit.v1";
  version: typeof TENANT_WORKSPACE_RESOLUTION_VERSION;
  status: "resolved" | "rejected";
  reason: TenantWorkspaceAuditReason;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  hostInstanceId: string;
  hostTenantId: string;
  hostOrganizationId: string | null;
  hostBusinessId: string | null;
  mappingId: string | null;
  platformTenantId: string | null;
  workspaceId: string | null;
  auditCorrelationId: string;
  rlsEvidenceId: string | null;
  occurredAt: string;
};

export type TenantWorkspaceAuditSink = {
  record(event: TenantWorkspaceAuditEvent): void | Promise<void>;
};

export type ResolvedTenantWorkspaceContext = {
  schema: typeof TENANT_WORKSPACE_RESOLUTION_SCHEMA;
  version: typeof TENANT_WORKSPACE_RESOLUTION_VERSION;
  mappingId: string;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  hostInstanceId: string;
  hostTenantId: string;
  hostOrganizationId: string | null;
  hostBusinessId: string | null;
  platformTenantId: string;
  workspaceId: string;
  authenticatedModuleSubjectId: string;
  auditCorrelationId: string;
  rlsEvidenceId: string;
  mappingStatus: "active";
  implicitFallbackUsed: false;
  authorizationGranted: false;
};

export type TenantWorkspaceResolverOptions = {
  mappingStore: TenantWorkspaceMappingStore;
  rlsVerifier: WorkspaceRlsVerifier;
  auditSink?: TenantWorkspaceAuditSink;
  now?: () => string;
};

export class TenantWorkspaceResolutionError extends Error {
  readonly code:
    | "host_identity_mismatch"
    | "mapping_missing"
    | "mapping_ambiguous"
    | "mapping_disabled"
    | "mapping_deleted"
    | "mapping_invalid"
    | "rls_verification_failed";

  constructor(code: TenantWorkspaceResolutionError["code"], message: string) {
    super(message);
    this.name = "TenantWorkspaceResolutionError";
    this.code = code;
  }
}

const APPLICATION_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{0,127}$/;
const AUDIT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{7,127}$/;

function validId(value: string) {
  return OPAQUE_ID_PATTERN.test(value);
}

function validateTenantContext(input: HostTenantContext) {
  if (
    !APPLICATION_ID_PATTERN.test(input.hostApplicationId) ||
    !validId(input.hostInstanceId) ||
    !validId(input.hostTenantId) ||
    (input.hostOrganizationId !== null &&
      !validId(input.hostOrganizationId)) ||
    (input.hostBusinessId !== null && !validId(input.hostBusinessId)) ||
    !AUDIT_ID_PATTERN.test(input.auditCorrelationId)
  ) {
    throw new TenantWorkspaceResolutionError(
      "mapping_invalid",
      "Host tenant context contains an invalid identifier."
    );
  }
}

function exactMappingKeyMatches(
  mapping: TenantWorkspaceMapping,
  context: HostTenantContext
) {
  return (
    mapping.hostApplicationId === context.hostApplicationId &&
    mapping.hostEnvironment === context.hostEnvironment &&
    mapping.hostTenantId === context.hostTenantId &&
    mapping.hostOrganizationId === context.hostOrganizationId &&
    mapping.hostBusinessId === context.hostBusinessId
  );
}

function validateMapping(mapping: TenantWorkspaceMapping) {
  if (
    mapping.schema !== TENANT_WORKSPACE_MAPPING_SCHEMA ||
    !validId(mapping.mappingId) ||
    !APPLICATION_ID_PATTERN.test(mapping.hostApplicationId) ||
    !validId(mapping.hostTenantId) ||
    (mapping.hostOrganizationId !== null &&
      !validId(mapping.hostOrganizationId)) ||
    (mapping.hostBusinessId !== null && !validId(mapping.hostBusinessId)) ||
    !validId(mapping.platformTenantId) ||
    !validId(mapping.workspaceId) ||
    !["active", "disabled", "deleted"].includes(mapping.status) ||
    !Number.isFinite(Date.parse(mapping.updatedAt))
  ) {
    throw new TenantWorkspaceResolutionError(
      "mapping_invalid",
      "Tenant/workspace mapping record is invalid."
    );
  }
}

export class TenantWorkspaceContextResolver {
  readonly schema = TENANT_WORKSPACE_RESOLUTION_SCHEMA;
  readonly version = TENANT_WORKSPACE_RESOLUTION_VERSION;

  private readonly options: TenantWorkspaceResolverOptions;

  constructor(options: TenantWorkspaceResolverOptions) {
    this.options = options;
  }

  async resolve(input: {
    authenticatedSession: AuthenticatedHostSessionContext;
    tenantContext: HostTenantContext;
  }): Promise<ResolvedTenantWorkspaceContext> {
    const { authenticatedSession, tenantContext } = input;
    validateTenantContext(tenantContext);

    if (
      authenticatedSession.hostApplicationId !==
        tenantContext.hostApplicationId ||
      authenticatedSession.hostEnvironment !==
        tenantContext.hostEnvironment ||
      authenticatedSession.hostInstanceId !== tenantContext.hostInstanceId ||
      authenticatedSession.auditCorrelationId !==
        tenantContext.auditCorrelationId
    ) {
      await this.audit(tenantContext, {
        status: "rejected",
        reason: "host_identity_mismatch"
      });
      throw new TenantWorkspaceResolutionError(
        "host_identity_mismatch",
        "Tenant context does not belong to the authenticated host session."
      );
    }

    const candidates = await this.options.mappingStore.listExactMappings(
      tenantContext
    );

    for (const candidate of candidates) {
      validateMapping(candidate);
      if (!exactMappingKeyMatches(candidate, tenantContext)) {
        await this.audit(tenantContext, {
          status: "rejected",
          reason: "mapping_invalid",
          mappingId: candidate.mappingId
        });
        throw new TenantWorkspaceResolutionError(
          "mapping_invalid",
          "Mapping store returned a non-exact tenant mapping."
        );
      }
    }

    const active = candidates.filter((mapping) => mapping.status === "active");

    if (active.length > 1) {
      await this.audit(tenantContext, {
        status: "rejected",
        reason: "mapping_ambiguous"
      });
      throw new TenantWorkspaceResolutionError(
        "mapping_ambiguous",
        "More than one active workspace mapping exists for the exact host tenant context."
      );
    }

    if (active.length === 0) {
      if (candidates.some((mapping) => mapping.status === "disabled")) {
        await this.audit(tenantContext, {
          status: "rejected",
          reason: "mapping_disabled"
        });
        throw new TenantWorkspaceResolutionError(
          "mapping_disabled",
          "The exact tenant/workspace mapping is disabled."
        );
      }

      if (candidates.some((mapping) => mapping.status === "deleted")) {
        await this.audit(tenantContext, {
          status: "rejected",
          reason: "mapping_deleted"
        });
        throw new TenantWorkspaceResolutionError(
          "mapping_deleted",
          "The exact tenant/workspace mapping has been deleted."
        );
      }

      await this.audit(tenantContext, {
        status: "rejected",
        reason: "mapping_missing"
      });
      throw new TenantWorkspaceResolutionError(
        "mapping_missing",
        "No explicit workspace mapping exists for the exact host tenant context."
      );
    }

    const mapping = active[0];
    const rls = await this.options.rlsVerifier.verify({
      platformTenantId: mapping.platformTenantId,
      workspaceId: mapping.workspaceId,
      hostApplicationId: tenantContext.hostApplicationId,
      hostEnvironment: tenantContext.hostEnvironment,
      auditCorrelationId: tenantContext.auditCorrelationId
    });

    if (
      !rls.verified ||
      !rls.ownWorkspaceReadable ||
      !rls.foreignWorkspaceDenied ||
      !rls.crossTenantDenied ||
      !validId(rls.evidenceId)
    ) {
      await this.audit(tenantContext, {
        status: "rejected",
        reason: "rls_verification_failed",
        mappingId: mapping.mappingId,
        platformTenantId: mapping.platformTenantId,
        workspaceId: mapping.workspaceId,
        rlsEvidenceId: rls.evidenceId || null
      });
      throw new TenantWorkspaceResolutionError(
        "rls_verification_failed",
        "Workspace RLS verification did not prove tenant and workspace isolation."
      );
    }

    await this.audit(tenantContext, {
      status: "resolved",
      reason: "resolved",
      mappingId: mapping.mappingId,
      platformTenantId: mapping.platformTenantId,
      workspaceId: mapping.workspaceId,
      rlsEvidenceId: rls.evidenceId
    });

    return Object.freeze({
      schema: TENANT_WORKSPACE_RESOLUTION_SCHEMA,
      version: TENANT_WORKSPACE_RESOLUTION_VERSION,
      mappingId: mapping.mappingId,
      hostApplicationId: tenantContext.hostApplicationId,
      hostEnvironment: tenantContext.hostEnvironment,
      hostInstanceId: tenantContext.hostInstanceId,
      hostTenantId: tenantContext.hostTenantId,
      hostOrganizationId: tenantContext.hostOrganizationId,
      hostBusinessId: tenantContext.hostBusinessId,
      platformTenantId: mapping.platformTenantId,
      workspaceId: mapping.workspaceId,
      authenticatedModuleSubjectId: authenticatedSession.moduleSubjectId,
      auditCorrelationId: tenantContext.auditCorrelationId,
      rlsEvidenceId: rls.evidenceId,
      mappingStatus: "active",
      implicitFallbackUsed: false,
      authorizationGranted: false
    });
  }

  private async audit(
    context: HostTenantContext,
    input: {
      status: "resolved" | "rejected";
      reason: TenantWorkspaceAuditReason;
      mappingId?: string | null;
      platformTenantId?: string | null;
      workspaceId?: string | null;
      rlsEvidenceId?: string | null;
    }
  ) {
    await this.options.auditSink?.record({
      schema: "rosevear.ai-data-platform.tenant-workspace-resolution-audit.v1",
      version: TENANT_WORKSPACE_RESOLUTION_VERSION,
      status: input.status,
      reason: input.reason,
      hostApplicationId: context.hostApplicationId,
      hostEnvironment: context.hostEnvironment,
      hostInstanceId: context.hostInstanceId,
      hostTenantId: context.hostTenantId,
      hostOrganizationId: context.hostOrganizationId,
      hostBusinessId: context.hostBusinessId,
      mappingId: input.mappingId ?? null,
      platformTenantId: input.platformTenantId ?? null,
      workspaceId: input.workspaceId ?? null,
      auditCorrelationId: context.auditCorrelationId,
      rlsEvidenceId: input.rlsEvidenceId ?? null,
      occurredAt: this.options.now?.() ?? new Date().toISOString()
    });
  }
}

export function bindResolvedTenantWorkspaceToHostContext(
  context: HostRuntimeContext,
  resolved: ResolvedTenantWorkspaceContext
): HostRuntimeContext {
  if (
    context.hostApplication.id !== resolved.hostApplicationId ||
    context.hostApplication.environment !== resolved.hostEnvironment ||
    context.hostApplication.instanceId !== resolved.hostInstanceId ||
    context.subject.id !== resolved.authenticatedModuleSubjectId ||
    context.auditCorrelationId !== resolved.auditCorrelationId
  ) {
    throw new TenantWorkspaceResolutionError(
      "host_identity_mismatch",
      "Resolved tenant/workspace context does not belong to the host runtime context."
    );
  }

  return {
    ...context,
    tenancy: {
      tenantId: resolved.platformTenantId,
      workspaceId: resolved.workspaceId
    }
  };
}

export type TenantIsolationFixtureRow = {
  rowId: string;
  platformTenantId: string;
  workspaceId: string;
};

export function createTenantIsolationFixtureRlsVerifier(input: {
  rows: TenantIsolationFixtureRow[];
  evidenceId: string;
}): WorkspaceRlsVerifier {
  return {
    verify({ platformTenantId, workspaceId }) {
      const ownWorkspaceReadable = input.rows.some(
        (row) =>
          row.platformTenantId === platformTenantId &&
          row.workspaceId === workspaceId
      );
      const foreignWorkspaceDenied = input.rows
        .filter(
          (row) =>
            row.platformTenantId === platformTenantId &&
            row.workspaceId !== workspaceId
        )
        .every(
          (row) =>
            !(
              row.platformTenantId === platformTenantId &&
              row.workspaceId === workspaceId
            )
        );
      const crossTenantDenied = input.rows
        .filter((row) => row.platformTenantId !== platformTenantId)
        .every(
          (row) =>
            !(
              row.platformTenantId === platformTenantId &&
              row.workspaceId === workspaceId
            )
        );

      return {
        verified:
          ownWorkspaceReadable &&
          foreignWorkspaceDenied &&
          crossTenantDenied,
        ownWorkspaceReadable,
        foreignWorkspaceDenied,
        crossTenantDenied,
        evidenceId: input.evidenceId
      };
    }
  };
}

export function createExactTenantWorkspaceMappingStore(
  mappings: TenantWorkspaceMapping[]
): TenantWorkspaceMappingStore {
  return {
    listExactMappings(context) {
      return mappings.filter((mapping) =>
        exactMappingKeyMatches(mapping, context)
      );
    }
  };
}
