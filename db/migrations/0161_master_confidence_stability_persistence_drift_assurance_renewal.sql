-- Build 398 — Post-Recalibration Confidence Stability Monitoring,
-- Intervention Persistence Drift Detection & Cross-Shell Escalation Assurance Renewal.

create table if not exists app.master_build398_confidence_stability_observations (
  observation_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  prior_confidence_bps integer not null check (prior_confidence_bps between 0 and 10000),
  current_confidence_bps integer not null check (current_confidence_bps between 0 and 10000),
  observation_window_hours integer not null check (observation_window_hours >= 24),
  sample_count integer not null check (sample_count >= 3),
  evidence_current boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  stability_state text not null check (stability_state in ('STABLE','DEGRADING','HOLD')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    stability_state <> 'STABLE'
    or (
      current_confidence_bps >= 7000
      and greatest(0, prior_confidence_bps-current_confidence_bps) <= 1000
      and evidence_current
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build398_intervention_persistence_drift (
  drift_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  intervention_occurred boolean not null,
  baseline_risk_bps integer not null check (baseline_risk_bps between 0 and 10000),
  current_risk_bps integer not null check (current_risk_bps between 0 and 10000),
  risk_drift_bps integer not null check (risk_drift_bps between 0 and 10000),
  observation_window_hours integer not null check (observation_window_hours >= 0),
  recurrence_detected boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  drift_state text not null check (
    drift_state in ('NOT_REQUIRED','STABLE','DRIFTING','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    not intervention_occurred
    or observation_window_hours >= 48
  ),
  check (
    drift_state <> 'STABLE'
    or (
      intervention_occurred
      and risk_drift_bps = greatest(0, current_risk_bps-baseline_risk_bps)
      and risk_drift_bps <= 500
      and not recurrence_detected
      and owner_reviewed
      and independently_verified
    )
  ),
  check (
    drift_state <> 'NOT_REQUIRED'
    or (
      not intervention_occurred
      and risk_drift_bps=0
      and not recurrence_detected
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build398_escalation_assurance_renewals (
  renewal_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  evidence_points integer not null check (evidence_points >= 5),
  confidence_evidence_current boolean not null,
  threshold_evidence_current boolean not null,
  persistence_evidence_current boolean not null,
  owner_renewed boolean not null,
  independently_verified boolean not null,
  renewal_state text not null check (renewal_state in ('RENEWED','HOLD','REJECTED')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    renewal_state <> 'RENEWED'
    or (
      confidence_evidence_current
      and threshold_evidence_current
      and persistence_evidence_current
      and owner_renewed
      and independently_verified
    )
  )
);

create index if not exists master_b398_confidence_stability_recent_idx
  on app.master_build398_confidence_stability_observations(recorded_at desc);
create index if not exists master_b398_persistence_drift_recent_idx
  on app.master_build398_intervention_persistence_drift(recorded_at desc);
create index if not exists master_b398_assurance_renewal_recent_idx
  on app.master_build398_escalation_assurance_renewals(recorded_at desc);

alter table app.master_build398_confidence_stability_observations enable row level security;
alter table app.master_build398_confidence_stability_observations force row level security;
alter table app.master_build398_intervention_persistence_drift enable row level security;
alter table app.master_build398_intervention_persistence_drift force row level security;
alter table app.master_build398_escalation_assurance_renewals enable row level security;
alter table app.master_build398_escalation_assurance_renewals force row level security;

create policy master_b398_confidence_runtime_select
  on app.master_build398_confidence_stability_observations
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b398_drift_runtime_select
  on app.master_build398_intervention_persistence_drift
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b398_renewal_runtime_select
  on app.master_build398_escalation_assurance_renewals
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_b398_confidence_protected_insert
  on app.master_build398_confidence_stability_observations
  for insert to ai_data_protected_runtime with check (true);
create policy master_b398_drift_protected_insert
  on app.master_build398_intervention_persistence_drift
  for insert to ai_data_protected_runtime with check (true);
create policy master_b398_renewal_protected_insert
  on app.master_build398_escalation_assurance_renewals
  for insert to ai_data_protected_runtime with check (true);

create policy master_b398_confidence_protected_select
  on app.master_build398_confidence_stability_observations
  for select to ai_data_protected_runtime using (true);
create policy master_b398_drift_protected_select
  on app.master_build398_intervention_persistence_drift
  for select to ai_data_protected_runtime using (true);
create policy master_b398_renewal_protected_select
  on app.master_build398_escalation_assurance_renewals
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build398_confidence_stability_observations,
  app.master_build398_intervention_persistence_drift,
  app.master_build398_escalation_assurance_renewals
to ai_data_runtime;

grant select,insert on
  app.master_build398_confidence_stability_observations,
  app.master_build398_intervention_persistence_drift,
  app.master_build398_escalation_assurance_renewals
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build398_confidence_stability_observations,
  app.master_build398_intervention_persistence_drift,
  app.master_build398_escalation_assurance_renewals
from ai_data_runtime;

revoke update,delete on
  app.master_build398_confidence_stability_observations,
  app.master_build398_intervention_persistence_drift,
  app.master_build398_escalation_assurance_renewals
from ai_data_protected_runtime;
