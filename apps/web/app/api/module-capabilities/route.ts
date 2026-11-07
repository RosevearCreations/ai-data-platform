import { NextResponse } from "next/server";

import {
  CAPABILITY_DISCOVERY_SCHEMA,
  CAPABILITY_GRANT_SCHEMA,
  CAPABILITY_NEGOTIATION_SCHEMA,
  CAPABILITY_NEGOTIATION_VERSION,
  CapabilityNegotiator,
  createExactCapabilityGrantStore,
  createLiveModuleCapabilityRegistry
} from "@/lib/capability-negotiation-permission-projection";

export const dynamic = "force-dynamic";

export async function GET() {
  const negotiator = new CapabilityNegotiator({
    registry: createLiveModuleCapabilityRegistry(),
    grantStore: createExactCapabilityGrantStore([])
  });

  return NextResponse.json(
    {
      schema: "rosevear.ai-data-platform.capability-catalog.v1",
      version: CAPABILITY_NEGOTIATION_VERSION,
      discoverySchema: CAPABILITY_DISCOVERY_SCHEMA,
      negotiationSchema: CAPABILITY_NEGOTIATION_SCHEMA,
      grantSchema: CAPABILITY_GRANT_SCHEMA,
      capabilities: await negotiator.discover(),
      classification: {
        supported: ["read", "write", "action"],
        liveAdvertisedCapabilitiesAreRegistryAuthoritative: true
      },
      grantPolicy: {
        ownerControlled: true,
        exactHostUserTenantWorkspaceScope: true,
        expiryRequired: true,
        reviewDateRequired: true,
        expiredGrantCallable: false,
        reviewDueGrantCallable: false,
        revokedGrantCallable: false,
        deniedGrantCallable: false,
        ambiguousGrantCallable: false
      },
      security: {
        discoveryGrantsAuthorization: false,
        hostRequestGrantsAuthorization: false,
        unrequestedCapabilityGranted: false,
        tenantResolutionGrantsCapability: false,
        ql266ResumedByCapabilityNegotiation: false
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-capability-negotiation":
          CAPABILITY_NEGOTIATION_VERSION
      }
    }
  );
}
