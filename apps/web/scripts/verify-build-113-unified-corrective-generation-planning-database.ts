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
          'workspace_corrective_generation_retriage',
          'workspace_corrective_generation_plans',
          'workspace_reconciliation_unified_cg_recurrences',
          'workspace_post_unified_cg_reclosure_checks'
        )`
  );
  assert(tables.rows.length === 4, "Build 113 planning bridge requires all four planning/recurrence tables.");
  assert(tables.rows.every((row) => row.rowsecurity), "Build 113 planning bridge tables must retain RLS.");

  const constraintDefs = await authPool.query<{ table_name: string; definition: string }>(
    `select c.relname as table_name,pg_get_constraintdef(con.oid) as definition
       from pg_constraint con
       join pg_class c on c.oid=con.conrelid
       join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app'
        and c.relname in (
          'workspace_corrective_generation_retriage',
          'workspace_corrective_generation_successors'
        )
        and con.contype='c'`
  );
  const retriageConstraint = constraintDefs.rows
    .filter((row) => row.table_name === "workspace_corrective_generation_retriage")
    .map((row) => row.definition)
    .join("\n");
  const successorConstraint = constraintDefs.rows
    .filter((row) => row.table_name === "workspace_corrective_generation_successors")
    .map((row) => row.definition)
    .join("\n");
  assert(
    retriageConstraint.includes("generic-corrective-generation"),
    "Build 113 planning re-triage must accept generic corrective-generation successor sources."
  );
  assert(
    successorConstraint.includes("generic-corrective-generation"),
    "Build 113 successor abstraction must retain generic corrective-generation source kind."
  );

  const policies = await authPool.query<{ policyname: string; tablename: string }>(
    `select policyname,tablename
       from pg_policies
      where schemaname='app'
        and (
          (tablename='workspace_corrective_generation_retriage'
            and policyname in ('cg_retriage_member_select','cg_retriage_manager_insert','cg_retriage_manager_update'))
          or
          (tablename='workspace_corrective_generation_plans'
            and policyname in ('cg_plan_member_select','cg_plan_manager_insert','cg_plan_manager_update'))
          or
          (tablename='workspace_reconciliation_unified_cg_recurrences'
            and policyname in ('ucg113_recurrences_member_select','ucg113_recurrences_manager_insert'))
          or
          (tablename='workspace_post_unified_cg_reclosure_checks'
            and policyname in ('ucg113_checks_member_select','ucg113_checks_manager_insert'))
        )`
  );
  assert(policies.rows.length === 10, "Build 113 planning bridge must preserve planning and recurrence RLS policies.");

  const lineageGrants = await authPool.query<{ table_name: string; privilege_type: string }>(
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
      lineageGrants.rows
        .filter((row) => row.table_name === table)
        .map((row) => row.privilege_type)
    );
    assert(privileges.has("SELECT"), table + " must retain SELECT.");
    assert(!privileges.has("INSERT"), table + " must remain direct-runtime INSERT protected.");
    assert(!privileges.has("UPDATE"), table + " must remain immutable.");
    assert(!privileges.has("DELETE"), table + " must remain immutable.");
  }

  const registration = await authPool.query<{ prosecdef: boolean; definition: string }>(
    `select p.prosecdef,pg_get_functiondef(p.oid) as definition
       from pg_proc p
       join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='app' and p.proname='register_unified_cg_recurrence_lineage'`
  );
  assert(registration.rows.length === 1, "Build 113 recurrence lineage registration function must exist.");
  assert(registration.rows[0].prosecdef, "Build 113 recurrence lineage registration must remain SECURITY DEFINER.");
  assert(
    registration.rows[0].definition.includes("'generic-corrective-generation'") &&
      registration.rows[0].definition.includes("'ready-for-planning'"),
    "Build 113 recurrence registration must emit a ready generic successor for the planning engine."
  );

  const retriagePolicy = await authPool.query<{ expression: string }>(
    `select coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') as expression
       from pg_policy p
       join pg_class c on c.oid=p.polrelid
       join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app'
        and c.relname='workspace_corrective_generation_retriage'
        and p.polname='cg_retriage_manager_insert'`
  );
  const policy = retriagePolicy.rows[0]?.expression ?? "";
  assert(
    policy.includes("workspace_corrective_generation_successors") &&
      policy.includes("workspace_corrective_generation_registry") &&
      policy.includes("source_recurrence_fingerprint") &&
      policy.includes("source_regression_fingerprint") &&
      policy.includes("successor_fingerprint"),
    "Build 113 re-triage insert gate must bind the exact generic successor and predecessor lineage."
  );

  console.log("Build 113 unified corrective-generation recurrence planning database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
