-- Build 373 — YW561 Live Source-Health Signer Enrollment Correlation,
-- Exact Signed HEALTHY Receipt Closure, Durable Replay Acceptance &
-- Three-Master Owner Decision Recheck.
-- Recheck-only controller evidence. No private keys or source secrets are stored.

create table if not exists app.master_yw561_live_signer_correlation_events (
  correlation_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  deployed_manifest_revision text not null check (deployed_manifest_revision ~ '^[a-f0-9]{40}$'),
  live_manifest_signature_state text not null check (char_length(live_manifest_signature_state) between 1 and 160),
  signer_registry_event_id uuid references app.master_source_signer_registry_events(event_id) on delete restrict,
  enrollment_intake_event_id uuid references app.master_source_signer_enrollment_intake_events(event_id) on delete restrict,
  custody_evidence_event_id uuid references app.master_yw561_custody_evidence_intake_events(evidence_event_id) on delete restrict,
  key_id text check (key_id is null or char_length(key_id) between 1 and 160),
  public_key_spki_sha256 text check (
    public_key_spki_sha256 is null or public_key_spki_sha256 ~ '^sha256:[a-f0-9]{64}$'
  ),
  correlation_state text not null check (
    correlation_state in (
      'VERIFIED_CORRELATED',
      'HOLD_UNENROLLED',
      'HOLD_CUSTODY_EVIDENCE',
      'HOLD_CUSTODY_MISMATCH',
      'HOLD_AMBIGUOUS'
    )
  ),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_yw561_live_signer_correlation_recent_idx
  on app.master_yw561_live_signer_correlation_events(recorded_at desc);

create table if not exists app.master_yw561_exact_health_receipt_closure_events (
  receipt_closure_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  manifest_revision text not null check (manifest_revision ~ '^[a-f0-9]{40}$'),
  signer_correlation_event_id uuid references app.master_yw561_live_signer_correlation_events(correlation_event_id) on delete restrict,
  receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  admission_event_id uuid references app.master_source_health_admission_events(admission_event_id) on delete restrict,
  receipt_state text not null check (
    receipt_state in (
      'VERIFIED_CURRENT',
      'HOLD_NOT_RECEIVED',
      'HOLD_STALE',
      'HOLD_REVISION_MISMATCH',
      'HOLD_NOT_ADMITTED',
      'HOLD_SIGNER_CUSTODY'
    )
  ),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_yw561_exact_health_receipt_closure_recent_idx
  on app.master_yw561_exact_health_receipt_closure_events(recorded_at desc);

create table if not exists app.master_yw561_durable_replay_acceptance_events (
  replay_acceptance_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  receipt_closure_event_id uuid references app.master_yw561_exact_health_receipt_closure_events(receipt_closure_event_id) on delete restrict,
  replay_correlation_event_id uuid references app.master_yw561_replay_correlation_events(replay_event_id) on delete restrict,
  replay_state text not null check (
    replay_state in (
      'ACCEPTED',
      'HOLD_NOT_RECEIVED',
      'HOLD_RECEIPT_NOT_CURRENT',
      'HOLD_RECEIPT_NOT_ADMITTED',
      'HOLD_SIGNER_CUSTODY',
      'HOLD_MISMATCH'
    )
  ),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_yw561_durable_replay_acceptance_recent_idx
  on app.master_yw561_durable_replay_acceptance_events(recorded_at desc);

create table if not exists app.master_yw561_three_master_owner_decision_rechecks (
  owner_recheck_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  signer_correlation_event_id uuid references app.master_yw561_live_signer_correlation_events(correlation_event_id) on delete restrict,
  receipt_closure_event_id uuid references app.master_yw561_exact_health_receipt_closure_events(receipt_closure_event_id) on delete restrict,
  replay_acceptance_event_id uuid references app.master_yw561_durable_replay_acceptance_events(replay_acceptance_event_id) on delete restrict,
  latest_owner_decision_id uuid references app.master_owner_decision_audit(decision_id) on delete restrict,
  controller_base_revision text not null check (controller_base_revision ~ '^[a-f0-9]{40}$'),
  ai_hub_main text not null check (ai_hub_main ~ '^[a-f0-9]{40}$'),
  comms_main text not null check (comms_main ~ '^[a-f0-9]{40}$'),
  source_evidence_state text not null check (source_evidence_state in ('READY','HOLD')),
  master_gate_state text not null check (master_gate_state in ('OPEN','HOLD')),
  owner_decision_state text not null check (
    owner_decision_state in ('HOLD','READY_FOR_OWNER_DECISION','ACCEPTED','REJECTED')
  ),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_yw561_three_master_owner_decision_recent_idx
  on app.master_yw561_three_master_owner_decision_rechecks(recorded_at desc);

alter table app.master_yw561_live_signer_correlation_events enable row level security;
alter table app.master_yw561_live_signer_correlation_events force row level security;
alter table app.master_yw561_exact_health_receipt_closure_events enable row level security;
alter table app.master_yw561_exact_health_receipt_closure_events force row level security;
alter table app.master_yw561_durable_replay_acceptance_events enable row level security;
alter table app.master_yw561_durable_replay_acceptance_events force row level security;
alter table app.master_yw561_three_master_owner_decision_rechecks enable row level security;
alter table app.master_yw561_three_master_owner_decision_rechecks force row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'master_yw561_live_signer_correlation_events',
    'master_yw561_exact_health_receipt_closure_events',
    'master_yw561_durable_replay_acceptance_events',
    'master_yw561_three_master_owner_decision_rechecks'
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
  app.master_yw561_live_signer_correlation_events,
  app.master_yw561_exact_health_receipt_closure_events,
  app.master_yw561_durable_replay_acceptance_events,
  app.master_yw561_three_master_owner_decision_rechecks
from public, ai_data_runtime;

grant select,insert on
  app.master_yw561_live_signer_correlation_events,
  app.master_yw561_exact_health_receipt_closure_events,
  app.master_yw561_durable_replay_acceptance_events,
  app.master_yw561_three_master_owner_decision_rechecks
to ai_data_runtime;

revoke update,delete on
  app.master_yw561_live_signer_correlation_events,
  app.master_yw561_exact_health_receipt_closure_events,
  app.master_yw561_durable_replay_acceptance_events,
  app.master_yw561_three_master_owner_decision_rechecks
from ai_data_runtime;
