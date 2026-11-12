-- Build 380 — Protected External Runtime Activation Ceremony,
-- Receiver-State Proof, Verified CONNECTED Transition &
-- Three-Master Synchronization Closure.
-- All writes are protected-runtime only; browser/runtime users are read-only.

create table if not exists app.master_build380_external_runtime_activation_ceremony_events (
  ceremony_event_id uuid primary key,
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
  build379_protected_admission_event_id uuid not null
    references app.master_build379_protected_runtime_admission_events(admission_event_id) on delete restrict,
  build379_decision_event_id uuid not null
    references app.master_build379_supervised_activation_decision_events(decision_event_id) on delete restrict,
  build379_execution_event_id uuid not null
    references app.master_build379_activation_decision_execution_events(execution_event_id) on delete restrict,
  exact_receipt_id uuid not null
    references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  owner_decision_id uuid not null
    references app.master_owner_decision_audit(decision_id) on delete restrict,
  prior_registry_evidence_id uuid not null
    references app.master_shell_source_registry_evidence(evidence_id) on delete restrict,
  receiver_instance_id text not null check (char_length(receiver_instance_id) between 1 and 160),
  receiver_boot_id text not null check (char_length(receiver_boot_id) between 1 and 160),
  receiver_started_at timestamptz not null,
  receiver_probe_observed_at timestamptz not null,
  receiver_proof_uri text not null check (char_length(receiver_proof_uri) between 1 and 512),
  receiver_proof_digest text not null check (receiver_proof_digest ~ '^[a-f0-9]{64}$'),
  source_handshake_receipt_id text not null check (char_length(source_handshake_receipt_id) between 1 and 160),
  source_handshake_digest text not null check (source_handshake_digest ~ '^[a-f0-9]{64}$'),
  terminal_sync_digest text not null check (terminal_sync_digest ~ '^[a-f0-9]{64}$'),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  ceremony_state text not null check (ceremony_state='VERIFIED_EXECUTED'),
  receiver_state text not null check (receiver_state='ON'),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (receiver_started_at <= receiver_probe_observed_at),
  check (receiver_probe_observed_at <= observed_at + interval '2 minutes')
);

create unique index if not exists master_build380_external_runtime_activation_nonce_unique_idx
  on app.master_build380_external_runtime_activation_ceremony_events(nonce);
create index if not exists master_build380_external_runtime_activation_recent_idx
  on app.master_build380_external_runtime_activation_ceremony_events(recorded_at desc);

create table if not exists app.master_build380_verified_connected_transition_events (
  transition_event_id uuid primary key,
  ceremony_event_id uuid not null unique
    references app.master_build380_external_runtime_activation_ceremony_events(ceremony_event_id) on delete restrict,
  registry_evidence_id uuid not null unique
    references app.master_shell_source_registry_evidence(evidence_id) on delete restrict,
  exact_receipt_id uuid not null
    references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  owner_decision_id uuid not null
    references app.master_owner_decision_audit(decision_id) on delete restrict,
  build379_decision_event_id uuid not null
    references app.master_build379_supervised_activation_decision_events(decision_event_id) on delete restrict,
  transition_state text not null check (transition_state='CONNECTED_VERIFIED'),
  connection_state text not null check (connection_state='CONNECTED'),
  receiver_state text not null check (receiver_state='ON'),
  verified_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_build380_verified_connected_transition_recent_idx
  on app.master_build380_verified_connected_transition_events(recorded_at desc);

create table if not exists app.master_build380_three_master_sync_closure_events (
  closure_event_id uuid primary key,
  ceremony_event_id uuid not null unique
    references app.master_build380_external_runtime_activation_ceremony_events(ceremony_event_id) on delete restrict,
  transition_event_id uuid not null unique
    references app.master_build380_verified_connected_transition_events(transition_event_id) on delete restrict,
  ai_hub_runtime_receipt_id text not null check (char_length(ai_hub_runtime_receipt_id) between 1 and 160),
  ai_hub_runtime_digest text not null check (ai_hub_runtime_digest ~ '^[a-f0-9]{64}
  terminal_sync_digest text not null check (terminal_sync_digest ~ '^[a-f0-9]{64}$'),
  closure_state text not null check (closure_state='CLOSED_VERIFIED'),
  masters_synced boolean not null check (masters_synced=true),
  closed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_build380_three_master_sync_closure_recent_idx
  on app.master_build380_three_master_sync_closure_events(recorded_at desc);

alter table app.master_build380_external_runtime_activation_ceremony_events enable row level security;
alter table app.master_build380_external_runtime_activation_ceremony_events force row level security;
alter table app.master_build380_verified_connected_transition_events enable row level security;
alter table app.master_build380_verified_connected_transition_events force row level security;
alter table app.master_build380_three_master_sync_closure_events enable row level security;
alter table app.master_build380_three_master_sync_closure_events force row level security;

drop policy if exists master_build379_supervised_activation_decision_events_build380_protected_select
  on app.master_build379_supervised_activation_decision_events;
create policy master_build379_supervised_activation_decision_events_build380_protected_select
  on app.master_build379_supervised_activation_decision_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build379_activation_decision_execution_events_build380_protected_select
  on app.master_build379_activation_decision_execution_events;
create policy master_build379_activation_decision_execution_events_build380_protected_select
  on app.master_build379_activation_decision_execution_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_shell_source_registry_evidence_build380_protected_select
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build380_protected_select
  on app.master_shell_source_registry_evidence
  for select to ai_data_protected_runtime using (source_id='yw');

drop policy if exists master_shell_source_registry_evidence_build380_protected_insert
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build380_protected_insert
  on app.master_shell_source_registry_evidence
  for insert to ai_data_protected_runtime
  with check (
    source_id='yw'
    and environment='production'
    and declared_status='CONNECTED'
    and evidence_authority='independent-source-verification'
    and owner_authorized=true
    and independent_test_verified=true
    and independent_connection_verified=true
    and connection_evidence_uri is not null
    and metadata->>'build'='380'
  );

drop policy if exists master_build380_external_runtime_activation_select
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_select
  on app.master_build380_external_runtime_activation_ceremony_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_external_runtime_activation_protected_select
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_protected_select
  on app.master_build380_external_runtime_activation_ceremony_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_external_runtime_activation_protected_insert
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_protected_insert
  on app.master_build380_external_runtime_activation_ceremony_events
  for insert to ai_data_protected_runtime
  with check (
    ceremony_state='VERIFIED_EXECUTED'
    and receiver_state='ON'
  );

drop policy if exists master_build380_verified_connected_transition_select
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_select
  on app.master_build380_verified_connected_transition_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_verified_connected_transition_protected_select
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_protected_select
  on app.master_build380_verified_connected_transition_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_verified_connected_transition_protected_insert
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_protected_insert
  on app.master_build380_verified_connected_transition_events
  for insert to ai_data_protected_runtime
  with check (
    transition_state='CONNECTED_VERIFIED'
    and connection_state='CONNECTED'
    and receiver_state='ON'
  );

drop policy if exists master_build380_three_master_sync_closure_select
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_select
  on app.master_build380_three_master_sync_closure_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_three_master_sync_closure_protected_select
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_protected_select
  on app.master_build380_three_master_sync_closure_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_three_master_sync_closure_protected_insert
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_protected_insert
  on app.master_build380_three_master_sync_closure_events
  for insert to ai_data_protected_runtime
  with check (
    closure_state='CLOSED_VERIFIED'
    and masters_synced=true
  );

grant select on
  app.master_build379_supervised_activation_decision_events,
  app.master_build379_activation_decision_execution_events
to ai_data_protected_runtime;

grant select,insert on app.master_shell_source_registry_evidence
to ai_data_protected_runtime;

grant select on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
to ai_data_runtime;

grant select,insert on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
from ai_data_runtime;

revoke update,delete on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
from ai_data_protected_runtime;
),
  ai_hub_signer_key_id text not null check (char_length(ai_hub_signer_key_id) between 1 and 160),
  ai_hub_signature_sha256 text not null check (ai_hub_signature_sha256 ~ '^[a-f0-9]{64}
  terminal_sync_digest text not null check (terminal_sync_digest ~ '^[a-f0-9]{64}$'),
  closure_state text not null check (closure_state='CLOSED_VERIFIED'),
  masters_synced boolean not null check (masters_synced=true),
  closed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_build380_three_master_sync_closure_recent_idx
  on app.master_build380_three_master_sync_closure_events(recorded_at desc);

alter table app.master_build380_external_runtime_activation_ceremony_events enable row level security;
alter table app.master_build380_external_runtime_activation_ceremony_events force row level security;
alter table app.master_build380_verified_connected_transition_events enable row level security;
alter table app.master_build380_verified_connected_transition_events force row level security;
alter table app.master_build380_three_master_sync_closure_events enable row level security;
alter table app.master_build380_three_master_sync_closure_events force row level security;

drop policy if exists master_build379_supervised_activation_decision_events_build380_protected_select
  on app.master_build379_supervised_activation_decision_events;
create policy master_build379_supervised_activation_decision_events_build380_protected_select
  on app.master_build379_supervised_activation_decision_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build379_activation_decision_execution_events_build380_protected_select
  on app.master_build379_activation_decision_execution_events;
create policy master_build379_activation_decision_execution_events_build380_protected_select
  on app.master_build379_activation_decision_execution_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_shell_source_registry_evidence_build380_protected_select
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build380_protected_select
  on app.master_shell_source_registry_evidence
  for select to ai_data_protected_runtime using (source_id='yw');

drop policy if exists master_shell_source_registry_evidence_build380_protected_insert
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build380_protected_insert
  on app.master_shell_source_registry_evidence
  for insert to ai_data_protected_runtime
  with check (
    source_id='yw'
    and environment='production'
    and declared_status='CONNECTED'
    and evidence_authority='independent-source-verification'
    and owner_authorized=true
    and independent_test_verified=true
    and independent_connection_verified=true
    and connection_evidence_uri is not null
    and metadata->>'build'='380'
  );

drop policy if exists master_build380_external_runtime_activation_select
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_select
  on app.master_build380_external_runtime_activation_ceremony_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_external_runtime_activation_protected_select
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_protected_select
  on app.master_build380_external_runtime_activation_ceremony_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_external_runtime_activation_protected_insert
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_protected_insert
  on app.master_build380_external_runtime_activation_ceremony_events
  for insert to ai_data_protected_runtime
  with check (
    ceremony_state='VERIFIED_EXECUTED'
    and receiver_state='ON'
  );

drop policy if exists master_build380_verified_connected_transition_select
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_select
  on app.master_build380_verified_connected_transition_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_verified_connected_transition_protected_select
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_protected_select
  on app.master_build380_verified_connected_transition_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_verified_connected_transition_protected_insert
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_protected_insert
  on app.master_build380_verified_connected_transition_events
  for insert to ai_data_protected_runtime
  with check (
    transition_state='CONNECTED_VERIFIED'
    and connection_state='CONNECTED'
    and receiver_state='ON'
  );

drop policy if exists master_build380_three_master_sync_closure_select
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_select
  on app.master_build380_three_master_sync_closure_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_three_master_sync_closure_protected_select
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_protected_select
  on app.master_build380_three_master_sync_closure_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_three_master_sync_closure_protected_insert
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_protected_insert
  on app.master_build380_three_master_sync_closure_events
  for insert to ai_data_protected_runtime
  with check (
    closure_state='CLOSED_VERIFIED'
    and masters_synced=true
  );

grant select on
  app.master_build379_supervised_activation_decision_events,
  app.master_build379_activation_decision_execution_events
to ai_data_protected_runtime;

grant select,insert on app.master_shell_source_registry_evidence
to ai_data_protected_runtime;

grant select on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
to ai_data_runtime;

grant select,insert on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
from ai_data_runtime;

revoke update,delete on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
from ai_data_protected_runtime;
),
  comms_runtime_receipt_id text not null check (char_length(comms_runtime_receipt_id) between 1 and 160),
  comms_runtime_digest text not null check (comms_runtime_digest ~ '^[a-f0-9]{64}
  terminal_sync_digest text not null check (terminal_sync_digest ~ '^[a-f0-9]{64}$'),
  closure_state text not null check (closure_state='CLOSED_VERIFIED'),
  masters_synced boolean not null check (masters_synced=true),
  closed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_build380_three_master_sync_closure_recent_idx
  on app.master_build380_three_master_sync_closure_events(recorded_at desc);

alter table app.master_build380_external_runtime_activation_ceremony_events enable row level security;
alter table app.master_build380_external_runtime_activation_ceremony_events force row level security;
alter table app.master_build380_verified_connected_transition_events enable row level security;
alter table app.master_build380_verified_connected_transition_events force row level security;
alter table app.master_build380_three_master_sync_closure_events enable row level security;
alter table app.master_build380_three_master_sync_closure_events force row level security;

drop policy if exists master_build379_supervised_activation_decision_events_build380_protected_select
  on app.master_build379_supervised_activation_decision_events;
create policy master_build379_supervised_activation_decision_events_build380_protected_select
  on app.master_build379_supervised_activation_decision_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build379_activation_decision_execution_events_build380_protected_select
  on app.master_build379_activation_decision_execution_events;
create policy master_build379_activation_decision_execution_events_build380_protected_select
  on app.master_build379_activation_decision_execution_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_shell_source_registry_evidence_build380_protected_select
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build380_protected_select
  on app.master_shell_source_registry_evidence
  for select to ai_data_protected_runtime using (source_id='yw');

drop policy if exists master_shell_source_registry_evidence_build380_protected_insert
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build380_protected_insert
  on app.master_shell_source_registry_evidence
  for insert to ai_data_protected_runtime
  with check (
    source_id='yw'
    and environment='production'
    and declared_status='CONNECTED'
    and evidence_authority='independent-source-verification'
    and owner_authorized=true
    and independent_test_verified=true
    and independent_connection_verified=true
    and connection_evidence_uri is not null
    and metadata->>'build'='380'
  );

drop policy if exists master_build380_external_runtime_activation_select
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_select
  on app.master_build380_external_runtime_activation_ceremony_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_external_runtime_activation_protected_select
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_protected_select
  on app.master_build380_external_runtime_activation_ceremony_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_external_runtime_activation_protected_insert
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_protected_insert
  on app.master_build380_external_runtime_activation_ceremony_events
  for insert to ai_data_protected_runtime
  with check (
    ceremony_state='VERIFIED_EXECUTED'
    and receiver_state='ON'
  );

drop policy if exists master_build380_verified_connected_transition_select
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_select
  on app.master_build380_verified_connected_transition_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_verified_connected_transition_protected_select
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_protected_select
  on app.master_build380_verified_connected_transition_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_verified_connected_transition_protected_insert
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_protected_insert
  on app.master_build380_verified_connected_transition_events
  for insert to ai_data_protected_runtime
  with check (
    transition_state='CONNECTED_VERIFIED'
    and connection_state='CONNECTED'
    and receiver_state='ON'
  );

drop policy if exists master_build380_three_master_sync_closure_select
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_select
  on app.master_build380_three_master_sync_closure_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_three_master_sync_closure_protected_select
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_protected_select
  on app.master_build380_three_master_sync_closure_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_three_master_sync_closure_protected_insert
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_protected_insert
  on app.master_build380_three_master_sync_closure_events
  for insert to ai_data_protected_runtime
  with check (
    closure_state='CLOSED_VERIFIED'
    and masters_synced=true
  );

grant select on
  app.master_build379_supervised_activation_decision_events,
  app.master_build379_activation_decision_execution_events
to ai_data_protected_runtime;

grant select,insert on app.master_shell_source_registry_evidence
to ai_data_protected_runtime;

grant select on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
to ai_data_runtime;

grant select,insert on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
from ai_data_runtime;

revoke update,delete on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
from ai_data_protected_runtime;
),
  comms_signer_key_id text not null check (char_length(comms_signer_key_id) between 1 and 160),
  comms_signature_sha256 text not null check (comms_signature_sha256 ~ '^[a-f0-9]{64}
  terminal_sync_digest text not null check (terminal_sync_digest ~ '^[a-f0-9]{64}$'),
  closure_state text not null check (closure_state='CLOSED_VERIFIED'),
  masters_synced boolean not null check (masters_synced=true),
  closed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_build380_three_master_sync_closure_recent_idx
  on app.master_build380_three_master_sync_closure_events(recorded_at desc);

alter table app.master_build380_external_runtime_activation_ceremony_events enable row level security;
alter table app.master_build380_external_runtime_activation_ceremony_events force row level security;
alter table app.master_build380_verified_connected_transition_events enable row level security;
alter table app.master_build380_verified_connected_transition_events force row level security;
alter table app.master_build380_three_master_sync_closure_events enable row level security;
alter table app.master_build380_three_master_sync_closure_events force row level security;

drop policy if exists master_build379_supervised_activation_decision_events_build380_protected_select
  on app.master_build379_supervised_activation_decision_events;
create policy master_build379_supervised_activation_decision_events_build380_protected_select
  on app.master_build379_supervised_activation_decision_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build379_activation_decision_execution_events_build380_protected_select
  on app.master_build379_activation_decision_execution_events;
create policy master_build379_activation_decision_execution_events_build380_protected_select
  on app.master_build379_activation_decision_execution_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_shell_source_registry_evidence_build380_protected_select
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build380_protected_select
  on app.master_shell_source_registry_evidence
  for select to ai_data_protected_runtime using (source_id='yw');

drop policy if exists master_shell_source_registry_evidence_build380_protected_insert
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build380_protected_insert
  on app.master_shell_source_registry_evidence
  for insert to ai_data_protected_runtime
  with check (
    source_id='yw'
    and environment='production'
    and declared_status='CONNECTED'
    and evidence_authority='independent-source-verification'
    and owner_authorized=true
    and independent_test_verified=true
    and independent_connection_verified=true
    and connection_evidence_uri is not null
    and metadata->>'build'='380'
  );

drop policy if exists master_build380_external_runtime_activation_select
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_select
  on app.master_build380_external_runtime_activation_ceremony_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_external_runtime_activation_protected_select
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_protected_select
  on app.master_build380_external_runtime_activation_ceremony_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_external_runtime_activation_protected_insert
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_protected_insert
  on app.master_build380_external_runtime_activation_ceremony_events
  for insert to ai_data_protected_runtime
  with check (
    ceremony_state='VERIFIED_EXECUTED'
    and receiver_state='ON'
  );

drop policy if exists master_build380_verified_connected_transition_select
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_select
  on app.master_build380_verified_connected_transition_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_verified_connected_transition_protected_select
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_protected_select
  on app.master_build380_verified_connected_transition_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_verified_connected_transition_protected_insert
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_protected_insert
  on app.master_build380_verified_connected_transition_events
  for insert to ai_data_protected_runtime
  with check (
    transition_state='CONNECTED_VERIFIED'
    and connection_state='CONNECTED'
    and receiver_state='ON'
  );

drop policy if exists master_build380_three_master_sync_closure_select
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_select
  on app.master_build380_three_master_sync_closure_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_three_master_sync_closure_protected_select
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_protected_select
  on app.master_build380_three_master_sync_closure_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_three_master_sync_closure_protected_insert
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_protected_insert
  on app.master_build380_three_master_sync_closure_events
  for insert to ai_data_protected_runtime
  with check (
    closure_state='CLOSED_VERIFIED'
    and masters_synced=true
  );

grant select on
  app.master_build379_supervised_activation_decision_events,
  app.master_build379_activation_decision_execution_events
to ai_data_protected_runtime;

grant select,insert on app.master_shell_source_registry_evidence
to ai_data_protected_runtime;

grant select on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
to ai_data_runtime;

grant select,insert on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
from ai_data_runtime;

revoke update,delete on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
from ai_data_protected_runtime;
),
  controller_runtime_receipt_id text not null check (char_length(controller_runtime_receipt_id) between 1 and 160),
  controller_runtime_digest text not null check (controller_runtime_digest ~ '^[a-f0-9]{64}
  terminal_sync_digest text not null check (terminal_sync_digest ~ '^[a-f0-9]{64}$'),
  closure_state text not null check (closure_state='CLOSED_VERIFIED'),
  masters_synced boolean not null check (masters_synced=true),
  closed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_build380_three_master_sync_closure_recent_idx
  on app.master_build380_three_master_sync_closure_events(recorded_at desc);

alter table app.master_build380_external_runtime_activation_ceremony_events enable row level security;
alter table app.master_build380_external_runtime_activation_ceremony_events force row level security;
alter table app.master_build380_verified_connected_transition_events enable row level security;
alter table app.master_build380_verified_connected_transition_events force row level security;
alter table app.master_build380_three_master_sync_closure_events enable row level security;
alter table app.master_build380_three_master_sync_closure_events force row level security;

drop policy if exists master_build379_supervised_activation_decision_events_build380_protected_select
  on app.master_build379_supervised_activation_decision_events;
create policy master_build379_supervised_activation_decision_events_build380_protected_select
  on app.master_build379_supervised_activation_decision_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build379_activation_decision_execution_events_build380_protected_select
  on app.master_build379_activation_decision_execution_events;
create policy master_build379_activation_decision_execution_events_build380_protected_select
  on app.master_build379_activation_decision_execution_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_shell_source_registry_evidence_build380_protected_select
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build380_protected_select
  on app.master_shell_source_registry_evidence
  for select to ai_data_protected_runtime using (source_id='yw');

drop policy if exists master_shell_source_registry_evidence_build380_protected_insert
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build380_protected_insert
  on app.master_shell_source_registry_evidence
  for insert to ai_data_protected_runtime
  with check (
    source_id='yw'
    and environment='production'
    and declared_status='CONNECTED'
    and evidence_authority='independent-source-verification'
    and owner_authorized=true
    and independent_test_verified=true
    and independent_connection_verified=true
    and connection_evidence_uri is not null
    and metadata->>'build'='380'
  );

drop policy if exists master_build380_external_runtime_activation_select
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_select
  on app.master_build380_external_runtime_activation_ceremony_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_external_runtime_activation_protected_select
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_protected_select
  on app.master_build380_external_runtime_activation_ceremony_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_external_runtime_activation_protected_insert
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_protected_insert
  on app.master_build380_external_runtime_activation_ceremony_events
  for insert to ai_data_protected_runtime
  with check (
    ceremony_state='VERIFIED_EXECUTED'
    and receiver_state='ON'
  );

drop policy if exists master_build380_verified_connected_transition_select
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_select
  on app.master_build380_verified_connected_transition_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_verified_connected_transition_protected_select
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_protected_select
  on app.master_build380_verified_connected_transition_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_verified_connected_transition_protected_insert
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_protected_insert
  on app.master_build380_verified_connected_transition_events
  for insert to ai_data_protected_runtime
  with check (
    transition_state='CONNECTED_VERIFIED'
    and connection_state='CONNECTED'
    and receiver_state='ON'
  );

drop policy if exists master_build380_three_master_sync_closure_select
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_select
  on app.master_build380_three_master_sync_closure_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_three_master_sync_closure_protected_select
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_protected_select
  on app.master_build380_three_master_sync_closure_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_three_master_sync_closure_protected_insert
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_protected_insert
  on app.master_build380_three_master_sync_closure_events
  for insert to ai_data_protected_runtime
  with check (
    closure_state='CLOSED_VERIFIED'
    and masters_synced=true
  );

grant select on
  app.master_build379_supervised_activation_decision_events,
  app.master_build379_activation_decision_execution_events
to ai_data_protected_runtime;

grant select,insert on app.master_shell_source_registry_evidence
to ai_data_protected_runtime;

grant select on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
to ai_data_runtime;

grant select,insert on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
from ai_data_runtime;

revoke update,delete on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
from ai_data_protected_runtime;
),
  controller_signer_key_id text not null check (char_length(controller_signer_key_id) between 1 and 160),
  controller_signature_sha256 text not null check (controller_signature_sha256 ~ '^[a-f0-9]{64}
  terminal_sync_digest text not null check (terminal_sync_digest ~ '^[a-f0-9]{64}$'),
  closure_state text not null check (closure_state='CLOSED_VERIFIED'),
  masters_synced boolean not null check (masters_synced=true),
  closed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_build380_three_master_sync_closure_recent_idx
  on app.master_build380_three_master_sync_closure_events(recorded_at desc);

alter table app.master_build380_external_runtime_activation_ceremony_events enable row level security;
alter table app.master_build380_external_runtime_activation_ceremony_events force row level security;
alter table app.master_build380_verified_connected_transition_events enable row level security;
alter table app.master_build380_verified_connected_transition_events force row level security;
alter table app.master_build380_three_master_sync_closure_events enable row level security;
alter table app.master_build380_three_master_sync_closure_events force row level security;

drop policy if exists master_build379_supervised_activation_decision_events_build380_protected_select
  on app.master_build379_supervised_activation_decision_events;
create policy master_build379_supervised_activation_decision_events_build380_protected_select
  on app.master_build379_supervised_activation_decision_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build379_activation_decision_execution_events_build380_protected_select
  on app.master_build379_activation_decision_execution_events;
create policy master_build379_activation_decision_execution_events_build380_protected_select
  on app.master_build379_activation_decision_execution_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_shell_source_registry_evidence_build380_protected_select
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build380_protected_select
  on app.master_shell_source_registry_evidence
  for select to ai_data_protected_runtime using (source_id='yw');

drop policy if exists master_shell_source_registry_evidence_build380_protected_insert
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build380_protected_insert
  on app.master_shell_source_registry_evidence
  for insert to ai_data_protected_runtime
  with check (
    source_id='yw'
    and environment='production'
    and declared_status='CONNECTED'
    and evidence_authority='independent-source-verification'
    and owner_authorized=true
    and independent_test_verified=true
    and independent_connection_verified=true
    and connection_evidence_uri is not null
    and metadata->>'build'='380'
  );

drop policy if exists master_build380_external_runtime_activation_select
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_select
  on app.master_build380_external_runtime_activation_ceremony_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_external_runtime_activation_protected_select
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_protected_select
  on app.master_build380_external_runtime_activation_ceremony_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_external_runtime_activation_protected_insert
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_protected_insert
  on app.master_build380_external_runtime_activation_ceremony_events
  for insert to ai_data_protected_runtime
  with check (
    ceremony_state='VERIFIED_EXECUTED'
    and receiver_state='ON'
  );

drop policy if exists master_build380_verified_connected_transition_select
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_select
  on app.master_build380_verified_connected_transition_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_verified_connected_transition_protected_select
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_protected_select
  on app.master_build380_verified_connected_transition_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_verified_connected_transition_protected_insert
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_protected_insert
  on app.master_build380_verified_connected_transition_events
  for insert to ai_data_protected_runtime
  with check (
    transition_state='CONNECTED_VERIFIED'
    and connection_state='CONNECTED'
    and receiver_state='ON'
  );

drop policy if exists master_build380_three_master_sync_closure_select
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_select
  on app.master_build380_three_master_sync_closure_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_three_master_sync_closure_protected_select
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_protected_select
  on app.master_build380_three_master_sync_closure_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_three_master_sync_closure_protected_insert
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_protected_insert
  on app.master_build380_three_master_sync_closure_events
  for insert to ai_data_protected_runtime
  with check (
    closure_state='CLOSED_VERIFIED'
    and masters_synced=true
  );

grant select on
  app.master_build379_supervised_activation_decision_events,
  app.master_build379_activation_decision_execution_events
to ai_data_protected_runtime;

grant select,insert on app.master_shell_source_registry_evidence
to ai_data_protected_runtime;

grant select on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
to ai_data_runtime;

grant select,insert on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
from ai_data_runtime;

revoke update,delete on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
from ai_data_protected_runtime;
),
  terminal_sync_digest text not null check (terminal_sync_digest ~ '^[a-f0-9]{64}$'),
  closure_state text not null check (closure_state='CLOSED_VERIFIED'),
  masters_synced boolean not null check (masters_synced=true),
  closed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_build380_three_master_sync_closure_recent_idx
  on app.master_build380_three_master_sync_closure_events(recorded_at desc);

alter table app.master_build380_external_runtime_activation_ceremony_events enable row level security;
alter table app.master_build380_external_runtime_activation_ceremony_events force row level security;
alter table app.master_build380_verified_connected_transition_events enable row level security;
alter table app.master_build380_verified_connected_transition_events force row level security;
alter table app.master_build380_three_master_sync_closure_events enable row level security;
alter table app.master_build380_three_master_sync_closure_events force row level security;

drop policy if exists master_build379_supervised_activation_decision_events_build380_protected_select
  on app.master_build379_supervised_activation_decision_events;
create policy master_build379_supervised_activation_decision_events_build380_protected_select
  on app.master_build379_supervised_activation_decision_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build379_activation_decision_execution_events_build380_protected_select
  on app.master_build379_activation_decision_execution_events;
create policy master_build379_activation_decision_execution_events_build380_protected_select
  on app.master_build379_activation_decision_execution_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_shell_source_registry_evidence_build380_protected_select
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build380_protected_select
  on app.master_shell_source_registry_evidence
  for select to ai_data_protected_runtime using (source_id='yw');

drop policy if exists master_shell_source_registry_evidence_build380_protected_insert
  on app.master_shell_source_registry_evidence;
create policy master_shell_source_registry_evidence_build380_protected_insert
  on app.master_shell_source_registry_evidence
  for insert to ai_data_protected_runtime
  with check (
    source_id='yw'
    and environment='production'
    and declared_status='CONNECTED'
    and evidence_authority='independent-source-verification'
    and owner_authorized=true
    and independent_test_verified=true
    and independent_connection_verified=true
    and connection_evidence_uri is not null
    and metadata->>'build'='380'
  );

drop policy if exists master_build380_external_runtime_activation_select
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_select
  on app.master_build380_external_runtime_activation_ceremony_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_external_runtime_activation_protected_select
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_protected_select
  on app.master_build380_external_runtime_activation_ceremony_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_external_runtime_activation_protected_insert
  on app.master_build380_external_runtime_activation_ceremony_events;
create policy master_build380_external_runtime_activation_protected_insert
  on app.master_build380_external_runtime_activation_ceremony_events
  for insert to ai_data_protected_runtime
  with check (
    ceremony_state='VERIFIED_EXECUTED'
    and receiver_state='ON'
  );

drop policy if exists master_build380_verified_connected_transition_select
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_select
  on app.master_build380_verified_connected_transition_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_verified_connected_transition_protected_select
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_protected_select
  on app.master_build380_verified_connected_transition_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_verified_connected_transition_protected_insert
  on app.master_build380_verified_connected_transition_events;
create policy master_build380_verified_connected_transition_protected_insert
  on app.master_build380_verified_connected_transition_events
  for insert to ai_data_protected_runtime
  with check (
    transition_state='CONNECTED_VERIFIED'
    and connection_state='CONNECTED'
    and receiver_state='ON'
  );

drop policy if exists master_build380_three_master_sync_closure_select
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_select
  on app.master_build380_three_master_sync_closure_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build380_three_master_sync_closure_protected_select
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_protected_select
  on app.master_build380_three_master_sync_closure_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build380_three_master_sync_closure_protected_insert
  on app.master_build380_three_master_sync_closure_events;
create policy master_build380_three_master_sync_closure_protected_insert
  on app.master_build380_three_master_sync_closure_events
  for insert to ai_data_protected_runtime
  with check (
    closure_state='CLOSED_VERIFIED'
    and masters_synced=true
  );

grant select on
  app.master_build379_supervised_activation_decision_events,
  app.master_build379_activation_decision_execution_events
to ai_data_protected_runtime;

grant select,insert on app.master_shell_source_registry_evidence
to ai_data_protected_runtime;

grant select on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
to ai_data_runtime;

grant select,insert on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
from ai_data_runtime;

revoke update,delete on
  app.master_build380_external_runtime_activation_ceremony_events,
  app.master_build380_verified_connected_transition_events,
  app.master_build380_three_master_sync_closure_events
from ai_data_protected_runtime;
