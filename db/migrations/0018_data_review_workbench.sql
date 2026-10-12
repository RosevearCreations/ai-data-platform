create table if not exists app.workspace_data_review_batches (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  review_id uuid not null,
  source_dataset_id text not null,
  source_server_version bigint not null check (source_server_version >= 1),
  source_fingerprint text not null,
  title text not null,
  source_url text not null default '',
  status text not null default 'in-review'
    check (status in ('in-review','approved','rejected')),
  original_payload jsonb not null check (jsonb_typeof(original_payload) = 'object'),
  working_rows jsonb not null check (jsonb_typeof(working_rows) = 'array'),
  row_count integer not null check (row_count between 0 and 500),
  included_count integer not null check (included_count between 0 and 500),
  cleanup_summary jsonb not null default '{}'::jsonb
    check (jsonb_typeof(cleanup_summary) = 'object'),
  review_note text not null default '',
  created_by text not null,
  updated_by text not null,
  approved_by text,
  approved_at timestamptz,
  rejected_by text,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, review_id),
  unique (workspace_id, source_dataset_id, source_server_version, source_fingerprint)
);

create index if not exists workspace_data_review_batches_status_idx
  on app.workspace_data_review_batches(workspace_id, status, updated_at desc);

create table if not exists app.workspace_data_review_events (
  workspace_id uuid not null,
  event_id uuid not null,
  review_id uuid not null,
  action text not null check (action in ('created','saved','approved','rejected')),
  actor_user_id text not null,
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  primary key (workspace_id, event_id),
  foreign key (workspace_id, review_id)
    references app.workspace_data_review_batches(workspace_id, review_id)
    on delete cascade
);

create index if not exists workspace_data_review_events_review_idx
  on app.workspace_data_review_events(workspace_id, review_id, created_at desc);

grant select, insert, update on app.workspace_data_review_batches to ai_data_runtime;
grant select, insert on app.workspace_data_review_events to ai_data_runtime;

alter table app.workspace_data_review_batches enable row level security;
alter table app.workspace_data_review_events enable row level security;

drop policy if exists workspace_data_review_batches_member_all
  on app.workspace_data_review_batches;
create policy workspace_data_review_batches_member_all
on app.workspace_data_review_batches
for all
to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_data_review_batches.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
)
with check (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_data_review_batches.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists workspace_data_review_events_member_select
  on app.workspace_data_review_events;
create policy workspace_data_review_events_member_select
on app.workspace_data_review_events
for select
to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_data_review_events.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists workspace_data_review_events_member_insert
  on app.workspace_data_review_events;
create policy workspace_data_review_events_member_insert
on app.workspace_data_review_events
for insert
to ai_data_runtime
with check (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_data_review_events.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);
