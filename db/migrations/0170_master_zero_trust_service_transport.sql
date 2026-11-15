-- Build 407 — zero-trust service authentication, rotation and transport evidence.

create table if not exists app.master_build407_service_principals (
  principal_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  issuer text not null,
  subject text not null,
  audience_namespace text not null,
  algorithm text not null check (algorithm='Ed25519'),
  key_id text not null,
  public_key_reference text not null,
  private_key_included boolean not null default false check (private_key_included=false),
  source_identity_bound boolean not null,
  tenant_boundary_bound boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  principal_state text not null check (principal_state in ('ENROLLED','HOLD','REVOKED')),
  evidence_uri text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique(app_id,observed_at)
);

create table if not exists app.master_build407_key_rotation_receipts (
  receipt_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  current_key_id text not null,
  previous_key_id text,
  pin_digest_sha256 text not null check (pin_digest_sha256 ~ '^[0-9a-f]{64}$'),
  public_key_reference text not null,
  secret_reference_name text not null,
  raw_secret_included boolean not null default false check (raw_secret_included=false),
  rotation_interval_days integer not null check (rotation_interval_days between 1 and 90),
  overlap_window_hours integer not null check (overlap_window_hours between 0 and 168),
  revoked_previous_key boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  rotation_state text not null check (rotation_state in ('ROTATION_VERIFIED','HOLD','EXPIRED')),
  evidence_uri text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique(app_id,observed_at)
);

create table if not exists app.master_build407_transport_policies (
  policy_id uuid primary key,
  source_app_id text not null,
  target_app_id text not null,
  allowed_channels text[] not null,
  transport_kind text not null check (transport_kind in ('direct-https','trusted-local-relay','approved-cloud-relay')),
  minimum_tls_version text not null check (minimum_tls_version='TLSv1.2'),
  certificate_validation text not null check (certificate_validation='verify-full'),
  signed_requests_required boolean not null check (signed_requests_required),
  issuer_binding_required boolean not null check (issuer_binding_required),
  audience_binding_required boolean not null check (audience_binding_required),
  body_digest_required boolean not null check (body_digest_required),
  nonce_required boolean not null check (nonce_required),
  replay_protection_required boolean not null check (replay_protection_required),
  max_request_age_seconds integer not null check (max_request_age_seconds between 1 and 300),
  secretless_routing boolean not null check (secretless_routing),
  raw_secrets_allowed boolean not null default false check (raw_secrets_allowed=false),
  t5_allowed boolean not null default false check (t5_allowed=false),
  direct_peer_database_write boolean not null default false check (direct_peer_database_write=false),
  delegated_authority boolean not null default false check (delegated_authority=false),
  consequential_writes_require_owner_gate boolean not null check (consequential_writes_require_owner_gate),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  policy_state text not null check (policy_state in ('ENFORCED','HOLD','FAILED')),
  evidence_uri text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (source_app_id <> target_app_id),
  unique(source_app_id,target_app_id,observed_at)
);

create table if not exists app.master_build407_signed_request_evidence (
  evidence_id uuid primary key,
  source_app_id text not null,
  target_app_id text not null,
  channel text not null,
  key_id text not null,
  issuer text not null,
  audience text not null,
  nonce_digest_sha256 text not null check (nonce_digest_sha256 ~ '^[0-9a-f]{64}$'),
  body_digest_sha256 text not null check (body_digest_sha256 ~ '^[0-9a-f]{64}$'),
  signature_verified boolean not null,
  issuer_verified boolean not null,
  audience_verified boolean not null,
  nonce_accepted_once boolean not null,
  request_age_seconds integer not null check (request_age_seconds between 0 and 300),
  tls_verified boolean not null,
  secretless_route_verified boolean not null,
  authority_preserved boolean not null,
  evidence_state text not null check (evidence_state in ('VERIFIED','HOLD','REJECTED')),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (source_app_id <> target_app_id),
  unique(source_app_id,target_app_id,channel,observed_at)
);

create index if not exists master_b407_principal_recent_idx on app.master_build407_service_principals(recorded_at desc);
create index if not exists master_b407_rotation_recent_idx on app.master_build407_key_rotation_receipts(recorded_at desc);
create index if not exists master_b407_transport_recent_idx on app.master_build407_transport_policies(recorded_at desc);
create index if not exists master_b407_request_recent_idx on app.master_build407_signed_request_evidence(recorded_at desc);

alter table app.master_build407_service_principals enable row level security;
alter table app.master_build407_service_principals force row level security;
alter table app.master_build407_key_rotation_receipts enable row level security;
alter table app.master_build407_key_rotation_receipts force row level security;
alter table app.master_build407_transport_policies enable row level security;
alter table app.master_build407_transport_policies force row level security;
alter table app.master_build407_signed_request_evidence enable row level security;
alter table app.master_build407_signed_request_evidence force row level security;

create policy master_b407_principal_runtime_select on app.master_build407_service_principals for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b407_rotation_runtime_select on app.master_build407_key_rotation_receipts for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b407_transport_runtime_select on app.master_build407_transport_policies for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b407_request_runtime_select on app.master_build407_signed_request_evidence for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));

create policy master_b407_principal_protected_select on app.master_build407_service_principals for select to ai_data_protected_runtime using (true);
create policy master_b407_rotation_protected_select on app.master_build407_key_rotation_receipts for select to ai_data_protected_runtime using (true);
create policy master_b407_transport_protected_select on app.master_build407_transport_policies for select to ai_data_protected_runtime using (true);
create policy master_b407_request_protected_select on app.master_build407_signed_request_evidence for select to ai_data_protected_runtime using (true);

create policy master_b407_principal_protected_insert on app.master_build407_service_principals for insert to ai_data_protected_runtime with check (true);
create policy master_b407_rotation_protected_insert on app.master_build407_key_rotation_receipts for insert to ai_data_protected_runtime with check (true);
create policy master_b407_transport_protected_insert on app.master_build407_transport_policies for insert to ai_data_protected_runtime with check (true);
create policy master_b407_request_protected_insert on app.master_build407_signed_request_evidence for insert to ai_data_protected_runtime with check (true);

grant select on app.master_build407_service_principals,app.master_build407_key_rotation_receipts,app.master_build407_transport_policies,app.master_build407_signed_request_evidence to ai_data_runtime;
grant select,insert on app.master_build407_service_principals,app.master_build407_key_rotation_receipts,app.master_build407_transport_policies,app.master_build407_signed_request_evidence to ai_data_protected_runtime;
revoke insert,update,delete on app.master_build407_service_principals,app.master_build407_key_rotation_receipts,app.master_build407_transport_policies,app.master_build407_signed_request_evidence from ai_data_runtime;
revoke update,delete on app.master_build407_service_principals,app.master_build407_key_rotation_receipts,app.master_build407_transport_policies,app.master_build407_signed_request_evidence from ai_data_protected_runtime;
