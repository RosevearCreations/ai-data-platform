import { authPool, closeDatabasePools } from "../lib/database";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const tables = await authPool.query<{
    table_name: string;
    rowsecurity: boolean;
  }>(
    "select c.relname as table_name,c.relrowsecurity as rowsecurity " +
      "from pg_class c join pg_namespace n on n.oid=c.relnamespace " +
      "where n.nspname='app' and c.relname in (" +
      "'workspace_second_recurrence_exception_triage_cycles'," +
      "'workspace_successor_generation_corrective_delivery_plans')"
  );
  assert(tables.rows.length === 2, "Build 065 tables must exist.");
  assert(
    tables.rows.every((row) => row.rowsecurity),
    "Build 065 tables must have RLS enabled."
  );

  const policies = await authPool.query<{ policyname: string }>(
    "select policyname from pg_policies where schemaname='app' and policyname in (" +
      "'second_recurrence_triage_member_select'," +
      "'second_recurrence_triage_manager_insert'," +
      "'second_recurrence_triage_manager_update'," +
      "'successor_generation_plan_member_select'," +
      "'successor_generation_plan_manager_insert'," +
      "'successor_generation_plan_manager_update')"
  );
  assert(
    policies.rows.length === 6,
    "Build 065 intended RLS policies must exist."
  );

  const tableGrants = await authPool.query<{
    table_name: string;
    privilege_type: string;
  }>(
    "select table_name,privilege_type from information_schema.role_table_grants " +
      "where table_schema='app' and grantee='ai_data_runtime' and table_name in (" +
      "'workspace_second_recurrence_exception_triage_cycles'," +
      "'workspace_successor_generation_corrective_delivery_plans')"
  );

  for (const table of [
    "workspace_second_recurrence_exception_triage_cycles",
    "workspace_successor_generation_corrective_delivery_plans"
  ]) {
    const privileges = new Set(
      tableGrants.rows
        .filter((row) => row.table_name === table)
        .map((row) => row.privilege_type)
    );
    assert(
      privileges.has("SELECT") && privileges.has("INSERT"),
      table + " SELECT/INSERT grants are incomplete."
    );
    assert(
      !privileges.has("UPDATE"),
      table + " must not grant unrestricted UPDATE."
    );
    assert(!privileges.has("DELETE"), table + " must not grant DELETE.");
  }

  const columnGrants = await authPool.query<{
    table_name: string;
    column_name: string;
  }>(
    "select table_name,column_name from information_schema.column_privileges " +
      "where table_schema='app' and grantee='ai_data_runtime' " +
      "and privilege_type='UPDATE' and table_name in (" +
      "'workspace_second_recurrence_exception_triage_cycles'," +
      "'workspace_successor_generation_corrective_delivery_plans')"
  );

  const triageUpdates = new Set(
    columnGrants.rows
      .filter(
        (row) =>
          row.table_name ===
          "workspace_second_recurrence_exception_triage_cycles"
      )
      .map((row) => row.column_name)
  );
  for (const column of [
    "status",
    "classification",
    "severity",
    "resolution_intent",
    "summary",
    "investigation_note",
    "updated_by",
    "updated_at",
    "dismissed_by",
    "dismissed_at"
  ]) {
    assert(
      triageUpdates.has(column),
      "Missing Build 065 re-triage UPDATE grant for " + column + "."
    );
  }

  const planUpdates = new Set(
    columnGrants.rows
      .filter(
        (row) =>
          row.table_name ===
          "workspace_successor_generation_corrective_delivery_plans"
      )
      .map((row) => row.column_name)
  );
  for (const column of [
    "status",
    "reviewed_by",
    "reviewed_at",
    "review_note"
  ]) {
    assert(
      planUpdates.has(column),
      "Missing Build 065 plan UPDATE grant for " + column + "."
    );
  }

  const triggers = await authPool.query<{ trigger_name: string }>(
    "select t.tgname as trigger_name from pg_trigger t " +
      "join pg_class c on c.oid=t.tgrelid " +
      "join pg_namespace n on n.oid=c.relnamespace " +
      "where n.nspname='app' and not t.tgisinternal and t.tgname in (" +
      "'workspace_recurrent_triage_second_recurrence_guard'," +
      "'workspace_next_generation_plan_second_recurrence_guard')"
  );
  assert(
    triggers.rows.length === 2,
    "Build 065 predecessor-planning freeze triggers must exist."
  );

  console.log("Build 065 successor-generation planning database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
