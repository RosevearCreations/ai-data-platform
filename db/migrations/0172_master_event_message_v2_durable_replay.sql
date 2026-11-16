-- Build 409 — cross-application event/message contract V2, correlation continuity,
-- durable delivery, acknowledgement, dead-letter and bounded replay governance.

create table if not exists app.master_build409_event_contracts (
  contract_id uuid primary key,
  source_app_id text not null,
  target_app_id text not null,
  preferred_event_version integer not null check (preferred_event_version=2),
  supported_event_versions integer[] not null check (1=any(supported_event_versions) and 2=any(supported_event_versions)),
  emit_highest_mutually_supported_version boolean not null check (emit_highest_mutually_supported_version),
  correlation_id_required boolean not null check (correlation_id_required),
  causation_id_required_for_derived_events boolean not null check (causation_id_required_for_derived_events),
  root_event_may_have_null_causation boolean not null check (root_event_may_have_null_causation),
  trace_id_required boolean not null check (trace_id_required),
  idempotency_key_required boolean not null check (idempotency_key_required),
  schema_ref_required boolean not null check (schema_ref_required),
  payload_digest_sha256_required boolean not null check (payload_digest_sha256_required),
  capability_namespace_required boolean not null check (capability_namespace_required),
  raw_secrets_allowed boolean not null default false check (raw_secrets_allowed=false),
  raw_personal_data_in_audit_evidence boolean not null default false check (raw_personal_data_in_audit_evidence=false),
  message_may_create_consent boolean not null default false check (message_may_create_consent=false),
  message_may_grant_capability boolean not null default false check (message_may_grant_capability=false),
  message_may_transfer_authority boolean not null default false check (message_may_transfer_authority=false),
  message_may_manufacture_connected_state boolean not null default false check (message_may_manufacture_connected_state=false),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  contract_state text not null check (contract_state in ('CERTIFIED','HOLD','REVOKED')),
  evidence_uri text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (source_app_id<>target_app_id),
  unique(source_app_id,target_app_id,observed_at)
);

create table if not exists app.master_build409_durable_delivery_policies (
  policy_id uuid primary key,
  source_app_id text not null,
  target_app_id text not null,
  delivery_semantics text not null check (delivery_semantics='at-least-once'),
  acknowledgement_required boolean not null check (acknowledgement_required),
  idempotency_required boolean not null check (idempotency_required),
  duplicate_suppression_required boolean not null check (duplicate_suppression_required),
  max_delivery_attempts integer not null check (max_delivery_attempts between 1 and 8),
  exponential_backoff_required boolean not null check (exponential_backoff_required),
  dead_letter_after_exhaustion boolean not null check (dead_letter_after_exhaustion),
  duplicate_may_reapply_side_effect boolean not null default false check (duplicate_may_reapply_side_effect=false),
  acknowledgement_may_grant_authority boolean not null default false check (acknowledgement_may_grant_authority=false),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  policy_state text not null check (policy_state in ('ENFORCED','HOLD','FAILED')),
  evidence_uri text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (source_app_id<>target_app_id),
  unique(source_app_id,target_app_id,observed_at)
);

create table if not exists app.master_build409_correlation_continuity_evidence (
  evidence_id uuid primary key,
  source_app_id text not null,
  target_app_id text not null,
  correlation_id_preserved boolean not null check (correlation_id_preserved),
  causation_chain_valid boolean not null check (causation_chain_valid),
  trace_id_preserved boolean not null check (trace_id_preserved),
  tenant_scope_preserved boolean not null check (tenant_scope_preserved),
  workspace_scope_preserved boolean not null check (workspace_scope_preserved),
  capability_scope_preserved boolean not null check (capability_scope_preserved),
  consent_scope_preserved boolean not null check (consent_scope_preserved),
  authority_context_preserved boolean not null check (authority_context_preserved),
  source_identity_preserved boolean not null check (source_identity_preserved),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  evidence_state text not null check (evidence_state in ('VERIFIED','HOLD','FAILED')),
  evidence_uri text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (source_app_id<>target_app_id),
  unique(source_app_id,target_app_id,observed_at)
);

create table if not exists app.master_build409_dead_letter_replay_policies (
  policy_id uuid primary key,
  source_app_id text not null,
  target_app_id text not null,
  dead_letter_required boolean not null check (dead_letter_required),
  replay_requires_original_envelope_digest boolean not null check (replay_requires_original_envelope_digest),
  replay_creates_new_attempt_id boolean not null check (replay_creates_new_attempt_id),
  replay_preserves_original_event_id boolean not null check (replay_preserves_original_event_id),
  replay_preserves_correlation_and_causation boolean not null check (replay_preserves_correlation_and_causation),
  replay_max_age_hours integer not null check (replay_max_age_hours between 1 and 168),
  replay_after_capability_revocation boolean not null default false check (replay_after_capability_revocation=false),
  replay_after_consent_withdrawal boolean not null default false check (replay_after_consent_withdrawal=false),
  consequential_replay_requires_owner_gate boolean not null check (consequential_replay_requires_owner_gate),
  replay_may_expand_authority boolean not null default false check (replay_may_expand_authority=false),
  replay_may_change_tenant_or_workspace boolean not null default false check (replay_may_change_tenant_or_workspace=false),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  policy_state text not null check (policy_state in ('ENFORCED','HOLD','FAILED')),
  evidence_uri text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (source_app_id<>target_app_id),
  unique(source_app_id,target_app_id,observed_at)
);

create table if not exists app.master_build409_message_compatibility_contracts (
  contract_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  synchronization_protocol text not null check (synchronization_protocol='1.1'),
  preferred_event_version integer not null check (preferred_event_version=2),
  supported_event_versions integer[] not null check (1=any(supported_event_versions) and 2=any(supported_event_versions)),
  peer_version_negotiation_required boolean not null check (peer_version_negotiation_required),
  v1_fallback_required boolean not null check (v1_fallback_required),
  lockstep_release_required boolean not null default false check (lockstep_release_required=false),
  unavailable_peer_blocks_only_dependent_delivery boolean not null check (unavailable_peer_blocks_only_dependent_delivery),
  unrelated_local_operations_continue boolean not null check (unrelated_local_operations_continue),
  vercel_quota_on_one_application_does_not_block_unrelated_peer_release boolean not null check (vercel_quota_on_one_application_does_not_block_unrelated_peer_release),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  contract_state text not null check (contract_state in ('COMPATIBLE','HOLD','INCOMPATIBLE')),
  evidence_uri text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique(app_id,observed_at)
);

create index if not exists master_b409_event_recent_idx on app.master_build409_event_contracts(recorded_at desc);
create index if not exists master_b409_delivery_recent_idx on app.master_build409_durable_delivery_policies(recorded_at desc);
create index if not exists master_b409_correlation_recent_idx on app.master_build409_correlation_continuity_evidence(recorded_at desc);
create index if not exists master_b409_replay_recent_idx on app.master_build409_dead_letter_replay_policies(recorded_at desc);
create index if not exists master_b409_compat_recent_idx on app.master_build409_message_compatibility_contracts(recorded_at desc);

alter table app.master_build409_event_contracts enable row level security;
alter table app.master_build409_event_contracts force row level security;
alter table app.master_build409_durable_delivery_policies enable row level security;
alter table app.master_build409_durable_delivery_policies force row level security;
alter table app.master_build409_correlation_continuity_evidence enable row level security;
alter table app.master_build409_correlation_continuity_evidence force row level security;
alter table app.master_build409_dead_letter_replay_policies enable row level security;
alter table app.master_build409_dead_letter_replay_policies force row level security;
alter table app.master_build409_message_compatibility_contracts enable row level security;
alter table app.master_build409_message_compatibility_contracts force row level security;

create policy master_b409_event_runtime_select on app.master_build409_event_contracts for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b409_delivery_runtime_select on app.master_build409_durable_delivery_policies for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b409_correlation_runtime_select on app.master_build409_correlation_continuity_evidence for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b409_replay_runtime_select on app.master_build409_dead_letter_replay_policies for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b409_compat_runtime_select on app.master_build409_message_compatibility_contracts for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));

create policy master_b409_event_protected_select on app.master_build409_event_contracts for select to ai_data_protected_runtime using (true);
create policy master_b409_delivery_protected_select on app.master_build409_durable_delivery_policies for select to ai_data_protected_runtime using (true);
create policy master_b409_correlation_protected_select on app.master_build409_correlation_continuity_evidence for select to ai_data_protected_runtime using (true);
create policy master_b409_replay_protected_select on app.master_build409_dead_letter_replay_policies for select to ai_data_protected_runtime using (true);
create policy master_b409_compat_protected_select on app.master_build409_message_compatibility_contracts for select to ai_data_protected_runtime using (true);

create policy master_b409_event_protected_insert on app.master_build409_event_contracts for insert to ai_data_protected_runtime with check (true);
create policy master_b409_delivery_protected_insert on app.master_build409_durable_delivery_policies for insert to ai_data_protected_runtime with check (true);
create policy master_b409_correlation_protected_insert on app.master_build409_correlation_continuity_evidence for insert to ai_data_protected_runtime with check (true);
create policy master_b409_replay_protected_insert on app.master_build409_dead_letter_replay_policies for insert to ai_data_protected_runtime with check (true);
create policy master_b409_compat_protected_insert on app.master_build409_message_compatibility_contracts for insert to ai_data_protected_runtime with check (true);

grant select on app.master_build409_event_contracts,app.master_build409_durable_delivery_policies,app.master_build409_correlation_continuity_evidence,app.master_build409_dead_letter_replay_policies,app.master_build409_message_compatibility_contracts to ai_data_runtime;
grant select,insert on app.master_build409_event_contracts,app.master_build409_durable_delivery_policies,app.master_build409_correlation_continuity_evidence,app.master_build409_dead_letter_replay_policies,app.master_build409_message_compatibility_contracts to ai_data_protected_runtime;
revoke insert,update,delete on app.master_build409_event_contracts,app.master_build409_durable_delivery_policies,app.master_build409_correlation_continuity_evidence,app.master_build409_dead_letter_replay_policies,app.master_build409_message_compatibility_contracts from ai_data_runtime;
revoke update,delete on app.master_build409_event_contracts,app.master_build409_durable_delivery_policies,app.master_build409_correlation_continuity_evidence,app.master_build409_dead_letter_replay_policies,app.master_build409_message_compatibility_contracts from ai_data_protected_runtime;
