import { NextResponse } from "next/server";

import { buildConnectorDriverRegistry } from "@/lib/connector-driver-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const registry = buildConnectorDriverRegistry();
  return NextResponse.json(
    {
      ...registry,
      usage: {
        discoveryOnly: true,
        workspaceInstallStateAvailableFromAuthenticatedConnectorsApi: true,
        packagePresenceActivatesConnection: false,
        installedEnabledStateProvesLiveConnection: false,
        healthContractsAreDeclarativeOnly: true,
        authRequirementsAreReferenceOnly: true,
        signedProvenanceVerifiedByDiscoveryRoute: false
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-connector-driver-registry": registry.version
      }
    }
  );
}
