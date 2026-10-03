import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { getMigrations } from "better-auth/db/migration";
import { Pool } from "pg";

import { auth } from "../lib/auth";
import { closeDatabasePools } from "../lib/database";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const adminPool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  application_name: "ai-data-platform-migrations"
});

async function prepareDatabase() {
  const client = await adminPool.connect();

  try {
    await client.query("begin");
    await client.query("create schema if not exists auth");
    await client.query("create schema if not exists app");

    await client.query(`
      do $$
      begin
        if not exists (
          select 1
          from pg_roles
          where rolname = 'ai_data_runtime'
        ) then
          create role ai_data_runtime nologin;
        end if;
      end
      $$;
    `);

    await client.query("grant ai_data_runtime to current_user");

    await client.query(`
      create table if not exists app.schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function migrateAuthSchema() {
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
}

async function migrateApplicationSchema() {
  const migrationsDirectory = resolve(
    process.cwd(),
    "../../db/migrations"
  );

  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const migrationFile of migrationFiles) {
    const alreadyApplied = await adminPool.query<{ exists: boolean }>(
      "select exists(select 1 from app.schema_migrations where name = $1)",
      [migrationFile]
    );

    if (alreadyApplied.rows[0]?.exists) {
      continue;
    }

    const sql = await readFile(
      resolve(migrationsDirectory, migrationFile),
      "utf8"
    );

    const client = await adminPool.connect();

    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into app.schema_migrations (name) values ($1)",
        [migrationFile]
      );
      await client.query("commit");
      console.log(`Applied ${migrationFile}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
}

async function main() {
  await prepareDatabase();
  await migrateAuthSchema();
  await migrateApplicationSchema();

  console.log("Database migrations complete.");
}

async function run() {
  try {
    await main();
  } finally {
    await Promise.allSettled([
      adminPool.end(),
      closeDatabasePools()
    ]);
  }
}

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
