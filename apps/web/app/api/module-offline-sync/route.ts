import { NextResponse } from "next/server";

import {
  OFFLINE_SYNC_QUEUE_VERSION,
  offlineSynchronizationDescriptor
} from "@/lib/offline-sync-queue";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ...offlineSynchronizationDescriptor(),
      usage: {
        queueIsHostLocal: true,
        persistenceAdapterRequiredForDurability: true,
        encryptedAtRestRequestedWhenSupported: true,
        rawPayloadBodiesAcceptedByQueue: false,
        reconnectOnlyMarksWorkReady: true,
        transportSelectionStillRequired: true,
        independentAuthorizationStillRequired: true,
        remoteReceiptRequiredForConfirmedSuccess: true,
        ambiguousRemoteOutcomeRequiresManualReview: true
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-offline-sync-module":
          OFFLINE_SYNC_QUEUE_VERSION
      }
    }
  );
}
