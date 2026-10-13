import { authPool, closeDatabasePools } from "../lib/database";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const tables = await authPool.query<{ table_name: string; rowsecurity: boolean }>(
    `select c.relname as table_name,c.relrowsecurity as rowsecurity
     from pg_class c
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and c.relname in (
         'workspace_recurrent_exception_triage_cycles',
         'workspace_next_generation_corrective_delivery_plans'
       )`
  );
  assert(tables.rows.length === 2, "Build 061 tables must exist.");
  assert(tables.rows.every((row) => row.rowsecurity), "Build 061 tables must have RLS enabled.");

  const policies = await authPool.query<{ policyname: string }>(
    `select policyname
     from pg_policies
     where schemaname='app'
       and policyname in (
         'recurrent_triage_member_select',
         'recurrent_triage_manager_insert',
         'recurrent_triage_manager_update',
         'next_generation_plan_member_select',
         'next_generation_plan_manager_insert',
         'next_generation_plan_manager_update'
       )`
  );
  assert(policies.rows.length === 6, "Build 061 intended RLS policies must exist.");

  const tableGrants = await authPool.query<{ table_name: string; privilege_type: string }>(
    `select table_name,privilege_type
     from information_schema.role_table_grants
     where table_schema='app'
       and grantee='ai_data_runtime'
       and table_name in (
         'workspace_recurrent_exception_triage_cycles',
         'workspace_next_generation_corrective_delivery_plans'
       )`
  );
  const columnGrants = await authPool.query<{
    table_name: string;
    column_name: string;
    privilege_type: string;
  }>(
    `select table_name,column_name,privilege_type
     from information_schema.column_privileges
     where table_schema='app'
       and grantee='ai_data_runtime'
       and privilege_type='UPDATE'
       and table_name in (
         'workspace_recurrent_exception_triage_cycles',
         'workspace_next_generation_corrective_delivery_plans'
       )`
  );

  for (const table of [
    "workspace_recurrent_exception_triage_cycles",
    "workspace_next_generation_corrective_delivery_plans"
  ]) {
    const privileges = new Set(
      tableGrants.rows
        .filter((row) => row.table_name === table)
        .map((row) => row.privilege_type)
    );
    assert(privileges.has("SELECT") && privileges.has("INSERT"), table + " SELECT/INSERT grants are incomplete.");
    assert(!privileges.has("UPDATE"), table + " must not grant unrestricted UPDATE.");
    assert(!privileges.has("DELETE"), table + " must not grant DELETE.");
  }

  const recurrentUpdates = new Set(
    columnGrants.rows
      .filter((row) => row.table_name === "workspace_recurrent_exception_triage_cycles")
      .map((row) => row.column_name)
  );
  for (const column of [
    "status","classification","severity","resolution_intent","summary",
    "investigation_note","updated_by","updated_at","dismissed_by","dismissed_at"
  ]) {
    assert(recurrentUpdates.has(column), "Missing recurrent re-triage UPDATE grant for " + column + ".");
  }

  const planUpdates = new Set(
    columnGrants.rows
      .filter((row) => row.table_name === "workspace_next_generation_corrective_delivery_plans")
      .map((row) => row.column_name)
  );
  for (const column of ["status","reviewed_by","reviewed_at","review_note"]) {
    assert(planUpdates.has(column), "Missing next-generation plan UPDATE grant for " + column + ".");
  }

  const insertPolicies = await authPool.query<{ policyname: string; expression: string }>(
    `select p.polname as policyname,
            coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') as expression
     from pg_policy p
     join pg_class c on c.oid=p.polrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and p.polname in (
         'recurrent_triage_manager_insert',
         'next_generation_plan_manager_insert'
       )`
  );
  const retriage = insertPolicies.rows.find(
    (row) => row.policyname === "recurrent_triage_manager_insert"
  )?.expression ?? "";
  for (const required of [
    "workspace_reconciliation_exception_recurrences",
    "workspace_post_reclosure_regression_checks",
    "workspace_reconciliation_exception_reclosures"
  ]) {
    assert(retriage.includes(required), "Build 061 re-triage gate is missing " + required + ".");
  }

  const plan = insertPolicies.rows.find(
    (row) => row.policyname === "next_generation_plan_manager_insert"
  )?.expression ?? "";
  for (const required of [
    "workspace_recurrent_exception_triage_cycles",
    "workspace_reconciliation_exception_recurrences",
    "workspace_successor_corrective_delivery_plans",
    "workspace_successor_corrective_live_deliveries"
  ]) {
    assert(plan.includes(required), "Build 061 plan gate is missing " + required + ".");
  }

  const freezeFunction = await authPool.query<{ definition: string }>(
    `select pg_get_functiondef(p.oid) as definition
     from pg_proc p
     join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='app'
       and p.proname='require_no_recurrence_for_reopened_planning'`
  );
  assert(
    freezeFunction.rows[0]?.definition.includes("workspace_reconciliation_exception_recurrences"),
    "Build 061 must freeze predecessor Build 057 planning after recurrence."
  );

  const triggers = await authPool.query<{ trigger_name: string; table_name: string }>(
    `select t.tgname as trigger_name,c.relname as table_name
     from pg_trigger t
     join pg_class c on c.oid=t.tgrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and not t.tgisinternal
       and t.tgname in (
         'workspace_reopened_triage_recurrence_guard',
         'workspace_successor_plan_recurrence_guard'
       )`
  );
  assert(triggers.rows.length === 2, "Build 061 predecessor-planning freeze triggers must exist.");

  console.log("Build 061 recurrent planning database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
