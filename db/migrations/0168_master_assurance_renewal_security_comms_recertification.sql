-- Build 405 — assurance renewal, degradation detection, security tiers,
-- communication re-certification and completion acceleration targets.

create table if not exists app.master_build405_assurance_renewals (
  renewal_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  repository text not null check (char_length(repository) between 1 and 160),
  topology_id text not null check (topology_id='rosevear-master-shell-seven-apps.v1'),
  production_main_sha text not null check (production_main_sha ~ '^[0-9a-f]{40}$'),
  manifest_sha256 text not null check (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  evidence_age_hours integer not null check (evidence_age_hours between 0 and 24),
  renewal_window_hours integer not null check (renewal_window_hours >= 168),
  sample_count integer not null check (sample_count >= 7),
  continuity_break_count integer not null check (continuity_break_count = 0),
  stale_evidence_recurrence_count integer not null check (stale_evidence_recurrence_count = 0),
  authority_transfer_count integer not null check (authority_transfer_count = 0),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  renewal_state text not null check (renewal_state in ('RENEWED','DEGRADED','HOLD')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (renewal_state <> 'RENEWED' or (owner_reviewed and independently_verified))
);

create table if not exists app.master_build405_recovery_effectiveness_degradation (
  effectiveness_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  observation_window_hours integer not null check (observation_window_hours >= 72),
  sample_count integer not null check (sample_count >= 5),
  recovery_event_count integer not null check (recovery_event_count >= 0),
  degraded_recovery_event_count integer not null check (degraded_recovery_event_count between 0 and recovery_event_count),
  unresolved_degradation_count integer not null check (unresolved_degradation_count = 0),
  effectiveness_percent numeric(5,2) not null check (effectiveness_percent between 95 and 100),
  recurrence_count integer not null check (recurrence_count = 0),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  effectiveness_state text not null check (effectiveness_state in ('EFFECTIVE','DEGRADED','HOLD')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (effectiveness_state <> 'EFFECTIVE' or (owner_reviewed and independently_verified))
);

create table if not exists app.master_build405_security_tier_recertifications (
  recertification_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  tier text not null check (tier in ('T1_IDENTITY_PROVENANCE','T2_TRANSPORT_AUTHENTICATION','T3_AUTHORIZATION_TENANT_CONSENT','T4_DATA_AUDIT_REPLAY_FAIL_CLOSED','T5_PRIVILEGED_OPERATION_RECOVERY')),
  passed_dimensions text[] not null,
  evidence_age_hours integer not null check (evidence_age_hours between 0 and 24),
  source_identity_verified boolean not null,
  tenant_isolation_verified boolean not null,
  secrets_excluded boolean not null,
  authority_preserved boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  recertification_state text not null check (recertification_state in ('RECERTIFIED','FAILED','HOLD')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique (app_id,tier,observed_at),
  check (
    recertification_state <> 'RECERTIFIED'
    or (
      cardinality(passed_dimensions)=6
      and source_identity_verified
      and tenant_isolation_verified
      and secrets_excluded
      and authority_preserved
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build405_communication_recertifications (
  relationship_id uuid primary key,
  left_app_id text not null,
  right_app_id text not null,
  channels text[] not null,
  evidence_age_hours integer not null check (evidence_age_hours between 0 and 24),
  transport_authenticated boolean not null,
  source_identity_verified boolean not null,
  target_audience_verified boolean not null,
  tenant_boundary_verified boolean not null,
  replay_protection_verified boolean not null,
  payload_classified boolean not null,
  secrets_excluded boolean not null,
  authority_preserved boolean not null,
  owner_gate_for_consequential_writes boolean not null,
  direct_peer_database_write boolean not null default false check (direct_peer_database_write=false),
  recertification_state text not null check (recertification_state in ('RECERTIFIED','FAILED','HOLD')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    left_app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')
    and right_app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')
    and left_app_id <> right_app_id
  ),
  check (
    recertification_state <> 'RECERTIFIED'
    or (
      transport_authenticated
      and source_identity_verified
      and target_audience_verified
      and tenant_boundary_verified
      and replay_protection_verified
      and payload_classified
      and secrets_excluded
      and authority_preserved
      and owner_gate_for_consequential_writes
    )
  )
);

create table if not exists app.master_build405_completion_acceleration_targets (
  target_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  axis text not null check (axis in ('design','implementation','automated-testing','integration-verification','security','accessibility-device-acceptance','production-user-acceptance')),
  baseline_percent numeric(5,2) not null check (baseline_percent between 0 and 100),
  target_percent numeric(5,2) not null check (target_percent between 0 and 100),
  denominator_locked boolean not null,
  owner_approved boolean not null,
  independent_evidence_required boolean not null,
  target_state text not null check (target_state in ('TARGET_SET','HOLD')),
  baseline_evidence_uri text not null check (char_length(baseline_evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique (app_id,axis,observed_at),
  check (
    target_state <> 'TARGET_SET'
    or (
      target_percent >= least(100,baseline_percent+10)
      and denominator_locked
      and owner_approved
      and independent_evidence_required
    )
  )
);

create index if not exists master_b405_assurance_recent_idx on app.master_build405_assurance_renewals(recorded_at desc);
create index if not exists master_b405_recovery_recent_idx on app.master_build405_recovery_effectiveness_degradation(recorded_at desc);
create index if not exists master_b405_security_recent_idx on app.master_build405_security_tier_recertifications(recorded_at desc);
create index if not exists master_b405_comms_recent_idx on app.master_build405_communication_recertifications(recorded_at desc);
create index if not exists master_b405_completion_recent_idx on app.master_build405_completion_acceleration_targets(recorded_at desc);

alter table app.master_build405_assurance_renewals enable row level security;
alter table app.master_build405_assurance_renewals force row level security;
alter table app.master_build405_recovery_effectiveness_degradation enable row level security;
alter table app.master_build405_recovery_effectiveness_degradation force row level security;
alter table app.master_build405_security_tier_recertifications enable row level security;
alter table app.master_build405_security_tier_recertifications force row level security;
alter table app.master_build405_communication_recertifications enable row level security;
alter table app.master_build405_communication_recertifications force row level security;
alter table app.master_build405_completion_acceleration_targets enable row level security;
alter table app.master_build405_completion_acceleration_targets force row level security;

create policy master_b405_assurance_runtime_select on app.master_build405_assurance_renewals for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b405_recovery_runtime_select on app.master_build405_recovery_effectiveness_degradation for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b405_security_runtime_select on app.master_build405_security_tier_recertifications for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b405_comms_runtime_select on app.master_build405_communication_recertifications for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b405_completion_runtime_select on app.master_build405_completion_acceleration_targets for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));

create policy master_b405_assurance_protected_insert on app.master_build405_assurance_renewals for insert to ai_data_protected_runtime with check (true);
create policy master_b405_recovery_protected_insert on app.master_build405_recovery_effectiveness_degradation for insert to ai_data_protected_runtime with check (true);
create policy master_b405_security_protected_insert on app.master_build405_security_tier_recertifications for insert to ai_data_protected_runtime with check (true);
create policy master_b405_comms_protected_insert on app.master_build405_communication_recertifications for insert to ai_data_protected_runtime with check (true);
create policy master_b405_completion_protected_insert on app.master_build405_completion_acceleration_targets for insert to ai_data_protected_runtime with check (true);

create policy master_b405_assurance_protected_select on app.master_build405_assurance_renewals for select to ai_data_protected_runtime using (true);
create policy master_b405_recovery_protected_select on app.master_build405_recovery_effectiveness_degradation for select to ai_data_protected_runtime using (true);
create policy master_b405_security_protected_select on app.master_build405_security_tier_recertifications for select to ai_data_protected_runtime using (true);
create policy master_b405_comms_protected_select on app.master_build405_communication_recertifications for select to ai_data_protected_runtime using (true);
create policy master_b405_completion_protected_select on app.master_build405_completion_acceleration_targets for select to ai_data_protected_runtime using (true);

grant select on app.master_build405_assurance_renewals,app.master_build405_recovery_effectiveness_degradation,app.master_build405_security_tier_recertifications,app.master_build405_communication_recertifications,app.master_build405_completion_acceleration_targets to ai_data_runtime;
grant select,insert on app.master_build405_assurance_renewals,app.master_build405_recovery_effectiveness_degradation,app.master_build405_security_tier_recertifications,app.master_build405_communication_recertifications,app.master_build405_completion_acceleration_targets to ai_data_protected_runtime;
revoke insert,update,delete on app.master_build405_assurance_renewals,app.master_build405_recovery_effectiveness_degradation,app.master_build405_security_tier_recertifications,app.master_build405_communication_recertifications,app.master_build405_completion_acceleration_targets from ai_data_runtime;
revoke update,delete on app.master_build405_assurance_renewals,app.master_build405_recovery_effectiveness_degradation,app.master_build405_security_tier_recertifications,app.master_build405_communication_recertifications,app.master_build405_completion_acceleration_targets from ai_data_protected_runtime;
