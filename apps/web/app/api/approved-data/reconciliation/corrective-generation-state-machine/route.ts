import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { listCorrectiveGenerationStateMachineForUser } from "@/lib/corrective-generation-state-machine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  return Response.json(
    await listCorrectiveGenerationStateMachineForUser(session.user.id)
  );
}
