-- Build 384 — Post-Recovery Continuity Watch,
-- Recurrent Drift Detection & Three-Master Incident Recurrence Prevention Audit.

create table if not exists app.master_build384_post_recovery_watch_samples (
  sample_id uuid primary key,
  build383_incident_id uuid null
    references app.master_build383_runtime_continuity_incidents(incident_id) on delete restrict,
  connection_state text not null check (connection_state in ('CONNECTED','DISCONNECTED_HOLD')),
  renewal_drift_state text not null check (renewal_drift_state in ('CURRENT','DRIFT_DETECTED')),
  incident_state text not null check (incident_state in ('CLEAR','OPEN','CLOSED_VERIFIED')),
  master_receipts_healthy boolean not null,
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create table if not exists app.master_build384_recurrent_drift_events (
  recurrence_id uuid primary key,
  prior_incident_id uuid not null
    references app.master_build383_runtime_continuity_incidents(incident_id) on delete restrict,
  drift_reason text not null,
  ai_hub_acknowledged boolean not null default false,
  comms_acknowledged boolean not null default false,
  controller_acknowledged boolean not null default false,
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  detected_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create table if not exists app.master_build384_recurrence_prevention_audits (
  audit_id uuid primary key,
  recurrence_id uuid not null unique
    references app.master_build384_recurrent_drift_events(recurrence_id) on delete restrict,
  prevention_action text not null,
  prevention_action_verified boolean not null,
  ai_hub_acknowledged boolean not null,
  comms_acknowledged boolean not null,
  controller_acknowledged boolean not null,
  prevention_state text not null check (
    prevention_state in ('PREVENTION_REQUIRED','RECURRENCE_PREVENTION_VERIFIED')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    prevention_state <> 'RECURRENCE_PREVENTION_VERIFIED'
    or (
      prevention_action_verified
      and ai_hub_acknowledged
      and comms_acknowledged
      and controller_acknowledged
    )
  )
);

create index if not exists master_build384_watch_recent_idx
  on app.master_build384_post_recovery_watch_samples(recorded_at desc);
create index if not exists master_build384_recurrence_recent_idx
  on app.master_build384_recurrent_drift_events(recorded_at desc);
create index if not exists master_build384_prevention_recent_idx
  on app.master_build384_recurrence_prevention_audits(recorded_at desc);

alter table app.master_build384_post_recovery_watch_samples enable row level security;
alter table app.master_build384_post_recovery_watch_samples force row level security;
alter table app.master_build384_recurrent_drift_events enable row level security;
alter table app.master_build384_recurrent_drift_events force row level security;
alter table app.master_build384_recurrence_prevention_audits enable row level security;
alter table app.master_build384_recurrence_prevention_audits force row level security;

create policy master_build384_watch_runtime_select
  on app.master_build384_post_recovery_watch_samples
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_build384_recurrence_runtime_select
  on app.master_build384_recurrent_drift_events
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_build384_prevention_runtime_select
  on app.master_build384_recurrence_prevention_audits
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_build384_watch_protected_insert
  on app.master_build384_post_recovery_watch_samples
  for insert to ai_data_protected_runtime
  with check (true);
create policy master_build384_recurrence_protected_insert
  on app.master_build384_recurrent_drift_events
  for insert to ai_data_protected_runtime
  with check (true);
create policy master_build384_prevention_protected_insert
  on app.master_build384_recurrence_prevention_audits
  for insert to ai_data_protected_runtime
  with check (
    prevention_state <> 'RECURRENCE_PREVENTION_VERIFIED'
    or (
      prevention_action_verified
      and ai_hub_acknowledged
      and comms_acknowledged
      and controller_acknowledged
    )
  );

create policy master_build384_watch_protected_select
  on app.master_build384_post_recovery_watch_samples
  for select to ai_data_protected_runtime using (true);
create policy master_build384_recurrence_protected_select
  on app.master_build384_recurrent_drift_events
  for select to ai_data_protected_runtime using (true);
create policy master_build384_prevention_protected_select
  on app.master_build384_recurrence_prevention_audits
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build384_post_recovery_watch_samples,
  app.master_build384_recurrent_drift_events,
  app.master_build384_recurrence_prevention_audits
to ai_data_runtime;

grant select,insert on
  app.master_build384_post_recovery_watch_samples,
  app.master_build384_recurrent_drift_events,
  app.master_build384_recurrence_prevention_audits
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build384_post_recovery_watch_samples,
  app.master_build384_recurrent_drift_events,
  app.master_build384_recurrence_prevention_audits
from ai_data_runtime;

revoke update,delete on
  app.master_build384_post_recovery_watch_samples,
  app.master_build384_recurrent_drift_events,
  app.master_build384_recurrence_prevention_audits
from ai_data_protected_runtime;
