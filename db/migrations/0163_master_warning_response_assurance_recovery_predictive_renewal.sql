-- Build 400 — Confidence Early-Warning Response Effectiveness,
-- Long-Horizon Assurance Degradation Recovery & Cross-Shell Predictive Renewal Governance.

create table if not exists app.master_build400_early_warning_response_effectiveness (
  response_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  warning_triggered boolean not null,
  pre_response_projected_confidence_bps integer not null check (pre_response_projected_confidence_bps between 0 and 10000),
  post_response_observed_confidence_bps integer not null check (post_response_observed_confidence_bps between 0 and 10000),
  response_window_hours integer not null check (response_window_hours >= 0),
  sample_count integer not null check (sample_count >= 0),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  response_state text not null check (
    response_state in ('NOT_REQUIRED','EFFECTIVE','INEFFECTIVE','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    not warning_triggered
    or (
      response_window_hours >= 24
      and sample_count >= 3
    )
  ),
  check (
    response_state <> 'EFFECTIVE'
    or (
      warning_triggered
      and greatest(0, post_response_observed_confidence_bps-pre_response_projected_confidence_bps) >= 250
      and post_response_observed_confidence_bps >= 7000
      and owner_reviewed
      and independently_verified
    )
  ),
  check (
    response_state <> 'NOT_REQUIRED'
    or (
      not warning_triggered
      and post_response_observed_confidence_bps >= 7000
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build400_assurance_degradation_recovery (
  recovery_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  degradation_detected boolean not null,
  degraded_renewal_count integer not null check (degraded_renewal_count >= 0),
  recovered_renewal_count integer not null check (recovered_renewal_count >= 0),
  recovery_window_hours integer not null check (recovery_window_hours >= 0),
  missed_renewal_count integer not null check (missed_renewal_count >= 0),
  evidence_current boolean not null,
  recurrence_detected boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  recovery_state text not null check (
    recovery_state in ('NOT_REQUIRED','RECOVERED','DEGRADED','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    not degradation_detected
    or recovery_window_hours >= 72
  ),
  check (
    recovery_state <> 'RECOVERED'
    or (
      degradation_detected
      and degraded_renewal_count >= 1
      and recovered_renewal_count >= degraded_renewal_count
      and recovery_window_hours >= 72
      and missed_renewal_count = 0
      and evidence_current
      and not recurrence_detected
      and owner_reviewed
      and independently_verified
    )
  ),
  check (
    recovery_state <> 'NOT_REQUIRED'
    or (
      not degradation_detected
      and degraded_renewal_count = 0
      and recovered_renewal_count = 0
      and missed_renewal_count = 0
      and evidence_current
      and not recurrence_detected
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build400_predictive_renewal_governance (
  prediction_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  current_confidence_bps integer not null check (current_confidence_bps between 0 and 10000),
  projected_confidence_bps integer not null check (projected_confidence_bps between 0 and 10000),
  forecast_horizon_hours integer not null check (forecast_horizon_hours >= 72),
  sample_count integer not null check (sample_count >= 5),
  evidence_points integer not null check (evidence_points >= 5),
  advance_renewal_scheduled boolean not null,
  owner_approved boolean not null,
  independently_verified boolean not null,
  renewal_state text not null check (
    renewal_state in ('CURRENT','ADVANCE_RENEWAL','HOLD','REJECTED')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    renewal_state <> 'CURRENT'
    or (
      projected_confidence_bps >= 7000
      and greatest(0, current_confidence_bps-projected_confidence_bps) <= 500
      and not advance_renewal_scheduled
      and owner_approved
      and independently_verified
    )
  ),
  check (
    renewal_state <> 'ADVANCE_RENEWAL'
    or (
      greatest(0, current_confidence_bps-projected_confidence_bps) > 500
      or projected_confidence_bps < 7000
    )
    and advance_renewal_scheduled
    and owner_approved
    and independently_verified
  )
);

create index if not exists master_b400_warning_response_recent_idx
  on app.master_build400_early_warning_response_effectiveness(recorded_at desc);
create index if not exists master_b400_assurance_recovery_recent_idx
  on app.master_build400_assurance_degradation_recovery(recorded_at desc);
create index if not exists master_b400_predictive_renewal_recent_idx
  on app.master_build400_predictive_renewal_governance(recorded_at desc);

alter table app.master_build400_early_warning_response_effectiveness enable row level security;
alter table app.master_build400_early_warning_response_effectiveness force row level security;
alter table app.master_build400_assurance_degradation_recovery enable row level security;
alter table app.master_build400_assurance_degradation_recovery force row level security;
alter table app.master_build400_predictive_renewal_governance enable row level security;
alter table app.master_build400_predictive_renewal_governance force row level security;

create policy master_b400_response_runtime_select
  on app.master_build400_early_warning_response_effectiveness
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b400_recovery_runtime_select
  on app.master_build400_assurance_degradation_recovery
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b400_predictive_runtime_select
  on app.master_build400_predictive_renewal_governance
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_b400_response_protected_insert
  on app.master_build400_early_warning_response_effectiveness
  for insert to ai_data_protected_runtime with check (true);
create policy master_b400_recovery_protected_insert
  on app.master_build400_assurance_degradation_recovery
  for insert to ai_data_protected_runtime with check (true);
create policy master_b400_predictive_protected_insert
  on app.master_build400_predictive_renewal_governance
  for insert to ai_data_protected_runtime with check (true);

create policy master_b400_response_protected_select
  on app.master_build400_early_warning_response_effectiveness
  for select to ai_data_protected_runtime using (true);
create policy master_b400_recovery_protected_select
  on app.master_build400_assurance_degradation_recovery
  for select to ai_data_protected_runtime using (true);
create policy master_b400_predictive_protected_select
  on app.master_build400_predictive_renewal_governance
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build400_early_warning_response_effectiveness,
  app.master_build400_assurance_degradation_recovery,
  app.master_build400_predictive_renewal_governance
to ai_data_runtime;

grant select,insert on
  app.master_build400_early_warning_response_effectiveness,
  app.master_build400_assurance_degradation_recovery,
  app.master_build400_predictive_renewal_governance
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build400_early_warning_response_effectiveness,
  app.master_build400_assurance_degradation_recovery,
  app.master_build400_predictive_renewal_governance
from ai_data_runtime;

revoke update,delete on
  app.master_build400_early_warning_response_effectiveness,
  app.master_build400_assurance_degradation_recovery,
  app.master_build400_predictive_renewal_governance
from ai_data_protected_runtime;
