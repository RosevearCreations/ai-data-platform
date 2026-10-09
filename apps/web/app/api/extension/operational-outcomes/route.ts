import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  appendOperationalOutcome,
  resolveExtensionSession
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

function boundedDetails(value: unknown) {
  const record = recordObject(value);
  if (!record) return {};

  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, entry] of Object.entries(record).slice(0, 12)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(key)) continue;
    if (
      typeof entry === "number" ||
      typeof entry === "boolean" ||
      entry === null
    ) {
      safe[key] = entry;
    } else if (typeof entry === "string") {
      safe[key] = entry.slice(0, 256);
    }
  }
  return safe;
}

export async function POST(request: Request) {
  const token = bearerToken(request);
  const principal = token
    ? await resolveExtensionSession(tokenHash(token))
    : null;

  if (!principal) {
    return noStoreJson({ error: "expired_or_invalid_session" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: "invalid_json" }, 400);
  }

  const input = recordObject(body);
  const workspaceId = input?.workspaceId;
  const eventType = input?.eventType;
  const recordId =
    typeof input?.recordId === "string" ? input.recordId.trim() : "";
  const revision = Number(input?.revision);

  if (
    !validWorkspaceId(workspaceId) ||
    (eventType !== "repair-proposed" && eventType !== "repair-rejected") ||
    !recordId ||
    recordId.length > 256 ||
    !Number.isInteger(revision) ||
    revision < 1 ||
    revision > 1_000_000
  ) {
    return noStoreJson({ error: "invalid_operational_outcome" }, 400);
  }

  try {
    await appendOperationalOutcome(principal.userId, {
      workspaceId,
      eventType,
      resource: "saved-scraper",
      recordId,
      revision,
      details: boundedDetails(input?.details)
    });

    return noStoreJson({ ok: true });
  } catch (reason) {
    if (
      reason instanceof Error &&
      reason.message === "workspace_access_denied"
    ) {
      return noStoreJson({ error: "workspace_access_denied" }, 403);
    }

    console.error("Operational outcome intake failed.", reason);
    return noStoreJson({ error: "operational_outcome_failed" }, 500);
  }
}
