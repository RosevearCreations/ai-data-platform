import { recordIntegrationV1DeniedMethod } from "@/lib/integration-v1-gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

async function deny(request: Request) {
  const path = new URL(request.url).pathname;
  const dispatchAttempt = path === "/api/integration/v1/dispatch";
  const reason = dispatchAttempt
    ? "dispatch_denied"
    : request.method === "GET"
      ? "unknown_path_denied"
      : "write_denied";
  const status = dispatchAttempt ? 403 : reason === "write_denied" ? 405 : 404;
  await recordIntegrationV1DeniedMethod(request, reason, status).catch(() => undefined);
  return Response.json(
    {
      error:
        reason === "dispatch_denied"
          ? "integration_v1_dispatch_denied"
          : reason === "write_denied"
            ? "integration_v1_write_denied"
            : "integration_v1_path_denied"
    },
    { status, headers: noStore }
  );
}

export const GET = deny;
export const POST = deny;
export const PUT = deny;
export const PATCH = deny;
export const DELETE = deny;
