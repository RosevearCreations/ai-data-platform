import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { buildAdoptionReview } from "@/lib/adoption-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const review = await buildAdoptionReview(session.user.id);
  return Response.json(review, {
    headers: { "cache-control": "no-store" }
  });
}
