import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { observeApiOperation } from "@/lib/performance-observatory-database";
import { listBuild381ReceiverHealthContinuityForUser } from "@/lib/yw562-receiver-health-continuity-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }
  return observeApiOperation(
    session.user.id,
    "api.yw562-receiver-health-continuity.get",
    async () => {
      try {
        return Response.json(
          await listBuild381ReceiverHealthContinuityForUser(session.user.id),
          { headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "build381_list_failed";
        return Response.json(
          { error: message },
          { status: message.includes("admin_required") ? 403 : 500 }
        );
      }
    }
  );
}
