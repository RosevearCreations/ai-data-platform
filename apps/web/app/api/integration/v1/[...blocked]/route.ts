import { recordIntegrationV1DeniedMethod } from "@/lib/integration-v1-gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

async function deny(request: Request) {
  const reason = request.method === "GET" ? "unknown_path_denied" : "write_denied";
  await recordIntegrationV1DeniedMethod(request, reason).catch(() => undefined);
  return Response.json(
    { error: reason === "write_denied" ? "integration_v1_write_denied" : "integration_v1_path_denied" },
    { status: reason === "write_denied" ? 405 : 404, headers: noStore }
  );
}

export const GET = deny;
export const POST = deny;
export const PUT = deny;
export const PATCH = deny;
export const DELETE = deny;
