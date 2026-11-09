import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listCrossApplicationInteractionTraceForUser
} from "@/lib/cross-application-interaction-trace-database";
import { observeApiOperation } from "@/lib/performance-observatory-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }

  return observeApiOperation(
    session.user.id,
    "api.cross-application-interaction-trace.get",
    async () =>
      Response.json(
        await listCrossApplicationInteractionTraceForUser(session.user.id),
        { headers: { "Cache-Control": "no-store" } }
      )
  );
}
