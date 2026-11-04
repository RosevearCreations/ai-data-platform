-- Build 287 — Visual Field Mapping Studio
-- Persist reviewed application-to-canonical-contract mapping profiles without activating live exchange.

create table if not exists app.workspace_field_mapping_profiles (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  mapping_profile_id uuid not null,
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
  contract_id text not null check (char_length(contract_id) between 3 and 160),
  contract_version text not null check (char_length(contract_version) between 1 and 32),
  schema_fingerprint text not null check (schema_fingerprint ~ '^[0-9a-f]{64}$'),
  profile_name text not null check (char_length(profile_name) between 1 and 120),
  source_schema_label text not null default '' check (char_length(source_schema_label) <= 240),
  mapping_entries jsonb not null default '[]'::jsonb check (
    jsonb_typeof(mapping_entries)='array'
    and octet_length(mapping_entries::text) <= 65536
  ),
  notes text not null default '' check (char_length(notes) <= 4000),
  review_status text not null default 'draft' check (review_status in ('draft','reviewed')),
  revision integer not null default 1 check (revision > 0),
  reviewed_by text references auth."user"(id) on delete set null,
  reviewed_at timestamptz,
  created_by text not null references auth."user"(id) on delete restrict,
  updated_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, mapping_profile_id),
  unique (workspace_id, application_id, contract_id, profile_name),
  check (
    (review_status='draft' and reviewed_by is null and reviewed_at is null)
    or
    (review_status='reviewed' and reviewed_by is not null and reviewed_at is not null)
  )
);

create table if not exists app.workspace_field_mapping_profile_events (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  event_id uuid not null,
  mapping_profile_id uuid not null,
  event_type text not null check (
    event_type in ('created','saved','reviewed','reopened')
  ),
  actor_user_id text not null references auth."user"(id) on delete restrict,
  revision integer not null check (revision > 0),
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details)='object'
    and octet_length(details::text) <= 8192
  ),
  created_at timestamptz not null default now(),
  primary key (workspace_id, event_id),
  foreign key (workspace_id, mapping_profile_id)
    references app.workspace_field_mapping_profiles(workspace_id, mapping_profile_id)
    on delete restrict
);

create index if not exists workspace_field_mapping_profiles_lookup_idx
  on app.workspace_field_mapping_profiles(
    workspace_id, application_id, contract_id, review_status, updated_at desc
  );

create index if not exists workspace_field_mapping_profile_events_recent_idx
  on app.workspace_field_mapping_profile_events(
    workspace_id, mapping_profile_id, created_at desc
  );

grant select, insert, update on app.workspace_field_mapping_profiles to ai_data_runtime;
grant select, insert on app.workspace_field_mapping_profile_events to ai_data_runtime;

alter table app.workspace_field_mapping_profiles enable row level security;
alter table app.workspace_field_mapping_profile_events enable row level security;

drop policy if exists field_mapping_profile_read on app.workspace_field_mapping_profiles;
create policy field_mapping_profile_read
on app.workspace_field_mapping_profiles
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_field_mapping_profiles.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists field_mapping_profile_insert on app.workspace_field_mapping_profiles;
create policy field_mapping_profile_insert
on app.workspace_field_mapping_profiles
for insert to ai_data_runtime
with check (
  created_by = nullif(current_setting('app.user_id', true), '')
  and updated_by = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_field_mapping_profiles.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists field_mapping_profile_update on app.workspace_field_mapping_profiles;
create policy field_mapping_profile_update
on app.workspace_field_mapping_profiles
for update to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_field_mapping_profiles.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
)
with check (
  updated_by = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_field_mapping_profiles.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists field_mapping_profile_event_read on app.workspace_field_mapping_profile_events;
create policy field_mapping_profile_event_read
on app.workspace_field_mapping_profile_events
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_field_mapping_profile_events.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists field_mapping_profile_event_insert on app.workspace_field_mapping_profile_events;
create policy field_mapping_profile_event_insert
on app.workspace_field_mapping_profile_events
for insert to ai_data_runtime
with check (
  actor_user_id = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_field_mapping_profile_events.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);
