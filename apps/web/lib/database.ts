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
