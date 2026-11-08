import { NextResponse } from "next/server";

import {
  EVENT_BUS_HOST_BRIDGE_VERSION,
  eventBusHostBridgeDescriptor
} from "@/lib/event-bus-host-bridge";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ...eventBusHostBridgeDescriptor(),
      operatorSurface: "/event-bus",
      existingEventBusBuild: 291,
      existingDeliveryGuaranteesBuild: 293,
      usage: {
        publicationAdapterProducesHeldIntent: true,
        subscriptionRegistrationProducesDraft: true,
        existingGovernedServerFlowsRemainAuthoritative: true
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-event-bus-host-bridge":
          EVENT_BUS_HOST_BRIDGE_VERSION
      }
    }
  );
}
