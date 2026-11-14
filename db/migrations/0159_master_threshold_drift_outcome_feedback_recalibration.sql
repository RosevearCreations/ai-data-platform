-- Build 396 — Predictive Threshold Drift Monitoring,
-- Preventive-Intervention Outcome Effectiveness & Cross-Shell Escalation Feedback Recalibration.

create table if not exists app.master_build396_threshold_drift_observations (
  observation_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  sample_count integer not null check (sample_count >= 2),
  calibrated_warning_threshold_bps integer not null check (calibrated_warning_threshold_bps between 0 and 10000),
  calibrated_escalation_threshold_bps integer not null check (calibrated_escalation_threshold_bps between 0 and 10000),
  recommended_warning_threshold_bps integer not null check (recommended_warning_threshold_bps between 0 and 10000),
  recommended_escalation_threshold_bps integer not null check (recommended_escalation_threshold_bps between 0 and 10000),
  warning_drift_bps integer not null check (warning_drift_bps between 0 and 10000),
  escalation_drift_bps integer not null check (escalation_drift_bps between 0 and 10000),
  independently_observed boolean not null,
  drift_state text not null check (drift_state in ('STABLE','DRIFTING','HOLD')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (calibrated_warning_threshold_bps < calibrated_escalation_threshold_bps),
  check (recommended_warning_threshold_bps < recommended_escalation_threshold_bps)
);

create table if not exists app.master_build396_intervention_outcome_effectiveness (
  outcome_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  intervention_occurred boolean not null,
  pre_intervention_risk_bps integer not null check (pre_intervention_risk_bps between 0 and 10000),
  post_intervention_risk_bps integer not null check (post_intervention_risk_bps between 0 and 10000),
  observation_window_hours integer not null check (observation_window_hours >= 0),
  recurrence_detected boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  outcome_state text not null check (
    outcome_state in ('NOT_REQUIRED','EFFECTIVE','INEFFECTIVE','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    not intervention_occurred
    or observation_window_hours >= 24
  ),
  check (
    outcome_state <> 'EFFECTIVE'
    or (
      intervention_occurred
      and post_intervention_risk_bps < pre_intervention_risk_bps
      and not recurrence_detected
      and owner_reviewed
      and independently_verified
    )
  ),
  check (
    outcome_state <> 'NOT_REQUIRED'
    or (
      not intervention_occurred
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build396_escalation_feedback_recalibrations (
  recalibration_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  prior_warning_threshold_bps integer not null check (prior_warning_threshold_bps between 0 and 10000),
  prior_escalation_threshold_bps integer not null check (prior_escalation_threshold_bps between 0 and 10000),
  proposed_warning_threshold_bps integer not null check (proposed_warning_threshold_bps between 0 and 10000),
  proposed_escalation_threshold_bps integer not null check (proposed_escalation_threshold_bps between 0 and 10000),
  feedback_evidence_points integer not null check (feedback_evidence_points >= 5),
  intervention_feedback_count integer not null check (intervention_feedback_count >= 0),
  escalation_feedback_count integer not null check (escalation_feedback_count >= 1),
  owner_approved boolean not null,
  independently_verified boolean not null,
  recalibration_state text not null check (
    recalibration_state in ('RETAINED','RECALIBRATED','HOLD','REJECTED')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (prior_warning_threshold_bps < prior_escalation_threshold_bps),
  check (proposed_warning_threshold_bps < proposed_escalation_threshold_bps),
  check (
    recalibration_state not in ('RETAINED','RECALIBRATED')
    or (owner_approved and independently_verified)
  )
);

create index if not exists master_b396_drift_recent_idx
  on app.master_build396_threshold_drift_observations(recorded_at desc);
create index if not exists master_b396_outcome_recent_idx
  on app.master_build396_intervention_outcome_effectiveness(recorded_at desc);
create index if not exists master_b396_recalibration_recent_idx
  on app.master_build396_escalation_feedback_recalibrations(recorded_at desc);

alter table app.master_build396_threshold_drift_observations enable row level security;
alter table app.master_build396_threshold_drift_observations force row level security;
alter table app.master_build396_intervention_outcome_effectiveness enable row level security;
alter table app.master_build396_intervention_outcome_effectiveness force row level security;
alter table app.master_build396_escalation_feedback_recalibrations enable row level security;
alter table app.master_build396_escalation_feedback_recalibrations force row level security;

create policy master_b396_drift_runtime_select
  on app.master_build396_threshold_drift_observations
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b396_outcome_runtime_select
  on app.master_build396_intervention_outcome_effectiveness
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b396_recalibration_runtime_select
  on app.master_build396_escalation_feedback_recalibrations
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_b396_drift_protected_insert
  on app.master_build396_threshold_drift_observations
  for insert to ai_data_protected_runtime with check (true);
create policy master_b396_outcome_protected_insert
  on app.master_build396_intervention_outcome_effectiveness
  for insert to ai_data_protected_runtime with check (true);
create policy master_b396_recalibration_protected_insert
  on app.master_build396_escalation_feedback_recalibrations
  for insert to ai_data_protected_runtime with check (true);

create policy master_b396_drift_protected_select
  on app.master_build396_threshold_drift_observations
  for select to ai_data_protected_runtime using (true);
create policy master_b396_outcome_protected_select
  on app.master_build396_intervention_outcome_effectiveness
  for select to ai_data_protected_runtime using (true);
create policy master_b396_recalibration_protected_select
  on app.master_build396_escalation_feedback_recalibrations
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build396_threshold_drift_observations,
  app.master_build396_intervention_outcome_effectiveness,
  app.master_build396_escalation_feedback_recalibrations
to ai_data_runtime;

grant select,insert on
  app.master_build396_threshold_drift_observations,
  app.master_build396_intervention_outcome_effectiveness,
  app.master_build396_escalation_feedback_recalibrations
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build396_threshold_drift_observations,
  app.master_build396_intervention_outcome_effectiveness,
  app.master_build396_escalation_feedback_recalibrations
from ai_data_runtime;

revoke update,delete on
  app.master_build396_threshold_drift_observations,
  app.master_build396_intervention_outcome_effectiveness,
  app.master_build396_escalation_feedback_recalibrations
from ai_data_protected_runtime;
