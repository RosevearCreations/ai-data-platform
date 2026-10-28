import {
  authenticateIntegrationV1Get,
  INTEGRATION_V1_PATHS,
  loadIntegrationV1GatewayAuditEnvelope,
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


export async function GET(
  request: Request,
  context: { params: Promise<{ receiptId: string }> }
) {
  const { receiptId } = await context.params;
  const path = INTEGRATION_V1_PATHS.auditPrefix + receiptId;
  const auth = await authenticateIntegrationV1Get(request, path);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status, headers: noStore });
  }
  const envelope = await loadIntegrationV1GatewayAuditEnvelope(auth.value, receiptId);
  if (!envelope) {
    return Response.json(
      { error: "integration_v1_gateway_audit_not_prepared" },
      { status: 404, headers: noStore }
    );
  }
  return Response.json(envelope, { headers: noStore });
}
