-- Build 371 — Yard Workers Product-Shell Identity Reconciliation,
-- Independent Source Signer Enrollment Closure, Fresh Signed Health Receipt Admission
-- & Three-Master Runtime Discrepancy Resolution.

create table if not exists app.master_yw_source_resolution_events (
  resolution_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id='yw'),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  deployment_id text not null check (char_length(deployment_id) between 8 and 160),
  deployment_git_revision text not null check (deployment_git_revision ~ '^[a-f0-9]{40}$'),
  deployed_manifest_revision text not null check (deployed_manifest_revision ~ '^[a-f0-9]{40}$'),
  source_role text not null check (source_role='platform_shell'),
  tenant_boundary text not null check (tenant_boundary='platform_shell'),
  identity_state text not null check (identity_state in ('VERIFIED_EXACT','HOLD')),
  signer_state text not null check (
    signer_state in ('VERIFIED_CORRELATED','HOLD_UNENROLLED','HOLD_CUSTODY_EVIDENCE','HOLD_CUSTODY_MISMATCH','HOLD_AMBIGUOUS')
  ),
  receipt_state text not null check (
    receipt_state in ('VERIFIED_CURRENT','HOLD_NOT_RECEIVED','HOLD_STALE','HOLD_REVISION_MISMATCH','HOLD_NOT_ADMITTED','HOLD_SIGNER_CUSTODY')
  ),
  three_master_state text not null check (three_master_state in ('OPEN','HOLD')),
  resolution_state text not null check (
    resolution_state in ('READY_FOR_OWNER_DECISION','SOURCE_IDENTITY_RESOLVED_RUNTIME_HOLD','HOLD')
  ),
  manifest_observation_id uuid references app.master_deployed_manifest_observation_events(observation_id) on delete restrict,
  custody_correlation_id uuid references app.master_source_custody_correlation_events(correlation_id) on delete restrict,
  receipt_closure_id uuid references app.master_fresh_receipt_admission_closure_events(closure_id) on delete restrict,
  runtime_decision_recheck_id uuid references app.master_three_master_runtime_decision_rechecks(decision_recheck_id) on delete restrict,
  evidence_uri text not null check (
    evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
  ),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_yw_source_resolution_recent_idx
  on app.master_yw_source_resolution_events(recorded_at desc);

alter table app.master_yw_source_resolution_events enable row level security;
alter table app.master_yw_source_resolution_events force row level security;

drop policy if exists master_yw_source_resolution_events_select
  on app.master_yw_source_resolution_events;
create policy master_yw_source_resolution_events_select
on app.master_yw_source_resolution_events
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_yw_source_resolution_events_insert
  on app.master_yw_source_resolution_events;
create policy master_yw_source_resolution_events_insert
on app.master_yw_source_resolution_events
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner'
  )
);

revoke all on app.master_yw_source_resolution_events from public, ai_data_runtime;
grant select,insert on app.master_yw_source_resolution_events to ai_data_runtime;
revoke update,delete on app.master_yw_source_resolution_events from ai_data_runtime;
