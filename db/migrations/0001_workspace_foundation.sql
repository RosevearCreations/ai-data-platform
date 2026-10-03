create table if not exists app.workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  type text not null check (type in ('business', 'personal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.workspace_members (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  user_id text not null references auth."user"(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_id_idx
  on app.workspace_members(user_id);

insert into app.workspaces (id, slug, name, type)
values
  ('00000000-0000-4000-8000-000000000001', 'rosiedazzlers', 'Rosie Dazzlers', 'business'),
  ('00000000-0000-4000-8000-000000000002', 'devilndove', 'Devil n Dove', 'business'),
  ('00000000-0000-4000-8000-000000000003', 'personal', 'Personal', 'personal')
on conflict (slug) do update
set
  name = excluded.name,
  type = excluded.type,
  updated_at = now();

grant usage on schema app to ai_data_runtime;
grant select on app.workspaces, app.workspace_members to ai_data_runtime;

alter table app.workspaces enable row level security;
alter table app.workspace_members enable row level security;

drop policy if exists workspace_member_read on app.workspace_members;
create policy workspace_member_read
on app.workspace_members
for select
to ai_data_runtime
using (
  user_id = nullif(current_setting('app.user_id', true), '')
);

drop policy if exists workspace_read on app.workspaces;
create policy workspace_read
on app.workspaces
for select
to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);
