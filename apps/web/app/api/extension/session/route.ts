import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  listWorkspacesForUser,
  resolveExtensionSession,
  revokeExtensionSession
} from "@/lib/database";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function noStoreJson(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: Request) {
  const token = bearerToken(request);

  if (!token) {
    return noStoreJson({ error: "unauthorized" }, 401);
  }

  const principal = await resolveExtensionSession(tokenHash(token));

  if (!principal) {
    return noStoreJson({ error: "expired_or_invalid_session" }, 401);
  }

  const workspaces = await listWorkspacesForUser(principal.userId);

  return noStoreJson({
    bridgeVersion: 1,
    session: {
      expiresAt: principal.expiresAt.toISOString()
    },
    user: {
      id: principal.userId,
      name: principal.name,
      email: principal.email
    },
    workspaces
  });
}

export async function DELETE(request: Request) {
  const token = bearerToken(request);

  if (!token) {
    return noStoreJson({ error: "unauthorized" }, 401);
  }

  await revokeExtensionSession(tokenHash(token));
  return noStoreJson({ revoked: true });
}
