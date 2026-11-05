-- Build 289 — Rosevear Shared Connector SDK 2.0
-- Persist SDK generation and sanitized transport evidence without storing credential values.

alter table app.workspace_connector_installations
  add column if not exists sdk_version integer not null default 1;

alter table app.workspace_connector_installations
  drop constraint if exists workspace_connector_installations_sdk_version_check;
alter table app.workspace_connector_installations
  add constraint workspace_connector_installations_sdk_version_check
  check (sdk_version between 1 and 99);

alter table app.workspace_connector_audit
  add column if not exists sdk_version integer not null default 1,
  add column if not exists manifest_version integer not null default 1,
  add column if not exists transport_kind text not null default 'legacy',
  add column if not exists request_count integer not null default 0,
  add column if not exists retry_count integer not null default 0,
  add column if not exists page_count integer not null default 0,
  add column if not exists health_check_count integer not null default 0,
  add column if not exists transport_evidence jsonb not null default '{}'::jsonb,
  add column if not exists sdk_audit_events jsonb not null default '[]'::jsonb;

alter table app.workspace_connector_audit
  drop constraint if exists workspace_connector_audit_sdk_version_check;
alter table app.workspace_connector_audit
  add constraint workspace_connector_audit_sdk_version_check
  check (sdk_version between 1 and 99);

alter table app.workspace_connector_audit
  drop constraint if exists workspace_connector_audit_manifest_version_check;
alter table app.workspace_connector_audit
  add constraint workspace_connector_audit_manifest_version_check
  check (manifest_version between 1 and 99);

alter table app.workspace_connector_audit
  drop constraint if exists workspace_connector_audit_transport_kind_check;
alter table app.workspace_connector_audit
  add constraint workspace_connector_audit_transport_kind_check
  check (transport_kind in ('legacy','local','http'));

alter table app.workspace_connector_audit
  drop constraint if exists workspace_connector_audit_transport_counts_check;
alter table app.workspace_connector_audit
  add constraint workspace_connector_audit_transport_counts_check
  check (
    request_count >= 0
    and retry_count >= 0
    and page_count >= 0
    and health_check_count >= 0
  );

alter table app.workspace_connector_audit
  drop constraint if exists workspace_connector_audit_transport_evidence_check;
alter table app.workspace_connector_audit
  add constraint workspace_connector_audit_transport_evidence_check
  check (
    jsonb_typeof(transport_evidence)='object'
    and octet_length(transport_evidence::text) <= 32768
  );

alter table app.workspace_connector_audit
  drop constraint if exists workspace_connector_audit_sdk_events_check;
alter table app.workspace_connector_audit
  add constraint workspace_connector_audit_sdk_events_check
  check (
    jsonb_typeof(sdk_audit_events)='array'
    and jsonb_array_length(sdk_audit_events) <= 100
    and octet_length(sdk_audit_events::text) <= 65536
  );

create index if not exists workspace_connector_audit_sdk_recent_idx
  on app.workspace_connector_audit(
    workspace_id, sdk_version, transport_kind, created_at desc
  );
