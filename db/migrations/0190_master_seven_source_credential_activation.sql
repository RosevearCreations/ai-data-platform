create table if not exists app.master_build427_source_activation_events(
 event_id uuid primary key,
 app_id text not null check(app_id in('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
 credential_env_key text not null check(length(credential_env_key) between 8 and 120),
 credential_present boolean not null,
 origin text null,
 origin_reachable boolean not null,
 telemetry_status integer null check(telemetry_status is null or telemetry_status between 100 and 599),
 telemetry_latency_ms numeric null check(telemetry_latency_ms is null or telemetry_latency_ms>=0),
 telemetry_verified boolean not null,
 source_commit text null check(source_commit is null or source_commit~'^[a-f0-9]{40}$'),
 detail text not null check(length(detail)<=500),
 metrics jsonb not null default '{}'::jsonb,
 observed_at timestamptz not null default now()
);
create index if not exists master_build427_activation_app_time_idx on app.master_build427_source_activation_events(app_id,observed_at desc);
create table if not exists app.master_build427_sweep_receipts(
 sweep_id uuid primary key,
 mode text not null check(mode in('OPERATOR','CRON')),
 observed_sources integer not null check(observed_sources between 0 and 7),
 credentialed_sources integer not null check(credentialed_sources between 0 and 7),
 reachable_sources integer not null check(reachable_sources between 0 and 7),
 verified_sources integer not null check(verified_sources between 0 and 7),
 metrics jsonb not null default '{}'::jsonb,
 observed_at timestamptz not null default now()
);
alter table app.master_build427_source_activation_events enable row level security;
alter table app.master_build427_source_activation_events force row level security;
alter table app.master_build427_sweep_receipts enable row level security;
alter table app.master_build427_sweep_receipts force row level security;
create policy b427_activation_user_read on app.master_build427_source_activation_events for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b427_activation_user_insert on app.master_build427_source_activation_events for insert to ai_data_runtime with check(app.current_master_sysop_role() in('owner','operator'));
create policy b427_sweep_user_read on app.master_build427_sweep_receipts for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b427_sweep_user_insert on app.master_build427_sweep_receipts for insert to ai_data_runtime with check(app.current_master_sysop_role() in('owner','operator'));
create policy b427_activation_protected_read on app.master_build427_source_activation_events for select to ai_data_protected_runtime using(true);
create policy b427_activation_protected_insert on app.master_build427_source_activation_events for insert to ai_data_protected_runtime with check(true);
create policy b427_sweep_protected_read on app.master_build427_sweep_receipts for select to ai_data_protected_runtime using(true);
create policy b427_sweep_protected_insert on app.master_build427_sweep_receipts for insert to ai_data_protected_runtime with check(true);
grant select,insert on app.master_build427_source_activation_events,app.master_build427_sweep_receipts to ai_data_runtime,ai_data_protected_runtime;
revoke update,delete on app.master_build427_source_activation_events,app.master_build427_sweep_receipts from ai_data_runtime,ai_data_protected_runtime;
create or replace view app.master_build427_continuous_rollups with (security_invoker=true) as
select date_bin(interval '15 minutes',observed_at,timestamptz '2001-01-01 00:00:00+00') as bucket_start,
 count(*)::integer as observations,
 count(distinct app_id)::integer as observed_sources,
 count(*) filter(where origin_reachable)::integer as reachable_observations,
 count(*) filter(where telemetry_verified)::integer as verified_observations,
 count(distinct app_id) filter(where telemetry_verified)::integer as verified_sources,
 round(avg(telemetry_latency_ms) filter(where telemetry_latency_ms is not null),1) as average_telemetry_latency_ms,
 percentile_cont(0.95) within group(order by telemetry_latency_ms) filter(where telemetry_latency_ms is not null) as telemetry_latency_p95_ms
from app.master_build427_source_activation_events
where observed_at>=now()-interval '7 days'
group by 1;
grant select on app.master_build427_continuous_rollups to ai_data_runtime,ai_data_protected_runtime;
