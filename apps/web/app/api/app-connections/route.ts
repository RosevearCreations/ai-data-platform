import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { buildAppConnectionRegistry } from "@/lib/app-connection-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  return Response.json(buildAppConnectionRegistry(), {
    headers: { "cache-control": "no-store" }
  });
}
