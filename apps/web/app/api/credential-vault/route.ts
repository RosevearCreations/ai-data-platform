import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  createCredentialReference,
  listCredentialVaultForUser,
  markCredentialReplacementPrepared,
  recordCredentialRotationCompleted,
  revokeCredentialReference,
  scheduleCredentialRotation
} from "@/lib/credential-vault-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function userId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function bodyObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function responseError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "credential_vault_request_failed";
  const status =
    message === "workspace_admin_required"
      ? 403
      : message === "credential_reference_not_found"
        ? 404
        : 400;
  return Response.json({ error: message }, { status });
}

export async function GET() {
  const id = await userId();
  if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await listCredentialVaultForUser(id), {
    headers: { "cache-control": "no-store" }
  });
}

export async function POST(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = bodyObject(await request.json().catch(() => null));
  try {
    const reference = await createCredentialReference(id, {
      workspaceId: String(body.workspaceId ?? ""),
      applicationId: body.applicationId,
      environment: body.environment,
      label: body.label,
      providerName: body.providerName,
      referenceKind: body.referenceKind,
      referenceLocator: body.referenceLocator,
      rotationDueAt: body.rotationDueAt,
      expiresAt: body.expiresAt
    });
    return Response.json({ reference }, { status: 201 });
  } catch (error) {
    return responseError(error);
  }
}

export async function PATCH(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = bodyObject(await request.json().catch(() => null));
  const workspaceId = String(body.workspaceId ?? "");
  const credentialRefId = String(body.credentialRefId ?? "");
  const action = String(body.action ?? "");
  try {
    const reference =
      action === "schedule-rotation"
        ? await scheduleCredentialRotation(id, {
            workspaceId,
            credentialRefId,
            rotationDueAt: body.rotationDueAt,
            expiresAt: body.expiresAt
          })
        : action === "replacement-prepared"
          ? await markCredentialReplacementPrepared(id, {
              workspaceId,
              credentialRefId
            })
          : action === "rotation-completed"
            ? await recordCredentialRotationCompleted(id, {
                workspaceId,
                credentialRefId,
                nextRotationDueAt: body.nextRotationDueAt,
                expiresAt: body.expiresAt
              })
            : action === "revoke"
              ? await revokeCredentialReference(id, {
                  workspaceId,
                  credentialRefId
                })
              : null;
    if (!reference) {
      return Response.json(
        { error: "credential_vault_action_invalid" },
        { status: 400 }
      );
    }
    return Response.json({ reference });
  } catch (error) {
    return responseError(error);
  }
}
