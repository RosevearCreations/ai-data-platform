-- Build 337 — Read-Only Source Update Ingestion & Provenance Normalization
-- Accepted signed webhook receipts can be normalized into a bounded append-only
-- Master Shell evidence ledger. No source mutation or outbound delivery is added.

create table if not exists app.master_shell_source_updates (
  ingestion_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  webhook_receipt_id text not null
    references app.webhook_receipts(receipt_id) on delete restrict,
  source_id text not null
    check (source_id in (
      'yw','icamp','rosiedazzlers','devilndove',
      'ai-data-platform','rosevear-ai-hub'
    )),
  transport_source_application_id text not null,
  transport_endpoint_id uuid not null
    references app.webhook_endpoints(endpoint_id) on delete restrict,
  transport_key_id text not null,
  transport_secret_fingerprint_sha256 text not null
    check (transport_secret_fingerprint_sha256 ~ '^[a-f0-9]{64}$'),
  transport_body_sha256 text not null
    check (transport_body_sha256 ~ '^[a-f0-9]{64}$'),
  transport_receipt_signature text not null,
  transport_identity_verified boolean not null
    check (transport_identity_verified = true),
  environment text not null
    check (environment in ('nonproduction','production')),
  tenant_id text,
  master_event_id text not null unique,
  event_type text not null
    check (event_type in (
      'source.health.reported',
      'release.promoted',
      'module.readiness.changed',
      'audit.evidence.recorded'
    )),
  source_revision text not null,
  source_sequence bigint not null check (source_sequence >= 0),
  sequence_state text not null
    check (sequence_state in ('first','in-order','out-of-order')),
  correlation_id text not null,
  causation_id text,
  idempotency_key text not null,
  sensitivity text not null
    check (sensitivity in ('internal','confidential','restricted')),
  evidence_uri text not null,
  verification_state text not null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  normalized_payload jsonb not null
    check (jsonb_typeof(normalized_payload) = 'object'),
  expires_at timestamptz not null,
  freshness text not null check (freshness in ('fresh','stale')),
  occurred_at timestamptz not null,
  published_at timestamptz not null,
  received_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  unique (webhook_receipt_id),
  unique (source_id, source_sequence),
  unique (source_id, idempotency_key),
  check (expires_at > occurred_at),
  check (published_at >= occurred_at)
);

create index if not exists master_shell_updates_source_recent_idx
  on app.master_shell_source_updates(source_id, source_sequence desc);

create index if not exists master_shell_updates_event_recent_idx
  on app.master_shell_source_updates(event_type, ingested_at desc);

create index if not exists master_shell_updates_freshness_idx
  on app.master_shell_source_updates(freshness, expires_at);

alter table app.master_shell_source_updates enable row level security;

drop policy if exists master_shell_updates_workspace_admin_select
  on app.master_shell_source_updates;
create policy master_shell_updates_workspace_admin_select
on app.master_shell_source_updates
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=master_shell_source_updates.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_shell_updates_workspace_admin_insert
  on app.master_shell_source_updates;
create policy master_shell_updates_workspace_admin_insert
on app.master_shell_source_updates
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=master_shell_source_updates.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

revoke all on app.master_shell_source_updates from public;
grant select, insert on app.master_shell_source_updates to ai_data_runtime;
revoke update, delete on app.master_shell_source_updates from ai_data_runtime;
