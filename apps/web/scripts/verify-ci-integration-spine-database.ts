import pg from "pg";

const { Pool } = pg;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error("CI integration database verification failed: " + message);
}

const databaseUrl = process.env.DATABASE_URL;
assert(databaseUrl, "DATABASE_URL is required.");

const pool = new Pool({ connectionString: databaseUrl });

const requiredTables = [
  "workspace_credential_references",
  "workspace_credential_reference_events",
  "workspace_field_mapping_profiles",
  "workspace_field_mapping_profile_events",
  "workspace_field_mapping_drift_scans",
  "workspace_field_mapping_repair_sessions",
  "workspace_field_mapping_drift_events",
  "webhook_endpoints",
  "webhook_event_nonces",
  "webhook_receipts",
  "webhook_request_audit",
  "event_bus_subscriptions",
  "event_bus_publications",
  "event_bus_routes",
  "event_bus_audit",
  "event_bus_delivery_failures",
  "event_bus_dead_letters",
  "event_bus_replay_requests",
  "event_bus_replay_routes",
  "event_bus_recovery_audit",
  "event_bus_delivery_intents",
  "event_bus_delivery_attempt_reservations",
  "event_bus_duplicate_decisions",
  "event_bus_delivery_guarantee_audit",
  "customer_identity_observations",
  "customer_identity_candidates",
  "customer_identity_decisions",
  "customer_identity_groups",
  "customer_identity_links",
  "customer_identity_audit",
  "catalogue_exchange_items",
  "catalogue_exchange_packages",
  "catalogue_exchange_reviews",
  "catalogue_exchange_audit",
  "shared_media_assets",
  "shared_media_references",
  "shared_media_exchange_packages",
  "shared_media_exchange_reviews",
  "shared_media_exchange_audit",
  "notification_consent_evidence",
  "notification_requests",
  "notification_request_reviews",
  "notification_delivery_evidence",
  "notification_consent_audit",
  "shared_task_work_items",
  "shared_task_links",
  "shared_task_exchange_packages",
  "shared_task_exchange_reviews",
  "shared_task_exchange_audit",
  "shared_schedule_items",
  "shared_schedule_conflict_evidence",
  "shared_schedule_exchange_packages",
  "shared_schedule_exchange_reviews",
  "shared_schedule_exchange_audit",
  "integration_recovery_plans",
  "integration_recovery_attempts",
  "integration_recovery_decisions",
  "integration_recovery_audit",
  "workflow_automation_rules",
  "workflow_automation_rule_reviews",
  "workflow_automation_action_intents",
  "workflow_automation_audit",
  "integration_certification_runs",
  "integration_certification_assertions",
  "autonomous_operation_policies",
  "autonomous_operation_policy_events",
  "autonomous_operation_cycles",
  "autonomous_operation_actions",
  "production_learning_vi_snapshots",
  "production_learning_vi_candidates",
  "production_learning_vii_snapshots",
  "production_learning_vii_candidates",
  "performance_baseline_snapshots",
  "experience_telemetry_events",
  "service_performance_events",
  "rosevear_comms_authority_pins",
  "rosevear_comms_source_authorizations",
  "rosevear_comms_operation_claims"
];

const appendOnlyTables = [
  "workspace_credential_reference_events",
  "workspace_field_mapping_profile_events",
  "workspace_field_mapping_drift_scans",
  "workspace_field_mapping_drift_events",
  "webhook_event_nonces",
  "webhook_receipts",
  "webhook_request_audit",
  "event_bus_publications",
  "event_bus_routes",
  "event_bus_audit",
  "event_bus_delivery_failures",
  "event_bus_dead_letters",
  "event_bus_replay_requests",
  "event_bus_replay_routes",
  "event_bus_recovery_audit",
  "event_bus_delivery_intents",
  "event_bus_delivery_attempt_reservations",
  "event_bus_duplicate_decisions",
  "event_bus_delivery_guarantee_audit",
  "customer_identity_observations",
  "customer_identity_candidates",
  "customer_identity_decisions",
  "customer_identity_groups",
  "customer_identity_links",
  "customer_identity_audit",
  "catalogue_exchange_items",
  "catalogue_exchange_packages",
  "catalogue_exchange_reviews",
  "catalogue_exchange_audit",
  "shared_media_assets",
  "shared_media_references",
  "shared_media_exchange_packages",
  "shared_media_exchange_reviews",
  "shared_media_exchange_audit",
  "notification_consent_evidence",
  "notification_requests",
  "notification_request_reviews",
  "notification_delivery_evidence",
  "notification_consent_audit",
  "shared_task_work_items",
  "shared_task_links",
  "shared_task_exchange_packages",
  "shared_task_exchange_reviews",
  "shared_task_exchange_audit",
  "shared_schedule_items",
  "shared_schedule_conflict_evidence",
  "shared_schedule_exchange_packages",
  "shared_schedule_exchange_reviews",
  "shared_schedule_exchange_audit",
  "integration_recovery_plans",
  "integration_recovery_attempts",
  "integration_recovery_decisions",
  "integration_recovery_audit",
  "workflow_automation_rules",
  "workflow_automation_rule_reviews",
  "workflow_automation_action_intents",
  "workflow_automation_audit",
  "integration_certification_runs",
  "integration_certification_assertions",
  "autonomous_operation_policy_events",
  "autonomous_operation_cycles",
  "autonomous_operation_actions",
  "production_learning_vi_snapshots",
  "production_learning_vi_candidates",
  "production_learning_vii_snapshots",
  "production_learning_vii_candidates",
  "performance_baseline_snapshots",
  "experience_telemetry_events",
  "service_performance_events",
  "rosevear_comms_operation_claims"
];


async function main() {
  try {
    const tableResult = await pool.query<{
      relname: string;
      relrowsecurity: boolean;
    }>(
      `select c.relname, c.relrowsecurity
       from pg_class c
       join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='app'
         and c.relkind='r'
         and c.relname = any($1::text[])`,
      [requiredTables]
    );

    const byName = new Map(
      tableResult.rows.map((row) => [row.relname, row.relrowsecurity])
    );

    for (const table of requiredTables) {
      assert(byName.has(table), "missing required table app." + table);
      assert(byName.get(table) === true, "RLS not enabled on app." + table);
    }

    const sdkColumns = await pool.query<{ column_name: string }>(
      `select column_name
       from information_schema.columns
       where table_schema='app'
         and table_name='workspace_connector_audit'
         and column_name = any($1::text[])`,
      [[
        "sdk_version",
        "manifest_version",
        "transport_kind",
        "request_count",
        "retry_count",
        "page_count",
        "health_check_count",
        "transport_evidence",
        "sdk_audit_events"
      ]]
    );
    assert(sdkColumns.rowCount === 9, "Build 289 connector SDK audit columns incomplete");

    const grants = await pool.query<{
      table_name: string;
      privilege_type: string;
    }>(
      `select table_name, privilege_type
       from information_schema.role_table_grants
       where grantee='ai_data_runtime'
         and table_schema='app'
         and table_name = any($1::text[])
         and privilege_type in ('UPDATE','DELETE')`,
      [appendOnlyTables]
    );
    assert(
      grants.rowCount === 0,
      "append-only integration evidence unexpectedly grants UPDATE/DELETE: " +
        grants.rows.map((row) => row.table_name + ":" + row.privilege_type).join(",")
    );

    const migrationEvidence = await pool.query<{ name: string }>(
      `select name
       from app.schema_migrations
       where name = any($1::text[])`,
      [[
        "0099_shared_media_asset_exchange.sql",
        "0100_cross_app_notification_consent.sql",
        "0101_shared_task_work_queue_exchange.sql",
        "0102_shared_scheduling_calendar_exchange.sql",
        "0103_self_healing_connection_recovery.sql",
        "0104_cross_app_workflow_automation.sql",
        "0105_six_app_integration_certification.sql",
        "0106_autonomous_operations_owner_controls_learning_vi.sql",
        "0107_ql365d_ai_data_platform_source_attachment.sql"
      ]]
    );
    const migrationNames = new Set(migrationEvidence.rows.map((row) => row.name));
    assert(
      migrationNames.has("0099_shared_media_asset_exchange.sql"),
      "migration 0099 is not recorded"
    );
    assert(
      migrationNames.has("0100_cross_app_notification_consent.sql"),
      "migration 0100 is not recorded"
    );
    assert(
      migrationNames.has("0101_shared_task_work_queue_exchange.sql"),
      "migration 0101 is not recorded"
    );
    assert(
      migrationNames.has("0102_shared_scheduling_calendar_exchange.sql"),
      "migration 0102 is not recorded"
    );
    assert(
      migrationNames.has("0103_self_healing_connection_recovery.sql"),
      "migration 0103 is not recorded"
    );
    assert(
      migrationNames.has("0104_cross_app_workflow_automation.sql"),
      "migration 0104 is not recorded"
    );
    assert(
      migrationNames.has("0105_six_app_integration_certification.sql"),
      "migration 0105 is not recorded"
    );
    assert(
      migrationNames.has("0106_autonomous_operations_owner_controls_learning_vi.sql"),
      "migration 0106 is not recorded"
    );
    assert(
      migrationNames.has("0107_ql365d_ai_data_platform_source_attachment.sql"),
      "migration 0107 is not recorded"
    );

    const commsGrants = await pool.query<{
      table_name: string;
      privilege_type: string;
    }>(
      `select table_name, privilege_type
       from information_schema.role_table_grants
       where grantee='ai_data_runtime'
         and table_schema='app'
         and table_name = any($1::text[])`,
      [[
        "rosevear_comms_authority_pins",
        "rosevear_comms_source_authorizations",
        "rosevear_comms_operation_claims"
      ]]
    );
    const grantSet = new Set(
      commsGrants.rows.map((row) => row.table_name + ":" + row.privilege_type)
    );
    assert(
      grantSet.has("rosevear_comms_authority_pins:SELECT") &&
      grantSet.has("rosevear_comms_source_authorizations:SELECT") &&
      grantSet.has("rosevear_comms_operation_claims:SELECT") &&
      grantSet.has("rosevear_comms_operation_claims:INSERT"),
      "QL-365D runtime grants are incomplete"
    );
    assert(
      ![...grantSet].some((grant) =>
        /rosevear_comms_(authority_pins|source_authorizations):(INSERT|UPDATE|DELETE)$/.test(grant)
      ) &&
      ![...grantSet].some((grant) =>
        /rosevear_comms_operation_claims:(UPDATE|DELETE)$/.test(grant)
      ),
      "QL-365D runtime grants exceed read-public-evidence plus append-only claim"
    );

    console.log(
      "CI integration spine database verification passed for " +
        requiredTables.length +
        " RLS tables and append-only grants."
    );
  } finally {
    await pool.end();
  }

}


void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
