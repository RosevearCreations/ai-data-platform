import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { buildProviderPilotBaselineForUser } from "@/lib/provider-pilot-baseline-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  return Response.json(await buildProviderPilotBaselineForUser(session.user.id), {
    headers: { "cache-control": "no-store" }
  });
}
