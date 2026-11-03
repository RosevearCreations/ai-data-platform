import {
  buildAppConnectionRegistry,
  type PeerApplicationId
} from "./app-connection-registry";

export type CanonicalApplicationEnvironment =
  | "local"
  | "preview"
  | "production";

export type WorkspaceBinding =
  | {
      state: "mapped";
      workspaceSlug: "rosiedazzlers" | "devilndove";
      workspaceId: string;
      source: "workspace-foundation";
    }
  | {
      state: "unmapped";
      workspaceSlug: null;
      workspaceId: null;
      source: "no-durable-workspace";
    };

export type EnvironmentMapping = {
  canonical: CanonicalApplicationEnvironment;
  aliases: readonly string[];
  integrationEnvironment: "nonproduction" | null;
  integrationV1Eligible: boolean;
  consequentialWritesAllowedByMapping: false;
};

export type SharedApplicationIdentity = {
  applicationId: PeerApplicationId;
  identityKey: string;
  displayName: string;
  repository: string;
  aliases: readonly string[];
  gatewayBusinessId: string | null;
  canonicalTenantKey: string;
  tenantBindingState: "logical-only";
  integrationTenantId: null;
  workspace: WorkspaceBinding;
  environments: readonly EnvironmentMapping[];
};

export type SharedApplicationIdentityMap = {
  schema: "ai-data-platform.shared-application-identity-map.v1";
  build: 282;
  generatedAt: string;
  applications: SharedApplicationIdentity[];
  summary: {
    applications: number;
    mappedWorkspaces: number;
    unmappedWorkspaces: number;
    productionIntegrationV1Eligible: number;
    automaticTenantProvisioning: number;
  };
  policy: {
    stableApplicationIdentity: true;
    stableLogicalTenantKeys: true;
    environmentAliasesNormalized: true;
    workspaceBindingEvidenceOnly: true;
    automaticWorkspaceCreation: false;
    automaticTenantProvisioning: false;
    liveAuthorizationImplied: false;
    ql266Resumed: false;
  };
};

const WORKSPACE_BINDINGS: Partial<Record<PeerApplicationId, WorkspaceBinding>> = {
  rosiedazzlers: {
    state: "mapped",
    workspaceSlug: "rosiedazzlers",
    workspaceId: "00000000-0000-4000-8000-000000000001",
    source: "workspace-foundation"
  },
  devilndove: {
    state: "mapped",
    workspaceSlug: "devilndove",
    workspaceId: "00000000-0000-4000-8000-000000000002",
    source: "workspace-foundation"
  }
};

const APPLICATION_ALIASES: Record<PeerApplicationId, readonly string[]> = {
  devilndove: Object.freeze([
    "devilndove",
    "devil-n-dove",
    "devilndove-site",
    "dnd"
  ]),
  rosiedazzlers: Object.freeze([
    "rosiedazzlers",
    "rosie-dazzlers",
    "rosie-dazzlers-detailing"
  ]),
  "yard-workers": Object.freeze([
    "yard-workers",
    "yardworkers",
    "yw"
  ]),
  icamp: Object.freeze([
    "icamp",
    "i-camp"
  ]),
  "rosevear-comms-hub": Object.freeze([
    "rosevear-comms-hub",
    "comms-hub",
    "rosevear-comms"
  ]),
  "rosevear-ai-hub": Object.freeze([
    "rosevear-ai-hub",
    "ai-hub",
    "rosevear-hub"
  ])
};

const ENVIRONMENT_MAPPINGS: readonly EnvironmentMapping[] = Object.freeze([
  Object.freeze({
    canonical: "local" as const,
    aliases: Object.freeze(["local", "development", "dev"]),
    integrationEnvironment: "nonproduction" as const,
    integrationV1Eligible: true,
    consequentialWritesAllowedByMapping: false as const
  }),
  Object.freeze({
    canonical: "preview" as const,
    aliases: Object.freeze(["preview", "staging", "stage", "nonproduction"]),
    integrationEnvironment: "nonproduction" as const,
    integrationV1Eligible: true,
    consequentialWritesAllowedByMapping: false as const
  }),
  Object.freeze({
    canonical: "production" as const,
    aliases: Object.freeze(["production", "prod"]),
    integrationEnvironment: null,
    integrationV1Eligible: false,
    consequentialWritesAllowedByMapping: false as const
  })
]);

function normalizedToken(value: string) {
  return value.trim().toLowerCase().replaceAll("_", "-");
}

export function resolveCanonicalEnvironment(input: string) {
  const token = normalizedToken(input);
  return ENVIRONMENT_MAPPINGS.find((mapping) =>
    mapping.aliases.includes(token)
  ) ?? null;
}

export function buildSharedApplicationIdentityMap(
  generatedAt = new Date().toISOString()
): SharedApplicationIdentityMap {
  const registry = buildAppConnectionRegistry(generatedAt);
  const applications = registry.peerApplications.map((app) => {
    const workspace =
      WORKSPACE_BINDINGS[app.id] ?? {
        state: "unmapped" as const,
        workspaceSlug: null,
        workspaceId: null,
        source: "no-durable-workspace" as const
      };

    return {
      applicationId: app.id,
      identityKey: `rosevear.app.${app.id}.v1`,
      displayName: app.displayName,
      repository: app.repository,
      aliases: APPLICATION_ALIASES[app.id],
      gatewayBusinessId: app.gatewayBusinessId,
      canonicalTenantKey: `rosevear-tenant-${app.id}`,
      tenantBindingState: "logical-only" as const,
      integrationTenantId: null,
      workspace,
      environments: ENVIRONMENT_MAPPINGS
    };
  });

  const identityKeys = new Set(applications.map((app) => app.identityKey));
  const tenantKeys = new Set(applications.map((app) => app.canonicalTenantKey));
  const aliases = applications.flatMap((app) => app.aliases);
  if (identityKeys.size !== applications.length) {
    throw new Error("shared_application_identity_duplicate_identity");
  }
  if (tenantKeys.size !== applications.length) {
    throw new Error("shared_application_identity_duplicate_tenant");
  }
  if (new Set(aliases).size !== aliases.length) {
    throw new Error("shared_application_identity_duplicate_alias");
  }

  return {
    schema: "ai-data-platform.shared-application-identity-map.v1",
    build: 282,
    generatedAt,
    applications,
    summary: {
      applications: applications.length,
      mappedWorkspaces: applications.filter(
        (app) => app.workspace.state === "mapped"
      ).length,
      unmappedWorkspaces: applications.filter(
        (app) => app.workspace.state === "unmapped"
      ).length,
      productionIntegrationV1Eligible: applications.filter((app) =>
        app.environments.some(
          (environment) =>
            environment.canonical === "production" &&
            environment.integrationV1Eligible
        )
      ).length,
      automaticTenantProvisioning: 0
    },
    policy: {
      stableApplicationIdentity: true,
      stableLogicalTenantKeys: true,
      environmentAliasesNormalized: true,
      workspaceBindingEvidenceOnly: true,
      automaticWorkspaceCreation: false,
      automaticTenantProvisioning: false,
      liveAuthorizationImplied: false,
      ql266Resumed: false
    }
  };
}

export function resolveSharedApplicationIdentity(input: string) {
  const token = normalizedToken(input);
  return (
    buildSharedApplicationIdentityMap().applications.find((app) =>
      app.aliases.includes(token)
    ) ?? null
  );
}
