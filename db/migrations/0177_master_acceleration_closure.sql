create table if not exists app.master_build414_completion_closure_evidence (
  evidence_id text primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  axis text not null check (axis in ('design','implementation','automated-testing','integration-verification','security','accessibility-device-acceptance','production-user-acceptance')),
  baseline_percent numeric(5,2) not null check (baseline_percent between 0 and 100),
  target_percent numeric(5,2) not null check (target_percent between 0 and 100),
  observed_percent numeric(5,2) not null check (observed_percent between 0 and 100),
  denominator_hash text not null check (denominator_hash ~ '^[a-f0-9]{64}$'),
  baseline_denominator_hash text not null check (baseline_denominator_hash ~ '^[a-f0-9]{64}$'),
  build413_evidence_digest text not null check (build413_evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  state text not null check (state in ('CLOSED','HOLD','FAILED')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  check (expires_at > observed_at),
  check (target_percent >= least(100, baseline_percent + 10)),
  check (observed_percent >= target_percent),
  check (denominator_hash = baseline_denominator_hash)
);

create table if not exists app.master_build414_security_recertification_evidence (
  evidence_id text primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  tier text not null check (tier in ('T1_IDENTITY_PROVENANCE','T2_TRANSPORT_AUTHENTICATION','T3_AUTHORIZATION_TENANT_CONSENT','T4_DATA_AUDIT_REPLAY_FAIL_CLOSED','T5_PRIVILEGED_OPERATION_RECOVERY')),
  passed_dimensions text[] not null,
  evidence_digest text not null check (evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  source_identity_verified boolean not null,
  tenant_isolation_verified boolean not null,
  secrets_excluded boolean not null,
  authority_preserved boolean not null,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  state text not null check (state in ('RECERTIFIED','HOLD','FAILED')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  check (expires_at > observed_at)
);

create table if not exists app.master_build414_comms_pilot_requests (
  request_id uuid primary key,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  reason_digest text not null check (reason_digest ~ '^sha256:[a-f0-9]{64}$'),
  state text not null check (state in ('REQUESTED','CANCELLED')),
  requested_at timestamptz not null default now()
);

create table if not exists app.master_build414_comms_pilot_receipts (
  receipt_id text primary key,
  left_app_id text not null,
  right_app_id text not null,
  correlation_id text not null,
  message_authority_holder text not null check (message_authority_holder='rosevear-comms-hub'),
  transport_authenticated boolean not null,
  source_identity_verified boolean not null,
  target_audience_verified boolean not null,
  tenant_boundary_verified boolean not null,
  replay_protection_verified boolean not null,
  payload_classified boolean not null,
  secrets_excluded boolean not null,
  authority_preserved boolean not null,
  owner_gate_for_consequential_writes boolean not null,
  direct_peer_database_write boolean not null check (direct_peer_database_write=false),
  delivery_acknowledged boolean not null,
  evidence_digest text not null check (evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  state text not null check (state in ('PASSED','HOLD','FAILED')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  check (expires_at > observed_at)
);

create table if not exists app.master_build414_host_activation_receipts (
  receipt_id text primary key,
  service_id text not null check (service_id in ('rosevear-ai-hub-automation-host','rosevear-ai-data-platform-worker','rosevear-comms-hub-worker')),
  host_id text not null,
  signed_receipt_digest text not null check (signed_receipt_digest ~ '^sha256:[a-f0-9]{64}$'),
  startup_mode_verified boolean not null,
  service_running_verified boolean not null,
  local_authority_preserved boolean not null,
  internet_loss_continuity_observed boolean,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  state text not null check (state in ('ACTIVE','HOLD','FAILED')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  check (expires_at > observed_at)
);

create table if not exists app.master_build414_roadmap_renewal_approvals (
  approval_id uuid primary key,
  roadmap_id text not null check (roadmap_id='builds-415-424'),
  roadmap_digest text not null check (roadmap_digest ~ '^sha256:[a-f0-9]{64}$'),
  owner_user_id text not null references auth."user"(id) on delete restrict,
  owner_approved boolean not null check (owner_approved),
  approved_at timestamptz not null default now()
);

alter table app.master_build414_completion_closure_evidence enable row level security;
alter table app.master_build414_completion_closure_evidence force row level security;
alter table app.master_build414_security_recertification_evidence enable row level security;
alter table app.master_build414_security_recertification_evidence force row level security;
alter table app.master_build414_comms_pilot_requests enable row level security;
alter table app.master_build414_comms_pilot_requests force row level security;
alter table app.master_build414_comms_pilot_receipts enable row level security;
alter table app.master_build414_comms_pilot_receipts force row level security;
alter table app.master_build414_host_activation_receipts enable row level security;
alter table app.master_build414_host_activation_receipts force row level security;
alter table app.master_build414_roadmap_renewal_approvals enable row level security;
alter table app.master_build414_roadmap_renewal_approvals force row level security;

create policy master_b414_completion_runtime_select on app.master_build414_completion_closure_evidence for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b414_security_runtime_select on app.master_build414_security_recertification_evidence for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b414_pilot_request_runtime_select on app.master_build414_comms_pilot_requests for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b414_pilot_request_owner_insert on app.master_build414_comms_pilot_requests for insert to ai_data_runtime with check (app.current_master_sysop_role()='owner' and owner_user_id=nullif(current_setting('app.user_id',true),''));
create policy master_b414_pilot_receipt_runtime_select on app.master_build414_comms_pilot_receipts for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b414_host_runtime_select on app.master_build414_host_activation_receipts for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b414_roadmap_runtime_select on app.master_build414_roadmap_renewal_approvals for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b414_roadmap_owner_insert on app.master_build414_roadmap_renewal_approvals for insert to ai_data_runtime with check (app.current_master_sysop_role()='owner' and owner_user_id=nullif(current_setting('app.user_id',true),'') and owner_approved);

create policy master_b414_completion_protected_select on app.master_build414_completion_closure_evidence for select to ai_data_protected_runtime using (true);
create policy master_b414_completion_protected_insert on app.master_build414_completion_closure_evidence for insert to ai_data_protected_runtime with check (denominator_hash=baseline_denominator_hash and independently_verified and owner_reviewed);
create policy master_b414_security_protected_select on app.master_build414_security_recertification_evidence for select to ai_data_protected_runtime using (true);
create policy master_b414_security_protected_insert on app.master_build414_security_recertification_evidence for insert to ai_data_protected_runtime with check (secrets_excluded and authority_preserved and independently_verified);
create policy master_b414_pilot_request_protected_select on app.master_build414_comms_pilot_requests for select to ai_data_protected_runtime using (true);
create policy master_b414_pilot_receipt_protected_select on app.master_build414_comms_pilot_receipts for select to ai_data_protected_runtime using (true);
create policy master_b414_pilot_receipt_protected_insert on app.master_build414_comms_pilot_receipts for insert to ai_data_protected_runtime with check (message_authority_holder='rosevear-comms-hub' and direct_peer_database_write=false and secrets_excluded and authority_preserved);
create policy master_b414_host_protected_select on app.master_build414_host_activation_receipts for select to ai_data_protected_runtime using (true);
create policy master_b414_host_protected_insert on app.master_build414_host_activation_receipts for insert to ai_data_protected_runtime with check (local_authority_preserved and independently_verified);
create policy master_b414_roadmap_protected_select on app.master_build414_roadmap_renewal_approvals for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build414_completion_closure_evidence,
  app.master_build414_security_recertification_evidence,
  app.master_build414_comms_pilot_requests,
  app.master_build414_comms_pilot_receipts,
  app.master_build414_host_activation_receipts,
  app.master_build414_roadmap_renewal_approvals
to ai_data_runtime;
grant insert on
  app.master_build414_comms_pilot_requests,
  app.master_build414_roadmap_renewal_approvals
to ai_data_runtime;

grant select,insert on
  app.master_build414_completion_closure_evidence,
  app.master_build414_security_recertification_evidence,
  app.master_build414_comms_pilot_receipts,
  app.master_build414_host_activation_receipts
to ai_data_protected_runtime;
grant select on
  app.master_build414_comms_pilot_requests,
  app.master_build414_roadmap_renewal_approvals
to ai_data_protected_runtime;

revoke update,delete on
  app.master_build414_completion_closure_evidence,
  app.master_build414_security_recertification_evidence,
  app.master_build414_comms_pilot_requests,
  app.master_build414_comms_pilot_receipts,
  app.master_build414_host_activation_receipts,
  app.master_build414_roadmap_renewal_approvals
from ai_data_runtime,ai_data_protected_runtime;

revoke insert on
  app.master_build414_completion_closure_evidence,
  app.master_build414_security_recertification_evidence,
  app.master_build414_comms_pilot_receipts,
  app.master_build414_host_activation_receipts
from ai_data_runtime;
