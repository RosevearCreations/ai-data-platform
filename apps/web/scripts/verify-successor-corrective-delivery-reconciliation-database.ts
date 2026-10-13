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
         'workspace_successor_corrective_delivery_reconciliations',
         'workspace_reconciliation_exception_reclosures'
       )`
  );
  assert(tables.rows.length === 2, "Build 059 tables must exist.");
  assert(tables.rows.every((row) => row.rowsecurity), "Build 059 tables must have RLS enabled.");

  const policies = await authPool.query<{ policyname: string }>(
    `select policyname
     from pg_policies
     where schemaname='app'
       and policyname in (
         'workspace_successor_corrective_delivery_reconciliations_member_select',
         'workspace_successor_corrective_delivery_reconciliations_manager_insert',
         'workspace_reconciliation_exception_reclosures_member_select',
         'workspace_reconciliation_exception_reclosures_manager_insert'
       )`
  );
  assert(policies.rows.length === 4, "Build 059 RLS policies must exist.");

  const grants = await authPool.query<{ table_name: string; privilege_type: string }>(
    `select table_name,privilege_type
     from information_schema.role_table_grants
     where table_schema='app'
       and grantee='ai_data_runtime'
       and table_name in (
         'workspace_successor_corrective_delivery_reconciliations',
         'workspace_reconciliation_exception_reclosures'
       )`
  );
  for (const table of [
    "workspace_successor_corrective_delivery_reconciliations",
    "workspace_reconciliation_exception_reclosures"
  ]) {
    const privileges = new Set(
      grants.rows
        .filter((row) => row.table_name === table)
        .map((row) => row.privilege_type)
    );
    assert(privileges.has("SELECT") && privileges.has("INSERT"), table + " SELECT/INSERT grants are incomplete.");
    assert(!privileges.has("UPDATE"), table + " must not grant runtime UPDATE.");
    assert(!privileges.has("DELETE"), table + " must not grant runtime DELETE.");
  }

  const insertPolicies = await authPool.query<{ table_name: string; policy_name: string; expression: string }>(
    `select c.relname as table_name,p.polname as policy_name,
            coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') as expression
     from pg_policy p
     join pg_class c on c.oid=p.polrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and (
         (c.relname='workspace_successor_corrective_delivery_reconciliations'
          and p.polname='workspace_successor_corrective_delivery_reconciliations_manager_insert')
         or
         (c.relname='workspace_reconciliation_exception_reclosures'
          and p.polname='workspace_reconciliation_exception_reclosures_manager_insert')
       )`
  );
  assert(insertPolicies.rows.length === 2, "Build 059 insert gates must exist.");
  const reconciliationGate = insertPolicies.rows.find(
    (row) => row.table_name === "workspace_successor_corrective_delivery_reconciliations"
  )?.expression ?? "";
  for (const required of [
    "workspace_successor_corrective_live_deliveries",
    "workspace_successor_corrective_delivery_plans",
    "workspace_reopened_exception_triage_cycles",
    "workspace_reconciliation_exception_reopens",
    "workspace_post_closure_regression_checks"
  ]) {
    assert(reconciliationGate.includes(required), "Build 059 successor reconciliation gate is missing " + required + ".");
  }
  const reclosureGate = insertPolicies.rows.find(
    (row) => row.table_name === "workspace_reconciliation_exception_reclosures"
  )?.expression ?? "";
  for (const required of [
    "workspace_successor_corrective_delivery_reconciliations",
    "workspace_reconciliation_exception_reopens",
    "workspace_reconciliation_exception_closures"
  ]) {
    assert(reclosureGate.includes(required), "Build 059 re-closure gate is missing " + required + ".");
  }
  assert(
    reclosureGate.includes("successor_reconciliation_id"),
    "Build 059 re-closure gate must require latest successor verification evidence."
  );

  const legacyPolicies = await authPool.query<{ table_name: string; expression: string }>(
    `select c.relname as table_name,
            coalesce(pg_get_expr(p.polqual,p.polrelid),'') || ' ' ||
            coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') as expression
     from pg_policy p
     join pg_class c on c.oid=p.polrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and (
         (c.relname='workspace_corrective_delivery_reconciliations'
          and p.polname='workspace_corrective_delivery_reconciliations_manager_insert')
         or
         (c.relname='workspace_reconciliation_exception_closures'
          and p.polname='workspace_reconciliation_exception_closures_manager_insert')
         or
         (c.relname='workspace_post_closure_regression_checks'
          and p.polname='workspace_post_closure_regression_checks_manager_insert')
       )`
  );
  assert(legacyPolicies.rows.length === 3, "Build 059 legacy lifecycle guards must exist.");
  assert(
    legacyPolicies.rows.every((row) =>
      row.expression.includes("workspace_reconciliation_exception_reopens")
    ),
    "Build 059 must block legacy reconciliation/closure/regression writes after reopen."
  );

  const guard = await authPool.query<{ definition: string }>(
    `select pg_get_functiondef(p.oid) as definition
     from pg_proc p
     join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='app' and p.proname='require_verified_corrective_closure'`
  );
  const definition = guard.rows[0]?.definition ?? "";
  assert(
    definition.includes("workspace_reconciliation_exception_reclosures"),
    "Build 059 close trigger must require successor re-closure after reopen."
  );
  assert(
    definition.includes("workspace_reconciliation_exception_reopens"),
    "Build 059 close trigger must distinguish reopened cases."
  );
  assert(
    definition.includes("reconciliation_triage_verified_successor_reclosure_required"),
    "Build 059 close trigger must fail closed with successor-specific evidence."
  );

  console.log("Build 059 successor reconciliation and re-closure database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
