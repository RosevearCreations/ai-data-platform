-- Build 369 — Source Refresh Evidence Intake, iCamp Manifest Re-Convergence
-- Confirmation, YW/iCamp Fresh Signed Health Admission & Three-Master Acceptance Recheck.
-- Evidence remains append-only and source-owned private keys are never stored.

create table if not exists app.master_source_refresh_evidence_events (
  evidence_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id in ('yw','icamp')),
  handoff_token text not null check (char_length(handoff_token) between 1 and 180),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  manifest_baseline_revision text,
  deployed_manifest_revision text,
  manifest_confirmation_state text not null check (
    manifest_confirmation_state in (
      'CONFIRMED_EXACT',
      'HOLD_DEPLOYED_CONFIRMATION_REQUIRED',
      'HOLD_STALE',
      'HOLD_UNVERIFIED'
    )
  ),
  tenant_boundary text not null check (tenant_boundary='platform_shell'),
  signer_state text not null check (
    signer_state in ('TRUSTED_SIGNER_ENROLLED','HOLD_UNENROLLED','HOLD_AMBIGUOUS')
  ),
  receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  receipt_state text not null check (
    receipt_state in (
      'VERIFIED_CURRENT',
      'HOLD_NOT_RECEIVED',
      'HOLD_STALE',
      'HOLD_REVISION_MISMATCH',
      'HOLD_NOT_ADMITTED'
    )
  ),
  durable_replay_state text not null check (
    durable_replay_state in ('VERIFIED','CODE_READY_RUNTIME_HOLD','HOLD')
  ),
  evidence_uri text not null check (
    evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
  ),
  evidence_digest text check (
    evidence_digest is null or evidence_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  sanitized_ack text not null check (
    char_length(sanitized_ack) between 1 and 4000
    and sanitized_ack !~* '(private[_ -]?key|secret|password|access[_ -]?token)[[:space:]]*='
  ),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  received_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_source_refresh_evidence_recent_idx
  on app.master_source_refresh_evidence_events(source_id,recorded_at desc);

create table if not exists app.master_three_master_acceptance_rechecks (
  acceptance_recheck_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id in ('yw','icamp')),
  source_evidence_event_id uuid references app.master_source_refresh_evidence_events(evidence_event_id) on delete restrict,
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  controller_base_revision text not null check (controller_base_revision ~ '^[a-f0-9]{40}$'),
  ai_hub_ack text not null,
  ai_hub_main text not null check (ai_hub_main ~ '^[a-f0-9]{40}$'),
  comms_ack text not null,
  comms_main text not null check (comms_main ~ '^[a-f0-9]{40}$'),
  master_gate_state text not null check (master_gate_state in ('OPEN','HOLD')),
  source_evidence_state text not null check (source_evidence_state in ('READY','HOLD')),
  signed_health_state text not null check (signed_health_state in ('VERIFIED_CURRENT','HOLD')),
  acceptance_state text not null check (
    acceptance_state in ('READY_FOR_OWNER_REVIEW','HOLD')
  ),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_three_master_acceptance_rechecks_source_idx
  on app.master_three_master_acceptance_rechecks(source_id,recorded_at desc);

alter table app.master_source_refresh_evidence_events enable row level security;
alter table app.master_source_refresh_evidence_events force row level security;
alter table app.master_three_master_acceptance_rechecks enable row level security;
alter table app.master_three_master_acceptance_rechecks force row level security;

drop policy if exists master_source_refresh_evidence_events_select
  on app.master_source_refresh_evidence_events;
create policy master_source_refresh_evidence_events_select
on app.master_source_refresh_evidence_events
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_source_refresh_evidence_events_insert
  on app.master_source_refresh_evidence_events;
create policy master_source_refresh_evidence_events_insert
on app.master_source_refresh_evidence_events
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner'
  )
);

drop policy if exists master_three_master_acceptance_rechecks_select
  on app.master_three_master_acceptance_rechecks;
create policy master_three_master_acceptance_rechecks_select
on app.master_three_master_acceptance_rechecks
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_three_master_acceptance_rechecks_insert
  on app.master_three_master_acceptance_rechecks;
create policy master_three_master_acceptance_rechecks_insert
on app.master_three_master_acceptance_rechecks
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner'
  )
);

revoke all on
  app.master_source_refresh_evidence_events,
  app.master_three_master_acceptance_rechecks
from public, ai_data_runtime;

grant select,insert on
  app.master_source_refresh_evidence_events,
  app.master_three_master_acceptance_rechecks
to ai_data_runtime;

revoke update,delete on
  app.master_source_refresh_evidence_events,
  app.master_three_master_acceptance_rechecks
from ai_data_runtime;
