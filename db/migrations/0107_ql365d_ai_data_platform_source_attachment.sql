-- Build 315 / QL-365D — AI Data Platform source-side Comms attachment.
-- Public signature/pin evidence is operator-enrolled; runtime may only read it.
-- The only runtime write is an append-only, unique one-use operation claim.
-- No customer data, messaging, device action or persistent connection state exists here.

create table if not exists app.rosevear_comms_authority_pins (
  source_id text not null check (source_id = 'ai-data-platform'),
  role text not null check (role in ('source_owner','master_owner','source_signer')),
  key_id text not null check (char_length(key_id) between 12 and 100),
  public_key_pem text not null check (
    public_key_pem like '-----BEGIN PUBLIC KEY-----%'
    and octet_length(public_key_pem) <= 2048
  ),
  spki_sha256 text not null check (spki_sha256 ~ '^[0-9a-f]{64}$'),
  independently_verified boolean not null default false,
  custody_verified boolean not null default false,
  evidence_sha256 text not null check (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  reviewed_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (source_id, role),
  unique (source_id, spki_sha256)
);

create table if not exists app.rosevear_comms_source_authorizations (
  operation_id uuid primary key,
  source_id text not null check (source_id = 'ai-data-platform'),
  request_sha256 text not null check (request_sha256 ~ '^[0-9a-f]{64}$'),
  request_payload jsonb not null check (
    jsonb_typeof(request_payload) = 'object'
    and octet_length(request_payload::text) <= 8192
  ),
  source_owner_approval jsonb not null check (
    jsonb_typeof(source_owner_approval) = 'object'
    and octet_length(source_owner_approval::text) <= 8192
  ),
  master_owner_approval jsonb not null check (
    jsonb_typeof(master_owner_approval) = 'object'
    and octet_length(master_owner_approval::text) <= 8192
  ),
  original_issuer_evidence_sha256 text not null
    check (original_issuer_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  independent_witness_evidence_sha256 text not null
    check (independent_witness_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  ql354_enrollment_evidence_sha256 text not null
    check (ql354_enrollment_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  independently_reviewed boolean not null default false,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > issued_at),
  check (expires_at - issued_at <= interval '90 seconds')
);

create unique index if not exists rosevear_comms_source_authorization_digest_uq
  on app.rosevear_comms_source_authorizations(source_id, request_sha256);

create table if not exists app.rosevear_comms_operation_claims (
  source_id text not null check (source_id = 'ai-data-platform'),
  operation_id uuid not null,
  request_sha256 text not null check (request_sha256 ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  claimed_at timestamptz not null default now(),
  primary key (source_id, operation_id),
  unique (source_id, request_sha256),
  check (expires_at > claimed_at)
);

alter table app.rosevear_comms_authority_pins enable row level security;
alter table app.rosevear_comms_authority_pins force row level security;
alter table app.rosevear_comms_source_authorizations enable row level security;
alter table app.rosevear_comms_source_authorizations force row level security;
alter table app.rosevear_comms_operation_claims enable row level security;
alter table app.rosevear_comms_operation_claims force row level security;

drop policy if exists rosevear_comms_authority_pins_runtime_select
  on app.rosevear_comms_authority_pins;
create policy rosevear_comms_authority_pins_runtime_select
on app.rosevear_comms_authority_pins
for select to ai_data_runtime
using (
  source_id = 'ai-data-platform'
  and independently_verified = true
  and custody_verified = true
  and revoked_at is null
);

drop policy if exists rosevear_comms_source_authorizations_runtime_select
  on app.rosevear_comms_source_authorizations;
create policy rosevear_comms_source_authorizations_runtime_select
on app.rosevear_comms_source_authorizations
for select to ai_data_runtime
using (
  source_id = 'ai-data-platform'
  and independently_reviewed = true
  and revoked_at is null
  and expires_at > now()
);

drop policy if exists rosevear_comms_operation_claims_runtime_select
  on app.rosevear_comms_operation_claims;
create policy rosevear_comms_operation_claims_runtime_select
on app.rosevear_comms_operation_claims
for select to ai_data_runtime
using (source_id = 'ai-data-platform');

drop policy if exists rosevear_comms_operation_claims_runtime_insert
  on app.rosevear_comms_operation_claims;
create policy rosevear_comms_operation_claims_runtime_insert
on app.rosevear_comms_operation_claims
for insert to ai_data_runtime
with check (
  source_id = 'ai-data-platform'
  and expires_at > now()
  and expires_at <= now() + interval '90 seconds'
);

revoke all on
  app.rosevear_comms_authority_pins,
  app.rosevear_comms_source_authorizations,
  app.rosevear_comms_operation_claims
from public;

revoke all on
  app.rosevear_comms_authority_pins,
  app.rosevear_comms_source_authorizations,
  app.rosevear_comms_operation_claims
from ai_data_runtime;

grant select on
  app.rosevear_comms_authority_pins,
  app.rosevear_comms_source_authorizations
to ai_data_runtime;

grant select, insert on
  app.rosevear_comms_operation_claims
to ai_data_runtime;

revoke insert, update, delete on
  app.rosevear_comms_authority_pins,
  app.rosevear_comms_source_authorizations
from ai_data_runtime;

revoke update, delete on
  app.rosevear_comms_operation_claims
from ai_data_runtime;
