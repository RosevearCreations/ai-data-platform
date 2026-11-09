import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listCommsComplementaryPlaneForUser
} from "@/lib/comms-complementary-plane-database";
import { observeApiOperation } from "@/lib/performance-observatory-database";

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

  return observeApiOperation(
    session.user.id,
    "api.comms-complementary-plane.get",
    async () =>
      Response.json(
        await listCommsComplementaryPlaneForUser(
          session.user.id
        ),
        { headers: { "Cache-Control": "no-store" } }
      )
  );
}
