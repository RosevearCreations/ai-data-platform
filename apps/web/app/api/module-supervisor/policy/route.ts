import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  authorizeModuleSupervisorHostCycle,
  listModuleSupervisorPoliciesForUser,
  readModuleSupervisorPolicyControlState,
  updateModuleSupervisorGlobalStop,
  upsertModuleSupervisorHostPolicy
} from "@/lib/module-supervisor-host-policy-database";
import type { ModuleSupervisorHostScope } from "@/lib/autonomous-module-supervisor";
import type {
  ModuleSupervisorHostPolicyInput,
  ModuleSupervisorMaintenanceWindow
} from "@/lib/module-supervisor-host-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function userId() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  return session?.user.id ?? null;
}

function hostFromBody(
  body: Record<string, unknown>
): ModuleSupervisorHostScope {
  return {
    hostApplicationId: String(body.hostApplicationId ?? ""),
    hostInstanceId: String(body.hostInstanceId ?? ""),
    environment: String(
      body.environment ?? ""
    ) as ModuleSupervisorHostScope["environment"],
    workspaceId: String(body.workspaceId ?? ""),
    tenantId: String(body.tenantId ?? "")
  };
}

function maintenanceFromBody(
  value: unknown
): ModuleSupervisorMaintenanceWindow | null {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("module_supervisor_maintenance_window_invalid");
  }
  const object = value as Record<string, unknown>;
  return {
    daysOfWeekUtc: Array.isArray(object.daysOfWeekUtc)
      ? object.daysOfWeekUtc.map(Number)
      : [],
    startMinuteUtc: Number(object.startMinuteUtc ?? 0),
    endMinuteUtc: Number(object.endMinuteUtc ?? 0)
  };
}

function policyFromBody(
  body: Record<string, unknown>
): ModuleSupervisorHostPolicyInput {
  return {
    enabled: body.enabled === true,
    killSwitchEngaged: body.killSwitchEngaged !== false,
    safeActions: Array.isArray(body.safeActions)
      ? body.safeActions
          .map(String)
          .filter(
            (value): value is "connector-health-retry" =>
              value === "connector-health-retry"
          )
      : [],
    maxCyclesPerHour: Number(body.maxCyclesPerHour ?? 1),
    maxSafeHealthActionsPerCycle: Number(
      body.maxSafeHealthActionsPerCycle ?? 0
    ),
    maxSafeHealthActionsPerHour: Number(
      body.maxSafeHealthActionsPerHour ?? 0
    ),
    maxSafeHealthActionsPerDay: Number(
      body.maxSafeHealthActionsPerDay ?? 0
    ),
    maintenanceWindow: maintenanceFromBody(
      body.maintenanceWindow
    )
  };
}

function statusForError(message: string) {
  if (
    message.includes("owner_admin_required") ||
    message.includes("workspace_admin_required")
  ) {
    return 403;
  }
  if (message.includes("not_found")) return 404;
  if (
    message.includes("invalid") ||
    message.includes("not_authorized")
  ) {
    return 400;
  }
  return 409;
}

export async function GET() {
  const id = await userId();
  if (!id) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }
  return Response.json(
    await listModuleSupervisorPoliciesForUser(id),
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const id = await userId();
  if (!id) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(
        "module_supervisor_policy_request_invalid"
      );
    }
    const body = value as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "set-global-stop") {
      return Response.json(
        await updateModuleSupervisorGlobalStop(id, {
          emergencyStopEngaged:
            body.emergencyStopEngaged !== false,
          reason:
            body.reason === null || body.reason === undefined
              ? null
              : String(body.reason)
        })
      );
    }

    if (action === "upsert-host-policy") {
      return Response.json(
        await upsertModuleSupervisorHostPolicy(id, {
          host: hostFromBody(body),
          policy: policyFromBody(body)
        })
      );
    }

    if (action === "authorize-cycle") {
      return Response.json(
        await authorizeModuleSupervisorHostCycle(id, {
          host: hostFromBody(body),
          requestSafeHealth: body.requestSafeHealth === true
        })
      );
    }

    if (action === "control-state") {
      return Response.json(
        await readModuleSupervisorPolicyControlState(id, {
          host: hostFromBody(body)
        })
      );
    }

    return Response.json(
      { error: "module_supervisor_policy_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "module_supervisor_policy_request_failed";
    return Response.json(
      { error: message },
      { status: statusForError(message) }
    );
  }
}
