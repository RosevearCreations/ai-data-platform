-- Build 376 — YW561 Independent Connection Evidence Intake,
-- Verified CONNECTED Transition, Exact-Receipt Owner Acceptance Continuity Recheck
-- & Three-Master Synchronization Closure.
-- Append-only correlation evidence only. No source private keys, transport secrets,
-- receiver credentials or raw signed payloads are stored.

create table if not exists app.master_yw561_independent_connection_evidence_intake_events (
  intake_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  registry_evidence_id uuid not null references app.master_shell_source_registry_evidence(evidence_id) on delete restrict,
  registry_record_version bigint not null check (registry_record_version > 0),
  exact_receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  test_evidence_uri text not null check (char_length(test_evidence_uri) between 1 and 512),
  connection_evidence_uri text not null check (char_length(connection_evidence_uri) between 1 and 512),
  signer_key_id text not null check (char_length(signer_key_id) between 1 and 160),
  signer_fingerprint text not null check (char_length(signer_fingerprint) between 16 and 256),
  status_observed_at timestamptz not null,
  status_expires_at timestamptz not null,
  verification_state text not null check (verification_state='VERIFIED_CURRENT'),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (status_expires_at > status_observed_at)
);

create unique index if not exists master_yw561_connection_intake_registry_unique_idx
  on app.master_yw561_independent_connection_evidence_intake_events(registry_evidence_id);

create index if not exists master_yw561_connection_intake_recent_idx
  on app.master_yw561_independent_connection_evidence_intake_events(recorded_at desc);

create table if not exists app.master_yw561_acceptance_continuity_connection_recheck_events (
  recheck_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  intake_event_id uuid references app.master_yw561_independent_connection_evidence_intake_events(intake_event_id) on delete restrict,
  exact_receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  owner_decision_id uuid references app.master_owner_decision_audit(decision_id) on delete restrict,
  owner_decision text not null check (owner_decision in ('PENDING','ACCEPT','REJECT')),
  prior_continuity_state text not null,
  recheck_state text not null check (
    recheck_state in (
      'ACTIVE_CURRENT',
      'HOLD_ACCEPTANCE_CONTINUITY',
      'HOLD_NO_CURRENT_RECEIPT',
      'HOLD_NO_VERIFIED_CONNECTION_INTAKE',
      'HOLD_RECEIPT_CHANGED'
    )
  ),
  blockers jsonb not null check (jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_yw561_acceptance_connection_recheck_recent_idx
  on app.master_yw561_acceptance_continuity_connection_recheck_events(recorded_at desc);

create table if not exists app.master_yw561_verified_connection_transition_events (
  transition_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  intake_event_id uuid references app.master_yw561_independent_connection_evidence_intake_events(intake_event_id) on delete restrict,
  acceptance_recheck_event_id uuid not null references app.master_yw561_acceptance_continuity_connection_recheck_events(recheck_event_id) on delete restrict,
  runtime_gate_state text not null check (runtime_gate_state in ('OPEN','HOLD')),
  prior_connection_state text not null,
  transition_state text not null check (
    transition_state in (
      'CONNECTED_VERIFIED',
      'HOLD_CONNECTION_EVIDENCE',
      'HOLD_ACCEPTANCE_CONTINUITY',
      'HOLD_MASTER_GATE',
      'HOLD_CONNECTION_RECONCILIATION'
    )
  ),
  connected boolean not null,
  connection_evidence_uri text,
  blockers jsonb not null check (jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (connected = (transition_state='CONNECTED_VERIFIED')),
  check (
    (connected=false)
    or (connection_evidence_uri is not null and char_length(connection_evidence_uri) between 1 and 512)
  )
);

create index if not exists master_yw561_verified_connection_transition_recent_idx
  on app.master_yw561_verified_connection_transition_events(recorded_at desc);

create table if not exists app.master_yw561_three_master_sync_closure_events (
  closure_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  controller_base_revision text not null check (controller_base_revision ~ '^[a-f0-9]{40}$'),
  ai_hub_main text not null check (ai_hub_main ~ '^[a-f0-9]{40}$'),
  comms_main text not null check (comms_main ~ '^[a-f0-9]{40}$'),
  connection_transition_event_id uuid not null references app.master_yw561_verified_connection_transition_events(transition_event_id) on delete restrict,
  exact_receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  runtime_gate_state text not null check (runtime_gate_state in ('OPEN','HOLD')),
  acceptance_continuity_state text not null,
  connection_state text not null check (connection_state in ('CONNECTED','DISCONNECTED_HOLD')),
  closure_state text not null check (closure_state in ('CLOSED','HOLD')),
  masters_synced boolean not null,
  blockers jsonb not null check (jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (masters_synced = (closure_state='CLOSED'))
);

create index if not exists master_yw561_three_master_sync_closure_recent_idx
  on app.master_yw561_three_master_sync_closure_events(recorded_at desc);

alter table app.master_yw561_independent_connection_evidence_intake_events enable row level security;
alter table app.master_yw561_independent_connection_evidence_intake_events force row level security;
alter table app.master_yw561_acceptance_continuity_connection_recheck_events enable row level security;
alter table app.master_yw561_acceptance_continuity_connection_recheck_events force row level security;
alter table app.master_yw561_verified_connection_transition_events enable row level security;
alter table app.master_yw561_verified_connection_transition_events force row level security;
alter table app.master_yw561_three_master_sync_closure_events enable row level security;
alter table app.master_yw561_three_master_sync_closure_events force row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'master_yw561_independent_connection_evidence_intake_events',
    'master_yw561_acceptance_continuity_connection_recheck_events',
    'master_yw561_verified_connection_transition_events',
    'master_yw561_three_master_sync_closure_events'
  ] loop
    execute format('drop policy if exists %I_select on app.%I',t,t);
    execute format(
      'create policy %I_select on app.%I for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting(''app.user_id'',true),'''') and wm.role in (''owner'',''admin'')))',
      t,t
    );
    execute format('drop policy if exists %I_insert on app.%I',t,t);
    execute format(
      'create policy %I_insert on app.%I for insert to ai_data_runtime with check (actor_user_id=nullif(current_setting(''app.user_id'',true),'''') and exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting(''app.user_id'',true),'''') and wm.role=''owner''))',
      t,t
    );
  end loop;
end $$;

revoke all on
  app.master_yw561_independent_connection_evidence_intake_events,
  app.master_yw561_acceptance_continuity_connection_recheck_events,
  app.master_yw561_verified_connection_transition_events,
  app.master_yw561_three_master_sync_closure_events
from public, ai_data_runtime;

grant select,insert on
  app.master_yw561_independent_connection_evidence_intake_events,
  app.master_yw561_acceptance_continuity_connection_recheck_events,
  app.master_yw561_verified_connection_transition_events,
  app.master_yw561_three_master_sync_closure_events
to ai_data_runtime;

revoke update,delete on
  app.master_yw561_independent_connection_evidence_intake_events,
  app.master_yw561_acceptance_continuity_connection_recheck_events,
  app.master_yw561_verified_connection_transition_events,
  app.master_yw561_three_master_sync_closure_events
from ai_data_runtime;
