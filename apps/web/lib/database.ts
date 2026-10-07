import { Pool, type PoolClient, type QueryResultRow } from "pg";

const databaseUrl = process.env.DATABASE_URL;

function requireDatabaseUrl() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  return databaseUrl;
}

declare global {
  // eslint-disable-next-line no-var
  var __aiDataAppPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __aiDataAuthPool: Pool | undefined;
}

function createAppPool() {
  return new Pool({
    connectionString: requireDatabaseUrl(),
    max: 5,
    application_name: "ai-data-platform-web"
  });
}

function createAuthPool() {
  return new Pool({
    connectionString: requireDatabaseUrl(),
    max: 5,
    application_name: "ai-data-platform-auth",
    options: "-c search_path=auth,public"
  });
}

const appPool = globalThis.__aiDataAppPool ?? createAppPool();
export const authPool = globalThis.__aiDataAuthPool ?? createAuthPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.__aiDataAppPool = appPool;
  globalThis.__aiDataAuthPool = authPool;
}

export type WorkspaceRole = "owner" | "admin" | "member";

export interface WorkspaceSummary extends QueryResultRow {
  id: string;
  slug: string;
  name: string;
  type: "business" | "personal";
  role: WorkspaceRole;
}


export interface ExtensionSessionPrincipal extends QueryResultRow {
  userId: string;
  name: string;
  email: string;
  extensionId: string;
  expiresAt: Date;
}

export async function createExtensionSession(input: {
  userId: string;
  tokenHash: string;
  extensionId: string;
  expiresAt: Date;
}) {
  await appPool.query(
    `
      insert into app.extension_sessions (
        user_id,
        token_hash,
        extension_id,
        expires_at
      )
      values ($1, $2, $3, $4)
    `,
    [
      input.userId,
      input.tokenHash,
      input.extensionId,
      input.expiresAt
    ]
  );
}

export async function resolveExtensionSession(tokenHash: string) {
  const result = await appPool.query<ExtensionSessionPrincipal>(
    `
      update app.extension_sessions es
      set last_used_at = now()
      from auth."user" u
      where es.token_hash = $1
        and es.user_id = u.id
        and es.revoked_at is null
        and es.expires_at > now()
      returning
        es.user_id as "userId",
        u.name,
        u.email,
        es.extension_id as "extensionId",
        es.expires_at as "expiresAt"
    `,
    [tokenHash]
  );

  return result.rows[0] ?? null;
}

export async function revokeExtensionSession(tokenHash: string) {
  await appPool.query(
    `
      update app.extension_sessions
      set revoked_at = coalesce(revoked_at, now())
      where token_hash = $1
    `,
    [tokenHash]
  );
}

export async function withUserDatabase<T>(
  userId: string,
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await appPool.connect();

  try {
    await client.query("begin");
    await client.query("set local role ai_data_runtime");
    await client.query("select set_config('app.user_id', $1, true)", [userId]);

    const result = await operation(client);
    await client.query("commit");

    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function listWorkspacesForUser(userId: string) {
  return withUserDatabase(userId, async (client) => {
    const result = await client.query<WorkspaceSummary>(`
      select
        w.id,
        w.slug,
        w.name,
        w.type,
        wm.role
      from app.workspaces w
      inner join app.workspace_members wm
        on wm.workspace_id = w.id
      order by w.name
    `);

    return result.rows;
  });
}


export type WorkspaceSyncResource =
  | "saved-scraper"
  | "reviewed-dataset";

export interface WorkspaceSyncServerRecord {
  resource: WorkspaceSyncResource;
  recordId: string;
  workspaceId: string;
  serverVersion: number;
  clientUpdatedAt: string;
  deleted: boolean;
  payload: Record<string, unknown>;
}

export type WorkspaceSyncMutation =
  | {
      resource: "saved-scraper";
      action: "upsert" | "delete";
      recordId: string;
      expectedServerVersion: number | null;
      clientUpdatedAt: string;
      payload: Record<string, unknown> | null;
      kind: "scraper" | "template";
      name: string;
      sourceUrl: string;
      sourceOrigin: string;
    }
  | {
      resource: "reviewed-dataset";
      action: "upsert" | "delete";
      recordId: string;
      expectedServerVersion: number | null;
      clientUpdatedAt: string;
      payload: Record<string, unknown> | null;
      recipeName: string;
      sourceUrl: string;
      retrievedAt: string;
      rowCount: number;
    };

export interface WorkspaceSyncMutationResult {
  status: "applied" | "conflict" | "noop";
  record: WorkspaceSyncServerRecord | null;
}

async function requireWorkspaceAccess(
  client: PoolClient,
  workspaceId: string
) {
  const result = await client.query(
    "select 1 from app.workspaces where id = $1",
    [workspaceId]
  );

  if (!result.rowCount) {
    throw new Error("workspace_access_denied");
  }
}

function savedScraperRowToSyncRecord(
  row: {
    workspace_id: string;
    scraper_id: string;
    server_version: string | number;
    client_updated_at: Date | string;
    deleted_at: Date | string | null;
    payload: Record<string, unknown>;
  }
): WorkspaceSyncServerRecord {
  return {
    resource: "saved-scraper",
    recordId: row.scraper_id,
    workspaceId: row.workspace_id,
    serverVersion: Number(row.server_version),
    clientUpdatedAt: new Date(row.client_updated_at).toISOString(),
    deleted: Boolean(row.deleted_at),
    payload: row.payload
  };
}

function reviewedDatasetRowToSyncRecord(
  row: {
    workspace_id: string;
    dataset_id: string;
    server_version: string | number;
    client_updated_at: Date | string;
    deleted_at: Date | string | null;
    payload: Record<string, unknown>;
  }
): WorkspaceSyncServerRecord {
  return {
    resource: "reviewed-dataset",
    recordId: row.dataset_id,
    workspaceId: row.workspace_id,
    serverVersion: Number(row.server_version),
    clientUpdatedAt: new Date(row.client_updated_at).toISOString(),
    deleted: Boolean(row.deleted_at),
    payload: row.payload
  };
}

export async function listWorkspaceSyncRecords(
  userId: string,
  workspaceId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, workspaceId);

    const [scrapers, datasets] = await Promise.all([
      client.query<{
        workspace_id: string;
        scraper_id: string;
        server_version: string;
        client_updated_at: Date;
        deleted_at: Date | null;
        payload: Record<string, unknown>;
      }>(
        `
          select
            workspace_id,
            scraper_id,
            server_version,
            client_updated_at,
            deleted_at,
            payload
          from app.workspace_saved_scrapers
          where workspace_id = $1
          order by updated_at desc
          limit 1000
        `,
        [workspaceId]
      ),
      client.query<{
        workspace_id: string;
        dataset_id: string;
        server_version: string;
        client_updated_at: Date;
        deleted_at: Date | null;
        payload: Record<string, unknown>;
      }>(
        `
          select
            workspace_id,
            dataset_id,
            server_version,
            client_updated_at,
            deleted_at,
            payload
          from app.workspace_reviewed_datasets
          where workspace_id = $1
          order by updated_at desc
          limit 250
        `,
        [workspaceId]
      )
    ]);

    return [
      ...scrapers.rows.map(savedScraperRowToSyncRecord),
      ...datasets.rows.map(reviewedDatasetRowToSyncRecord)
    ];
  });
}

export async function applyWorkspaceSyncMutation(
  userId: string,
  workspaceId: string,
  mutation: WorkspaceSyncMutation
): Promise<WorkspaceSyncMutationResult> {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, workspaceId);

    if (mutation.resource === "saved-scraper") {
      const existing = await client.query<{
        workspace_id: string;
        scraper_id: string;
        server_version: string;
        client_updated_at: Date;
        deleted_at: Date | null;
        payload: Record<string, unknown>;
      }>(
        `
          select
            workspace_id,
            scraper_id,
            server_version,
            client_updated_at,
            deleted_at,
            payload
          from app.workspace_saved_scrapers
          where workspace_id = $1
            and scraper_id = $2
          for update
        `,
        [workspaceId, mutation.recordId]
      );

      const current = existing.rows[0] ?? null;
      const currentVersion = current ? Number(current.server_version) : null;

      if (
        currentVersion !== null &&
        mutation.expectedServerVersion !== currentVersion
      ) {
        return {
          status: "conflict",
          record: savedScraperRowToSyncRecord(current)
        };
      }

      if (
        currentVersion === null &&
        mutation.expectedServerVersion !== null
      ) {
        return { status: "conflict", record: null };
      }

      if (mutation.action === "delete") {
        if (!current) {
          return { status: "noop", record: null };
        }

        const result = await client.query<{
          workspace_id: string;
          scraper_id: string;
          server_version: string;
          client_updated_at: Date;
          deleted_at: Date | null;
          payload: Record<string, unknown>;
        }>(
          `
            update app.workspace_saved_scrapers
            set
              server_version = server_version + 1,
              client_updated_at = $3,
              deleted_at = now(),
              updated_at = now()
            where workspace_id = $1
              and scraper_id = $2
            returning
              workspace_id,
              scraper_id,
              server_version,
              client_updated_at,
              deleted_at,
              payload
          `,
          [workspaceId, mutation.recordId, mutation.clientUpdatedAt]
        );

        return {
          status: "applied",
          record: savedScraperRowToSyncRecord(result.rows[0])
        };
      }

      if (!mutation.payload) {
        throw new Error("saved_scraper_payload_required");
      }

      if (current) {
        const result = await client.query<{
          workspace_id: string;
          scraper_id: string;
          server_version: string;
          client_updated_at: Date;
          deleted_at: Date | null;
          payload: Record<string, unknown>;
        }>(
          `
            update app.workspace_saved_scrapers
            set
              kind = $3,
              name = $4,
              source_url = $5,
              source_origin = $6,
              client_updated_at = $7,
              payload = $8::jsonb,
              deleted_at = null,
              server_version = server_version + 1,
              updated_at = now()
            where workspace_id = $1
              and scraper_id = $2
            returning
              workspace_id,
              scraper_id,
              server_version,
              client_updated_at,
              deleted_at,
              payload
          `,
          [
            workspaceId,
            mutation.recordId,
            mutation.kind,
            mutation.name,
            mutation.sourceUrl,
            mutation.sourceOrigin,
            mutation.clientUpdatedAt,
            JSON.stringify(mutation.payload)
          ]
        );

        return {
          status: "applied",
          record: savedScraperRowToSyncRecord(result.rows[0])
        };
      }

      const result = await client.query<{
        workspace_id: string;
        scraper_id: string;
        server_version: string;
        client_updated_at: Date;
        deleted_at: Date | null;
        payload: Record<string, unknown>;
      }>(
        `
          insert into app.workspace_saved_scrapers (
            workspace_id,
            scraper_id,
            kind,
            name,
            source_url,
            source_origin,
            client_updated_at,
            payload
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
          returning
            workspace_id,
            scraper_id,
            server_version,
            client_updated_at,
            deleted_at,
            payload
        `,
        [
          workspaceId,
          mutation.recordId,
          mutation.kind,
          mutation.name,
          mutation.sourceUrl,
          mutation.sourceOrigin,
          mutation.clientUpdatedAt,
          JSON.stringify(mutation.payload)
        ]
      );

      return {
        status: "applied",
        record: savedScraperRowToSyncRecord(result.rows[0])
      };
    }

    const existing = await client.query<{
      workspace_id: string;
      dataset_id: string;
      server_version: string;
      client_updated_at: Date;
      deleted_at: Date | null;
      payload: Record<string, unknown>;
    }>(
      `
        select
          workspace_id,
          dataset_id,
          server_version,
          client_updated_at,
          deleted_at,
          payload
        from app.workspace_reviewed_datasets
        where workspace_id = $1
          and dataset_id = $2
        for update
      `,
      [workspaceId, mutation.recordId]
    );

    const current = existing.rows[0] ?? null;
    const currentVersion = current ? Number(current.server_version) : null;

    if (
      currentVersion !== null &&
      mutation.expectedServerVersion !== currentVersion
    ) {
      return {
        status: "conflict",
        record: reviewedDatasetRowToSyncRecord(current)
      };
    }

    if (
      currentVersion === null &&
      mutation.expectedServerVersion !== null
    ) {
      return { status: "conflict", record: null };
    }

    if (mutation.action === "delete") {
      if (!current) {
        return { status: "noop", record: null };
      }

      const result = await client.query<{
        workspace_id: string;
        dataset_id: string;
        server_version: string;
        client_updated_at: Date;
        deleted_at: Date | null;
        payload: Record<string, unknown>;
      }>(
        `
          update app.workspace_reviewed_datasets
          set
            server_version = server_version + 1,
            client_updated_at = $3,
            deleted_at = now(),
            updated_at = now()
          where workspace_id = $1
            and dataset_id = $2
          returning
            workspace_id,
            dataset_id,
            server_version,
            client_updated_at,
            deleted_at,
            payload
        `,
        [workspaceId, mutation.recordId, mutation.clientUpdatedAt]
      );

      return {
        status: "applied",
        record: reviewedDatasetRowToSyncRecord(result.rows[0])
      };
    }

    if (!mutation.payload) {
      throw new Error("reviewed_dataset_payload_required");
    }

    if (current) {
      const result = await client.query<{
        workspace_id: string;
        dataset_id: string;
        server_version: string;
        client_updated_at: Date;
        deleted_at: Date | null;
        payload: Record<string, unknown>;
      }>(
        `
          update app.workspace_reviewed_datasets
          set
            recipe_name = $3,
            source_url = $4,
            retrieved_at = $5,
            client_updated_at = $6,
            row_count = $7,
            payload = $8::jsonb,
            deleted_at = null,
            server_version = server_version + 1,
            updated_at = now()
          where workspace_id = $1
            and dataset_id = $2
          returning
            workspace_id,
            dataset_id,
            server_version,
            client_updated_at,
            deleted_at,
            payload
        `,
        [
          workspaceId,
          mutation.recordId,
          mutation.recipeName,
          mutation.sourceUrl,
          mutation.retrievedAt,
          mutation.clientUpdatedAt,
          mutation.rowCount,
          JSON.stringify(mutation.payload)
        ]
      );

      return {
        status: "applied",
        record: reviewedDatasetRowToSyncRecord(result.rows[0])
      };
    }

    const result = await client.query<{
      workspace_id: string;
      dataset_id: string;
      server_version: string;
      client_updated_at: Date;
      deleted_at: Date | null;
      payload: Record<string, unknown>;
    }>(
      `
        insert into app.workspace_reviewed_datasets (
          workspace_id,
          dataset_id,
          recipe_name,
          source_url,
          retrieved_at,
          client_updated_at,
          row_count,
          payload
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        returning
          workspace_id,
          dataset_id,
          server_version,
          client_updated_at,
          deleted_at,
          payload
      `,
      [
        workspaceId,
        mutation.recordId,
        mutation.recipeName,
        mutation.sourceUrl,
        mutation.retrievedAt,
        mutation.clientUpdatedAt,
        mutation.rowCount,
        JSON.stringify(mutation.payload)
      ]
    );

    return {
      status: "applied",
      record: reviewedDatasetRowToSyncRecord(result.rows[0])
    };
  });
}


export type IntelligenceModuleKey =
  | "history"
  | "rosie-competitive"
  | "devil-supplier"
  | "movie-metadata"
  | "scheduled-jobs"
  | "source-policy"
  | "business-integrations";

export interface WorkspaceIntelligenceModuleRecord extends QueryResultRow {
  workspaceId: string;
  moduleKey: IntelligenceModuleKey;
  serverVersion: number;
  clientUpdatedAt: Date;
  summary: Record<string, unknown>;
  payload: Record<string, unknown>;
  updatedAt: Date;
}

export interface WorkspaceIntelligenceAuditRecord extends QueryResultRow {
  workspaceId: string;
  auditId: string;
  batchId: string;
  target: "rosie-dazzlers" | "devil-n-dove";
  action: "dry-run-created" | "approved" | "exported" | "cancelled";
  occurredAt: Date;
  fingerprint: string;
  details: string;
  payload: Record<string, unknown>;
}

export interface WorkspaceIntelligenceMutation {
  moduleKey: IntelligenceModuleKey;
  expectedServerVersion: number | null;
  clientUpdatedAt: string;
  summary: Record<string, unknown>;
  payload: Record<string, unknown>;
}

export interface WorkspaceIntelligenceMutationResult {
  status: "applied" | "conflict";
  record: WorkspaceIntelligenceModuleRecord;
}

function intelligenceRow(
  row: {
    workspace_id: string;
    module_key: IntelligenceModuleKey;
    server_version: string | number;
    client_updated_at: Date;
    summary: Record<string, unknown>;
    payload: Record<string, unknown>;
    updated_at: Date;
  }
): WorkspaceIntelligenceModuleRecord {
  return {
    workspaceId: row.workspace_id,
    moduleKey: row.module_key,
    serverVersion: Number(row.server_version),
    clientUpdatedAt: row.client_updated_at,
    summary: row.summary,
    payload: row.payload,
    updatedAt: row.updated_at
  };
}

function auditRow(
  row: {
    workspace_id: string;
    audit_id: string;
    batch_id: string;
    target: "rosie-dazzlers" | "devil-n-dove";
    action: "dry-run-created" | "approved" | "exported" | "cancelled";
    occurred_at: Date;
    fingerprint: string;
    details: string;
    payload: Record<string, unknown>;
  }
): WorkspaceIntelligenceAuditRecord {
  return {
    workspaceId: row.workspace_id,
    auditId: row.audit_id,
    batchId: row.batch_id,
    target: row.target,
    action: row.action,
    occurredAt: row.occurred_at,
    fingerprint: row.fingerprint,
    details: row.details,
    payload: row.payload
  };
}

export async function listWorkspaceIntelligence(
  userId: string,
  workspaceId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, workspaceId);

    const [modules, audit] = await Promise.all([
      client.query<{
        workspace_id: string;
        module_key: IntelligenceModuleKey;
        server_version: string;
        client_updated_at: Date;
        summary: Record<string, unknown>;
        payload: Record<string, unknown>;
        updated_at: Date;
      }>(
        `
          select
            workspace_id,
            module_key,
            server_version,
            client_updated_at,
            summary,
            payload,
            updated_at
          from app.workspace_intelligence_modules
          where workspace_id = $1
          order by module_key
        `,
        [workspaceId]
      ),
      client.query<{
        workspace_id: string;
        audit_id: string;
        batch_id: string;
        target: "rosie-dazzlers" | "devil-n-dove";
        action: "dry-run-created" | "approved" | "exported" | "cancelled";
        occurred_at: Date;
        fingerprint: string;
        details: string;
        payload: Record<string, unknown>;
      }>(
        `
          select
            workspace_id,
            audit_id,
            batch_id,
            target,
            action,
            occurred_at,
            fingerprint,
            details,
            payload
          from app.workspace_intelligence_audit
          where workspace_id = $1
          order by occurred_at desc
          limit 250
        `,
        [workspaceId]
      )
    ]);

    return {
      modules: modules.rows.map(intelligenceRow),
      audit: audit.rows.map(auditRow)
    };
  });
}

export async function listIntelligenceOverviewForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const overviews = [];

  for (const workspace of workspaces) {
    const state = await listWorkspaceIntelligence(userId, workspace.id);
    overviews.push({
      workspace,
      modules: state.modules,
      audit: state.audit
    });
  }

  return overviews;
}

export async function upsertWorkspaceIntelligenceModule(
  userId: string,
  workspaceId: string,
  mutation: WorkspaceIntelligenceMutation
): Promise<WorkspaceIntelligenceMutationResult> {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, workspaceId);

    const existing = await client.query<{
      workspace_id: string;
      module_key: IntelligenceModuleKey;
      server_version: string;
      client_updated_at: Date;
      summary: Record<string, unknown>;
      payload: Record<string, unknown>;
      updated_at: Date;
    }>(
      `
        select
          workspace_id,
          module_key,
          server_version,
          client_updated_at,
          summary,
          payload,
          updated_at
        from app.workspace_intelligence_modules
        where workspace_id = $1
          and module_key = $2
        for update
      `,
      [workspaceId, mutation.moduleKey]
    );

    const current = existing.rows[0] ?? null;
    const currentVersion = current ? Number(current.server_version) : null;

    if (
      currentVersion !== null &&
      mutation.expectedServerVersion !== currentVersion
    ) {
      return {
        status: "conflict",
        record: intelligenceRow(current)
      };
    }

    if (
      currentVersion === null &&
      mutation.expectedServerVersion !== null
    ) {
      throw new Error("intelligence_version_missing");
    }

    if (current) {
      const result = await client.query<{
        workspace_id: string;
        module_key: IntelligenceModuleKey;
        server_version: string;
        client_updated_at: Date;
        summary: Record<string, unknown>;
        payload: Record<string, unknown>;
        updated_at: Date;
      }>(
        `
          update app.workspace_intelligence_modules
          set
            client_updated_at = $3,
            summary = $4::jsonb,
            payload = $5::jsonb,
            server_version = server_version + 1,
            updated_at = now()
          where workspace_id = $1
            and module_key = $2
          returning
            workspace_id,
            module_key,
            server_version,
            client_updated_at,
            summary,
            payload,
            updated_at
        `,
        [
          workspaceId,
          mutation.moduleKey,
          mutation.clientUpdatedAt,
          JSON.stringify(mutation.summary),
          JSON.stringify(mutation.payload)
        ]
      );

      return {
        status: "applied",
        record: intelligenceRow(result.rows[0])
      };
    }

    const result = await client.query<{
      workspace_id: string;
      module_key: IntelligenceModuleKey;
      server_version: string;
      client_updated_at: Date;
      summary: Record<string, unknown>;
      payload: Record<string, unknown>;
      updated_at: Date;
    }>(
      `
        insert into app.workspace_intelligence_modules (
          workspace_id,
          module_key,
          client_updated_at,
          summary,
          payload
        )
        values ($1, $2, $3, $4::jsonb, $5::jsonb)
        returning
          workspace_id,
          module_key,
          server_version,
          client_updated_at,
          summary,
          payload,
          updated_at
      `,
      [
        workspaceId,
        mutation.moduleKey,
        mutation.clientUpdatedAt,
        JSON.stringify(mutation.summary),
        JSON.stringify(mutation.payload)
      ]
    );

    return {
      status: "applied",
      record: intelligenceRow(result.rows[0])
    };
  });
}

export async function appendWorkspaceIntelligenceAudit(
  userId: string,
  workspaceId: string,
  entries: Array<{
    auditId: string;
    batchId: string;
    target: "rosie-dazzlers" | "devil-n-dove";
    action: "dry-run-created" | "approved" | "exported" | "cancelled";
    occurredAt: string;
    fingerprint: string;
    details: string;
    payload: Record<string, unknown>;
  }>
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, workspaceId);

    let inserted = 0;

    for (const entry of entries.slice(0, 250)) {
      const result = await client.query(
        `
          insert into app.workspace_intelligence_audit (
            workspace_id,
            audit_id,
            batch_id,
            target,
            action,
            occurred_at,
            fingerprint,
            details,
            payload
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
          on conflict (workspace_id, audit_id) do nothing
        `,
        [
          workspaceId,
          entry.auditId,
          entry.batchId,
          entry.target,
          entry.action,
          entry.occurredAt,
          entry.fingerprint,
          entry.details.slice(0, 1000),
          JSON.stringify(entry.payload)
        ]
      );
      inserted += result.rowCount ?? 0;
    }

    return inserted;
  });
}


export interface WorkspaceBarcodeCapture extends QueryResultRow {
  workspaceId: string;
  captureId: string;
  target: "personal-movie" | "devil-supplier";
  rawCode: string;
  normalizedCode: string;
  barcodeFormat: string;
  captureMethod: "camera" | "manual";
  capturedAt: Date;
  provenance: Record<string, unknown>;
  matchStatus: "exact" | "unmatched" | "duplicate";
  matchPayload: Record<string, unknown>;
  reviewStatus: "pending" | "approved" | "rejected";
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function barcodeCaptureRow(row: {
  workspace_id: string;
  capture_id: string;
  target: "personal-movie" | "devil-supplier";
  raw_code: string;
  normalized_code: string;
  barcode_format: string;
  capture_method: "camera" | "manual";
  captured_at: Date;
  provenance: Record<string, unknown>;
  match_status: "exact" | "unmatched" | "duplicate";
  match_payload: Record<string, unknown>;
  review_status: "pending" | "approved" | "rejected";
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}): WorkspaceBarcodeCapture {
  return {
    workspaceId: row.workspace_id,
    captureId: row.capture_id,
    target: row.target,
    rawCode: row.raw_code,
    normalizedCode: row.normalized_code,
    barcodeFormat: row.barcode_format,
    captureMethod: row.capture_method,
    capturedAt: row.captured_at,
    provenance: row.provenance,
    matchStatus: row.match_status,
    matchPayload: row.match_payload,
    reviewStatus: row.review_status,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function requireBarcodeTargetWorkspace(
  client: PoolClient,
  workspaceId: string,
  target: "personal-movie" | "devil-supplier"
) {
  await requireWorkspaceAccess(client, workspaceId);

  const result = await client.query<{ slug: string; type: "business" | "personal" }>(
    "select slug, type from app.workspaces where id = $1",
    [workspaceId]
  );
  const workspace = result.rows[0];

  const allowed =
    target === "personal-movie"
      ? workspace?.slug === "personal" && workspace.type === "personal"
      : workspace?.slug === "devilndove" && workspace.type === "business";

  if (!allowed) {
    throw new Error("barcode_target_workspace_mismatch");
  }
}

export async function listWorkspaceBarcodeCaptures(
  userId: string,
  workspaceId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, workspaceId);
    const result = await client.query<{
      workspace_id: string;
      capture_id: string;
      target: "personal-movie" | "devil-supplier";
      raw_code: string;
      normalized_code: string;
      barcode_format: string;
      capture_method: "camera" | "manual";
      captured_at: Date;
      provenance: Record<string, unknown>;
      match_status: "exact" | "unmatched" | "duplicate";
      match_payload: Record<string, unknown>;
      review_status: "pending" | "approved" | "rejected";
      reviewed_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `
        select
          workspace_id,
          capture_id,
          target,
          raw_code,
          normalized_code,
          barcode_format,
          capture_method,
          captured_at,
          provenance,
          match_status,
          match_payload,
          review_status,
          reviewed_at,
          created_at,
          updated_at
        from app.workspace_barcode_captures
        where workspace_id = $1
        order by created_at desc
        limit 250
      `,
      [workspaceId]
    );

    return result.rows.map(barcodeCaptureRow);
  });
}

export async function createWorkspaceBarcodeCapture(
  userId: string,
  input: {
    workspaceId: string;
    captureId: string;
    target: "personal-movie" | "devil-supplier";
    rawCode: string;
    normalizedCode: string;
    barcodeFormat: string;
    captureMethod: "camera" | "manual";
    capturedAt: string;
    provenance: Record<string, unknown>;
    matchSuggestion: (payload: Record<string, unknown> | null) => {
      status: "exact" | "unmatched";
      payload: Record<string, unknown>;
    };
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireBarcodeTargetWorkspace(
      client,
      input.workspaceId,
      input.target
    );

    const duplicate = await client.query<{ capture_id: string }>(
      `
        select capture_id
        from app.workspace_barcode_captures
        where workspace_id = $1
          and target = $2
          and normalized_code = $3
          and review_status <> 'rejected'
        order by created_at desc
        limit 1
      `,
      [input.workspaceId, input.target, input.normalizedCode]
    );

    let matchStatus: "exact" | "unmatched" | "duplicate";
    let matchPayload: Record<string, unknown>;

    if (duplicate.rows[0]) {
      matchStatus = "duplicate";
      matchPayload = {
        reason:
          "This normalized barcode already exists in the active intake queue.",
        duplicateCaptureId: duplicate.rows[0].capture_id
      };
    } else {
      const moduleKey =
        input.target === "personal-movie"
          ? "movie-metadata"
          : "devil-supplier";
      const intelligence = await client.query<{
        payload: Record<string, unknown>;
      }>(
        `
          select payload
          from app.workspace_intelligence_modules
          where workspace_id = $1
            and module_key = $2
          limit 1
        `,
        [input.workspaceId, moduleKey]
      );
      const suggestion = input.matchSuggestion(
        intelligence.rows[0]?.payload ?? null
      );
      matchStatus = suggestion.status;
      matchPayload = suggestion.payload;
    }

    const result = await client.query<{
      workspace_id: string;
      capture_id: string;
      target: "personal-movie" | "devil-supplier";
      raw_code: string;
      normalized_code: string;
      barcode_format: string;
      capture_method: "camera" | "manual";
      captured_at: Date;
      provenance: Record<string, unknown>;
      match_status: "exact" | "unmatched" | "duplicate";
      match_payload: Record<string, unknown>;
      review_status: "pending" | "approved" | "rejected";
      reviewed_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `
        insert into app.workspace_barcode_captures (
          workspace_id,
          capture_id,
          target,
          raw_code,
          normalized_code,
          barcode_format,
          capture_method,
          captured_at,
          provenance,
          match_status,
          match_payload
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11::jsonb)
        returning
          workspace_id,
          capture_id,
          target,
          raw_code,
          normalized_code,
          barcode_format,
          capture_method,
          captured_at,
          provenance,
          match_status,
          match_payload,
          review_status,
          reviewed_at,
          created_at,
          updated_at
      `,
      [
        input.workspaceId,
        input.captureId,
        input.target,
        input.rawCode,
        input.normalizedCode,
        input.barcodeFormat,
        input.captureMethod,
        input.capturedAt,
        JSON.stringify(input.provenance),
        matchStatus,
        JSON.stringify(matchPayload)
      ]
    );

    return barcodeCaptureRow(result.rows[0]);
  });
}

export async function reviewWorkspaceBarcodeCapture(
  userId: string,
  input: {
    workspaceId: string;
    captureId: string;
    reviewStatus: "approved" | "rejected";
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAccess(client, input.workspaceId);

    const current = await client.query<{
      target: "personal-movie" | "devil-supplier";
      match_status: "exact" | "unmatched" | "duplicate";
    }>(
      `
        select target, match_status
        from app.workspace_barcode_captures
        where workspace_id = $1
          and capture_id = $2
        for update
      `,
      [input.workspaceId, input.captureId]
    );

    if (!current.rows[0]) {
      throw new Error("barcode_capture_not_found");
    }
    await requireBarcodeTargetWorkspace(
      client,
      input.workspaceId,
      current.rows[0].target
    );
    if (
      input.reviewStatus === "approved" &&
      current.rows[0].match_status === "duplicate"
    ) {
      throw new Error("duplicate_barcode_cannot_be_approved");
    }

    const result = await client.query<{
      workspace_id: string;
      capture_id: string;
      target: "personal-movie" | "devil-supplier";
      raw_code: string;
      normalized_code: string;
      barcode_format: string;
      capture_method: "camera" | "manual";
      captured_at: Date;
      provenance: Record<string, unknown>;
      match_status: "exact" | "unmatched" | "duplicate";
      match_payload: Record<string, unknown>;
      review_status: "pending" | "approved" | "rejected";
      reviewed_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `
        update app.workspace_barcode_captures
        set
          review_status = $3,
          reviewed_at = now(),
          updated_at = now()
        where workspace_id = $1
          and capture_id = $2
        returning
          workspace_id,
          capture_id,
          target,
          raw_code,
          normalized_code,
          barcode_format,
          capture_method,
          captured_at,
          provenance,
          match_status,
          match_payload,
          review_status,
          reviewed_at,
          created_at,
          updated_at
      `,
      [input.workspaceId, input.captureId, input.reviewStatus]
    );

    return barcodeCaptureRow(result.rows[0]);
  });
}

export async function bootstrapFirstOwner(userId: string) {
  const client = await appPool.connect();

  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext('ai-data-platform:first-owner'))");

    const ownerCount = await client.query<{ count: string }>(
      "select count(*)::text as count from app.workspace_members where role = 'owner'"
    );

    if (ownerCount.rows[0]?.count === "0") {
      await client.query(
        `
          insert into app.workspace_members (workspace_id, user_id, role)
          select id, $1, 'owner'
          from app.workspaces
          on conflict (workspace_id, user_id) do nothing
        `,
        [userId]
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabasePools() {
  await Promise.all([appPool.end(), authPool.end()]);
}
