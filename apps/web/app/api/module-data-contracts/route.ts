import { NextResponse } from "next/server";

import {
  buildReadOnlyHostSchemaDiscoveryCatalog,
  DATA_CONTRACT_RESOLUTION_SCHEMA,
  HOST_SCHEMA_DESCRIPTOR_SCHEMA,
  UNIVERSAL_DATA_CONTRACT_RESOLVER_VERSION
} from "@/lib/universal-data-contract-resolver";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = buildReadOnlyHostSchemaDiscoveryCatalog();

  return NextResponse.json(
    {
      ...catalog,
      descriptorSchema: HOST_SCHEMA_DESCRIPTOR_SCHEMA,
      resolutionSchema: DATA_CONTRACT_RESOLUTION_SCHEMA,
      resolver: {
        compatibilityResolution: true,
        mappingProfileSuggestions: true,
        requiredFieldDiagnostics: true,
        sourceVersionFingerprintEvidence: true,
        canonicalFingerprintEvidence: true,
        driftDetectionIntegration: true
      },
      security: {
        rawRecordContentsAcceptedForDiscovery: false,
        schemaDiscoveryGrantsAuthorization: false,
        compatibilityAuthorizesExchange: false,
        mappingSuggestionsAutoApproved: false,
        connectionActivatedByDiscovery: false,
        ql266ResumedBySchemaDiscovery: false
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-data-contract-resolver":
          UNIVERSAL_DATA_CONTRACT_RESOLVER_VERSION
      }
    }
  );
}
