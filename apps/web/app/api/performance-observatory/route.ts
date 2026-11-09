import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { listPerformanceObservatoryForUser } from "@/lib/performance-observatory-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

  return Response.json(
    await listPerformanceObservatoryForUser(session.user.id),
    { headers: { "Cache-Control": "no-store" } }
  );
}
