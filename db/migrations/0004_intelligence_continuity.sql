create table if not exists app.workspace_intelligence_modules (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  module_key text not null check (
    module_key in (
      'history',
      'rosie-competitive',
      'devil-supplier',
      'movie-metadata',
      'scheduled-jobs',
      'business-integrations'
    )
  ),
  client_updated_at timestamptz not null,
  server_version bigint not null default 1 check (server_version >= 1),
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, module_key)
);

create index if not exists workspace_intelligence_modules_updated_idx
  on app.workspace_intelligence_modules(workspace_id, updated_at desc);

create table if not exists app.workspace_intelligence_audit (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  audit_id text not null,
  module_key text not null default 'business-integrations'
    check (module_key = 'business-integrations'),
  batch_id text not null,
  target text not null check (target in ('rosie-dazzlers', 'devil-n-dove')),
  action text not null check (
    action in ('dry-run-created', 'approved', 'exported', 'cancelled')
  ),
  occurred_at timestamptz not null,
  fingerprint text not null,
  details text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  primary key (workspace_id, audit_id)
);

create index if not exists workspace_intelligence_audit_recent_idx
  on app.workspace_intelligence_audit(workspace_id, occurred_at desc);

grant select, insert, update
  on app.workspace_intelligence_modules
  to ai_data_runtime;

grant select, insert
  on app.workspace_intelligence_audit
  to ai_data_runtime;

alter table app.workspace_intelligence_modules enable row level security;
alter table app.workspace_intelligence_audit enable row level security;

drop policy if exists workspace_intelligence_modules_member_all
  on app.workspace_intelligence_modules;
create policy workspace_intelligence_modules_member_all
on app.workspace_intelligence_modules
for all
to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_intelligence_modules.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
)
with check (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_intelligence_modules.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists workspace_intelligence_audit_member_select
  on app.workspace_intelligence_audit;
create policy workspace_intelligence_audit_member_select
on app.workspace_intelligence_audit
for select
to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_intelligence_audit.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists workspace_intelligence_audit_member_insert
  on app.workspace_intelligence_audit;
create policy workspace_intelligence_audit_member_insert
on app.workspace_intelligence_audit
for insert
to ai_data_runtime
with check (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_intelligence_audit.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);
