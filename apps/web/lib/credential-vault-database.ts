import { randomUUID } from "node:crypto";

import { getPeerApplication, type PeerApplicationId } from "./app-connection-registry";
import {
  resolveCanonicalEnvironment,
  type CanonicalApplicationEnvironment
} from "./application-identity-mapping";
import { listWorkspacesForUser, withUserDatabase } from "./database";

export type CredentialReferenceKind =
  | "environment-variable"
  | "external-vault-reference"
  | "provider-managed-reference";

export type CredentialReferenceRiskState =
  | "active"
  | "replacement-prepared"
  | "rotation-soon"
  | "rotation-due"
  | "expired"
  | "revoked";

export type CredentialReferenceRecord = {
  workspaceId: string;
  credentialRefId: string;
  applicationId: PeerApplicationId;
  environment: CanonicalApplicationEnvironment;
  label: string;
  providerName: string;
  referenceKind: CredentialReferenceKind;
  referenceLocator: string;
  lifecycleStatus: "active" | "revoked";
  replacementState: "not-planned" | "prepared";
  rotationDueAt: string | null;
  expiresAt: string | null;
  lastRotatedAt: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  riskState: CredentialReferenceRiskState;
};

export type CredentialReferenceEvent = {
  workspaceId: string;
  eventId: string;
  credentialRefId: string;
  eventType:
    | "created"
    | "rotation-scheduled"
    | "replacement-prepared"
    | "rotation-completed"
    | "revoked";
  actorUserId: string;
  details: Record<string, unknown>;
  createdAt: string;
};

const ENVIRONMENT_VARIABLE_PATTERN = /^[A-Z][A-Z0-9_]{2,127}$/;
const EXTERNAL_VAULT_PATTERN =
  /^vault:[a-z0-9][a-z0-9._-]{1,63}:[A-Za-z0-9._/-]{1,160}$/;
const PROVIDER_MANAGED_PATTERN =
  /^provider:[a-z0-9][a-z0-9._-]{1,63}:[A-Za-z0-9._/-]{1,160}$/;

function textValue(value: unknown, field: string, max: number) {
  const result = String(value ?? "").trim();
  if (!result || result.length > max) {
    throw new Error("credential_reference_invalid_" + field);
  }
  return result;
}

function nullableDate(value: unknown, field: string) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) {
    throw new Error("credential_reference_invalid_" + field);
  }
  return date;
}

function validateTimeline(rotationDueAt: Date | null, expiresAt: Date | null) {
  if (rotationDueAt && expiresAt && rotationDueAt.getTime() > expiresAt.getTime()) {
    throw new Error("credential_reference_rotation_after_expiry");
  }
}

function validateApplication(value: unknown): PeerApplicationId {
  const id = String(value ?? "") as PeerApplicationId;
  if (!getPeerApplication(id)) {
    throw new Error("credential_reference_application_invalid");
  }
  return id;
}

function validateEnvironment(value: unknown): CanonicalApplicationEnvironment {
  const environment = resolveCanonicalEnvironment(String(value ?? ""));
  if (!environment) throw new Error("credential_reference_environment_invalid");
  return environment.canonical;
}

function validateReferenceKind(value: unknown): CredentialReferenceKind {
  const kind = String(value ?? "") as CredentialReferenceKind;
  if (
    kind !== "environment-variable" &&
    kind !== "external-vault-reference" &&
    kind !== "provider-managed-reference"
  ) {
    throw new Error("credential_reference_kind_invalid");
  }
  return kind;
}

export function validateCredentialReferenceLocator(
  kind: CredentialReferenceKind,
  value: unknown
) {
  const locator = textValue(value, "locator", 240);
  const valid =
    kind === "environment-variable"
      ? ENVIRONMENT_VARIABLE_PATTERN.test(locator)
      : kind === "external-vault-reference"
        ? EXTERNAL_VAULT_PATTERN.test(locator)
        : PROVIDER_MANAGED_PATTERN.test(locator);
  if (!valid) throw new Error("credential_reference_locator_invalid");
  return locator;
}

function iso(value: unknown) {
  return value ? new Date(String(value)).toISOString() : null;
}

export function credentialReferenceRiskState(
  input: {
    lifecycleStatus: "active" | "revoked";
    replacementState: "not-planned" | "prepared";
    rotationDueAt: string | null;
    expiresAt: string | null;
  },
  now = new Date()
): CredentialReferenceRiskState {
  if (input.lifecycleStatus === "revoked") return "revoked";
  if (input.expiresAt && new Date(input.expiresAt).getTime() <= now.getTime()) {
    return "expired";
  }
  if (
    input.rotationDueAt &&
    new Date(input.rotationDueAt).getTime() <= now.getTime()
  ) {
    return input.replacementState === "prepared"
      ? "replacement-prepared"
      : "rotation-due";
  }
  if (
    input.rotationDueAt &&
    new Date(input.rotationDueAt).getTime() - now.getTime() <= 30 * 86_400_000
  ) {
    return input.replacementState === "prepared"
      ? "replacement-prepared"
      : "rotation-soon";
  }
  if (input.replacementState === "prepared") return "replacement-prepared";
  return "active";
}

function rowToReference(row: Record<string, unknown>): CredentialReferenceRecord {
  const base = {
    workspaceId: String(row.workspace_id),
    credentialRefId: String(row.credential_ref_id),
    applicationId: String(row.application_id) as PeerApplicationId,
    environment: String(row.environment) as CanonicalApplicationEnvironment,
    label: String(row.label),
    providerName: String(row.provider_name),
    referenceKind: String(row.reference_kind) as CredentialReferenceKind,
    referenceLocator: String(row.reference_locator),
    lifecycleStatus: String(row.lifecycle_status) as "active" | "revoked",
    replacementState: String(row.replacement_state) as "not-planned" | "prepared",
    rotationDueAt: iso(row.rotation_due_at),
    expiresAt: iso(row.expires_at),
    lastRotatedAt: iso(row.last_rotated_at),
    createdBy: String(row.created_by),
    updatedBy: String(row.updated_by),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
  return {
    ...base,
    riskState: credentialReferenceRiskState(base)
  };
}

function rowToEvent(row: Record<string, unknown>): CredentialReferenceEvent {
  return {
    workspaceId: String(row.workspace_id),
    eventId: String(row.event_id),
    credentialRefId: String(row.credential_ref_id),
    eventType: String(row.event_type) as CredentialReferenceEvent["eventType"],
    actorUserId: String(row.actor_user_id),
    details:
      row.details && typeof row.details === "object" && !Array.isArray(row.details)
        ? (row.details as Record<string, unknown>)
        : {},
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

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

async function appendEvent(
  client: import("pg").PoolClient,
  userId: string,
  input: {
    workspaceId: string;
    credentialRefId: string;
    eventType: CredentialReferenceEvent["eventType"];
    details?: Record<string, unknown>;
  }
) {
  await client.query(
    `insert into app.workspace_credential_reference_events (
      workspace_id,event_id,credential_ref_id,event_type,actor_user_id,details
    ) values ($1,$2,$3,$4,$5,$6::jsonb)`,
    [
      input.workspaceId,
      randomUUID(),
      input.credentialRefId,
      input.eventType,
      userId,
      JSON.stringify(input.details ?? {})
    ]
  );
}

export async function listCredentialVaultForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const [references, events] = await Promise.all([
      client.query(
        "select * from app.workspace_credential_references order by lifecycle_status, rotation_due_at nulls last, created_at desc"
      ),
      client.query(
        "select * from app.workspace_credential_reference_events order by created_at desc limit 200"
      )
    ]);
    return {
      references: references.rows.map(rowToReference),
      events: events.rows.map(rowToEvent)
    };
  });

  const roleByWorkspace = new Map(workspaces.map((item) => [item.id, item.role]));
  const workspaceNameById = new Map(workspaces.map((item) => [item.id, item.name]));
  const references = data.references.map((item) => ({
    ...item,
    workspaceName: workspaceNameById.get(item.workspaceId) ?? item.workspaceId,
    canManage:
      roleByWorkspace.get(item.workspaceId) === "owner" ||
      roleByWorkspace.get(item.workspaceId) === "admin"
  }));

  return {
    schema: "ai-data-platform.credential-reference-vault.v1" as const,
    build: 284 as const,
    generatedAt: new Date().toISOString(),
    workspaces: workspaces.map((item) => ({
      id: item.id,
      name: item.name,
      role: item.role,
      canManage: item.role === "owner" || item.role === "admin"
    })),
    references,
    events: data.events,
    summary: {
      references: references.length,
      active: references.filter((item) => item.lifecycleStatus === "active").length,
      attention: references.filter((item) =>
        ["replacement-prepared", "rotation-soon", "rotation-due", "expired"].includes(
          item.riskState
        )
      ).length,
      prepared: references.filter(
        (item) => item.replacementState === "prepared"
      ).length,
      revoked: references.filter((item) => item.lifecycleStatus === "revoked").length
    },
    policy: {
      secretValuesStored: false as const,
      referenceMetadataOnly: true as const,
      ownerAdminMutationOnly: true as const,
      appendOnlyRotationEvidence: true as const,
      automaticRotation: false as const,
      liveConnectionImplied: false as const,
      ql266Resumed: false as const
    }
  };
}

export async function createCredentialReference(
  userId: string,
  input: {
    workspaceId: string;
    applicationId: unknown;
    environment: unknown;
    label: unknown;
    providerName: unknown;
    referenceKind: unknown;
    referenceLocator: unknown;
    rotationDueAt?: unknown;
    expiresAt?: unknown;
  }
) {
  const applicationId = validateApplication(input.applicationId);
  const environment = validateEnvironment(input.environment);
  const label = textValue(input.label, "label", 120);
  const providerName = textValue(input.providerName, "provider_name", 120);
  const referenceKind = validateReferenceKind(input.referenceKind);
  const referenceLocator = validateCredentialReferenceLocator(
    referenceKind,
    input.referenceLocator
  );
  const rotationDueAt = nullableDate(input.rotationDueAt, "rotation_due_at");
  const expiresAt = nullableDate(input.expiresAt, "expires_at");
  validateTimeline(rotationDueAt, expiresAt);

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const credentialRefId = randomUUID();
    const result = await client.query(
      `insert into app.workspace_credential_references (
        workspace_id,credential_ref_id,application_id,environment,label,provider_name,
        reference_kind,reference_locator,rotation_due_at,expires_at,created_by,updated_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
      returning *`,
      [
        input.workspaceId,
        credentialRefId,
        applicationId,
        environment,
        label,
        providerName,
        referenceKind,
        referenceLocator,
        rotationDueAt,
        expiresAt,
        userId
      ]
    );
    await appendEvent(client, userId, {
      workspaceId: input.workspaceId,
      credentialRefId,
      eventType: "created",
      details: {
        applicationId,
        environment,
        referenceKind,
        referenceLocator,
        rotationDueAt: rotationDueAt?.toISOString() ?? null,
        expiresAt: expiresAt?.toISOString() ?? null
      }
    });
    return rowToReference(result.rows[0]);
  });
}

export async function scheduleCredentialRotation(
  userId: string,
  input: {
    workspaceId: string;
    credentialRefId: string;
    rotationDueAt?: unknown;
    expiresAt?: unknown;
  }
) {
  const rotationDueAt = nullableDate(input.rotationDueAt, "rotation_due_at");
  const expiresAt = nullableDate(input.expiresAt, "expires_at");
  validateTimeline(rotationDueAt, expiresAt);
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const result = await client.query(
      `update app.workspace_credential_references
       set rotation_due_at=$3,expires_at=$4,updated_by=$5,updated_at=now()
       where workspace_id=$1 and credential_ref_id=$2 and lifecycle_status='active'
       returning *`,
      [
        input.workspaceId,
        input.credentialRefId,
        rotationDueAt,
        expiresAt,
        userId
      ]
    );
    if (!result.rows[0]) throw new Error("credential_reference_not_found");
    await appendEvent(client, userId, {
      workspaceId: input.workspaceId,
      credentialRefId: input.credentialRefId,
      eventType: "rotation-scheduled",
      details: {
        rotationDueAt: rotationDueAt?.toISOString() ?? null,
        expiresAt: expiresAt?.toISOString() ?? null
      }
    });
    return rowToReference(result.rows[0]);
  });
}

export async function markCredentialReplacementPrepared(
  userId: string,
  input: { workspaceId: string; credentialRefId: string }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const result = await client.query(
      `update app.workspace_credential_references
       set replacement_state='prepared',updated_by=$3,updated_at=now()
       where workspace_id=$1 and credential_ref_id=$2 and lifecycle_status='active'
       returning *`,
      [input.workspaceId, input.credentialRefId, userId]
    );
    if (!result.rows[0]) throw new Error("credential_reference_not_found");
    await appendEvent(client, userId, {
      workspaceId: input.workspaceId,
      credentialRefId: input.credentialRefId,
      eventType: "replacement-prepared",
      details: {
        note:
          "External secret replacement was reported prepared. No secret value was stored."
      }
    });
    return rowToReference(result.rows[0]);
  });
}

export async function recordCredentialRotationCompleted(
  userId: string,
  input: {
    workspaceId: string;
    credentialRefId: string;
    nextRotationDueAt?: unknown;
    expiresAt?: unknown;
  }
) {
  const nextRotationDueAt = nullableDate(
    input.nextRotationDueAt,
    "next_rotation_due_at"
  );
  const expiresAt = nullableDate(input.expiresAt, "expires_at");
  validateTimeline(nextRotationDueAt, expiresAt);

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const current = await client.query<{ replacement_state: string }>(
      `select replacement_state from app.workspace_credential_references
       where workspace_id=$1 and credential_ref_id=$2 and lifecycle_status='active'
       for update`,
      [input.workspaceId, input.credentialRefId]
    );
    if (!current.rows[0]) throw new Error("credential_reference_not_found");
    if (current.rows[0].replacement_state !== "prepared") {
      throw new Error("credential_replacement_not_prepared");
    }
    const result = await client.query(
      `update app.workspace_credential_references
       set replacement_state='not-planned',last_rotated_at=now(),
           rotation_due_at=$3,expires_at=$4,updated_by=$5,updated_at=now()
       where workspace_id=$1 and credential_ref_id=$2
       returning *`,
      [
        input.workspaceId,
        input.credentialRefId,
        nextRotationDueAt,
        expiresAt,
        userId
      ]
    );
    await appendEvent(client, userId, {
      workspaceId: input.workspaceId,
      credentialRefId: input.credentialRefId,
      eventType: "rotation-completed",
      details: {
        nextRotationDueAt: nextRotationDueAt?.toISOString() ?? null,
        expiresAt: expiresAt?.toISOString() ?? null,
        note:
          "Rotation completion records external replacement evidence only; no secret value was stored."
      }
    });
    return rowToReference(result.rows[0]);
  });
}

export async function revokeCredentialReference(
  userId: string,
  input: { workspaceId: string; credentialRefId: string }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const result = await client.query(
      `update app.workspace_credential_references
       set lifecycle_status='revoked',replacement_state='not-planned',
           updated_by=$3,updated_at=now()
       where workspace_id=$1 and credential_ref_id=$2 and lifecycle_status='active'
       returning *`,
      [input.workspaceId, input.credentialRefId, userId]
    );
    if (!result.rows[0]) throw new Error("credential_reference_not_found");
    await appendEvent(client, userId, {
      workspaceId: input.workspaceId,
      credentialRefId: input.credentialRefId,
      eventType: "revoked",
      details: { note: "Credential reference revoked; secret material was not read." }
    });
    return rowToReference(result.rows[0]);
  });
}
