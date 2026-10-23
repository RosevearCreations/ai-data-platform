import { authPool, closeDatabasePools } from "../lib/database";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const sourceTables = [
    "workspace_corrective_generation_registry",
    "workspace_cg_legacy_terminal_events",
    "workspace_corrective_generation_successors",
    "workspace_corrective_generation_retriage",
    "workspace_corrective_generation_plans",
    "workspace_unified_cg_delivery_activations",
    "workspace_unified_cg_live_deliveries",
    "workspace_unified_cg_delivery_reconciliations",
    "workspace_reconciliation_unified_cg_reclosures",
    "workspace_post_unified_cg_reclosure_checks",
    "workspace_reconciliation_unified_cg_recurrences"
  ];

  const rls = await authPool.query<{ table_name: string; rowsecurity: boolean }>(
    `select c.relname as table_name,c.relrowsecurity as rowsecurity
       from pg_class c
       join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app'
        and c.relname=any($1::text[])`,
    [sourceTables]
  );
  assert(
    rls.rows.length === sourceTables.length,
    "Build 116 audit source tables must all exist."
  );
  for (const tableName of sourceTables) {
    const row = rls.rows.find((item) => item.table_name === tableName);
    assert(row?.rowsecurity, "Build 116 source table must retain RLS: " + tableName);
  }

  const grants = await authPool.query<{ table_name: string; privilege_type: string }>(
    `select table_name,privilege_type
       from information_schema.role_table_grants
      where table_schema='app'
        and grantee='ai_data_runtime'
        and table_name=any($1::text[])`,
    [sourceTables]
  );
  for (const tableName of sourceTables) {
    const privileges = new Set(
      grants.rows
        .filter((row) => row.table_name === tableName)
        .map((row) => row.privilege_type)
    );
    assert(privileges.has("SELECT"), "Build 116 source table needs runtime SELECT: " + tableName);
  }

  const build115Triggers = [
    "workspace_cg115_registry_invariant_guard",
    "workspace_cg115_successor_invariant_guard",
    "workspace_cg115_retriage_transition_guard",
    "workspace_cg115_plan_transition_guard",
    "workspace_cg115_activation_transition_guard",
    "workspace_cg115_delivery_transition_guard",
    "workspace_cg115_reclosure_invariant_guard"
  ];
  const triggers = await authPool.query<{ trigger_name: string }>(
    `select t.tgname as trigger_name
       from pg_trigger t
       join pg_class c on c.oid=t.tgrelid
       join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app'
        and not t.tgisinternal
        and t.tgname=any($1::text[])`,
    [build115Triggers]
  );
  assert(
    triggers.rows.length === build115Triggers.length,
    "Build 116 must preserve every Build 115 state-machine enforcement trigger."
  );

  const immutableTriggers = [
    "workspace_cg_registry_immutable_guard",
    "workspace_cg_successors_immutable_guard",
    "workspace_cg_legacy_terminal_immutable_guard"
  ];
  const immutable = await authPool.query<{ trigger_name: string }>(
    `select t.tgname as trigger_name
       from pg_trigger t
       join pg_class c on c.oid=t.tgrelid
       join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app'
        and not t.tgisinternal
        and t.tgname=any($1::text[])`,
    [immutableTriggers]
  );
  assert(
    immutable.rows.length === immutableTriggers.length,
    "Build 116 must preserve immutable/append-only corrective-generation evidence guards."
  );

  const unexpected = await authPool.query<{ table_name: string }>(
    `select table_name
       from information_schema.tables
      where table_schema='app'
        and table_name in (
          'workspace_corrective_generation_operations',
          'workspace_corrective_generation_timeline',
          'workspace_corrective_generation_audit_exports'
        )`
  );
  assert(
    unexpected.rows.length === 0,
    "Build 116 must not introduce a second mutable operations/timeline/audit source of truth."
  );

  console.log("Build 116 corrective-generation operations database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
