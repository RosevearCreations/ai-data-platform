create table if not exists app.master_build435_peer_release_ledger(
 ledger_id uuid primary key,
 app_id text not null check(length(app_id) between 2 and 80),
 repository text null check(repository is null or length(repository) between 3 and 200),
 source_commit text not null check(source_commit~'^[a-f0-9]{40}$'),
 source_build_label text null check(source_build_label is null or length(source_build_label) between 1 and 80),
 predecessor_commit text null check(predecessor_commit is null or predecessor_commit~'^[a-f0-9]{40}$'),
 continuity_state text not null check(continuity_state in('BASELINE','ADVANCE','UNCHANGED','REGRESSION_HOLD','UNRESOLVED_SEQUENCE')),
 first_verified_at timestamptz not null,
 last_verified_at timestamptz not null,
 verified_observation_count integer not null default 1 check(verified_observation_count>0),
 latest_receipt_id text null,
 latest_detail text null,
 unique(app_id,source_commit),
 check(last_verified_at>=first_verified_at)
);
create index if not exists master_build435_peer_release_app_time_idx on app.master_build435_peer_release_ledger(app_id,last_verified_at desc);
create index if not exists master_build435_peer_release_commit_idx on app.master_build435_peer_release_ledger(source_commit);

alter table app.master_build435_peer_release_ledger enable row level security;
alter table app.master_build435_peer_release_ledger force row level security;

create policy b435_ledger_protected_all on app.master_build435_peer_release_ledger for all to ai_data_protected_runtime using(true) with check(true);
create policy b435_ledger_user_read on app.master_build435_peer_release_ledger for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));

grant select,insert,update on app.master_build435_peer_release_ledger to ai_data_protected_runtime;
grant select on app.master_build435_peer_release_ledger to ai_data_runtime;
revoke delete on app.master_build435_peer_release_ledger from ai_data_runtime,ai_data_protected_runtime;
