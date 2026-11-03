create table if not exists app.workspace_credential_references (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  credential_ref_id uuid not null,
  application_id text not null check (
    application_id in (
      'devilndove',
      'rosiedazzlers',
      'yard-workers',
      'icamp',
      'rosevear-comms-hub',
      'rosevear-ai-hub'
    )
  ),
  environment text not null check (environment in ('local','preview','production')),
  label text not null check (char_length(label) between 1 and 120),
  provider_name text not null check (char_length(provider_name) between 1 and 120),
  reference_kind text not null check (
    reference_kind in ('environment-variable','external-vault-reference','provider-managed-reference')
  ),
  reference_locator text not null check (
    char_length(reference_locator) between 3 and 240
    and (
      (reference_kind='environment-variable' and reference_locator ~ '^[A-Z][A-Z0-9_]{2,127}$')
      or
      (reference_kind='external-vault-reference' and reference_locator ~ '^vault:[a-z0-9][a-z0-9._-]{1,63}:[A-Za-z0-9._/-]{1,160}$')
      or
      (reference_kind='provider-managed-reference' and reference_locator ~ '^provider:[a-z0-9][a-z0-9._-]{1,63}:[A-Za-z0-9._/-]{1,160}$')
    )
  ),
  lifecycle_status text not null default 'active' check (lifecycle_status in ('active','revoked')),
  replacement_state text not null default 'not-planned' check (replacement_state in ('not-planned','prepared')),
  rotation_due_at timestamptz,
  expires_at timestamptz,
  last_rotated_at timestamptz,
  created_by text not null references auth."user"(id) on delete restrict,
  updated_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, credential_ref_id),
  unique (workspace_id, application_id, environment, reference_kind, reference_locator),
  check (expires_at is null or rotation_due_at is null or rotation_due_at <= expires_at)
);

create table if not exists app.workspace_credential_reference_events (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  event_id uuid not null,
  credential_ref_id uuid not null,
  event_type text not null check (
    event_type in (
      'created',
      'rotation-scheduled',
      'replacement-prepared',
      'rotation-completed',
      'revoked'
    )
  ),
  actor_user_id text not null references auth."user"(id) on delete restrict,
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details)='object' and octet_length(details::text) <= 4096
  ),
  created_at timestamptz not null default now(),
  primary key (workspace_id, event_id),
  foreign key (workspace_id, credential_ref_id)
    references app.workspace_credential_references(workspace_id, credential_ref_id)
    on delete restrict
);

create index if not exists workspace_credential_references_rotation_idx
  on app.workspace_credential_references(workspace_id, lifecycle_status, rotation_due_at, expires_at);

create index if not exists workspace_credential_reference_events_recent_idx
  on app.workspace_credential_reference_events(workspace_id, credential_ref_id, created_at desc);

grant select, insert, update on app.workspace_credential_references to ai_data_runtime;
grant select, insert on app.workspace_credential_reference_events to ai_data_runtime;

alter table app.workspace_credential_references enable row level security;
alter table app.workspace_credential_reference_events enable row level security;

drop policy if exists credential_reference_read on app.workspace_credential_references;
create policy credential_reference_read
on app.workspace_credential_references
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_credential_references.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists credential_reference_insert on app.workspace_credential_references;
create policy credential_reference_insert
on app.workspace_credential_references
for insert to ai_data_runtime
with check (
  created_by = nullif(current_setting('app.user_id', true), '')
  and updated_by = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_credential_references.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists credential_reference_update on app.workspace_credential_references;
create policy credential_reference_update
on app.workspace_credential_references
for update to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_credential_references.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
)
with check (
  updated_by = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_credential_references.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists credential_reference_event_read on app.workspace_credential_reference_events;
create policy credential_reference_event_read
on app.workspace_credential_reference_events
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_credential_reference_events.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists credential_reference_event_insert on app.workspace_credential_reference_events;
create policy credential_reference_event_insert
on app.workspace_credential_reference_events
for insert to ai_data_runtime
with check (
  actor_user_id = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_credential_reference_events.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);
