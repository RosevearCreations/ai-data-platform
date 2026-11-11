-- Build 372 — Yard Workers Independent Signer Custody Evidence Intake,
-- Exact YW561 Signed Health Receipt Admission, Durable Replay Correlation &
-- Three-Master Runtime Closure Recheck.
-- Source private keys and provider receiver secrets are never accepted or stored.

create table if not exists app.master_yw561_custody_evidence_intake_events (
  evidence_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  key_id text not null check (char_length(key_id) between 1 and 160),
  public_key_spki_sha256 text not null check (public_key_spki_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  pin_evidence_uri text not null check (
    pin_evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
  ),
  custody_evidence_uri text not null check (
    custody_evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
  ),
  witness_evidence_uri text not null check (
    witness_evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
  ),
  registry_event_id uuid references app.master_source_signer_registry_events(event_id) on delete restrict,
  enrollment_event_id uuid references app.master_source_signer_enrollment_intake_events(event_id) on delete restrict,
  custody_state text not null check (
    custody_state in (
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

create index if not exists master_yw561_custody_evidence_recent_idx
  on app.master_yw561_custody_evidence_intake_events(recorded_at desc);

create table if not exists app.master_yw561_replay_correlation_events (
  replay_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  manifest_revision text not null check (manifest_revision ~ '^[a-f0-9]{40}$'),
  receipt_id uuid not null references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  receipt_sha256 text not null check (receipt_sha256 ~ '^[a-f0-9]{64}$'),
  nonce_sha256 text not null check (nonce_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  replay_evidence_uri text not null check (
    replay_evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
  ),
  replay_evidence_digest text not null check (
    replay_evidence_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  correlation_state text not null check (
    correlation_state in (
      'VERIFIED_CORRELATED',
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
  recorded_at timestamptz not null default now(),
  unique (receipt_id, replay_evidence_digest)
);

create index if not exists master_yw561_replay_correlation_recent_idx
  on app.master_yw561_replay_correlation_events(recorded_at desc);

create table if not exists app.master_yw561_runtime_closure_rechecks (
  closure_recheck_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  deployment_id text not null check (char_length(deployment_id) between 8 and 160),
  custody_evidence_event_id uuid references app.master_yw561_custody_evidence_intake_events(evidence_event_id) on delete restrict,
  receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  replay_event_id uuid references app.master_yw561_replay_correlation_events(replay_event_id) on delete restrict,
  controller_base_revision text not null check (controller_base_revision ~ '^[a-f0-9]{40}$'),
  ai_hub_main text not null check (ai_hub_main ~ '^[a-f0-9]{40}$'),
  comms_main text not null check (comms_main ~ '^[a-f0-9]{40}$'),
  identity_state text not null check (identity_state in ('VERIFIED_EXACT','HOLD')),
  signer_state text not null check (
    signer_state in ('VERIFIED_CORRELATED','HOLD_UNENROLLED','HOLD_CUSTODY_EVIDENCE','HOLD_CUSTODY_MISMATCH','HOLD_AMBIGUOUS')
  ),
  receipt_state text not null check (
    receipt_state in ('VERIFIED_CURRENT','HOLD_NOT_RECEIVED','HOLD_STALE','HOLD_REVISION_MISMATCH','HOLD_NOT_ADMITTED','HOLD_SIGNER_CUSTODY')
  ),
  replay_state text not null check (
    replay_state in ('VERIFIED_CORRELATED','HOLD_NOT_RECEIVED','HOLD_RECEIPT_NOT_CURRENT','HOLD_RECEIPT_NOT_ADMITTED','HOLD_SIGNER_CUSTODY','HOLD_MISMATCH')
  ),
  master_gate_state text not null check (master_gate_state in ('OPEN','HOLD')),
  closure_state text not null check (
    closure_state in ('READY_FOR_OWNER_DECISION','SOURCE_EVIDENCE_READY_MASTER_HOLD','YW561_CURRENT_EVIDENCE_HOLD','HOLD')
  ),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_yw561_runtime_closure_recent_idx
  on app.master_yw561_runtime_closure_rechecks(recorded_at desc);

alter table app.master_yw561_custody_evidence_intake_events enable row level security;
alter table app.master_yw561_custody_evidence_intake_events force row level security;
alter table app.master_yw561_replay_correlation_events enable row level security;
alter table app.master_yw561_replay_correlation_events force row level security;
alter table app.master_yw561_runtime_closure_rechecks enable row level security;
alter table app.master_yw561_runtime_closure_rechecks force row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'master_yw561_custody_evidence_intake_events',
    'master_yw561_replay_correlation_events',
    'master_yw561_runtime_closure_rechecks'
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
  app.master_yw561_custody_evidence_intake_events,
  app.master_yw561_replay_correlation_events,
  app.master_yw561_runtime_closure_rechecks
from public, ai_data_runtime;

grant select,insert on
  app.master_yw561_custody_evidence_intake_events,
  app.master_yw561_replay_correlation_events,
  app.master_yw561_runtime_closure_rechecks
to ai_data_runtime;

revoke update,delete on
  app.master_yw561_custody_evidence_intake_events,
  app.master_yw561_replay_correlation_events,
  app.master_yw561_runtime_closure_rechecks
from ai_data_runtime;
