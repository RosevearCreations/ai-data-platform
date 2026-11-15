-- Build 404 — Long-Horizon Recalibration Persistence Stability,
-- Renewal Drift Recovery Effectiveness & Seven-Application Linkage Prevention Assurance Governance.

create table if not exists app.master_build404_long_horizon_recalibration_stability (
  stability_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  observation_window_hours integer not null check (observation_window_hours >= 168),
  sample_count integer not null check (sample_count >= 14),
  maximum_absolute_error_bps integer not null check (maximum_absolute_error_bps between 0 and 500),
  latest_absolute_error_bps integer not null check (latest_absolute_error_bps between 0 and 500),
  samples_outside_budget integer not null check (samples_outside_budget = 0),
  recurrence_count integer not null check (recurrence_count = 0),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  stability_state text not null check (
    stability_state in ('STABLE','DEGRADED','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    stability_state <> 'STABLE'
    or (owner_reviewed and independently_verified)
  )
);

create table if not exists app.master_build404_renewal_drift_recovery_effectiveness (
  effectiveness_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  drift_event_count integer not null check (drift_event_count >= 0),
  recovered_event_count integer not null check (
    recovered_event_count >= 0 and recovered_event_count <= drift_event_count
  ),
  observation_window_hours integer not null check (observation_window_hours >= 72),
  sample_count integer not null check (sample_count >= 5),
  latest_post_recovery_lead_hours integer not null check (latest_post_recovery_lead_hours >= 0),
  threshold_breach_count integer not null check (threshold_breach_count >= 0),
  recurrence_count integer not null check (recurrence_count >= 0),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  effectiveness_state text not null check (
    effectiveness_state in ('NOT_REQUIRED','EFFECTIVE','INEFFECTIVE','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    effectiveness_state <> 'EFFECTIVE'
    or (
      drift_event_count > 0
      and recovered_event_count = drift_event_count
      and latest_post_recovery_lead_hours between 6 and 24
      and threshold_breach_count = 0
      and recurrence_count = 0
      and owner_reviewed
      and independently_verified
    )
  ),
  check (
    effectiveness_state <> 'NOT_REQUIRED'
    or (
      drift_event_count = 0
      and recovered_event_count = 0
      and latest_post_recovery_lead_hours = 0
      and threshold_breach_count = 0
      and recurrence_count = 0
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build404_linkage_prevention_assurance (
  assurance_id uuid primary key,
  app_id text not null check (
    app_id in (
      'ai-data-platform','rosevear-comms-hub','rosevear-ai-hub',
      'yw','icamp','devilndove','rosiedazzlers'
    )
  ),
  repository text not null check (char_length(repository) between 1 and 160),
  topology_id text not null check (
    topology_id = 'rosevear-master-shell-seven-apps.v1'
  ),
  production_main_sha text not null check (
    production_main_sha ~ '^[0-9a-f]{40}$'
  ),
  manifest_sha256 text not null check (
    manifest_sha256 ~ '^[0-9a-f]{64}$'
  ),
  evidence_age_hours integer not null check (evidence_age_hours between 0 and 24),
  observation_window_hours integer not null check (observation_window_hours >= 168),
  sample_count integer not null check (sample_count >= 7),
  self_identity_matches boolean not null,
  canonical_topology_matches boolean not null,
  validation_authority_matches boolean not null,
  continuity_break_count integer not null check (continuity_break_count = 0),
  stale_evidence_recurrence_count integer not null check (stale_evidence_recurrence_count = 0),
  authority_transfer_count integer not null check (authority_transfer_count = 0),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  assurance_state text not null check (
    assurance_state in ('ASSURED','DEGRADED','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    assurance_state <> 'ASSURED'
    or (
      self_identity_matches
      and canonical_topology_matches
      and validation_authority_matches
      and owner_reviewed
      and independently_verified
    )
  )
);

create index if not exists master_b404_recalibration_stability_recent_idx
  on app.master_build404_long_horizon_recalibration_stability(recorded_at desc);
create index if not exists master_b404_recovery_effectiveness_recent_idx
  on app.master_build404_renewal_drift_recovery_effectiveness(recorded_at desc);
create index if not exists master_b404_linkage_assurance_recent_idx
  on app.master_build404_linkage_prevention_assurance(recorded_at desc);

alter table app.master_build404_long_horizon_recalibration_stability enable row level security;
alter table app.master_build404_long_horizon_recalibration_stability force row level security;
alter table app.master_build404_renewal_drift_recovery_effectiveness enable row level security;
alter table app.master_build404_renewal_drift_recovery_effectiveness force row level security;
alter table app.master_build404_linkage_prevention_assurance enable row level security;
alter table app.master_build404_linkage_prevention_assurance force row level security;

create policy master_b404_recalibration_runtime_select
  on app.master_build404_long_horizon_recalibration_stability
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b404_recovery_runtime_select
  on app.master_build404_renewal_drift_recovery_effectiveness
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b404_assurance_runtime_select
  on app.master_build404_linkage_prevention_assurance
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_b404_recalibration_protected_insert
  on app.master_build404_long_horizon_recalibration_stability
  for insert to ai_data_protected_runtime with check (true);
create policy master_b404_recovery_protected_insert
  on app.master_build404_renewal_drift_recovery_effectiveness
  for insert to ai_data_protected_runtime with check (true);
create policy master_b404_assurance_protected_insert
  on app.master_build404_linkage_prevention_assurance
  for insert to ai_data_protected_runtime with check (true);

create policy master_b404_recalibration_protected_select
  on app.master_build404_long_horizon_recalibration_stability
  for select to ai_data_protected_runtime using (true);
create policy master_b404_recovery_protected_select
  on app.master_build404_renewal_drift_recovery_effectiveness
  for select to ai_data_protected_runtime using (true);
create policy master_b404_assurance_protected_select
  on app.master_build404_linkage_prevention_assurance
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build404_long_horizon_recalibration_stability,
  app.master_build404_renewal_drift_recovery_effectiveness,
  app.master_build404_linkage_prevention_assurance
to ai_data_runtime;

grant select,insert on
  app.master_build404_long_horizon_recalibration_stability,
  app.master_build404_renewal_drift_recovery_effectiveness,
  app.master_build404_linkage_prevention_assurance
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build404_long_horizon_recalibration_stability,
  app.master_build404_renewal_drift_recovery_effectiveness,
  app.master_build404_linkage_prevention_assurance
from ai_data_runtime;

revoke update,delete on
  app.master_build404_long_horizon_recalibration_stability,
  app.master_build404_renewal_drift_recovery_effectiveness,
  app.master_build404_linkage_prevention_assurance
from ai_data_protected_runtime;
