import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { observeApiOperation } from "@/lib/performance-observatory-database";
import { listBuild380ExternalRuntimeActivationForUser } from "@/lib/yw562-external-runtime-activation-closure-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }

  return observeApiOperation(
    session.user.id,
    "api.yw562-runtime-activation-closure.get",
    async () => {
      try {
        return Response.json(
          await listBuild380ExternalRuntimeActivationForUser(session.user.id),
          { headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "build380_list_failed";
        const status =
          message.includes("admin_required") ? 403 : 500;
        return Response.json({ error: message }, { status });
      }
    }
  );
}
