import {
  authenticateIntegrationV1Get,
  getOrCreateIntegrationV1ReadReceipt,
  INTEGRATION_V1_PATHS,
  recordIntegrationV1DeniedMethod
} from "@/lib/integration-v1-gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

async function denyMethod(request: Request) {
  await recordIntegrationV1DeniedMethod(request).catch(() => undefined);
  return Response.json({ error: "integration_v1_write_denied" }, { status: 405, headers: noStore });
}

export const POST = denyMethod;
export const PUT = denyMethod;
export const PATCH = denyMethod;
export const DELETE = denyMethod;


export async function GET(request: Request) {
  const auth = await authenticateIntegrationV1Get(request, INTEGRATION_V1_PATHS.capabilities);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status, headers: noStore });
  }
  try {
    const envelope = await getOrCreateIntegrationV1ReadReceipt(auth.value, "capabilities");
    return Response.json(envelope, { headers: noStore });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "integration_v1_capabilities_failed" },
      { status: 503, headers: noStore }
    );
  }
}
