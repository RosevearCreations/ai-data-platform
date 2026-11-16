-- Build 408 — fine-grained authorization, consent, tenant isolation,
-- bounded delegated capability re-certification and independent synchronization compatibility.

create table if not exists app.master_build408_authorization_policies (
  policy_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  access_tier text not null check (access_tier in ('T0_PUBLIC_READ','T1_USER_SCOPED','T2_TENANT_SCOPED','T3_OPERATOR_SCOPED','T4_MASTER_GOVERNANCE','T5_ORIGINAL_HOST_OWNER_CEREMONY')),
  policy_version integer not null check (policy_version >= 1),
  subject_scope text not null check (subject_scope in ('public','self','tenant','operator','master','original-host-owner')),
  capability_namespace text not null check (length(capability_namespace) >= 3 and position('*' in capability_namespace)=0),
  allowed_actions text[] not null check (cardinality(allowed_actions) > 0),
  resource_scope_defined boolean not null check (resource_scope_defined),
  tenant_binding_required boolean not null,
  workspace_binding_required boolean not null,
  consent_required_for_personal_data boolean not null,
  deny_by_default boolean not null check (deny_by_default),
  cross_tenant_access_allowed boolean not null default false check (cross_tenant_access_allowed=false),
  delegated_grant_allowed boolean not null,
  t5_non_delegable boolean not null check (t5_non_delegable),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  policy_state text not null check (policy_state in ('CERTIFIED','HOLD','REVOKED')),
  evidence_uri text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique(app_id,access_tier,observed_at)
);

create table if not exists app.master_build408_consent_policy_receipts (
  receipt_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  policy_version integer not null check (policy_version >= 1),
  personal_data_requires_explicit_consent boolean not null check (personal_data_requires_explicit_consent),
  consent_purpose_bound boolean not null check (consent_purpose_bound),
  revocable boolean not null check (revocable),
  withdrawal_propagates boolean not null check (withdrawal_propagates),
  expiration_enforced boolean not null check (expiration_enforced),
  consent_may_grant_new_capability boolean not null default false check (consent_may_grant_new_capability=false),
  raw_personal_data_included_in_evidence boolean not null default false check (raw_personal_data_included_in_evidence=false),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  receipt_state text not null check (receipt_state in ('CERTIFIED','HOLD','REVOKED')),
  evidence_uri text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique(app_id,observed_at)
);

create table if not exists app.master_build408_tenant_isolation_evidence (
  evidence_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  api_boundary_verified boolean not null check (api_boundary_verified),
  database_rls_verified boolean not null check (database_rls_verified),
  storage_boundary_verified boolean not null check (storage_boundary_verified),
  same_tenant_foreign_access_denied boolean not null check (same_tenant_foreign_access_denied),
  cross_tenant_access_denied boolean not null check (cross_tenant_access_denied),
  cross_workspace_access_denied boolean not null check (cross_workspace_access_denied),
  evidence_current boolean not null check (evidence_current),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  evidence_state text not null check (evidence_state in ('VERIFIED','HOLD','FAILED')),
  evidence_uri text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique(app_id,observed_at)
);

create table if not exists app.master_build408_delegated_capability_recertifications (
  receipt_id uuid primary key,
  source_app_id text not null,
  target_app_id text not null,
  capability_namespace text not null check (length(capability_namespace) >= 3 and position('*' in capability_namespace)=0),
  max_lifetime_hours integer not null check (max_lifetime_hours between 1 and 24),
  exact_capability_required boolean not null check (exact_capability_required),
  exact_audience_required boolean not null check (exact_audience_required),
  tenant_scope_preserved boolean not null check (tenant_scope_preserved),
  workspace_scope_preserved boolean not null check (workspace_scope_preserved),
  consent_scope_preserved boolean not null check (consent_scope_preserved),
  subdelegation_allowed boolean not null default false check (subdelegation_allowed=false),
  authority_transfer boolean not null default false check (authority_transfer=false),
  t5_delegation_allowed boolean not null default false check (t5_delegation_allowed=false),
  revocation_propagation_required boolean not null check (revocation_propagation_required),
  consequential_writes_require_owner_gate boolean not null check (consequential_writes_require_owner_gate),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  receipt_state text not null check (receipt_state in ('RECERTIFIED','HOLD','REVOKED')),
  evidence_uri text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (source_app_id <> target_app_id),
  unique(source_app_id,target_app_id,observed_at)
);

create table if not exists app.master_build408_sync_compatibility_contracts (
  contract_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  protocol_major integer not null check (protocol_major >= 1),
  protocol_minor integer not null check (protocol_minor >= 0),
  minimum_peer_major integer not null check (minimum_peer_major >= 1),
  supported_peer_majors integer[] not null check (cardinality(supported_peer_majors) > 0),
  independent_deploy_allowed boolean not null check (independent_deploy_allowed),
  lockstep_release_required boolean not null default false check (lockstep_release_required=false),
  additive_changes_backward_compatible boolean not null check (additive_changes_backward_compatible),
  breaking_changes_require_major_bump boolean not null check (breaking_changes_require_major_bump),
  breaking_changes_require_explicit_peer_handoff boolean not null check (breaking_changes_require_explicit_peer_handoff),
  unknown_capabilities_fail_closed boolean not null check (unknown_capabilities_fail_closed),
  peer_unavailable_local_operations_continue boolean not null check (peer_unavailable_local_operations_continue),
  peer_unavailable_cross_app_capability_blocks boolean not null check (peer_unavailable_cross_app_capability_blocks),
  schema_negotiation_required boolean not null check (schema_negotiation_required),
  raw_secret_synchronization_allowed boolean not null default false check (raw_secret_synchronization_allowed=false),
  direct_peer_database_synchronization_allowed boolean not null default false check (direct_peer_database_synchronization_allowed=false),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  contract_state text not null check (contract_state in ('COMPATIBLE','HOLD','INCOMPATIBLE')),
  evidence_uri text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique(app_id,observed_at)
);

create index if not exists master_b408_auth_recent_idx on app.master_build408_authorization_policies(recorded_at desc);
create index if not exists master_b408_consent_recent_idx on app.master_build408_consent_policy_receipts(recorded_at desc);
create index if not exists master_b408_tenant_recent_idx on app.master_build408_tenant_isolation_evidence(recorded_at desc);
create index if not exists master_b408_delegation_recent_idx on app.master_build408_delegated_capability_recertifications(recorded_at desc);
create index if not exists master_b408_sync_recent_idx on app.master_build408_sync_compatibility_contracts(recorded_at desc);

alter table app.master_build408_authorization_policies enable row level security;
alter table app.master_build408_authorization_policies force row level security;
alter table app.master_build408_consent_policy_receipts enable row level security;
alter table app.master_build408_consent_policy_receipts force row level security;
alter table app.master_build408_tenant_isolation_evidence enable row level security;
alter table app.master_build408_tenant_isolation_evidence force row level security;
alter table app.master_build408_delegated_capability_recertifications enable row level security;
alter table app.master_build408_delegated_capability_recertifications force row level security;
alter table app.master_build408_sync_compatibility_contracts enable row level security;
alter table app.master_build408_sync_compatibility_contracts force row level security;

create policy master_b408_auth_runtime_select on app.master_build408_authorization_policies for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b408_consent_runtime_select on app.master_build408_consent_policy_receipts for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b408_tenant_runtime_select on app.master_build408_tenant_isolation_evidence for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b408_delegation_runtime_select on app.master_build408_delegated_capability_recertifications for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b408_sync_runtime_select on app.master_build408_sync_compatibility_contracts for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));

create policy master_b408_auth_protected_select on app.master_build408_authorization_policies for select to ai_data_protected_runtime using (true);
create policy master_b408_consent_protected_select on app.master_build408_consent_policy_receipts for select to ai_data_protected_runtime using (true);
create policy master_b408_tenant_protected_select on app.master_build408_tenant_isolation_evidence for select to ai_data_protected_runtime using (true);
create policy master_b408_delegation_protected_select on app.master_build408_delegated_capability_recertifications for select to ai_data_protected_runtime using (true);
create policy master_b408_sync_protected_select on app.master_build408_sync_compatibility_contracts for select to ai_data_protected_runtime using (true);

create policy master_b408_auth_protected_insert on app.master_build408_authorization_policies for insert to ai_data_protected_runtime with check (true);
create policy master_b408_consent_protected_insert on app.master_build408_consent_policy_receipts for insert to ai_data_protected_runtime with check (true);
create policy master_b408_tenant_protected_insert on app.master_build408_tenant_isolation_evidence for insert to ai_data_protected_runtime with check (true);
create policy master_b408_delegation_protected_insert on app.master_build408_delegated_capability_recertifications for insert to ai_data_protected_runtime with check (true);
create policy master_b408_sync_protected_insert on app.master_build408_sync_compatibility_contracts for insert to ai_data_protected_runtime with check (true);

grant select on app.master_build408_authorization_policies,app.master_build408_consent_policy_receipts,app.master_build408_tenant_isolation_evidence,app.master_build408_delegated_capability_recertifications,app.master_build408_sync_compatibility_contracts to ai_data_runtime;
grant select,insert on app.master_build408_authorization_policies,app.master_build408_consent_policy_receipts,app.master_build408_tenant_isolation_evidence,app.master_build408_delegated_capability_recertifications,app.master_build408_sync_compatibility_contracts to ai_data_protected_runtime;
revoke insert,update,delete on app.master_build408_authorization_policies,app.master_build408_consent_policy_receipts,app.master_build408_tenant_isolation_evidence,app.master_build408_delegated_capability_recertifications,app.master_build408_sync_compatibility_contracts from ai_data_runtime;
revoke update,delete on app.master_build408_authorization_policies,app.master_build408_consent_policy_receipts,app.master_build408_tenant_isolation_evidence,app.master_build408_delegated_capability_recertifications,app.master_build408_sync_compatibility_contracts from ai_data_protected_runtime;
