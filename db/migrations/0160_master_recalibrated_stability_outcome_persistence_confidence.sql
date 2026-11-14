-- Build 397 — Recalibrated Threshold Stability Validation,
-- Intervention-Outcome Persistence & Cross-Shell Escalation Confidence Governance.

create table if not exists app.master_build397_recalibrated_threshold_stability (
  validation_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  warning_threshold_bps integer not null check (warning_threshold_bps between 0 and 10000),
  escalation_threshold_bps integer not null check (escalation_threshold_bps between 0 and 10000),
  observation_window_hours integer not null check (observation_window_hours >= 24),
  sample_count integer not null check (sample_count >= 3),
  threshold_breach_count integer not null check (threshold_breach_count >= 0),
  recurrence_detected boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  stability_state text not null check (stability_state in ('STABLE','UNSTABLE','HOLD')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (warning_threshold_bps < escalation_threshold_bps),
  check (
    stability_state <> 'STABLE'
    or (
      threshold_breach_count=0
      and not recurrence_detected
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build397_intervention_outcome_persistence (
  persistence_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  intervention_occurred boolean not null,
  persistence_window_hours integer not null check (persistence_window_hours >= 0),
  sample_count integer not null check (sample_count >= 0),
  baseline_post_intervention_risk_bps integer not null check (baseline_post_intervention_risk_bps between 0 and 10000),
  current_risk_bps integer not null check (current_risk_bps between 0 and 10000),
  recurrence_detected boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  persistence_state text not null check (
    persistence_state in ('NOT_REQUIRED','PERSISTENT','REGRESSED','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    not intervention_occurred
    or persistence_window_hours >= 48
  ),
  check (
    persistence_state <> 'PERSISTENT'
    or (
      intervention_occurred
      and sample_count >= 3
      and current_risk_bps <= baseline_post_intervention_risk_bps
      and not recurrence_detected
      and owner_reviewed
      and independently_verified
    )
  ),
  check (
    persistence_state <> 'NOT_REQUIRED'
    or (
      not intervention_occurred
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build397_escalation_confidence_governance (
  confidence_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  evidence_points integer not null check (evidence_points >= 5),
  confidence_bps integer not null check (confidence_bps between 0 and 10000),
  threshold_evidence_current boolean not null,
  intervention_evidence_current boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  confidence_state text not null check (
    confidence_state in ('VERIFIED','LOW_CONFIDENCE','HOLD','REJECTED')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    confidence_state <> 'VERIFIED'
    or (
      confidence_bps >= 7000
      and threshold_evidence_current
      and intervention_evidence_current
      and owner_reviewed
      and independently_verified
    )
  )
);

create index if not exists master_b397_threshold_stability_recent_idx
  on app.master_build397_recalibrated_threshold_stability(recorded_at desc);
create index if not exists master_b397_intervention_persistence_recent_idx
  on app.master_build397_intervention_outcome_persistence(recorded_at desc);
create index if not exists master_b397_confidence_recent_idx
  on app.master_build397_escalation_confidence_governance(recorded_at desc);

alter table app.master_build397_recalibrated_threshold_stability enable row level security;
alter table app.master_build397_recalibrated_threshold_stability force row level security;
alter table app.master_build397_intervention_outcome_persistence enable row level security;
alter table app.master_build397_intervention_outcome_persistence force row level security;
alter table app.master_build397_escalation_confidence_governance enable row level security;
alter table app.master_build397_escalation_confidence_governance force row level security;

create policy master_b397_threshold_runtime_select
  on app.master_build397_recalibrated_threshold_stability
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b397_persistence_runtime_select
  on app.master_build397_intervention_outcome_persistence
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b397_confidence_runtime_select
  on app.master_build397_escalation_confidence_governance
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_b397_threshold_protected_insert
  on app.master_build397_recalibrated_threshold_stability
  for insert to ai_data_protected_runtime with check (true);
create policy master_b397_persistence_protected_insert
  on app.master_build397_intervention_outcome_persistence
  for insert to ai_data_protected_runtime with check (true);
create policy master_b397_confidence_protected_insert
  on app.master_build397_escalation_confidence_governance
  for insert to ai_data_protected_runtime with check (true);

create policy master_b397_threshold_protected_select
  on app.master_build397_recalibrated_threshold_stability
  for select to ai_data_protected_runtime using (true);
create policy master_b397_persistence_protected_select
  on app.master_build397_intervention_outcome_persistence
  for select to ai_data_protected_runtime using (true);
create policy master_b397_confidence_protected_select
  on app.master_build397_escalation_confidence_governance
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build397_recalibrated_threshold_stability,
  app.master_build397_intervention_outcome_persistence,
  app.master_build397_escalation_confidence_governance
to ai_data_runtime;

grant select,insert on
  app.master_build397_recalibrated_threshold_stability,
  app.master_build397_intervention_outcome_persistence,
  app.master_build397_escalation_confidence_governance
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build397_recalibrated_threshold_stability,
  app.master_build397_intervention_outcome_persistence,
  app.master_build397_escalation_confidence_governance
from ai_data_runtime;

revoke update,delete on
  app.master_build397_recalibrated_threshold_stability,
  app.master_build397_intervention_outcome_persistence,
  app.master_build397_escalation_confidence_governance
from ai_data_protected_runtime;
