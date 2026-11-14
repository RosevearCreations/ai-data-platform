-- Build 403 — Recalibration Persistence Validation,
-- Renewal Timing Drift Recovery & Seven-Application Linkage Recurrence Prevention Governance.

create table if not exists app.master_build403_recalibration_persistence_validation (
  persistence_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  observation_window_hours integer not null check (observation_window_hours >= 72),
  sample_count integer not null check (sample_count >= 7),
  maximum_absolute_error_bps integer not null check (maximum_absolute_error_bps between 0 and 500),
  latest_absolute_error_bps integer not null check (latest_absolute_error_bps between 0 and 500),
  recurrence_detected boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  persistence_state text not null check (
    persistence_state in ('PERSISTENT','DRIFTED','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    persistence_state <> 'PERSISTENT'
    or (
      not recurrence_detected
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build403_renewal_timing_drift_recovery (
  recovery_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  drift_detected boolean not null,
  pre_recovery_lead_hours integer not null check (pre_recovery_lead_hours >= 0),
  post_recovery_lead_hours integer not null check (post_recovery_lead_hours >= 0),
  recovery_window_hours integer not null check (recovery_window_hours >= 0),
  sample_count integer not null check (sample_count >= 1),
  threshold_breach_occurred boolean not null,
  recurrence_detected boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  recovery_state text not null check (
    recovery_state in ('NOT_REQUIRED','RECOVERED','UNRECOVERED','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    recovery_state <> 'RECOVERED'
    or (
      drift_detected
      and (pre_recovery_lead_hours < 6 or pre_recovery_lead_hours > 24)
      and post_recovery_lead_hours between 6 and 24
      and recovery_window_hours >= 24
      and sample_count >= 3
      and not threshold_breach_occurred
      and not recurrence_detected
      and owner_reviewed
      and independently_verified
    )
  ),
  check (
    recovery_state <> 'NOT_REQUIRED'
    or (
      not drift_detected
      and (
        (pre_recovery_lead_hours = 0 and post_recovery_lead_hours = 0)
        or (
          pre_recovery_lead_hours between 6 and 24
          and post_recovery_lead_hours = pre_recovery_lead_hours
        )
      )
      and not threshold_breach_occurred
      and not recurrence_detected
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build403_linkage_recurrence_prevention (
  prevention_id uuid primary key,
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
  observation_window_hours integer not null check (observation_window_hours >= 72),
  sample_count integer not null check (sample_count >= 3),
  self_identity_matches boolean not null,
  canonical_topology_matches boolean not null,
  validation_authority_matches boolean not null,
  linkage_recurrence_detected boolean not null,
  stale_evidence_recurrence_detected boolean not null,
  authority_transfer_detected boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  prevention_state text not null check (
    prevention_state in ('PREVENTED','RECURRENCE','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    prevention_state <> 'PREVENTED'
    or (
      self_identity_matches
      and canonical_topology_matches
      and validation_authority_matches
      and not linkage_recurrence_detected
      and not stale_evidence_recurrence_detected
      and not authority_transfer_detected
      and owner_reviewed
      and independently_verified
    )
  )
);

create index if not exists master_b403_persistence_recent_idx
  on app.master_build403_recalibration_persistence_validation(recorded_at desc);
create index if not exists master_b403_timing_recovery_recent_idx
  on app.master_build403_renewal_timing_drift_recovery(recorded_at desc);
create index if not exists master_b403_linkage_prevention_recent_idx
  on app.master_build403_linkage_recurrence_prevention(recorded_at desc);

alter table app.master_build403_recalibration_persistence_validation enable row level security;
alter table app.master_build403_recalibration_persistence_validation force row level security;
alter table app.master_build403_renewal_timing_drift_recovery enable row level security;
alter table app.master_build403_renewal_timing_drift_recovery force row level security;
alter table app.master_build403_linkage_recurrence_prevention enable row level security;
alter table app.master_build403_linkage_recurrence_prevention force row level security;

create policy master_b403_persistence_runtime_select
  on app.master_build403_recalibration_persistence_validation
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b403_timing_recovery_runtime_select
  on app.master_build403_renewal_timing_drift_recovery
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b403_linkage_prevention_runtime_select
  on app.master_build403_linkage_recurrence_prevention
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_b403_persistence_protected_insert
  on app.master_build403_recalibration_persistence_validation
  for insert to ai_data_protected_runtime with check (true);
create policy master_b403_timing_recovery_protected_insert
  on app.master_build403_renewal_timing_drift_recovery
  for insert to ai_data_protected_runtime with check (true);
create policy master_b403_linkage_prevention_protected_insert
  on app.master_build403_linkage_recurrence_prevention
  for insert to ai_data_protected_runtime with check (true);

create policy master_b403_persistence_protected_select
  on app.master_build403_recalibration_persistence_validation
  for select to ai_data_protected_runtime using (true);
create policy master_b403_timing_recovery_protected_select
  on app.master_build403_renewal_timing_drift_recovery
  for select to ai_data_protected_runtime using (true);
create policy master_b403_linkage_prevention_protected_select
  on app.master_build403_linkage_recurrence_prevention
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build403_recalibration_persistence_validation,
  app.master_build403_renewal_timing_drift_recovery,
  app.master_build403_linkage_recurrence_prevention
to ai_data_runtime;

grant select,insert on
  app.master_build403_recalibration_persistence_validation,
  app.master_build403_renewal_timing_drift_recovery,
  app.master_build403_linkage_recurrence_prevention
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build403_recalibration_persistence_validation,
  app.master_build403_renewal_timing_drift_recovery,
  app.master_build403_linkage_recurrence_prevention
from ai_data_runtime;

revoke update,delete on
  app.master_build403_recalibration_persistence_validation,
  app.master_build403_renewal_timing_drift_recovery,
  app.master_build403_linkage_recurrence_prevention
from ai_data_protected_runtime;
