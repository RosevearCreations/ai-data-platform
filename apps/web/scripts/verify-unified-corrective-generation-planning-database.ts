import { authPool, closeDatabasePools } from "../lib/database";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const identifiers = [
    "workspace_corrective_generation_retriage",
    "workspace_corrective_generation_plans",
    "workspace_cg_retriage110_recent_idx",
    "workspace_cg_plans110_recent_idx",
    "cg_retriage_member_select",
    "cg_retriage_manager_insert",
    "cg_retriage_manager_update",
    "cg_plan_member_select",
    "cg_plan_manager_insert",
    "cg_plan_manager_update"
  ];
  assert(
    identifiers.every((identifier) => Buffer.byteLength(identifier, "utf8") <= 63),
    "Build 110 PostgreSQL identifiers must remain within the 63-byte limit."
  );

  const tables = await authPool.query<{ table_name:string; rowsecurity:boolean }>(
    `select c.relname as table_name,c.relrowsecurity as rowsecurity
     from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and c.relname in (
         'workspace_corrective_generation_retriage',
         'workspace_corrective_generation_plans'
       )`
  );
  assert(tables.rows.length === 2, "Build 110 planning tables must exist.");
  assert(tables.rows.every((row)=>row.rowsecurity), "Build 110 planning tables must have RLS.");

  const indexes = await authPool.query<{ indexname:string; tablename:string }>(
    `select indexname,tablename from pg_indexes
     where schemaname='app'
       and indexname in ('workspace_cg_retriage110_recent_idx','workspace_cg_plans110_recent_idx')`
  );
  assert(indexes.rows.length === 2, "Build 110 intended indexes must exist.");

  const policies = await authPool.query<{ policyname:string }>(
    `select policyname from pg_policies
     where schemaname='app'
       and policyname in (
         'cg_retriage_member_select','cg_retriage_manager_insert','cg_retriage_manager_update',
         'cg_plan_member_select','cg_plan_manager_insert','cg_plan_manager_update'
       )`
  );
  assert(policies.rows.length === 6, "Build 110 intended RLS policies must exist.");

  const grants = await authPool.query<{ table_name:string; privilege_type:string }>(
    `select table_name,privilege_type
     from information_schema.role_table_grants
     where table_schema='app' and grantee='ai_data_runtime'
       and table_name in (
         'workspace_corrective_generation_retriage',
         'workspace_corrective_generation_plans'
       )`
  );
  for (const table of [
    "workspace_corrective_generation_retriage",
    "workspace_corrective_generation_plans"
  ]) {
    const privileges = new Set(
      grants.rows.filter((row)=>row.table_name===table).map((row)=>row.privilege_type)
    );
    assert(privileges.has("SELECT") && privileges.has("INSERT"), table + " SELECT/INSERT grants are incomplete.");
    assert(!privileges.has("UPDATE"), table + " must not grant unrestricted UPDATE.");
    assert(!privileges.has("DELETE"), table + " must not grant DELETE.");
  }

  const columnGrants = await authPool.query<{ table_name:string; column_name:string }>(
    `select table_name,column_name from information_schema.column_privileges
     where table_schema='app' and grantee='ai_data_runtime' and privilege_type='UPDATE'
       and table_name in (
         'workspace_corrective_generation_retriage',
         'workspace_corrective_generation_plans'
       )`
  );
  const triageUpdates = new Set(
    columnGrants.rows
      .filter((row)=>row.table_name==="workspace_corrective_generation_retriage")
      .map((row)=>row.column_name)
  );
  for (const column of [
    "status","classification","severity","resolution_intent","summary",
    "investigation_note","updated_by","updated_at","dismissed_by","dismissed_at"
  ]) assert(triageUpdates.has(column), "Build 110 re-triage UPDATE grant missing " + column + ".");

  const planUpdates = new Set(
    columnGrants.rows
      .filter((row)=>row.table_name==="workspace_corrective_generation_plans")
      .map((row)=>row.column_name)
  );
  for (const column of ["status","reviewed_by","reviewed_at","review_note"]) {
    assert(planUpdates.has(column), "Build 110 plan UPDATE grant missing " + column + ".");
  }

  const policyText = await authPool.query<{ policy_name:string; expression:string }>(
    `select p.polname as policy_name,
            coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') as expression
     from pg_policy p
     join pg_class c on c.oid=p.polrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and p.polname in (
         'cg_retriage_manager_insert','cg_retriage_manager_update',
         'cg_plan_manager_insert','cg_plan_manager_update'
       )`
  );

  const triageInsert = policyText.rows.find((row)=>row.policy_name==="cg_retriage_manager_insert")?.expression ?? "";
  for (const required of [
    "workspace_corrective_generation_successors",
    "workspace_corrective_generation_registry",
    "workspace_reconciliation_exception_cases"
  ]) assert(triageInsert.includes(required), "Build 110 re-triage insert gate missing " + required + ".");
  assert(
    triageInsert.includes("source_recurrence_fingerprint") &&
      triageInsert.includes("source_regression_fingerprint") &&
      triageInsert.includes("successor_fingerprint") &&
      triageInsert.includes("registry_fingerprint"),
    "Build 110 re-triage gate must bind exact Build 109 successor and predecessor fingerprints."
  );

  const planInsert = policyText.rows.find((row)=>row.policy_name==="cg_plan_manager_insert")?.expression ?? "";
  for (const required of [
    "workspace_corrective_generation_retriage",
    "workspace_corrective_generation_successors",
    "workspace_corrective_generation_registry"
  ]) assert(planInsert.includes(required), "Build 110 plan insert gate missing " + required + ".");
  assert(
    planInsert.includes("predecessor_package_id") &&
      planInsert.includes("predecessor_replay_key") &&
      planInsert.includes("predecessor_package_fingerprint") &&
      planInsert.includes("predecessor_reclosure_id") &&
      planInsert.includes("predecessor_reclosure_fingerprint"),
    "Build 110 plan gate must bind the exact predecessor package and re-closure identities."
  );

  const lineageGrants = await authPool.query<{ table_name:string; privilege_type:string }>(
    `select table_name,privilege_type
     from information_schema.role_table_grants
     where table_schema='app' and grantee='ai_data_runtime'
       and table_name in (
         'workspace_corrective_generation_registry',
         'workspace_corrective_generation_successors'
       )`
  );
  for (const table of [
    "workspace_corrective_generation_registry",
    "workspace_corrective_generation_successors"
  ]) {
    const privileges = new Set(
      lineageGrants.rows.filter((row)=>row.table_name===table).map((row)=>row.privilege_type)
    );
    assert(privileges.has("SELECT"), table + " must preserve Build 109 SELECT.");
    assert(!privileges.has("INSERT") && !privileges.has("UPDATE") && !privileges.has("DELETE"),
      table + " must remain Build 109 read-only.");
  }

  const immutableTriggers = await authPool.query<{ trigger_name:string }>(
    `select t.tgname as trigger_name
     from pg_trigger t join pg_class c on c.oid=t.tgrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app' and not t.tgisinternal
       and t.tgname in (
         'workspace_cg_registry_immutable_guard',
         'workspace_cg_successors_immutable_guard'
       )`
  );
  assert(immutableTriggers.rows.length === 2, "Build 110 must preserve Build 109 immutability guards.");

  const closeGuard = await authPool.query<{ definition:string }>(
    `select pg_get_functiondef(p.oid) as definition
     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='app' and p.proname='require_verified_corrective_closure'`
  );
  const closeDefinition = closeGuard.rows[0]?.definition ?? "";
  assert(
    closeDefinition.includes("workspace_reconciliation_following_cg_recurrences") &&
      closeDefinition.includes("reconciliation_triage_post_following_corrective_generation_reclosure_required"),
    "Build 110 must preserve the Build 108 top-level recurrence closure boundary."
  );

  console.log("Build 110 unified corrective-generation planning database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
