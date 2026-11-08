-- Build 322 — Webhook, Callback & Inbound Endpoint Module
-- Add durable host callback routing and irreversible endpoint revocation.
-- Existing Build 290 signed intake, replay suppression and receipts remain authoritative.

alter table app.webhook_endpoints
  add column if not exists callback_application_id text
    check (
      callback_application_id is null
      or callback_application_id ~ '^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$'
    ),
  add column if not exists callback_path text
    check (
      callback_path is null
      or callback_path ~ '^/[A-Za-z0-9._~:/-]{1,240}$'
    ),
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by text references auth."user"(id) on delete restrict;

alter table app.webhook_endpoints
  add constraint webhook_endpoint_callback_pair_check
  check (
    (callback_application_id is null and callback_path is null)
    or
    (callback_application_id is not null and callback_path is not null)
  );

alter table app.webhook_endpoints
  add constraint webhook_endpoint_revoked_disabled_check
  check (revoked_at is null or enabled=false);

create index if not exists webhook_endpoints_workspace_environment_idx
  on app.webhook_endpoints(workspace_id,environment,updated_at desc);

create index if not exists webhook_endpoints_revoked_idx
  on app.webhook_endpoints(workspace_id,revoked_at)
  where revoked_at is not null;

-- Existing UPDATE privilege and workspace-admin RLS remain authoritative.
-- No DELETE privilege is introduced. Revocation preserves endpoint evidence.
