import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { buildSharedApplicationIdentityMap } from "@/lib/application-identity-mapping";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  return Response.json(buildSharedApplicationIdentityMap(), {
    headers: { "cache-control": "no-store" }
  });
}
