import { UNIVERSAL_MODULE_MANIFEST } from "@/lib/universal-module-contract";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(UNIVERSAL_MODULE_MANIFEST, {
    headers: {
      "cache-control": "no-store",
      "x-rosevear-module-protocol": String(
        UNIVERSAL_MODULE_MANIFEST.protocol.version
      )
    }
  });
}
