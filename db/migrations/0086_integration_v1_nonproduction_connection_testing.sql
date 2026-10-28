-- Build 218 — Rosevear Integration Contract v1 nonproduction connection-test foundation
-- Server-only registry, atomic replay suppression and immutable signed receipt evidence.
-- No production write capability or cross-application database access is introduced.

create table if not exists app.integration_v1_connections (
  connection_id text primary key,
  source_system text not null,
  destination_system text not null default 'ai-data-platform',
  business_id text not null,
  tenant_id text,
  tenant_key text not null,
  environment text not null check (environment = 'nonproduction'),
  key_id text not null,
  secret_env_var text not null,
  key_state text not null default 'active' check (key_state in ('active','revoked')),
  connection_state text not null default 'HOLD' check (connection_state = 'HOLD'),
  capabilities jsonb not null default '[]'::jsonb check (jsonb_typeof(capabilities) = 'array'),
  health_receipt_id text not null,
  capabilities_receipt_id text not null,
  gateway_audit_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (tenant_key = coalesce(tenant_id, '-')),
  unique (source_system, destination_system, business_id, tenant_key, environment, key_id),
  unique (health_receipt_id),
  unique (capabilities_receipt_id),
  unique (gateway_audit_id)
);

create table if not exists app.integration_v1_nonces (
  source_system text not null,
  business_id text not null,
  tenant_key text not null,
  environment text not null check (environment = 'nonproduction'),
  key_id text not null,
  nonce text not null,
  accepted_at timestamptz not null default now(),
  primary key (source_system, business_id, tenant_key, environment, key_id, nonce)
);

create table if not exists app.integration_v1_request_audit (
  audit_id text primary key,
  connection_id text,
  source_system text,
  destination_system text,
  business_id text,
  tenant_id text,
  environment text,
  key_id text,
  method text not null,
  path text not null,
  nonce text,
  outcome text not null check (outcome in ('accepted','denied')),
  reason_code text not null,
  identity_verified boolean not null default false,
  occurred_at timestamptz not null default now()
);

create index if not exists integration_v1_request_audit_recent_idx
  on app.integration_v1_request_audit(occurred_at desc);

create index if not exists integration_v1_request_audit_connection_idx
  on app.integration_v1_request_audit(connection_id, occurred_at desc);

create table if not exists app.integration_v1_receipts (
  receipt_id text primary key,
  connection_id text not null references app.integration_v1_connections(connection_id) on delete restrict,
  kind text not null check (kind in ('health','capabilities','gateway_audit')),
  business_id text not null,
  tenant_id text,
  environment text not null check (environment = 'nonproduction'),
  key_id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  signature text not null,
  source_revision text,
  created_at timestamptz not null default now(),
  unique (connection_id, kind, receipt_id)
);

grant select on app.integration_v1_connections to ai_data_runtime;
grant select, insert on app.integration_v1_nonces to ai_data_runtime;
grant select, insert on app.integration_v1_request_audit to ai_data_runtime;
grant select, insert on app.integration_v1_receipts to ai_data_runtime;

revoke all on app.integration_v1_connections from public;
revoke all on app.integration_v1_nonces from public;
revoke all on app.integration_v1_request_audit from public;
revoke all on app.integration_v1_receipts from public;
