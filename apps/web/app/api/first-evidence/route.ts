import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { buildFirstEvidenceReviewForUser } from "@/lib/first-evidence-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const review = await buildFirstEvidenceReviewForUser(session.user.id);
  return Response.json(review, {
    headers: { "cache-control": "no-store" }
  });
}
