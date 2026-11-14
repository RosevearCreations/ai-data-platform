-- Build 401 — Predictive Renewal Execution Effectiveness,
-- Post-Renewal Confidence Restoration & Cross-Shell Forecast Accuracy Governance.

create table if not exists app.master_build401_predictive_renewal_execution (
  execution_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  advance_renewal_required boolean not null,
  execution_lead_hours integer not null check (execution_lead_hours >= 0),
  execution_evidence_current boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  execution_state text not null check (
    execution_state in ('NOT_REQUIRED','EXECUTED','LATE','FAILED','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    execution_state <> 'EXECUTED'
    or (
      advance_renewal_required
      and execution_lead_hours >= 6
      and execution_evidence_current
      and owner_reviewed
      and independently_verified
    )
  ),
  check (
    execution_state <> 'NOT_REQUIRED'
    or (
      not advance_renewal_required
      and execution_lead_hours = 0
      and execution_evidence_current
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build401_post_renewal_confidence_restoration (
  restoration_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  renewal_executed boolean not null,
  pre_renewal_confidence_bps integer not null check (pre_renewal_confidence_bps between 0 and 10000),
  post_renewal_confidence_bps integer not null check (post_renewal_confidence_bps between 0 and 10000),
  observation_window_hours integer not null check (observation_window_hours >= 0),
  sample_count integer not null check (sample_count >= 0),
  recurrence_detected boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  restoration_state text not null check (
    restoration_state in ('NOT_REQUIRED','RESTORED','NOT_RESTORED','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    not renewal_executed
    or (
      observation_window_hours >= 24
      and sample_count >= 3
    )
  ),
  check (
    restoration_state <> 'RESTORED'
    or (
      renewal_executed
      and greatest(0, post_renewal_confidence_bps-pre_renewal_confidence_bps) >= 250
      and post_renewal_confidence_bps >= 7000
      and not recurrence_detected
      and owner_reviewed
      and independently_verified
    )
  ),
  check (
    restoration_state <> 'NOT_REQUIRED'
    or (
      not renewal_executed
      and pre_renewal_confidence_bps = post_renewal_confidence_bps
      and post_renewal_confidence_bps >= 7000
      and not recurrence_detected
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build401_forecast_accuracy_governance (
  forecast_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  predicted_confidence_bps integer not null check (predicted_confidence_bps between 0 and 10000),
  observed_confidence_bps integer not null check (observed_confidence_bps between 0 and 10000),
  absolute_error_bps integer not null check (absolute_error_bps between 0 and 10000),
  forecast_horizon_hours integer not null check (forecast_horizon_hours >= 72),
  sample_count integer not null check (sample_count >= 5),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  accuracy_state text not null check (
    accuracy_state in ('ACCURATE','TOLERABLE','RECALIBRATE','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    absolute_error_bps = abs(predicted_confidence_bps-observed_confidence_bps)
  ),
  check (
    accuracy_state not in ('ACCURATE','TOLERABLE')
    or (
      absolute_error_bps <= 500
      and owner_reviewed
      and independently_verified
    )
  )
);

create index if not exists master_b401_execution_recent_idx
  on app.master_build401_predictive_renewal_execution(recorded_at desc);
create index if not exists master_b401_restoration_recent_idx
  on app.master_build401_post_renewal_confidence_restoration(recorded_at desc);
create index if not exists master_b401_forecast_accuracy_recent_idx
  on app.master_build401_forecast_accuracy_governance(recorded_at desc);

alter table app.master_build401_predictive_renewal_execution enable row level security;
alter table app.master_build401_predictive_renewal_execution force row level security;
alter table app.master_build401_post_renewal_confidence_restoration enable row level security;
alter table app.master_build401_post_renewal_confidence_restoration force row level security;
alter table app.master_build401_forecast_accuracy_governance enable row level security;
alter table app.master_build401_forecast_accuracy_governance force row level security;

create policy master_b401_execution_runtime_select
  on app.master_build401_predictive_renewal_execution
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b401_restoration_runtime_select
  on app.master_build401_post_renewal_confidence_restoration
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b401_accuracy_runtime_select
  on app.master_build401_forecast_accuracy_governance
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_b401_execution_protected_insert
  on app.master_build401_predictive_renewal_execution
  for insert to ai_data_protected_runtime with check (true);
create policy master_b401_restoration_protected_insert
  on app.master_build401_post_renewal_confidence_restoration
  for insert to ai_data_protected_runtime with check (true);
create policy master_b401_accuracy_protected_insert
  on app.master_build401_forecast_accuracy_governance
  for insert to ai_data_protected_runtime with check (true);

create policy master_b401_execution_protected_select
  on app.master_build401_predictive_renewal_execution
  for select to ai_data_protected_runtime using (true);
create policy master_b401_restoration_protected_select
  on app.master_build401_post_renewal_confidence_restoration
  for select to ai_data_protected_runtime using (true);
create policy master_b401_accuracy_protected_select
  on app.master_build401_forecast_accuracy_governance
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build401_predictive_renewal_execution,
  app.master_build401_post_renewal_confidence_restoration,
  app.master_build401_forecast_accuracy_governance
to ai_data_runtime;

grant select,insert on
  app.master_build401_predictive_renewal_execution,
  app.master_build401_post_renewal_confidence_restoration,
  app.master_build401_forecast_accuracy_governance
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build401_predictive_renewal_execution,
  app.master_build401_post_renewal_confidence_restoration,
  app.master_build401_forecast_accuracy_governance
from ai_data_runtime;

revoke update,delete on
  app.master_build401_predictive_renewal_execution,
  app.master_build401_post_renewal_confidence_restoration,
  app.master_build401_forecast_accuracy_governance
from ai_data_protected_runtime;
