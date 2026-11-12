-- Build 378 — YW562 Runtime Prerequisite Evidence Intake,
-- Fresh Source-Bound Receipt Admission, QL-422 Original-Host Witness /
-- Three-Master Ledger Correlation & Protected Activation Readiness.
-- Evidence remains append-only and fail-closed. This migration does not
-- install Yard Workers schema, activate a receiver, connect a source, or store
-- private keys / transport credentials / raw source envelopes.

create table if not exists app.master_yw562_runtime_prerequisite_evidence_intakes (
  evidence_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  key_id text not null check (char_length(key_id) between 1 and 160),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  required_tables jsonb not null check (
    jsonb_typeof(required_tables)='array' and octet_length(required_tables::text)<=4096
  ),
  schema_chain_verified boolean not null,
  rls_verified boolean not null,
  owner_helper_verified boolean not null,
  protected_summary_verified boolean not null,
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  report_digest text not null check (report_digest ~ '^[a-f0-9]{64}$'),
  signature_digest text not null check (signature_digest ~ '^[a-f0-9]{64}$'),
  nonce text not null check (char_length(nonce) between 16 and 160),
  checked_at timestamptz not null,
  verification_state text not null check (verification_state='VERIFIED_CURRENT'),
  recorded_at timestamptz not null default now()
);

create unique index if not exists master_yw562_runtime_prerequisite_nonce_unique_idx
  on app.master_yw562_runtime_prerequisite_evidence_intakes(nonce);
create index if not exists master_yw562_runtime_prerequisite_recent_idx
  on app.master_yw562_runtime_prerequisite_evidence_intakes(recorded_at desc);

create table if not exists app.master_yw562_fresh_source_receipt_admission_events (
  admission_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  prerequisite_evidence_id uuid not null references app.master_yw562_runtime_prerequisite_evidence_intakes(evidence_id) on delete restrict,
  receipt_id uuid not null references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  receipt_sha256 text not null check (receipt_sha256 ~ '^[a-f0-9]{64}$'),
  source_revision text not null check (source_revision ~ '^[a-f0-9]{40}$'),
  admission_state text not null check (admission_state='ADMITTED_CURRENT'),
  admitted_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create unique index if not exists master_yw562_fresh_receipt_admission_binding_unique_idx
  on app.master_yw562_fresh_source_receipt_admission_events(
    prerequisite_evidence_id,receipt_id
  );
create index if not exists master_yw562_fresh_receipt_admission_recent_idx
  on app.master_yw562_fresh_source_receipt_admission_events(recorded_at desc);

create table if not exists app.master_ql422_original_host_three_master_correlation_events (
  correlation_event_id uuid primary key,
  actor_user_id text references auth."user"(id) on delete restrict,
  evidence_authority text not null check (
    evidence_authority in ('owner-reference-only','protected-runtime')
  ),
  controller_revision text not null check (controller_revision ~ '^[a-f0-9]{40}$'),
  yw_source_revision text not null check (yw_source_revision ~ '^[a-f0-9]{40}$'),
  ai_hub_main text not null check (ai_hub_main ~ '^[a-f0-9]{40}$'),
  comms_main text not null check (comms_main ~ '^[a-f0-9]{40}$'),
  original_host_id text not null check (char_length(original_host_id) between 1 and 128),
  source_episode_id text not null check (char_length(source_episode_id) between 8 and 160),
  source_receipt_digest text not null check (source_receipt_digest ~ '^[a-f0-9]{64}$'),
  receiver_ack_digest text not null check (receiver_ack_digest ~ '^[a-f0-9]{64}$'),
  closure_digest text not null check (closure_digest ~ '^[a-f0-9]{64}$'),
  handoff_receipt_id text not null check (char_length(handoff_receipt_id) between 8 and 160),
  witness_digest text not null check (witness_digest ~ '^[a-f0-9]{64}$'),
  master_receipts jsonb not null check (
    jsonb_typeof(master_receipts)='array' and octet_length(master_receipts::text)<=16384
  ),
  terminal_ledger_digest text not null check (terminal_ledger_digest ~ '^[a-f0-9]{64}$'),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  correlation_state text not null check (
    correlation_state in ('CANDIDATE_HOLD','VERIFIED_CORRELATED')
  ),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    (evidence_authority='owner-reference-only'
      and actor_user_id is not null
      and correlation_state='CANDIDATE_HOLD')
    or
    (evidence_authority='protected-runtime'
      and actor_user_id is null
      and correlation_state='VERIFIED_CORRELATED')
  )
);

create index if not exists master_ql422_original_host_three_master_recent_idx
  on app.master_ql422_original_host_three_master_correlation_events(recorded_at desc);

create table if not exists app.master_build378_protected_activation_readiness_events (
  readiness_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_revision text not null check (source_revision ~ '^[a-f0-9]{40}$'),
  prerequisite_evidence_id uuid references app.master_yw562_runtime_prerequisite_evidence_intakes(evidence_id) on delete restrict,
  fresh_receipt_admission_event_id uuid references app.master_yw562_fresh_source_receipt_admission_events(admission_event_id) on delete restrict,
  exact_receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  owner_decision_id uuid references app.master_owner_decision_audit(decision_id) on delete restrict,
  ql422_correlation_event_id uuid references app.master_ql422_original_host_three_master_correlation_events(correlation_event_id) on delete restrict,
  runtime_prerequisite_state text not null,
  source_receipt_state text not null,
  fresh_receipt_admission_state text not null,
  owner_acceptance_state text not null,
  ql422_correlation_state text not null,
  readiness_state text not null check (
    readiness_state in (
      'READY_FOR_PROTECTED_ACTIVATION',
      'HOLD_RUNTIME_PREREQUISITES',
      'HOLD_FRESH_RECEIPT_ADMISSION',
      'HOLD_MASTER_OWNER_ACCEPTANCE',
      'HOLD_QL422_CORRELATION'
    )
  ),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_build378_protected_activation_readiness_recent_idx
  on app.master_build378_protected_activation_readiness_events(recorded_at desc);

alter table app.master_yw562_runtime_prerequisite_evidence_intakes enable row level security;
alter table app.master_yw562_runtime_prerequisite_evidence_intakes force row level security;
alter table app.master_yw562_fresh_source_receipt_admission_events enable row level security;
alter table app.master_yw562_fresh_source_receipt_admission_events force row level security;
alter table app.master_ql422_original_host_three_master_correlation_events enable row level security;
alter table app.master_ql422_original_host_three_master_correlation_events force row level security;
alter table app.master_build378_protected_activation_readiness_events enable row level security;
alter table app.master_build378_protected_activation_readiness_events force row level security;

drop policy if exists master_yw562_runtime_prerequisite_evidence_intakes_select
  on app.master_yw562_runtime_prerequisite_evidence_intakes;
create policy master_yw562_runtime_prerequisite_evidence_intakes_select
  on app.master_yw562_runtime_prerequisite_evidence_intakes
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );
drop policy if exists master_yw562_runtime_prerequisite_evidence_intakes_insert
  on app.master_yw562_runtime_prerequisite_evidence_intakes;
create policy master_yw562_runtime_prerequisite_evidence_intakes_insert
  on app.master_yw562_runtime_prerequisite_evidence_intakes
  for insert to ai_data_runtime with check (
    actor_user_id=nullif(current_setting('app.user_id',true),'')
    and exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role='owner'
    )
  );

drop policy if exists master_yw562_fresh_source_receipt_admission_events_select
  on app.master_yw562_fresh_source_receipt_admission_events;
create policy master_yw562_fresh_source_receipt_admission_events_select
  on app.master_yw562_fresh_source_receipt_admission_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );
drop policy if exists master_yw562_fresh_source_receipt_admission_events_insert
  on app.master_yw562_fresh_source_receipt_admission_events;
create policy master_yw562_fresh_source_receipt_admission_events_insert
  on app.master_yw562_fresh_source_receipt_admission_events
  for insert to ai_data_runtime with check (
    actor_user_id=nullif(current_setting('app.user_id',true),'')
    and exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role='owner'
    )
  );

drop policy if exists master_ql422_original_host_three_master_correlation_events_select
  on app.master_ql422_original_host_three_master_correlation_events;
create policy master_ql422_original_host_three_master_correlation_events_select
  on app.master_ql422_original_host_three_master_correlation_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );
drop policy if exists master_ql422_original_host_three_master_correlation_events_insert
  on app.master_ql422_original_host_three_master_correlation_events;
create policy master_ql422_original_host_three_master_correlation_events_insert
  on app.master_ql422_original_host_three_master_correlation_events
  for insert to ai_data_runtime with check (
    evidence_authority='owner-reference-only'
    and correlation_state='CANDIDATE_HOLD'
    and actor_user_id=nullif(current_setting('app.user_id',true),'')
    and exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role='owner'
    )
  );

drop policy if exists master_build378_protected_activation_readiness_events_select
  on app.master_build378_protected_activation_readiness_events;
create policy master_build378_protected_activation_readiness_events_select
  on app.master_build378_protected_activation_readiness_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );
drop policy if exists master_build378_protected_activation_readiness_events_insert
  on app.master_build378_protected_activation_readiness_events;
create policy master_build378_protected_activation_readiness_events_insert
  on app.master_build378_protected_activation_readiness_events
  for insert to ai_data_runtime with check (
    actor_user_id=nullif(current_setting('app.user_id',true),'')
    and exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role='owner'
    )
  );

revoke all on
  app.master_yw562_runtime_prerequisite_evidence_intakes,
  app.master_yw562_fresh_source_receipt_admission_events,
  app.master_ql422_original_host_three_master_correlation_events,
  app.master_build378_protected_activation_readiness_events
from public, ai_data_runtime;

grant select,insert on
  app.master_yw562_runtime_prerequisite_evidence_intakes,
  app.master_yw562_fresh_source_receipt_admission_events,
  app.master_ql422_original_host_three_master_correlation_events,
  app.master_build378_protected_activation_readiness_events
to ai_data_runtime;

revoke update,delete on
  app.master_yw562_runtime_prerequisite_evidence_intakes,
  app.master_yw562_fresh_source_receipt_admission_events,
  app.master_ql422_original_host_three_master_correlation_events,
  app.master_build378_protected_activation_readiness_events
from ai_data_runtime;
