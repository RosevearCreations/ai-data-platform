create table if not exists app.workspace_connector_installations (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  connector_key text not null,
  manifest_version integer not null,
  connector_version text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  granted_capabilities jsonb not null default '[]'::jsonb check (jsonb_typeof(granted_capabilities) = 'array'),
  secret_refs jsonb not null default '{}'::jsonb check (jsonb_typeof(secret_refs) = 'object'),
  installed_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, connector_key)
);

create table if not exists app.workspace_connector_audit (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  audit_id uuid not null,
  connector_key text not null,
  capability text not null check (capability in ('import','enrichment','export')),
  status text not null check (status in ('succeeded','failed','blocked')),
  actor_user_id text not null references auth."user"(id) on delete restrict,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  duration_ms integer not null check (duration_ms >= 0),
  input_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(input_summary) = 'object'),
  output_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(output_summary) = 'object'),
  error_code text,
  created_at timestamptz not null default now(),
  primary key (workspace_id, audit_id)
);

create index if not exists workspace_connector_audit_recent_idx
  on app.workspace_connector_audit(workspace_id, created_at desc);

grant select, insert, update on app.workspace_connector_installations to ai_data_runtime;
grant select, insert on app.workspace_connector_audit to ai_data_runtime;

alter table app.workspace_connector_installations enable row level security;
alter table app.workspace_connector_audit enable row level security;

drop policy if exists connector_installation_read on app.workspace_connector_installations;
create policy connector_installation_read
on app.workspace_connector_installations
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_connector_installations.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists connector_installation_insert on app.workspace_connector_installations;
create policy connector_installation_insert
on app.workspace_connector_installations
for insert to ai_data_runtime
with check (
  installed_by = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_connector_installations.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists connector_installation_update on app.workspace_connector_installations;
create policy connector_installation_update
on app.workspace_connector_installations
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_connector_installations.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_connector_installations.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists connector_audit_read on app.workspace_connector_audit;
create policy connector_audit_read
on app.workspace_connector_audit
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_connector_audit.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists connector_audit_insert on app.workspace_connector_audit;
create policy connector_audit_insert
on app.workspace_connector_audit
for insert to ai_data_runtime
with check (
  actor_user_id = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_connector_audit.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);
