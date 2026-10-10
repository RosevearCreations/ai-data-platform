create table if not exists app.workspace_retention_policies (
  workspace_id uuid primary key references app.workspaces(id) on delete cascade,
  policy_version integer not null default 1 check (policy_version = 1),
  cleanup_approved boolean not null default false,
  approved_by text references auth."user"(id) on delete set null,
  approved_at timestamptz,
  max_rows_per_run integer not null default 100
    check (max_rows_per_run between 1 and 250),
  budgets jsonb not null default '{
    "sync-payloads":8388608,
    "intelligence-modules":8388608,
    "barcode-terminal":4194304,
    "remote-terminal":8388608,
    "intelligence-audit":4194304,
    "remote-provider-audit":4194304,
    "connector-audit":4194304,
    "operational-outcomes":4194304,
    "production-learning-snapshots":1048576,
    "integration-delivery-audit":4194304,
    "retention-control-audit":1048576
  }'::jsonb check (
    jsonb_typeof(budgets)='object' and octet_length(budgets::text) <= 4096
  ),
  updated_by text references auth."user"(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into app.workspace_retention_policies (workspace_id)
select id from app.workspaces
on conflict (workspace_id) do nothing;

create table if not exists app.workspace_retention_policy_events (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  event_id uuid not null,
  event_type text not null check (event_type in ('cleanup-approved','cleanup-revoked')),
  policy_version integer not null default 1 check (policy_version = 1),
  actor_user_id text not null references auth."user"(id) on delete restrict,
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details)='object' and octet_length(details::text) <= 2048
  ),
  created_at timestamptz not null default now(),
  primary key (workspace_id,event_id)
);

create index if not exists workspace_retention_policy_events_recent_idx
  on app.workspace_retention_policy_events(workspace_id, created_at desc);

create table if not exists app.workspace_retention_cleanup_runs (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  run_id uuid not null,
  status text not null check (status in ('completed','failed')),
  actor_user_id text not null references auth."user"(id) on delete restrict,
  approved_at timestamptz not null,
  max_rows integer not null check (max_rows between 1 and 250),
  before_rows integer not null check (before_rows >= 0),
  after_rows integer not null check (after_rows >= 0),
  before_storage_bytes bigint not null check (before_storage_bytes >= 0),
  after_storage_bytes bigint not null check (after_storage_bytes >= 0),
  eligible_rows integer not null check (eligible_rows >= 0),
  eligible_storage_bytes bigint not null check (eligible_storage_bytes >= 0),
  deleted_barcode_rows integer not null default 0 check (deleted_barcode_rows >= 0),
  deleted_remote_jobs integer not null default 0 check (deleted_remote_jobs >= 0),
  error_code text,
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details)='object' and octet_length(details::text) <= 4096
  ),
  created_at timestamptz not null default now(),
  primary key (workspace_id,run_id)
);

create index if not exists workspace_retention_cleanup_runs_recent_idx
  on app.workspace_retention_cleanup_runs(workspace_id, created_at desc);

create or replace view app.workspace_retention_metrics
with (security_invoker=true)
as
with metrics as (
  select
    w.id as workspace_id,
    (
      (select count(*) from app.workspace_saved_scrapers s where s.workspace_id=w.id) +
      (select count(*) from app.workspace_reviewed_datasets d where d.workspace_id=w.id)
    )::bigint as sync_payload_rows,
    (
      coalesce((select sum(pg_column_size(s.payload)) from app.workspace_saved_scrapers s where s.workspace_id=w.id),0) +
      coalesce((select sum(pg_column_size(d.payload)) from app.workspace_reviewed_datasets d where d.workspace_id=w.id),0)
    )::bigint as sync_payload_bytes,
    (
      (select count(*) from app.workspace_saved_scrapers s
        where s.workspace_id=w.id and s.deleted_at < now() - interval '180 days') +
      (select count(*) from app.workspace_reviewed_datasets d
        where d.workspace_id=w.id and d.deleted_at < now() - interval '180 days')
    )::bigint as sync_archive_eligible_rows,
    (select count(*) from app.workspace_intelligence_modules m where m.workspace_id=w.id)::bigint
      as intelligence_module_rows,
    coalesce((select sum(pg_column_size(m.payload)) from app.workspace_intelligence_modules m where m.workspace_id=w.id),0)::bigint
      as intelligence_module_bytes,
    (select count(*) from app.workspace_barcode_captures b where b.workspace_id=w.id)::bigint
      as barcode_rows,
    coalesce((select sum(pg_column_size(b)) from app.workspace_barcode_captures b where b.workspace_id=w.id),0)::bigint
      as barcode_bytes,
    (select count(*) from app.workspace_barcode_captures b
      where b.workspace_id=w.id
        and b.review_status in ('approved','rejected')
        and b.reviewed_at < now() - interval '90 days')::bigint
      as barcode_delete_eligible_rows,
    coalesce((select sum(pg_column_size(b)) from app.workspace_barcode_captures b
      where b.workspace_id=w.id
        and b.review_status in ('approved','rejected')
        and b.reviewed_at < now() - interval '90 days'),0)::bigint
      as barcode_delete_eligible_bytes,
    (
      (select count(*) from app.remote_execution_jobs j where j.workspace_id=w.id) +
      (select count(*) from app.remote_execution_results r where r.workspace_id=w.id)
    )::bigint as remote_rows,
    (
      coalesce((select sum(pg_column_size(j)) from app.remote_execution_jobs j where j.workspace_id=w.id),0) +
      coalesce((select sum(pg_column_size(r)) from app.remote_execution_results r where r.workspace_id=w.id),0)
    )::bigint as remote_bytes,
    (select count(*) from app.remote_execution_jobs j
      where j.workspace_id=w.id
        and j.status in ('succeeded','failed','cancelled','timed-out')
        and j.completed_at < now() - interval '30 days')::bigint
      as remote_delete_eligible_jobs,
    coalesce((
      select sum(
        pg_column_size(j) +
        coalesce((
          select sum(pg_column_size(r))
          from app.remote_execution_results r
          where r.workspace_id=j.workspace_id and r.job_id=j.job_id
        ),0)
      )
      from app.remote_execution_jobs j
      where j.workspace_id=w.id
        and j.status in ('succeeded','failed','cancelled','timed-out')
        and j.completed_at < now() - interval '30 days'
    ),0)::bigint as remote_delete_eligible_bytes,
    (select count(*) from app.workspace_intelligence_audit a where a.workspace_id=w.id)::bigint
      as intelligence_audit_rows,
    coalesce((select sum(pg_column_size(a)) from app.workspace_intelligence_audit a where a.workspace_id=w.id),0)::bigint
      as intelligence_audit_bytes,
    (select count(*) from app.remote_execution_provider_events e where e.workspace_id=w.id)::bigint
      as provider_audit_rows,
    coalesce((select sum(pg_column_size(e)) from app.remote_execution_provider_events e where e.workspace_id=w.id),0)::bigint
      as provider_audit_bytes,
    (
      (select count(*) from app.workspace_connector_installations i where i.workspace_id=w.id) +
      (select count(*) from app.workspace_connector_audit a where a.workspace_id=w.id)
    )::bigint as connector_rows,
    (
      coalesce((select sum(pg_column_size(i)) from app.workspace_connector_installations i where i.workspace_id=w.id),0) +
      coalesce((select sum(pg_column_size(a)) from app.workspace_connector_audit a where a.workspace_id=w.id),0)
    )::bigint as connector_bytes,
    (select count(*) from app.workspace_operational_outcomes o where o.workspace_id=w.id)::bigint
      as operational_rows,
    coalesce((select sum(pg_column_size(o)) from app.workspace_operational_outcomes o where o.workspace_id=w.id),0)::bigint
      as operational_bytes,
    (select count(*) from app.production_learning_review_snapshots s where s.workspace_id=w.id)::bigint
      as snapshot_rows,
    coalesce((select sum(pg_column_size(s)) from app.production_learning_review_snapshots s where s.workspace_id=w.id),0)::bigint
      as snapshot_bytes,
    (
      (select count(*) from app.integration_delivery_events e where e.workspace_id=w.id) +
      (select count(*) from app.integration_consumer_receipts r where r.workspace_id=w.id)
    )::bigint as delivery_audit_rows,
    (
      coalesce((select sum(pg_column_size(e)) from app.integration_delivery_events e where e.workspace_id=w.id),0) +
      coalesce((select sum(pg_column_size(r)) from app.integration_consumer_receipts r where r.workspace_id=w.id),0)
    )::bigint as delivery_audit_bytes,
    (
      (select count(*) from app.workspace_retention_policy_events e where e.workspace_id=w.id) +
      (select count(*) from app.workspace_retention_cleanup_runs r where r.workspace_id=w.id)
    )::bigint as retention_audit_rows,
    (
      coalesce((select sum(pg_column_size(e)) from app.workspace_retention_policy_events e where e.workspace_id=w.id),0) +
      coalesce((select sum(pg_column_size(r)) from app.workspace_retention_cleanup_runs r where r.workspace_id=w.id),0)
    )::bigint as retention_audit_bytes
  from app.workspaces w
)
select
  metrics.*,
  (
    sync_payload_rows + intelligence_module_rows + barcode_rows + remote_rows +
    intelligence_audit_rows + provider_audit_rows + connector_rows +
    operational_rows + snapshot_rows + delivery_audit_rows + retention_audit_rows
  )::bigint as total_managed_rows,
  (
    sync_payload_bytes + intelligence_module_bytes + barcode_bytes + remote_bytes +
    intelligence_audit_bytes + provider_audit_bytes + connector_bytes +
    operational_bytes + snapshot_bytes + delivery_audit_bytes + retention_audit_bytes
  )::bigint as total_measured_bytes
from metrics;

grant select on app.workspace_retention_metrics to ai_data_runtime;
grant select, insert, update on app.workspace_retention_policies to ai_data_runtime;
grant select, insert on app.workspace_retention_policy_events to ai_data_runtime;
grant select on app.workspace_retention_cleanup_runs to ai_data_runtime;

alter table app.workspace_retention_policies enable row level security;
alter table app.workspace_retention_policy_events enable row level security;
alter table app.workspace_retention_cleanup_runs enable row level security;

create policy retention_policy_read
on app.workspace_retention_policies
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_retention_policies.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

create policy retention_policy_insert
on app.workspace_retention_policies
for insert to ai_data_runtime
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_retention_policies.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

create policy retention_policy_update
on app.workspace_retention_policies
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_retention_policies.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_retention_policies.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

create policy retention_policy_events_read
on app.workspace_retention_policy_events
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_retention_policy_events.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

create policy retention_policy_events_insert
on app.workspace_retention_policy_events
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_retention_policy_events.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

create policy retention_cleanup_runs_read
on app.workspace_retention_cleanup_runs
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_retention_cleanup_runs.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

create or replace function app.execute_workspace_retention_cleanup(
  p_workspace_id uuid,
  p_requested_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,app
as $$
declare
  v_actor text := nullif(current_setting('app.user_id',true),'');
  v_role text;
  v_approved boolean;
  v_approved_at timestamptz;
  v_policy_limit integer;
  v_limit integer;
  v_remaining integer;
  v_before_rows integer := 0;
  v_after_rows integer := 0;
  v_before_bytes bigint := 0;
  v_after_bytes bigint := 0;
  v_eligible_rows integer := 0;
  v_eligible_bytes bigint := 0;
  v_deleted_barcode integer := 0;
  v_deleted_remote integer := 0;
  v_run_id uuid := gen_random_uuid();
begin
  if v_actor is null then
    raise exception 'retention_actor_missing';
  end if;

  select wm.role
  into v_role
  from app.workspace_members wm
  where wm.workspace_id=p_workspace_id and wm.user_id=v_actor
  limit 1;

  if v_role not in ('owner','admin') then
    raise exception 'workspace_admin_required';
  end if;

  select cleanup_approved, approved_at, max_rows_per_run
  into v_approved, v_approved_at, v_policy_limit
  from app.workspace_retention_policies
  where workspace_id=p_workspace_id;

  if coalesce(v_approved,false)=false or v_approved_at is null then
    raise exception 'retention_cleanup_not_approved';
  end if;

  v_limit := least(greatest(coalesce(p_requested_limit,100),1),v_policy_limit,250);

  select
    total_managed_rows::integer,
    total_measured_bytes,
    (barcode_delete_eligible_rows + remote_delete_eligible_jobs)::integer,
    (barcode_delete_eligible_bytes + remote_delete_eligible_bytes)::bigint
  into v_before_rows, v_before_bytes, v_eligible_rows, v_eligible_bytes
  from app.workspace_retention_metrics
  where workspace_id=p_workspace_id;

  begin
    with candidates as (
      select capture_id
      from app.workspace_barcode_captures
      where workspace_id=p_workspace_id
        and review_status in ('approved','rejected')
        and reviewed_at < now() - interval '90 days'
      order by reviewed_at, created_at
      limit v_limit
    )
    delete from app.workspace_barcode_captures b
    using candidates c
    where b.workspace_id=p_workspace_id and b.capture_id=c.capture_id;

    get diagnostics v_deleted_barcode = row_count;
    v_remaining := greatest(v_limit - v_deleted_barcode,0);

    if v_remaining > 0 then
      with candidates as (
        select job_id
        from app.remote_execution_jobs
        where workspace_id=p_workspace_id
          and status in ('succeeded','failed','cancelled','timed-out')
          and completed_at < now() - interval '30 days'
        order by completed_at, created_at
        limit v_remaining
      )
      delete from app.remote_execution_jobs j
      using candidates c
      where j.workspace_id=p_workspace_id and j.job_id=c.job_id;

      get diagnostics v_deleted_remote = row_count;
    end if;

    select total_managed_rows::integer, total_measured_bytes
    into v_after_rows, v_after_bytes
    from app.workspace_retention_metrics
    where workspace_id=p_workspace_id;

    insert into app.workspace_retention_cleanup_runs (
      workspace_id,run_id,status,actor_user_id,approved_at,max_rows,
      before_rows,after_rows,before_storage_bytes,after_storage_bytes,
      eligible_rows,eligible_storage_bytes,deleted_barcode_rows,
      deleted_remote_jobs,details
    )
    values (
      p_workspace_id,v_run_id,'completed',v_actor,v_approved_at,v_limit,
      v_before_rows,v_after_rows,v_before_bytes,v_after_bytes,
      v_eligible_rows,v_eligible_bytes,v_deleted_barcode,v_deleted_remote,
      jsonb_build_object(
        'policyVersion',1,
        'barcodeRetentionDays',90,
        'remoteTerminalRetentionDays',30,
        'protectedEvidenceUntouched',true
      )
    );

    return jsonb_build_object(
      'status','completed',
      'runId',v_run_id,
      'beforeRows',v_before_rows,
      'afterRows',v_after_rows,
      'beforeStorageBytes',v_before_bytes,
      'afterStorageBytes',v_after_bytes,
      'eligibleRows',v_eligible_rows,
      'eligibleStorageBytes',v_eligible_bytes,
      'deletedBarcodeRows',v_deleted_barcode,
      'deletedRemoteJobs',v_deleted_remote
    );
  exception when others then
    insert into app.workspace_retention_cleanup_runs (
      workspace_id,run_id,status,actor_user_id,approved_at,max_rows,
      before_rows,after_rows,before_storage_bytes,after_storage_bytes,
      eligible_rows,eligible_storage_bytes,deleted_barcode_rows,
      deleted_remote_jobs,error_code,details
    )
    values (
      p_workspace_id,v_run_id,'failed',v_actor,v_approved_at,v_limit,
      v_before_rows,v_before_rows,v_before_bytes,v_before_bytes,
      v_eligible_rows,v_eligible_bytes,0,0,sqlstate,
      jsonb_build_object('policyVersion',1,'protectedEvidenceUntouched',true)
    );

    return jsonb_build_object(
      'status','failed',
      'runId',v_run_id,
      'errorCode',sqlstate,
      'beforeRows',v_before_rows,
      'afterRows',v_before_rows,
      'beforeStorageBytes',v_before_bytes,
      'afterStorageBytes',v_before_bytes,
      'eligibleRows',v_eligible_rows,
      'eligibleStorageBytes',v_eligible_bytes,
      'deletedBarcodeRows',0,
      'deletedRemoteJobs',0
    );
  end;
end;
$$;

revoke all on function app.execute_workspace_retention_cleanup(uuid,integer) from public;
grant execute on function app.execute_workspace_retention_cleanup(uuid,integer) to ai_data_runtime;
