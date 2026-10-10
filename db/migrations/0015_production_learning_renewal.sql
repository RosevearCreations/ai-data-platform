create table if not exists app.production_learning_cycle_snapshots (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  snapshot_id uuid not null,
  cycle_key text not null check (cycle_key in ('build-036')),
  evidence_fingerprint text not null check (evidence_fingerprint ~ '^[0-9a-f]{64}$'),
  sync_events integer not null check (sync_events >= 0),
  sync_conflicts integer not null check (sync_conflicts >= 0),
  sync_errors integer not null check (sync_errors >= 0),
  repair_checks integer not null check (repair_checks >= 0),
  repair_healthy integer not null check (repair_healthy >= 0),
  repair_rollbacks integer not null check (repair_rollbacks >= 0),
  provider_runs integer not null check (provider_runs >= 0),
  provider_successes integer not null check (provider_successes >= 0),
  provider_units bigint not null check (provider_units >= 0),
  integration_attempts integer not null check (integration_attempts >= 0),
  integration_live_accepted integer not null check (integration_live_accepted >= 0),
  integration_rejected integer not null check (integration_rejected >= 0),
  integration_transport_errors integer not null check (integration_transport_errors >= 0),
  retention_budget_breaches integer not null check (retention_budget_breaches >= 0),
  retention_delete_eligible integer not null check (retention_delete_eligible >= 0),
  retention_cleanup_runs integer not null check (retention_cleanup_runs >= 0),
  retention_failed_runs integer not null check (retention_failed_runs >= 0),
  adoption_activity_events bigint not null check (adoption_activity_events >= 0),
  adoption_used_capabilities integer not null check (adoption_used_capabilities >= 0),
  adoption_high_risk_unused integer not null check (adoption_high_risk_unused >= 0),
  connector_unused_grants integer not null check (connector_unused_grants >= 0),
  permission_review_required boolean not null default false,
  created_by text not null references auth."user"(id) on delete restrict,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (workspace_id,snapshot_id),
  unique (workspace_id,cycle_key,evidence_fingerprint)
);

create index if not exists production_learning_cycle_snapshots_recent_idx
  on app.production_learning_cycle_snapshots(workspace_id,generated_at desc);

grant select,insert on app.production_learning_cycle_snapshots to ai_data_runtime;

alter table app.production_learning_cycle_snapshots enable row level security;

drop policy if exists production_learning_cycle_snapshots_read
  on app.production_learning_cycle_snapshots;
create policy production_learning_cycle_snapshots_read
on app.production_learning_cycle_snapshots
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=production_learning_cycle_snapshots.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists production_learning_cycle_snapshots_insert
  on app.production_learning_cycle_snapshots;
create policy production_learning_cycle_snapshots_insert
on app.production_learning_cycle_snapshots
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=production_learning_cycle_snapshots.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

create or replace function app.prune_production_learning_cycle_snapshot_retention()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,app
as $$
begin
  delete from app.production_learning_cycle_snapshots
  where workspace_id=new.workspace_id
    and generated_at < now() - interval '365 days';

  delete from app.production_learning_cycle_snapshots
  where (workspace_id,snapshot_id) in (
    select workspace_id,snapshot_id
    from app.production_learning_cycle_snapshots
    where workspace_id=new.workspace_id
    order by generated_at desc,created_at desc
    offset 30
  );

  return new;
end;
$$;

revoke all on function app.prune_production_learning_cycle_snapshot_retention() from public;

drop trigger if exists production_learning_cycle_snapshot_retention_after_insert
  on app.production_learning_cycle_snapshots;
create trigger production_learning_cycle_snapshot_retention_after_insert
after insert on app.production_learning_cycle_snapshots
for each row execute function app.prune_production_learning_cycle_snapshot_retention();
