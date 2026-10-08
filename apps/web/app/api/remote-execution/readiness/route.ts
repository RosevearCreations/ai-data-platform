import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { browserlessPilotReadiness } from "@/lib/browserless-provider";
import { remoteExecutionReadiness } from "@/lib/remote-execution";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    foundation: remoteExecutionReadiness(),
    controlledPilot: browserlessPilotReadiness()
  });
}
