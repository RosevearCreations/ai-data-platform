-- Build 383 — Runtime Continuity Incident Ledger,
-- Renewal Recovery Aging & Three-Master Drift Escalation Closure.

create table if not exists app.master_build383_runtime_continuity_incidents (
  incident_id uuid primary key,
  build382_audit_event_id uuid null
    references app.master_build382_runtime_continuity_audits(audit_event_id) on delete restrict,
  drift_reason text not null,
  opened_at timestamptz not null,
  last_recovery_attempt_at timestamptz null,
  recovered_at timestamptz null,
  status text not null check (status in ('OPEN','RECOVERED_PENDING_CLOSURE','CLOSED_VERIFIED')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  metadata jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create table if not exists app.master_build383_drift_escalation_events (
  escalation_event_id uuid primary key,
  incident_id uuid not null
    references app.master_build383_runtime_continuity_incidents(incident_id) on delete restrict,
  escalation_state text not null check (escalation_state in ('MONITORED','ESCALATED','ACKNOWLEDGED')),
  recovery_age_minutes integer not null check (recovery_age_minutes >= 0),
  master_id text null check (master_id in ('rosevear-ai-hub','rosevear-comms-hub','ai-data-platform')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create table if not exists app.master_build383_incident_closure_events (
  closure_event_id uuid primary key,
  incident_id uuid not null unique
    references app.master_build383_runtime_continuity_incidents(incident_id) on delete restrict,
  ai_hub_acknowledged boolean not null,
  comms_acknowledged boolean not null,
  controller_acknowledged boolean not null,
  closure_evidence_verified boolean not null,
  closure_state text not null check (closure_state='CLOSED_VERIFIED'),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    ai_hub_acknowledged
    and comms_acknowledged
    and controller_acknowledged
    and closure_evidence_verified
  )
);

create index if not exists master_build383_incidents_recent_idx
  on app.master_build383_runtime_continuity_incidents(recorded_at desc);
create index if not exists master_build383_escalations_recent_idx
  on app.master_build383_drift_escalation_events(recorded_at desc);
create index if not exists master_build383_closures_recent_idx
  on app.master_build383_incident_closure_events(recorded_at desc);

alter table app.master_build383_runtime_continuity_incidents enable row level security;
alter table app.master_build383_runtime_continuity_incidents force row level security;
alter table app.master_build383_drift_escalation_events enable row level security;
alter table app.master_build383_drift_escalation_events force row level security;
alter table app.master_build383_incident_closure_events enable row level security;
alter table app.master_build383_incident_closure_events force row level security;

create policy master_build383_incidents_runtime_select
  on app.master_build383_runtime_continuity_incidents
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_build383_escalations_runtime_select
  on app.master_build383_drift_escalation_events
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_build383_closures_runtime_select
  on app.master_build383_incident_closure_events
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_build383_incidents_protected_all
  on app.master_build383_runtime_continuity_incidents
  for all to ai_data_protected_runtime
  using (true) with check (true);
create policy master_build383_escalations_protected_all
  on app.master_build383_drift_escalation_events
  for all to ai_data_protected_runtime
  using (true) with check (true);
create policy master_build383_closures_protected_all
  on app.master_build383_incident_closure_events
  for all to ai_data_protected_runtime
  using (true) with check (
    ai_hub_acknowledged
    and comms_acknowledged
    and controller_acknowledged
    and closure_evidence_verified
    and closure_state='CLOSED_VERIFIED'
  );

grant select on
  app.master_build383_runtime_continuity_incidents,
  app.master_build383_drift_escalation_events,
  app.master_build383_incident_closure_events
to ai_data_runtime;

grant select,insert on
  app.master_build383_runtime_continuity_incidents,
  app.master_build383_drift_escalation_events,
  app.master_build383_incident_closure_events
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build383_runtime_continuity_incidents,
  app.master_build383_drift_escalation_events,
  app.master_build383_incident_closure_events
from ai_data_runtime;

revoke update,delete on
  app.master_build383_runtime_continuity_incidents,
  app.master_build383_drift_escalation_events,
  app.master_build383_incident_closure_events
from ai_data_protected_runtime;
