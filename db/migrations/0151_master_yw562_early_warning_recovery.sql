-- Build 387 — Early-Warning Recovery Tracking,
-- Degradation Remediation Effectiveness & Multi-Horizon Baseline Restoration Audit.

create table if not exists app.master_build387_early_warning_recovery_observations (
  observation_id uuid primary key,
  warning_state text not null check (warning_state in ('CLEAR','EARLY_WARNING_ACTIVE')),
  remediation_state text not null check (remediation_state in ('NOT_REQUIRED','IN_PROGRESS','VERIFIED')),
  baseline_restored boolean not null,
  ai_hub_acknowledged boolean not null default false,
  comms_acknowledged boolean not null default false,
  controller_acknowledged boolean not null default false,
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create table if not exists app.master_build387_remediation_effectiveness_reviews (
  review_id uuid primary key,
  remediation_id text not null,
  control_id text not null,
  previous_score numeric(6,5) not null check (previous_score between 0 and 1),
  restored_score numeric(6,5) not null check (restored_score between 0 and 1),
  independently_verified boolean not null,
  effectiveness_state text not null check (
    effectiveness_state in ('REMEDIATION_INEFFECTIVE','REMEDIATION_EFFECTIVE')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    effectiveness_state <> 'REMEDIATION_EFFECTIVE'
    or (independently_verified and restored_score >= previous_score)
  )
);

create table if not exists app.master_build387_baseline_restoration_audits (
  audit_id uuid primary key,
  recovery_observation_id uuid not null
    references app.master_build387_early_warning_recovery_observations(observation_id) on delete restrict,
  six_hour_restored boolean not null,
  twenty_four_hour_restored boolean not null,
  seventy_two_hour_restored boolean not null,
  all_three_masters_acknowledged boolean not null,
  restoration_state text not null check (
    restoration_state in ('BASELINE_RESTORATION_REQUIRED','MULTI_HORIZON_BASELINE_RESTORED')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    restoration_state <> 'MULTI_HORIZON_BASELINE_RESTORED'
    or (
      six_hour_restored
      and twenty_four_hour_restored
      and seventy_two_hour_restored
      and all_three_masters_acknowledged
    )
  )
);

create index if not exists master_build387_recovery_recent_idx
  on app.master_build387_early_warning_recovery_observations(recorded_at desc);
create index if not exists master_build387_remediation_recent_idx
  on app.master_build387_remediation_effectiveness_reviews(recorded_at desc);
create index if not exists master_build387_restoration_recent_idx
  on app.master_build387_baseline_restoration_audits(recorded_at desc);

alter table app.master_build387_early_warning_recovery_observations enable row level security;
alter table app.master_build387_early_warning_recovery_observations force row level security;
alter table app.master_build387_remediation_effectiveness_reviews enable row level security;
alter table app.master_build387_remediation_effectiveness_reviews force row level security;
alter table app.master_build387_baseline_restoration_audits enable row level security;
alter table app.master_build387_baseline_restoration_audits force row level security;

create policy master_build387_recovery_runtime_select
  on app.master_build387_early_warning_recovery_observations
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_build387_remediation_runtime_select
  on app.master_build387_remediation_effectiveness_reviews
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_build387_restoration_runtime_select
  on app.master_build387_baseline_restoration_audits
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_build387_recovery_protected_insert
  on app.master_build387_early_warning_recovery_observations
  for insert to ai_data_protected_runtime with check (true);
create policy master_build387_remediation_protected_insert
  on app.master_build387_remediation_effectiveness_reviews
  for insert to ai_data_protected_runtime
  with check (
    effectiveness_state <> 'REMEDIATION_EFFECTIVE'
    or (independently_verified and restored_score >= previous_score)
  );
create policy master_build387_restoration_protected_insert
  on app.master_build387_baseline_restoration_audits
  for insert to ai_data_protected_runtime
  with check (
    restoration_state <> 'MULTI_HORIZON_BASELINE_RESTORED'
    or (
      six_hour_restored
      and twenty_four_hour_restored
      and seventy_two_hour_restored
      and all_three_masters_acknowledged
    )
  );

create policy master_build387_recovery_protected_select
  on app.master_build387_early_warning_recovery_observations
  for select to ai_data_protected_runtime using (true);
create policy master_build387_remediation_protected_select
  on app.master_build387_remediation_effectiveness_reviews
  for select to ai_data_protected_runtime using (true);
create policy master_build387_restoration_protected_select
  on app.master_build387_baseline_restoration_audits
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build387_early_warning_recovery_observations,
  app.master_build387_remediation_effectiveness_reviews,
  app.master_build387_baseline_restoration_audits
to ai_data_runtime;

grant select,insert on
  app.master_build387_early_warning_recovery_observations,
  app.master_build387_remediation_effectiveness_reviews,
  app.master_build387_baseline_restoration_audits
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build387_early_warning_recovery_observations,
  app.master_build387_remediation_effectiveness_reviews,
  app.master_build387_baseline_restoration_audits
from ai_data_runtime;

revoke update,delete on
  app.master_build387_early_warning_recovery_observations,
  app.master_build387_remediation_effectiveness_reviews,
  app.master_build387_baseline_restoration_audits
from ai_data_protected_runtime;
