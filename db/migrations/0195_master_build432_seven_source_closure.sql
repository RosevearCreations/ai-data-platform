create table if not exists app.master_build432_hub_challenges(
 challenge_id uuid primary key,
 challenge_sha256 text not null unique check(challenge_sha256~'^[a-f0-9]{64}$'),
 issued_at timestamptz not null default now(),
 expires_at timestamptz not null,
 used_at timestamptz null,
 check(expires_at>issued_at)
);
create index if not exists master_build432_hub_challenge_expiry_idx on app.master_build432_hub_challenges(expires_at desc);

create table if not exists app.master_build432_hub_relay_receipts(
 relay_receipt_id uuid primary key,
 challenge_id uuid not null unique references app.master_build432_hub_challenges(challenge_id),
 telemetry_receipt_id uuid not null unique references app.master_build423_sysop_telemetry_receipts(receipt_id),
 source_commit text not null check(source_commit~'^[a-f0-9]{40}$'),
 observed_boot_time_ms bigint null check(observed_boot_time_ms is null or observed_boot_time_ms>0),
 received_at timestamptz not null default now()
);
create index if not exists master_build432_hub_relay_time_idx on app.master_build432_hub_relay_receipts(received_at desc);

create table if not exists app.master_build432_closure_runs(
 closure_id uuid primary key,
 mode text not null check(mode in('OPERATOR','CRON','PRODUCTION_BUILD')),
 verified_sources integer not null check(verified_sources between 0 and 7),
 state text not null check(length(state) between 3 and 120),
 source_receipt_ids jsonb not null,
 observed_at timestamptz not null default now()
);

alter table app.master_build432_hub_challenges enable row level security;
alter table app.master_build432_hub_challenges force row level security;
alter table app.master_build432_hub_relay_receipts enable row level security;
alter table app.master_build432_hub_relay_receipts force row level security;
alter table app.master_build432_closure_runs enable row level security;
alter table app.master_build432_closure_runs force row level security;

create policy b432_challenge_protected_all on app.master_build432_hub_challenges for all to ai_data_protected_runtime using(true) with check(true);
create policy b432_relay_protected_all on app.master_build432_hub_relay_receipts for all to ai_data_protected_runtime using(true) with check(true);
create policy b432_closure_protected_all on app.master_build432_closure_runs for all to ai_data_protected_runtime using(true) with check(true);
create policy b432_relay_user_read on app.master_build432_hub_relay_receipts for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b432_closure_user_read on app.master_build432_closure_runs for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));

grant select,insert,update on app.master_build432_hub_challenges to ai_data_protected_runtime;
grant select,insert on app.master_build432_hub_relay_receipts,app.master_build432_closure_runs to ai_data_protected_runtime;
grant select on app.master_build432_hub_relay_receipts,app.master_build432_closure_runs to ai_data_runtime;
revoke delete on app.master_build432_hub_challenges,app.master_build432_hub_relay_receipts,app.master_build432_closure_runs from ai_data_runtime,ai_data_protected_runtime;
