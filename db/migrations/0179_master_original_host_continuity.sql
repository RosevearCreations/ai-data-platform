create table if not exists app.master_build416_host_boot_witness_receipts (
  receipt_id text primary key,
  service_id text not null check (service_id in (
    'rosevear-ai-hub-automation-host',
    'rosevear-ai-data-platform-worker',
    'rosevear-comms-hub-worker'
  )),
  host_id text not null check (host_id='DESKTOP-AE894KC'),
  scm_service_name text not null check (scm_service_name in (
    'Rosevear-AIDataPlatform','Rosevear-AIHub','Rosevear-CommsHub'
  )),
  observed_source_revision text not null check (observed_source_revision ~ '^[a-f0-9]{40}$'),
  installer_artifact_digest text not null check (installer_artifact_digest ~ '^sha256:[a-f0-9]{64}$'),
  executable_digest text not null check (executable_digest ~ '^sha256:[a-f0-9]{64}$'),
  service_account_identity_digest text not null check (service_account_identity_digest ~ '^sha256:[a-f0-9]{64}$'),
  pre_boot_evidence_digest text not null check (pre_boot_evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  post_boot_evidence_digest text not null check (post_boot_evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  boot_session_id text not null check (length(boot_session_id) between 12 and 160),
  service_installed boolean not null,
  startup_mode text not null check (startup_mode in ('AUTOMATIC','MANUAL','DISABLED','UNKNOWN')),
  recovery_policy_verified boolean not null,
  unattended_start_before_login_verified boolean not null,
  post_boot_running_verified boolean not null,
  no_manual_intervention_observed boolean not null,
  ten_minute_continuity_verified boolean not null,
  continuous_24_hours_verified boolean not null,
  rollback_to_prior_configuration_verified boolean not null,
  owner_startup_mode_approved boolean not null,
  owner_approval_receipt_digest text not null check (owner_approval_receipt_digest ~ '^sha256:[a-f0-9]{64}$'),
  independent_custodian_receipt_digest text not null check (independent_custodian_receipt_digest ~ '^sha256:[a-f0-9]{64}$'),
  independent_witness_receipt_digest text not null check (independent_witness_receipt_digest ~ '^sha256:[a-f0-9]{64}$'),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  state text not null check (state in ('VERIFIED','HOLD','FAILED')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  recorded_at timestamptz not null default now(),
  check (pre_boot_evidence_digest <> post_boot_evidence_digest),
  check (owner_approval_receipt_digest <> independent_custodian_receipt_digest),
  check (owner_approval_receipt_digest <> independent_witness_receipt_digest),
  check (independent_custodian_receipt_digest <> independent_witness_receipt_digest),
  check (expires_at > observed_at)
);

create index if not exists master_build416_host_service_idx
  on app.master_build416_host_boot_witness_receipts(service_id,observed_at desc);

create table if not exists app.master_build416_peer_ack_receipts (
  receipt_id text primary key,
  peer_id text not null check (peer_id in ('ai-data-platform','rosevear-comms-hub')),
  route text not null check (route='/internal/rosevear/master/events/read-only/v1'),
  route_implemented boolean not null,
  protocol_version text not null check (protocol_version='1.1'),
  mtls_client_certificate_enrolled boolean not null,
  mtls_handshake_verified boolean not null,
  server_leaf_pin_verified boolean not null,
  peer_signer_enrolled boolean not null,
  signed_ack_verified boolean not null,
  ack_disposition text not null check (ack_disposition in ('RECEIVED','HOLD','REJECTED')),
  event_digest text not null check (event_digest ~ '^sha256:[a-f0-9]{64}$'),
  ack_digest text not null check (ack_digest ~ '^sha256:[a-f0-9]{64}$'),
  transport_evidence_digest text not null check (transport_evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  replay_protection_verified boolean not null,
  no_command_sink boolean not null,
  receipt_only_sink boolean not null,
  source_authority_preserved boolean not null,
  direct_peer_database_write boolean not null check (direct_peer_database_write=false),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  independently_verified boolean not null,
  state text not null check (state in ('VERIFIED','HOLD','FAILED')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  recorded_at timestamptz not null default now(),
  check (event_digest <> ack_digest),
  check (expires_at > observed_at)
);

create index if not exists master_build416_peer_ack_idx
  on app.master_build416_peer_ack_receipts(peer_id,observed_at desc);

create table if not exists app.master_build416_certificate_rotation_receipts (
  receipt_id text primary key,
  peer_id text not null check (peer_id in ('ai-data-platform','rosevear-comms-hub')),
  owner_plan_digest text not null check (owner_plan_digest ~ '^sha256:[a-f0-9]{64}$'),
  previous_leaf_pin_digest text not null check (previous_leaf_pin_digest ~ '^sha256:[a-f0-9]{64}$'),
  candidate_leaf_pin_digest text not null check (candidate_leaf_pin_digest ~ '^sha256:[a-f0-9]{64}$'),
  overlap_hours numeric not null check (overlap_hours >= 0 and overlap_hours <= 24),
  candidate_handshake_verified boolean not null,
  peer_reenrolled boolean not null,
  fresh_signed_ack_under_candidate_verified boolean not null,
  previous_credential_retained_during_overlap boolean not null,
  old_credential_retired_after_acceptance boolean not null,
  rollback_ready_during_overlap boolean not null,
  automatic_activation_authorized boolean not null check (automatic_activation_authorized=false),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  independently_verified boolean not null,
  state text not null check (state in ('COMPLETED','HOLD','FAILED')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  recorded_at timestamptz not null default now(),
  check (previous_leaf_pin_digest <> candidate_leaf_pin_digest),
  check (expires_at > observed_at)
);

create index if not exists master_build416_rotation_peer_idx
  on app.master_build416_certificate_rotation_receipts(peer_id,observed_at desc);

alter table app.master_build416_host_boot_witness_receipts enable row level security;
alter table app.master_build416_host_boot_witness_receipts force row level security;
alter table app.master_build416_peer_ack_receipts enable row level security;
alter table app.master_build416_peer_ack_receipts force row level security;
alter table app.master_build416_certificate_rotation_receipts enable row level security;
alter table app.master_build416_certificate_rotation_receipts force row level security;

create policy master_b416_host_runtime_select
  on app.master_build416_host_boot_witness_receipts
  for select to ai_data_runtime
  using (app.current_master_sysop_role() in ('owner','operator'));

create policy master_b416_peer_runtime_select
  on app.master_build416_peer_ack_receipts
  for select to ai_data_runtime
  using (app.current_master_sysop_role() in ('owner','operator'));

create policy master_b416_rotation_runtime_select
  on app.master_build416_certificate_rotation_receipts
  for select to ai_data_runtime
  using (app.current_master_sysop_role() in ('owner','operator'));

create policy master_b416_host_protected_select
  on app.master_build416_host_boot_witness_receipts
  for select to ai_data_protected_runtime using (true);
create policy master_b416_peer_protected_select
  on app.master_build416_peer_ack_receipts
  for select to ai_data_protected_runtime using (true);
create policy master_b416_rotation_protected_select
  on app.master_build416_certificate_rotation_receipts
  for select to ai_data_protected_runtime using (true);

create policy master_b416_host_protected_insert
  on app.master_build416_host_boot_witness_receipts
  for insert to ai_data_protected_runtime
  with check (
    host_id='DESKTOP-AE894KC'
    and service_installed
    and startup_mode='AUTOMATIC'
    and recovery_policy_verified
    and unattended_start_before_login_verified
    and post_boot_running_verified
    and no_manual_intervention_observed
    and owner_startup_mode_approved
  );

create policy master_b416_peer_protected_insert
  on app.master_build416_peer_ack_receipts
  for insert to ai_data_protected_runtime
  with check (
    route='/internal/rosevear/master/events/read-only/v1'
    and route_implemented
    and protocol_version='1.1'
    and mtls_client_certificate_enrolled
    and mtls_handshake_verified
    and server_leaf_pin_verified
    and peer_signer_enrolled
    and signed_ack_verified
    and ack_disposition='RECEIVED'
    and replay_protection_verified
    and no_command_sink
    and receipt_only_sink
    and source_authority_preserved
    and direct_peer_database_write=false
    and independently_verified
  );

create policy master_b416_rotation_protected_insert
  on app.master_build416_certificate_rotation_receipts
  for insert to ai_data_protected_runtime
  with check (
    overlap_hours <= 24
    and candidate_handshake_verified
    and peer_reenrolled
    and fresh_signed_ack_under_candidate_verified
    and previous_credential_retained_during_overlap
    and old_credential_retired_after_acceptance
    and rollback_ready_during_overlap
    and automatic_activation_authorized=false
    and independently_verified
  );

grant select on
  app.master_build416_host_boot_witness_receipts,
  app.master_build416_peer_ack_receipts,
  app.master_build416_certificate_rotation_receipts
to ai_data_runtime;

grant select,insert on
  app.master_build416_host_boot_witness_receipts,
  app.master_build416_peer_ack_receipts,
  app.master_build416_certificate_rotation_receipts
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build416_host_boot_witness_receipts,
  app.master_build416_peer_ack_receipts,
  app.master_build416_certificate_rotation_receipts
from ai_data_runtime;

revoke update,delete on
  app.master_build416_host_boot_witness_receipts,
  app.master_build416_peer_ack_receipts,
  app.master_build416_certificate_rotation_receipts
from ai_data_protected_runtime;
