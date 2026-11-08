import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  confirmModuleStableVersion,
  decideModuleUpgrade,
  listModuleLifecycleForUser,
  prepareModuleRollback,
  prepareModuleUpgrade,
  recordModuleRollbackCompleted,
  recordModuleUpgradeOutcome,
  registerInstalledModuleHost
} from "@/lib/module-lifecycle-database";
import type {
  ModuleMigrationStep,
  ModuleUpgradePolicy,
  ModuleUpgradePrerequisites
} from "@/lib/module-lifecycle-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function userId() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  return session?.user.id ?? null;
}

function statusForError(message: string) {
  if (message.includes("workspace_admin_required")) return 403;
  if (message.includes("not_found")) return 404;
  if (
    message.includes("required") ||
    message.includes("mismatch") ||
    message.includes("state_invalid")
  ) {
    return 409;
  }
  if (
    message.includes("invalid") ||
    message.includes("duplicate") ||
    message.includes("dependency")
  ) {
    return 400;
  }
  return 409;
}

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
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
    await listModuleLifecycleForUser(id),
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
    const body = record(value);
    if (!body) {
      throw new Error("module_lifecycle_request_invalid");
    }

    const action = String(body.action ?? "");

    if (action === "register-installed") {
      return Response.json(
        await registerInstalledModuleHost(id, {
          enrollmentId: String(body.enrollmentId ?? ""),
          observedVersion: String(body.observedVersion ?? ""),
          installationEvidence: String(body.installationEvidence ?? ""),
          observedAt:
            typeof body.observedAt === "string"
              ? body.observedAt
              : null
        })
      );
    }

    if (action === "prepare-upgrade") {
      const prerequisites = record(body.prerequisites);
      const policy = record(body.policy);
      if (!prerequisites || !policy || !Array.isArray(body.migrations)) {
        throw new Error("module_lifecycle_upgrade_input_invalid");
      }

      return Response.json(
        await prepareModuleUpgrade(id, {
          moduleHostInstanceId: String(
            body.moduleHostInstanceId ?? ""
          ),
          targetVersion: String(body.targetVersion ?? ""),
          canary: body.canary === true,
          prerequisites: prerequisites as unknown as ModuleUpgradePrerequisites,
          policy: policy as unknown as ModuleUpgradePolicy,
          migrations: body.migrations as ModuleMigrationStep[]
        })
      );
    }

    if (action === "owner-decision") {
      const decision =
        body.decision === "approve"
          ? "approve"
          : body.decision === "reject"
            ? "reject"
            : null;
      if (!decision) {
        throw new Error("module_lifecycle_owner_decision_invalid");
      }
      return Response.json(
        await decideModuleUpgrade(id, {
          runId: String(body.runId ?? ""),
          decision,
          reason: String(body.reason ?? "")
        })
      );
    }

    if (action === "record-outcome") {
      const outcome =
        body.outcome === "applied"
          ? "applied"
          : body.outcome === "failed"
            ? "failed"
            : null;
      if (!outcome) {
        throw new Error("module_lifecycle_outcome_invalid");
      }
      return Response.json(
        await recordModuleUpgradeOutcome(id, {
          runId: String(body.runId ?? ""),
          outcome,
          evidence: String(body.evidence ?? "")
        })
      );
    }

    if (action === "prepare-rollback") {
      return Response.json(
        await prepareModuleRollback(id, {
          runId: String(body.runId ?? "")
        })
      );
    }

    if (action === "record-rollback") {
      return Response.json(
        await recordModuleRollbackCompleted(id, {
          runId: String(body.runId ?? ""),
          evidence: String(body.evidence ?? "")
        })
      );
    }

    if (action === "confirm-stable") {
      return Response.json(
        await confirmModuleStableVersion(id, {
          runId: String(body.runId ?? ""),
          evidence: String(body.evidence ?? "")
        })
      );
    }

    return Response.json(
      { error: "module_lifecycle_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "module_lifecycle_request_failed";
    return Response.json(
      { error: message },
      { status: statusForError(message) }
    );
  }
}
