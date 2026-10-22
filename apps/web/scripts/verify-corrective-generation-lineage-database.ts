import { authPool, closeDatabasePools } from "../lib/database";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const identifiers = [
    "workspace_corrective_generation_registry",
    "workspace_corrective_generation_successors",
    "workspace_cg_registry_case_idx",
    "workspace_cg_successors_ready_idx",
    "workspace_cg_registry_immutable_guard",
    "workspace_cg_successors_immutable_guard",
    "reject_corrective_generation_registry_mutation"
  ];
  assert(
    identifiers.every((identifier) => Buffer.byteLength(identifier, "utf8") <= 63),
    "Build 109 PostgreSQL identifiers must remain within the 63-byte limit."
  );

  const tables = await authPool.query<{ table_name:string; rowsecurity:boolean }>(
    `select c.relname as table_name,c.relrowsecurity as rowsecurity
     from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and c.relname in (
         'workspace_corrective_generation_registry',
         'workspace_corrective_generation_successors'
       )`
  );
  assert(tables.rows.length === 2, "Build 109 registry tables must exist.");
  assert(tables.rows.every((row) => row.rowsecurity), "Build 109 registry tables must have RLS.");

  const indexes = await authPool.query<{ indexname:string }>(
    `select indexname from pg_indexes
     where schemaname='app'
       and indexname in (
         'workspace_cg_registry_case_idx',
         'workspace_cg_successors_ready_idx'
       )`
  );
  assert(indexes.rows.length === 2, "Build 109 lineage/successor indexes must exist.");

  const policies = await authPool.query<{ policyname:string }>(
    `select policyname from pg_policies
     where schemaname='app'
       and policyname in ('cg_registry_member_select','cg_successors_member_select')`
  );
  assert(policies.rows.length === 2, "Build 109 member-select policies must exist.");

  const grants = await authPool.query<{ table_name:string; privilege_type:string }>(
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
      grants.rows.filter((row)=>row.table_name===table).map((row)=>row.privilege_type)
    );
    assert(privileges.has("SELECT"), table + " must grant SELECT.");
    assert(!privileges.has("INSERT"), table + " must not grant INSERT in Build 109.");
    assert(!privileges.has("UPDATE"), table + " must not grant UPDATE.");
    assert(!privileges.has("DELETE"), table + " must not grant DELETE.");
  }

  const triggers = await authPool.query<{ trigger_name:string }>(
    `select t.tgname as trigger_name
     from pg_trigger t join pg_class c on c.oid=t.tgrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app' and not t.tgisinternal
       and t.tgname in (
         'workspace_cg_registry_immutable_guard',
         'workspace_cg_successors_immutable_guard'
       )`
  );
  assert(triggers.rows.length === 2, "Build 109 append-only mutation guards must exist.");

  const registryColumns = await authPool.query<{ column_name:string }>(
    `select column_name from information_schema.columns
     where table_schema='app' and table_name='workspace_corrective_generation_registry'`
  );
  const registrySet = new Set(registryColumns.rows.map((row)=>row.column_name));
  for (const required of [
    "generation_number",
    "predecessor_generation_lineage_id",
    "source_recurrence_id",
    "plan_id",
    "delivery_id",
    "package_id",
    "reclosure_id",
    "terminal_recurrence_id",
    "registry_fingerprint"
  ]) assert(registrySet.has(required), "Build 109 registry missing " + required + ".");

  const successorColumns = await authPool.query<{ column_name:string }>(
    `select column_name from information_schema.columns
     where table_schema='app' and table_name='workspace_corrective_generation_successors'`
  );
  const successorSet = new Set(successorColumns.rows.map((row)=>row.column_name));
  for (const required of [
    "predecessor_generation_lineage_id",
    "generation_number",
    "source_recurrence_kind",
    "source_recurrence_id",
    "source_recurrence_fingerprint",
    "source_regression_fingerprint",
    "status",
    "successor_fingerprint"
  ]) assert(successorSet.has(required), "Build 109 successor abstraction missing " + required + ".");

  const historicalTables = await authPool.query<{ table_name:string }>(
    `select table_name from information_schema.tables
     where table_schema='app'
       and table_name in (
         'workspace_next_corrective_generation_plans',
         'workspace_following_corrective_generation_plans',
         'workspace_reconciliation_next_corrective_generation_reclosures',
         'workspace_reconciliation_following_cg_reclosures',
         'workspace_reconciliation_following_cg_recurrences'
       )`
  );
  assert(
    historicalTables.rows.length === 5,
    "Build 109 must preserve the Build 101–108 historical evidence tables."
  );

  const closeGuard = await authPool.query<{ definition:string }>(
    `select pg_get_functiondef(p.oid) as definition
     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='app' and p.proname='require_verified_corrective_closure'`
  );
  const definition = closeGuard.rows[0]?.definition ?? "";
  assert(
    definition.includes("workspace_reconciliation_following_cg_recurrences") &&
      definition.includes("reconciliation_triage_post_following_corrective_generation_reclosure_required"),
    "Build 109 must not weaken the Build 108 top-level close boundary."
  );

  console.log("Build 109 corrective-generation lineage registry database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
