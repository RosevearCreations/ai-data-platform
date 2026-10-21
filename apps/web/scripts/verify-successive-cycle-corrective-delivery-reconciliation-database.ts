import { authPool, closeDatabasePools } from "../lib/database";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  assert(
    "workspace_successive_cycle_delivery_reconciliations".length <= 63 &&
      "workspace_reconciliation_successive_cycle_reclosures".length <= 63 &&
      "workspace_successive_cycle_reconciliations_recent_idx".length <= 63 &&
      "workspace_successive_cycle_reconciliations_delivery_idx".length <= 63 &&
      "workspace_successive_cycle_reclosures_recent_idx".length <= 63,
    "Build 095 PostgreSQL identifiers must remain within 63 bytes."
  );
  const tables = await authPool.query<{ table_name: string; rowsecurity: boolean }>(
    `select c.relname as table_name,c.relrowsecurity as rowsecurity
     from pg_class c
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and c.relname in (
         'workspace_successive_cycle_delivery_reconciliations',
         'workspace_reconciliation_successive_cycle_reclosures'
       )`
  );
  assert(tables.rows.length === 2, "Build 095 tables must exist.");
  assert(tables.rows.every((row) => row.rowsecurity), "Build 095 tables must have RLS enabled.");

  const policies = await authPool.query<{ policyname: string }>(
    `select policyname
     from pg_policies
     where schemaname='app'
       and policyname in (
         'successive_cycle_reconciliations_member_select',
         'successive_cycle_reconciliations_manager_insert',
         'successive_cycle_reclosures_member_select',
         'successive_cycle_reclosures_manager_insert'
       )`
  );
  assert(policies.rows.length === 4, "Build 095 intended RLS policies must exist.");

  const grants = await authPool.query<{ table_name: string; privilege_type: string }>(
    `select table_name,privilege_type
     from information_schema.role_table_grants
     where table_schema='app'
       and grantee='ai_data_runtime'
       and table_name in (
         'workspace_successive_cycle_delivery_reconciliations',
         'workspace_reconciliation_successive_cycle_reclosures'
       )`
  );
  for (const table of [
    "workspace_successive_cycle_delivery_reconciliations",
    "workspace_reconciliation_successive_cycle_reclosures"
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
         (c.relname='workspace_successive_cycle_delivery_reconciliations'
          and p.polname='successive_cycle_reconciliations_manager_insert')
         or
         (c.relname='workspace_reconciliation_successive_cycle_reclosures'
          and p.polname='successive_cycle_reclosures_manager_insert')
       )`
  );
  assert(insertPolicies.rows.length === 2, "Build 095 insert gates must exist.");

  const reconciliationGate = insertPolicies.rows.find(
    (row) => row.table_name === "workspace_successive_cycle_delivery_reconciliations"
  )?.expression ?? "";
  for (const required of [
    "workspace_successive_cycle_corrective_live_deliveries",
    "workspace_successive_cycle_corrective_delivery_plans",
    "workspace_subsequent_cycle_recurrence_triage_cycles",
    "workspace_reconciliation_subsequent_cycle_recurrences",
    "workspace_reconciliation_subsequent_cycle_reclosures",
    "workspace_post_subsequent_cycle_reclosure_checks"
  ]) {
    assert(reconciliationGate.includes(required), "Build 095 reconciliation gate is missing " + required + ".");
  }
  assert(
    reconciliationGate.includes("successive_cycle_package_id") &&
      reconciliationGate.includes("successive_cycle_replay_key") &&
      reconciliationGate.includes("successive_cycle_package_fingerprint"),
    "Build 095 reconciliation gate must bind exact Build 094 package identity."
  );

  const reclosureGate = insertPolicies.rows.find(
    (row) => row.table_name === "workspace_reconciliation_successive_cycle_reclosures"
  )?.expression ?? "";
  for (const required of [
    "workspace_successive_cycle_delivery_reconciliations",
    "workspace_reconciliation_subsequent_cycle_recurrences",
    "workspace_reconciliation_subsequent_cycle_reclosures"
  ]) {
    assert(reclosureGate.includes(required), "Build 095 re-closure gate is missing " + required + ".");
  }
  assert(
    reclosureGate.includes("successive_cycle_reconciliation_id") &&
      reclosureGate.includes("subsequent_cycle_recurrence_id"),
    "Build 095 re-closure gate must require latest verification and latest recurrence."
  );

  const guard = await authPool.query<{ definition: string }>(
    `select pg_get_functiondef(p.oid) as definition
     from pg_proc p
     join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='app' and p.proname='require_verified_corrective_closure'`
  );
  const definition = guard.rows[0]?.definition ?? "";
  assert(
    definition.includes("workspace_reconciliation_successive_cycle_reclosures"),
    "Build 095 close trigger must recognize successive-cycle re-closure evidence."
  );
  assert(
    definition.includes("workspace_reconciliation_subsequent_cycle_recurrences"),
    "Build 095 close trigger must prioritize the subsequent-cycle recurrence."
  );
  assert(
    definition.includes("reconciliation_triage_verified_successive_cycle_reclosure_required") &&
      definition.includes("reconciliation_triage_verified_subsequent_cycle_reclosure_required"),
    "Build 095 close trigger must fail closed with successive-cycle-specific evidence."
  );
  assert(
    definition.includes("workspace_reconciliation_following_cycle_recurrences") &&
      definition.includes("workspace_reconciliation_subsequent_cycle_reclosures"),
    "Build 095 close trigger must preserve Build 091 following-cycle → subsequent-cycle re-closure behavior."
  );
  assert(
    definition.includes("workspace_reconciliation_next_cycle_recurrences") &&
      definition.includes("workspace_reconciliation_next_cycle_reclosures"),
    "Build 095 close trigger must preserve Build 083 next-cycle re-closure behavior."
  );
  assert(
    definition.includes("workspace_reconciliation_continuation_generation_recurrences") &&
      definition.includes("workspace_reconciliation_continuation_generation_reclosures"),
    "Build 095 close trigger must preserve continuation-generation historical re-closure behavior."
  );
  assert(
    definition.includes("workspace_reconciliation_successive_generation_recurrences") &&
      definition.includes("workspace_reconciliation_successive_generation_reclosures"),
    "Build 095 close trigger must preserve successive-generation historical re-closure behavior."
  );
  assert(
    definition.includes("workspace_reconciliation_subsequent_generation_recurrences") &&
      definition.includes("workspace_reconciliation_subsequent_generation_reclosures"),
    "Build 095 close trigger must preserve subsequent-generation historical re-closure behavior."
  );
  assert(
    definition.includes("workspace_reconciliation_successor_generation_recurrences") &&
      definition.includes("workspace_reconciliation_successor_generation_reclosures"),
    "Build 095 close trigger must preserve successor-generation fallback behavior."
  );
  assert(
    definition.includes("workspace_reconciliation_exception_next_generation_recurrences"),
    "Build 095 close trigger must preserve Build 064 second-recurrence detection."
  );
  assert(
    definition.includes("workspace_reconciliation_exception_next_generation_reclosures"),
    "Build 095 close trigger must preserve Build 063 next-generation re-closure fallback."
  );
  assert(
    definition.includes("workspace_reconciliation_exception_recurrences"),
    "Build 095 close trigger must preserve first-recurrence fallback behavior."
  );

  console.log("Build 095 successive-cycle reconciliation and re-closure database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
