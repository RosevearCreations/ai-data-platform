import { createHash } from "node:crypto";

import { buildSharedApplicationIdentityMap } from "./application-identity-mapping";
import {
  MASTER_SHELL_SOURCE_DEFINITIONS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";

export const MASTER_SYSOP_BUILD = 341 as const;
export const MASTER_SYSOP_HANDOFF_TTL_SECONDS = 600 as const;

export type MasterSysopRole = "owner" | "operator";
export type WorkspaceRole = "owner" | "admin" | "member";

export type MasterSysopWorkspace = {
  id: string;
  slug: string;
  name: string;
  type: "business" | "personal";
  role: WorkspaceRole;
};

export type MasterSysopMemberView = {
  userId: string;
  name: string;
  email: string;
  role: MasterSysopRole;
  grantedAt: string;
  revokedAt: string | null;
  active: boolean;
};

export type MasterSysopSourceNavigationEvidence = {
  sourceId: MasterShellSourceId;
  effectiveStatus: string;
  freshness: "FRESH" | "STALE" | "UNMEASURED";
  approvedOrigin: string | null;
  rolesAllowed: string[];
};

export type MasterSysopDestinationKey =
  | MasterShellSourceId
  | "rosevear-comms-hub";

export type MasterSysopDestinationState =
  | "INTERNAL_READY"
  | "READY_REAUTH_REQUIRED"
  | "SYSOP_REQUIRED"
  | "SOURCE_HELD"
  | "SOURCE_NOT_READY"
  | "ORIGIN_UNMEASURED"
  | "TENANT_UNMAPPED"
  | "TENANT_DENIED";

type DestinationDefinition = {
  key: MasterSysopDestinationKey;
  displayName: string;
  repository: string;
  plane: "master-intelligence" | "application" | "communications";
  tenancy:
    | "platform-shell-with-child-tenants"
    | "owned-business-shell"
    | "support-broker-no-customer-tenant"
    | "local-support-server"
    | "complementary-control-plane";
  sourceId: MasterShellSourceId | null;
  peerApplicationId:
    | "yard-workers"
    | "icamp"
    | "rosiedazzlers"
    | "devilndove"
    | "rosevear-ai-hub"
    | "rosevear-comms-hub"
    | null;
};

const SOURCE_TO_PEER = {
  yw: "yard-workers",
  icamp: "icamp",
  rosiedazzlers: "rosiedazzlers",
  devilndove: "devilndove",
  "ai-data-platform": null,
  "rosevear-ai-hub": "rosevear-ai-hub"
} as const;

export const MASTER_SYSOP_DESTINATIONS: readonly DestinationDefinition[] =
  Object.freeze([
    ...MASTER_SHELL_SOURCE_DEFINITIONS.map((source) => ({
      key: source.sourceId,
      displayName:
        source.sourceId === "yw"
          ? "Yard Workers"
          : source.sourceId === "icamp"
            ? "iCamp"
            : source.sourceId === "rosiedazzlers"
              ? "Rosie Dazzlers"
              : source.sourceId === "devilndove"
                ? "Devil n Dove"
                : source.sourceId === "ai-data-platform"
                  ? "AI Data Platform"
                  : "Rosevear AI Hub",
      repository: source.repository,
      plane:
        source.sourceId === "ai-data-platform"
          ? ("master-intelligence" as const)
          : ("application" as const),
      tenancy: source.tenancyModel,
      sourceId: source.sourceId,
      peerApplicationId: SOURCE_TO_PEER[source.sourceId]
    })),
    {
      key: "rosevear-comms-hub",
      displayName: "Rosevear Comms Hub",
      repository: "RosevearCreations/rosevear-comms-hub",
      plane: "communications" as const,
      tenancy: "complementary-control-plane" as const,
      sourceId: null,
      peerApplicationId: "rosevear-comms-hub" as const
    }
  ]);

function sourceReadyForNavigation(evidence: MasterSysopSourceNavigationEvidence) {
  return (
    evidence.freshness === "FRESH" &&
    (
      evidence.effectiveStatus === "CONFIGURED" ||
      evidence.effectiveStatus === "TEST_VERIFIED" ||
      evidence.effectiveStatus === "CONNECTED"
    )
  );
}

function cleanOrigin(value: string | null) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function buildMasterSysopShellModel(input: {
  principal: {
    userId: string;
    name: string;
    email: string;
    role: MasterSysopRole | null;
    revokedAt: string | null;
  };
  claimEligible: boolean;
  workspaces: MasterSysopWorkspace[];
  sourceEvidence: MasterSysopSourceNavigationEvidence[];
  members: MasterSysopMemberView[];
  generatedAt?: string;
}) {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const activeSysop =
    input.principal.role !== null && input.principal.revokedAt === null;
  const sourceMap = new Map(
    input.sourceEvidence.map((item) => [item.sourceId, item])
  );
  const workspaceMap = new Map(
    input.workspaces.map((workspace) => [workspace.id, workspace])
  );
  const identityMap = buildSharedApplicationIdentityMap(generatedAt);
  const peerMap = new Map(
    identityMap.applications.map((item) => [item.applicationId, item])
  );

  const destinations = MASTER_SYSOP_DESTINATIONS.map((definition) => {
    const source = definition.sourceId
      ? sourceMap.get(definition.sourceId) ?? null
      : null;
    const peer = definition.peerApplicationId
      ? peerMap.get(definition.peerApplicationId) ?? null
      : null;

    let mappedWorkspace: MasterSysopWorkspace | null = null;
    let requiredWorkspaceId: string | null = null;
    let tenantContextState:
      | "not-applicable"
      | "destination-selects-child-tenant"
      | "mapped"
      | "unmapped"
      | "denied" = "not-applicable";

    if (definition.tenancy === "owned-business-shell") {
      requiredWorkspaceId =
        peer?.workspace.state === "mapped"
          ? peer.workspace.workspaceId
          : null;
      if (!requiredWorkspaceId) {
        tenantContextState = "unmapped";
      } else {
        mappedWorkspace = workspaceMap.get(requiredWorkspaceId) ?? null;
        tenantContextState = mappedWorkspace ? "mapped" : "denied";
      }
    } else if (
      definition.tenancy === "platform-shell-with-child-tenants"
    ) {
      tenantContextState = "destination-selects-child-tenant";
    }

    let state: MasterSysopDestinationState;
    let origin: string | null = null;

    if (!activeSysop) {
      state = "SYSOP_REQUIRED";
    } else if (definition.key === "ai-data-platform") {
      state = "INTERNAL_READY";
    } else if (definition.key === "rosevear-comms-hub") {
      state = "ORIGIN_UNMEASURED";
    } else if (tenantContextState === "unmapped") {
      state = "TENANT_UNMAPPED";
    } else if (tenantContextState === "denied") {
      state = "TENANT_DENIED";
    } else if (!source) {
      state = "SOURCE_NOT_READY";
    } else if (source.effectiveStatus === "AUTHORIZATION_HELD") {
      state = "SOURCE_HELD";
    } else if (!sourceReadyForNavigation(source)) {
      state = "SOURCE_NOT_READY";
    } else {
      origin = cleanOrigin(source.approvedOrigin);
      state = origin
        ? "READY_REAUTH_REQUIRED"
        : "ORIGIN_UNMEASURED";
    }

    return {
      key: definition.key,
      displayName: definition.displayName,
      repository: definition.repository,
      plane: definition.plane,
      tenancy: definition.tenancy,
      state,
      sourceStatus: source?.effectiveStatus ?? "UNMEASURED",
      sourceFreshness: source?.freshness ?? "UNMEASURED",
      origin,
      sourceRolesAllowed: source?.rolesAllowed ?? [],
      tenantContext: {
        state: tenantContextState,
        workspaceId: mappedWorkspace?.id ?? null,
        workspaceSlug: mappedWorkspace?.slug ?? null,
        workspaceName: mappedWorkspace?.name ?? null,
        workspaceRole: mappedWorkspace?.role ?? null,
        requiredWorkspaceId
      },
      handoffAllowed:
        state === "INTERNAL_READY" ||
        state === "READY_REAUTH_REQUIRED",
      destinationAuthenticationRequired:
        state !== "INTERNAL_READY",
      destinationAuthorizationGranted: false,
      tenantRoleElevated: false,
      navigationGrantsAuthority: false,
      href:
        state === "INTERNAL_READY"
          ? "/master-shell-command-center"
          : null
    };
  });

  return {
    schema: "ai-data-platform.master-sysop-shell.v1",
    build: MASTER_SYSOP_BUILD,
    generatedAt,
    principal: {
      userId: input.principal.userId,
      name: input.principal.name,
      email: input.principal.email,
      sysopRole: input.principal.role,
      activeSysop,
      revokedAt: input.principal.revokedAt,
      separateAuthenticatedSessionRequired: true
    },
    claimEligible: input.claimEligible,
    workspaces: input.workspaces,
    members: input.members,
    destinations,
    summary: {
      destinations: destinations.length,
      ready: destinations.filter((item) => item.handoffAllowed).length,
      externalReauthenticationReady: destinations.filter(
        (item) => item.state === "READY_REAUTH_REQUIRED"
      ).length,
      held: destinations.filter(
        (item) => item.state === "SOURCE_HELD"
      ).length,
      tenantDenied: destinations.filter(
        (item) => item.state === "TENANT_DENIED"
      ).length,
      tenantUnmapped: destinations.filter(
        (item) => item.state === "TENANT_UNMAPPED"
      ).length,
      originUnmeasured: destinations.filter(
        (item) => item.state === "ORIGIN_UNMEASURED"
      ).length
    },
    policy: {
      dedicatedMasterSysopAuthority: true,
      tenantAdminDoesNotImplySysop: true,
      separateAuthenticatedSessions: true,
      navigationGrantsDestinationAuthority: false,
      destinationReauthenticationRequired: true,
      destinationAuthorizationIsDestinationOwned: true,
      tenantMappingMayNotBeGuessed: true,
      workspaceRoleMayNotBeElevated: true,
      handoffCarriesUserId: false,
      handoffCarriesEmail: false,
      childTenantMayNotBecomeSourceIdentity: true,
      commsHubRemainsComplementaryPlane: true
    }
  };
}

export function buildNonAuthorizingHandoffContext(input: {
  handoffId: string;
  destinationKey: MasterSysopDestinationKey;
  workspace: {
    slug: string;
    role: WorkspaceRole;
  } | null;
  issuedAt: string;
  expiresAt: string;
}) {
  const context = {
    schema: "rosevear.master-sysop-handoff.v1",
    handoffId: input.handoffId,
    destinationKey: input.destinationKey,
    workspace:
      input.workspace === null
        ? null
        : {
            slug: input.workspace.slug,
            roleHint: input.workspace.role
          },
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    authority: "none" as const,
    actorIdentityTransferred: false,
    destinationReauthenticationRequired: true,
    destinationAuthorizationRequired: true,
    tenantRoleElevationAllowed: false,
    returnPath: "/master-sysop"
  };
  const encoded = Buffer.from(
    JSON.stringify(context),
    "utf8"
  ).toString("base64url");
  const contextHash = createHash("sha256")
    .update(encoded)
    .digest("hex");
  return { context, encoded, contextHash };
}

export function buildMasterSysopLaunchUrl(
  origin: string,
  encodedContext: string
) {
  const url = new URL(origin);
  if (url.protocol !== "https:") {
    throw new Error("master_sysop_destination_origin_invalid");
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  url.searchParams.set("rosevear_context", encodedContext);
  return url.toString();
}
