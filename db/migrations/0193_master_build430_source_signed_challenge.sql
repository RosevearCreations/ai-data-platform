alter table app.master_build423_sysop_telemetry_receipts
 add column if not exists protocol_version text not null default '1.1',
 add column if not exists challenge_sha256 text null,
 add column if not exists challenge_verified boolean not null default false;

do $$ begin
 if not exists(select 1 from pg_constraint where conname='master_build423_protocol_version_ck') then
  alter table app.master_build423_sysop_telemetry_receipts add constraint master_build423_protocol_version_ck check(protocol_version in('1.1','1.2'));
 end if;
 if not exists(select 1 from pg_constraint where conname='master_build423_challenge_sha_ck') then
  alter table app.master_build423_sysop_telemetry_receipts add constraint master_build423_challenge_sha_ck check(challenge_sha256 is null or challenge_sha256~'^[a-f0-9]{64}$');
 end if;
end $$;

create table if not exists app.master_build430_sweep_runs(
 sweep_id uuid primary key,
 mode text not null check(mode in('OPERATOR','CRON','PRODUCTION_BUILD','OVERLAP_CERT')),
 observed_sources integer not null check(observed_sources between 0 and 2),
 verified_sources integer not null check(verified_sources between 0 and 2),
 challenge_verified_sources integer not null check(challenge_verified_sources between 0 and 2),
 overlap_isolation_verified boolean not null default false,
 state text not null check(state in('V12_BOTH_VERIFIED','V12_PARTIAL','V12_NONE_VERIFIED','OVERLAP_ISOLATION_CERTIFIED','OVERLAP_ISOLATION_FAILED')),
 observed_at timestamptz not null default now()
);

create table if not exists app.master_build430_source_challenge_observations(
 observation_id uuid primary key,
 sweep_id uuid not null references app.master_build430_sweep_runs(sweep_id),
 app_id text not null check(app_id in('yw','icamp')),
 challenge_sha256 text not null check(challenge_sha256~'^[a-f0-9]{64}$'),
 protocol_version text null check(protocol_version is null or protocol_version in('1.1','1.2')),
 challenge_verified boolean not null,
 source_receipt_id uuid null references app.master_build423_sysop_telemetry_receipts(receipt_id),
 source_commit text null check(source_commit is null or source_commit~'^[a-f0-9]{40}$'),
 origin_reachable boolean not null,
 telemetry_status integer null check(telemetry_status is null or telemetry_status between 100 and 599),
 telemetry_latency_ms numeric null check(telemetry_latency_ms is null or telemetry_latency_ms>=0),
 detail text not null check(length(detail)<=600),
 observed_at timestamptz not null default now(),
 unique(sweep_id,app_id,challenge_sha256),
 unique(source_receipt_id)
);
create index if not exists master_build430_challenge_app_time_idx on app.master_build430_source_challenge_observations(app_id,observed_at desc);

create table if not exists app.master_build430_reliability_events(
 event_id uuid primary key,
 sweep_id uuid not null references app.master_build430_sweep_runs(sweep_id),
 app_id text not null check(app_id in('yw','icamp')),
 event_kind text not null check(event_kind in('ONLINE_VERIFIED','ONLINE_CONTINUITY_VERIFIED','DEPLOYMENT_CHANGE_VERIFIED','OFFLINE_OR_HELD','RETURN_VERIFIED')),
 previous_verified boolean null,
 current_verified boolean not null,
 previous_source_commit text null check(previous_source_commit is null or previous_source_commit~'^[a-f0-9]{40}$'),
 current_source_commit text null check(current_source_commit is null or current_source_commit~'^[a-f0-9]{40}$'),
 source_receipt_id uuid null references app.master_build423_sysop_telemetry_receipts(receipt_id),
 gap_seconds numeric null check(gap_seconds is null or gap_seconds>=0),
 observed_at timestamptz not null default now()
);
create index if not exists master_build430_reliability_app_time_idx on app.master_build430_reliability_events(app_id,observed_at desc);

alter table app.master_build430_sweep_runs enable row level security;
alter table app.master_build430_sweep_runs force row level security;
alter table app.master_build430_source_challenge_observations enable row level security;
alter table app.master_build430_source_challenge_observations force row level security;
alter table app.master_build430_reliability_events enable row level security;
alter table app.master_build430_reliability_events force row level security;

create policy b430_sweep_user_read on app.master_build430_sweep_runs for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b430_sweep_user_insert on app.master_build430_sweep_runs for insert to ai_data_runtime with check(app.current_master_sysop_role() in('owner','operator'));
create policy b430_obs_user_read on app.master_build430_source_challenge_observations for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b430_obs_user_insert on app.master_build430_source_challenge_observations for insert to ai_data_runtime with check(app.current_master_sysop_role() in('owner','operator'));
create policy b430_rel_user_read on app.master_build430_reliability_events for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b430_rel_user_insert on app.master_build430_reliability_events for insert to ai_data_runtime with check(app.current_master_sysop_role() in('owner','operator'));

create policy b430_sweep_protected_read on app.master_build430_sweep_runs for select to ai_data_protected_runtime using(true);
create policy b430_sweep_protected_insert on app.master_build430_sweep_runs for insert to ai_data_protected_runtime with check(true);
create policy b430_obs_protected_read on app.master_build430_source_challenge_observations for select to ai_data_protected_runtime using(true);
create policy b430_obs_protected_insert on app.master_build430_source_challenge_observations for insert to ai_data_protected_runtime with check(true);
create policy b430_rel_protected_read on app.master_build430_reliability_events for select to ai_data_protected_runtime using(true);
create policy b430_rel_protected_insert on app.master_build430_reliability_events for insert to ai_data_protected_runtime with check(true);

grant select,insert on app.master_build430_sweep_runs,app.master_build430_source_challenge_observations,app.master_build430_reliability_events to ai_data_runtime,ai_data_protected_runtime;
revoke update,delete on app.master_build430_sweep_runs,app.master_build430_source_challenge_observations,app.master_build430_reliability_events from ai_data_runtime,ai_data_protected_runtime;

create or replace view app.master_build430_cadence_baseline with (security_invoker=true) as
with x as(
 select mode,observed_at,extract(epoch from(observed_at-lag(observed_at) over(order by observed_at))) as gap_seconds
 from app.master_build430_sweep_runs where mode in('CRON','PRODUCTION_BUILD','OPERATOR') and observed_at>=now()-interval '14 days'
)
select count(*)::integer as sweeps,
 round(avg(gap_seconds)::numeric,1) as average_gap_seconds,
 percentile_cont(0.5) within group(order by gap_seconds) as median_gap_seconds,
 max(gap_seconds) as maximum_gap_seconds,
 min(observed_at) as first_observed_at,
 max(observed_at) as last_observed_at
from x;
grant select on app.master_build430_cadence_baseline to ai_data_runtime,ai_data_protected_runtime;
