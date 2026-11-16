import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { requestServerModuleControl } from "@/lib/server-module-control-database";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const body =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  try {
    const result = await requestServerModuleControl(session.user.id, {
      moduleId: typeof body.moduleId === "string" ? body.moduleId : "",
      action: typeof body.action === "string" ? body.action : "",
      reason: typeof body.reason === "string" ? body.reason : "",
      independentCustodianReceiptId:
        typeof body.independentCustodianReceiptId === "string" &&
        body.independentCustodianReceiptId.trim()
          ? body.independentCustodianReceiptId.trim()
          : null
    });
    return NextResponse.json({ control: result }, { status: 202 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "server_module_control_failed";
    const status =
      message === "master_sysop_owner_required" ||
      message.includes("owner_required") ||
      message.includes("custodian") ||
      message.includes("administrative_separation")
        ? 403
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
