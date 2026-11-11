import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { observeApiOperation } from "@/lib/performance-observatory-database";
import {
  listBuild368RuntimeRecheckForUser,
  recordBuild368RuntimeAndSourceRecheck
} from "@/lib/master-runtime-source-refresh-database";

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
  return observeApiOperation(userId, "api.master-runtime-source-refresh.get", async () => {
    try {
      return Response.json(await listBuild368RuntimeRecheckForUser(userId), {
        headers: { "Cache-Control": "no-store" }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "build368_list_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  });
}

export async function POST() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });
  return observeApiOperation(userId, "api.master-runtime-source-refresh.post", async () => {
    try {
      const result = await recordBuild368RuntimeAndSourceRecheck(userId);
      return Response.json({ recorded: true, result }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "build368_recheck_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  });
}
