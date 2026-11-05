import pg from "pg";

// Intentionally restricted to the throwaway CI-local Postgres service.
// Never create databases on a remote, shared, or production server.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Missing CI DATABASE_URL");
const source = new URL(connectionString);
if (
  !["127.0.0.1", "localhost"].includes(source.hostname) ||
  source.port !== "5432" ||
  source.pathname !== "/ai_data_platform_test" ||
  source.username !== "postgres"
) {
  throw new Error("Legacy audit database creation requires the CI-local test database");
}

const client = new pg.Client({ connectionString });
try {
  await client.connect();
  await client.query("CREATE DATABASE ai_data_platform_legacy_test");
  process.stdout.write("Created isolated CI-local legacy audit database\n");
} finally {
  await client.end();
}
