import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  capturePerformanceBaseline,
  listPerformanceBaselineForUser
} from "@/lib/performance-baseline-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function userId() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  return session?.user.id ?? null;
}

export async function GET() {
  const id = await userId();
  if (!id) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }
  return Response.json(
    await listPerformanceBaselineForUser(id),
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const id = await userId();
  if (!id) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

  try {
    const value = (await request.json()) as { action?: unknown };
    if (String(value.action ?? "") !== "capture-performance-baseline") {
      return Response.json(
        { error: "performance_baseline_action_invalid" },
        { status: 400 }
      );
    }
    return Response.json(await capturePerformanceBaseline(id));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "performance_baseline_request_failed";
    return Response.json(
      { error: message },
      {
        status: message.includes("owner_admin_required")
          ? 403
          : 409
      }
    );
  }
}
