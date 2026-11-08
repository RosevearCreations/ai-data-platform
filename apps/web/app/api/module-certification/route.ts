import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  certifyModuleHost,
  listCrossHostCertificationForUser
} from "@/lib/cross-host-certification-database";
import type { HostCertificationEvidenceInput } from "@/lib/cross-host-certification";

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
    message.includes("invalid") ||
    message.includes("requires_samples")
  ) {
    return 400;
  }
  return 409;
}

function object(value: unknown) {
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
    await listCrossHostCertificationForUser(id),
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
    const value = object(await request.json());
    if (!value) {
      throw new Error("cross_host_request_invalid");
    }

    const action = String(value.action ?? "");
    if (action !== "certify-host") {
      return Response.json(
        { error: "cross_host_action_invalid" },
        { status: 400 }
      );
    }

    const evidence = object(value.evidence);
    if (!evidence) {
      throw new Error("cross_host_evidence_invalid");
    }

    return Response.json(
      await certifyModuleHost(id, {
        moduleHostInstanceId: String(
          value.moduleHostInstanceId ?? ""
        ),
        evidence:
          evidence as unknown as HostCertificationEvidenceInput
      })
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "cross_host_request_failed";
    return Response.json(
      { error: message },
      { status: statusForError(message) }
    );
  }
}
