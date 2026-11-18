create table if not exists app.master_build418_recovery_exercise_receipts (
  receipt_id text primary key,
  exercise_id text not null,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  domain text not null check (domain in ('APPLICATION_ROLLBACK','DATABASE_RECOVERY','COMMUNICATION_REPLAY','DEPENDENCY_RECOVERY')),
  scenario_digest text not null check (scenario_digest ~ '^sha256:[a-f0-9]{64}$'),
  baseline_evidence_digest text not null check (baseline_evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  owner_approval_digest text not null check (owner_approval_digest ~ '^sha256:[a-f0-9]{64}$'),
  independent_witness_digest text not null check (independent_witness_digest ~ '^sha256:[a-f0-9]{64}$'),
  source_execution_receipt_digest text not null check (source_execution_receipt_digest ~ '^sha256:[a-f0-9]{64}$'),
  post_recovery_telemetry_digest text not null check (post_recovery_telemetry_digest ~ '^sha256:[a-f0-9]{64}$'),
  recovery_point_digest text not null check (recovery_point_digest ~ '^sha256:[a-f0-9]{64}$'),
  started_at timestamptz not null, completed_at timestamptz not null,
  recovery_time_minutes numeric(10,2) not null check (recovery_time_minutes>=0),
  recovery_successful boolean not null, post_recovery_health_verified boolean not null,
  rollback_to_prior_state_verified boolean not null, data_integrity_verified boolean not null,
  duplicate_or_replay_protection_verified boolean not null, no_cross_tenant_impact boolean not null,
  no_secret_exposure boolean not null, local_authority_preserved boolean not null,
  communications_authority_preserved boolean not null, ai_data_validation_only boolean not null,
  source_execution_verified boolean not null, independently_verified boolean not null,
  observed_at timestamptz not null, expires_at timestamptz not null,
  state text not null check (state in ('VERIFIED','HOLD','FAILED')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  recorded_at timestamptz not null default now(),
  check (completed_at>=started_at),check (expires_at>observed_at),
  check (owner_approval_digest<>independent_witness_digest),
  check (owner_approval_digest<>source_execution_receipt_digest),
  check (independent_witness_digest<>source_execution_receipt_digest)
);
create index if not exists master_b418_exercise_slot_idx
 on app.master_build418_recovery_exercise_receipts(app_id,domain,observed_at desc);

create table if not exists app.master_build418_rollback_readiness_receipts (
  receipt_id text primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  current_revision text not null check (current_revision ~ '^[a-f0-9]{40}$'),
  previous_known_good_revision text not null check (previous_known_good_revision ~ '^[a-f0-9]{40}$'),
  current_artifact_digest text not null check (current_artifact_digest ~ '^sha256:[a-f0-9]{64}$'),
  previous_artifact_digest text not null check (previous_artifact_digest ~ '^sha256:[a-f0-9]{64}$'),
  restore_point_digest text not null check (restore_point_digest ~ '^sha256:[a-f0-9]{64}$'),
  rollback_procedure_digest text not null check (rollback_procedure_digest ~ '^sha256:[a-f0-9]{64}$'),
  migration_compatibility_digest text not null check (migration_compatibility_digest ~ '^sha256:[a-f0-9]{64}$'),
  owner_gate_digest text not null check (owner_gate_digest ~ '^sha256:[a-f0-9]{64}$'),
  source_custody_digest text not null check (source_custody_digest ~ '^sha256:[a-f0-9]{64}$'),
  rollback_window_minutes integer not null check (rollback_window_minutes>0 and rollback_window_minutes<=240),
  previous_artifact_available boolean not null, restore_point_verified boolean not null,
  rollback_procedure_verified boolean not null, migration_compatibility_verified boolean not null,
  owner_gate_verified boolean not null, source_owned_rollback boolean not null,
  post_rollback_validation_defined boolean not null, forward_recovery_path_defined boolean not null,
  no_automatic_rollback boolean not null, independently_verified boolean not null,
  observed_at timestamptz not null, expires_at timestamptz not null,
  state text not null check (state in ('VERIFIED','HOLD','FAILED')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  recorded_at timestamptz not null default now(),
  check (current_revision<>previous_known_good_revision),
  check (current_artifact_digest<>previous_artifact_digest),
  check (expires_at>observed_at)
);
create index if not exists master_b418_rollback_app_idx
 on app.master_build418_rollback_readiness_receipts(app_id,observed_at desc);

create table if not exists app.master_build418_cross_application_exercise_receipts (
  receipt_id text primary key,
  exercise_id text not null,
  participant_app_ids text[] not null check (cardinality(participant_app_ids)>=2),
  correlation_id text not null,
  scenario_digest text not null check (scenario_digest ~ '^sha256:[a-f0-9]{64}$'),
  owner_approval_digest text not null check (owner_approval_digest ~ '^sha256:[a-f0-9]{64}$'),
  independent_witness_digest text not null check (independent_witness_digest ~ '^sha256:[a-f0-9]{64}$'),
  dependency_order_digest text not null check (dependency_order_digest ~ '^sha256:[a-f0-9]{64}$'),
  rollback_sequence_digest text not null check (rollback_sequence_digest ~ '^sha256:[a-f0-9]{64}$'),
  reconciliation_digest text not null check (reconciliation_digest ~ '^sha256:[a-f0-9]{64}$'),
  partial_failure_isolated boolean not null, dependency_order_verified boolean not null,
  rollback_sequence_verified boolean not null, post_exercise_reconciliation_verified boolean not null,
  authority_boundaries_preserved boolean not null, communications_authority_preserved boolean not null,
  no_cross_tenant_impact boolean not null, no_secret_exposure boolean not null,
  no_lockstep_release_required boolean not null, independently_verified boolean not null,
  observed_at timestamptz not null, expires_at timestamptz not null,
  state text not null check (state in ('VERIFIED','HOLD','FAILED')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  recorded_at timestamptz not null default now(),
  check (expires_at>observed_at),check (owner_approval_digest<>independent_witness_digest)
);
create index if not exists master_b418_cross_exercise_idx
 on app.master_build418_cross_application_exercise_receipts(exercise_id,observed_at desc);

alter table app.master_build418_recovery_exercise_receipts enable row level security;
alter table app.master_build418_recovery_exercise_receipts force row level security;
alter table app.master_build418_rollback_readiness_receipts enable row level security;
alter table app.master_build418_rollback_readiness_receipts force row level security;
alter table app.master_build418_cross_application_exercise_receipts enable row level security;
alter table app.master_build418_cross_application_exercise_receipts force row level security;

create policy master_b418_exercise_runtime_select on app.master_build418_recovery_exercise_receipts
 for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b418_rollback_runtime_select on app.master_build418_rollback_readiness_receipts
 for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b418_cross_runtime_select on app.master_build418_cross_application_exercise_receipts
 for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));

create policy master_b418_exercise_protected_select on app.master_build418_recovery_exercise_receipts
 for select to ai_data_protected_runtime using (true);
create policy master_b418_rollback_protected_select on app.master_build418_rollback_readiness_receipts
 for select to ai_data_protected_runtime using (true);
create policy master_b418_cross_protected_select on app.master_build418_cross_application_exercise_receipts
 for select to ai_data_protected_runtime using (true);

create policy master_b418_exercise_protected_insert on app.master_build418_recovery_exercise_receipts
 for insert to ai_data_protected_runtime with check (
  recovery_successful and post_recovery_health_verified and rollback_to_prior_state_verified
  and data_integrity_verified and duplicate_or_replay_protection_verified
  and no_cross_tenant_impact and no_secret_exposure and local_authority_preserved
  and communications_authority_preserved and ai_data_validation_only
  and source_execution_verified and independently_verified
 );
create policy master_b418_rollback_protected_insert on app.master_build418_rollback_readiness_receipts
 for insert to ai_data_protected_runtime with check (
  previous_artifact_available and restore_point_verified and rollback_procedure_verified
  and migration_compatibility_verified and owner_gate_verified and source_owned_rollback
  and post_rollback_validation_defined and forward_recovery_path_defined
  and no_automatic_rollback and independently_verified
 );
create policy master_b418_cross_protected_insert on app.master_build418_cross_application_exercise_receipts
 for insert to ai_data_protected_runtime with check (
  partial_failure_isolated and dependency_order_verified and rollback_sequence_verified
  and post_exercise_reconciliation_verified and authority_boundaries_preserved
  and communications_authority_preserved and no_cross_tenant_impact and no_secret_exposure
  and no_lockstep_release_required and independently_verified
 );

grant select on app.master_build418_recovery_exercise_receipts,
 app.master_build418_rollback_readiness_receipts,
 app.master_build418_cross_application_exercise_receipts to ai_data_runtime;
grant select,insert on app.master_build418_recovery_exercise_receipts,
 app.master_build418_rollback_readiness_receipts,
 app.master_build418_cross_application_exercise_receipts to ai_data_protected_runtime;
revoke insert,update,delete on app.master_build418_recovery_exercise_receipts,
 app.master_build418_rollback_readiness_receipts,
 app.master_build418_cross_application_exercise_receipts from ai_data_runtime;
revoke update,delete on app.master_build418_recovery_exercise_receipts,
 app.master_build418_rollback_readiness_receipts,
 app.master_build418_cross_application_exercise_receipts from ai_data_protected_runtime;
