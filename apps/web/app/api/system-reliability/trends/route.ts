import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { buildReliabilityTrendReviewForUser } from "@/lib/reliability-trend-review-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  return Response.json(
    await buildReliabilityTrendReviewForUser(session.user.id),
    { headers: { "cache-control": "no-store" } }
  );
}
