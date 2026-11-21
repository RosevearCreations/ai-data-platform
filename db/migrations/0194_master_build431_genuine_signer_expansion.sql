create table if not exists app.master_build431_sweep_runs(
 sweep_id uuid primary key,
 mode text not null check(mode in('OPERATOR','CRON','PRODUCTION_BUILD')),
 observed_sources integer not null check(observed_sources between 0 and 7),
 verified_sources integer not null check(verified_sources between 0 and 7),
 classified_sources integer not null check(classified_sources between 0 and 7),
 held_sources integer not null check(held_sources between 0 and 7),
 state text not null check(length(state) between 3 and 120),
 observed_at timestamptz not null default now()
);

create table if not exists app.master_build431_source_observations(
 observation_id uuid primary key,
 sweep_id uuid not null references app.master_build431_sweep_runs(sweep_id),
 app_id text not null check(app_id in('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
 provider text not null check(provider in('VERCEL','CLOUDFLARE','ORIGINAL_HOST')),
 challenge_sha256 text not null check(challenge_sha256~'^[a-f0-9]{64}$'),
 protocol_version text null check(protocol_version is null or protocol_version in('1.1','1.2')),
 challenge_verified boolean not null,
 source_receipt_id uuid null references app.master_build423_sysop_telemetry_receipts(receipt_id),
 source_commit text null check(source_commit is null or source_commit~'^[a-f0-9]{40}$'),
 origin text null,
 origin_reachable boolean not null,
 credential_present boolean not null,
 telemetry_status integer null check(telemetry_status is null or telemetry_status between 100 and 599),
 telemetry_latency_ms numeric null check(telemetry_latency_ms is null or telemetry_latency_ms>=0),
 state text not null check(length(state) between 3 and 120),
 hold_reason text null check(hold_reason is null or length(hold_reason)<=160),
 detail text not null check(length(detail)<=600),
 observed_at timestamptz not null default now(),
 unique(sweep_id,app_id),
 unique(source_receipt_id)
);
create index if not exists master_build431_source_time_idx on app.master_build431_source_observations(app_id,observed_at desc);

alter table app.master_build431_sweep_runs enable row level security;
alter table app.master_build431_sweep_runs force row level security;
alter table app.master_build431_source_observations enable row level security;
alter table app.master_build431_source_observations force row level security;

create policy b431_sweep_user_read on app.master_build431_sweep_runs for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b431_sweep_user_insert on app.master_build431_sweep_runs for insert to ai_data_runtime with check(app.current_master_sysop_role() in('owner','operator'));
create policy b431_obs_user_read on app.master_build431_source_observations for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b431_obs_user_insert on app.master_build431_source_observations for insert to ai_data_runtime with check(app.current_master_sysop_role() in('owner','operator'));

create policy b431_sweep_protected_read on app.master_build431_sweep_runs for select to ai_data_protected_runtime using(true);
create policy b431_sweep_protected_insert on app.master_build431_sweep_runs for insert to ai_data_protected_runtime with check(true);
create policy b431_obs_protected_read on app.master_build431_source_observations for select to ai_data_protected_runtime using(true);
create policy b431_obs_protected_insert on app.master_build431_source_observations for insert to ai_data_protected_runtime with check(true);

grant select,insert on app.master_build431_sweep_runs,app.master_build431_source_observations to ai_data_runtime,ai_data_protected_runtime;
revoke update,delete on app.master_build431_sweep_runs,app.master_build431_source_observations from ai_data_runtime,ai_data_protected_runtime;

create or replace view app.master_build431_latest_source_status with (security_invoker=true) as
select distinct on(app_id) * from app.master_build431_source_observations order by app_id,observed_at desc;
grant select on app.master_build431_latest_source_status to ai_data_runtime,ai_data_protected_runtime;
