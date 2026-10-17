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
         'workspace_continuation_generation_corrective_delivery_activations',
         'workspace_continuation_generation_corrective_live_deliveries'
       )`
  );
  assert(tables.rows.length === 2, "Build 078 tables must exist.");
  assert(tables.rows.every((row) => row.rowsecurity), "Build 078 tables must have RLS enabled.");

  const policies = await authPool.query<{ policyname: string }>(
    `select policyname
     from pg_policies
     where schemaname='app'
       and policyname in (
         'continuation_generation_activations_member_select',
         'continuation_generation_activations_manager_insert',
         'continuation_generation_activations_manager_update',
         'continuation_generation_deliveries_member_select',
         'continuation_generation_deliveries_manager_insert',
         'continuation_generation_deliveries_manager_update'
       )`
  );
  assert(policies.rows.length === 6, "Build 078 intended RLS policies must exist.");

  const tableGrants = await authPool.query<{ table_name: string; privilege_type: string }>(
    `select table_name,privilege_type
     from information_schema.role_table_grants
     where table_schema='app'
       and grantee='ai_data_runtime'
       and table_name in (
         'workspace_continuation_generation_corrective_delivery_activations',
         'workspace_continuation_generation_corrective_live_deliveries'
       )`
  );
  const columnGrants = await authPool.query<{
    table_name: string;
    column_name: string;
    privilege_type: string;
  }>(
    `select table_name,column_name,privilege_type
     from information_schema.column_privileges
     where table_schema='app'
       and grantee='ai_data_runtime'
       and privilege_type='UPDATE'
       and table_name in (
         'workspace_continuation_generation_corrective_delivery_activations',
         'workspace_continuation_generation_corrective_live_deliveries'
       )`
  );

  for (const table of [
    "workspace_continuation_generation_corrective_delivery_activations",
    "workspace_continuation_generation_corrective_live_deliveries"
  ]) {
    const privileges = new Set(
      tableGrants.rows
        .filter((row) => row.table_name === table)
        .map((row) => row.privilege_type)
    );
    assert(privileges.has("SELECT") && privileges.has("INSERT"), table + " SELECT/INSERT grants are incomplete.");
    assert(!privileges.has("UPDATE"), table + " must not grant unrestricted UPDATE.");
    assert(!privileges.has("DELETE"), table + " must not grant DELETE.");
  }

  const activationUpdates = new Set(
    columnGrants.rows
      .filter((row) => row.table_name === "workspace_continuation_generation_corrective_delivery_activations")
      .map((row) => row.column_name)
  );
  for (const column of ["status","revoked_by","revoked_at","revocation_note"]) {
    assert(activationUpdates.has(column), "Missing activation UPDATE grant for " + column + ".");
  }

  const deliveryUpdates = new Set(
    columnGrants.rows
      .filter((row) => row.table_name === "workspace_continuation_generation_corrective_live_deliveries")
      .map((row) => row.column_name)
  );
  for (const column of [
    "status","attempt_count","validation_code","http_status",
    "consumer_received_at","acknowledgement","last_attempt_at","updated_at"
  ]) {
    assert(deliveryUpdates.has(column), "Missing delivery UPDATE grant for " + column + ".");
  }

  const insertPolicies = await authPool.query<{ policyname: string; expression: string }>(
    `select p.polname as policyname,
            coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') as expression
     from pg_policy p
     join pg_class c on c.oid=p.polrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and p.polname in (
         'continuation_generation_activations_manager_insert',
         'continuation_generation_deliveries_manager_insert'
       )`
  );
  const activation = insertPolicies.rows.find(
    (row) => row.policyname === "continuation_generation_activations_manager_insert"
  )?.expression ?? "";
  for (const required of [
    "workspace_continuation_generation_corrective_delivery_plans",
    "workspace_successive_generation_recurrence_triage_cycles",
    "workspace_reconciliation_successive_generation_recurrences",
    "workspace_post_successive_generation_reclosure_checks",
    "workspace_reconciliation_successive_generation_reclosures",
    "workspace_successive_generation_corrective_live_deliveries"
  ]) {
    assert(activation.includes(required), "Build 078 activation gate is missing " + required + ".");
  }
  assert(
    activation.includes("successive_generation_package_id") &&
      activation.includes("successive_generation_replay_key") &&
      activation.includes("successive_generation_package_fingerprint"),
    "Build 078 activation gate must bind the exact predecessor successive-generation package."
  );

  const delivery = insertPolicies.rows.find(
    (row) => row.policyname === "continuation_generation_deliveries_manager_insert"
  )?.expression ?? "";
  for (const required of [
    "workspace_continuation_generation_corrective_delivery_activations",
    "workspace_continuation_generation_corrective_delivery_plans",
    "workspace_successive_generation_recurrence_triage_cycles",
    "workspace_reconciliation_successive_generation_recurrences"
  ]) {
    assert(delivery.includes(required), "Build 078 delivery gate is missing " + required + ".");
  }
  assert(
    delivery.includes("idempotency_key") &&
      delivery.includes("continuation_generation_replay_key"),
    "Build 078 delivery insert must bind idempotency to the continuation-generation replay key."
  );

  const freezeFunction = await authPool.query<{ definition: string }>(
    `select pg_get_functiondef(p.oid) as definition
     from pg_proc p
     join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='app'
       and p.proname='require_no_continuation_execution_for_successive_recurrence'`
  );
  assert(
    freezeFunction.rows[0]?.definition.includes(
      "workspace_continuation_generation_corrective_delivery_activations"
    ),
    "Build 078 must freeze Build 077 successive-generation recurrence planning after execution begins."
  );

  const triggers = await authPool.query<{ trigger_name: string; table_name: string }>(
    `select t.tgname as trigger_name,c.relname as table_name
     from pg_trigger t
     join pg_class c on c.oid=t.tgrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and not t.tgisinternal
       and t.tgname in (
         'workspace_successive_retriage_continuation_exec_guard',
         'workspace_continuation_plan_execution_guard'
       )`
  );
  assert(triggers.rows.length === 2, "Build 078 continuation execution freeze triggers must exist.");

  const attemptCheck = await authPool.query<{ definition: string }>(
    `select pg_get_constraintdef(con.oid) as definition
     from pg_constraint con
     join pg_class c on c.oid=con.conrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and c.relname='workspace_continuation_generation_corrective_live_deliveries'
       and con.contype='c'
       and pg_get_constraintdef(con.oid) like '%attempt_count%'`
  );
  assert(
    attemptCheck.rows.some((row) => row.definition.includes("5")),
    "Build 078 retry bound must be enforced by a database check."
  );

  console.log("Build 078 continuation-generation corrective delivery database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
