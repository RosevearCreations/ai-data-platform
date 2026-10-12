create table if not exists app.workspace_publication_delivery_mappings (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  mapping_id uuid not null,
  publication_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  status text not null default 'active' check (status in ('active','retired')),
  integration_key_field text not null check (char_length(integration_key_field) between 1 and 128),
  operation_action text not null default 'create' check (operation_action in ('create','update')),
  evidence_url_field text,
  evidence_timestamp_field text not null check (char_length(evidence_timestamp_field) between 1 and 128),
  field_map jsonb not null check (
    jsonb_typeof(field_map)='object'
    and octet_length(field_map::text) <= 8192
  ),
  mapping_fingerprint text not null check (char_length(mapping_fingerprint) between 1 and 128),
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  retired_by text references auth."user"(id) on delete restrict,
  retired_at timestamptz,
  retirement_note text not null default '',
  primary key (workspace_id,mapping_id),
  unique (workspace_id,publication_id,target,mapping_fingerprint),
  foreign key (workspace_id,publication_id)
    references app.workspace_dataset_publications(workspace_id,publication_id)
    on delete restrict
);

create index if not exists workspace_publication_delivery_mappings_recent_idx
  on app.workspace_publication_delivery_mappings(workspace_id,created_at desc);

create table if not exists app.workspace_publication_delivery_receipts (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  receipt_id uuid not null,
  mapping_id uuid not null,
  publication_id uuid not null,
  publication_fingerprint text not null,
  mapping_fingerprint text not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  transport_mode text not null check (transport_mode in ('conformance','live')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 256),
  package_id text not null check (char_length(package_id) between 1 and 512),
  replay_key text not null check (char_length(replay_key) between 1 and 1024),
  package_fingerprint text not null check (char_length(package_fingerprint) between 1 and 128),
  receipt_status text not null check (receipt_status in ('accepted','rejected','transport-error')),
  validation_code text not null check (char_length(validation_code) between 1 and 96),
  dry_run boolean not null default true,
  consumer_received_at timestamptz,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details)='object' and octet_length(details::text) <= 4096
  ),
  created_at timestamptz not null default now(),
  primary key (workspace_id,receipt_id),
  foreign key (workspace_id,mapping_id)
    references app.workspace_publication_delivery_mappings(workspace_id,mapping_id)
    on delete restrict,
  foreign key (workspace_id,publication_id)
    references app.workspace_dataset_publications(workspace_id,publication_id)
    on delete restrict
);

create index if not exists workspace_publication_delivery_receipts_recent_idx
  on app.workspace_publication_delivery_receipts(workspace_id,created_at desc);

grant select, insert on app.workspace_publication_delivery_mappings to ai_data_runtime;
grant update (status,retired_by,retired_at,retirement_note)
  on app.workspace_publication_delivery_mappings to ai_data_runtime;
grant select, insert on app.workspace_publication_delivery_receipts to ai_data_runtime;

alter table app.workspace_publication_delivery_mappings enable row level security;
alter table app.workspace_publication_delivery_receipts enable row level security;

drop policy if exists workspace_publication_delivery_mappings_member_select
  on app.workspace_publication_delivery_mappings;
create policy workspace_publication_delivery_mappings_member_select
on app.workspace_publication_delivery_mappings
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_publication_delivery_mappings.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true),'')
  )
);

drop policy if exists workspace_publication_delivery_mappings_manager_insert
  on app.workspace_publication_delivery_mappings;
create policy workspace_publication_delivery_mappings_manager_insert
on app.workspace_publication_delivery_mappings
for insert to ai_data_runtime
with check (
  created_by = nullif(current_setting('app.user_id', true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_publication_delivery_mappings.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_publication_delivery_mappings_manager_update
  on app.workspace_publication_delivery_mappings;
create policy workspace_publication_delivery_mappings_manager_update
on app.workspace_publication_delivery_mappings
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_publication_delivery_mappings.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_publication_delivery_mappings.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_publication_delivery_receipts_member_select
  on app.workspace_publication_delivery_receipts;
create policy workspace_publication_delivery_receipts_member_select
on app.workspace_publication_delivery_receipts
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_publication_delivery_receipts.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true),'')
  )
);

drop policy if exists workspace_publication_delivery_receipts_manager_insert
  on app.workspace_publication_delivery_receipts;
create policy workspace_publication_delivery_receipts_manager_insert
on app.workspace_publication_delivery_receipts
for insert to ai_data_runtime
with check (
  actor_user_id = nullif(current_setting('app.user_id', true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_publication_delivery_receipts.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true),'')
      and wm.role in ('owner','admin')
  )
);
