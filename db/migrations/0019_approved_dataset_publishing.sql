create table if not exists app.workspace_dataset_publications (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  publication_id uuid not null,
  review_id uuid not null,
  source_dataset_id text not null,
  source_server_version bigint not null check (source_server_version >= 1),
  source_fingerprint text not null,
  title text not null check (char_length(title) between 1 and 240),
  source_url text not null default '',
  status text not null default 'published'
    check (status in ('published','withdrawn')),
  publication_fingerprint text not null,
  row_count integer not null check (row_count between 1 and 500),
  field_order jsonb not null check (jsonb_typeof(field_order) = 'array'),
  published_rows jsonb not null check (jsonb_typeof(published_rows) = 'array'),
  approval_note text not null default '',
  publication_note text not null default '',
  review_approved_by text,
  review_approved_at timestamptz not null,
  published_by text not null,
  published_at timestamptz not null default now(),
  withdrawn_by text,
  withdrawn_at timestamptz,
  withdrawal_note text not null default '',
  primary key (workspace_id, publication_id),
  unique (workspace_id, review_id),
  foreign key (workspace_id, review_id)
    references app.workspace_data_review_batches(workspace_id, review_id)
    on delete restrict
);

create index if not exists workspace_dataset_publications_recent_idx
  on app.workspace_dataset_publications(workspace_id, published_at desc);

create index if not exists workspace_dataset_publications_status_idx
  on app.workspace_dataset_publications(workspace_id, status, published_at desc);

create table if not exists app.workspace_dataset_publication_events (
  workspace_id uuid not null,
  event_id uuid not null,
  publication_id uuid not null,
  action text not null
    check (action in ('published','exported-json','exported-csv','withdrawn')),
  actor_user_id text not null,
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  primary key (workspace_id, event_id),
  foreign key (workspace_id, publication_id)
    references app.workspace_dataset_publications(workspace_id, publication_id)
    on delete cascade
);

create index if not exists workspace_dataset_publication_events_publication_idx
  on app.workspace_dataset_publication_events(workspace_id, publication_id, created_at desc);

grant select, insert, update on app.workspace_dataset_publications to ai_data_runtime;
grant select, insert on app.workspace_dataset_publication_events to ai_data_runtime;

alter table app.workspace_dataset_publications enable row level security;
alter table app.workspace_dataset_publication_events enable row level security;

drop policy if exists workspace_dataset_publications_member_select
  on app.workspace_dataset_publications;
create policy workspace_dataset_publications_member_select
on app.workspace_dataset_publications
for select
to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_dataset_publications.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists workspace_dataset_publications_manager_insert
  on app.workspace_dataset_publications;
create policy workspace_dataset_publications_manager_insert
on app.workspace_dataset_publications
for insert
to ai_data_runtime
with check (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_dataset_publications.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_dataset_publications_manager_update
  on app.workspace_dataset_publications;
create policy workspace_dataset_publications_manager_update
on app.workspace_dataset_publications
for update
to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_dataset_publications.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_dataset_publications.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_dataset_publication_events_member_select
  on app.workspace_dataset_publication_events;
create policy workspace_dataset_publication_events_member_select
on app.workspace_dataset_publication_events
for select
to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_dataset_publication_events.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists workspace_dataset_publication_events_member_insert
  on app.workspace_dataset_publication_events;
create policy workspace_dataset_publication_events_member_insert
on app.workspace_dataset_publication_events
for insert
to ai_data_runtime
with check (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_dataset_publication_events.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);
