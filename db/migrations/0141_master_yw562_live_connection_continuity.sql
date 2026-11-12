-- Build 377 — YW561 Live Trusted Connection Intake Execution,
-- Exact-Receipt Acceptance Revalidation, Three-Master Sync Activation
-- & Post-Connection Continuity Monitoring.
-- The active Yard Workers production line is YW562. YW561 evidence is historical
-- after the source revision transition and cannot carry forward automatically.
-- Append-only controller evidence only; never store source private keys,
-- receiver credentials, transport secrets, or raw signed payloads.

create table if not exists app.master_yw562_live_connection_intake_execution_events (
  execution_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  previous_source_revision text not null check (previous_source_revision ~ '^[a-f0-9]{40}$'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  registry_evidence_id uuid not null references app.master_shell_source_registry_evidence(evidence_id) on delete restrict,
  registry_record_version bigint not null check (registry_record_version > 0),
  exact_receipt_id uuid not null references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  owner_decision_id uuid not null references app.master_owner_decision_audit(decision_id) on delete restrict,
  connection_evidence_uri text not null check (char_length(connection_evidence_uri) between 1 and 512),
  execution_state text not null check (execution_state='EXECUTED_CURRENT'),
  executed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (previous_source_revision <> source_production_revision)
);

create unique index if not exists master_yw562_connection_execution_binding_unique_idx
  on app.master_yw562_live_connection_intake_execution_events(
    registry_evidence_id,exact_receipt_id
  );
create index if not exists master_yw562_connection_execution_recent_idx
  on app.master_yw562_live_connection_intake_execution_events(recorded_at desc);

create table if not exists app.master_yw562_exact_receipt_acceptance_revalidation_events (
  revalidation_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  exact_receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  owner_decision_id uuid references app.master_owner_decision_audit(decision_id) on delete restrict,
  receipt_state text not null check (
    receipt_state in (
      'ACTIVE_CURRENT',
      'HOLD_NO_CURRENT_RECEIPT',
      'HOLD_SIGNER_NOT_EXACT',
      'HOLD_RECEIPT_STALE',
      'HOLD_RECEIPT_NOT_ADMITTED',
      'HOLD_REPLAY_NOT_VERIFIED'
    )
  ),
  acceptance_state text not null check (
    acceptance_state in (
      'ACCEPTED_CURRENT',
      'REJECTED_CURRENT',
      'HOLD_RECEIPT_NOT_ACTIVE',
      'HOLD_EXPLICIT_ACCEPT_REQUIRED'
    )
  ),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_yw562_acceptance_revalidation_recent_idx
  on app.master_yw562_exact_receipt_acceptance_revalidation_events(recorded_at desc);

create table if not exists app.master_yw562_three_master_sync_activation_events (
  activation_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  connection_execution_event_id uuid not null references app.master_yw562_live_connection_intake_execution_events(execution_event_id) on delete restrict,
  exact_receipt_id uuid not null references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  master_runtime_recheck_id uuid not null references app.master_runtime_evidence_rechecks(recheck_id) on delete restrict,
  controller_revision text not null check (controller_revision ~ '^[a-f0-9]{40}$'),
  ai_hub_main text not null check (ai_hub_main ~ '^[a-f0-9]{40}$'),
  comms_main text not null check (comms_main ~ '^[a-f0-9]{40}$'),
  activation_state text not null check (activation_state='ACTIVE_SYNCED'),
  activated_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create unique index if not exists master_yw562_sync_activation_binding_unique_idx
  on app.master_yw562_three_master_sync_activation_events(
    connection_execution_event_id,master_runtime_recheck_id
  );
create index if not exists master_yw562_sync_activation_recent_idx
  on app.master_yw562_three_master_sync_activation_events(recorded_at desc);

create table if not exists app.master_yw562_post_connection_continuity_events (
  monitor_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  sync_activation_event_id uuid references app.master_yw562_three_master_sync_activation_events(activation_event_id) on delete restrict,
  registry_evidence_id uuid references app.master_shell_source_registry_evidence(evidence_id) on delete restrict,
  exact_receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  owner_decision_id uuid references app.master_owner_decision_audit(decision_id) on delete restrict,
  master_runtime_recheck_id uuid references app.master_runtime_evidence_rechecks(recheck_id) on delete restrict,
  connection_candidate_state text not null,
  receipt_state text not null,
  acceptance_state text not null,
  master_runtime_state text not null,
  continuity_state text not null check (
    continuity_state in (
      'STABLE_CONNECTED',
      'HOLD_NOT_ACTIVATED',
      'HOLD_CONNECTION_EVIDENCE',
      'HOLD_RECEIPT_HEALTH',
      'HOLD_OWNER_ACCEPTANCE',
      'HOLD_RECEIPT_CHANGED',
      'HOLD_MASTER_SYNC'
    )
  ),
  connected boolean not null,
  masters_synced boolean not null,
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    connected = (continuity_state='STABLE_CONNECTED')
    and masters_synced = (continuity_state='STABLE_CONNECTED')
  )
);

create index if not exists master_yw562_post_connection_continuity_recent_idx
  on app.master_yw562_post_connection_continuity_events(recorded_at desc);

alter table app.master_yw562_live_connection_intake_execution_events enable row level security;
alter table app.master_yw562_live_connection_intake_execution_events force row level security;
alter table app.master_yw562_exact_receipt_acceptance_revalidation_events enable row level security;
alter table app.master_yw562_exact_receipt_acceptance_revalidation_events force row level security;
alter table app.master_yw562_three_master_sync_activation_events enable row level security;
alter table app.master_yw562_three_master_sync_activation_events force row level security;
alter table app.master_yw562_post_connection_continuity_events enable row level security;
alter table app.master_yw562_post_connection_continuity_events force row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'master_yw562_live_connection_intake_execution_events',
    'master_yw562_exact_receipt_acceptance_revalidation_events',
    'master_yw562_three_master_sync_activation_events',
    'master_yw562_post_connection_continuity_events'
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
  app.master_yw562_live_connection_intake_execution_events,
  app.master_yw562_exact_receipt_acceptance_revalidation_events,
  app.master_yw562_three_master_sync_activation_events,
  app.master_yw562_post_connection_continuity_events
from public, ai_data_runtime;

grant select,insert on
  app.master_yw562_live_connection_intake_execution_events,
  app.master_yw562_exact_receipt_acceptance_revalidation_events,
  app.master_yw562_three_master_sync_activation_events,
  app.master_yw562_post_connection_continuity_events
to ai_data_runtime;

revoke update,delete on
  app.master_yw562_live_connection_intake_execution_events,
  app.master_yw562_exact_receipt_acceptance_revalidation_events,
  app.master_yw562_three_master_sync_activation_events,
  app.master_yw562_post_connection_continuity_events
from ai_data_runtime;
