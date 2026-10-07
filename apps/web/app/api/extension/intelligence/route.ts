import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  appendWorkspaceIntelligenceAudit,
  listWorkspaceIntelligence,
  resolveExtensionSession,
  upsertWorkspaceIntelligenceModule,
  type IntelligenceModuleKey
} from "@/lib/database";

const MODULES = new Set<IntelligenceModuleKey>([
  "history",
  "rosie-competitive",
  "devil-supplier",
  "movie-metadata",
  "scheduled-jobs",
  "source-policy",
  "business-integrations"
]);

function noStoreJson(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function recordObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function principal(request: Request) {
  const token = bearerToken(request);
  return token ? resolveExtensionSession(tokenHash(token)) : null;
}

function validWorkspaceId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function arrayLength(value: unknown, key: string) {
  const object = recordObject(value);
  const array = object?.[key];
  return Array.isArray(array) ? array.length : 0;
}

function withinBounds(moduleKey: IntelligenceModuleKey, payload: Record<string, unknown>) {
  if (moduleKey === "history") {
    const series = Array.isArray(payload.series) ? payload.series : [];
    return series.length <= 30 &&
      series.every((item) => arrayLength(item, "snapshots") <= 20 && arrayLength(item, "changes") <= 1000);
  }
  if (moduleKey === "rosie-competitive") {
    return arrayLength(payload, "series") <= 75;
  }
  if (moduleKey === "devil-supplier") {
    const items = Array.isArray(payload.items) ? payload.items : [];
    return items.length <= 500 &&
      items.every((item) => arrayLength(item, "priceHistory") <= 24);
  }
  if (moduleKey === "movie-metadata") {
    return arrayLength(payload, "collection") <= 7500 &&
      arrayLength(payload, "matchQueue") <= 1000;
  }
  if (moduleKey === "scheduled-jobs") {
    const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
    return jobs.length <= 50 &&
      arrayLength(payload, "notifications") <= 100 &&
      jobs.every((job) => arrayLength(job, "attempts") <= 30);
  }
  if (moduleKey === "source-policy") {
    return arrayLength(payload, "entries") <= 150;
  }
  return arrayLength(payload, "batches") <= 30 &&
    arrayLength(payload, "audit") <= 250;
}

function serialize(state: Awaited<ReturnType<typeof listWorkspaceIntelligence>>) {
  return {
    modules: state.modules.map((item) => ({
      ...item,
      clientUpdatedAt: item.clientUpdatedAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    })),
    audit: state.audit.map((item) => ({
      ...item,
      occurredAt: item.occurredAt.toISOString()
    }))
  };
}

export async function GET(request: Request) {
  const current = await principal(request);
  if (!current) return noStoreJson({ error: "expired_or_invalid_session" }, 401);

  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!validWorkspaceId(workspaceId)) {
    return noStoreJson({ error: "invalid_workspace_id" }, 400);
  }

  try {
    return noStoreJson({
      syncVersion: 1,
      workspaceId,
      ...serialize(await listWorkspaceIntelligence(current.userId, workspaceId))
    });
  } catch (reason) {
    if (reason instanceof Error && reason.message === "workspace_access_denied") {
      return noStoreJson({ error: "workspace_access_denied" }, 403);
    }
    console.error(reason);
    return noStoreJson({ error: "intelligence_sync_failed" }, 500);
  }
}

export async function POST(request: Request) {
  const current = await principal(request);
  if (!current) return noStoreJson({ error: "expired_or_invalid_session" }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: "invalid_json" }, 400);
  }

  const object = recordObject(body);
  const workspaceId = object?.workspaceId;
  const moduleKey = object?.moduleKey;
  const payload = recordObject(object?.payload);
  const summary = recordObject(object?.summary);
  const updatedAt = object?.clientUpdatedAt;
  const expected = object?.expectedServerVersion;

  if (
    !validWorkspaceId(workspaceId) ||
    typeof moduleKey !== "string" ||
    !MODULES.has(moduleKey as IntelligenceModuleKey) ||
    !payload ||
    !summary ||
    typeof updatedAt !== "string" ||
    Number.isNaN(Date.parse(updatedAt)) ||
    !(expected === null || (Number.isInteger(expected) && Number(expected) >= 1))
  ) {
    return noStoreJson({ error: "invalid_intelligence_mutation" }, 400);
  }

  const typedModule = moduleKey as IntelligenceModuleKey;
  if (!withinBounds(typedModule, payload)) {
    return noStoreJson({ error: "retention_bound_exceeded" }, 400);
  }

  const rawAudit = Array.isArray(object?.auditEntries) ? object.auditEntries : [];
  const auditEntries = rawAudit.flatMap((value) => {
    const entry = recordObject(value);
    const target = entry?.target;
    const action = entry?.action;
    if (
      typeof entry?.id !== "string" ||
      typeof entry?.batchId !== "string" ||
      (target !== "rosie-dazzlers" && target !== "devil-n-dove") ||
      !["dry-run-created", "approved", "exported", "cancelled"].includes(String(action)) ||
      typeof entry?.occurredAt !== "string" ||
      Number.isNaN(Date.parse(entry.occurredAt)) ||
      typeof entry?.fingerprint !== "string" ||
      typeof entry?.details !== "string"
    ) return [];

    return [{
      auditId: entry.id,
      batchId: entry.batchId,
      target: target as "rosie-dazzlers" | "devil-n-dove",
      action: action as "dry-run-created" | "approved" | "exported" | "cancelled",
      occurredAt: entry.occurredAt,
      fingerprint: entry.fingerprint,
      details: entry.details,
      payload: entry
    }];
  });

  try {
    const result = await upsertWorkspaceIntelligenceModule(
      current.userId,
      workspaceId,
      {
        moduleKey: typedModule,
        expectedServerVersion: expected as number | null,
        clientUpdatedAt: new Date(updatedAt).toISOString(),
        summary,
        payload
      }
    );

    let auditInserted = 0;
    if (result.status === "applied" && typedModule === "business-integrations") {
      auditInserted = await appendWorkspaceIntelligenceAudit(
        current.userId,
        workspaceId,
        auditEntries
      );
    }

    return noStoreJson({
      syncVersion: 1,
      workspaceId,
      result: {
        ...result,
        record: {
          ...result.record,
          clientUpdatedAt: result.record.clientUpdatedAt.toISOString(),
          updatedAt: result.record.updatedAt.toISOString()
        }
      },
      auditInserted
    });
  } catch (reason) {
    if (reason instanceof Error && reason.message === "workspace_access_denied") {
      return noStoreJson({ error: "workspace_access_denied" }, 403);
    }
    console.error(reason);
    return noStoreJson({ error: "intelligence_sync_failed" }, 500);
  }
}
