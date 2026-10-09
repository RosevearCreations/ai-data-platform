import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const auth = await readFile(resolve("lib/auth.ts"), "utf8");
  const database = await readFile(resolve("lib/database.ts"), "utf8");
  const readiness = await readFile(
    resolve("app/api/readiness/database/route.ts"),
    "utf8"
  );

  assert(
    auth.includes("validateSchema: false"),
    "Production auth must not perform eager Better Auth schema validation during builds."
  );
  assert(
    auth.includes('schemaName: "auth"') &&
      auth.includes('new PostgresDialect({ pool: authPool })'),
    "Better Auth must explicitly qualify the auth schema for pooled PostgreSQL connections."
  );
  assert(
    !database.includes('options: "-c search_path=auth,public"'),
    "Pooled Better Auth connections must not depend on PostgreSQL startup search_path options."
  );
  assert(
    database.includes("checkProductionDatabaseReadiness"),
    "Database readiness helper is missing."
  );
  assert(
    readiness.includes("status: readiness.ready ? 200 : 503"),
    "Database readiness route must fail closed with HTTP 503."
  );
  assert(
    readiness.includes('"Cache-Control": "no-store"'),
    "Database readiness responses must not be cached."
  );

  console.log(
    "Production deployment hardening: auth build isolation and database readiness checks passed."
  );
}

void main();
