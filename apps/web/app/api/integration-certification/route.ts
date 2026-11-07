import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listIntegrationCertificationForUser,
  runIntegrationCertification
} from "@/lib/integration-certification-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }
  return Response.json(
    await listIntegrationCertificationForUser(session.user.id),
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }
  try {
    return Response.json(await runIntegrationCertification(session.user.id));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "integration_certification_failed"
      },
      { status: 400 }
    );
  }
}
