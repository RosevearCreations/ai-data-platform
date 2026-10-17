import { authPool, closeDatabasePools } from "../lib/database";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const tables = await authPool.query<{ table_name: string; rowsecurity: boolean }>(
    `select c.relname as table_name,c.relrowsecurity as rowsecurity
     from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and c.relname in (
         'workspace_post_continuation_generation_reclosure_checks',
         'workspace_reconciliation_continuation_generation_recurrences'
       )`
  );
  assert(tables.rows.length === 2, "Build 080 tables must exist.");
  assert(tables.rows.every((row) => row.rowsecurity), "Build 080 tables must have RLS.");

  const indexes = await authPool.query<{ indexname:string; tablename:string }>(
    `select indexname,tablename from pg_indexes
     where schemaname='app'
       and indexname in (
         'workspace_post_successive_reclosure_checks_recent_idx',
         'workspace_post_successive_reclosure_checks_reclosure_idx'
       )`
  );
  assert(indexes.rows.length === 2, "Build 080 continuation-generation monitoring indexes must exist.");
  assert(
    indexes.rows.every((row)=>row.tablename==="workspace_post_continuation_generation_reclosure_checks"),
    "Build 080 monitoring indexes must belong to the continuation-generation check ledger."
  );

  const policies = await authPool.query<{ policyname: string }>(
    `select policyname from pg_policies
     where schemaname='app'
       and policyname in (
         'post_continuation_generation_reclosure_checks_member_select',
         'post_continuation_generation_reclosure_checks_manager_insert',
         'continuation_generation_recurrences_member_select',
         'continuation_generation_recurrences_manager_insert'
       )`
  );
  assert(policies.rows.length === 4, "Build 080 intended policies must exist.");

  const grants = await authPool.query<{ table_name:string; privilege_type:string }>(
    `select table_name,privilege_type
     from information_schema.role_table_grants
     where table_schema='app' and grantee='ai_data_runtime'
       and table_name in (
         'workspace_post_continuation_generation_reclosure_checks',
         'workspace_reconciliation_continuation_generation_recurrences'
       )`
  );
  for (const table of [
    "workspace_post_continuation_generation_reclosure_checks",
    "workspace_reconciliation_continuation_generation_recurrences"
  ]) {
    const privileges = new Set(
      grants.rows.filter((row)=>row.table_name===table).map((row)=>row.privilege_type)
    );
    assert(privileges.has("SELECT") && privileges.has("INSERT"), table + " SELECT/INSERT grants are incomplete.");
    assert(!privileges.has("UPDATE"), table + " must not grant UPDATE.");
    assert(!privileges.has("DELETE"), table + " must not grant DELETE.");
  }

  const policyText = await authPool.query<{ policy_name:string; expression:string }>(
    `select p.polname as policy_name,
            coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') as expression
     from pg_policy p join pg_class c on c.oid=p.polrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and p.polname in (
         'post_continuation_generation_reclosure_checks_manager_insert',
         'continuation_generation_recurrences_manager_insert'
       )`
  );
  const monitor = policyText.rows.find(x=>x.policy_name==="post_continuation_generation_reclosure_checks_manager_insert")?.expression ?? "";
  for (const required of [
    "workspace_reconciliation_continuation_generation_reclosures",
    "workspace_continuation_generation_corrective_live_deliveries",
    "workspace_continuation_generation_corrective_delivery_plans",
    "workspace_reconciliation_successive_generation_recurrences"
  ]) assert(monitor.includes(required), "Build 080 monitoring gate missing " + required + ".");
  assert(
    monitor.includes("continuation_generation_package_id") &&
      monitor.includes("continuation_generation_replay_key") &&
      monitor.includes("continuation_generation_package_fingerprint"),
    "Build 080 monitoring gate must bind the exact Build 078 package."
  );

  const recurrence = policyText.rows.find(x=>x.policy_name==="continuation_generation_recurrences_manager_insert")?.expression ?? "";
  for (const required of [
    "workspace_post_continuation_generation_reclosure_checks",
    "workspace_reconciliation_continuation_generation_reclosures"
  ]) assert(recurrence.includes(required), "Build 080 recurrence gate missing " + required + ".");
  assert(
    recurrence.includes("continuation_generation_reclosure_regression_check_id") &&
      recurrence.includes("continuation_generation_reclosure_id"),
    "Build 080 recurrence gate must require the newest monitor and re-closure."
  );

  const reopenGuard = await authPool.query<{ definition:string }>(
    `select pg_get_functiondef(p.oid) as definition
     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='app' and p.proname='require_governed_exception_reopen'`
  );
  const reopenDefinition = reopenGuard.rows[0]?.definition ?? "";
  assert(
    reopenDefinition.includes("workspace_reconciliation_continuation_generation_recurrences"),
    "Build 080 governed reopen trigger must recognize continuation-generation recurrence."
  );
  assert(
    reopenDefinition.includes("workspace_reconciliation_successive_generation_recurrences") &&
      reopenDefinition.includes("workspace_reconciliation_exception_next_generation_recurrences") &&
      reopenDefinition.includes("workspace_reconciliation_exception_recurrences"),
    "Build 080 governed reopen trigger must preserve all prior recurrence generations."
  );

  const closeGuard = await authPool.query<{ definition:string }>(
    `select pg_get_functiondef(p.oid) as definition
     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='app' and p.proname='require_verified_corrective_closure'`
  );
  const closeDefinition = closeGuard.rows[0]?.definition ?? "";
  assert(
    closeDefinition.includes("workspace_reconciliation_continuation_generation_recurrences"),
    "Build 080 close trigger must detect continuation-generation recurrence."
  );
  assert(
    closeDefinition.includes("reconciliation_triage_post_continuation_generation_reclosure_required") ||
      closeDefinition.includes("reconciliation_triage_verified_continuation_generation_reclosure_required"),
    "Build 080 must remain fail-closed after continuation-generation recurrence, including the stronger Build 079 re-closure guard."
  );
  assert(
    closeDefinition.includes("workspace_reconciliation_continuation_generation_reclosures") &&
      closeDefinition.includes("workspace_reconciliation_successive_generation_reclosures") &&
      closeDefinition.includes("workspace_reconciliation_successor_generation_reclosures") &&
      closeDefinition.includes("workspace_reconciliation_exception_next_generation_reclosures"),
    "Build 080 close trigger must preserve Build 079, Build 071, Build 067 and Build 063 generation rules."
  );

  const triggers = await authPool.query<{ trigger_name:string }>(
    `select t.tgname as trigger_name
     from pg_trigger t join pg_class c on c.oid=t.tgrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app' and not t.tgisinternal
       and t.tgname in (
         'workspace_continuation_generation_activation_recurrence_guard',
         'workspace_continuation_generation_delivery_recurrence_guard',
         'workspace_continuation_generation_reconciliation_recurrence_guard',
         'workspace_continuation_generation_reclosure_recurrence_guard',
         'workspace_continuation_generation_plan_recurrence_guard',
         'workspace_subsequent_retriage_successive_recurrence_guard'
       )`
  );
  assert(triggers.rows.length === 6, "Build 080 continuation-generation freeze triggers must exist.");

  console.log("Build 080 post-continuation-generation recurrence database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
