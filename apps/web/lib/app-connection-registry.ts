import {
  INTEGRATION_V1_BUSINESS_CAPABILITIES,
  INTEGRATION_V1_CONTRACT,
  INTEGRATION_V1_STATUS
} from "./integration-v1-gateway";

export type PeerApplicationId =
  | "devilndove"
  | "rosiedazzlers"
  | "yard-workers"
  | "icamp"
  | "rosevear-comms-hub"
  | "rosevear-ai-hub";

type GatewayBusinessId = keyof typeof INTEGRATION_V1_BUSINESS_CAPABILITIES;

export type AppConnectionDiscoveryState =
  | "gateway-read-only-ready"
  | "catalog-only";

export type PeerApplicationDefinition = {
  id: PeerApplicationId;
  displayName: string;
  repository: string;
  category:
    | "commerce"
    | "field-service"
    | "campground"
    | "communications"
    | "local-operations";
  gatewayBusinessId: GatewayBusinessId | null;
  description: string;
};

export type AppConnectionRegistryItem = PeerApplicationDefinition & {
  contract: typeof INTEGRATION_V1_CONTRACT;
  connectionState: typeof INTEGRATION_V1_STATUS;
  ownerAuthorization: "NOT_GIVEN";
  discoveryState: AppConnectionDiscoveryState;
  discoveryCapabilities: string[];
  discoverySurfaces: Array<{
    key: "repository" | "gateway-health" | "gateway-capabilities";
    label: string;
    mode: "metadata" | "read-only";
    enabled: boolean;
  }>;
  automaticActivationAllowed: false;
  mutatingCapabilityDiscovered: false;
};

export type AppConnectionRegistry = {
  schema: "ai-data-platform.app-connection-registry.v1";
  build: 281;
  generatedAt: string;
  peerApplications: AppConnectionRegistryItem[];
  summary: {
    applications: number;
    gatewayReadOnlyReady: number;
    catalogOnly: number;
    disconnected: number;
    mutatingCapabilitiesDiscovered: number;
  };
  policy: {
    authoritativeRegistry: true;
    discoveryIsReadOnly: true;
    liveConnectionImplied: false;
    ql266Resumed: false;
    automaticActivation: false;
  };
};

export const PEER_APPLICATION_DEFINITIONS: readonly PeerApplicationDefinition[] =
  Object.freeze([
    {
      id: "devilndove",
      displayName: "Devil n Dove",
      repository: "RosevearCreations/devilndove-site",
      category: "commerce",
      gatewayBusinessId: "devilndove",
      description:
        "Commerce, maker inventory, product publishing and marketplace workflows."
    },
    {
      id: "rosiedazzlers",
      displayName: "Rosie Dazzlers",
      repository: "RosevearCreations/rosiedazzlers",
      category: "field-service",
      gatewayBusinessId: "rosiedazzlers",
      description:
        "Mobile detailing customers, bookings, jobs, evidence and service operations."
    },
    {
      id: "yard-workers",
      displayName: "Yard Workers",
      repository: "RosevearCreations/yw",
      category: "field-service",
      gatewayBusinessId: "yw",
      description:
        "Property maintenance, routing, seasonal operations, jobs and equipment."
    },
    {
      id: "icamp",
      displayName: "iCamp",
      repository: "RosevearCreations/iCamp",
      category: "campground",
      gatewayBusinessId: "icamp",
      description:
        "Campground reservations, guest operations, sites, rentals and front desk."
    },
    {
      id: "rosevear-comms-hub",
      displayName: "Rosevear Comms Hub",
      repository: "RosevearCreations/rosevear-comms-hub",
      category: "communications",
      gatewayBusinessId: null,
      description:
        "Operator communications, follow-up, routing and consent-safe handoff workflows."
    },
    {
      id: "rosevear-ai-hub",
      displayName: "Rosevear AI Hub",
      repository: "RosevearCreations/rosevear-ai-hub",
      category: "local-operations",
      gatewayBusinessId: "rosevear-ai-hub",
      description:
        "Local Windows hub, device operations, recovery, diagnostics and local AI services."
    }
  ]);

function itemFromDefinition(
  definition: PeerApplicationDefinition
): AppConnectionRegistryItem {
  const gatewayCapabilities = definition.gatewayBusinessId
    ? [...INTEGRATION_V1_BUSINESS_CAPABILITIES[definition.gatewayBusinessId]]
    : [];

  const discoveryCapabilities = [
    "repository_metadata",
    ...gatewayCapabilities
  ];

  return {
    ...definition,
    contract: INTEGRATION_V1_CONTRACT,
    connectionState: INTEGRATION_V1_STATUS,
    ownerAuthorization: "NOT_GIVEN",
    discoveryState: definition.gatewayBusinessId
      ? "gateway-read-only-ready"
      : "catalog-only",
    discoveryCapabilities,
    discoverySurfaces: [
      {
        key: "repository",
        label: "Repository metadata",
        mode: "metadata",
        enabled: true
      },
      {
        key: "gateway-health",
        label: "Integration v1 health discovery",
        mode: "read-only",
        enabled: gatewayCapabilities.includes("read_health")
      },
      {
        key: "gateway-capabilities",
        label: "Integration v1 capability discovery",
        mode: "read-only",
        enabled: gatewayCapabilities.includes("read_capabilities")
      }
    ],
    automaticActivationAllowed: false,
    mutatingCapabilityDiscovered: false
  };
}

export function buildAppConnectionRegistry(
  generatedAt = new Date().toISOString()
): AppConnectionRegistry {
  const peerApplications = PEER_APPLICATION_DEFINITIONS.map(itemFromDefinition);

  const ids = new Set(peerApplications.map((item) => item.id));
  const repositories = new Set(peerApplications.map((item) => item.repository));
  if (ids.size !== peerApplications.length) {
    throw new Error("app_connection_registry_duplicate_id");
  }
  if (repositories.size !== peerApplications.length) {
    throw new Error("app_connection_registry_duplicate_repository");
  }

  return {
    schema: "ai-data-platform.app-connection-registry.v1",
    build: 281,
    generatedAt,
    peerApplications,
    summary: {
      applications: peerApplications.length,
      gatewayReadOnlyReady: peerApplications.filter(
        (item) => item.discoveryState === "gateway-read-only-ready"
      ).length,
      catalogOnly: peerApplications.filter(
        (item) => item.discoveryState === "catalog-only"
      ).length,
      disconnected: peerApplications.filter(
        (item) => item.connectionState === "DISCONNECTED"
      ).length,
      mutatingCapabilitiesDiscovered: peerApplications.filter(
        (item) => item.mutatingCapabilityDiscovered
      ).length
    },
    policy: {
      authoritativeRegistry: true,
      discoveryIsReadOnly: true,
      liveConnectionImplied: false,
      ql266Resumed: false,
      automaticActivation: false
    }
  };
}

export function getPeerApplication(id: PeerApplicationId) {
  return buildAppConnectionRegistry().peerApplications.find(
    (item) => item.id === id
  ) ?? null;
}
