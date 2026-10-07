import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  applyWorkspaceSyncMutation,
  listWorkspaceSyncRecords,
  resolveExtensionSession,
  type WorkspaceSyncMutation
} from "@/lib/database";

function noStoreJson(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function authenticatedPrincipal(request: Request) {
  const token = bearerToken(request);
  if (!token) return null;
  return resolveExtensionSession(tokenHash(token));
}

function validWorkspaceId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

function recordObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function dateValue(value: unknown) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    return null;
  }
  return new Date(value).toISOString();
}

function expectedVersion(value: unknown) {
  if (value === null || value === undefined) return null;
  return Number.isInteger(value) && Number(value) >= 1
    ? Number(value)
    : undefined;
}

function parseMutation(
  workspaceId: string,
  value: unknown
): WorkspaceSyncMutation | null {
  const input = recordObject(value);
  if (!input) return null;

  const resource = input.resource;
  const action = input.action;
  const recordId = textValue(input.recordId).trim();
  const clientUpdatedAt = dateValue(input.clientUpdatedAt);
  const expectedServerVersion = expectedVersion(input.expectedServerVersion);

  if (
    (resource !== "saved-scraper" && resource !== "reviewed-dataset") ||
    (action !== "upsert" && action !== "delete") ||
    !recordId ||
    recordId.length > 256 ||
    !clientUpdatedAt ||
    expectedServerVersion === undefined
  ) {
    return null;
  }

  const payload =
    action === "upsert" ? recordObject(input.payload) : null;

  if (action === "upsert" && !payload) {
    return null;
  }

  if (
    payload &&
    textValue(payload.workspaceId) &&
    textValue(payload.workspaceId) !== workspaceId
  ) {
    return null;
  }

  if (resource === "saved-scraper") {
    const kind = payload ? payload.kind : input.kind;
    const name = payload ? textValue(payload.name) : textValue(input.name);
    const sourceUrl = payload
      ? textValue(payload.sourceUrl)
      : textValue(input.sourceUrl);
    const sourceOrigin = payload
      ? textValue(payload.sourceOrigin)
      : textValue(input.sourceOrigin);

    if (
      action === "upsert" &&
      (kind !== "scraper" && kind !== "template")
    ) {
      return null;
    }

    return {
      resource,
      action,
      recordId,
      expectedServerVersion,
      clientUpdatedAt,
      payload,
      kind:
        kind === "template" ? "template" : "scraper",
      name,
      sourceUrl,
      sourceOrigin
    };
  }

  const rows = payload && Array.isArray(payload.rows) ? payload.rows : [];
  if (action === "upsert" && rows.length > 500) {
    return null;
  }

  const recipeName = payload
    ? textValue(payload.recipeName)
    : textValue(input.recipeName);
  const sourceUrl = payload
    ? textValue(payload.sourceUrl)
    : textValue(input.sourceUrl);
  const retrievedAt =
    (payload ? dateValue(payload.retrievedAt) : null) ??
    (payload ? dateValue(payload.createdAt) : null) ??
    clientUpdatedAt;

  return {
    resource,
    action,
    recordId,
    expectedServerVersion,
    clientUpdatedAt,
    payload,
    recipeName,
    sourceUrl,
    retrievedAt,
    rowCount: rows.length
  };
}

function responseForError(reason: unknown) {
  if (reason instanceof Error && reason.message === "workspace_access_denied") {
    return noStoreJson({ error: "workspace_access_denied" }, 403);
  }

  console.error("Workspace sync request failed.", reason);
  return noStoreJson({ error: "workspace_sync_failed" }, 500);
}

export async function GET(request: Request) {
  const principal = await authenticatedPrincipal(request);
  if (!principal) {
    return noStoreJson({ error: "expired_or_invalid_session" }, 401);
  }

  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!validWorkspaceId(workspaceId)) {
    return noStoreJson({ error: "invalid_workspace_id" }, 400);
  }

  try {
    const records = await listWorkspaceSyncRecords(
      principal.userId,
      workspaceId
    );

    return noStoreJson({
      syncVersion: 1,
      workspaceId,
      records
    });
  } catch (reason) {
    return responseForError(reason);
  }
}

export async function POST(request: Request) {
  const principal = await authenticatedPrincipal(request);
  if (!principal) {
    return noStoreJson({ error: "expired_or_invalid_session" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: "invalid_json" }, 400);
  }

  const object = recordObject(body);
  const workspaceId = object?.workspaceId;

  if (!validWorkspaceId(workspaceId)) {
    return noStoreJson({ error: "invalid_workspace_id" }, 400);
  }

  const mutation = parseMutation(workspaceId, object?.mutation);
  if (!mutation) {
    return noStoreJson({ error: "invalid_sync_mutation" }, 400);
  }

  try {
    const result = await applyWorkspaceSyncMutation(
      principal.userId,
      workspaceId,
      mutation
    );

    return noStoreJson({
      syncVersion: 1,
      workspaceId,
      result
    });
  } catch (reason) {
    return responseForError(reason);
  }
}
