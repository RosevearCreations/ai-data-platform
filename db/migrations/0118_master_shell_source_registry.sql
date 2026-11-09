-- Build 336 — Six-Source Registry, Freshness & Source State Machine
-- Append-only operator/source evidence. Current state is derived from the latest
-- accepted record plus freshness rules; no row is seeded as CONNECTED.

create table if not exists app.master_shell_source_registry_evidence (
  evidence_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null
    check (source_id in (
      'yw','icamp','rosiedazzlers','devilndove',
      'ai-data-platform','rosevear-ai-hub'
    )),
  record_version bigint not null check (record_version > 0),
  environment text not null
    check (environment in ('nonproduction','production')),
  declared_status text not null
    check (declared_status in (
      'DISCOVERED','CONFIGURED','AUTHORIZATION_HELD','TEST_VERIFIED',
      'CONNECTED','STALE','DEGRADED','DISCONNECTED','REVOKED','ERROR'
    )),
  status_observed_at timestamptz not null,
  status_expires_at timestamptz not null,
  evidence_uri text not null
    check (char_length(evidence_uri) between 1 and 512),
  manifest_uri text
    check (manifest_uri is null or char_length(manifest_uri) between 1 and 512),
  immutable_revision text
    check (immutable_revision is null or char_length(immutable_revision) between 1 and 160),
  capability_version text
    check (capability_version is null or char_length(capability_version) between 1 and 64),
  approved_origin text
    check (approved_origin is null or char_length(approved_origin) between 1 and 256),
  signer_key_id text
    check (signer_key_id is null or char_length(signer_key_id) between 1 and 160),
  signer_fingerprint text
    check (signer_fingerprint is null or char_length(signer_fingerprint) between 16 and 256),
  roles_allowed jsonb not null default '[]'::jsonb
    check (jsonb_typeof(roles_allowed) = 'array'),
  hold_reason text
    check (hold_reason is null or char_length(hold_reason) between 1 and 256),
  test_evidence_uri text
    check (test_evidence_uri is null or char_length(test_evidence_uri) between 1 and 512),
  connection_evidence_uri text
    check (connection_evidence_uri is null or char_length(connection_evidence_uri) between 1 and 512),
  owner_authorized boolean not null default false,
  independent_test_verified boolean not null default false,
  independent_connection_verified boolean not null default false,
  evidence_authority text not null
    check (evidence_authority in (
      'operator-recorded','independent-source-verification'
    )),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  recorded_at timestamptz not null default now(),
  unique (source_id, record_version),
  check (status_expires_at > status_observed_at),
  check (status_observed_at <= recorded_at + interval '5 minutes')
);

create index if not exists master_shell_registry_source_version_idx
  on app.master_shell_source_registry_evidence(source_id, record_version desc);

create index if not exists master_shell_registry_expiry_idx
  on app.master_shell_source_registry_evidence(status_expires_at);

alter table app.master_shell_source_registry_evidence enable row level security;

drop policy if exists master_shell_registry_suite_admin_select
  on app.master_shell_source_registry_evidence;
create policy master_shell_registry_suite_admin_select
on app.master_shell_source_registry_evidence
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_shell_registry_suite_admin_insert
  on app.master_shell_source_registry_evidence;
create policy master_shell_registry_suite_admin_insert
on app.master_shell_source_registry_evidence
for insert to ai_data_runtime
with check (
  actor_user_id = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.user_id = nullif(current_setting('app.user_id', true), '')
      and wm.role in ('owner','admin')
  )
);

revoke all on app.master_shell_source_registry_evidence from public;
grant select, insert on app.master_shell_source_registry_evidence to ai_data_runtime;
revoke update, delete on app.master_shell_source_registry_evidence from ai_data_runtime;
