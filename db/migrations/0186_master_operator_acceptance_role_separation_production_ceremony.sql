-- Build 423 operator acceptance, role separation, production ceremony and Sysop telemetry.
create table if not exists app.master_build423_role_acceptance_evidence(
 evidence_id text primary key,app_id text not null check(app_id in('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','yw','icamp','devilndove','rosiedazzlers')),
 role text not null check(role in('OWNER','OPERATOR','ADMIN','WORKER','CUSTOMER')),state text not null check(state in('PASS','PARTIAL','FAILED')),
 acceptance_percent numeric(5,2) not null check(acceptance_percent between 0 and 100),critical_failure_count integer not null check(critical_failure_count>=0),
 evidence_digest text not null check(evidence_digest~'^sha256:[a-f0-9]{64}$'),source_owned boolean not null,owner_reviewed boolean not null,independently_verified boolean not null,
 observed_at timestamptz not null,expires_at timestamptz not null,evidence jsonb not null default '{}'::jsonb check(jsonb_typeof(evidence)='object'),recorded_at timestamptz not null default now(),check(expires_at>observed_at));
create table if not exists app.master_build423_workflow_ceremony_receipts(
 receipt_id text primary key,app_id text not null check(app_id in('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','yw','icamp','devilndove','rosiedazzlers')),
 workflow text not null check(workflow in('PRODUCTION_CHANGE','REBOOT_OR_RESTART','RECOVERY_OR_ROLLBACK','EXTERNAL_MESSAGE','FINANCIAL_OR_DATA_EXPORT')),
 state text not null check(state in('PASS','HOLD','FAILED')),requester_role text not null,approver_role text not null,executor_role text not null,
 requester_id_hash text not null check(requester_id_hash~'^[a-f0-9]{64}$'),approver_id_hash text not null check(approver_id_hash~'^[a-f0-9]{64}$'),executor_id_hash text not null check(executor_id_hash~'^[a-f0-9]{64}$'),
 explicit_approval boolean not null,authority_separated boolean not null,owner_gate_preserved boolean not null,source_authority_preserved boolean not null,rollback_or_abort_available boolean not null,
 evidence_digest text not null check(evidence_digest~'^sha256:[a-f0-9]{64}$'),source_owned boolean not null,owner_reviewed boolean not null,independently_verified boolean not null,
 observed_at timestamptz not null,expires_at timestamptz not null,evidence jsonb not null default '{}'::jsonb check(jsonb_typeof(evidence)='object'),recorded_at timestamptz not null default now(),
 check(requester_id_hash<>approver_id_hash),check(expires_at>observed_at));
create table if not exists app.master_build423_sysop_telemetry_receipts(
 receipt_id uuid primary key,app_id text not null check(app_id in('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','yw','icamp','devilndove','rosiedazzlers')),
 event_id text not null,nonce text not null,source_commit text not null check(source_commit~'^[a-f0-9]{40}$'),state text not null check(state in('HEALTHY','DEGRADED','UNHEALTHY','UNKNOWN')),
 event_kind text not null,metrics jsonb not null check(jsonb_typeof(metrics)='object'),process_uptime_sec bigint,restart_count bigint,last_restart_at_ms bigint,boot_time_ms bigint,
 source_signature_verified boolean not null,source_commit_verified boolean not null,privacy_boundary_verified boolean not null,anti_replay_verified boolean not null,
 transport_verified boolean not null default false,independent_signer_pin_verified boolean not null,owner_reviewed boolean not null default false,signature_sha256 text not null check(signature_sha256~'^[a-f0-9]{64}$'),
 issued_at timestamptz not null,expires_at timestamptz not null,recorded_at timestamptz not null default now(),unique(app_id,event_id),unique(app_id,nonce),check(expires_at>issued_at));
alter table app.master_build423_role_acceptance_evidence enable row level security;alter table app.master_build423_role_acceptance_evidence force row level security;
alter table app.master_build423_workflow_ceremony_receipts enable row level security;alter table app.master_build423_workflow_ceremony_receipts force row level security;
alter table app.master_build423_sysop_telemetry_receipts enable row level security;alter table app.master_build423_sysop_telemetry_receipts force row level security;
create policy b423_role_read on app.master_build423_role_acceptance_evidence for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b423_ceremony_read on app.master_build423_workflow_ceremony_receipts for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b423_telemetry_read on app.master_build423_sysop_telemetry_receipts for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b423_role_protected_read on app.master_build423_role_acceptance_evidence for select to ai_data_protected_runtime using(true);
create policy b423_ceremony_protected_read on app.master_build423_workflow_ceremony_receipts for select to ai_data_protected_runtime using(true);
create policy b423_telemetry_protected_read on app.master_build423_sysop_telemetry_receipts for select to ai_data_protected_runtime using(true);
create policy b423_role_protected_insert on app.master_build423_role_acceptance_evidence for insert to ai_data_protected_runtime with check(source_owned and owner_reviewed and independently_verified);
create policy b423_ceremony_protected_insert on app.master_build423_workflow_ceremony_receipts for insert to ai_data_protected_runtime with check(source_owned and owner_reviewed and independently_verified and requester_id_hash<>approver_id_hash);
create policy b423_telemetry_protected_insert on app.master_build423_sysop_telemetry_receipts for insert to ai_data_protected_runtime with check(source_signature_verified and source_commit_verified and privacy_boundary_verified and anti_replay_verified and independent_signer_pin_verified);
grant select on app.master_build423_role_acceptance_evidence,app.master_build423_workflow_ceremony_receipts,app.master_build423_sysop_telemetry_receipts to ai_data_runtime;
grant select,insert on app.master_build423_role_acceptance_evidence,app.master_build423_workflow_ceremony_receipts,app.master_build423_sysop_telemetry_receipts to ai_data_protected_runtime;
revoke insert,update,delete on app.master_build423_role_acceptance_evidence,app.master_build423_workflow_ceremony_receipts,app.master_build423_sysop_telemetry_receipts from ai_data_runtime;
revoke update,delete on app.master_build423_role_acceptance_evidence,app.master_build423_workflow_ceremony_receipts,app.master_build423_sysop_telemetry_receipts from ai_data_protected_runtime;
