import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { requestBuild414CommsPilot } from "@/lib/build414-closure-database";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({error:"unauthorized"},{status:401});

  const raw = await request.json().catch(() => null);
  const body = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string,unknown> : {};
  try {
    const result = await requestBuild414CommsPilot(
      session.user.id,
      typeof body.reason === "string" ? body.reason : ""
    );
    return NextResponse.json({request:result},{status:202});
  } catch (error) {
    const message = error instanceof Error ? error.message : "build414_pilot_request_failed";
    return NextResponse.json({error:message},{
      status: message === "build414_owner_required" ? 403 : 400
    });
  }
}
