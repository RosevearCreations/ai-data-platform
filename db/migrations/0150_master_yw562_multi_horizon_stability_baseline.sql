-- Build 386 — Multi-Horizon Stability Baseline,
-- Preventive-Control Degradation Detection & Three-Master Early-Warning Escalation Audit.

create table if not exists app.master_build386_multi_horizon_stability_samples (
  sample_id uuid primary key,
  connection_state text not null check (connection_state in ('CONNECTED','DISCONNECTED_HOLD')),
  stability_ratio numeric(6,5) not null check (stability_ratio between 0 and 1),
  preventive_controls_healthy boolean not null,
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create table if not exists app.master_build386_preventive_control_degradation_events (
  degradation_event_id uuid primary key,
  control_id text not null,
  previous_score numeric(6,5) not null check (previous_score between 0 and 1),
  current_score numeric(6,5) not null check (current_score between 0 and 1),
  degradation_detected boolean not null,
  ai_hub_acknowledged boolean not null default false,
  comms_acknowledged boolean not null default false,
  controller_acknowledged boolean not null default false,
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create table if not exists app.master_build386_early_warning_escalation_audits (
  audit_id uuid primary key,
  degradation_event_id uuid null
    references app.master_build386_preventive_control_degradation_events(degradation_event_id) on delete restrict,
  early_warning_state text not null check (
    early_warning_state in ('BASELINE_INCOMPLETE','BASELINE_HEALTHY','BASELINE_DEGRADED','EARLY_WARNING_ACTIVE')
  ),
  degradation_state text not null check (
    degradation_state in ('NO_DEGRADATION_DETECTED','DEGRADATION_ACKNOWLEDGED','DEGRADATION_ESCALATION_REQUIRED')
  ),
  ai_hub_acknowledged boolean not null,
  comms_acknowledged boolean not null,
  controller_acknowledged boolean not null,
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    degradation_state <> 'DEGRADATION_ACKNOWLEDGED'
    or (ai_hub_acknowledged and comms_acknowledged and controller_acknowledged)
  )
);

create index if not exists master_build386_stability_recent_idx
  on app.master_build386_multi_horizon_stability_samples(recorded_at desc);
create index if not exists master_build386_degradation_recent_idx
  on app.master_build386_preventive_control_degradation_events(recorded_at desc);
create index if not exists master_build386_early_warning_recent_idx
  on app.master_build386_early_warning_escalation_audits(recorded_at desc);

alter table app.master_build386_multi_horizon_stability_samples enable row level security;
alter table app.master_build386_multi_horizon_stability_samples force row level security;
alter table app.master_build386_preventive_control_degradation_events enable row level security;
alter table app.master_build386_preventive_control_degradation_events force row level security;
alter table app.master_build386_early_warning_escalation_audits enable row level security;
alter table app.master_build386_early_warning_escalation_audits force row level security;

create policy master_build386_stability_runtime_select
  on app.master_build386_multi_horizon_stability_samples
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_build386_degradation_runtime_select
  on app.master_build386_preventive_control_degradation_events
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_build386_warning_runtime_select
  on app.master_build386_early_warning_escalation_audits
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_build386_stability_protected_insert
  on app.master_build386_multi_horizon_stability_samples
  for insert to ai_data_protected_runtime with check (true);
create policy master_build386_degradation_protected_insert
  on app.master_build386_preventive_control_degradation_events
  for insert to ai_data_protected_runtime with check (true);
create policy master_build386_warning_protected_insert
  on app.master_build386_early_warning_escalation_audits
  for insert to ai_data_protected_runtime
  with check (
    degradation_state <> 'DEGRADATION_ACKNOWLEDGED'
    or (ai_hub_acknowledged and comms_acknowledged and controller_acknowledged)
  );

create policy master_build386_stability_protected_select
  on app.master_build386_multi_horizon_stability_samples
  for select to ai_data_protected_runtime using (true);
create policy master_build386_degradation_protected_select
  on app.master_build386_preventive_control_degradation_events
  for select to ai_data_protected_runtime using (true);
create policy master_build386_warning_protected_select
  on app.master_build386_early_warning_escalation_audits
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build386_multi_horizon_stability_samples,
  app.master_build386_preventive_control_degradation_events,
  app.master_build386_early_warning_escalation_audits
to ai_data_runtime;

grant select,insert on
  app.master_build386_multi_horizon_stability_samples,
  app.master_build386_preventive_control_degradation_events,
  app.master_build386_early_warning_escalation_audits
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build386_multi_horizon_stability_samples,
  app.master_build386_preventive_control_degradation_events,
  app.master_build386_early_warning_escalation_audits
from ai_data_runtime;

revoke update,delete on
  app.master_build386_multi_horizon_stability_samples,
  app.master_build386_preventive_control_degradation_events,
  app.master_build386_early_warning_escalation_audits
from ai_data_protected_runtime;
