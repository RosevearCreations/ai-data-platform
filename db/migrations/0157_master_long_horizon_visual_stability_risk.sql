-- Build 394 — Long-Horizon Visual Stability Trend Correlation,
-- Preventive-Control Degradation Detection & Cross-Shell Recurrence Risk Forecasting.

create table if not exists app.master_build394_visual_stability_trend_windows (
  window_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  theme_version text not null check (theme_version='rosevear-master-instrument.v1'),
  window_start timestamptz not null,
  window_end timestamptz not null,
  sample_count integer not null check (sample_count >= 2),
  stable_ratio numeric(5,4) not null check (stable_ratio between 0 and 1),
  recurrence_count integer not null check (recurrence_count >= 0),
  trend_state text not null check (
    trend_state in ('IMPROVING','STABLE','DEGRADING','HOLD')
  ),
  independently_observed boolean not null,
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  recorded_at timestamptz not null default now(),
  check (window_end > window_start),
  check (extract(epoch from (window_end-window_start)) >= 86400)
);

create table if not exists app.master_build394_preventive_control_health_reviews (
  review_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  controls_expected integer not null check (controls_expected >= 1),
  controls_healthy integer not null check (
    controls_healthy >= 0 and controls_healthy <= controls_expected
  ),
  degradation_signals integer not null check (degradation_signals >= 0),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  control_state text not null check (
    control_state in ('HEALTHY','DEGRADED','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    control_state <> 'HEALTHY'
    or (
      controls_healthy=controls_expected
      and degradation_signals=0
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build394_recurrence_risk_forecasts (
  forecast_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  horizon_hours integer not null check (horizon_hours >= 24),
  evidence_points integer not null check (evidence_points >= 3),
  recurrence_probability_bps integer not null check (
    recurrence_probability_bps between 0 and 10000
  ),
  risk_band text not null check (
    risk_band in ('LOW','MODERATE','HIGH','CRITICAL')
  ),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  forecast_state text not null check (
    forecast_state in ('VERIFIED','HOLD','REJECTED')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    forecast_state <> 'VERIFIED'
    or (owner_reviewed and independently_verified)
  )
);

create index if not exists master_b394_trend_recent_idx
  on app.master_build394_visual_stability_trend_windows(recorded_at desc);
create index if not exists master_b394_control_health_recent_idx
  on app.master_build394_preventive_control_health_reviews(recorded_at desc);
create index if not exists master_b394_risk_forecast_recent_idx
  on app.master_build394_recurrence_risk_forecasts(recorded_at desc);

alter table app.master_build394_visual_stability_trend_windows enable row level security;
alter table app.master_build394_visual_stability_trend_windows force row level security;
alter table app.master_build394_preventive_control_health_reviews enable row level security;
alter table app.master_build394_preventive_control_health_reviews force row level security;
alter table app.master_build394_recurrence_risk_forecasts enable row level security;
alter table app.master_build394_recurrence_risk_forecasts force row level security;

create policy master_b394_trend_runtime_select
  on app.master_build394_visual_stability_trend_windows
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b394_control_runtime_select
  on app.master_build394_preventive_control_health_reviews
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b394_forecast_runtime_select
  on app.master_build394_recurrence_risk_forecasts
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_b394_trend_protected_insert
  on app.master_build394_visual_stability_trend_windows
  for insert to ai_data_protected_runtime with check (true);
create policy master_b394_control_protected_insert
  on app.master_build394_preventive_control_health_reviews
  for insert to ai_data_protected_runtime
  with check (
    control_state <> 'HEALTHY'
    or (
      controls_healthy=controls_expected
      and degradation_signals=0
      and owner_reviewed
      and independently_verified
    )
  );
create policy master_b394_forecast_protected_insert
  on app.master_build394_recurrence_risk_forecasts
  for insert to ai_data_protected_runtime
  with check (
    forecast_state <> 'VERIFIED'
    or (owner_reviewed and independently_verified)
  );

create policy master_b394_trend_protected_select
  on app.master_build394_visual_stability_trend_windows
  for select to ai_data_protected_runtime using (true);
create policy master_b394_control_protected_select
  on app.master_build394_preventive_control_health_reviews
  for select to ai_data_protected_runtime using (true);
create policy master_b394_forecast_protected_select
  on app.master_build394_recurrence_risk_forecasts
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build394_visual_stability_trend_windows,
  app.master_build394_preventive_control_health_reviews,
  app.master_build394_recurrence_risk_forecasts
to ai_data_runtime;

grant select,insert on
  app.master_build394_visual_stability_trend_windows,
  app.master_build394_preventive_control_health_reviews,
  app.master_build394_recurrence_risk_forecasts
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build394_visual_stability_trend_windows,
  app.master_build394_preventive_control_health_reviews,
  app.master_build394_recurrence_risk_forecasts
from ai_data_runtime;

revoke update,delete on
  app.master_build394_visual_stability_trend_windows,
  app.master_build394_preventive_control_health_reviews,
  app.master_build394_recurrence_risk_forecasts
from ai_data_protected_runtime;
