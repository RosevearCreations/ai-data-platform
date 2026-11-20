create table if not exists app.master_build429_sweep_receipts(
 sweep_id uuid primary key,
 mode text not null check(mode in('OPERATOR','CRON','PRODUCTION_BUILD')),
 observed_sources integer not null check(observed_sources between 0 and 7),
 verified_sources integer not null check(verified_sources between 0 and 7),
 classified_sources integer not null check(classified_sources between 0 and 7),
 held_sources integer not null check(held_sources between 0 and 7),
 state text not null check(state in('SEVEN_SOURCE_SIGNED_LIVE','SEVEN_SOURCE_CLASSIFIED_PARTIAL_SIGNED','SEVEN_SOURCE_CLASSIFICATION_INCOMPLETE')),
 observed_at timestamptz not null default now()
);

create table if not exists app.master_build429_source_health_observations(
 observation_id uuid primary key,
 sweep_id uuid not null references app.master_build429_sweep_receipts(sweep_id),
 app_id text not null check(app_id in('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
 provider text not null check(provider in('VERCEL','CLOUDFLARE','ORIGINAL_HOST')),
 origin text null,
 origin_reachable boolean not null,
 telemetry_status integer null check(telemetry_status is null or telemetry_status between 100 and 599),
 telemetry_latency_ms numeric null check(telemetry_latency_ms is null or telemetry_latency_ms>=0),
 credential_present boolean not null,
 telemetry_verified boolean not null,
 source_receipt_id uuid null references app.master_build423_sysop_telemetry_receipts(receipt_id),
 source_commit text null check(source_commit is null or source_commit~'^[a-f0-9]{40}$'),
 reviewed_commit text null check(reviewed_commit is null or reviewed_commit~'^[a-f0-9]{40}$'),
 source_route_implemented boolean not null,
 state text not null check(state in(
  'ACTIVE_SIGNED_FRESH',
  'HOLD_AIDP_SELF_SIGNER_PROVIDER_WRITE_BLOCKED',
  'HOLD_ORIGINAL_HOST_SIGNER_AND_HTTPS_RELAY_REQUIRED',
  'HOLD_CLOUDFLARE_PUBLIC_TELEMETRY_BRIDGE_AND_SECRET_AUTHORITY_REQUIRED',
  'HOLD_CLOUDFLARE_SECRET_AUTHORITY_NOT_CONNECTED',
  'HOLD_UNVERIFIED'
 )),
 hold_reason text null check(hold_reason is null or length(hold_reason)<=240),
 detail text not null check(length(detail)<=600),
 observed_at timestamptz not null default now(),
 unique(sweep_id,app_id),
 unique(source_receipt_id)
);

create index if not exists master_build429_health_app_time_idx on app.master_build429_source_health_observations(app_id,observed_at desc);
create index if not exists master_build429_health_sweep_idx on app.master_build429_source_health_observations(sweep_id);

alter table app.master_build429_sweep_receipts enable row level security;
alter table app.master_build429_sweep_receipts force row level security;
alter table app.master_build429_source_health_observations enable row level security;
alter table app.master_build429_source_health_observations force row level security;

create policy b429_sweep_user_read on app.master_build429_sweep_receipts for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b429_sweep_user_insert on app.master_build429_sweep_receipts for insert to ai_data_runtime with check(app.current_master_sysop_role() in('owner','operator'));
create policy b429_health_user_read on app.master_build429_source_health_observations for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b429_health_user_insert on app.master_build429_source_health_observations for insert to ai_data_runtime with check(app.current_master_sysop_role() in('owner','operator'));

create policy b429_sweep_protected_read on app.master_build429_sweep_receipts for select to ai_data_protected_runtime using(true);
create policy b429_sweep_protected_insert on app.master_build429_sweep_receipts for insert to ai_data_protected_runtime with check(true);
create policy b429_health_protected_read on app.master_build429_source_health_observations for select to ai_data_protected_runtime using(true);
create policy b429_health_protected_insert on app.master_build429_source_health_observations for insert to ai_data_protected_runtime with check(true);

grant select,insert on app.master_build429_sweep_receipts,app.master_build429_source_health_observations to ai_data_runtime,ai_data_protected_runtime;
revoke update,delete on app.master_build429_sweep_receipts,app.master_build429_source_health_observations from ai_data_runtime,ai_data_protected_runtime;

create or replace view app.master_build429_latest_source_health with (security_invoker=true) as
select distinct on(app_id)
 observation_id,sweep_id,app_id,provider,origin,origin_reachable,telemetry_status,telemetry_latency_ms,
 credential_present,telemetry_verified,source_receipt_id,source_commit,reviewed_commit,source_route_implemented,
 state,hold_reason,detail,observed_at
from app.master_build429_source_health_observations
order by app_id,observed_at desc;

grant select on app.master_build429_latest_source_health to ai_data_runtime,ai_data_protected_runtime;
