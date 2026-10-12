create table if not exists app.workspace_live_delivery_reconciliations (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  reconciliation_id uuid not null,
  delivery_id uuid not null,
  activation_id uuid not null,
  mapping_id uuid not null,
  publication_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 256),
  package_id text not null check (char_length(package_id) between 1 and 512),
  replay_key text not null check (char_length(replay_key) between 1 and 1024),
  package_fingerprint text not null check (char_length(package_fingerprint) between 1 and 128),
  status text not null check (status in ('matched','drift','rejected','transport-error')),
  expected_record_count integer not null check (expected_record_count between 1 and 500),
  matched_count integer not null default 0 check (matched_count between 0 and 500),
  mismatched_count integer not null default 0 check (mismatched_count between 0 and 500),
  missing_count integer not null default 0 check (missing_count between 0 and 500),
  validation_code text not null check (char_length(validation_code) between 1 and 96),
  http_status integer check (http_status is null or http_status between 100 and 599),
  consumer_verified_at timestamptz,
  verification_fingerprint text not null check (char_length(verification_fingerprint) between 1 and 128),
  record_results jsonb not null default '[]'::jsonb check (
    jsonb_typeof(record_results)='array'
    and jsonb_array_length(record_results) <= 500
    and octet_length(record_results::text) <= 262144
  ),
  actor_user_id text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (workspace_id,reconciliation_id),
  foreign key (workspace_id,delivery_id)
    references app.workspace_publication_live_deliveries(workspace_id,delivery_id)
    on delete restrict,
  foreign key (workspace_id,activation_id)
    references app.workspace_consumer_live_activations(workspace_id,activation_id)
    on delete restrict,
  foreign key (workspace_id,mapping_id)
    references app.workspace_publication_delivery_mappings(workspace_id,mapping_id)
    on delete restrict,
  foreign key (workspace_id,publication_id)
    references app.workspace_dataset_publications(workspace_id,publication_id)
    on delete restrict,
  check (matched_count + mismatched_count + missing_count = expected_record_count)
);

create index if not exists workspace_live_delivery_reconciliations_recent_idx
  on app.workspace_live_delivery_reconciliations(workspace_id,created_at desc);

create index if not exists workspace_live_delivery_reconciliations_delivery_idx
  on app.workspace_live_delivery_reconciliations(workspace_id,delivery_id,created_at desc);

grant select,insert on app.workspace_live_delivery_reconciliations to ai_data_runtime;

alter table app.workspace_live_delivery_reconciliations enable row level security;

drop policy if exists workspace_live_delivery_reconciliations_member_select
  on app.workspace_live_delivery_reconciliations;
create policy workspace_live_delivery_reconciliations_member_select
on app.workspace_live_delivery_reconciliations
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_live_delivery_reconciliations.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true),'')
  )
);

drop policy if exists workspace_live_delivery_reconciliations_manager_insert
  on app.workspace_live_delivery_reconciliations;
create policy workspace_live_delivery_reconciliations_manager_insert
on app.workspace_live_delivery_reconciliations
for insert to ai_data_runtime
with check (
  actor_user_id = nullif(current_setting('app.user_id', true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_live_delivery_reconciliations.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true),'')
      and wm.role in ('owner','admin')
  )
);
