-- Build 395 — Predictive Visual Recurrence Threshold Calibration,
-- Preventive-Control Intervention Readiness & Cross-Shell Risk Escalation Governance.

create table if not exists app.master_build395_recurrence_threshold_calibrations (
  calibration_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  evidence_points integer not null check (evidence_points >= 5),
  baseline_probability_bps integer not null check (baseline_probability_bps between 0 and 10000),
  warning_threshold_bps integer not null check (warning_threshold_bps between 0 and 10000),
  escalation_threshold_bps integer not null check (escalation_threshold_bps between 0 and 10000),
  false_positive_rate_bps integer not null check (false_positive_rate_bps between 0 and 10000),
  false_negative_rate_bps integer not null check (false_negative_rate_bps between 0 and 10000),
  owner_approved boolean not null,
  independently_verified boolean not null,
  calibration_state text not null check (
    calibration_state in ('CALIBRATED','HOLD','REJECTED')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (baseline_probability_bps < warning_threshold_bps),
  check (warning_threshold_bps < escalation_threshold_bps),
  check (
    calibration_state <> 'CALIBRATED'
    or (owner_approved and independently_verified)
  )
);

create table if not exists app.master_build395_preventive_intervention_readiness (
  readiness_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  required_controls integer not null check (required_controls >= 1),
  ready_controls integer not null check (
    ready_controls >= 0 and ready_controls <= required_controls
  ),
  runbook_verified boolean not null,
  rollback_ready boolean not null,
  owner_on_call_assigned boolean not null,
  independently_verified boolean not null,
  readiness_state text not null check (
    readiness_state in ('READY','NOT_READY','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    readiness_state <> 'READY'
    or (
      ready_controls=required_controls
      and runbook_verified
      and rollback_ready
      and owner_on_call_assigned
      and independently_verified
    )
  )
);

create table if not exists app.master_build395_cross_shell_risk_escalations (
  escalation_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  recurrence_risk_bps integer not null check (recurrence_risk_bps between 0 and 10000),
  warning_threshold_bps integer not null check (warning_threshold_bps between 0 and 10000),
  escalation_threshold_bps integer not null check (escalation_threshold_bps between 0 and 10000),
  escalation_level text not null check (
    escalation_level in ('NORMAL','WATCH','ACTION','CRITICAL')
  ),
  intervention_invoked boolean not null,
  owner_acknowledged boolean not null,
  independently_verified boolean not null,
  escalation_state text not null check (
    escalation_state in ('VERIFIED','HOLD','REJECTED')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (warning_threshold_bps < escalation_threshold_bps),
  check (
    escalation_state <> 'VERIFIED'
    or independently_verified
  ),
  check (
    recurrence_risk_bps < warning_threshold_bps
    or owner_acknowledged
  ),
  check (
    recurrence_risk_bps < escalation_threshold_bps
    or intervention_invoked
  )
);

create index if not exists master_b395_calibration_recent_idx
  on app.master_build395_recurrence_threshold_calibrations(recorded_at desc);
create index if not exists master_b395_readiness_recent_idx
  on app.master_build395_preventive_intervention_readiness(recorded_at desc);
create index if not exists master_b395_escalation_recent_idx
  on app.master_build395_cross_shell_risk_escalations(recorded_at desc);

alter table app.master_build395_recurrence_threshold_calibrations enable row level security;
alter table app.master_build395_recurrence_threshold_calibrations force row level security;
alter table app.master_build395_preventive_intervention_readiness enable row level security;
alter table app.master_build395_preventive_intervention_readiness force row level security;
alter table app.master_build395_cross_shell_risk_escalations enable row level security;
alter table app.master_build395_cross_shell_risk_escalations force row level security;

create policy master_b395_calibration_runtime_select
  on app.master_build395_recurrence_threshold_calibrations
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b395_readiness_runtime_select
  on app.master_build395_preventive_intervention_readiness
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b395_escalation_runtime_select
  on app.master_build395_cross_shell_risk_escalations
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_b395_calibration_protected_insert
  on app.master_build395_recurrence_threshold_calibrations
  for insert to ai_data_protected_runtime with check (true);
create policy master_b395_readiness_protected_insert
  on app.master_build395_preventive_intervention_readiness
  for insert to ai_data_protected_runtime with check (true);
create policy master_b395_escalation_protected_insert
  on app.master_build395_cross_shell_risk_escalations
  for insert to ai_data_protected_runtime with check (true);

create policy master_b395_calibration_protected_select
  on app.master_build395_recurrence_threshold_calibrations
  for select to ai_data_protected_runtime using (true);
create policy master_b395_readiness_protected_select
  on app.master_build395_preventive_intervention_readiness
  for select to ai_data_protected_runtime using (true);
create policy master_b395_escalation_protected_select
  on app.master_build395_cross_shell_risk_escalations
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build395_recurrence_threshold_calibrations,
  app.master_build395_preventive_intervention_readiness,
  app.master_build395_cross_shell_risk_escalations
to ai_data_runtime;

grant select,insert on
  app.master_build395_recurrence_threshold_calibrations,
  app.master_build395_preventive_intervention_readiness,
  app.master_build395_cross_shell_risk_escalations
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build395_recurrence_threshold_calibrations,
  app.master_build395_preventive_intervention_readiness,
  app.master_build395_cross_shell_risk_escalations
from ai_data_runtime;

revoke update,delete on
  app.master_build395_recurrence_threshold_calibrations,
  app.master_build395_preventive_intervention_readiness,
  app.master_build395_cross_shell_risk_escalations
from ai_data_protected_runtime;
