-- Build 402 — Forecast Recalibration Effectiveness,
-- Renewal Timing Optimization & Seven-Application Master/Shell Linkage Continuity Governance.

create table if not exists app.master_build402_forecast_recalibration_effectiveness (
  recalibration_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  recalibration_required boolean not null,
  baseline_absolute_error_bps integer not null check (baseline_absolute_error_bps between 0 and 10000),
  post_recalibration_absolute_error_bps integer not null check (post_recalibration_absolute_error_bps between 0 and 10000),
  observation_window_hours integer not null check (observation_window_hours >= 0),
  sample_count integer not null check (sample_count >= 0),
  recurrence_detected boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  recalibration_state text not null check (
    recalibration_state in ('NOT_REQUIRED','EFFECTIVE','INEFFECTIVE','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    recalibration_state <> 'EFFECTIVE'
    or (
      recalibration_required
      and baseline_absolute_error_bps > 500
      and post_recalibration_absolute_error_bps < baseline_absolute_error_bps
      and post_recalibration_absolute_error_bps <= 500
      and observation_window_hours >= 24
      and sample_count >= 5
      and not recurrence_detected
      and owner_reviewed
      and independently_verified
    )
  ),
  check (
    recalibration_state <> 'NOT_REQUIRED'
    or (
      not recalibration_required
      and baseline_absolute_error_bps <= 500
      and post_recalibration_absolute_error_bps <= 500
      and not recurrence_detected
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build402_renewal_timing_optimization (
  timing_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  advance_renewal_required boolean not null,
  execution_lead_hours integer not null check (execution_lead_hours >= 0),
  threshold_breach_occurred boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  timing_state text not null check (
    timing_state in ('NOT_REQUIRED','OPTIMAL','EARLY','LATE','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    timing_state <> 'OPTIMAL'
    or (
      advance_renewal_required
      and execution_lead_hours between 6 and 24
      and not threshold_breach_occurred
      and owner_reviewed
      and independently_verified
    )
  ),
  check (
    timing_state <> 'NOT_REQUIRED'
    or (
      not advance_renewal_required
      and execution_lead_hours = 0
      and not threshold_breach_occurred
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build402_linkage_continuity (
  continuity_id uuid primary key,
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
  self_identity_matches boolean not null,
  canonical_topology_matches boolean not null,
  validation_authority_matches boolean not null,
  authority_transfer_false boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  continuity_state text not null check (
    continuity_state in ('CURRENT','DRIFTED','STALE','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    continuity_state <> 'CURRENT'
    or (
      self_identity_matches
      and canonical_topology_matches
      and validation_authority_matches
      and authority_transfer_false
      and owner_reviewed
      and independently_verified
    )
  )
);

create index if not exists master_b402_recalibration_recent_idx
  on app.master_build402_forecast_recalibration_effectiveness(recorded_at desc);
create index if not exists master_b402_timing_recent_idx
  on app.master_build402_renewal_timing_optimization(recorded_at desc);
create index if not exists master_b402_linkage_recent_idx
  on app.master_build402_linkage_continuity(recorded_at desc);

alter table app.master_build402_forecast_recalibration_effectiveness enable row level security;
alter table app.master_build402_forecast_recalibration_effectiveness force row level security;
alter table app.master_build402_renewal_timing_optimization enable row level security;
alter table app.master_build402_renewal_timing_optimization force row level security;
alter table app.master_build402_linkage_continuity enable row level security;
alter table app.master_build402_linkage_continuity force row level security;

create policy master_b402_recalibration_runtime_select
  on app.master_build402_forecast_recalibration_effectiveness
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b402_timing_runtime_select
  on app.master_build402_renewal_timing_optimization
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b402_linkage_runtime_select
  on app.master_build402_linkage_continuity
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_b402_recalibration_protected_insert
  on app.master_build402_forecast_recalibration_effectiveness
  for insert to ai_data_protected_runtime with check (true);
create policy master_b402_timing_protected_insert
  on app.master_build402_renewal_timing_optimization
  for insert to ai_data_protected_runtime with check (true);
create policy master_b402_linkage_protected_insert
  on app.master_build402_linkage_continuity
  for insert to ai_data_protected_runtime with check (true);

create policy master_b402_recalibration_protected_select
  on app.master_build402_forecast_recalibration_effectiveness
  for select to ai_data_protected_runtime using (true);
create policy master_b402_timing_protected_select
  on app.master_build402_renewal_timing_optimization
  for select to ai_data_protected_runtime using (true);
create policy master_b402_linkage_protected_select
  on app.master_build402_linkage_continuity
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build402_forecast_recalibration_effectiveness,
  app.master_build402_renewal_timing_optimization,
  app.master_build402_linkage_continuity
to ai_data_runtime;

grant select,insert on
  app.master_build402_forecast_recalibration_effectiveness,
  app.master_build402_renewal_timing_optimization,
  app.master_build402_linkage_continuity
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build402_forecast_recalibration_effectiveness,
  app.master_build402_renewal_timing_optimization,
  app.master_build402_linkage_continuity
from ai_data_runtime;

revoke update,delete on
  app.master_build402_forecast_recalibration_effectiveness,
  app.master_build402_renewal_timing_optimization,
  app.master_build402_linkage_continuity
from ai_data_protected_runtime;
