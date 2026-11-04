import { randomUUID } from "node:crypto";

import {
  buildCrossAppDataContractRegistry,
  type CrossAppDataContract
} from "./cross-app-data-contract-registry";
import {
  buildAppConnectionRegistry,
  type PeerApplicationId
} from "./app-connection-registry";
import {
  fieldMappingSchemaCurrent,
  getFieldMappingContract,
  normalizeFieldMappingEntries,
  validateFieldMappingApplication,
  validateFieldMappingEntries,
  type FieldMappingEntry
} from "./field-mapping-studio";
import { listWorkspacesForUser, withUserDatabase } from "./database";

export type FieldMappingProfileRecord = {
  workspaceId: string;
  mappingProfileId: string;
  applicationId: PeerApplicationId;
  contractId: string;
  contractVersion: string;
  schemaFingerprint: string;
  profileName: string;
  sourceSchemaLabel: string;
  mappingEntries: FieldMappingEntry[];
  notes: string;
  reviewStatus: "draft" | "reviewed";
  revision: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  schemaCurrent: boolean;
  validation: ReturnType<typeof validateFieldMappingEntries>;
};

export type FieldMappingProfileEvent = {
  workspaceId: string;
  eventId: string;
  mappingProfileId: string;
  eventType: "created" | "saved" | "reviewed" | "reopened";
  actorUserId: string;
  revision: number;
  details: Record<string, unknown>;
  createdAt: string;
};

function textValue(value: unknown, field: string, max: number, required = true) {
  const result = String(value ?? "").trim();
  if ((required && !result) || result.length > max) {
    throw new Error("field_mapping_invalid_" + field);
  }
  return result;
}

function rowEntries(row: Record<string, unknown>) {
  return Array.isArray(row.mapping_entries)
    ? (row.mapping_entries as FieldMappingEntry[])
    : [];
}

function rowToProfile(row: Record<string, unknown>): FieldMappingProfileRecord {
  const contract = getFieldMappingContract(row.contract_id);
  const mappingEntries = rowEntries(row);
  return {
    workspaceId: String(row.workspace_id),
    mappingProfileId: String(row.mapping_profile_id),
    applicationId: String(row.application_id) as PeerApplicationId,
    contractId: String(row.contract_id),
    contractVersion: String(row.contract_version),
    schemaFingerprint: String(row.schema_fingerprint),
    profileName: String(row.profile_name),
    sourceSchemaLabel: String(row.source_schema_label ?? ""),
    mappingEntries,
    notes: String(row.notes ?? ""),
    reviewStatus: String(row.review_status) as "draft" | "reviewed",
    revision: Number(row.revision),
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at
      ? new Date(String(row.reviewed_at)).toISOString()
      : null,
    createdBy: String(row.created_by),
    updatedBy: String(row.updated_by),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    schemaCurrent: fieldMappingSchemaCurrent(
      String(row.schema_fingerprint),
      String(row.contract_id)
    ),
    validation: validateFieldMappingEntries(mappingEntries, contract)
  };
}

function rowToEvent(row: Record<string, unknown>): FieldMappingProfileEvent {
  return {
    workspaceId: String(row.workspace_id),
    eventId: String(row.event_id),
    mappingProfileId: String(row.mapping_profile_id),
    eventType: String(row.event_type) as FieldMappingProfileEvent["eventType"],
    actorUserId: String(row.actor_user_id),
    revision: Number(row.revision),
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
    mappingProfileId: string;
    eventType: FieldMappingProfileEvent["eventType"];
    revision: number;
    details: Record<string, unknown>;
  }
) {
  await client.query(
    `insert into app.workspace_field_mapping_profile_events (
      workspace_id,event_id,mapping_profile_id,event_type,actor_user_id,revision,details
    ) values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [
      input.workspaceId,
      randomUUID(),
      input.mappingProfileId,
      input.eventType,
      userId,
      input.revision,
      JSON.stringify(input.details)
    ]
  );
}

function contractOption(contract: CrossAppDataContract) {
  return {
    contractId: contract.contractId,
    title: contract.title,
    version: contract.version,
    schemaId: contract.schemaId,
    schemaFingerprint: contract.schemaFingerprint,
    fields: contract.fields.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required,
      description: field.description,
      enumValues: field.enumValues ? [...field.enumValues] : null
    }))
  };
}

export async function listFieldMappingStudioForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const registry = buildCrossAppDataContractRegistry();
  const appRegistry = buildAppConnectionRegistry();

  const data = await withUserDatabase(userId, async (client) => {
    const [profiles, events] = await Promise.all([
      client.query(
        "select * from app.workspace_field_mapping_profiles order by updated_at desc, created_at desc limit 500"
      ),
      client.query(
        "select * from app.workspace_field_mapping_profile_events order by created_at desc limit 500"
      )
    ]);
    return {
      profiles: profiles.rows.map(rowToProfile),
      events: events.rows.map(rowToEvent)
    };
  });

  const workspaceNameById = new Map(workspaces.map((item) => [item.id, item.name]));
  const workspaceRoleById = new Map(workspaces.map((item) => [item.id, item.role]));

  return {
    schema: "ai-data-platform.visual-field-mapping-studio.v1" as const,
    build: 287 as const,
    generatedAt: new Date().toISOString(),
    workspaces: workspaces.map((item) => ({
      id: item.id,
      name: item.name,
      role: item.role,
      canManage: item.role === "owner" || item.role === "admin"
    })),
    applications: appRegistry.peerApplications.map((item) => ({
      applicationId: item.id,
      displayName: item.displayName,
      repository: item.repository,
      connectionState: item.connectionState
    })),
    contracts: registry.contracts.map(contractOption),
    profiles: data.profiles.map((item) => ({
      ...item,
      workspaceName: workspaceNameById.get(item.workspaceId) ?? item.workspaceId,
      canManage:
        workspaceRoleById.get(item.workspaceId) === "owner" ||
        workspaceRoleById.get(item.workspaceId) === "admin"
    })),
    events: data.events,
    summary: {
      profiles: data.profiles.length,
      reviewed: data.profiles.filter((item) => item.reviewStatus === "reviewed").length,
      drafts: data.profiles.filter((item) => item.reviewStatus === "draft").length,
      schemaCurrent: data.profiles.filter((item) => item.schemaCurrent).length,
      staleSchema: data.profiles.filter((item) => !item.schemaCurrent).length,
      applicationsWithProfiles: new Set(data.profiles.map((item) => item.applicationId))
        .size,
      contractsWithProfiles: new Set(data.profiles.map((item) => item.contractId)).size
    },
    policy: {
      profilePersistence: true as const,
      reviewedMappingsRequiredBeforeExchange: true as const,
      sourceValuesStored: false as const,
      rawSecretsStored: false as const,
      ownerAdminMutationOnly: true as const,
      appendOnlyReviewEvidence: true as const,
      automaticConnectionActivation: false as const,
      liveExchangeAuthorized: false as const,
      ql266Resumed: false as const
    }
  };
}

export async function saveFieldMappingProfile(
  userId: string,
  input: {
    workspaceId: unknown;
    mappingProfileId?: unknown;
    applicationId: unknown;
    contractId: unknown;
    profileName: unknown;
    sourceSchemaLabel?: unknown;
    mappingEntries: unknown;
    notes?: unknown;
    review: boolean;
  }
) {
  const workspaceId = textValue(input.workspaceId, "workspace_id", 80);
  const applicationId = validateFieldMappingApplication(input.applicationId);
  const contract = getFieldMappingContract(input.contractId);
  const profileName = textValue(input.profileName, "profile_name", 120);
  const sourceSchemaLabel = textValue(
    input.sourceSchemaLabel,
    "source_schema_label",
    240,
    false
  );
  const notes = textValue(input.notes, "notes", 4000, false);
  const mappingEntries = normalizeFieldMappingEntries(
    input.mappingEntries,
    contract
  );
  const validation = validateFieldMappingEntries(mappingEntries, contract);

  if (input.review && !validation.completeForReview) {
    throw new Error("field_mapping_review_incomplete");
  }

  const suppliedId = String(input.mappingProfileId ?? "").trim();

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, workspaceId);

    const existing = suppliedId
      ? await client.query<Record<string, unknown>>(
          "select * from app.workspace_field_mapping_profiles where workspace_id=$1 and mapping_profile_id=$2 for update",
          [workspaceId, suppliedId]
        )
      : { rows: [] as Record<string, unknown>[] };

    const current = existing.rows[0] ?? null;
    if (suppliedId && !current) {
      throw new Error("field_mapping_profile_not_found");
    }

    const mappingProfileId = current
      ? String(current.mapping_profile_id)
      : randomUUID();
    const revision = current ? Number(current.revision) + 1 : 1;
    const reviewStatus = input.review ? "reviewed" : "draft";
    const eventType: FieldMappingProfileEvent["eventType"] = !current
      ? "created"
      : input.review
        ? "reviewed"
        : String(current.review_status) === "reviewed"
          ? "reopened"
          : "saved";

    const result = current
      ? await client.query<Record<string, unknown>>(
          `update app.workspace_field_mapping_profiles
           set
             application_id=$3,
             contract_id=$4,
             contract_version=$5,
             schema_fingerprint=$6,
             profile_name=$7,
             source_schema_label=$8,
             mapping_entries=$9::jsonb,
             notes=$10,
             review_status=$11,
             revision=$12,
             reviewed_by=case when $11='reviewed' then $13 else null end,
             reviewed_at=case when $11='reviewed' then now() else null end,
             updated_by=$13,
             updated_at=now()
           where workspace_id=$1 and mapping_profile_id=$2
           returning *`,
          [
            workspaceId,
            mappingProfileId,
            applicationId,
            contract.contractId,
            contract.version,
            contract.schemaFingerprint,
            profileName,
            sourceSchemaLabel,
            JSON.stringify(mappingEntries),
            notes,
            reviewStatus,
            revision,
            userId
          ]
        )
      : await client.query<Record<string, unknown>>(
          `insert into app.workspace_field_mapping_profiles (
             workspace_id,mapping_profile_id,application_id,contract_id,contract_version,
             schema_fingerprint,profile_name,source_schema_label,mapping_entries,notes,
             review_status,revision,reviewed_by,reviewed_at,created_by,updated_by
           ) values (
             $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,
             case when $11='reviewed' then $13 else null end,
             case when $11='reviewed' then now() else null end,
             $13,$13
           )
           returning *`,
          [
            workspaceId,
            mappingProfileId,
            applicationId,
            contract.contractId,
            contract.version,
            contract.schemaFingerprint,
            profileName,
            sourceSchemaLabel,
            JSON.stringify(mappingEntries),
            notes,
            reviewStatus,
            revision,
            userId
          ]
        );

    await appendEvent(client, userId, {
      workspaceId,
      mappingProfileId,
      eventType,
      revision,
      details: {
        applicationId,
        contractId: contract.contractId,
        contractVersion: contract.version,
        schemaFingerprint: contract.schemaFingerprint,
        reviewStatus,
        mappedTargets: validation.mappedTargets,
        totalTargets: validation.totalTargets,
        mappedRequiredTargets: validation.mappedRequiredTargets,
        requiredTargets: validation.requiredTargets,
        profileName
      }
    });

    return rowToProfile(result.rows[0]);
  });
}
