import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { buildProductionLearningReview } from "@/lib/production-learning-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  return Response.json(await buildProductionLearningReview(session.user.id));
}
