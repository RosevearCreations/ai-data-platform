import { NextResponse } from "next/server";

import {
  MEDIA_HOST_BRIDGE_VERSION,
  mediaHostBridgeDescriptor
} from "@/lib/media-host-bridge";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ...mediaHostBridgeDescriptor(),
      operatorSurface: "/media-asset-exchange",
      usage: {
        sourceBuild296RemainsAuthoritative: true,
        previewReferencesDoNotFetchContent: true,
        uploadDownloadHandoffsDoNotTransferBytes: true,
        exactBinaryTransferGrantRequired: true,
        sensitiveBinaryRequiresExplicitGrant: true,
        deletionEvidenceRequiresSourceReceipt: true,
        directBinaryTransferAvailableFromDiscoveryRoute: false
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-media-host-bridge":
          MEDIA_HOST_BRIDGE_VERSION
      }
    }
  );
}
