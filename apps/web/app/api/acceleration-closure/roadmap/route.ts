import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { approveBuild414Roadmap } from "@/lib/build414-closure-database";

const ROADMAP_415_424 = `Builds 415-424: evidence freshness; supervised service continuity; communications SLA; recovery exercises; cross-app performance budgets; accessibility recertification; tenant isolation renewal; data lifecycle assurance; operator acceptance; next-cycle closure.`;

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({error:"unauthorized"},{status:401});
  try {
    const approval = await approveBuild414Roadmap(session.user.id, ROADMAP_415_424);
    return NextResponse.json({approval},{status:201});
  } catch (error) {
    const message = error instanceof Error ? error.message : "build414_roadmap_approval_failed";
    return NextResponse.json({error:message},{
      status: message === "build414_owner_required" ? 403 : 400
    });
  }
}
