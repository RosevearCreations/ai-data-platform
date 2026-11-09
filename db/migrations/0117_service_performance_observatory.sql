-- Build 334 — API, Database Query & Dependency Performance Observatory
-- Stores bounded authenticated server timing evidence only. Raw URLs, query
-- strings, SQL text, request/response bodies, customer data and secrets are excluded.

create table if not exists app.service_performance_events (
  event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  sample_kind text not null check (sample_kind in ('api','database')),
  operation_key text not null check (char_length(operation_key) between 1 and 128),
  duration_ms numeric(14,4) not null check (duration_ms >= 0 and duration_ms <= 600000),
  outcome text not null check (outcome in ('succeeded','failed')),
  status_code integer check (status_code is null or status_code between 100 and 599),
  app_pool_total integer not null check (app_pool_total >= 0 and app_pool_total <= 10000),
  app_pool_idle integer not null check (app_pool_idle >= 0 and app_pool_idle <= 10000),
  app_pool_waiting integer not null check (app_pool_waiting >= 0 and app_pool_waiting <= 10000),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (observed_at <= recorded_at + interval '5 minutes')
);

create index if not exists service_performance_actor_recent_idx
  on app.service_performance_events(actor_user_id, recorded_at desc);

create index if not exists service_performance_operation_recent_idx
  on app.service_performance_events(actor_user_id, sample_kind, operation_key, recorded_at desc);

alter table app.service_performance_events enable row level security;

drop policy if exists service_performance_actor_select
  on app.service_performance_events;
create policy service_performance_actor_select
on app.service_performance_events
for select to ai_data_runtime
using (actor_user_id = nullif(current_setting('app.user_id', true), ''));

drop policy if exists service_performance_actor_insert
  on app.service_performance_events;
create policy service_performance_actor_insert
on app.service_performance_events
for insert to ai_data_runtime
with check (actor_user_id = nullif(current_setting('app.user_id', true), ''));

revoke all on app.service_performance_events from public;
grant select, insert on app.service_performance_events to ai_data_runtime;
revoke update, delete on app.service_performance_events from ai_data_runtime;
