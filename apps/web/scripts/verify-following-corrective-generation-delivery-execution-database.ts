import { authPool, closeDatabasePools } from "../lib/database";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const postgresIdentifiers = [
    "workspace_following_corrective_generation_delivery_activations",
    "workspace_following_corrective_generation_live_deliveries",
    "workspace_follow_act106_one_active_idx",
    "workspace_follow_act106_recent_idx",
    "workspace_follow_live106_recent_idx",
    "require_no_b106_follow_exec_for_ncg_recurrence",
    "workspace_ncg_retriage_b106_follow_exec_guard",
    "workspace_follow_plan_b106_exec_guard"
  ];
  assert(
    postgresIdentifiers.every((identifier) => Buffer.byteLength(identifier, "utf8") <= 63),
    "Build 106 database identifiers must fit PostgreSQL's 63-byte identifier limit."
  );
  const tables = await authPool.query<{ table_name: string; rowsecurity: boolean }>(
    `select c.relname as table_name,c.relrowsecurity as rowsecurity
     from pg_class c
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and c.relname in (
         'workspace_following_corrective_generation_delivery_activations',
         'workspace_following_corrective_generation_live_deliveries'
       )`
  );
  assert(tables.rows.length === 2, "Build 106 tables must exist.");
  assert(tables.rows.every((row) => row.rowsecurity), "Build 106 tables must have RLS enabled.");

  const policies = await authPool.query<{ policyname: string }>(
    `select policyname
     from pg_policies
     where schemaname='app'
       and policyname in (
         'following_corrective_generation_activations_member_select',
         'following_corrective_generation_activations_manager_insert',
         'following_corrective_generation_activations_manager_update',
         'following_corrective_generation_deliveries_member_select',
         'following_corrective_generation_deliveries_manager_insert',
         'following_corrective_generation_deliveries_manager_update'
       )`
  );
  assert(policies.rows.length === 6, "Build 106 intended RLS policies must exist.");

  const tableGrants = await authPool.query<{ table_name: string; privilege_type: string }>(
    `select table_name,privilege_type
     from information_schema.role_table_grants
     where table_schema='app'
       and grantee='ai_data_runtime'
       and table_name in (
         'workspace_following_corrective_generation_delivery_activations',
         'workspace_following_corrective_generation_live_deliveries'
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
         'workspace_following_corrective_generation_delivery_activations',
         'workspace_following_corrective_generation_live_deliveries'
       )`
  );

  for (const table of [
    "workspace_following_corrective_generation_delivery_activations",
    "workspace_following_corrective_generation_live_deliveries"
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
      .filter((row) => row.table_name === "workspace_following_corrective_generation_delivery_activations")
      .map((row) => row.column_name)
  );
  for (const column of ["status","revoked_by","revoked_at","revocation_note"]) {
    assert(activationUpdates.has(column), "Missing activation UPDATE grant for " + column + ".");
  }

  const deliveryUpdates = new Set(
    columnGrants.rows
      .filter((row) => row.table_name === "workspace_following_corrective_generation_live_deliveries")
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
         'following_corrective_generation_activations_manager_insert',
         'following_corrective_generation_deliveries_manager_insert'
       )`
  );
  const activation = insertPolicies.rows.find(
    (row) => row.policyname === "following_corrective_generation_activations_manager_insert"
  )?.expression ?? "";
  for (const required of [
    "workspace_following_corrective_generation_plans",
    "workspace_next_corrective_generation_recurrence_triage",
    "workspace_reconciliation_next_corrective_generation_recurrences",
    "workspace_post_next_corrective_generation_reclosure_checks",
    "workspace_reconciliation_next_corrective_generation_reclosures",
    "workspace_next_corrective_generation_live_deliveries"
  ]) {
    assert(activation.includes(required), "Build 106 activation gate is missing " + required + ".");
  }
  assert(
    activation.includes("next_corrective_generation_package_id") &&
      activation.includes("next_corrective_generation_replay_key") &&
      activation.includes("next_corrective_generation_package_fingerprint"),
    "Build 106 activation gate must bind the exact predecessor next-corrective-generation package."
  );

  const delivery = insertPolicies.rows.find(
    (row) => row.policyname === "following_corrective_generation_deliveries_manager_insert"
  )?.expression ?? "";
  for (const required of [
    "workspace_following_corrective_generation_delivery_activations",
    "workspace_following_corrective_generation_plans",
    "workspace_next_corrective_generation_recurrence_triage",
    "workspace_reconciliation_next_corrective_generation_recurrences"
  ]) {
    assert(delivery.includes(required), "Build 106 delivery gate is missing " + required + ".");
  }
  assert(
    delivery.includes("idempotency_key") &&
      delivery.includes("following_corrective_generation_replay_key"),
    "Build 106 delivery insert must bind idempotency to the following-corrective-generation replay key."
  );

  const freezeFunction = await authPool.query<{ definition: string }>(
    `select pg_get_functiondef(p.oid) as definition
     from pg_proc p
     join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='app'
       and p.proname='require_no_b106_follow_exec_for_ncg_recurrence'`
  );
  assert(
    freezeFunction.rows[0]?.definition.includes(
      "workspace_following_corrective_generation_delivery_activations"
    ),
    "Build 106 must freeze Build 105 next-corrective-generation recurrence planning after execution begins."
  );

  const triggers = await authPool.query<{ trigger_name: string; table_name: string }>(
    `select t.tgname as trigger_name,c.relname as table_name
     from pg_trigger t
     join pg_class c on c.oid=t.tgrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and not t.tgisinternal
       and t.tgname in (
         'workspace_ncg_retriage_b106_follow_exec_guard',
         'workspace_follow_plan_b106_exec_guard'
       )`
  );
  assert(triggers.rows.length === 2, "Build 106 following-corrective-generation execution freeze triggers must exist.");

  const attemptCheck = await authPool.query<{ definition: string }>(
    `select pg_get_constraintdef(con.oid) as definition
     from pg_constraint con
     join pg_class c on c.oid=con.conrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and c.relname='workspace_following_corrective_generation_live_deliveries'
       and con.contype='c'
       and pg_get_constraintdef(con.oid) like '%attempt_count%'`
  );
  assert(
    attemptCheck.rows.some((row) => row.definition.includes("5")),
    "Build 106 retry bound must be enforced by a database check."
  );

  console.log("Build 106 following-corrective-generation corrective delivery database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
