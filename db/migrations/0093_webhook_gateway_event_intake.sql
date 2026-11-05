-- Build 290 — Webhook Gateway & Event Intake Center
-- Workspace-scoped signed inbound event intake, atomic replay suppression and durable receipts.
-- No downstream event dispatch is introduced in this build.

create table if not exists app.webhook_endpoints (
  endpoint_id uuid primary key,
  endpoint_key text not null unique
    check (endpoint_key ~ '^whk_[A-Za-z0-9_-]{24}$'),
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  source_application_id text not null
    check (source_application_id in (
      'devilndove',
      'rosiedazzlers',
      'yard-workers',
      'icamp',
      'rosevear-comms-hub',
      'rosevear-ai-hub'
    )),
  environment text not null
    check (environment in ('nonproduction','production')),
  tenant_id text
    check (tenant_id is null or (char_length(tenant_id) between 1 and 128)),
  display_name text not null
    check (char_length(display_name) between 1 and 160),
  key_id text not null
    check (key_id ~ '^whk-key-[a-z0-9-]{4,50}$'),
  secret_env_var text not null
    check (secret_env_var ~ '^[A-Z][A-Z0-9_]{2,127}$'),
  enabled boolean not null default false,
  allowed_event_types jsonb not null default '[]'::jsonb
    check (
      jsonb_typeof(allowed_event_types)='array'
      and jsonb_array_length(allowed_event_types) between 1 and 100
      and octet_length(allowed_event_types::text) <= 8192
    ),
  max_body_bytes integer not null default 262144
    check (max_body_bytes between 1024 and 262144),
  created_by text not null references auth."user"(id) on delete restrict,
  updated_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.webhook_event_nonces (
  endpoint_id uuid not null references app.webhook_endpoints(endpoint_id) on delete restrict,
  event_id text not null
    check (event_id ~ '^evt_[A-Za-z0-9_-]{12,100}$'),
  request_timestamp_ms bigint not null,
  body_sha256 text not null
    check (body_sha256 ~ '^[a-f0-9]{64}$'),
  accepted_at timestamptz not null default now(),
  primary key (endpoint_id,event_id)
);

create table if not exists app.webhook_receipts (
  receipt_id text primary key
    check (receipt_id ~ '^whr_[a-f0-9]{32}$'),
  endpoint_id uuid not null references app.webhook_endpoints(endpoint_id) on delete restrict,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  source_application_id text not null,
  environment text not null
    check (environment in ('nonproduction','production')),
  tenant_id text,
  event_id text not null,
  event_type text not null
    check (char_length(event_type) between 3 and 160),
  event_occurred_at timestamptz not null,
  request_timestamp_ms bigint not null,
  body_sha256 text not null
    check (body_sha256 ~ '^[a-f0-9]{64}$'),
  payload_size_bytes integer not null
    check (payload_size_bytes between 2 and 262144),
  event_envelope jsonb not null
    check (
      jsonb_typeof(event_envelope)='object'
      and octet_length(event_envelope::text) <= 262144
    ),
  receipt_payload jsonb not null
    check (
      jsonb_typeof(receipt_payload)='object'
      and octet_length(receipt_payload::text) <= 16384
    ),
  receipt_signature text not null
    check (receipt_signature ~ '^[A-Za-z0-9_-]{43}$'),
  received_at timestamptz not null default now(),
  unique (endpoint_id,event_id)
);

create table if not exists app.webhook_request_audit (
  audit_id uuid primary key,
  endpoint_id uuid not null references app.webhook_endpoints(endpoint_id) on delete restrict,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  event_id text,
  event_type text,
  outcome text not null check (outcome in ('accepted','denied')),
  reason_code text not null check (char_length(reason_code) between 1 and 96),
  identity_verified boolean not null default false,
  http_status integer not null check (http_status between 100 and 599),
  request_timestamp_ms bigint,
  body_sha256 text,
  occurred_at timestamptz not null default now()
);

create index if not exists webhook_receipts_workspace_recent_idx
  on app.webhook_receipts(workspace_id,received_at desc);

create index if not exists webhook_receipts_endpoint_recent_idx
  on app.webhook_receipts(endpoint_id,received_at desc);

create index if not exists webhook_request_audit_workspace_recent_idx
  on app.webhook_request_audit(workspace_id,occurred_at desc);

create index if not exists webhook_request_audit_endpoint_recent_idx
  on app.webhook_request_audit(endpoint_id,occurred_at desc);

grant select, insert, update on app.webhook_endpoints to ai_data_runtime;
grant select, insert on app.webhook_event_nonces to ai_data_runtime;
grant select, insert on app.webhook_receipts to ai_data_runtime;
grant select, insert on app.webhook_request_audit to ai_data_runtime;

revoke all on app.webhook_endpoints from public;
revoke all on app.webhook_event_nonces from public;
revoke all on app.webhook_receipts from public;
revoke all on app.webhook_request_audit from public;

alter table app.webhook_endpoints enable row level security;
alter table app.webhook_event_nonces enable row level security;
alter table app.webhook_receipts enable row level security;
alter table app.webhook_request_audit enable row level security;

drop policy if exists webhook_endpoint_read on app.webhook_endpoints;
create policy webhook_endpoint_read
on app.webhook_endpoints
for select to ai_data_runtime
using (
  endpoint_key = nullif(current_setting('app.webhook_endpoint_key',true),'')
  or exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=webhook_endpoints.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists webhook_endpoint_insert on app.webhook_endpoints;
create policy webhook_endpoint_insert
on app.webhook_endpoints
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and updated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=webhook_endpoints.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists webhook_endpoint_update on app.webhook_endpoints;
create policy webhook_endpoint_update
on app.webhook_endpoints
for update to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=webhook_endpoints.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  updated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=webhook_endpoints.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists webhook_nonce_read on app.webhook_event_nonces;
create policy webhook_nonce_read
on app.webhook_event_nonces
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.webhook_endpoints e
    where e.endpoint_id=webhook_event_nonces.endpoint_id
      and (
        e.endpoint_key=nullif(current_setting('app.webhook_endpoint_key',true),'')
        or exists (
          select 1 from app.workspace_members wm
          where wm.workspace_id=e.workspace_id
            and wm.user_id=nullif(current_setting('app.user_id',true),'')
        )
      )
  )
);

drop policy if exists webhook_nonce_insert on app.webhook_event_nonces;
create policy webhook_nonce_insert
on app.webhook_event_nonces
for insert to ai_data_runtime
with check (
  exists (
    select 1
    from app.webhook_endpoints e
    where e.endpoint_id=webhook_event_nonces.endpoint_id
      and e.endpoint_key=nullif(current_setting('app.webhook_endpoint_key',true),'')
  )
);

drop policy if exists webhook_receipt_read on app.webhook_receipts;
create policy webhook_receipt_read
on app.webhook_receipts
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=webhook_receipts.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists webhook_receipt_insert on app.webhook_receipts;
create policy webhook_receipt_insert
on app.webhook_receipts
for insert to ai_data_runtime
with check (
  exists (
    select 1 from app.webhook_endpoints e
    where e.endpoint_id=webhook_receipts.endpoint_id
      and e.workspace_id=webhook_receipts.workspace_id
      and e.endpoint_key=nullif(current_setting('app.webhook_endpoint_key',true),'')
  )
);

drop policy if exists webhook_audit_read on app.webhook_request_audit;
create policy webhook_audit_read
on app.webhook_request_audit
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=webhook_request_audit.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists webhook_audit_insert on app.webhook_request_audit;
create policy webhook_audit_insert
on app.webhook_request_audit
for insert to ai_data_runtime
with check (
  exists (
    select 1 from app.webhook_endpoints e
    where e.endpoint_id=webhook_request_audit.endpoint_id
      and e.workspace_id=webhook_request_audit.workspace_id
      and e.endpoint_key=nullif(current_setting('app.webhook_endpoint_key',true),'')
  )
);
