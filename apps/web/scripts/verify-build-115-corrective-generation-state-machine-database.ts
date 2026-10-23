import { authPool, closeDatabasePools } from "../lib/database";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const triggerNames = [
    "workspace_cg115_registry_invariant_guard",
    "workspace_cg115_successor_invariant_guard",
    "workspace_cg115_retriage_transition_guard",
    "workspace_cg115_plan_transition_guard",
    "workspace_cg115_activation_transition_guard",
    "workspace_cg115_delivery_transition_guard",
    "workspace_cg115_reclosure_invariant_guard"
  ];
  assert(
    triggerNames.every((name) => Buffer.byteLength(name, "utf8") <= 63),
    "Build 115 trigger names must fit PostgreSQL's 63-byte identifier limit."
  );

  const functions = await authPool.query<{
    proname: string;
    prosecdef: boolean;
    definition: string;
  }>(
    `select p.proname,p.prosecdef,pg_get_functiondef(p.oid) as definition
       from pg_proc p
       join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='app'
        and p.proname in (
          'cg115_effective_terminal_recurrence',
          'cg115_require_registry_invariants',
          'cg115_require_successor_invariants',
          'cg115_require_retriage_transition',
          'cg115_require_plan_transition',
          'cg115_require_activation_transition',
          'cg115_require_delivery_transition',
          'cg115_require_reclosure_invariants'
        )`
  );
  assert(functions.rows.length === 8, "Build 115 state-machine functions must all exist.");
  assert(
    functions.rows.every((row) => row.prosecdef),
    "Build 115 integrity functions must execute as SECURITY DEFINER."
  );

  const registryFn = functions.rows.find((row) => row.proname === "cg115_require_registry_invariants")?.definition ?? "";
  for (const required of [
    "generation_lineage_id",
    "plan_id",
    "generation_number",
    "legacy-next",
    "legacy-following",
    "generic",
    "cg115_effective_terminal_recurrence",
    "workspace_corrective_generation_successors",
    "workspace_corrective_generation_plans"
  ]) {
    assert(registryFn.includes(required), "Build 115 registry invariant guard missing " + required + ".");
  }

  const successorFn = functions.rows.find((row) => row.proname === "cg115_require_successor_invariants")?.definition ?? "";
  for (const required of [
    "successor_source_id",
    "source_recurrence_id",
    "cg115_effective_terminal_recurrence",
    "terminal_recurrence_fingerprint",
    "terminal_regression_fingerprint",
    "following-corrective-generation",
    "generic-corrective-generation"
  ]) {
    assert(successorFn.includes(required), "Build 115 successor invariant guard missing " + required + ".");
  }

  const triggers = await authPool.query<{ trigger_name: string; table_name: string }>(
    `select t.tgname as trigger_name,c.relname as table_name
       from pg_trigger t
       join pg_class c on c.oid=t.tgrelid
       join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app'
        and not t.tgisinternal
        and t.tgname=any($1::text[])`,
    [triggerNames]
  );
  assert(triggers.rows.length === triggerNames.length, "Build 115 state-machine triggers must all exist.");

  const expected = new Map<string,string>([
    ["workspace_cg115_registry_invariant_guard","workspace_corrective_generation_registry"],
    ["workspace_cg115_successor_invariant_guard","workspace_corrective_generation_successors"],
    ["workspace_cg115_retriage_transition_guard","workspace_corrective_generation_retriage"],
    ["workspace_cg115_plan_transition_guard","workspace_corrective_generation_plans"],
    ["workspace_cg115_activation_transition_guard","workspace_unified_cg_delivery_activations"],
    ["workspace_cg115_delivery_transition_guard","workspace_unified_cg_live_deliveries"],
    ["workspace_cg115_reclosure_invariant_guard","workspace_reconciliation_unified_cg_reclosures"]
  ]);
  for (const row of triggers.rows) {
    assert(
      expected.get(row.trigger_name) === row.table_name,
      "Build 115 trigger attached to unexpected table: " + row.trigger_name
    );
  }

  const helperGrant = await authPool.query<{ allowed: boolean }>(
    `select has_function_privilege(
       'ai_data_runtime',
       'app.cg115_effective_terminal_recurrence(uuid,uuid)',
       'EXECUTE'
     ) as allowed`
  );
  assert(helperGrant.rows[0]?.allowed, "Build 115 runtime role needs bounded effective-terminal read helper.");

  const lineageGrants = await authPool.query<{ table_name: string; privilege_type: string }>(
    `select table_name,privilege_type
       from information_schema.role_table_grants
      where table_schema='app'
        and grantee='ai_data_runtime'
        and table_name in (
          'workspace_corrective_generation_registry',
          'workspace_corrective_generation_successors'
        )`
  );
  for (const tableName of [
    "workspace_corrective_generation_registry",
    "workspace_corrective_generation_successors"
  ]) {
    const privileges = new Set(
      lineageGrants.rows
        .filter((row) => row.table_name === tableName)
        .map((row) => row.privilege_type)
    );
    assert(privileges.has("SELECT"), tableName + " must retain runtime SELECT.");
    assert(!privileges.has("INSERT"), tableName + " must reject direct runtime INSERT.");
    assert(!privileges.has("UPDATE"), tableName + " must reject direct runtime UPDATE.");
    assert(!privileges.has("DELETE"), tableName + " must reject direct runtime DELETE.");
  }

  const immutable = await authPool.query<{ trigger_name: string }>(
    `select t.tgname as trigger_name
       from pg_trigger t
       join pg_class c on c.oid=t.tgrelid
       join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app'
        and not t.tgisinternal
        and t.tgname in (
          'workspace_cg_registry_immutable_guard',
          'workspace_cg_successors_immutable_guard',
          'workspace_cg_legacy_terminal_immutable_guard'
        )`
  );
  assert(
    immutable.rows.length === 3,
    "Build 115 must preserve Build 109/114 append-only lineage guards."
  );

  console.log("Build 115 corrective-generation state machine database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
