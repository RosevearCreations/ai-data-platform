-- Build 382 — Protected Runtime Renewal Drift Detection,
-- Automatic Fail-Closed Recovery Validation &
-- Three-Master CONNECTED Continuity Audit.

create table if not exists app.master_build382_runtime_continuity_audits (
  audit_event_id uuid primary key,
  build381_renewal_event_id uuid null
    references app.master_build381_receiver_health_renewal_events(renewal_event_id) on delete restrict,
  build381_rollback_event_id uuid null
    references app.master_build381_fail_closed_rollback_events(rollback_event_id) on delete restrict,
  controller_revision text not null check (controller_revision ~ '^[a-f0-9]{40}$'),
  source_revision text not null check (source_revision ~ '^[a-f0-9]{40}$'),
  ai_hub_main text not null check (ai_hub_main ~ '^[a-f0-9]{40}$'),
  comms_main text not null check (comms_main ~ '^[a-f0-9]{40}$'),
  renewal_drift_state text not null check (
    renewal_drift_state in ('CURRENT','DRIFT_DETECTED')
  ),
  drift_reason text not null check (
    drift_reason in (
      'NONE',
      'BUILD381_NOT_CONNECTED',
      'RENEWAL_MISSING',
      'RENEWAL_EXPIRED',
      'RUNTIME_REVISION_DRIFT',
      'THREE_MASTER_RECEIPT_DRIFT',
      'ROLLBACK_PRESENT'
    )
  ),
  fail_closed_recovery_validation_state text not null check (
    fail_closed_recovery_validation_state in (
      'NOT_REQUIRED',
      'FAIL_CLOSED_REQUIRED',
      'FAIL_CLOSED_RECOVERY_VERIFIED'
    )
  ),
  three_master_continuity_state text not null check (
    three_master_continuity_state in (
      'CONNECTED_CONTINUITY_VERIFIED',
      'DISCONNECTED_FAIL_CLOSED_VERIFIED',
      'HOLD_CONTINUITY_NOT_VERIFIED'
    )
  ),
  connection_state text not null check (
    connection_state in ('CONNECTED','DISCONNECTED_HOLD')
  ),
  masters_synced boolean not null,
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  check (
    (connection_state='CONNECTED'
      and renewal_drift_state='CURRENT'
      and fail_closed_recovery_validation_state='NOT_REQUIRED'
      and three_master_continuity_state='CONNECTED_CONTINUITY_VERIFIED'
      and masters_synced=true)
    or
    (connection_state='DISCONNECTED_HOLD' and masters_synced=false)
  )
);

create index if not exists master_build382_runtime_continuity_recent_idx
  on app.master_build382_runtime_continuity_audits(recorded_at desc);

alter table app.master_build382_runtime_continuity_audits enable row level security;
alter table app.master_build382_runtime_continuity_audits force row level security;

drop policy if exists master_build382_runtime_continuity_select
  on app.master_build382_runtime_continuity_audits;

create policy master_build382_runtime_continuity_select
  on app.master_build382_runtime_continuity_audits
  for select to ai_data_runtime
  using (
    exists (
      select 1
      from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build382_runtime_continuity_protected_select
  on app.master_build382_runtime_continuity_audits;

create policy master_build382_runtime_continuity_protected_select
  on app.master_build382_runtime_continuity_audits
  for select to ai_data_protected_runtime
  using (true);

drop policy if exists master_build382_runtime_continuity_protected_insert
  on app.master_build382_runtime_continuity_audits;

create policy master_build382_runtime_continuity_protected_insert
  on app.master_build382_runtime_continuity_audits
  for insert to ai_data_protected_runtime
  with check (
    (connection_state='CONNECTED'
      and renewal_drift_state='CURRENT'
      and three_master_continuity_state='CONNECTED_CONTINUITY_VERIFIED'
      and masters_synced=true)
    or
    (connection_state='DISCONNECTED_HOLD' and masters_synced=false)
  );

grant select on app.master_build382_runtime_continuity_audits
to ai_data_runtime;

grant select,insert on app.master_build382_runtime_continuity_audits
to ai_data_protected_runtime;

revoke insert,update,delete on app.master_build382_runtime_continuity_audits
from ai_data_runtime;

revoke update,delete on app.master_build382_runtime_continuity_audits
from ai_data_protected_runtime;
