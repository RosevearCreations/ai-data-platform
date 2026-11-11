import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { observeApiOperation } from "@/lib/performance-observatory-database";
import {
  listBuild374Yw561ActivationForUser,
  recordBuild374Yw561Activation
} from "@/lib/yw561-trusted-source-health-activation-owner-gate-database";

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
  return observeApiOperation(userId, "api.yw561-trusted-source-health-activation.get", async () => {
    try {
      return Response.json(await listBuild374Yw561ActivationForUser(userId), {
        headers: { "Cache-Control": "no-store" }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "build374_list_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  });
}

export async function POST() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });
  return observeApiOperation(userId, "api.yw561-trusted-source-health-activation.post", async () => {
    try {
      const result = await recordBuild374Yw561Activation(userId);
      return Response.json({ recorded: true, result }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "build374_record_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  });
}
