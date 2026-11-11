import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { observeApiOperation } from "@/lib/performance-observatory-database";
import {
  listBuild370DecisionForUser,
  recordBuild370CurrentObservationAndRecheck
} from "@/lib/manifest-custody-receipt-decision-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function statusFor(message: string) {
  if (message.includes("owner_required") || message.includes("admin_required")) return 403;
  return 500;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });

  return observeApiOperation(userId, "api.manifest-custody-receipt-decision.get", async () => {
    try {
      return Response.json(await listBuild370DecisionForUser(userId), {
        headers: { "Cache-Control": "no-store" }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "build370_list_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  });
}

export async function POST() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });

  return observeApiOperation(userId, "api.manifest-custody-receipt-decision.post", async () => {
    try {
      const result = await recordBuild370CurrentObservationAndRecheck(userId);
      return Response.json({ recorded: true, result }, { status: 201 });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "build370_recheck_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  });
}
