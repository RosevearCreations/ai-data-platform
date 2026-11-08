import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  decideModuleHostEnrollment,
  generateModuleHostEnrollmentPackage,
  listModuleHostEnrollmentsForUser,
  prepareModuleHostEnrollment
} from "@/lib/module-host-installer-database";

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
    message.includes("approval_required") ||
    message.includes("pass_required") ||
    message.includes("hash_mismatch")
  ) {
    return 409;
  }
  if (
    message.includes("invalid") ||
    message.includes("forbidden") ||
    message.includes("unknown_field")
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
    await listModuleHostEnrollmentsForUser(id),
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
      throw new Error("module_installer_request_invalid");
    }
    const body = value as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "prepare-enrollment") {
      return Response.json(
        await prepareModuleHostEnrollment(id, {
          manifest: body.manifest
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
        throw new Error(
          "module_installer_owner_decision_invalid"
        );
      }
      return Response.json(
        await decideModuleHostEnrollment(id, {
          enrollmentId: String(body.enrollmentId ?? ""),
          decision,
          reason: String(body.reason ?? "")
        })
      );
    }

    if (action === "generate-package") {
      return Response.json(
        await generateModuleHostEnrollmentPackage(id, {
          enrollmentId: String(body.enrollmentId ?? "")
        })
      );
    }

    return Response.json(
      { error: "module_installer_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "module_installer_request_failed";
    return Response.json(
      { error: message },
      { status: statusForError(message) }
    );
  }
}
