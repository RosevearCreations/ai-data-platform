create table if not exists app.remote_execution_controls (
  workspace_id uuid primary key references app.workspaces(id) on delete cascade,
  provider_key text not null default 'browserless'
    check (provider_key = 'browserless'),
  region text not null default 'us-east'
    check (region in ('us-east','us-west','eu-uk','eu-ams')),
  enabled boolean not null default false,
  kill_switch boolean not null default true,
  egress_mode text not null default 'direct'
    check (egress_mode = 'direct'),
  max_concurrency integer not null default 1
    check (max_concurrency = 1),
  max_units_per_run integer not null default 2
    check (max_units_per_run between 1 and 2),
  active_job_id uuid,
  active_slot_expires_at timestamptz,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.remote_execution_source_allowlist (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  source_origin text not null,
  policy_id text not null,
  policy_revision integer not null check (policy_revision >= 1),
  policy_fingerprint text not null,
  enabled boolean not null default true,
  max_pages integer not null default 1 check (max_pages = 1),
  max_records integer not null default 100 check (max_records between 1 and 500),
  max_runtime_seconds integer not null default 60
    check (max_runtime_seconds between 10 and 60),
  max_units_per_run integer not null default 2
    check (max_units_per_run between 1 and 2),
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, source_origin)
);

create table if not exists app.remote_execution_provider_events (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  event_id uuid not null,
  job_id uuid,
  event_type text not null check (
    event_type in (
      'control-updated',
      'allowlist-upserted',
      'slot-reserved',
      'slot-released',
      'run-started',
      'run-succeeded',
      'run-failed',
      'kill-switch'
    )
  ),
  provider_key text not null check (provider_key = 'browserless'),
  region text not null
    check (region in ('us-east','us-west','eu-uk','eu-ams')),
  egress_mode text not null check (egress_mode = 'direct'),
  units_estimated integer not null default 0
    check (units_estimated between 0 and 2),
  duration_ms integer,
  response_code integer,
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  primary key (workspace_id, event_id)
);

create index if not exists remote_execution_allowlist_origin_idx
  on app.remote_execution_source_allowlist(workspace_id, source_origin);

create index if not exists remote_execution_provider_events_recent_idx
  on app.remote_execution_provider_events(workspace_id, created_at desc);

grant select, insert, update
  on app.remote_execution_controls
  to ai_data_runtime;

grant select, insert, update
  on app.remote_execution_source_allowlist
  to ai_data_runtime;

grant select, insert
  on app.remote_execution_provider_events
  to ai_data_runtime;

alter table app.remote_execution_controls enable row level security;
alter table app.remote_execution_source_allowlist enable row level security;
alter table app.remote_execution_provider_events enable row level security;

drop policy if exists remote_execution_controls_member_all
  on app.remote_execution_controls;
create policy remote_execution_controls_member_all
on app.remote_execution_controls
for all
to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = remote_execution_controls.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = remote_execution_controls.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists remote_execution_source_allowlist_member_all
  on app.remote_execution_source_allowlist;
create policy remote_execution_source_allowlist_member_all
on app.remote_execution_source_allowlist
for all
to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = remote_execution_source_allowlist.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = remote_execution_source_allowlist.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists remote_execution_provider_events_member_select
  on app.remote_execution_provider_events;
create policy remote_execution_provider_events_member_select
on app.remote_execution_provider_events
for select
to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = remote_execution_provider_events.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists remote_execution_provider_events_member_insert
  on app.remote_execution_provider_events;
create policy remote_execution_provider_events_member_insert
on app.remote_execution_provider_events
for insert
to ai_data_runtime
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = remote_execution_provider_events.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);
