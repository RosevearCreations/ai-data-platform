create table if not exists app.workspace_operational_outcomes (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  event_id uuid not null,
  event_key text,
  event_family text not null check (event_family in ('sync','recipe-repair')),
  event_type text not null check (
    event_type in (
      'sync-applied',
      'sync-conflict',
      'sync-noop',
      'sync-deleted',
      'sync-error',
      'repair-proposed',
      'repair-approved',
      'repair-rejected',
      'repair-rolled-back',
      'repair-compatibility'
    )
  ),
  resource text check (
    resource is null or resource in ('saved-scraper','reviewed-dataset')
  ),
  record_id text not null check (char_length(record_id) between 1 and 256),
  revision integer check (revision is null or revision between 1 and 1000000),
  related_revision integer check (
    related_revision is null or related_revision between 1 and 1000000
  ),
  compatibility_status text check (
    compatibility_status is null or
    compatibility_status in ('healthy','degraded','broken')
  ),
  actor_user_id text not null references auth."user"(id) on delete restrict,
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details) = 'object' and
    octet_length(details::text) <= 4096
  ),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (workspace_id, event_id),
  unique (workspace_id, event_key)
);

create index if not exists workspace_operational_outcomes_recent_idx
  on app.workspace_operational_outcomes(workspace_id, occurred_at desc);

create index if not exists workspace_operational_outcomes_family_idx
  on app.workspace_operational_outcomes(workspace_id, event_family, event_type, occurred_at desc);

create table if not exists app.production_learning_review_snapshots (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  snapshot_id uuid not null,
  evidence_fingerprint text not null check (
    evidence_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  sync_events integer not null check (sync_events >= 0),
  sync_conflicts integer not null check (sync_conflicts >= 0),
  sync_errors integer not null check (sync_errors >= 0),
  repair_terminal_events integer not null check (repair_terminal_events >= 0),
  repair_compatibility_checks integer not null check (repair_compatibility_checks >= 0),
  repair_healthy_checks integer not null check (repair_healthy_checks >= 0),
  repair_rollbacks integer not null check (repair_rollbacks >= 0),
  created_by text not null references auth."user"(id) on delete restrict,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (workspace_id, snapshot_id),
  unique (workspace_id, evidence_fingerprint)
);

create index if not exists production_learning_review_snapshots_recent_idx
  on app.production_learning_review_snapshots(workspace_id, generated_at desc);

grant select, insert
  on app.workspace_operational_outcomes, app.production_learning_review_snapshots
  to ai_data_runtime;

alter table app.workspace_operational_outcomes enable row level security;
alter table app.production_learning_review_snapshots enable row level security;

drop policy if exists operational_outcomes_read on app.workspace_operational_outcomes;
create policy operational_outcomes_read
on app.workspace_operational_outcomes
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_operational_outcomes.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists operational_outcomes_insert on app.workspace_operational_outcomes;
create policy operational_outcomes_insert
on app.workspace_operational_outcomes
for insert to ai_data_runtime
with check (
  actor_user_id = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_operational_outcomes.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists production_learning_snapshots_read on app.production_learning_review_snapshots;
create policy production_learning_snapshots_read
on app.production_learning_review_snapshots
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = production_learning_review_snapshots.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists production_learning_snapshots_insert on app.production_learning_review_snapshots;
create policy production_learning_snapshots_insert
on app.production_learning_review_snapshots
for insert to ai_data_runtime
with check (
  created_by = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = production_learning_review_snapshots.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

create or replace function app.prune_operational_outcome_retention()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, app
as $$
begin
  delete from app.workspace_operational_outcomes
  where workspace_id = new.workspace_id
    and event_family = new.event_family
    and occurred_at < now() - interval '180 days';

  delete from app.workspace_operational_outcomes
  where (workspace_id, event_id) in (
    select workspace_id, event_id
    from app.workspace_operational_outcomes
    where workspace_id = new.workspace_id
      and event_family = new.event_family
    order by occurred_at desc, created_at desc
    offset 2000
  );

  return new;
end;
$$;

create or replace function app.prune_production_learning_snapshot_retention()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, app
as $$
begin
  delete from app.production_learning_review_snapshots
  where workspace_id = new.workspace_id
    and generated_at < now() - interval '365 days';

  delete from app.production_learning_review_snapshots
  where (workspace_id, snapshot_id) in (
    select workspace_id, snapshot_id
    from app.production_learning_review_snapshots
    where workspace_id = new.workspace_id
    order by generated_at desc, created_at desc
    offset 60
  );

  return new;
end;
$$;

revoke all on function app.prune_operational_outcome_retention() from public;
revoke all on function app.prune_production_learning_snapshot_retention() from public;

drop trigger if exists operational_outcome_retention_after_insert
  on app.workspace_operational_outcomes;
create trigger operational_outcome_retention_after_insert
after insert on app.workspace_operational_outcomes
for each row execute function app.prune_operational_outcome_retention();

drop trigger if exists production_learning_snapshot_retention_after_insert
  on app.production_learning_review_snapshots;
create trigger production_learning_snapshot_retention_after_insert
after insert on app.production_learning_review_snapshots
for each row execute function app.prune_production_learning_snapshot_retention();
