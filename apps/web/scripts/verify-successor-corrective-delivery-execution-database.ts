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
         'workspace_successor_corrective_delivery_activations',
         'workspace_successor_corrective_live_deliveries'
       )`
  );
  assert(tables.rows.length === 2, "Build 058 tables must exist.");
  assert(tables.rows.every((row) => row.rowsecurity), "Build 058 tables must have RLS enabled.");

  const policies = await authPool.query<{ policyname: string }>(
    `select policyname
     from pg_policies
     where schemaname='app'
       and policyname in (
         'workspace_successor_corrective_delivery_activations_member_select',
         'workspace_successor_corrective_delivery_activations_manager_insert',
         'workspace_successor_corrective_delivery_activations_manager_update',
         'workspace_successor_corrective_live_deliveries_member_select',
         'workspace_successor_corrective_live_deliveries_manager_insert',
         'workspace_successor_corrective_live_deliveries_manager_update'
       )`
  );
  assert(policies.rows.length === 6, "Build 058 RLS policies must exist.");

  const activeIndex = await authPool.query<{ indexname: string }>(
    `select indexname
     from pg_indexes
     where schemaname='app'
       and indexname='workspace_successor_corrective_delivery_activations_one_active_idx'`
  );
  assert(activeIndex.rows.length === 1, "Build 058 one-active-activation index must exist.");

  const tableGrants = await authPool.query<{ table_name: string; privilege_type: string }>(
    `select table_name,privilege_type
     from information_schema.role_table_grants
     where table_schema='app'
       and grantee='ai_data_runtime'
       and table_name in (
         'workspace_successor_corrective_delivery_activations',
         'workspace_successor_corrective_live_deliveries'
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
         'workspace_successor_corrective_delivery_activations',
         'workspace_successor_corrective_live_deliveries'
       )`
  );

  for (const table of [
    "workspace_successor_corrective_delivery_activations",
    "workspace_successor_corrective_live_deliveries"
  ]) {
    const privileges = new Set(
      tableGrants.rows
        .filter((row) => row.table_name === table)
        .map((row) => row.privilege_type)
    );
    assert(privileges.has("SELECT") && privileges.has("INSERT"), table + " SELECT/INSERT grants are incomplete.");
    assert(!privileges.has("UPDATE"), table + " must not grant unrestricted table UPDATE.");
    assert(!privileges.has("DELETE"), table + " must not grant runtime DELETE.");
  }

  const activationUpdates = new Set(
    columnGrants.rows
      .filter((row) => row.table_name === "workspace_successor_corrective_delivery_activations")
      .map((row) => row.column_name)
  );
  for (const column of ["status","revoked_by","revoked_at","revocation_note"]) {
    assert(activationUpdates.has(column), "Missing successor activation UPDATE grant for " + column + ".");
  }

  const deliveryUpdates = new Set(
    columnGrants.rows
      .filter((row) => row.table_name === "workspace_successor_corrective_live_deliveries")
      .map((row) => row.column_name)
  );
  for (const column of [
    "status","attempt_count","validation_code","http_status",
    "consumer_received_at","acknowledgement","last_attempt_at","updated_at"
  ]) {
    assert(deliveryUpdates.has(column), "Missing successor delivery UPDATE grant for " + column + ".");
  }

  const legacyPolicies = await authPool.query<{ tablename: string; policyname: string; expression: string }>(
    `select c.relname as tablename,p.polname as policyname,
            coalesce(pg_get_expr(p.polqual,p.polrelid),'') || ' ' ||
            coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') as expression
     from pg_policy p
     join pg_class c on c.oid=p.polrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and (
         (c.relname='workspace_corrective_delivery_activations'
          and p.polname='workspace_corrective_delivery_activations_manager_insert')
         or
         (c.relname='workspace_corrective_live_deliveries'
          and p.polname in (
            'workspace_corrective_live_deliveries_manager_insert',
            'workspace_corrective_live_deliveries_manager_update'
          ))
       )`
  );
  assert(legacyPolicies.rows.length === 3, "Build 058 legacy write guards must exist.");
  assert(
    legacyPolicies.rows.every((row) =>
      row.expression.includes("workspace_reconciliation_exception_reopens")
    ),
    "Build 058 must block Build 054 activation/delivery writes after reopen."
  );

  const activationInsert = await authPool.query<{ expression: string }>(
    `select pg_get_expr(p.polwithcheck,p.polrelid) as expression
     from pg_policy p
     join pg_class c on c.oid=p.polrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='app'
       and c.relname='workspace_successor_corrective_delivery_activations'
       and p.polname='workspace_successor_corrective_delivery_activations_manager_insert'`
  );
  const expression = activationInsert.rows[0]?.expression ?? "";
  for (const required of [
    "workspace_successor_corrective_delivery_plans",
    "workspace_reopened_exception_triage_cycles",
    "workspace_post_closure_regression_checks",
    "workspace_corrective_live_deliveries"
  ]) {
    assert(expression.includes(required), "Build 058 activation policy is missing " + required + " gating.");
  }

  console.log("Build 058 successor corrective delivery database verification passed.");
}

main()
  .finally(closeDatabasePools)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
