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
         'workspace_reopened_exception_triage_cycles',
         'workspace_successor_corrective_delivery_plans'
       )`
  );
  assert(tables.rows.length === 2, "Build 057 tables must exist.");
  assert(tables.rows.every((row) => row.rowsecurity), "Build 057 tables must have RLS enabled.");

  const policies = await authPool.query<{ policyname: string }>(
    `select policyname
     from pg_policies
     where schemaname='app'
       and policyname in (
         'workspace_reopened_exception_triage_cycles_member_select',
         'workspace_reopened_exception_triage_cycles_manager_insert',
         'workspace_reopened_exception_triage_cycles_manager_update',
         'workspace_successor_corrective_delivery_plans_member_select',
         'workspace_successor_corrective_delivery_plans_manager_insert',
         'workspace_successor_corrective_delivery_plans_manager_update'
       )`
  );
  assert(policies.rows.length === 6, "Build 057 RLS policies must exist.");

  const triggers = await authPool.query<{ tgname: string }>(
    `select t.tgname
     from pg_trigger t
     join pg_class c on c.oid=t.tgrelid
     join pg_namespace n on n.oid=c.relnamespace
     where not t.tgisinternal
       and n.nspname='app'
       and c.relname='workspace_reconciliation_exception_cases'
       and t.tgname='workspace_reconciliation_exception_reopened_cycle_guard'`
  );
  assert(triggers.rows.length === 1, "Build 057 reopened-cycle guard must exist.");

  const legacyPolicy = await authPool.query<{ expression: string }>(
    `select pg_get_expr(p.polwithcheck,p.polrelid) as expression
     from pg_policy p
     join pg_class c on c.oid=p.polrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and c.relname='workspace_corrective_delivery_plans'
       and p.polname='workspace_corrective_delivery_plans_manager_insert'`
  );
  assert(
    legacyPolicy.rows[0]?.expression.includes("workspace_reconciliation_exception_reopens"),
    "Build 057 must block the legacy Build 053 plan path after reopen."
  );

  const grants = await authPool.query<{ table_name: string; privilege_type: string }>(
    `select table_name,privilege_type
     from information_schema.role_table_grants
     where table_schema='app'
       and grantee='ai_data_runtime'
       and table_name in (
         'workspace_reopened_exception_triage_cycles',
         'workspace_successor_corrective_delivery_plans'
       )`
  );
  const byTable = new Map<string, Set<string>>();
  for (const row of grants.rows) {
    const set = byTable.get(row.table_name) ?? new Set<string>();
    set.add(row.privilege_type);
    byTable.set(row.table_name, set);
  }
  for (const table of [
    "workspace_reopened_exception_triage_cycles",
    "workspace_successor_corrective_delivery_plans"
  ]) {
    const privileges = byTable.get(table) ?? new Set<string>();
    assert(privileges.has("SELECT") && privileges.has("INSERT") && privileges.has("UPDATE"), table + " runtime grants are incomplete.");
    assert(!privileges.has("DELETE"), table + " must not grant runtime DELETE.");
  }

  console.log("Build 057 reopened exception planning database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
