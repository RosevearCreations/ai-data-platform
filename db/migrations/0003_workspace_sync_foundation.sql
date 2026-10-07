create table if not exists app.workspace_saved_scrapers (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  scraper_id text not null,
  kind text not null check (kind in ('scraper', 'template')),
  name text not null,
  source_url text not null default '',
  source_origin text not null default '',
  client_updated_at timestamptz not null,
  server_version bigint not null default 1 check (server_version >= 1),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, scraper_id)
);

create index if not exists workspace_saved_scrapers_updated_idx
  on app.workspace_saved_scrapers(workspace_id, updated_at desc);

create table if not exists app.workspace_reviewed_datasets (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  dataset_id text not null,
  recipe_name text not null,
  source_url text not null default '',
  retrieved_at timestamptz not null,
  client_updated_at timestamptz not null,
  row_count integer not null check (row_count between 0 and 500),
  server_version bigint not null default 1 check (server_version >= 1),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, dataset_id)
);

create index if not exists workspace_reviewed_datasets_updated_idx
  on app.workspace_reviewed_datasets(workspace_id, updated_at desc);

grant select, insert, update, delete
  on app.workspace_saved_scrapers, app.workspace_reviewed_datasets
  to ai_data_runtime;

alter table app.workspace_saved_scrapers enable row level security;
alter table app.workspace_reviewed_datasets enable row level security;

drop policy if exists workspace_saved_scrapers_member_all
  on app.workspace_saved_scrapers;
create policy workspace_saved_scrapers_member_all
on app.workspace_saved_scrapers
for all
to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_saved_scrapers.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
)
with check (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_saved_scrapers.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists workspace_reviewed_datasets_member_all
  on app.workspace_reviewed_datasets;
create policy workspace_reviewed_datasets_member_all
on app.workspace_reviewed_datasets
for all
to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_reviewed_datasets.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
)
with check (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_reviewed_datasets.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);
