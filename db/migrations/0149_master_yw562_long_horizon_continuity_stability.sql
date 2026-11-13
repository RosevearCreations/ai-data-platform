-- Build 385 — Long-Horizon Continuity Stability,
-- Recurrence Trend Correlation & Three-Master Preventive-Control Effectiveness Review.

create table if not exists app.master_build385_long_horizon_stability_samples (
  sample_id uuid primary key,
  build384_recurrence_id uuid null
    references app.master_build384_recurrent_drift_events(recurrence_id) on delete restrict,
  connection_state text not null check (connection_state in ('CONNECTED','DISCONNECTED_HOLD')),
  recurrence_detected boolean not null,
  master_receipts_healthy boolean not null,
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create table if not exists app.master_build385_recurrence_trend_events (
  trend_event_id uuid primary key,
  recurrence_count integer not null check (recurrence_count >= 0),
  stability_ratio numeric(6,5) not null check (stability_ratio between 0 and 1),
  trend_state text not null check (
    trend_state in ('NO_RECURRENCE_TREND','ISOLATED_RECURRENCE','RECURRING_DRIFT_TREND')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create table if not exists app.master_build385_preventive_control_effectiveness_reviews (
  review_id uuid primary key,
  control_id text not null,
  ai_hub_effective boolean not null,
  comms_effective boolean not null,
  controller_effective boolean not null,
  independently_verified boolean not null,
  effectiveness_state text not null check (
    effectiveness_state in ('REVIEW_REQUIRED','CONTROL_GAPS_DETECTED','THREE_MASTER_CONTROLS_EFFECTIVE')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    effectiveness_state <> 'THREE_MASTER_CONTROLS_EFFECTIVE'
    or (
      ai_hub_effective
      and comms_effective
      and controller_effective
      and independently_verified
    )
  )
);

create index if not exists master_build385_stability_recent_idx
  on app.master_build385_long_horizon_stability_samples(recorded_at desc);
create index if not exists master_build385_trend_recent_idx
  on app.master_build385_recurrence_trend_events(recorded_at desc);
create index if not exists master_build385_controls_recent_idx
  on app.master_build385_preventive_control_effectiveness_reviews(recorded_at desc);

alter table app.master_build385_long_horizon_stability_samples enable row level security;
alter table app.master_build385_long_horizon_stability_samples force row level security;
alter table app.master_build385_recurrence_trend_events enable row level security;
alter table app.master_build385_recurrence_trend_events force row level security;
alter table app.master_build385_preventive_control_effectiveness_reviews enable row level security;
alter table app.master_build385_preventive_control_effectiveness_reviews force row level security;

create policy master_build385_stability_runtime_select
  on app.master_build385_long_horizon_stability_samples
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_build385_trend_runtime_select
  on app.master_build385_recurrence_trend_events
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_build385_controls_runtime_select
  on app.master_build385_preventive_control_effectiveness_reviews
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_build385_stability_protected_insert
  on app.master_build385_long_horizon_stability_samples
  for insert to ai_data_protected_runtime with check (true);
create policy master_build385_trend_protected_insert
  on app.master_build385_recurrence_trend_events
  for insert to ai_data_protected_runtime with check (true);
create policy master_build385_controls_protected_insert
  on app.master_build385_preventive_control_effectiveness_reviews
  for insert to ai_data_protected_runtime
  with check (
    effectiveness_state <> 'THREE_MASTER_CONTROLS_EFFECTIVE'
    or (
      ai_hub_effective
      and comms_effective
      and controller_effective
      and independently_verified
    )
  );

create policy master_build385_stability_protected_select
  on app.master_build385_long_horizon_stability_samples
  for select to ai_data_protected_runtime using (true);
create policy master_build385_trend_protected_select
  on app.master_build385_recurrence_trend_events
  for select to ai_data_protected_runtime using (true);
create policy master_build385_controls_protected_select
  on app.master_build385_preventive_control_effectiveness_reviews
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build385_long_horizon_stability_samples,
  app.master_build385_recurrence_trend_events,
  app.master_build385_preventive_control_effectiveness_reviews
to ai_data_runtime;

grant select,insert on
  app.master_build385_long_horizon_stability_samples,
  app.master_build385_recurrence_trend_events,
  app.master_build385_preventive_control_effectiveness_reviews
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build385_long_horizon_stability_samples,
  app.master_build385_recurrence_trend_events,
  app.master_build385_preventive_control_effectiveness_reviews
from ai_data_runtime;

revoke update,delete on
  app.master_build385_long_horizon_stability_samples,
  app.master_build385_recurrence_trend_events,
  app.master_build385_preventive_control_effectiveness_reviews
from ai_data_protected_runtime;
