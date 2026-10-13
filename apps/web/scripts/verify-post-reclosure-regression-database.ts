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
         'workspace_post_reclosure_regression_checks',
         'workspace_reconciliation_exception_recurrences'
       )`
  );
  assert(tables.rows.length === 2, "Build 060 tables must exist.");
  assert(tables.rows.every((row) => row.rowsecurity), "Build 060 tables must have RLS enabled.");

  const policies = await authPool.query<{ policyname: string }>(
    `select policyname
     from pg_policies
     where schemaname='app'
       and policyname in (
         'post_reclosure_checks_member_select',
         'post_reclosure_checks_manager_insert',
         'reconciliation_recurrences_member_select',
         'reconciliation_recurrences_manager_insert'
       )`
  );
  assert(policies.rows.length === 4, "Build 060 intended RLS policies must exist.");

  const grants = await authPool.query<{ table_name: string; privilege_type: string }>(
    `select table_name,privilege_type
     from information_schema.role_table_grants
     where table_schema='app'
       and grantee='ai_data_runtime'
       and table_name in (
         'workspace_post_reclosure_regression_checks',
         'workspace_reconciliation_exception_recurrences'
       )`
  );
  for (const table of [
    "workspace_post_reclosure_regression_checks",
    "workspace_reconciliation_exception_recurrences"
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

  const policyExpressions = await authPool.query<{ policyname: string; expression: string }>(
    `select p.polname as policyname,
            coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') as expression
     from pg_policy p
     join pg_class c on c.oid=p.polrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and p.polname in (
         'post_reclosure_checks_manager_insert',
         'reconciliation_recurrences_manager_insert'
       )`
  );
  const monitoring = policyExpressions.rows.find(
    (row) => row.policyname === "post_reclosure_checks_manager_insert"
  )?.expression ?? "";
  for (const required of [
    "workspace_reconciliation_exception_reclosures",
    "workspace_successor_corrective_live_deliveries",
    "workspace_successor_corrective_delivery_plans",
    "workspace_reconciliation_exception_recurrences"
  ]) {
    assert(monitoring.includes(required), "Build 060 monitoring gate is missing " + required + ".");
  }
  const recurrence = policyExpressions.rows.find(
    (row) => row.policyname === "reconciliation_recurrences_manager_insert"
  )?.expression ?? "";
  for (const required of [
    "workspace_post_reclosure_regression_checks",
    "workspace_reconciliation_exception_reclosures",
    "reclosure_regression_check_id"
  ]) {
    assert(recurrence.includes(required), "Build 060 recurrence gate is missing " + required + ".");
  }

  const reopenGuard = await authPool.query<{ definition: string }>(
    `select pg_get_functiondef(p.oid) as definition
     from pg_proc p
     join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='app' and p.proname='require_governed_exception_reopen'`
  );
  const reopenDefinition = reopenGuard.rows[0]?.definition ?? "";
  assert(
    reopenDefinition.includes("workspace_reconciliation_exception_recurrences"),
    "Build 060 governed reopen trigger must recognize recurrence evidence."
  );
  assert(
    reopenDefinition.includes("recurred_at"),
    "Build 060 governed reopen trigger must require current-generation recurrence timing."
  );

  const freezeFunctions = await authPool.query<{ proname: string; definition: string }>(
    `select p.proname,pg_get_functiondef(p.oid) as definition
     from pg_proc p
     join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='app'
       and p.proname in (
         'require_no_recurrence_for_successor_case',
         'require_no_recurrence_for_successor_delivery'
       )`
  );
  assert(freezeFunctions.rows.length === 2, "Build 060 successor-cycle freeze functions must exist.");
  assert(
    freezeFunctions.rows.every((row) =>
      row.definition.includes("workspace_reconciliation_exception_recurrences")
    ),
    "Build 060 successor-cycle freeze functions must bind recurrence evidence."
  );

  const triggers = await authPool.query<{ trigger_name: string }>(
    `select t.tgname as trigger_name
     from pg_trigger t
     join pg_class c on c.oid=t.tgrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and not t.tgisinternal
       and t.tgname in (
         'workspace_successor_activation_recurrence_guard',
         'workspace_successor_delivery_recurrence_guard',
         'workspace_successor_reconciliation_recurrence_guard',
         'workspace_successor_reclosure_recurrence_guard'
       )`
  );
  assert(triggers.rows.length === 4, "Build 060 must freeze all prior successor-cycle mutation surfaces.");

  console.log("Build 060 post-re-closure recurrence database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
