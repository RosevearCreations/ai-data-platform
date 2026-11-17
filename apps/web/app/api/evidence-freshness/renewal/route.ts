import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { requestBuild415EvidenceRenewal } from "@/lib/build415-evidence-freshness-database";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({error:"unauthorized"},{status:401});

  const raw = await request.json().catch(()=>null);
  const body = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string,unknown> : {};

  try {
    const renewal = await requestBuild415EvidenceRenewal({
      userId:session.user.id,
      appId:typeof body.appId === "string" ? body.appId : "",
      evidenceDomain:typeof body.evidenceDomain === "string" ? body.evidenceDomain : "",
      reason:typeof body.reason === "string" ? body.reason : ""
    });
    return NextResponse.json({renewal},{status:202});
  } catch (error) {
    const message = error instanceof Error ? error.message : "build415_renewal_failed";
    return NextResponse.json({error:message},{
      status:message === "build415_sysop_required" ? 403 : 400
    });
  }
}
