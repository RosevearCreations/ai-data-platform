create table if not exists app.workspace_corrective_delivery_activations (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  activation_id uuid not null,
  plan_id uuid not null,
  case_id uuid not null,
  reconciliation_id uuid not null,
  source_delivery_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  status text not null default 'active' check (status in ('active','revoked')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 512),
  plan_fingerprint text not null check (char_length(plan_fingerprint) between 1 and 128),
  source_package_id text not null check (char_length(source_package_id) between 1 and 512),
  source_replay_key text not null check (char_length(source_replay_key) between 1 and 1024),
  source_package_fingerprint text not null check (char_length(source_package_fingerprint) between 1 and 128),
  corrective_package_id text not null check (char_length(corrective_package_id) between 1 and 512),
  corrective_replay_key text not null check (char_length(corrective_replay_key) between 1 and 1024),
  corrective_package_fingerprint text not null check (char_length(corrective_package_fingerprint) between 1 and 128),
  dry_run_validation_code text not null check (char_length(dry_run_validation_code) between 1 and 96),
  dry_run_http_status integer check (dry_run_http_status between 100 and 599),
  dry_run_consumer_received_at timestamptz not null,
  dry_run_acknowledgement jsonb not null default '{}'::jsonb
    check (jsonb_typeof(dry_run_acknowledgement)='object'
      and octet_length(dry_run_acknowledgement::text) <= 32768),
  activation_fingerprint text not null check (char_length(activation_fingerprint) between 1 and 128),
  activated_by text not null references auth."user"(id) on delete restrict,
  activated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_by text references auth."user"(id) on delete restrict,
  revoked_at timestamptz,
  revocation_note text not null default '' check (char_length(revocation_note) <= 4000),
  primary key (workspace_id,activation_id),
  unique (workspace_id,plan_id,activation_fingerprint),
  foreign key (workspace_id,plan_id)
    references app.workspace_corrective_delivery_plans(workspace_id,plan_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict,
  foreign key (workspace_id,reconciliation_id)
    references app.workspace_live_delivery_reconciliations(workspace_id,reconciliation_id)
    on delete restrict,
  foreign key (workspace_id,source_delivery_id)
    references app.workspace_publication_live_deliveries(workspace_id,delivery_id)
    on delete restrict
);

create unique index if not exists workspace_corrective_delivery_activations_one_active_idx
  on app.workspace_corrective_delivery_activations(workspace_id,plan_id)
  where status='active';

create index if not exists workspace_corrective_delivery_activations_recent_idx
  on app.workspace_corrective_delivery_activations(workspace_id,activated_at desc);

create table if not exists app.workspace_corrective_live_deliveries (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  delivery_id uuid not null,
  activation_id uuid not null,
  plan_id uuid not null,
  source_delivery_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 512),
  plan_fingerprint text not null check (char_length(plan_fingerprint) between 1 and 128),
  activation_fingerprint text not null check (char_length(activation_fingerprint) between 1 and 128),
  corrective_package_id text not null check (char_length(corrective_package_id) between 1 and 512),
  corrective_replay_key text not null check (char_length(corrective_replay_key) between 1 and 1024),
  corrective_package_fingerprint text not null check (char_length(corrective_package_fingerprint) between 1 and 128),
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 1024),
  status text not null default 'reserved'
    check (status in ('reserved','accepted','rejected','transport-error')),
  attempt_count integer not null default 1 check (attempt_count between 1 and 5),
  validation_code text not null default 'reserved' check (char_length(validation_code) between 1 and 96),
  http_status integer check (http_status between 100 and 599),
  consumer_received_at timestamptz,
  acknowledgement jsonb not null default '{}'::jsonb
    check (jsonb_typeof(acknowledgement)='object'
      and octet_length(acknowledgement::text) <= 32768),
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id,delivery_id),
  unique (workspace_id,consumer_id,corrective_package_id),
  foreign key (workspace_id,activation_id)
    references app.workspace_corrective_delivery_activations(workspace_id,activation_id)
    on delete restrict,
  foreign key (workspace_id,plan_id)
    references app.workspace_corrective_delivery_plans(workspace_id,plan_id)
    on delete restrict,
  foreign key (workspace_id,source_delivery_id)
    references app.workspace_publication_live_deliveries(workspace_id,delivery_id)
    on delete restrict
);

create index if not exists workspace_corrective_live_deliveries_recent_idx
  on app.workspace_corrective_live_deliveries(workspace_id,updated_at desc);

grant select,insert on app.workspace_corrective_delivery_activations to ai_data_runtime;
grant update (status,revoked_by,revoked_at,revocation_note)
  on app.workspace_corrective_delivery_activations to ai_data_runtime;

grant select,insert on app.workspace_corrective_live_deliveries to ai_data_runtime;
grant update (
  status,attempt_count,validation_code,http_status,consumer_received_at,
  acknowledgement,last_attempt_at,updated_at
) on app.workspace_corrective_live_deliveries to ai_data_runtime;

alter table app.workspace_corrective_delivery_activations enable row level security;
alter table app.workspace_corrective_live_deliveries enable row level security;

drop policy if exists workspace_corrective_delivery_activations_member_select
  on app.workspace_corrective_delivery_activations;
create policy workspace_corrective_delivery_activations_member_select
on app.workspace_corrective_delivery_activations
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_delivery_activations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workspace_corrective_delivery_activations_manager_insert
  on app.workspace_corrective_delivery_activations;
create policy workspace_corrective_delivery_activations_manager_insert
on app.workspace_corrective_delivery_activations
for insert to ai_data_runtime
with check (
  activated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_delivery_activations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_corrective_delivery_activations_manager_update
  on app.workspace_corrective_delivery_activations;
create policy workspace_corrective_delivery_activations_manager_update
on app.workspace_corrective_delivery_activations
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_delivery_activations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_delivery_activations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_corrective_live_deliveries_member_select
  on app.workspace_corrective_live_deliveries;
create policy workspace_corrective_live_deliveries_member_select
on app.workspace_corrective_live_deliveries
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workspace_corrective_live_deliveries_manager_insert
  on app.workspace_corrective_live_deliveries;
create policy workspace_corrective_live_deliveries_manager_insert
on app.workspace_corrective_live_deliveries
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_corrective_live_deliveries_manager_update
  on app.workspace_corrective_live_deliveries;
create policy workspace_corrective_live_deliveries_manager_update
on app.workspace_corrective_live_deliveries
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);
