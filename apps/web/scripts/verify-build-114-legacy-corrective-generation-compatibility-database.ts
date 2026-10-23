import { authPool, closeDatabasePools } from "../lib/database";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const identifiers = [
    "workspace_cg_legacy_terminal_events",
    "workspace_cg_legacy_terminal_recent_idx",
    "cg_legacy_terminal_member_select",
    "workspace_cg_legacy_terminal_immutable_guard",
    "bridge_legacy_corrective_generation_lineage"
  ];
  assert(
    identifiers.every((identifier) => Buffer.byteLength(identifier, "utf8") <= 63),
    "Build 114 PostgreSQL identifiers must remain within the 63-byte limit."
  );

  const table = await authPool.query<{ rowsecurity: boolean }>(
    `select c.relrowsecurity as rowsecurity
       from pg_class c
       join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app' and c.relname='workspace_cg_legacy_terminal_events'`
  );
  assert(table.rows.length === 1, "Build 114 legacy terminal event table must exist.");
  assert(table.rows[0].rowsecurity, "Build 114 legacy terminal event table must have RLS.");

  const policies = await authPool.query<{ policyname: string }>(
    `select policyname
       from pg_policies
      where schemaname='app'
        and tablename='workspace_cg_legacy_terminal_events'
        and policyname='cg_legacy_terminal_member_select'`
  );
  assert(policies.rows.length === 1, "Build 114 member-select RLS policy must exist.");

  const grants = await authPool.query<{ privilege_type: string }>(
    `select privilege_type
       from information_schema.role_table_grants
      where table_schema='app'
        and table_name='workspace_cg_legacy_terminal_events'
        and grantee='ai_data_runtime'`
  );
  const privileges = new Set(grants.rows.map((row) => row.privilege_type));
  assert(privileges.has("SELECT"), "Build 114 terminal events require runtime SELECT.");
  assert(!privileges.has("INSERT"), "Build 114 terminal events must block direct runtime INSERT.");
  assert(!privileges.has("UPDATE"), "Build 114 terminal events must block direct runtime UPDATE.");
  assert(!privileges.has("DELETE"), "Build 114 terminal events must block direct runtime DELETE.");

  const trigger = await authPool.query<{ trigger_name: string }>(
    `select t.tgname as trigger_name
       from pg_trigger t
       join pg_class c on c.oid=t.tgrelid
       join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app'
        and c.relname='workspace_cg_legacy_terminal_events'
        and not t.tgisinternal
        and t.tgname='workspace_cg_legacy_terminal_immutable_guard'`
  );
  assert(trigger.rows.length === 1, "Build 114 terminal events must be append-only.");

  const fn = await authPool.query<{ prosecdef: boolean; definition: string }>(
    `select p.prosecdef,pg_get_functiondef(p.oid) as definition
       from pg_proc p
       join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='app'
        and p.proname='bridge_legacy_corrective_generation_lineage'`
  );
  assert(fn.rows.length === 1, "Build 114 bridge function must exist.");
  assert(fn.rows[0].prosecdef, "Build 114 bridge function must be SECURITY DEFINER.");

  const definition = fn.rows[0].definition;
  for (const required of [
    "workspace_next_corrective_generation_plans",
    "workspace_following_corrective_generation_plans",
    "workspace_corrective_generation_registry",
    "workspace_cg_legacy_terminal_events",
    "workspace_corrective_generation_successors",
    "legacy-next",
    "legacy-following",
    "ready-for-planning",
    "owner",
    "admin"
  ]) {
    assert(definition.includes(required), "Build 114 bridge function missing " + required + ".");
  }
  assert(
    !definition.includes("update app.workspace_corrective_generation_registry") &&
      !definition.includes("delete from app.workspace_corrective_generation_registry"),
    "Build 114 must never rewrite or delete the immutable lineage registry."
  );
  assert(
    !definition.includes("update app.workspace_corrective_generation_successors") &&
      !definition.includes("delete from app.workspace_corrective_generation_successors"),
    "Build 114 must never rewrite or delete immutable successor sources."
  );

  const executeGrant = await authPool.query<{ has_execute: boolean }>(
    `select has_function_privilege(
       'ai_data_runtime',
       'app.bridge_legacy_corrective_generation_lineage(uuid,text,uuid)',
       'EXECUTE'
     ) as has_execute`
  );
  assert(executeGrant.rows[0]?.has_execute, "Build 114 runtime role must execute only the bounded bridge.");

  const retriagePolicy = await authPool.query<{ expression: string }>(
    `select coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') as expression
       from pg_policy p
       join pg_class c on c.oid=p.polrelid
       join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app'
        and c.relname='workspace_corrective_generation_retriage'
        and p.polname='cg_retriage_manager_insert'`
  );
  const expression = retriagePolicy.rows[0]?.expression ?? "";
  for (const required of [
    "workspace_cg_legacy_terminal_events",
    "terminal_recurrence_id",
    "terminal_recurrence_fingerprint",
    "terminal_regression_fingerprint",
    "source_recurrence_id",
    "source_recurrence_fingerprint",
    "source_regression_fingerprint"
  ]) {
    assert(expression.includes(required), "Build 114 effective recurrence gate missing " + required + ".");
  }

  const lineageGrants = await authPool.query<{ table_name: string; privilege_type: string }>(
    `select table_name,privilege_type
       from information_schema.role_table_grants
      where table_schema='app' and grantee='ai_data_runtime'
        and table_name in (
          'workspace_corrective_generation_registry',
          'workspace_corrective_generation_successors'
        )`
  );
  for (const tableName of [
    "workspace_corrective_generation_registry",
    "workspace_corrective_generation_successors"
  ]) {
    const tablePrivileges = new Set(
      lineageGrants.rows
        .filter((row) => row.table_name === tableName)
        .map((row) => row.privilege_type)
    );
    assert(tablePrivileges.has("SELECT"), tableName + " must retain Build 109 SELECT.");
    assert(!tablePrivileges.has("INSERT"), tableName + " must remain direct-runtime INSERT protected.");
    assert(!tablePrivileges.has("UPDATE"), tableName + " must remain immutable.");
    assert(!tablePrivileges.has("DELETE"), tableName + " must remain immutable.");
  }

  const immutableTriggers = await authPool.query<{ trigger_name: string }>(
    `select t.tgname as trigger_name
       from pg_trigger t
       join pg_class c on c.oid=t.tgrelid
       join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app' and not t.tgisinternal
        and t.tgname in (
          'workspace_cg_registry_immutable_guard',
          'workspace_cg_successors_immutable_guard'
        )`
  );
  assert(
    immutableTriggers.rows.length === 2,
    "Build 114 must preserve Build 109 registry/successor immutability guards."
  );

  console.log("Build 114 legacy corrective-generation compatibility database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
