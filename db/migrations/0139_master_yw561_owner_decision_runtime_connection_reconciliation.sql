-- Build 375 — YW561 Explicit Owner Acceptance Decision Execution,
-- Exact-Receipt Acceptance Continuity, Three-Master Runtime Gate Transition
-- & Connection-State Reconciliation.
-- Append-only controller evidence. No source private keys, receiver credentials,
-- or customer payloads are stored.

create table if not exists app.master_yw561_owner_decision_execution_events (
  decision_execution_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  exact_receipt_id uuid not null references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  legacy_owner_decision_id uuid not null references app.master_owner_decision_audit(decision_id) on delete restrict,
  decision text not null check (decision in ('ACCEPT','REJECT')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 500),
  detail text not null check (char_length(detail) between 1 and 1800),
  decided_at timestamptz not null,
  source_health_activation_state text not null check (source_health_activation_state in ('ACTIVE','HOLD')),
  master_gate_state text not null check (master_gate_state in ('OPEN','HOLD')),
  execution_state text not null check (execution_state='EXECUTED'),
  recorded_at timestamptz not null default now()
);

create index if not exists master_yw561_owner_decision_execution_recent_idx
  on app.master_yw561_owner_decision_execution_events(recorded_at desc);

create table if not exists app.master_yw561_acceptance_continuity_events (
  continuity_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  exact_receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  owner_decision_id uuid references app.master_owner_decision_audit(decision_id) on delete restrict,
  owner_decision text not null check (owner_decision in ('PENDING','ACCEPT','REJECT')),
  source_health_activation_state text not null check (source_health_activation_state in ('ACTIVE','HOLD')),
  master_gate_state text not null check (master_gate_state in ('OPEN','HOLD')),
  continuity_state text not null check (
    continuity_state in (
      'ACTIVE',
      'REJECTED',
      'HOLD_NO_CURRENT_RECEIPT',
      'HOLD_SOURCE_HEALTH',
      'HOLD_MASTER_GATE',
      'HOLD_RECEIPT_CHANGED',
      'HOLD_NO_ACCEPT'
    )
  ),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_yw561_acceptance_continuity_recent_idx
  on app.master_yw561_acceptance_continuity_events(recorded_at desc);

create table if not exists app.master_yw561_runtime_gate_transition_events (
  runtime_transition_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  controller_base_revision text not null check (controller_base_revision ~ '^[a-f0-9]{40}$'),
  ai_hub_main text not null check (ai_hub_main ~ '^[a-f0-9]{40}$'),
  comms_main text not null check (comms_main ~ '^[a-f0-9]{40}$'),
  previous_gate_state text check (previous_gate_state is null or previous_gate_state in ('OPEN','HOLD')),
  current_gate_state text not null check (current_gate_state in ('OPEN','HOLD')),
  transition_state text not null check (
    transition_state in (
      'INITIAL_OPEN','INITIAL_HOLD',
      'HOLD_TO_OPEN','OPEN_TO_HOLD',
      'UNCHANGED_OPEN','UNCHANGED_HOLD'
    )
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_yw561_runtime_gate_transition_recent_idx
  on app.master_yw561_runtime_gate_transition_events(recorded_at desc);

create table if not exists app.master_yw561_connection_reconciliation_events (
  connection_reconciliation_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  continuity_event_id uuid not null references app.master_yw561_acceptance_continuity_events(continuity_event_id) on delete restrict,
  runtime_transition_event_id uuid not null references app.master_yw561_runtime_gate_transition_events(runtime_transition_event_id) on delete restrict,
  observed_source_connection_state text not null check (char_length(observed_source_connection_state) between 1 and 160),
  independent_connection_evidence_verified boolean not null default false,
  connection_evidence_uri text check (
    connection_evidence_uri is null or char_length(connection_evidence_uri) between 1 and 500
  ),
  reconciled_connection_state text not null check (
    reconciled_connection_state in (
      'DISCONNECTED_HOLD',
      'READY_FOR_VERIFIED_CONNECTION',
      'CONNECTED_VERIFIED'
    )
  ),
  connected boolean not null,
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (connected = (reconciled_connection_state='CONNECTED_VERIFIED'))
);

create index if not exists master_yw561_connection_reconciliation_recent_idx
  on app.master_yw561_connection_reconciliation_events(recorded_at desc);

alter table app.master_yw561_owner_decision_execution_events enable row level security;
alter table app.master_yw561_owner_decision_execution_events force row level security;
alter table app.master_yw561_acceptance_continuity_events enable row level security;
alter table app.master_yw561_acceptance_continuity_events force row level security;
alter table app.master_yw561_runtime_gate_transition_events enable row level security;
alter table app.master_yw561_runtime_gate_transition_events force row level security;
alter table app.master_yw561_connection_reconciliation_events enable row level security;
alter table app.master_yw561_connection_reconciliation_events force row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'master_yw561_owner_decision_execution_events',
    'master_yw561_acceptance_continuity_events',
    'master_yw561_runtime_gate_transition_events',
    'master_yw561_connection_reconciliation_events'
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
  app.master_yw561_owner_decision_execution_events,
  app.master_yw561_acceptance_continuity_events,
  app.master_yw561_runtime_gate_transition_events,
  app.master_yw561_connection_reconciliation_events
from public, ai_data_runtime;

grant select,insert on
  app.master_yw561_owner_decision_execution_events,
  app.master_yw561_acceptance_continuity_events,
  app.master_yw561_runtime_gate_transition_events,
  app.master_yw561_connection_reconciliation_events
to ai_data_runtime;

revoke update,delete on
  app.master_yw561_owner_decision_execution_events,
  app.master_yw561_acceptance_continuity_events,
  app.master_yw561_runtime_gate_transition_events,
  app.master_yw561_connection_reconciliation_events
from ai_data_runtime;
