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
  "master_shell_source_registry_evidence",
  "master_shell_source_updates",
  "master_completion_requirement_revisions",
  "master_completion_denominator_approvals",
  "master_completion_evidence",
  "master_role_device_acceptance_evidence",
  "master_relationship_certification_runs",
  "master_relationship_certification_assertions",
  "master_security_certification_runs",
  "master_security_certification_assertions",
  "master_source_onboarding_runs",
  "master_source_onboarding_assertions",
  "master_production_readiness_runs",
  "master_production_readiness_assertions",
  "production_learning_viii_snapshots",
  "production_learning_viii_candidates",
  "master_sysop_members",
  "master_sysop_handoff_audit",
  "comms_plane_projection_evidence",
  "rosevear_comms_authority_pins",
  "rosevear_comms_source_authorizations",
  "rosevear_comms_operation_claims",
  "master_source_signer_registry_events",
  "master_convergence_receipt_ledger",
  "master_owner_decision_audit",
  "master_source_signer_enrollment_intake_events",
  "master_source_health_admission_events",
  "master_source_owner_review_packets",
  "master_source_acceptance_decision_events",
  "master_runtime_evidence_rechecks",
  "master_source_receipt_refresh_requests",
  "master_supervised_acceptance_rechecks",
  "master_source_refresh_evidence_events",
  "master_three_master_acceptance_rechecks",
  "master_deployed_manifest_observation_events",
  "master_source_custody_correlation_events",
  "master_fresh_receipt_admission_closure_events",
  "master_three_master_runtime_decision_rechecks",
  "master_yw_source_resolution_events",
  "master_yw561_custody_evidence_intake_events",
  "master_yw561_replay_correlation_events",
  "master_yw561_runtime_closure_rechecks",
  "master_yw561_live_signer_correlation_events",
  "master_yw561_exact_health_receipt_closure_events",
  "master_yw561_durable_replay_acceptance_events",
  "master_yw561_three_master_owner_decision_rechecks",
  "master_yw561_trusted_signer_admission_events",
  "master_yw561_current_receipt_replay_activation_events",
  "master_yw561_three_master_runtime_correlation_events",
  "master_yw561_owner_acceptance_gate_events",
  "master_yw561_owner_decision_execution_events",
  "master_yw561_acceptance_continuity_events",
  "master_yw561_runtime_gate_transition_events",
  "master_yw561_connection_reconciliation_events"
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
  "master_shell_source_updates",
  "master_completion_requirement_revisions",
  "master_completion_denominator_approvals",
  "master_completion_evidence",
  "master_role_device_acceptance_evidence",
  "master_relationship_certification_runs",
  "master_relationship_certification_assertions",
  "master_security_certification_runs",
  "master_security_certification_assertions",
  "master_source_onboarding_runs",
  "master_source_onboarding_assertions",
  "master_production_readiness_runs",
  "master_production_readiness_assertions",
  "production_learning_viii_snapshots",
  "production_learning_viii_candidates",
  "master_shell_source_registry_evidence",
  "master_sysop_handoff_audit",
  "comms_plane_projection_evidence",
  "service_performance_events",
  "rosevear_comms_operation_claims",
  "master_source_signer_registry_events",
  "master_convergence_receipt_ledger",
  "master_owner_decision_audit",
  "master_source_signer_enrollment_intake_events",
  "master_source_health_admission_events",
  "master_source_owner_review_packets",
  "master_source_acceptance_decision_events",
  "master_runtime_evidence_rechecks",
  "master_source_receipt_refresh_requests",
  "master_supervised_acceptance_rechecks",
  "master_source_refresh_evidence_events",
  "master_three_master_acceptance_rechecks",
  "master_deployed_manifest_observation_events",
  "master_source_custody_correlation_events",
  "master_fresh_receipt_admission_closure_events",
  "master_three_master_runtime_decision_rechecks",
  "master_yw_source_resolution_events",
  "master_yw561_custody_evidence_intake_events",
  "master_yw561_replay_correlation_events",
  "master_yw561_runtime_closure_rechecks",
  "master_yw561_live_signer_correlation_events",
  "master_yw561_exact_health_receipt_closure_events",
  "master_yw561_durable_replay_acceptance_events",
  "master_yw561_three_master_owner_decision_rechecks"
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
        "0107_ql365d_ai_data_platform_source_attachment.sql",
        "0121_master_sysop_navigation_context.sql",
        "0122_comms_complementary_plane_projection.sql",
        "0123_master_role_device_acceptance_matrix.sql",
        "0124_master_relationship_integration_certification.sql",
        "0125_master_security_certification.sql",
        "0126_master_source_onboarding_pilot.sql",
        "0127_master_production_readiness.sql",
        "0128_production_learning_viii.sql",
        "0129_master_source_signer_receipt_owner_audit.sql",
        "0130_master_source_signer_enrollment_health_admission.sql",
        "0131_master_source_owner_review_acceptance.sql",
        "0132_master_runtime_source_refresh_recheck.sql",
        "0133_master_source_refresh_evidence_three_master_recheck.sql",
        "0134_master_manifest_custody_receipt_runtime_decision.sql",
        "0135_master_yw_source_resolution.sql",
        "0136_master_yw561_signer_receipt_replay_runtime_closure.sql",
        "0137_master_yw561_live_signer_receipt_replay_owner_recheck.sql",
        "0138_master_yw561_trusted_source_health_activation_owner_gate.sql",
        "0139_master_yw561_owner_decision_runtime_connection_reconciliation.sql"
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
    assert(
      migrationNames.has("0121_master_sysop_navigation_context.sql"),
      "migration 0121 is not recorded"
    );
    assert(
      migrationNames.has("0122_comms_complementary_plane_projection.sql"),
      "migration 0122 is not recorded"
    );
    assert(
      migrationNames.has("0123_master_role_device_acceptance_matrix.sql"),
      "migration 0123 is not recorded"
    );
    assert(
      migrationNames.has("0124_master_relationship_integration_certification.sql"),
      "migration 0124 is not recorded"
    );
    assert(
      migrationNames.has("0125_master_security_certification.sql"),
      "migration 0125 is not recorded"
    );
    assert(
      migrationNames.has("0126_master_source_onboarding_pilot.sql"),
      "migration 0126 is not recorded"
    );
    assert(
      migrationNames.has("0127_master_production_readiness.sql"),
      "migration 0127 is not recorded"
    );
    assert(
      migrationNames.has("0128_production_learning_viii.sql"),
      "migration 0128 is not recorded"
    );
    assert(
      migrationNames.has("0129_master_source_signer_receipt_owner_audit.sql"),
      "migration 0129 is not recorded"
    );
    assert(
      migrationNames.has("0130_master_source_signer_enrollment_health_admission.sql"),
      "migration 0130 is not recorded"
    );
    assert(
      migrationNames.has("0131_master_source_owner_review_acceptance.sql"),
      "migration 0131 is not recorded"
    );
    assert(
      migrationNames.has("0132_master_runtime_source_refresh_recheck.sql"),
      "migration 0132 is not recorded"
    );
    assert(
      migrationNames.has("0133_master_source_refresh_evidence_three_master_recheck.sql"),
      "migration 0133 is not recorded"
    );
    assert(
      migrationNames.has("0134_master_manifest_custody_receipt_runtime_decision.sql"),
      "migration 0134 is not recorded"
    );
    assert(
      migrationNames.has("0135_master_yw_source_resolution.sql"),
      "migration 0135 is not recorded"
    );
    assert(
      migrationNames.has("0136_master_yw561_signer_receipt_replay_runtime_closure.sql"),
      "migration 0136 is not recorded"
    );
    assert(
      migrationNames.has("0137_master_yw561_live_signer_receipt_replay_owner_recheck.sql"),
      "migration 0137 is not recorded"
    );
    assert(
      migrationNames.has("0138_master_yw561_trusted_source_health_activation_owner_gate.sql"),
      "migration 0138 is not recorded"
    );
    assert(
      migrationNames.has("0139_master_yw561_owner_decision_runtime_connection_reconciliation.sql"),
      "migration 0139 is not recorded"
    );

    const relationshipCertificationGrants = await pool.query<{
      table_name: string;
      privilege_type: string;
    }>(
      `select table_name,privilege_type
       from information_schema.role_table_grants
       where grantee='ai_data_runtime'
         and table_schema='app'
         and table_name = any($1::text[])`,
      [[
        "master_relationship_certification_runs",
        "master_relationship_certification_assertions"
      ]]
    );
    const relationshipCertificationGrantSet = new Set(
      relationshipCertificationGrants.rows.map(
        (row) => row.table_name + ":" + row.privilege_type
      )
    );
    for (const table of [
      "master_relationship_certification_runs",
      "master_relationship_certification_assertions"
    ]) {
      assert(
        relationshipCertificationGrantSet.has(table + ":SELECT") &&
        relationshipCertificationGrantSet.has(table + ":INSERT") &&
        !relationshipCertificationGrantSet.has(table + ":UPDATE") &&
        !relationshipCertificationGrantSet.has(table + ":DELETE"),
        "Build 346 relationship certification tables must be append-only for runtime: " + table
      );
    }

    const roleDeviceAcceptanceGrants = await pool.query<{
      privilege_type: string;
    }>(
      `select privilege_type
       from information_schema.role_table_grants
       where grantee='ai_data_runtime'
         and table_schema='app'
         and table_name='master_role_device_acceptance_evidence'`
    );
    const roleDeviceAcceptanceGrantSet = new Set(
      roleDeviceAcceptanceGrants.rows.map((row) => row.privilege_type)
    );
    assert(
      roleDeviceAcceptanceGrantSet.has("SELECT") &&
      roleDeviceAcceptanceGrantSet.has("INSERT") &&
      !roleDeviceAcceptanceGrantSet.has("UPDATE") &&
      !roleDeviceAcceptanceGrantSet.has("DELETE"),
      "Build 345 role/device acceptance ledger must be append-only for runtime"
    );

    const commsPlaneGrants = await pool.query<{
      privilege_type: string;
    }>(
      `select privilege_type
       from information_schema.role_table_grants
       where grantee='ai_data_runtime'
         and table_schema='app'
         and table_name='comms_plane_projection_evidence'`
    );
    const commsPlaneGrantSet = new Set(
      commsPlaneGrants.rows.map((row) => row.privilege_type)
    );
    assert(
      commsPlaneGrantSet.has("SELECT") &&
      !commsPlaneGrantSet.has("INSERT") &&
      !commsPlaneGrantSet.has("UPDATE") &&
      !commsPlaneGrantSet.has("DELETE"),
      "Comms complementary-plane projection evidence must be runtime read-only"
    );

    const sysopGrants = await pool.query<{
      table_name: string;
      privilege_type: string;
    }>(
      `select table_name,privilege_type
       from information_schema.role_table_grants
       where grantee='ai_data_runtime'
         and table_schema='app'
         and table_name = any($1::text[])`,
      [["master_sysop_members","master_sysop_handoff_audit"]]
    );
    const sysopGrantSet = new Set(
      sysopGrants.rows.map((row) => row.table_name + ":" + row.privilege_type)
    );
    assert(
      sysopGrantSet.has("master_sysop_members:SELECT") &&
      sysopGrantSet.has("master_sysop_members:INSERT") &&
      !sysopGrantSet.has("master_sysop_members:DELETE"),
      "Master Sysop membership table grants are not fail-closed"
    );
    const sysopUpdateColumns = await pool.query<{
      column_name: string;
      privilege_type: string;
    }>(
      `select column_name,privilege_type
       from information_schema.role_column_grants
       where grantee='ai_data_runtime'
         and table_schema='app'
         and table_name='master_sysop_members'
         and privilege_type='UPDATE'`
    );
    assert(
      new Set(sysopUpdateColumns.rows.map((row) => row.column_name)).size === 3 &&
      ["role","revoked_at","note"].every((column) =>
        sysopUpdateColumns.rows.some((row) => row.column_name === column)
      ),
      "Master Sysop membership UPDATE must be limited to role/revoked_at/note"
    );
    assert(
      sysopGrantSet.has("master_sysop_handoff_audit:SELECT") &&
      sysopGrantSet.has("master_sysop_handoff_audit:INSERT") &&
      !sysopGrantSet.has("master_sysop_handoff_audit:UPDATE") &&
      !sysopGrantSet.has("master_sysop_handoff_audit:DELETE"),
      "Master Sysop handoff audit must remain append-only"
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
