-- Build 381 — Protected Receiver Health Continuity,
-- Signed Runtime Renewal, Automatic Fail-Closed Rollback &
-- Three-Master CONNECTED Revalidation.

create table if not exists app.master_build381_receiver_health_renewal_events (
  renewal_event_id uuid primary key,
  authority_key_id text not null check (char_length(authority_key_id) between 1 and 160),
  authority_key_spki_sha256 text not null check (authority_key_spki_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  envelope_sha256 text not null check (envelope_sha256 ~ '^[a-f0-9]{64}$'),
  signature_sha256 text not null check (signature_sha256 ~ '^[a-f0-9]{64}$'),
  nonce text not null check (char_length(nonce) between 16 and 160),
  controller_revision text not null check (controller_revision ~ '^[a-f0-9]{40}$'),
  source_revision text not null check (source_revision ~ '^[a-f0-9]{40}$'),
  ai_hub_main text not null check (ai_hub_main ~ '^[a-f0-9]{40}$'),
  comms_main text not null check (comms_main ~ '^[a-f0-9]{40}$'),
  original_host_id text not null check (char_length(original_host_id) between 1 and 128),
  build380_ceremony_event_id uuid not null
    references app.master_build380_external_runtime_activation_ceremony_events(ceremony_event_id) on delete restrict,
  build380_transition_event_id uuid not null
    references app.master_build380_verified_connected_transition_events(transition_event_id) on delete restrict,
  build380_closure_event_id uuid not null
    references app.master_build380_three_master_sync_closure_events(closure_event_id) on delete restrict,
  registry_evidence_id uuid not null
    references app.master_shell_source_registry_evidence(evidence_id) on delete restrict,
  renewed_registry_evidence_id uuid not null unique
    references app.master_shell_source_registry_evidence(evidence_id) on delete restrict,
  receiver_instance_id text not null check (char_length(receiver_instance_id) between 1 and 160),
  receiver_boot_id text not null check (char_length(receiver_boot_id) between 1 and 160),
  receiver_health_sequence bigint not null check (receiver_health_sequence > 0),
  receiver_state text not null check (receiver_state='ON'),
  receiver_observed_at timestamptz not null,
  receiver_health_uri text not null check (char_length(receiver_health_uri) between 1 and 512),
  receiver_health_digest text not null check (receiver_health_digest ~ '^[a-f0-9]{64}$'),
  ai_hub_runtime_receipt_id text not null check (char_length(ai_hub_runtime_receipt_id) between 1 and 160),
  ai_hub_runtime_digest text not null check (ai_hub_runtime_digest ~ '^[a-f0-9]{64}$'),
  ai_hub_signer_key_id text not null check (char_length(ai_hub_signer_key_id) between 1 and 160),
  ai_hub_signature_sha256 text not null check (ai_hub_signature_sha256 ~ '^[a-f0-9]{64}$'),
  comms_runtime_receipt_id text not null check (char_length(comms_runtime_receipt_id) between 1 and 160),
  comms_runtime_digest text not null check (comms_runtime_digest ~ '^[a-f0-9]{64}$'),
  comms_signer_key_id text not null check (char_length(comms_signer_key_id) between 1 and 160),
  comms_signature_sha256 text not null check (comms_signature_sha256 ~ '^[a-f0-9]{64}$'),
  controller_runtime_receipt_id text not null check (char_length(controller_runtime_receipt_id) between 1 and 160),
  controller_runtime_digest text not null check (controller_runtime_digest ~ '^[a-f0-9]{64}$'),
  controller_signer_key_id text not null check (char_length(controller_signer_key_id) between 1 and 160),
  controller_signature_sha256 text not null check (controller_signature_sha256 ~ '^[a-f0-9]{64}$'),
  renewal_digest text not null check (renewal_digest ~ '^[a-f0-9]{64}$'),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  renewal_state text not null check (renewal_state='RENEWED_VERIFIED'),
  observed_at timestamptz not null,
  valid_until timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (valid_until > observed_at),
  check (receiver_observed_at <= observed_at + interval '2 minutes')
);

create unique index if not exists master_build381_receiver_health_nonce_unique_idx
  on app.master_build381_receiver_health_renewal_events(nonce);
create unique index if not exists master_build381_receiver_health_sequence_unique_idx
  on app.master_build381_receiver_health_renewal_events(receiver_instance_id,receiver_boot_id,receiver_health_sequence);
create index if not exists master_build381_receiver_health_recent_idx
  on app.master_build381_receiver_health_renewal_events(recorded_at desc);

create table if not exists app.master_build381_fail_closed_rollback_events (
  rollback_event_id uuid primary key,
  renewal_event_id uuid null
    references app.master_build381_receiver_health_renewal_events(renewal_event_id) on delete restrict,
  prior_registry_evidence_id uuid not null
    references app.master_shell_source_registry_evidence(evidence_id) on delete restrict,
  rollback_registry_evidence_id uuid not null unique
    references app.master_shell_source_registry_evidence(evidence_id) on delete restrict,
  authority_key_id text not null check (char_length(authority_key_id) between 1 and 160),
  authority_key_spki_sha256 text not null check (authority_key_spki_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  envelope_sha256 text not null check (envelope_sha256 ~ '^[a-f0-9]{64}$'),
  signature_sha256 text not null check (signature_sha256 ~ '^[a-f0-9]{64}$'),
  nonce text not null check (char_length(nonce) between 16 and 160),
  controller_revision text not null check (controller_revision ~ '^[a-f0-9]{40}$'),
  source_revision text not null check (source_revision ~ '^[a-f0-9]{40}$'),
  ai_hub_main text not null check (ai_hub_main ~ '^[a-f0-9]{40}$'),
  comms_main text not null check (comms_main ~ '^[a-f0-9]{40}$'),
  original_host_id text not null check (char_length(original_host_id) between 1 and 128),
  receiver_instance_id text not null check (char_length(receiver_instance_id) between 1 and 160),
  receiver_boot_id text not null check (char_length(receiver_boot_id) between 1 and 160),
  receiver_state text not null check (receiver_state='OFF'),
  reason text not null check (reason in (
    'HEALTH_RENEWAL_EXPIRED',
    'MASTER_REVALIDATION_FAILED',
    'RECEIVER_HEALTH_FAILED',
    'EXPLICIT_PROTECTED_SHUTDOWN'
  )),
  receiver_off_observed_at timestamptz not null,
  receiver_off_proof_uri text not null check (char_length(receiver_off_proof_uri) between 1 and 512),
  receiver_off_digest text not null check (receiver_off_digest ~ '^[a-f0-9]{64} check (char_length(evidence_uri) between 1 and 512),
  rollback_state text not null check (rollback_state='ROLLED_BACK_VERIFIED'),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create unique index if not exists master_build381_fail_closed_rollback_nonce_unique_idx
  on app.master_build381_fail_closed_rollback_events(nonce);
create index if not exists master_build381_fail_closed_rollback_recent_idx
  on app.master_build381_fail_closed_rollback_events(recorded_at desc);

alter table app.master_build381_receiver_health_renewal_events enable row level security;
alter table app.master_build381_receiver_health_renewal_events force row level security;
alter table app.master_build381_fail_closed_rollback_events enable row level security;
alter table app.master_build381_fail_closed_rollback_events force row level security;

drop policy if exists master_shell_source_registry_evidence_build381_protected_insert
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build381_protected_insert
  on app.master_shell_source_registry_evidence
  for insert to ai_data_protected_runtime
  with check (
    source_id='yw'
    and environment='production'
    and declared_status in ('CONNECTED','DISCONNECTED')
    and evidence_authority='independent-source-verification'
    and metadata->>'build'='381'
  );

drop policy if exists master_build381_receiver_health_select
  on app.master_build381_receiver_health_renewal_events;
create policy master_build381_receiver_health_select
  on app.master_build381_receiver_health_renewal_events
  for select to ai_data_runtime
  using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build381_receiver_health_protected_select
  on app.master_build381_receiver_health_renewal_events;
create policy master_build381_receiver_health_protected_select
  on app.master_build381_receiver_health_renewal_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build381_receiver_health_protected_insert
  on app.master_build381_receiver_health_renewal_events;
create policy master_build381_receiver_health_protected_insert
  on app.master_build381_receiver_health_renewal_events
  for insert to ai_data_protected_runtime
  with check (
    renewal_state='RENEWED_VERIFIED'
    and receiver_state='ON'
  );

drop policy if exists master_build381_fail_closed_rollback_select
  on app.master_build381_fail_closed_rollback_events;
create policy master_build381_fail_closed_rollback_select
  on app.master_build381_fail_closed_rollback_events
  for select to ai_data_runtime
  using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build381_fail_closed_rollback_protected_select
  on app.master_build381_fail_closed_rollback_events;
create policy master_build381_fail_closed_rollback_protected_select
  on app.master_build381_fail_closed_rollback_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build381_fail_closed_rollback_protected_insert
  on app.master_build381_fail_closed_rollback_events;
create policy master_build381_fail_closed_rollback_protected_insert
  on app.master_build381_fail_closed_rollback_events
  for insert to ai_data_protected_runtime
  with check (
    rollback_state='ROLLED_BACK_VERIFIED'
    and receiver_state='OFF'
  );

grant select on
  app.master_build381_receiver_health_renewal_events,
  app.master_build381_fail_closed_rollback_events
to ai_data_runtime;

grant select,insert on
  app.master_build381_receiver_health_renewal_events,
  app.master_build381_fail_closed_rollback_events
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build381_receiver_health_renewal_events,
  app.master_build381_fail_closed_rollback_events
from ai_data_runtime;

revoke update,delete on
  app.master_build381_receiver_health_renewal_events,
  app.master_build381_fail_closed_rollback_events
from ai_data_protected_runtime;
),
  receiver_off_signer_key_id text not null check (char_length(receiver_off_signer_key_id) between 1 and 160),
  receiver_off_signature_sha256 text not null check (receiver_off_signature_sha256 ~ '^[a-f0-9]{64} check (char_length(evidence_uri) between 1 and 512),
  rollback_state text not null check (rollback_state='ROLLED_BACK_VERIFIED'),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create unique index if not exists master_build381_fail_closed_rollback_nonce_unique_idx
  on app.master_build381_fail_closed_rollback_events(nonce);
create index if not exists master_build381_fail_closed_rollback_recent_idx
  on app.master_build381_fail_closed_rollback_events(recorded_at desc);

alter table app.master_build381_receiver_health_renewal_events enable row level security;
alter table app.master_build381_receiver_health_renewal_events force row level security;
alter table app.master_build381_fail_closed_rollback_events enable row level security;
alter table app.master_build381_fail_closed_rollback_events force row level security;

drop policy if exists master_shell_source_registry_evidence_build381_protected_insert
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build381_protected_insert
  on app.master_shell_source_registry_evidence
  for insert to ai_data_protected_runtime
  with check (
    source_id='yw'
    and environment='production'
    and declared_status in ('CONNECTED','DISCONNECTED')
    and evidence_authority='independent-source-verification'
    and metadata->>'build'='381'
  );

drop policy if exists master_build381_receiver_health_select
  on app.master_build381_receiver_health_renewal_events;
create policy master_build381_receiver_health_select
  on app.master_build381_receiver_health_renewal_events
  for select to ai_data_runtime
  using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build381_receiver_health_protected_select
  on app.master_build381_receiver_health_renewal_events;
create policy master_build381_receiver_health_protected_select
  on app.master_build381_receiver_health_renewal_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build381_receiver_health_protected_insert
  on app.master_build381_receiver_health_renewal_events;
create policy master_build381_receiver_health_protected_insert
  on app.master_build381_receiver_health_renewal_events
  for insert to ai_data_protected_runtime
  with check (
    renewal_state='RENEWED_VERIFIED'
    and receiver_state='ON'
  );

drop policy if exists master_build381_fail_closed_rollback_select
  on app.master_build381_fail_closed_rollback_events;
create policy master_build381_fail_closed_rollback_select
  on app.master_build381_fail_closed_rollback_events
  for select to ai_data_runtime
  using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build381_fail_closed_rollback_protected_select
  on app.master_build381_fail_closed_rollback_events;
create policy master_build381_fail_closed_rollback_protected_select
  on app.master_build381_fail_closed_rollback_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build381_fail_closed_rollback_protected_insert
  on app.master_build381_fail_closed_rollback_events;
create policy master_build381_fail_closed_rollback_protected_insert
  on app.master_build381_fail_closed_rollback_events
  for insert to ai_data_protected_runtime
  with check (
    rollback_state='ROLLED_BACK_VERIFIED'
    and receiver_state='OFF'
  );

grant select on
  app.master_build381_receiver_health_renewal_events,
  app.master_build381_fail_closed_rollback_events
to ai_data_runtime;

grant select,insert on
  app.master_build381_receiver_health_renewal_events,
  app.master_build381_fail_closed_rollback_events
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build381_receiver_health_renewal_events,
  app.master_build381_fail_closed_rollback_events
from ai_data_runtime;

revoke update,delete on
  app.master_build381_receiver_health_renewal_events,
  app.master_build381_fail_closed_rollback_events
from ai_data_protected_runtime;
),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  rollback_state text not null check (rollback_state='ROLLED_BACK_VERIFIED'),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create unique index if not exists master_build381_fail_closed_rollback_nonce_unique_idx
  on app.master_build381_fail_closed_rollback_events(nonce);
create index if not exists master_build381_fail_closed_rollback_recent_idx
  on app.master_build381_fail_closed_rollback_events(recorded_at desc);

alter table app.master_build381_receiver_health_renewal_events enable row level security;
alter table app.master_build381_receiver_health_renewal_events force row level security;
alter table app.master_build381_fail_closed_rollback_events enable row level security;
alter table app.master_build381_fail_closed_rollback_events force row level security;

drop policy if exists master_shell_source_registry_evidence_build381_protected_insert
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build381_protected_insert
  on app.master_shell_source_registry_evidence
  for insert to ai_data_protected_runtime
  with check (
    source_id='yw'
    and environment='production'
    and declared_status in ('CONNECTED','DISCONNECTED')
    and evidence_authority='independent-source-verification'
    and metadata->>'build'='381'
  );

drop policy if exists master_build381_receiver_health_select
  on app.master_build381_receiver_health_renewal_events;
create policy master_build381_receiver_health_select
  on app.master_build381_receiver_health_renewal_events
  for select to ai_data_runtime
  using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build381_receiver_health_protected_select
  on app.master_build381_receiver_health_renewal_events;
create policy master_build381_receiver_health_protected_select
  on app.master_build381_receiver_health_renewal_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build381_receiver_health_protected_insert
  on app.master_build381_receiver_health_renewal_events;
create policy master_build381_receiver_health_protected_insert
  on app.master_build381_receiver_health_renewal_events
  for insert to ai_data_protected_runtime
  with check (
    renewal_state='RENEWED_VERIFIED'
    and receiver_state='ON'
  );

drop policy if exists master_build381_fail_closed_rollback_select
  on app.master_build381_fail_closed_rollback_events;
create policy master_build381_fail_closed_rollback_select
  on app.master_build381_fail_closed_rollback_events
  for select to ai_data_runtime
  using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build381_fail_closed_rollback_protected_select
  on app.master_build381_fail_closed_rollback_events;
create policy master_build381_fail_closed_rollback_protected_select
  on app.master_build381_fail_closed_rollback_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build381_fail_closed_rollback_protected_insert
  on app.master_build381_fail_closed_rollback_events;
create policy master_build381_fail_closed_rollback_protected_insert
  on app.master_build381_fail_closed_rollback_events
  for insert to ai_data_protected_runtime
  with check (
    rollback_state='ROLLED_BACK_VERIFIED'
    and receiver_state='OFF'
  );

grant select on
  app.master_build381_receiver_health_renewal_events,
  app.master_build381_fail_closed_rollback_events
to ai_data_runtime;

grant select,insert on
  app.master_build381_receiver_health_renewal_events,
  app.master_build381_fail_closed_rollback_events
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build381_receiver_health_renewal_events,
  app.master_build381_fail_closed_rollback_events
from ai_data_runtime;

revoke update,delete on
  app.master_build381_receiver_health_renewal_events,
  app.master_build381_fail_closed_rollback_events
from ai_data_protected_runtime;
