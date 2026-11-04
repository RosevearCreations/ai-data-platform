-- Build 288 — Schema Drift Detection & Mapping Repair Assistant
-- Add source-schema pins, durable drift scans, reviewed repair sessions and append-only evidence.

alter table app.workspace_field_mapping_profiles
  add column if not exists source_schema_version text,
  add column if not exists source_schema_fingerprint text,
  add column if not exists source_schema_fields jsonb,
  add column if not exists source_schema_reviewed_at timestamptz;

alter table app.workspace_field_mapping_profiles
  drop constraint if exists workspace_field_mapping_profiles_source_schema_fingerprint_check;
alter table app.workspace_field_mapping_profiles
  add constraint workspace_field_mapping_profiles_source_schema_fingerprint_check
  check (
    source_schema_fingerprint is null
    or source_schema_fingerprint ~ '^[0-9a-f]{64}$'
  );

alter table app.workspace_field_mapping_profiles
  drop constraint if exists workspace_field_mapping_profiles_source_schema_fields_check;
alter table app.workspace_field_mapping_profiles
  add constraint workspace_field_mapping_profiles_source_schema_fields_check
  check (
    source_schema_fields is null
    or (
      jsonb_typeof(source_schema_fields)='array'
      and octet_length(source_schema_fields::text) <= 65536
    )
  );

create table if not exists app.workspace_field_mapping_drift_scans (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  drift_scan_id uuid not null,
  mapping_profile_id uuid not null,
  profile_revision integer not null check (profile_revision > 0),
  source_schema_version text not null check (char_length(source_schema_version) between 1 and 120),
  source_schema_fingerprint text not null check (source_schema_fingerprint ~ '^[0-9a-f]{64}$'),
  source_schema_fields jsonb not null check (
    jsonb_typeof(source_schema_fields)='array'
    and octet_length(source_schema_fields::text) <= 65536
  ),
  canonical_schema_fingerprint text not null check (canonical_schema_fingerprint ~ '^[0-9a-f]{64}$'),
  canonical_schema_fields jsonb not null check (
    jsonb_typeof(canonical_schema_fields)='array'
    and octet_length(canonical_schema_fields::text) <= 65536
  ),
  drift_state text not null check (
    drift_state in ('baseline-required','clean','drift-detected')
  ),
  source_changes jsonb not null default '[]'::jsonb check (
    jsonb_typeof(source_changes)='array'
    and octet_length(source_changes::text) <= 65536
  ),
  canonical_changes jsonb not null default '[]'::jsonb check (
    jsonb_typeof(canonical_changes)='array'
    and octet_length(canonical_changes::text) <= 65536
  ),
  affected_mappings jsonb not null default '[]'::jsonb check (
    jsonb_typeof(affected_mappings)='array'
    and octet_length(affected_mappings::text) <= 65536
  ),
  repair_suggestions jsonb not null default '[]'::jsonb check (
    jsonb_typeof(repair_suggestions)='array'
    and octet_length(repair_suggestions::text) <= 65536
  ),
  scanned_by text not null references auth."user"(id) on delete restrict,
  scanned_at timestamptz not null default now(),
  primary key (workspace_id, drift_scan_id),
  foreign key (workspace_id, mapping_profile_id)
    references app.workspace_field_mapping_profiles(workspace_id, mapping_profile_id)
    on delete restrict
);

create table if not exists app.workspace_field_mapping_repair_sessions (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  repair_session_id uuid not null,
  drift_scan_id uuid not null,
  mapping_profile_id uuid not null,
  source_profile_revision integer not null check (source_profile_revision > 0),
  proposed_mapping_entries jsonb not null check (
    jsonb_typeof(proposed_mapping_entries)='array'
    and octet_length(proposed_mapping_entries::text) <= 65536
  ),
  source_schema_version text not null check (char_length(source_schema_version) between 1 and 120),
  source_schema_fingerprint text not null check (source_schema_fingerprint ~ '^[0-9a-f]{64}$'),
  source_schema_fields jsonb not null check (
    jsonb_typeof(source_schema_fields)='array'
    and octet_length(source_schema_fields::text) <= 65536
  ),
  canonical_schema_fingerprint text not null check (canonical_schema_fingerprint ~ '^[0-9a-f]{64}$'),
  status text not null default 'prepared' check (
    status in ('prepared','applied-to-mapping-draft','cancelled')
  ),
  note text not null default '' check (char_length(note) <= 4000),
  created_by text not null references auth."user"(id) on delete restrict,
  updated_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, repair_session_id),
  foreign key (workspace_id, drift_scan_id)
    references app.workspace_field_mapping_drift_scans(workspace_id, drift_scan_id)
    on delete restrict,
  foreign key (workspace_id, mapping_profile_id)
    references app.workspace_field_mapping_profiles(workspace_id, mapping_profile_id)
    on delete restrict
);

create table if not exists app.workspace_field_mapping_drift_events (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  event_id uuid not null,
  mapping_profile_id uuid not null,
  drift_scan_id uuid,
  repair_session_id uuid,
  event_type text not null check (
    event_type in ('scan-recorded','repair-prepared','repair-applied-to-draft','repair-cancelled')
  ),
  actor_user_id text not null references auth."user"(id) on delete restrict,
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

create index if not exists workspace_field_mapping_drift_scans_profile_idx
  on app.workspace_field_mapping_drift_scans(
    workspace_id, mapping_profile_id, scanned_at desc
  );

create index if not exists workspace_field_mapping_repair_sessions_profile_idx
  on app.workspace_field_mapping_repair_sessions(
    workspace_id, mapping_profile_id, status, updated_at desc
  );

create index if not exists workspace_field_mapping_drift_events_recent_idx
  on app.workspace_field_mapping_drift_events(
    workspace_id, mapping_profile_id, created_at desc
  );

grant select, insert on app.workspace_field_mapping_drift_scans to ai_data_runtime;
grant select, insert, update on app.workspace_field_mapping_repair_sessions to ai_data_runtime;
grant select, insert on app.workspace_field_mapping_drift_events to ai_data_runtime;

alter table app.workspace_field_mapping_drift_scans enable row level security;
alter table app.workspace_field_mapping_repair_sessions enable row level security;
alter table app.workspace_field_mapping_drift_events enable row level security;

drop policy if exists field_mapping_drift_scan_read on app.workspace_field_mapping_drift_scans;
create policy field_mapping_drift_scan_read
on app.workspace_field_mapping_drift_scans
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_field_mapping_drift_scans.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists field_mapping_drift_scan_insert on app.workspace_field_mapping_drift_scans;
create policy field_mapping_drift_scan_insert
on app.workspace_field_mapping_drift_scans
for insert to ai_data_runtime
with check (
  scanned_by = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_field_mapping_drift_scans.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists field_mapping_repair_read on app.workspace_field_mapping_repair_sessions;
create policy field_mapping_repair_read
on app.workspace_field_mapping_repair_sessions
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_field_mapping_repair_sessions.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists field_mapping_repair_insert on app.workspace_field_mapping_repair_sessions;
create policy field_mapping_repair_insert
on app.workspace_field_mapping_repair_sessions
for insert to ai_data_runtime
with check (
  created_by = nullif(current_setting('app.user_id', true), '')
  and updated_by = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_field_mapping_repair_sessions.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists field_mapping_repair_update on app.workspace_field_mapping_repair_sessions;
create policy field_mapping_repair_update
on app.workspace_field_mapping_repair_sessions
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_field_mapping_repair_sessions.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
)
with check (
  updated_by = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_field_mapping_repair_sessions.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists field_mapping_drift_event_read on app.workspace_field_mapping_drift_events;
create policy field_mapping_drift_event_read
on app.workspace_field_mapping_drift_events
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_field_mapping_drift_events.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists field_mapping_drift_event_insert on app.workspace_field_mapping_drift_events;
create policy field_mapping_drift_event_insert
on app.workspace_field_mapping_drift_events
for insert to ai_data_runtime
with check (
  actor_user_id = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_field_mapping_drift_events.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);
