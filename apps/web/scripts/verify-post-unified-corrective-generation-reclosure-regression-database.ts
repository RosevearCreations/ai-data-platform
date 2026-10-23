import { authPool, closeDatabasePools } from "../lib/database";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const identifiers = [
    "workspace_post_unified_cg_reclosure_checks",
    "workspace_reconciliation_unified_cg_recurrences",
    "workspace_ucg113_check_recent_idx",
    "workspace_ucg113_check_link_idx",
    "workspace_ucg113_recur_recent_idx",
    "workspace_ucg113_plan_recur_guard",
    "workspace_ucg113_delivery_recur_guard",
    "register_unified_cg_recurrence_lineage"
  ];
  assert(
    identifiers.every((identifier) => Buffer.byteLength(identifier, "utf8") <= 63),
    "Build 113 PostgreSQL identifiers must remain within 63 bytes."
  );

  const tables = await authPool.query<{ table_name: string; rowsecurity: boolean }>(
    `select c.relname as table_name,c.relrowsecurity as rowsecurity
       from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app'
        and c.relname in (
          'workspace_post_unified_cg_reclosure_checks',
          'workspace_reconciliation_unified_cg_recurrences'
        )`
  );
  assert(tables.rows.length === 2, "Build 113 tables must exist.");
  assert(tables.rows.every((row) => row.rowsecurity), "Build 113 tables must have RLS enabled.");

  const policies = await authPool.query<{ policyname: string }>(
    `select policyname from pg_policies
      where schemaname='app'
        and policyname in (
          'ucg113_checks_member_select',
          'ucg113_checks_manager_insert',
          'ucg113_recurrences_member_select',
          'ucg113_recurrences_manager_insert'
        )`
  );
  assert(policies.rows.length === 4, "Build 113 intended RLS policies must exist.");

  const grants = await authPool.query<{ table_name: string; privilege_type: string }>(
    `select table_name,privilege_type
       from information_schema.role_table_grants
      where table_schema='app' and grantee='ai_data_runtime'
        and table_name in (
          'workspace_post_unified_cg_reclosure_checks',
          'workspace_reconciliation_unified_cg_recurrences',
          'workspace_corrective_generation_registry',
          'workspace_corrective_generation_successors'
        )`
  );
  for (const table of [
    "workspace_post_unified_cg_reclosure_checks",
    "workspace_reconciliation_unified_cg_recurrences"
  ]) {
    const privileges = new Set(
      grants.rows.filter((row) => row.table_name === table).map((row) => row.privilege_type)
    );
    assert(privileges.has("SELECT") && privileges.has("INSERT"), table + " SELECT/INSERT grants are incomplete.");
    assert(!privileges.has("UPDATE"), table + " must not grant runtime UPDATE.");
    assert(!privileges.has("DELETE"), table + " must not grant runtime DELETE.");
  }
  for (const table of [
    "workspace_corrective_generation_registry",
    "workspace_corrective_generation_successors"
  ]) {
    const privileges = new Set(
      grants.rows.filter((row) => row.table_name === table).map((row) => row.privilege_type)
    );
    assert(privileges.has("SELECT"), table + " must preserve Build 109 SELECT.");
    assert(!privileges.has("INSERT"), table + " must remain runtime INSERT-protected.");
    assert(!privileges.has("UPDATE") && !privileges.has("DELETE"), table + " must remain append-only.");
  }

  const functionResult = await authPool.query<{ prosecdef: boolean; definition: string }>(
    `select p.prosecdef,pg_get_functiondef(p.oid) as definition
       from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='app' and p.proname='register_unified_cg_recurrence_lineage'`
  );
  assert(functionResult.rows.length === 1, "Build 113 lineage registration function must exist.");
  assert(functionResult.rows[0].prosecdef, "Build 113 lineage registration must be SECURITY DEFINER.");
  const registration = functionResult.rows[0].definition;
  for (const required of [
    "workspace_reconciliation_unified_cg_recurrences",
    "workspace_reconciliation_unified_cg_reclosures",
    "workspace_corrective_generation_registry",
    "workspace_corrective_generation_successors",
    "generic-corrective-generation",
    "ready-for-planning"
  ]) {
    assert(registration.includes(required), "Build 113 lineage registration is missing " + required + ".");
  }

  const executeGrant = await authPool.query<{ privilege_type: string }>(
    `select privilege_type
       from information_schema.routine_privileges
      where routine_schema='app'
        and routine_name='register_unified_cg_recurrence_lineage'
        and grantee='ai_data_runtime'`
  );
  assert(
    executeGrant.rows.some((row) => row.privilege_type === "EXECUTE"),
    "Build 113 runtime must have EXECUTE on the bounded lineage registration function."
  );

  const reopen = await authPool.query<{ definition: string }>(
    `select pg_get_functiondef(p.oid) as definition
       from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='app' and p.proname='require_governed_exception_reopen'`
  );
  const reopenDefinition = reopen.rows[0]?.definition ?? "";
  assert(
    reopenDefinition.includes("workspace_reconciliation_unified_cg_recurrences"),
    "Build 113 governed reopen must recognize unified corrective-generation recurrence evidence."
  );
  assert(
    reopenDefinition.includes("workspace_reconciliation_following_cg_recurrences"),
    "Build 113 governed reopen must preserve historical following corrective-generation evidence."
  );

  const triggers = await authPool.query<{ trigger_name: string }>(
    `select t.tgname as trigger_name
       from pg_trigger t
       join pg_class c on c.oid=t.tgrelid
       join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app' and not t.tgisinternal
        and t.tgname in (
          'workspace_ucg113_plan_recur_guard',
          'workspace_ucg113_retriage_recur_guard',
          'workspace_ucg113_activation_recur_guard',
          'workspace_ucg113_recon_recur_guard',
          'workspace_ucg113_reclosure_recur_guard',
          'workspace_ucg113_delivery_recur_guard'
        )`
  );
  assert(triggers.rows.length === 6, "Build 113 current-generation recurrence guards must exist.");

  const closeGuard = await authPool.query<{ definition: string }>(
    `select pg_get_functiondef(p.oid) as definition
       from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='app' and p.proname='require_verified_corrective_closure'`
  );
  const closeDefinition = closeGuard.rows[0]?.definition ?? "";
  assert(
    closeDefinition.includes("workspace_corrective_generation_successors") &&
      closeDefinition.includes("workspace_reconciliation_unified_cg_reclosures") &&
      closeDefinition.includes("reconciliation_triage_verified_unified_corrective_generation_reclosure_required"),
    "Build 113 must preserve Build 112 latest-successor close enforcement."
  );

  console.log("Build 113 post-unified corrective-generation recurrence database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
