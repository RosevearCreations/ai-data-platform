import { authPool, closeDatabasePools } from "../lib/database";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const identifiers = [
    "workspace_unified_cg_delivery_reconciliations",
    "workspace_reconciliation_unified_cg_reclosures",
    "workspace_ucg112_recon_recent_idx",
    "workspace_ucg112_recon_delivery_idx",
    "workspace_ucg112_reclosure_recent_idx"
  ];
  assert(
    identifiers.every((identifier) => Buffer.byteLength(identifier, "utf8") <= 63),
    "Build 112 PostgreSQL identifiers must remain within 63 bytes."
  );

  const tables = await authPool.query<{ table_name: string; rowsecurity: boolean }>(
    `select c.relname as table_name,c.relrowsecurity as rowsecurity
       from pg_class c
       join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app'
        and c.relname in (
          'workspace_unified_cg_delivery_reconciliations',
          'workspace_reconciliation_unified_cg_reclosures'
        )`
  );
  assert(tables.rows.length === 2, "Build 112 tables must exist.");
  assert(tables.rows.every((row) => row.rowsecurity), "Build 112 tables must have RLS enabled.");

  const policies = await authPool.query<{ policyname: string }>(
    `select policyname
       from pg_policies
      where schemaname='app'
        and policyname in (
          'ucg112_reconciliations_member_select',
          'ucg112_reconciliations_manager_insert',
          'ucg112_reclosures_member_select',
          'ucg112_reclosures_manager_insert'
        )`
  );
  assert(policies.rows.length === 4, "Build 112 intended RLS policies must exist.");

  const grants = await authPool.query<{ table_name: string; privilege_type: string }>(
    `select table_name,privilege_type
       from information_schema.role_table_grants
      where table_schema='app'
        and grantee='ai_data_runtime'
        and table_name in (
          'workspace_unified_cg_delivery_reconciliations',
          'workspace_reconciliation_unified_cg_reclosures'
        )`
  );
  for (const table of [
    "workspace_unified_cg_delivery_reconciliations",
    "workspace_reconciliation_unified_cg_reclosures"
  ]) {
    const privileges = new Set(
      grants.rows.filter((row) => row.table_name === table).map((row) => row.privilege_type)
    );
    assert(
      privileges.has("SELECT") && privileges.has("INSERT"),
      table + " SELECT/INSERT grants are incomplete."
    );
    assert(!privileges.has("UPDATE"), table + " must not grant runtime UPDATE.");
    assert(!privileges.has("DELETE"), table + " must not grant runtime DELETE.");
  }

  const gates = await authPool.query<{ policy_name: string; expression: string }>(
    `select p.polname as policy_name,
            coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') as expression
       from pg_policy p
       join pg_class c on c.oid=p.polrelid
       join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app'
        and p.polname in (
          'ucg112_reconciliations_manager_insert',
          'ucg112_reclosures_manager_insert'
        )`
  );
  const reconciliation = gates.rows.find(
    (row) => row.policy_name === "ucg112_reconciliations_manager_insert"
  )?.expression ?? "";
  for (const required of [
    "workspace_unified_cg_live_deliveries",
    "workspace_unified_cg_delivery_activations",
    "workspace_corrective_generation_plans",
    "workspace_corrective_generation_retriage",
    "workspace_corrective_generation_successors",
    "workspace_corrective_generation_registry",
    "workspace_reconciliation_exception_cases"
  ]) {
    assert(reconciliation.includes(required), "Build 112 reconciliation gate is missing " + required + ".");
  }
  for (const required of [
    "unified_package_id",
    "unified_replay_key",
    "unified_package_fingerprint",
    "source_successor_fingerprint",
    "predecessor_registry_fingerprint"
  ]) {
    assert(reconciliation.includes(required), "Build 112 reconciliation gate must bind " + required + ".");
  }

  const reclosure = gates.rows.find(
    (row) => row.policy_name === "ucg112_reclosures_manager_insert"
  )?.expression ?? "";
  assert(
    reclosure.includes("workspace_unified_cg_delivery_reconciliations") &&
      reclosure.includes("workspace_corrective_generation_successors") &&
      reclosure.includes("workspace_corrective_generation_registry"),
    "Build 112 re-closure gate must bind verification, successor and lineage evidence."
  );
  assert(
    reclosure.includes("reconciliation_id") &&
      reclosure.includes("successor_source_id") &&
      reclosure.includes("status") &&
      reclosure.includes("matched"),
    "Build 112 re-closure gate must require latest matched verification for the successor source."
  );

  const guard = await authPool.query<{ definition: string }>(
    `select pg_get_functiondef(p.oid) as definition
       from pg_proc p
       join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='app' and p.proname='require_verified_corrective_closure'`
  );
  const definition = guard.rows[0]?.definition ?? "";
  assert(
    definition.includes("workspace_reconciliation_unified_cg_reclosures") &&
      definition.includes("workspace_corrective_generation_successors"),
    "Build 112 close guard must require unified re-closure for the latest successor source."
  );
  assert(
    definition.includes("reconciliation_triage_verified_unified_corrective_generation_reclosure_required"),
    "Build 112 close guard must fail closed with a unified-specific error."
  );
  assert(
    definition.includes("workspace_reconciliation_following_cg_recurrences") &&
      definition.includes("workspace_reconciliation_following_cg_reclosures"),
    "Build 112 close guard must preserve historical following-corrective-generation governance."
  );

  console.log("Build 112 unified corrective-generation reconciliation database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
