-- Build 406 — unified access-tier baseline, trust matrix and completion denominator governance.

create table if not exists app.master_build406_security_tier_baselines (
  baseline_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  access_tier text not null check (access_tier in ('T0_PUBLIC_READ','T1_USER_SCOPED','T2_TENANT_SCOPED','T3_OPERATOR_SCOPED','T4_MASTER_GOVERNANCE','T5_ORIGINAL_HOST_OWNER_CEREMONY')),
  control_domains text[] not null check (cardinality(control_domains)=5),
  policy_version integer not null check (policy_version >= 1),
  source_identity_bound boolean not null,
  resource_scope_defined boolean not null,
  tenant_boundary_defined boolean not null,
  deny_by_default boolean not null,
  t5_non_routable boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  baseline_state text not null check (baseline_state in ('BASELINED','FAILED','HOLD')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique(app_id,access_tier,observed_at),
  check (
    baseline_state <> 'BASELINED'
    or (
      source_identity_bound
      and resource_scope_defined
      and tenant_boundary_defined
      and deny_by_default
      and t5_non_routable
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build406_trust_matrix_baselines (
  baseline_id uuid primary key,
  left_app_id text not null,
  right_app_id text not null,
  allowed_channels text[] not null,
  max_routable_access_tier text not null check (max_routable_access_tier in ('T0_PUBLIC_READ','T1_USER_SCOPED','T2_TENANT_SCOPED','T3_OPERATOR_SCOPED','T4_MASTER_GOVERNANCE')),
  source_identity_verified boolean not null,
  target_identity_verified boolean not null,
  tenant_scope_verified boolean not null,
  transitive_trust_allowed boolean not null default false check (transitive_trust_allowed=false),
  direct_peer_database_write boolean not null default false check (direct_peer_database_write=false),
  raw_secrets_allowed boolean not null default false check (raw_secrets_allowed=false),
  delegated_authority boolean not null default false check (delegated_authority=false),
  owner_gate_for_consequential_writes boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  trust_state text not null check (trust_state in ('VERIFIED','FAILED','HOLD')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    left_app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')
    and right_app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')
    and left_app_id <> right_app_id
  ),
  check (
    trust_state <> 'VERIFIED'
    or (
      source_identity_verified
      and target_identity_verified
      and tenant_scope_verified
      and owner_gate_for_consequential_writes
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build406_completion_denominator_baselines (
  baseline_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  aspect text not null check (aspect in ('customer-guest','worker-admin','product-storefront','finance-tax','stock-inventory','scheduling-jobs','hr-payroll','media-social','security-privacy','cross-app-integration','accessibility-mobile','deployment-recovery','observability-support')),
  applicable_requirement_count integer not null check (applicable_requirement_count > 0),
  verified_requirement_count integer not null check (verified_requirement_count >= 0 and verified_requirement_count <= applicable_requirement_count),
  baseline_percent numeric(5,2) not null check (baseline_percent between 0 and 100),
  target_percent numeric(5,2) not null check (target_percent between 0 and 100),
  denominator_hash_sha256 text not null check (denominator_hash_sha256 ~ '^[0-9a-f]{64}$'),
  denominator_locked boolean not null,
  owner_approved boolean not null,
  independently_verified boolean not null,
  baseline_state text not null check (baseline_state in ('LOCKED','UNMEASURED','HOLD')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique(app_id,aspect,observed_at),
  check (
    baseline_state <> 'LOCKED'
    or (
      target_percent >= least(100,baseline_percent+10)
      and denominator_locked
      and owner_approved
      and independently_verified
    )
  )
);

create index if not exists master_b406_security_recent_idx on app.master_build406_security_tier_baselines(recorded_at desc);
create index if not exists master_b406_trust_recent_idx on app.master_build406_trust_matrix_baselines(recorded_at desc);
create index if not exists master_b406_completion_recent_idx on app.master_build406_completion_denominator_baselines(recorded_at desc);

alter table app.master_build406_security_tier_baselines enable row level security;
alter table app.master_build406_security_tier_baselines force row level security;
alter table app.master_build406_trust_matrix_baselines enable row level security;
alter table app.master_build406_trust_matrix_baselines force row level security;
alter table app.master_build406_completion_denominator_baselines enable row level security;
alter table app.master_build406_completion_denominator_baselines force row level security;

create policy master_b406_security_runtime_select on app.master_build406_security_tier_baselines for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b406_trust_runtime_select on app.master_build406_trust_matrix_baselines for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b406_completion_runtime_select on app.master_build406_completion_denominator_baselines for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));

create policy master_b406_security_protected_select on app.master_build406_security_tier_baselines for select to ai_data_protected_runtime using (true);
create policy master_b406_trust_protected_select on app.master_build406_trust_matrix_baselines for select to ai_data_protected_runtime using (true);
create policy master_b406_completion_protected_select on app.master_build406_completion_denominator_baselines for select to ai_data_protected_runtime using (true);

create policy master_b406_security_protected_insert on app.master_build406_security_tier_baselines for insert to ai_data_protected_runtime with check (true);
create policy master_b406_trust_protected_insert on app.master_build406_trust_matrix_baselines for insert to ai_data_protected_runtime with check (true);
create policy master_b406_completion_protected_insert on app.master_build406_completion_denominator_baselines for insert to ai_data_protected_runtime with check (true);

grant select on app.master_build406_security_tier_baselines,app.master_build406_trust_matrix_baselines,app.master_build406_completion_denominator_baselines to ai_data_runtime;
grant select,insert on app.master_build406_security_tier_baselines,app.master_build406_trust_matrix_baselines,app.master_build406_completion_denominator_baselines to ai_data_protected_runtime;
revoke insert,update,delete on app.master_build406_security_tier_baselines,app.master_build406_trust_matrix_baselines,app.master_build406_completion_denominator_baselines from ai_data_runtime;
revoke update,delete on app.master_build406_security_tier_baselines,app.master_build406_trust_matrix_baselines,app.master_build406_completion_denominator_baselines from ai_data_protected_runtime;
