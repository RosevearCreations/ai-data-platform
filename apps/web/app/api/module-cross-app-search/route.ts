import { NextResponse } from "next/server";

import {
  CROSS_APP_SEARCH_REQUEST_SCHEMA,
  CROSS_APP_SEARCH_RESPONSE_SCHEMA,
  CROSS_APP_SEARCH_VERSION,
  crossAppSearchCapabilityDescriptor
} from "@/lib/cross-app-search-linked-records";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ...crossAppSearchCapabilityDescriptor(),
      requestSchema: CROSS_APP_SEARCH_REQUEST_SCHEMA,
      responseSchema: CROSS_APP_SEARCH_RESPONSE_SCHEMA,
      execution: {
        liveFederatedSearchAcceptedByThisDiscoveryRoute: false,
        serverSideAuthorizedAdaptersRequired: true,
        sourceRecordWritesAvailable: false
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-cross-app-search": CROSS_APP_SEARCH_VERSION
      }
    }
  );
}
