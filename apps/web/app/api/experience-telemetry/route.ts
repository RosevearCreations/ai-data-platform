import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listExperienceTelemetryForUser,
  recordExperienceTelemetry
} from "@/lib/experience-telemetry-database";
import type { ExperienceTelemetryEventInput } from "@/lib/experience-telemetry";
import { observeApiOperation } from "@/lib/performance-observatory-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

  return observeApiOperation(
    userId,
    "api.experience-telemetry.get",
    async () =>
      Response.json(await listExperienceTelemetryForUser(userId), {
        headers: { "Cache-Control": "no-store" }
      })
  );
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return new Response(null, { status: 204 });
  }

  return observeApiOperation(
    userId,
    "api.experience-telemetry.post",
    async () => {
      try {
        const body = (await request.json()) as {
          events?: ExperienceTelemetryEventInput[];
        };
        const result = await recordExperienceTelemetry(
          userId,
          Array.isArray(body.events) ? body.events : []
        );
        return Response.json(result, {
          headers: { "Cache-Control": "no-store" }
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "experience_telemetry_request_failed";
        return Response.json({ error: message }, { status: 400 });
      }
    }
  );
}
