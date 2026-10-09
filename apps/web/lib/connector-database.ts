import { randomUUID } from "node:crypto";

import {
  assertConnectorCapability,
  normalizeConnectorConfig,
  validateConnectorSecretReferences,
  type ConnectorCapability
} from "@rosevear/ai-data-connector-sdk";

import { listWorkspacesForUser, withUserDatabase } from "./database";
import { executeConnectorBoundary } from "./connectors/sandbox";
import {
  getRegisteredConnector,
  listRegisteredConnectorManifests
} from "./connectors/registry";

async function requireWorkspaceAdmin(
  client: import("pg").PoolClient,
  workspaceId: string
) {
  const result = await client.query<{ role: string }>(
    "select role from app.workspace_members where workspace_id=$1 and user_id=nullif(current_setting('app.user_id',true),'') limit 1",
    [workspaceId]
  );
  if (result.rows[0]?.role !== "owner" && result.rows[0]?.role !== "admin") {
    throw new Error("workspace_admin_required");
  }
}

export interface ConnectorInstallationRecord {
  workspaceId: string;
  connectorKey: string;
  manifestVersion: number;
  connectorVersion: string;
  enabled: boolean;
  config: Record<string, unknown>;
  grantedCapabilities: string[];
  secretRefs: Record<string, unknown>;
  installedBy: string;
  updatedAt: Date;
}

export interface ConnectorAuditRecord {
  workspaceId: string;
  auditId: string;
  connectorKey: string;
  capability: ConnectorCapability;
  status: "succeeded" | "failed" | "blocked";
  durationMs: number;
  inputSummary: Record<string, unknown>;
  outputSummary: Record<string, unknown>;
  errorCode: string | null;
  createdAt: Date;
}

function installationRow(row: Record<string, unknown>): ConnectorInstallationRecord {
  return {
    workspaceId: String(row.workspace_id),
    connectorKey: String(row.connector_key),
    manifestVersion: Number(row.manifest_version),
    connectorVersion: String(row.connector_version),
    enabled: Boolean(row.enabled),
    config: row.config && typeof row.config === "object"
      ? (row.config as Record<string, unknown>) : {},
    grantedCapabilities: Array.isArray(row.granted_capabilities)
      ? row.granted_capabilities.map(String) : [],
    secretRefs: row.secret_refs && typeof row.secret_refs === "object"
      ? (row.secret_refs as Record<string, unknown>) : {},
    installedBy: String(row.installed_by),
    updatedAt: new Date(String(row.updated_at))
  };
}

function auditRow(row: Record<string, unknown>): ConnectorAuditRecord {
  return {
    workspaceId: String(row.workspace_id),
    auditId: String(row.audit_id),
    connectorKey: String(row.connector_key),
    capability: row.capability as ConnectorCapability,
    status: row.status as ConnectorAuditRecord["status"],
    durationMs: Number(row.duration_ms),
    inputSummary: row.input_summary && typeof row.input_summary === "object"
      ? (row.input_summary as Record<string, unknown>) : {},
    outputSummary: row.output_summary && typeof row.output_summary === "object"
      ? (row.output_summary as Record<string, unknown>) : {},
    errorCode: row.error_code ? String(row.error_code) : null,
    createdAt: new Date(String(row.created_at))
  };
}

export async function listConnectorOverviewForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const result = [];
  for (const workspace of workspaces) {
    const state = await withUserDatabase(userId, async (client) => {
      const [installations, audit] = await Promise.all([
        client.query("select * from app.workspace_connector_installations where workspace_id=$1 order by connector_key", [workspace.id]),
        client.query("select * from app.workspace_connector_audit where workspace_id=$1 order by created_at desc limit 100", [workspace.id])
      ]);
      return {
        installations: installations.rows.map(installationRow),
        audit: audit.rows.map(auditRow)
      };
    });
    result.push({ workspace, ...state });
  }
  return { manifests: listRegisteredConnectorManifests(), workspaces: result };
}

export async function configureWorkspaceConnector(
  userId: string,
  input: {
    workspaceId: string;
    connectorKey: string;
    config: unknown;
    grantedCapabilities: string[];
    secretRefs: unknown;
  }
) {
  const definition = getRegisteredConnector(input.connectorKey);
  if (!definition) throw new Error("connector_not_registered");
  const config = normalizeConnectorConfig(definition.manifest, input.config);
  const secretRefs = validateConnectorSecretReferences(definition.manifest, input.secretRefs);
  const grants = [...new Set(input.grantedCapabilities)];
  for (const capability of grants) {
    if (!definition.manifest.capabilities.includes(capability as ConnectorCapability)) {
      throw new Error("connector_capability_unsupported");
    }
  }
  if (!grants.length) throw new Error("connector_grant_required");

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const result = await client.query(
      `
        insert into app.workspace_connector_installations (
          workspace_id,connector_key,manifest_version,connector_version,
          enabled,config,granted_capabilities,secret_refs,installed_by
        )
        values ($1,$2,$3,$4,false,$5::jsonb,$6::jsonb,$7::jsonb,$8)
        on conflict (workspace_id,connector_key) do update set
          manifest_version=excluded.manifest_version,
          connector_version=excluded.connector_version,
          enabled=false,
          config=excluded.config,
          granted_capabilities=excluded.granted_capabilities,
          secret_refs=excluded.secret_refs,
          updated_at=now()
        returning *
      `,
      [
        input.workspaceId,
        definition.manifest.key,
        definition.manifest.manifestVersion,
        definition.manifest.version,
        JSON.stringify(config),
        JSON.stringify(grants),
        JSON.stringify(secretRefs),
        userId
      ]
    );
    return installationRow(result.rows[0]);
  });
}

export async function setWorkspaceConnectorEnabled(
  userId: string,
  input: { workspaceId: string; connectorKey: string; enabled: boolean }
) {
  const definition = getRegisteredConnector(input.connectorKey);
  if (!definition) throw new Error("connector_not_registered");
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const current = await client.query(
      "select * from app.workspace_connector_installations where workspace_id=$1 and connector_key=$2 for update",
      [input.workspaceId, input.connectorKey]
    );
    if (!current.rows[0]) throw new Error("connector_not_configured");
    const installation = installationRow(current.rows[0]);
    if (
      installation.manifestVersion !== definition.manifest.manifestVersion ||
      installation.connectorVersion !== definition.manifest.version
    ) {
      throw new Error("connector_installation_incompatible");
    }
    normalizeConnectorConfig(definition.manifest, installation.config);
    validateConnectorSecretReferences(definition.manifest, installation.secretRefs);
    const updated = await client.query(
      "update app.workspace_connector_installations set enabled=$3,updated_at=now() where workspace_id=$1 and connector_key=$2 returning *",
      [input.workspaceId, input.connectorKey, input.enabled]
    );
    return installationRow(updated.rows[0]);
  });
}

function boundedSummary(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return { kind: "array", items: value.length };
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return {
      kind: "object",
      keys: Object.keys(object).slice(0, 25),
      records: Array.isArray(object.records) ? object.records.length : 0
    };
  }
  return { kind: typeof value };
}

async function appendAudit(
  userId: string,
  input: {
    workspaceId: string;
    connectorKey: string;
    capability: ConnectorCapability;
    status: "succeeded" | "failed" | "blocked";
    startedAt: Date;
    durationMs: number;
    inputSummary: Record<string, unknown>;
    outputSummary: Record<string, unknown>;
    errorCode: string | null;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    await client.query(
      `
        insert into app.workspace_connector_audit (
          workspace_id,audit_id,connector_key,capability,status,actor_user_id,
          started_at,completed_at,duration_ms,input_summary,output_summary,error_code
        )
        values ($1,$2,$3,$4,$5,$6,$7,now(),$8,$9::jsonb,$10::jsonb,$11)
      `,
      [
        input.workspaceId,
        randomUUID(),
        input.connectorKey,
        input.capability,
        input.status,
        userId,
        input.startedAt,
        input.durationMs,
        JSON.stringify(input.inputSummary),
        JSON.stringify(input.outputSummary),
        input.errorCode
      ]
    );
  });
}

export async function executeWorkspaceConnector(
  userId: string,
  input: {
    workspaceId: string;
    connectorKey: string;
    capability: ConnectorCapability;
    payload: unknown;
  }
) {
  const definition = getRegisteredConnector(input.connectorKey);
  if (!definition) throw new Error("connector_not_registered");
  const startedAt = new Date();
  let installation: ConnectorInstallationRecord | null = null;

  try {
    installation = await withUserDatabase(userId, async (client) => {
      await requireWorkspaceAdmin(client, input.workspaceId);
      const result = await client.query(
        "select * from app.workspace_connector_installations where workspace_id=$1 and connector_key=$2 limit 1",
        [input.workspaceId, input.connectorKey]
      );
      return result.rows[0] ? installationRow(result.rows[0]) : null;
    });
    if (!installation) throw new Error("connector_not_configured");
    if (!installation.enabled) throw new Error("connector_disabled");
    if (
      installation.manifestVersion !== definition.manifest.manifestVersion ||
      installation.connectorVersion !== definition.manifest.version
    ) {
      throw new Error("connector_installation_incompatible");
    }
    assertConnectorCapability(
      definition.manifest,
      installation.grantedCapabilities,
      input.capability
    );

    const result = await executeConnectorBoundary({
      definition,
      workspaceId: input.workspaceId,
      capability: input.capability,
      grantedCapabilities: installation.grantedCapabilities,
      config: installation.config,
      secretRefs: installation.secretRefs,
      payload: input.payload
    });
    await appendAudit(userId, {
      workspaceId: input.workspaceId,
      connectorKey: input.connectorKey,
      capability: input.capability,
      status: "succeeded",
      startedAt,
      durationMs: result.durationMs,
      inputSummary: boundedSummary(input.payload),
      outputSummary: result.summary,
      errorCode: null
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "connector_execution_failed";
    if (installation) {
      await appendAudit(userId, {
        workspaceId: input.workspaceId,
        connectorKey: input.connectorKey,
        capability: input.capability,
        status:
          message === "connector_capability_not_granted" ||
          message === "connector_disabled"
            ? "blocked" : "failed",
        startedAt,
        durationMs: Math.max(0, Date.now() - startedAt.getTime()),
        inputSummary: boundedSummary(input.payload),
        outputSummary: {},
        errorCode: message.slice(0, 160)
      });
    }
    throw error;
  }
}
