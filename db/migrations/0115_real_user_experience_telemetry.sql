-- Build 332 — Real User Monitoring, Interaction Timing & Experience Telemetry
-- Privacy-minimized, append-only authenticated client performance evidence.

create table if not exists app.experience_telemetry_events (
  event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  route_family text not null check (char_length(route_family) between 1 and 180),
  metric_key text not null check (
    metric_key in (
      'navigation_load_ms',
      'fcp_ms',
      'lcp_ms',
      'cls_score',
      'inp_ms',
      'route_transition_ms',
      'long_task_ms'
    )
  ),
  metric_value numeric(14,4) not null check (metric_value >= 0 and metric_value <= 600000),
  unit text not null check (unit in ('ms','score')),
  rating text not null check (rating in ('good','needs-improvement','poor','unknown')),
  sample_kind text not null check (
    sample_kind in ('navigation','paint','layout','interaction','route-transition','long-task')
  ),
  navigation_type text check (
    navigation_type is null or navigation_type in ('navigate','reload','back_forward','prerender','unknown')
  ),
  viewport_class text not null check (viewport_class in ('compact','standard','wide','unknown')),
  visibility_state text not null check (visibility_state in ('visible','hidden','unknown')),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (observed_at <= recorded_at + interval '5 minutes')
);

create index if not exists experience_telemetry_actor_recent_idx
  on app.experience_telemetry_events(actor_user_id, recorded_at desc);

create index if not exists experience_telemetry_metric_recent_idx
  on app.experience_telemetry_events(actor_user_id, metric_key, recorded_at desc);

alter table app.experience_telemetry_events enable row level security;

drop policy if exists experience_telemetry_actor_select
  on app.experience_telemetry_events;
create policy experience_telemetry_actor_select
on app.experience_telemetry_events
for select to ai_data_runtime
using (actor_user_id = nullif(current_setting('app.user_id', true), ''));

drop policy if exists experience_telemetry_actor_insert
  on app.experience_telemetry_events;
create policy experience_telemetry_actor_insert
on app.experience_telemetry_events
for insert to ai_data_runtime
with check (actor_user_id = nullif(current_setting('app.user_id', true), ''));

revoke all on app.experience_telemetry_events from public;
grant select, insert on app.experience_telemetry_events to ai_data_runtime;
revoke update, delete on app.experience_telemetry_events from ai_data_runtime;
