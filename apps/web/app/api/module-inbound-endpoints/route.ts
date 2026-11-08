import { NextResponse } from "next/server";

import {
  INBOUND_ENDPOINT_MODULE_VERSION,
  inboundEndpointModuleDescriptor
} from "@/lib/inbound-endpoint-module";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ...inboundEndpointModuleDescriptor(),
      operatorSurface: "/webhook-gateway",
      managementSurface: "/api/module-inbound-endpoints/manage",
      publicIntakeTemplate: "/api/webhooks/{endpointKey}",
      usage: {
        build290IntakeRemainsAuthoritative: true,
        managementRequiresAuthenticatedWorkspaceAuthority: true,
        secretsRemainReferenceOnly: true,
        receiptSearchIsWorkspaceScoped: true,
        callbackRoutesAreHeldMetadataOnly: true,
        hostEventTranslationDoesNotDispatch: true,
        revokedEndpointsRequireNewRegistration: true
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-inbound-endpoint-module":
          INBOUND_ENDPOINT_MODULE_VERSION
      }
    }
  );
}
