create table if not exists app.master_build421_local_security_consent_renewals (
  evidence_id text primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  dimension text not null check (dimension in ('LEAST_PRIVILEGE','TENANT_WORKSPACE_ISOLATION','CONSENT_LIFECYCLE')),
  state text not null check (state in ('PASS','PARTIAL','FAILED')),
  deny_by_default boolean not null default false,
  exact_capability_namespace boolean not null default false,
  wildcard_capability_grant boolean not null default false,
  stale_grant_review_complete boolean not null default false,
  least_privilege_policy_current boolean not null default false,
  t5_non_delegable boolean not null default false,
  cross_tenant_override_granted boolean not null default false,
  api_boundary_verified boolean not null default false,
  database_rls_verified boolean not null default false,
  storage_boundary_verified boolean not null default false,
  tenant_context_validated boolean not null default false,
  same_tenant_foreign_access_denied boolean not null default false,
  cross_tenant_access_denied boolean not null default false,
  cross_workspace_access_denied boolean not null default false,
  personal_data_requires_explicit_consent boolean not null default false,
  consent_purpose_bound boolean not null default false,
  consent_expiry_enforced boolean not null default false,
  consent_withdrawal_revokes_capability boolean not null default false,
  revocation_propagation_verified boolean not null default false,
  revoked_grant_rejected boolean not null default false,
  renewal_requires_fresh_consent boolean not null default false,
  consent_may_grant_new_capability boolean not null default false,
  raw_personal_data_included_in_evidence boolean not null default false,
  evidence_digest text not null check (evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  source_owned boolean not null,
  synthetic_evidence boolean not null default false check (synthetic_evidence=false),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  recorded_at timestamptz not null default now(),
  check (expires_at>observed_at),
  unique(app_id,dimension,observed_at)
);

create table if not exists app.master_build421_delegated_capability_renewals (
  receipt_id text primary key,
  source_app_id text not null check (source_app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  target_app_id text not null check (target_app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  capability_namespace text not null check (length(capability_namespace)>=3 and position('*' in capability_namespace)=0),
  state text not null check (state in ('RENEWED','HOLD','REVOKED')),
  max_lifetime_hours integer not null check (max_lifetime_hours between 1 and 24),
  exact_capability_required boolean not null,
  exact_audience_required boolean not null,
  tenant_scope_preserved boolean not null,
  workspace_scope_preserved boolean not null,
  consent_scope_preserved boolean not null,
  explicit_renewal_required boolean not null,
  previous_grant_may_self_renew boolean not null default false check (previous_grant_may_self_renew=false),
  consent_valid_at_renewal boolean not null,
  subdelegation_allowed boolean not null default false check (subdelegation_allowed=false),
  authority_transfer boolean not null default false check (authority_transfer=false),
  t5_delegation_allowed boolean not null default false check (t5_delegation_allowed=false),
  revocation_propagation_required boolean not null,
  consequential_writes_require_owner_gate boolean not null,
  evidence_digest text not null check (evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  source_owned boolean not null,
  synthetic_evidence boolean not null default false check (synthetic_evidence=false),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  grant_issued_at timestamptz not null,
  grant_expires_at timestamptz not null,
  revoked_at timestamptz,
  observed_at timestamptz not null,
  evidence_expires_at timestamptz not null,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  recorded_at timestamptz not null default now(),
  check (source_app_id<>target_app_id),
  check (grant_expires_at>grant_issued_at),
  check (evidence_expires_at>observed_at),
  check (state<>'RENEWED' or revoked_at is null),
  unique(source_app_id,target_app_id,observed_at)
);

create index if not exists master_b421_local_recent_idx
 on app.master_build421_local_security_consent_renewals(app_id,dimension,observed_at desc);
create index if not exists master_b421_delegated_recent_idx
 on app.master_build421_delegated_capability_renewals(source_app_id,target_app_id,observed_at desc);

alter table app.master_build421_local_security_consent_renewals enable row level security;
alter table app.master_build421_local_security_consent_renewals force row level security;
alter table app.master_build421_delegated_capability_renewals enable row level security;
alter table app.master_build421_delegated_capability_renewals force row level security;

create policy master_b421_local_runtime_select on app.master_build421_local_security_consent_renewals
 for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b421_delegated_runtime_select on app.master_build421_delegated_capability_renewals
 for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));

create policy master_b421_local_protected_select on app.master_build421_local_security_consent_renewals
 for select to ai_data_protected_runtime using (true);
create policy master_b421_delegated_protected_select on app.master_build421_delegated_capability_renewals
 for select to ai_data_protected_runtime using (true);

create policy master_b421_local_protected_insert on app.master_build421_local_security_consent_renewals
 for insert to ai_data_protected_runtime with check (
   source_owned and not synthetic_evidence and owner_reviewed and independently_verified
 );
create policy master_b421_delegated_protected_insert on app.master_build421_delegated_capability_renewals
 for insert to ai_data_protected_runtime with check (
   source_owned and not synthetic_evidence and owner_reviewed and independently_verified
 );

grant select on app.master_build421_local_security_consent_renewals,app.master_build421_delegated_capability_renewals to ai_data_runtime;
grant select,insert on app.master_build421_local_security_consent_renewals,app.master_build421_delegated_capability_renewals to ai_data_protected_runtime;
revoke insert,update,delete on app.master_build421_local_security_consent_renewals,app.master_build421_delegated_capability_renewals from ai_data_runtime;
revoke update,delete on app.master_build421_local_security_consent_renewals,app.master_build421_delegated_capability_renewals from ai_data_protected_runtime;
