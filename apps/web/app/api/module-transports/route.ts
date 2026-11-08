import { NextResponse } from "next/server";

import {
  SECURE_TRANSPORT_VERSION,
  secureTransportDescriptor
} from "@/lib/secure-transport-selection";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ...secureTransportDescriptor(),
      usage: {
        runtimeRegistrationIsHostSupplied: true,
        noTransportIsAutoRegistered: true,
        noTransportIsAutoSelectedWithoutHealthEvidence: true,
        noNetworkRequestRunsDuringDiscovery: true,
        connectionAuthorityRemainsIndependent: true,
        futureTransportKindsRequireExplicitCodeApproval: true
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-secure-transport-module":
          SECURE_TRANSPORT_VERSION
      }
    }
  );
}
