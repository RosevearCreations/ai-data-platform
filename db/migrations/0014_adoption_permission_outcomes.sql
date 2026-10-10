create table if not exists app.workspace_adoption_review_snapshots (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  snapshot_id uuid not null,
  evidence_fingerprint text not null check (evidence_fingerprint ~ '^[0-9a-f]{64}$'),
  profile_key text not null check (char_length(profile_key) between 1 and 96),
  enabled_capabilities jsonb not null default '[]'::jsonb check (
    jsonb_typeof(enabled_capabilities)='array' and octet_length(enabled_capabilities::text) <= 4096
  ),
  used_capabilities jsonb not null default '[]'::jsonb check (
    jsonb_typeof(used_capabilities)='array' and octet_length(used_capabilities::text) <= 4096
  ),
  unused_enabled_capabilities jsonb not null default '[]'::jsonb check (
    jsonb_typeof(unused_enabled_capabilities)='array' and octet_length(unused_enabled_capabilities::text) <= 4096
  ),
  high_risk_unused_capabilities jsonb not null default '[]'::jsonb check (
    jsonb_typeof(high_risk_unused_capabilities)='array' and octet_length(high_risk_unused_capabilities::text) <= 4096
  ),
  disabled_used_capabilities jsonb not null default '[]'::jsonb check (
    jsonb_typeof(disabled_used_capabilities)='array' and octet_length(disabled_used_capabilities::text) <= 4096
  ),
  connector_installations integer not null check (connector_installations >= 0),
  connector_enabled integer not null check (connector_enabled >= 0),
  connector_grants integer not null check (connector_grants >= 0),
  connector_used_grants integer not null check (connector_used_grants >= 0),
  connector_unused_grants integer not null check (connector_unused_grants >= 0),
  connector_stale_grants integer not null check (connector_stale_grants >= 0),
  connector_blocked_attempts integer not null check (connector_blocked_attempts >= 0),
  sync_activity integer not null check (sync_activity >= 0),
  source_policy_sources integer not null check (source_policy_sources >= 0),
  scheduled_jobs integer not null check (scheduled_jobs >= 0),
  scheduled_attempts integer not null check (scheduled_attempts >= 0),
  remote_jobs integer not null check (remote_jobs >= 0),
  remote_runs integer not null check (remote_runs >= 0),
  barcode_captures integer not null check (barcode_captures >= 0),
  integration_events integer not null check (integration_events >= 0),
  owners integer not null check (owners >= 0),
  admins integer not null check (admins >= 0),
  members integer not null check (members >= 0),
  activity_events bigint not null check (activity_events >= 0),
  used_capability_count integer not null check (used_capability_count >= 0),
  created_by text not null references auth."user"(id) on delete restrict,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (workspace_id,snapshot_id),
  unique (workspace_id,evidence_fingerprint)
);

create index if not exists workspace_adoption_review_snapshots_recent_idx
  on app.workspace_adoption_review_snapshots(workspace_id,generated_at desc);

grant select,insert on app.workspace_adoption_review_snapshots to ai_data_runtime;

alter table app.workspace_adoption_review_snapshots enable row level security;

drop policy if exists adoption_review_snapshots_read
  on app.workspace_adoption_review_snapshots;
create policy adoption_review_snapshots_read
on app.workspace_adoption_review_snapshots
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=workspace_adoption_review_snapshots.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists adoption_review_snapshots_insert
  on app.workspace_adoption_review_snapshots;
create policy adoption_review_snapshots_insert
on app.workspace_adoption_review_snapshots
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=workspace_adoption_review_snapshots.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

create or replace function app.prune_adoption_review_snapshot_retention()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,app
as $$
begin
  delete from app.workspace_adoption_review_snapshots
  where workspace_id=new.workspace_id
    and generated_at < now() - interval '365 days';

  delete from app.workspace_adoption_review_snapshots
  where (workspace_id,snapshot_id) in (
    select workspace_id,snapshot_id
    from app.workspace_adoption_review_snapshots
    where workspace_id=new.workspace_id
    order by generated_at desc,created_at desc
    offset 60
  );

  return new;
end;
$$;

revoke all on function app.prune_adoption_review_snapshot_retention() from public;

drop trigger if exists adoption_review_snapshot_retention_after_insert
  on app.workspace_adoption_review_snapshots;
create trigger adoption_review_snapshot_retention_after_insert
after insert on app.workspace_adoption_review_snapshots
for each row execute function app.prune_adoption_review_snapshot_retention();
