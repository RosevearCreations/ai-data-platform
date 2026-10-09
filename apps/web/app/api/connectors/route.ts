import { headers } from "next/headers";

import type { ConnectorCapability } from "@rosevear/ai-data-connector-sdk";

import { auth } from "@/lib/auth";
import {
  configureWorkspaceConnector,
  executeWorkspaceConnector,
  listConnectorOverviewForUser,
  setWorkspaceConnectorEnabled
} from "@/lib/connector-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function userId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function bodyObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>) : {};
}

function responseError(error: unknown) {
  const message = error instanceof Error ? error.message : "connector_request_failed";
  const status =
    message === "workspace_admin_required" ? 403 :
    message === "connector_not_registered" ? 404 : 400;
  return Response.json({ error: message }, { status });
}

export async function GET() {
  const id = await userId();
  if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await listConnectorOverviewForUser(id));
}

export async function POST(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = bodyObject(await request.json().catch(() => null));
  try {
    const installation = await configureWorkspaceConnector(id, {
      workspaceId: String(body.workspaceId ?? ""),
      connectorKey: String(body.connectorKey ?? ""),
      config: body.config,
      grantedCapabilities: Array.isArray(body.grantedCapabilities)
        ? body.grantedCapabilities.map(String) : [],
      secretRefs: body.secretRefs
    });
    return Response.json({ installation }, { status: 201 });
  } catch (error) {
    return responseError(error);
  }
}

export async function PATCH(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = bodyObject(await request.json().catch(() => null));
  try {
    const installation = await setWorkspaceConnectorEnabled(id, {
      workspaceId: String(body.workspaceId ?? ""),
      connectorKey: String(body.connectorKey ?? ""),
      enabled: body.enabled === true
    });
    return Response.json({ installation });
  } catch (error) {
    return responseError(error);
  }
}

export async function PUT(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = bodyObject(await request.json().catch(() => null));
  const capability = String(body.capability ?? "") as ConnectorCapability;
  if (!["import", "enrichment", "export"].includes(capability)) {
    return Response.json({ error: "connector_capability_invalid" }, { status: 400 });
  }
  try {
    const result = await executeWorkspaceConnector(id, {
      workspaceId: String(body.workspaceId ?? ""),
      connectorKey: String(body.connectorKey ?? ""),
      capability,
      payload: body.payload
    });
    return Response.json({
      summary: result.summary,
      output: result.output,
      durationMs: result.durationMs
    });
  } catch (error) {
    return responseError(error);
  }
}
