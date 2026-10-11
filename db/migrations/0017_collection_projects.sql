create table if not exists app.workspace_collection_projects (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  project_id uuid not null,
  name text not null check (char_length(name) between 2 and 120),
  purpose text not null default '' check (char_length(purpose) <= 1000),
  status text not null default 'planning'
    check (status in ('planning','active','paused','complete','archived')),
  cadence text not null default '' check (char_length(cadence) <= 120),
  owner_label text not null default '' check (char_length(owner_label) <= 120),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, project_id)
);

create index if not exists workspace_collection_projects_recent_idx
  on app.workspace_collection_projects(workspace_id, updated_at desc);

create table if not exists app.workspace_collection_project_sources (
  workspace_id uuid not null,
  project_id uuid not null,
  source_id uuid not null,
  display_name text not null check (char_length(display_name) between 2 and 120),
  source_url text not null check (char_length(source_url) between 8 and 1000),
  source_origin text not null check (char_length(source_origin) between 8 and 255),
  collection_method text not null
    check (collection_method in ('official-api','official-dataset','user-export','public-webpage')),
  source_policy_id text not null default '' check (char_length(source_policy_id) <= 160),
  saved_scraper_id text not null default '' check (char_length(saved_scraper_id) <= 160),
  cadence text not null default '' check (char_length(cadence) <= 120),
  status text not null default 'planned'
    check (status in ('planned','active','paused','retired')),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, project_id, source_id),
  foreign key (workspace_id, project_id)
    references app.workspace_collection_projects(workspace_id, project_id)
    on delete cascade
);

create index if not exists workspace_collection_project_sources_project_idx
  on app.workspace_collection_project_sources(workspace_id, project_id, updated_at desc);

create index if not exists workspace_collection_project_sources_origin_idx
  on app.workspace_collection_project_sources(workspace_id, source_origin);

grant select, insert, update
  on app.workspace_collection_projects, app.workspace_collection_project_sources
  to ai_data_runtime;

alter table app.workspace_collection_projects enable row level security;
alter table app.workspace_collection_project_sources enable row level security;

drop policy if exists workspace_collection_projects_member_select
  on app.workspace_collection_projects;
create policy workspace_collection_projects_member_select
on app.workspace_collection_projects
for select
to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_collection_projects.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists workspace_collection_projects_manager_insert
  on app.workspace_collection_projects;
create policy workspace_collection_projects_manager_insert
on app.workspace_collection_projects
for insert
to ai_data_runtime
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_collection_projects.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_collection_projects_manager_update
  on app.workspace_collection_projects;
create policy workspace_collection_projects_manager_update
on app.workspace_collection_projects
for update
to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_collection_projects.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_collection_projects.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_collection_project_sources_member_select
  on app.workspace_collection_project_sources;
create policy workspace_collection_project_sources_member_select
on app.workspace_collection_project_sources
for select
to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_collection_project_sources.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists workspace_collection_project_sources_manager_insert
  on app.workspace_collection_project_sources;
create policy workspace_collection_project_sources_manager_insert
on app.workspace_collection_project_sources
for insert
to ai_data_runtime
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_collection_project_sources.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_collection_project_sources_manager_update
  on app.workspace_collection_project_sources;
create policy workspace_collection_project_sources_manager_update
on app.workspace_collection_project_sources
for update
to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_collection_project_sources.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_collection_project_sources.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);
