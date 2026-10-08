import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import {
  buildWorkspaceProfileConfiguration,
  normalizeProfileToken,
  normalizeWorkspaceSlug,
  parseWorkspaceProfileDraft,
  type WorkspaceType
} from "./workspace-profiles";
import {
  listWorkspacesForUser,
  withUserDatabase,
  type WorkspaceSummary
} from "./database";

export interface WorkspaceProfileRecord {
  profileKey: string;
  name: string;
  description: string;
  workspaceType: WorkspaceType;
  normalizationFields: Record<string, unknown>[];
  reviewDimensions: Record<string, unknown>[];
  provenancePolicy: Record<string, unknown>;
  historyPolicy: Record<string, unknown>;
  reviewPolicy: Record<string, unknown>;
  templates: Record<string, unknown>[];
  capabilities: Record<string, boolean>;
  isBuiltin: boolean;
  createdBy: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function profileRow(row: QueryResultRow): WorkspaceProfileRecord {
  return {
    profileKey: String(row.profile_key),
    name: String(row.name),
    description: String(row.description),
    workspaceType: row.workspace_type as WorkspaceType,
    normalizationFields: Array.isArray(row.normalization_fields)
      ? (row.normalization_fields as Record<string, unknown>[])
      : [],
    reviewDimensions: Array.isArray(row.review_dimensions)
      ? (row.review_dimensions as Record<string, unknown>[])
      : [],
    provenancePolicy:
      row.provenance_policy && typeof row.provenance_policy === "object"
        ? (row.provenance_policy as Record<string, unknown>)
        : {},
    historyPolicy:
      row.history_policy && typeof row.history_policy === "object"
        ? (row.history_policy as Record<string, unknown>)
        : {},
    reviewPolicy:
      row.review_policy && typeof row.review_policy === "object"
        ? (row.review_policy as Record<string, unknown>)
        : {},
    templates: Array.isArray(row.templates)
      ? (row.templates as Record<string, unknown>[])
      : [],
    capabilities:
      row.capabilities && typeof row.capabilities === "object"
        ? (row.capabilities as Record<string, boolean>)
        : {},
    isBuiltin: Boolean(row.is_builtin),
    createdBy: row.created_by ? String(row.created_by) : null,
    archivedAt: row.archived_at ? new Date(row.archived_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

async function requireProfileManager(client: PoolClient) {
  const result = await client.query(
    "select 1 from app.workspace_members where user_id = nullif(current_setting('app.user_id', true), '') and role in ('owner','admin') limit 1"
  );
  if (!result.rowCount) throw new Error("workspace_profile_manager_required");
}

async function requireWorkspaceManager(
  client: PoolClient,
  workspaceId: string
) {
  const result = await client.query<{ role: string }>(
    "select role from app.workspace_members where workspace_id = $1 and user_id = nullif(current_setting('app.user_id', true), '') limit 1",
    [workspaceId]
  );
  if (
    result.rows[0]?.role !== "owner" &&
    result.rows[0]?.role !== "admin"
  ) {
    throw new Error("workspace_admin_required");
  }
}

export async function listWorkspaceProfilesForUser(
  userId: string,
  options: { includeArchived?: boolean } = {}
) {
  return withUserDatabase(userId, async (client) => {
    const result = await client.query(
      "select * from app.workspace_profiles where ($1::boolean = true or archived_at is null) order by is_builtin desc, name",
      [options.includeArchived ?? false]
    );
    return result.rows.map(profileRow);
  });
}

export async function createCustomWorkspaceProfile(
  userId: string,
  value: unknown
) {
  const draft = parseWorkspaceProfileDraft(value);
  const config = buildWorkspaceProfileConfiguration(draft);
  const keyBase =
    normalizeProfileToken(draft.name).replaceAll("_", "-") || "custom";
  const profileKey =
    "custom-" + keyBase.slice(0, 32) + "-" + randomUUID().slice(0, 8);

  return withUserDatabase(userId, async (client) => {
    await requireProfileManager(client);
    const result = await client.query(
      `
        insert into app.workspace_profiles (
          profile_key, name, description, workspace_type,
          normalization_fields, review_dimensions, provenance_policy,
          history_policy, review_policy, templates, capabilities,
          is_builtin, created_by
        )
        values (
          $1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,
          $9::jsonb,$10::jsonb,$11::jsonb,false,$12
        )
        returning *
      `,
      [
        profileKey,
        draft.name,
        draft.description,
        draft.workspaceType,
        JSON.stringify(config.normalizationFields),
        JSON.stringify(config.reviewDimensions),
        JSON.stringify(config.provenancePolicy),
        JSON.stringify(config.historyPolicy),
        JSON.stringify(config.reviewPolicy),
        JSON.stringify(config.templates),
        JSON.stringify(config.capabilities),
        userId
      ]
    );
    return profileRow(result.rows[0]);
  });
}

export async function updateCustomWorkspaceProfile(
  userId: string,
  profileKey: string,
  value: unknown
) {
  return withUserDatabase(userId, async (client) => {
    await requireProfileManager(client);
    const current = await client.query(
      "select * from app.workspace_profiles where profile_key = $1 for update",
      [profileKey]
    );
    if (!current.rows[0]) throw new Error("workspace_profile_not_found");
    const existing = profileRow(current.rows[0]);
    if (existing.isBuiltin) throw new Error("builtin_workspace_profile_immutable");
    if (existing.archivedAt) throw new Error("workspace_profile_archived");

    const draft = parseWorkspaceProfileDraft(value, {
      fixedWorkspaceType: existing.workspaceType
    });
    const config = buildWorkspaceProfileConfiguration(draft);
    const result = await client.query(
      `
        update app.workspace_profiles
        set name=$2, description=$3,
          normalization_fields=$4::jsonb, review_dimensions=$5::jsonb,
          provenance_policy=$6::jsonb, history_policy=$7::jsonb,
          review_policy=$8::jsonb, templates=$9::jsonb,
          capabilities=$10::jsonb, updated_at=now()
        where profile_key=$1
        returning *
      `,
      [
        profileKey,
        draft.name,
        draft.description,
        JSON.stringify(config.normalizationFields),
        JSON.stringify(config.reviewDimensions),
        JSON.stringify(config.provenancePolicy),
        JSON.stringify(config.historyPolicy),
        JSON.stringify(config.reviewPolicy),
        JSON.stringify(config.templates),
        JSON.stringify(config.capabilities)
      ]
    );
    if (!result.rows[0]) throw new Error("workspace_profile_not_editable");
    return profileRow(result.rows[0]);
  });
}

export async function archiveCustomWorkspaceProfile(
  userId: string,
  profileKey: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireProfileManager(client);
    const result = await client.query(
      "update app.workspace_profiles set archived_at=coalesce(archived_at,now()), updated_at=now() where profile_key=$1 and is_builtin=false returning *",
      [profileKey]
    );
    if (!result.rows[0]) throw new Error("workspace_profile_not_editable");
    return profileRow(result.rows[0]);
  });
}

export async function createWorkspaceFromProfile(
  userId: string,
  input: { name: string; purpose: string; profileKey: string }
): Promise<WorkspaceSummary> {
  const name = input.name.trim().slice(0, 120);
  if (name.length < 2) throw new Error("workspace_name_invalid");
  const slugBase = normalizeWorkspaceSlug(name) || "workspace";
  const slug =
    (slugBase.slice(0, 42) + "-" + randomUUID().slice(0, 8)).slice(0, 63);

  await withUserDatabase(userId, async (client) => {
    await requireProfileManager(client);
    const result = await client.query<{ id: string }>(
      "select app.create_profiled_workspace($1,$2,$3,$4) as id",
      [slug, name, input.purpose.trim().slice(0, 1000), input.profileKey.trim()]
    );
    if (!result.rows[0]?.id) throw new Error("workspace_create_failed");
  });

  const workspaces = await listWorkspacesForUser(userId);
  const created = workspaces.find((workspace) => workspace.slug === slug);
  if (!created) throw new Error("workspace_create_visibility_failed");
  return created;
}

export async function updateWorkspaceMetadata(
  userId: string,
  input: { workspaceId: string; name: string; purpose: string }
) {
  const name = input.name.trim().slice(0, 120);
  if (name.length < 2) throw new Error("workspace_name_invalid");
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceManager(client, input.workspaceId);
    const result = await client.query(
      "update app.workspaces set name=$2, purpose=$3, updated_at=now() where id=$1 and archived_at is null returning id",
      [input.workspaceId, name, input.purpose.trim().slice(0, 1000)]
    );
    if (!result.rows[0]) throw new Error("workspace_not_found");
    return { id: String(result.rows[0].id) };
  });
}

export async function archiveWorkspace(
  userId: string,
  workspaceId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceManager(client, workspaceId);
    const result = await client.query(
      "update app.workspaces set archived_at=coalesce(archived_at,now()), updated_at=now() where id=$1 returning id",
      [workspaceId]
    );
    if (!result.rows[0]) throw new Error("workspace_not_found");
    return { id: String(result.rows[0].id), archived: true as const };
  });
}
