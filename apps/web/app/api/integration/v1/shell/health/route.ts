/** QL-364: source-owned shell health; not the legacy integration credential. */
import { handleQl364SourceHealth } from "@/lib/ql364-source-health.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleQl364SourceHealth({
    request,
    sourceId: "ai-data-platform",
    repository: "ai-data-platform",
  });
}
export const POST = GET;
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
