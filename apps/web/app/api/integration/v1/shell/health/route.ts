/** QL-364: source-owned shell health; not the legacy integration credential. */
import { QL365D_AI_DATA_PLATFORM_SOURCE_ADAPTERS } from "@/lib/ql365d-comms-source-runtime";
import { handleQl364SourceHealth } from "@/lib/ql364-source-health.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleQl364SourceHealth({
    request,
    sourceId: "ai-data-platform",
    repository: "ai-data-platform",
    ...QL365D_AI_DATA_PLATFORM_SOURCE_ADAPTERS
  });
}
export const POST = GET;
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
