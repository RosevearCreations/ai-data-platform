-- Build 374 — YW561 Trusted Source-Health Signer Admission,
-- Current Receipt/Replay Evidence Activation, Three-Master Runtime Evidence Correlation
-- & Explicit Owner Acceptance Gate.
-- Append-only controller evidence; never stores source private keys or receiver secrets.

create table if not exists app.master_yw561_trusted_signer_admission_events (
  signer_admission_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  signer_registry_event_id uuid references app.master_source_signer_registry_events(event_id) on delete restrict,
  enrollment_intake_event_id uuid references app.master_source_signer_enrollment_intake_events(event_id) on delete restrict,
  custody_evidence_event_id uuid references app.master_yw561_custody_evidence_intake_events(evidence_event_id) on delete restrict,
  key_id text check (key_id is null or char_length(key_id) between 1 and 160),
  public_key_spki_sha256 text check (
    public_key_spki_sha256 is null or public_key_spki_sha256 ~ '^sha256:[a-f0-9]{64}$'
  ),
  admission_state text not null check (admission_state in ('ADMITTED','HOLD')),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_yw561_trusted_signer_admission_recent_idx
  on app.master_yw561_trusted_signer_admission_events(recorded_at desc);

create table if not exists app.master_yw561_current_receipt_replay_activation_events (
  activation_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  signer_admission_event_id uuid not null references app.master_yw561_trusted_signer_admission_events(signer_admission_event_id) on delete restrict,
  receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  health_admission_event_id uuid references app.master_source_health_admission_events(admission_event_id) on delete restrict,
  replay_correlation_event_id uuid references app.master_yw561_replay_correlation_events(replay_event_id) on delete restrict,
  receipt_activation_state text not null check (receipt_activation_state in ('ACTIVE_CURRENT','HOLD')),
  replay_activation_state text not null check (replay_activation_state in ('ACTIVE_CURRENT','HOLD')),
  activation_state text not null check (activation_state in ('ACTIVE','HOLD')),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_yw561_current_receipt_replay_activation_recent_idx
  on app.master_yw561_current_receipt_replay_activation_events(recorded_at desc);

create table if not exists app.master_yw561_three_master_runtime_correlation_events (
  correlation_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  activation_event_id uuid not null references app.master_yw561_current_receipt_replay_activation_events(activation_event_id) on delete restrict,
  controller_base_revision text not null check (controller_base_revision ~ '^[a-f0-9]{40}$'),
  ai_hub_main text not null check (ai_hub_main ~ '^[a-f0-9]{40}$'),
  comms_main text not null check (comms_main ~ '^[a-f0-9]{40}$'),
  master_gate_state text not null check (master_gate_state in ('OPEN','HOLD')),
  correlation_state text not null check (correlation_state in ('CORRELATED_OPEN','HOLD')),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_yw561_three_master_runtime_correlation_recent_idx
  on app.master_yw561_three_master_runtime_correlation_events(recorded_at desc);

create table if not exists app.master_yw561_owner_acceptance_gate_events (
  owner_gate_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  activation_event_id uuid not null references app.master_yw561_current_receipt_replay_activation_events(activation_event_id) on delete restrict,
  master_correlation_event_id uuid not null references app.master_yw561_three_master_runtime_correlation_events(correlation_event_id) on delete restrict,
  current_receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  latest_owner_decision_id uuid references app.master_owner_decision_audit(decision_id) on delete restrict,
  gate_state text not null check (
    gate_state in ('HOLD','READY_FOR_EXPLICIT_OWNER_ACCEPTANCE','ACCEPTED','REJECTED')
  ),
  connection_state text not null check (connection_state='NOT_INFERRED'),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_yw561_owner_acceptance_gate_recent_idx
  on app.master_yw561_owner_acceptance_gate_events(recorded_at desc);

alter table app.master_yw561_trusted_signer_admission_events enable row level security;
alter table app.master_yw561_trusted_signer_admission_events force row level security;
alter table app.master_yw561_current_receipt_replay_activation_events enable row level security;
alter table app.master_yw561_current_receipt_replay_activation_events force row level security;
alter table app.master_yw561_three_master_runtime_correlation_events enable row level security;
alter table app.master_yw561_three_master_runtime_correlation_events force row level security;
alter table app.master_yw561_owner_acceptance_gate_events enable row level security;
alter table app.master_yw561_owner_acceptance_gate_events force row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'master_yw561_trusted_signer_admission_events',
    'master_yw561_current_receipt_replay_activation_events',
    'master_yw561_three_master_runtime_correlation_events',
    'master_yw561_owner_acceptance_gate_events'
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
  app.master_yw561_trusted_signer_admission_events,
  app.master_yw561_current_receipt_replay_activation_events,
  app.master_yw561_three_master_runtime_correlation_events,
  app.master_yw561_owner_acceptance_gate_events
from public, ai_data_runtime;

grant select,insert on
  app.master_yw561_trusted_signer_admission_events,
  app.master_yw561_current_receipt_replay_activation_events,
  app.master_yw561_three_master_runtime_correlation_events,
  app.master_yw561_owner_acceptance_gate_events
to ai_data_runtime;

revoke update,delete on
  app.master_yw561_trusted_signer_admission_events,
  app.master_yw561_current_receipt_replay_activation_events,
  app.master_yw561_three_master_runtime_correlation_events,
  app.master_yw561_owner_acceptance_gate_events
from ai_data_runtime;
