import { NextResponse } from "next/server";

import {
  MODULE_HOST_ADAPTER_PACK_SCHEMA,
  MODULE_HOST_ADAPTER_PACK_VERSION,
  MODULE_HOST_SCAFFOLD_SCHEMA,
  listModuleHostAdapters
} from "@/lib/module-host-adapter-pack";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      schema: "rosevear.ai-data-platform.host-adapter-catalog.v1",
      pack: {
        schema: MODULE_HOST_ADAPTER_PACK_SCHEMA,
        version: MODULE_HOST_ADAPTER_PACK_VERSION,
        scaffoldSchema: MODULE_HOST_SCAFFOLD_SCHEMA
      },
      adapters: listModuleHostAdapters(),
      generator: {
        credentialArgumentsAccepted: false,
        credentialsGenerated: false,
        credentialsEmbeddedInSource: false,
        moduleOriginComesFromRuntimeConfiguration: true
      },
      security: {
        adapterPresenceGrantsAuthorization: false,
        scaffoldGenerationActivatesConnection: false,
        hostContextRequiresIndependentValidation: true,
        ql266ResumedByAdapterPack: false
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-host-adapter-pack": MODULE_HOST_ADAPTER_PACK_VERSION
      }
    }
  );
}
