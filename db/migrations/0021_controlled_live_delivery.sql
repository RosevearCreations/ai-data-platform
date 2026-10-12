create table if not exists app.workspace_consumer_live_activations (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  activation_id uuid not null,
  mapping_id uuid not null,
  publication_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  status text not null default 'active' check (status in ('active','revoked')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 256),
  publication_fingerprint text not null check (char_length(publication_fingerprint) between 1 and 128),
  mapping_fingerprint text not null check (char_length(mapping_fingerprint) between 1 and 128),
  package_id text not null check (char_length(package_id) between 1 and 512),
  replay_key text not null check (char_length(replay_key) between 1 and 1024),
  package_fingerprint text not null check (char_length(package_fingerprint) between 1 and 128),
  dry_run_receipt_id uuid not null,
  idempotency_key_source text not null default 'replayKey'
    check (idempotency_key_source = 'replayKey'),
  duplicate_behavior text not null default 'return-original-ack'
    check (duplicate_behavior = 'return-original-ack'),
  activation_fingerprint text not null check (char_length(activation_fingerprint) between 1 and 128),
  activated_by text not null references auth."user"(id) on delete restrict,
  activated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_by text references auth."user"(id) on delete restrict,
  revoked_at timestamptz,
  revocation_note text not null default '',
  primary key (workspace_id,activation_id),
  foreign key (workspace_id,mapping_id)
    references app.workspace_publication_delivery_mappings(workspace_id,mapping_id)
    on delete restrict,
  foreign key (workspace_id,publication_id)
    references app.workspace_dataset_publications(workspace_id,publication_id)
    on delete restrict,
  foreign key (workspace_id,dry_run_receipt_id)
    references app.workspace_publication_delivery_receipts(workspace_id,receipt_id)
    on delete restrict,
  check (expires_at > activated_at)
);

create unique index if not exists workspace_consumer_live_activations_active_mapping_idx
  on app.workspace_consumer_live_activations(workspace_id,mapping_id)
  where status='active';

create index if not exists workspace_consumer_live_activations_recent_idx
  on app.workspace_consumer_live_activations(workspace_id,activated_at desc);

create table if not exists app.workspace_publication_live_deliveries (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  delivery_id uuid not null,
  activation_id uuid not null,
  mapping_id uuid not null,
  publication_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 256),
  publication_fingerprint text not null check (char_length(publication_fingerprint) between 1 and 128),
  mapping_fingerprint text not null check (char_length(mapping_fingerprint) between 1 and 128),
  activation_fingerprint text not null check (char_length(activation_fingerprint) between 1 and 128),
  package_id text not null check (char_length(package_id) between 1 and 512),
  replay_key text not null check (char_length(replay_key) between 1 and 1024),
  package_fingerprint text not null check (char_length(package_fingerprint) between 1 and 128),
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 1024),
  status text not null default 'reserved'
    check (status in ('reserved','accepted','rejected','transport-error')),
  attempt_count integer not null default 1 check (attempt_count between 1 and 20),
  validation_code text not null default 'reserved'
    check (char_length(validation_code) between 1 and 96),
  http_status integer check (http_status is null or http_status between 100 and 599),
  consumer_received_at timestamptz,
  acknowledgement jsonb not null default '{}'::jsonb
    check (jsonb_typeof(acknowledgement)='object' and octet_length(acknowledgement::text) <= 4096),
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id,delivery_id),
  unique (workspace_id,consumer_id,package_id),
  foreign key (workspace_id,activation_id)
    references app.workspace_consumer_live_activations(workspace_id,activation_id)
    on delete restrict,
  foreign key (workspace_id,mapping_id)
    references app.workspace_publication_delivery_mappings(workspace_id,mapping_id)
    on delete restrict,
  foreign key (workspace_id,publication_id)
    references app.workspace_dataset_publications(workspace_id,publication_id)
    on delete restrict
);

create index if not exists workspace_publication_live_deliveries_recent_idx
  on app.workspace_publication_live_deliveries(workspace_id,created_at desc);

grant select,insert on app.workspace_consumer_live_activations to ai_data_runtime;
grant update (status,revoked_by,revoked_at,revocation_note)
  on app.workspace_consumer_live_activations to ai_data_runtime;

grant select,insert on app.workspace_publication_live_deliveries to ai_data_runtime;
grant update (
  status,attempt_count,validation_code,http_status,consumer_received_at,
  acknowledgement,last_attempt_at,updated_at
) on app.workspace_publication_live_deliveries to ai_data_runtime;

alter table app.workspace_consumer_live_activations enable row level security;
alter table app.workspace_publication_live_deliveries enable row level security;

drop policy if exists workspace_consumer_live_activations_member_select
  on app.workspace_consumer_live_activations;
create policy workspace_consumer_live_activations_member_select
on app.workspace_consumer_live_activations
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_consumer_live_activations.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true),'')
  )
);

drop policy if exists workspace_consumer_live_activations_manager_insert
  on app.workspace_consumer_live_activations;
create policy workspace_consumer_live_activations_manager_insert
on app.workspace_consumer_live_activations
for insert to ai_data_runtime
with check (
  activated_by = nullif(current_setting('app.user_id', true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_consumer_live_activations.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_consumer_live_activations_manager_update
  on app.workspace_consumer_live_activations;
create policy workspace_consumer_live_activations_manager_update
on app.workspace_consumer_live_activations
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_consumer_live_activations.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_consumer_live_activations.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_publication_live_deliveries_member_select
  on app.workspace_publication_live_deliveries;
create policy workspace_publication_live_deliveries_member_select
on app.workspace_publication_live_deliveries
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_publication_live_deliveries.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true),'')
  )
);

drop policy if exists workspace_publication_live_deliveries_manager_insert
  on app.workspace_publication_live_deliveries;
create policy workspace_publication_live_deliveries_manager_insert
on app.workspace_publication_live_deliveries
for insert to ai_data_runtime
with check (
  created_by = nullif(current_setting('app.user_id', true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_publication_live_deliveries.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_publication_live_deliveries_manager_update
  on app.workspace_publication_live_deliveries;
create policy workspace_publication_live_deliveries_manager_update
on app.workspace_publication_live_deliveries
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_publication_live_deliveries.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_publication_live_deliveries.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true),'')
      and wm.role in ('owner','admin')
  )
);
