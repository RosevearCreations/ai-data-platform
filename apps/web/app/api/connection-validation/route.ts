import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  buildAutomaticConnectionValidation,
  runAutomaticConnectionTests
} from "@/lib/connection-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function userId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function GET() {
  const id = await userId();
  if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await buildAutomaticConnectionValidation(id), {
    headers: { "cache-control": "no-store" }
  });
}

export async function POST() {
  const id = await userId();
  if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    const batch = await runAutomaticConnectionTests(id);
    const validation = await buildAutomaticConnectionValidation(id);
    return Response.json({ batch, validation }, {
      headers: { "cache-control": "no-store" }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "automatic_connection_test_failed";
    const status = message === "workspace_admin_required" ? 403 : 400;
    return Response.json({ error: message }, { status });
  }
}
