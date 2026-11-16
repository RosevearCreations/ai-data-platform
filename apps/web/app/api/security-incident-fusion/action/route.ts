import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { requestBuild412SupervisedAction } from "@/lib/security-incident-fusion-database";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const body = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};

  try {
    const result = await requestBuild412SupervisedAction(session.user.id, {
      appId: typeof body.appId === "string" ? body.appId : "",
      action: typeof body.action === "string" ? body.action : "",
      reason: typeof body.reason === "string" ? body.reason : "",
      incidentCorrelationId:
        typeof body.incidentCorrelationId === "string" ? body.incidentCorrelationId : "",
      independentCustodianReceiptId:
        typeof body.independentCustodianReceiptId === "string"
          ? body.independentCustodianReceiptId : ""
    });
    return NextResponse.json({ remediation: result }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "incident_action_failed";
    const status =
      message.includes("owner_required") ||
      message.includes("custodian") ||
      message.includes("administrative_separation")
        ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
