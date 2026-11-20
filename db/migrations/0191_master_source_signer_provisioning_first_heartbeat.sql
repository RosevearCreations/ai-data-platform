create table if not exists app.master_build428_source_pairing_acceptance(
 acceptance_id uuid primary key,
 app_id text not null check(app_id in('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
 provider text not null check(provider in('VERCEL','CLOUDFLARE','ORIGINAL_HOST')),
 credential_ref text not null check(length(credential_ref) between 8 and 140),
 credential_present boolean not null,
 source_route_present boolean not null,
 signer_pin_present boolean not null,
 signer_pin_exact boolean not null,
 public_key_fingerprint text null check(public_key_fingerprint is null or public_key_fingerprint~'^[a-f0-9]{64}$'),
 expected_commit text null check(expected_commit is null or expected_commit~'^[a-f0-9]{40}$'),
 telemetry_verified boolean not null,
 source_receipt_id uuid null references app.master_build423_sysop_telemetry_receipts(receipt_id),
 state text not null check(state in('ACTIVE_SIGNED_FIRST_HEARTBEAT','HOLD_REQUIRED_SOURCE_NOT_VERIFIED','AIDP_PRIVATE_SIGNER_PROVIDER_WRITE_BLOCKED','ORIGINAL_HOST_SIGNER_AND_HTTPS_RELAY_REQUIRED','CLOUDFLARE_SECRET_AUTHORITY_NOT_CONNECTED','SOURCE_TELEMETRY_ROUTE_AND_CLOUDFLARE_SECRET_AUTHORITY_REQUIRED','HOLD_NOT_PROVISIONED')),
 detail text not null check(length(detail)<=600),
 observed_at timestamptz not null default now()
);
create index if not exists master_build428_pairing_app_time_idx on app.master_build428_source_pairing_acceptance(app_id,observed_at desc);
create table if not exists app.master_build428_activation_runs(
 run_id uuid primary key,
 mode text not null check(mode in('OPERATOR','PRODUCTION_BUILD')),
 required_sources jsonb not null check(jsonb_typeof(required_sources)='array'),
 verified_required_sources integer not null check(verified_required_sources between 0 and 2),
 active_sources integer not null check(active_sources between 0 and 7),
 state text not null check(state in('SEVEN_SOURCE_SIGNED_LIVE','PARTIAL_GENUINE_ACTIVATION_ACCEPTED','REQUIRED_FIRST_HEARTBEAT_HOLD')),
 observed_at timestamptz not null default now()
);
alter table app.master_build428_source_pairing_acceptance enable row level security;
alter table app.master_build428_source_pairing_acceptance force row level security;
alter table app.master_build428_activation_runs enable row level security;
alter table app.master_build428_activation_runs force row level security;
create policy b428_pairing_user_read on app.master_build428_source_pairing_acceptance for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b428_pairing_user_insert on app.master_build428_source_pairing_acceptance for insert to ai_data_runtime with check(app.current_master_sysop_role() in('owner','operator'));
create policy b428_run_user_read on app.master_build428_activation_runs for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b428_run_user_insert on app.master_build428_activation_runs for insert to ai_data_runtime with check(app.current_master_sysop_role() in('owner','operator'));
create policy b428_pairing_protected_read on app.master_build428_source_pairing_acceptance for select to ai_data_protected_runtime using(true);
create policy b428_pairing_protected_insert on app.master_build428_source_pairing_acceptance for insert to ai_data_protected_runtime with check(true);
create policy b428_run_protected_read on app.master_build428_activation_runs for select to ai_data_protected_runtime using(true);
create policy b428_run_protected_insert on app.master_build428_activation_runs for insert to ai_data_protected_runtime with check(true);
grant select,insert on app.master_build428_source_pairing_acceptance,app.master_build428_activation_runs to ai_data_runtime,ai_data_protected_runtime;
revoke update,delete on app.master_build428_source_pairing_acceptance,app.master_build428_activation_runs from ai_data_runtime,ai_data_protected_runtime;
create or replace view app.master_build428_latest_source_acceptance with (security_invoker=true) as
select distinct on(app_id) acceptance_id,app_id,provider,credential_ref,credential_present,source_route_present,signer_pin_present,signer_pin_exact,public_key_fingerprint,expected_commit,telemetry_verified,source_receipt_id,state,detail,observed_at
from app.master_build428_source_pairing_acceptance order by app_id,observed_at desc;
grant select on app.master_build428_latest_source_acceptance to ai_data_runtime,ai_data_protected_runtime;
