import { NextResponse } from "next/server";

import {
  SHARED_COORDINATION_MODULE_VERSION,
  sharedCoordinationModuleDescriptor
} from "@/lib/shared-coordination-module";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ...sharedCoordinationModuleDescriptor(),
      usage: {
        hostAPIsArePreparationOnly: true,
        consentEvidenceRequiredForNotificationEligibility: true,
        scheduleConflictEvidenceIsLocalOnly: true,
        heldExchangePackagesRemainAuthoritative: true,
        commsHubRoutingRequiresSeparateAuthorization: true,
        outboundDeliveryAvailableFromDiscoveryRoute: false
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-shared-coordination-module":
          SHARED_COORDINATION_MODULE_VERSION
      }
    }
  );
}
