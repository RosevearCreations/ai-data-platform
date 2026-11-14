-- Build 399 — Long-Horizon Assurance Renewal Stability,
-- Persistence Drift Recovery Effectiveness & Cross-Shell Confidence Degradation Early-Warning Governance.

create table if not exists app.master_build399_long_horizon_assurance_stability (
  observation_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  observation_window_hours integer not null check (observation_window_hours >= 72),
  renewal_count integer not null check (renewal_count >= 0),
  missed_renewal_count integer not null check (missed_renewal_count >= 0),
  evidence_current boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  stability_state text not null check (stability_state in ('STABLE','UNSTABLE','HOLD')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    stability_state <> 'STABLE'
    or (
      renewal_count >= 3
      and missed_renewal_count = 0
      and evidence_current
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build399_persistence_drift_recovery_effectiveness (
  recovery_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  drift_occurred boolean not null,
  pre_recovery_drift_bps integer not null check (pre_recovery_drift_bps between 0 and 10000),
  post_recovery_drift_bps integer not null check (post_recovery_drift_bps between 0 and 10000),
  recovery_window_hours integer not null check (recovery_window_hours >= 0),
  recurrence_detected boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  recovery_state text not null check (
    recovery_state in ('NOT_REQUIRED','EFFECTIVE','INEFFECTIVE','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    not drift_occurred
    or recovery_window_hours >= 48
  ),
  check (
    recovery_state <> 'EFFECTIVE'
    or (
      drift_occurred
      and pre_recovery_drift_bps > 0
      and post_recovery_drift_bps < pre_recovery_drift_bps
      and post_recovery_drift_bps <= 250
      and not recurrence_detected
      and owner_reviewed
      and independently_verified
    )
  ),
  check (
    recovery_state <> 'NOT_REQUIRED'
    or (
      not drift_occurred
      and pre_recovery_drift_bps = 0
      and post_recovery_drift_bps = 0
      and not recurrence_detected
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build399_confidence_degradation_early_warnings (
  warning_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  current_confidence_bps integer not null check (current_confidence_bps between 0 and 10000),
  projected_confidence_bps integer not null check (projected_confidence_bps between 0 and 10000),
  forecast_horizon_hours integer not null check (forecast_horizon_hours >= 24),
  sample_count integer not null check (sample_count >= 5),
  owner_acknowledged boolean not null,
  mitigation_ready boolean not null,
  independently_verified boolean not null,
  warning_state text not null check (warning_state in ('CLEAR','WATCH','ACTION','HOLD')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    warning_state <> 'CLEAR'
    or (
      greatest(0, current_confidence_bps-projected_confidence_bps) <= 500
      and projected_confidence_bps >= 7000
      and owner_acknowledged
      and independently_verified
    )
  ),
  check (
    warning_state <> 'WATCH'
    or (
      greatest(0, current_confidence_bps-projected_confidence_bps) > 500
      and greatest(0, current_confidence_bps-projected_confidence_bps) <= 1000
      and projected_confidence_bps >= 7000
      and owner_acknowledged
      and mitigation_ready
      and independently_verified
    )
  ),
  check (
    warning_state <> 'ACTION'
    or (
      projected_confidence_bps < 7000
      or greatest(0, current_confidence_bps-projected_confidence_bps) > 1000
    )
  )
);

create index if not exists master_b399_assurance_stability_recent_idx
  on app.master_build399_long_horizon_assurance_stability(recorded_at desc);
create index if not exists master_b399_recovery_effectiveness_recent_idx
  on app.master_build399_persistence_drift_recovery_effectiveness(recorded_at desc);
create index if not exists master_b399_confidence_warning_recent_idx
  on app.master_build399_confidence_degradation_early_warnings(recorded_at desc);

alter table app.master_build399_long_horizon_assurance_stability enable row level security;
alter table app.master_build399_long_horizon_assurance_stability force row level security;
alter table app.master_build399_persistence_drift_recovery_effectiveness enable row level security;
alter table app.master_build399_persistence_drift_recovery_effectiveness force row level security;
alter table app.master_build399_confidence_degradation_early_warnings enable row level security;
alter table app.master_build399_confidence_degradation_early_warnings force row level security;

create policy master_b399_stability_runtime_select
  on app.master_build399_long_horizon_assurance_stability
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b399_recovery_runtime_select
  on app.master_build399_persistence_drift_recovery_effectiveness
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b399_warning_runtime_select
  on app.master_build399_confidence_degradation_early_warnings
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_b399_stability_protected_insert
  on app.master_build399_long_horizon_assurance_stability
  for insert to ai_data_protected_runtime with check (true);
create policy master_b399_recovery_protected_insert
  on app.master_build399_persistence_drift_recovery_effectiveness
  for insert to ai_data_protected_runtime with check (true);
create policy master_b399_warning_protected_insert
  on app.master_build399_confidence_degradation_early_warnings
  for insert to ai_data_protected_runtime with check (true);

create policy master_b399_stability_protected_select
  on app.master_build399_long_horizon_assurance_stability
  for select to ai_data_protected_runtime using (true);
create policy master_b399_recovery_protected_select
  on app.master_build399_persistence_drift_recovery_effectiveness
  for select to ai_data_protected_runtime using (true);
create policy master_b399_warning_protected_select
  on app.master_build399_confidence_degradation_early_warnings
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build399_long_horizon_assurance_stability,
  app.master_build399_persistence_drift_recovery_effectiveness,
  app.master_build399_confidence_degradation_early_warnings
to ai_data_runtime;

grant select,insert on
  app.master_build399_long_horizon_assurance_stability,
  app.master_build399_persistence_drift_recovery_effectiveness,
  app.master_build399_confidence_degradation_early_warnings
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build399_long_horizon_assurance_stability,
  app.master_build399_persistence_drift_recovery_effectiveness,
  app.master_build399_confidence_degradation_early_warnings
from ai_data_runtime;

revoke update,delete on
  app.master_build399_long_horizon_assurance_stability,
  app.master_build399_persistence_drift_recovery_effectiveness,
  app.master_build399_confidence_degradation_early_warnings
from ai_data_protected_runtime;
