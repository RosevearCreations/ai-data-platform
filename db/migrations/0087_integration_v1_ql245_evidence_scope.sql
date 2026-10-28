-- Build 220 — QL-245 evidence-return scope correction.
-- Existing production remains inert; this migration only tightens nonproduction metadata/evidence.
-- No live pilot, remote write, product/listing read, command or dispatch capability is enabled.

alter table app.integration_v1_connections
  drop constraint if exists integration_v1_connections_connection_state_check;

update app.integration_v1_connections
set connection_state='DISCONNECTED', updated_at=now()
where connection_state='HOLD';

alter table app.integration_v1_connections
  alter column connection_state set default 'DISCONNECTED';

alter table app.integration_v1_connections
  add constraint integration_v1_connections_connection_state_check
  check (connection_state = 'DISCONNECTED');

alter table app.integration_v1_connections
  add column if not exists registry_receipt_id text;

create unique index if not exists integration_v1_connections_registry_receipt_uidx
  on app.integration_v1_connections(registry_receipt_id)
  where registry_receipt_id is not null;

alter table app.integration_v1_request_audit
  add column if not exists response_status integer;

alter table app.integration_v1_request_audit
  add column if not exists audit_receipt_id text;

create unique index if not exists integration_v1_request_audit_receipt_uidx
  on app.integration_v1_request_audit(audit_receipt_id)
  where audit_receipt_id is not null;

alter table app.integration_v1_receipts
  drop constraint if exists integration_v1_receipts_kind_check;

alter table app.integration_v1_receipts
  add constraint integration_v1_receipts_kind_check
  check (kind in ('health','capabilities','gateway_audit','negative_denial','ql245_source'));

revoke all on app.integration_v1_connections from public;
revoke all on app.integration_v1_nonces from public;
revoke all on app.integration_v1_request_audit from public;
revoke all on app.integration_v1_receipts from public;
