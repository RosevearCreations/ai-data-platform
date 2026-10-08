create table if not exists app.remote_execution_jobs (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  job_id uuid not null,
  saved_scraper_id text not null,
  provider_key text not null check (provider_key ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  config_ref text check (
    config_ref is null
    or config_ref ~ '^enc-config://remote-execution/[A-Za-z0-9][A-Za-z0-9/_-]{2,127}$'
  ),
  source_url text not null,
  source_origin text not null,
  source_policy_id text not null,
  source_policy_revision integer not null check (source_policy_revision >= 1),
  source_policy_fingerprint text not null,
  source_policy_snapshot jsonb not null check (jsonb_typeof(source_policy_snapshot) = 'object'),
  max_pages integer not null check (max_pages between 1 and 50),
  max_records integer not null check (max_records between 1 and 5000),
  max_runtime_seconds integer not null check (max_runtime_seconds between 10 and 900),
  minimum_delay_ms integer not null check (minimum_delay_ms >= 500),
  status text not null default 'prepared' check (
    status in ('prepared','queued','leased','running','succeeded','failed','cancelled','timed-out')
  ),
  lease_owner text,
  lease_expires_at timestamptz,
  heartbeat_at timestamptz,
  cancel_requested_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  failure_code text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  result_count integer not null default 0 check (result_count >= 0),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, job_id)
);

create index if not exists remote_execution_jobs_status_idx
  on app.remote_execution_jobs(workspace_id, status, created_at desc);

create index if not exists remote_execution_jobs_lease_idx
  on app.remote_execution_jobs(status, lease_expires_at)
  where status in ('leased', 'running');

create table if not exists app.remote_execution_results (
  workspace_id uuid not null,
  job_id uuid not null,
  idempotency_key text not null,
  result_fingerprint text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  primary key (workspace_id, job_id, idempotency_key),
  foreign key (workspace_id, job_id)
    references app.remote_execution_jobs(workspace_id, job_id)
    on delete cascade
);

grant select, insert, update on app.remote_execution_jobs to ai_data_runtime;
grant select, insert on app.remote_execution_results to ai_data_runtime;

alter table app.remote_execution_jobs enable row level security;
alter table app.remote_execution_results enable row level security;

drop policy if exists remote_execution_jobs_member_all on app.remote_execution_jobs;
create policy remote_execution_jobs_member_all
on app.remote_execution_jobs
for all
to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = remote_execution_jobs.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = remote_execution_jobs.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists remote_execution_results_member_select on app.remote_execution_results;
create policy remote_execution_results_member_select
on app.remote_execution_results
for select
to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = remote_execution_results.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists remote_execution_results_member_insert on app.remote_execution_results;
create policy remote_execution_results_member_insert
on app.remote_execution_results
for insert
to ai_data_runtime
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = remote_execution_results.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);
