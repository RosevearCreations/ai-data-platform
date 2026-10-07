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
        \`
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
        \`,
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
        \`
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
        \`,
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
        \`
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
        \`,
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
          \`
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
          \`,
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
          \`
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
          \`,
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
        \`
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
        \`,
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
      \`
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
      \`,
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
        \`
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
        \`,
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
        \`
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
        \`,
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
      \`
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
      \`,
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
