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
         'workspace_next_generation_corrective_delivery_reconciliations',
         'workspace_reconciliation_exception_next_generation_reclosures'
       )`
  );
  assert(tables.rows.length === 2, "Build 063 tables must exist.");
  assert(tables.rows.every((row) => row.rowsecurity), "Build 063 tables must have RLS enabled.");

  const policies = await authPool.query<{ policyname: string }>(
    `select policyname
     from pg_policies
     where schemaname='app'
       and policyname in (
         'next_generation_reconciliations_member_select',
         'next_generation_reconciliations_manager_insert',
         'next_generation_reclosures_member_select',
         'next_generation_reclosures_manager_insert'
       )`
  );
  assert(policies.rows.length === 4, "Build 063 intended RLS policies must exist.");

  const grants = await authPool.query<{ table_name: string; privilege_type: string }>(
    `select table_name,privilege_type
     from information_schema.role_table_grants
     where table_schema='app'
       and grantee='ai_data_runtime'
       and table_name in (
         'workspace_next_generation_corrective_delivery_reconciliations',
         'workspace_reconciliation_exception_next_generation_reclosures'
       )`
  );
  for (const table of [
    "workspace_next_generation_corrective_delivery_reconciliations",
    "workspace_reconciliation_exception_next_generation_reclosures"
  ]) {
    const privileges = new Set(
      grants.rows.filter((row) => row.table_name === table).map((row) => row.privilege_type)
    );
    assert(privileges.has("SELECT") && privileges.has("INSERT"), table + " SELECT/INSERT grants are incomplete.");
    assert(!privileges.has("UPDATE"), table + " must not grant runtime UPDATE.");
    assert(!privileges.has("DELETE"), table + " must not grant runtime DELETE.");
  }

  const insertPolicies = await authPool.query<{ table_name: string; policy_name: string; expression: string }>(
    `select c.relname as table_name,p.polname as policy_name,
            coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') as expression
     from pg_policy p
     join pg_class c on c.oid=p.polrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and (
         (c.relname='workspace_next_generation_corrective_delivery_reconciliations'
          and p.polname='next_generation_reconciliations_manager_insert')
         or
         (c.relname='workspace_reconciliation_exception_next_generation_reclosures'
          and p.polname='next_generation_reclosures_manager_insert')
       )`
  );
  assert(insertPolicies.rows.length === 2, "Build 063 insert gates must exist.");

  const reconciliationGate = insertPolicies.rows.find(
    (row) => row.table_name === "workspace_next_generation_corrective_delivery_reconciliations"
  )?.expression ?? "";
  for (const required of [
    "workspace_next_generation_corrective_live_deliveries",
    "workspace_next_generation_corrective_delivery_plans",
    "workspace_recurrent_exception_triage_cycles",
    "workspace_reconciliation_exception_recurrences",
    "workspace_reconciliation_exception_reclosures",
    "workspace_post_reclosure_regression_checks"
  ]) {
    assert(reconciliationGate.includes(required), "Build 063 reconciliation gate is missing " + required + ".");
  }
  assert(
    reconciliationGate.includes("next_generation_package_id") &&
      reconciliationGate.includes("next_generation_replay_key") &&
      reconciliationGate.includes("next_generation_package_fingerprint"),
    "Build 063 reconciliation gate must bind exact Build 062 package identity."
  );

  const reclosureGate = insertPolicies.rows.find(
    (row) => row.table_name === "workspace_reconciliation_exception_next_generation_reclosures"
  )?.expression ?? "";
  for (const required of [
    "workspace_next_generation_corrective_delivery_reconciliations",
    "workspace_reconciliation_exception_recurrences",
    "workspace_reconciliation_exception_reclosures"
  ]) {
    assert(reclosureGate.includes(required), "Build 063 re-closure gate is missing " + required + ".");
  }
  assert(
    reclosureGate.includes("next_generation_reconciliation_id") &&
      reclosureGate.includes("recurrence_id"),
    "Build 063 re-closure gate must require latest verification and latest recurrence."
  );

  const guard = await authPool.query<{ definition: string }>(
    `select pg_get_functiondef(p.oid) as definition
     from pg_proc p
     join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='app' and p.proname='require_verified_corrective_closure'`
  );
  const definition = guard.rows[0]?.definition ?? "";
  assert(
    definition.includes("workspace_reconciliation_exception_next_generation_reclosures"),
    "Build 063 close trigger must recognize next-generation re-closure evidence."
  );
  assert(
    definition.includes("workspace_reconciliation_exception_recurrences"),
    "Build 063 close trigger must be recurrence-generation aware."
  );
  assert(
    definition.includes("reconciliation_triage_verified_next_generation_reclosure_required"),
    "Build 063 close trigger must fail closed with next-generation-specific evidence."
  );
  assert(
    definition.includes("workspace_reconciliation_exception_reclosures"),
    "Build 063 close trigger must preserve Build 059 successor re-closure behavior before recurrence."
  );

  console.log("Build 063 next-generation reconciliation and re-closure database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
