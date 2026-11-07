import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listAutonomousOperationsForUser,
  refreshProductionLearningVI,
  runAutonomousOperationsCycle,
  updateAutonomousOwnerPolicy
} from "@/lib/autonomous-operations-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function userId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function GET() {
  const id = await userId();
  if (!id) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }
  return Response.json(await listAutonomousOperationsForUser(id), {
    headers: { "Cache-Control": "no-store" }
  });
}

export async function POST(request: Request) {
  const id = await userId();
  if (!id) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("autonomous_operations_request_invalid");
    }
    body = value as Record<string, unknown>;
  } catch {
    return Response.json(
      { error: "autonomous_operations_request_invalid" },
      { status: 400 }
    );
  }

  try {
    const action = String(body.action ?? "");
    if (action === "run-cycle") {
      return Response.json(await runAutonomousOperationsCycle(id));
    }
    if (action === "refresh-learning") {
      return Response.json(await refreshProductionLearningVI(id));
    }
    if (action === "update-policy") {
      return Response.json(
        await updateAutonomousOwnerPolicy(id, {
          enabled: body.enabled === true,
          killSwitchEngaged: body.killSwitchEngaged !== false,
          monitoringEnabled: body.monitoringEnabled !== false,
          recoveryScanEnabled: body.recoveryScanEnabled !== false,
          safeRecoveryEnabled: body.safeRecoveryEnabled === true,
          maxSafeRecoveriesPerCycle: Number(
            body.maxSafeRecoveriesPerCycle ?? 3
          ),
          maxCyclesPerHour: Number(body.maxCyclesPerHour ?? 4)
        })
      );
    }
    return Response.json(
      { error: "autonomous_operations_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "autonomous_operations_failed"
      },
      { status: 400 }
    );
  }
}
