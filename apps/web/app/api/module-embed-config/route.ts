import { NextResponse } from "next/server";

import {
  EMBEDDED_HOST_MESSAGE_TYPES,
  EMBEDDED_MODULE_ELEMENT_TAG,
  EMBEDDED_MODULE_MESSAGE_TYPES,
  EMBEDDED_MODULE_REFERRER_POLICY,
  EMBEDDED_MODULE_RUNTIME_SCHEMA,
  EMBEDDED_MODULE_RUNTIME_VERSION,
  EMBEDDED_MODULE_SANDBOX
} from "@/lib/embedded-module-runtime";
import { MODULE_SURFACES } from "@/lib/universal-module-contract";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      schema: "rosevear.ai-data-platform.module-embed-config.v1",
      runtime: {
        schema: EMBEDDED_MODULE_RUNTIME_SCHEMA,
        version: EMBEDDED_MODULE_RUNTIME_VERSION,
        customElementTag: EMBEDDED_MODULE_ELEMENT_TAG
      },
      surfaces: MODULE_SURFACES.map((surface) => ({
        id: surface.id,
        route: surface.route,
        mutating: surface.mutating
      })),
      messaging: {
        hostToModule: EMBEDDED_HOST_MESSAGE_TYPES,
        moduleToHost: EMBEDDED_MODULE_MESSAGE_TYPES,
        exactOriginRequired: true,
        wildcardOriginAllowed: false,
        arbitraryPayloadAllowed: false
      },
      iframe: {
        sandbox: EMBEDDED_MODULE_SANDBOX,
        referrerPolicy: EMBEDDED_MODULE_REFERRER_POLICY,
        frameAncestorDefault: "self-only",
        externalFrameAncestorsConfigured: Boolean(
          process.env.AI_DATA_EMBED_ALLOWED_HOST_ORIGINS?.trim()
        )
      },
      security: {
        mountGrantsAuthorization: false,
        rawHostSecretsAccepted: false,
        hostCredentialsInherited: false,
        ql266ResumedByMount: false
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-embed-runtime": EMBEDDED_MODULE_RUNTIME_VERSION
      }
    }
  );
}
