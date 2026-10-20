import { authPool, closeDatabasePools } from "../lib/database";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const postgresIdentifiers = [
    "workspace_subsequent_cycle_recurrence_triage_cycles",
    "workspace_successive_cycle_corrective_delivery_plans",
    "workspace_subsequent_cycle_retriage_recent_idx",
    "workspace_successive_cycle_plans_recent_idx",
    "subsequent_cycle_recurrence_triage_member_select",
    "subsequent_cycle_recurrence_triage_manager_insert",
    "subsequent_cycle_recurrence_triage_manager_update",
    "successive_cycle_plan_member_select",
    "successive_cycle_plan_manager_insert",
    "successive_cycle_plan_manager_update"
  ];
  assert(
    postgresIdentifiers.every((identifier) => Buffer.byteLength(identifier, "utf8") <= 63),
    "Build 093 PostgreSQL identifiers must remain within the 63-byte limit."
  );
  const tables = await authPool.query<{ table_name: string; rowsecurity: boolean }>(
    `select c.relname as table_name,c.relrowsecurity as rowsecurity
     from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and c.relname in (
         'workspace_subsequent_cycle_recurrence_triage_cycles',
         'workspace_successive_cycle_corrective_delivery_plans'
       )`
  );
  assert(tables.rows.length === 2, "Build 093 tables must exist.");
  assert(tables.rows.every((row) => row.rowsecurity), "Build 093 tables must have RLS enabled.");

  const indexes = await authPool.query<{ indexname:string; tablename:string }>(
    `select indexname,tablename from pg_indexes
     where schemaname='app'
       and indexname in (
         'workspace_subsequent_cycle_retriage_recent_idx',
         'workspace_successive_cycle_plans_recent_idx'
       )`
  );
  assert(indexes.rows.length === 2, "Build 093 intended indexes must exist.");
  assert(
    indexes.rows.some((row)=>row.indexname==="workspace_subsequent_cycle_retriage_recent_idx" && row.tablename==="workspace_subsequent_cycle_recurrence_triage_cycles") &&
      indexes.rows.some((row)=>row.indexname==="workspace_successive_cycle_plans_recent_idx" && row.tablename==="workspace_successive_cycle_corrective_delivery_plans"),
    "Build 093 indexes must belong to the intended generation tables."
  );

  const policies = await authPool.query<{ policyname: string }>(
    `select policyname from pg_policies
     where schemaname='app'
       and policyname in (
         'subsequent_cycle_recurrence_triage_member_select',
         'subsequent_cycle_recurrence_triage_manager_insert',
         'subsequent_cycle_recurrence_triage_manager_update',
         'successive_cycle_plan_member_select',
         'successive_cycle_plan_manager_insert',
         'successive_cycle_plan_manager_update'
       )`
  );
  assert(policies.rows.length === 6, "Build 093 intended RLS policies must exist.");

  const grants = await authPool.query<{ table_name:string; privilege_type:string }>(
    `select table_name,privilege_type
     from information_schema.role_table_grants
     where table_schema='app' and grantee='ai_data_runtime'
       and table_name in (
         'workspace_subsequent_cycle_recurrence_triage_cycles',
         'workspace_successive_cycle_corrective_delivery_plans'
       )`
  );
  for (const table of [
    "workspace_subsequent_cycle_recurrence_triage_cycles",
    "workspace_successive_cycle_corrective_delivery_plans"
  ]) {
    const privileges = new Set(
      grants.rows.filter((row)=>row.table_name===table).map((row)=>row.privilege_type)
    );
    assert(privileges.has("SELECT") && privileges.has("INSERT"), table + " SELECT/INSERT grants are incomplete.");
    assert(!privileges.has("UPDATE"), table + " must not grant unrestricted UPDATE.");
    assert(!privileges.has("DELETE"), table + " must not grant DELETE.");
  }

  const columnGrants = await authPool.query<{ table_name:string; column_name:string }>(
    `select table_name,column_name
     from information_schema.column_privileges
     where table_schema='app' and grantee='ai_data_runtime' and privilege_type='UPDATE'
       and table_name in (
         'workspace_subsequent_cycle_recurrence_triage_cycles',
         'workspace_successive_cycle_corrective_delivery_plans'
       )`
  );
  const triageUpdates = new Set(
    columnGrants.rows
      .filter((row)=>row.table_name==="workspace_subsequent_cycle_recurrence_triage_cycles")
      .map((row)=>row.column_name)
  );
  for (const column of [
    "status","classification","severity","resolution_intent","summary",
    "investigation_note","updated_by","updated_at","dismissed_by","dismissed_at"
  ]) {
    assert(triageUpdates.has(column), "Missing Build 093 re-triage UPDATE grant for " + column + ".");
  }
  const planUpdates = new Set(
    columnGrants.rows
      .filter((row)=>row.table_name==="workspace_successive_cycle_corrective_delivery_plans")
      .map((row)=>row.column_name)
  );
  for (const column of ["status","reviewed_by","reviewed_at","review_note"]) {
    assert(planUpdates.has(column), "Missing Build 093 plan UPDATE grant for " + column + ".");
  }

  const policyText = await authPool.query<{ policy_name:string; expression:string }>(
    `select p.polname as policy_name,
            coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') as expression
     from pg_policy p join pg_class c on c.oid=p.polrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and p.polname in (
         'subsequent_cycle_recurrence_triage_manager_insert',
         'subsequent_cycle_recurrence_triage_manager_update',
         'successive_cycle_plan_manager_insert',
         'successive_cycle_plan_manager_update'
       )`
  );

  const triageInsert = policyText.rows.find(
    (row)=>row.policy_name==="subsequent_cycle_recurrence_triage_manager_insert"
  )?.expression ?? "";
  for (const required of [
    "workspace_reconciliation_subsequent_cycle_recurrences",
    "workspace_post_subsequent_cycle_reclosure_checks",
    "workspace_reconciliation_subsequent_cycle_reclosures"
  ]) {
    assert(triageInsert.includes(required), "Build 093 re-triage insert gate missing " + required + ".");
  }
  assert(
    triageInsert.includes("subsequent_cycle_recurrence_id") &&
      triageInsert.includes("subsequent_cycle_recurrence_fingerprint") &&
      triageInsert.includes("regression_fingerprint") &&
      triageInsert.includes("subsequent_cycle_reclosure_fingerprint"),
    "Build 093 re-triage gate must bind the exact Build 092 recurrence lineage."
  );

  const planInsert = policyText.rows.find(
    (row)=>row.policy_name==="successive_cycle_plan_manager_insert"
  )?.expression ?? "";
  for (const required of [
    "workspace_subsequent_cycle_recurrence_triage_cycles",
    "workspace_reconciliation_subsequent_cycle_recurrences",
    "workspace_reconciliation_subsequent_cycle_reclosures",
    "workspace_subsequent_cycle_corrective_delivery_plans",
    "workspace_subsequent_cycle_corrective_live_deliveries"
  ]) {
    assert(planInsert.includes(required), "Build 093 plan insert gate missing " + required + ".");
  }
  assert(
    planInsert.includes("source_subsequent_cycle_package_id") &&
      planInsert.includes("source_subsequent_cycle_replay_key") &&
      planInsert.includes("source_subsequent_cycle_package_fingerprint") &&
      planInsert.includes("predecessor_subsequent_cycle_plan_id") &&
      planInsert.includes("predecessor_subsequent_cycle_delivery_id"),
    "Build 093 plan gate must bind the exact Build 089/090 predecessor package identity."
  );

  const freezeFunction = await authPool.query<{ definition:string }>(
    `select pg_get_functiondef(p.oid) as definition
     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='app' and p.proname='require_no_subsequent_cycle_recurrence_for_case'`
  );
  const freezeDefinition = freezeFunction.rows[0]?.definition ?? "";
  assert(
    freezeDefinition.includes("workspace_reconciliation_subsequent_cycle_recurrences"),
    "Build 093 must preserve the Build 092 predecessor-planning freeze guard."
  );

  const triggers = await authPool.query<{ trigger_name:string }>(
    `select t.tgname as trigger_name
     from pg_trigger t join pg_class c on c.oid=t.tgrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app' and not t.tgisinternal
       and t.tgname in (
         'workspace_subsequent_cycle_plan_recurrence_guard',
         'workspace_following_retriage_subcycle_recurrence_guard'
       )`
  );
  assert(triggers.rows.length === 2, "Build 093 predecessor planning freeze triggers must remain active.");

  console.log("Build 093 subsequent-cycle recurrence planning database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
