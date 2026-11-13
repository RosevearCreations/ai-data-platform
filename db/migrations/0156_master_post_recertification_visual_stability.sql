-- Build 393 — Post-Re-Certification Visual Stability Monitoring,
-- Remediation Effectiveness & Cross-Shell Drift Recurrence Prevention Audit.

create table if not exists app.master_build393_visual_stability_samples (
  sample_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  theme_version text not null,
  navigation_stable boolean not null,
  instrument_kpis_stable boolean not null,
  semantic_statuses_stable boolean not null,
  authority_boundary_stable boolean not null,
  responsive_parity_stable boolean not null,
  independently_observed boolean not null,
  stability_state text not null check (
    stability_state in ('STABLE','RECURRENT_DRIFT','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    stability_state <> 'STABLE'
    or (
      theme_version='rosevear-master-instrument.v1'
      and navigation_stable
      and instrument_kpis_stable
      and semantic_statuses_stable
      and authority_boundary_stable
      and responsive_parity_stable
      and independently_observed
    )
  )
);

create table if not exists app.master_build393_remediation_effectiveness_reviews (
  review_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  build392_exception_id uuid references app.master_build392_visual_governance_exceptions(exception_id),
  stable_window_hours integer not null check (stable_window_hours >= 0),
  recurrence_detected boolean not null,
  preventive_controls_effective boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  review_state text not null check (
    review_state in ('EFFECTIVE','INEFFECTIVE','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    review_state <> 'EFFECTIVE'
    or (
      stable_window_hours >= 1
      and not recurrence_detected
      and preventive_controls_effective
      and owner_reviewed
      and independently_verified
    )
  )
);

create table if not exists app.master_build393_drift_recurrence_prevention_audits (
  audit_id uuid primary key,
  all_five_shells_covered boolean not null,
  no_unresolved_recurrence boolean not null,
  preventive_controls_verified boolean not null,
  owner_accepted boolean not null,
  independently_verified boolean not null,
  audit_state text not null check (
    audit_state in ('VERIFIED','HOLD','REJECTED')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    audit_state <> 'VERIFIED'
    or (
      all_five_shells_covered
      and no_unresolved_recurrence
      and preventive_controls_verified
      and owner_accepted
      and independently_verified
    )
  )
);

create index if not exists master_b393_stability_recent_idx
  on app.master_build393_visual_stability_samples(recorded_at desc);
create index if not exists master_b393_effectiveness_recent_idx
  on app.master_build393_remediation_effectiveness_reviews(recorded_at desc);
create index if not exists master_b393_recurrence_audit_recent_idx
  on app.master_build393_drift_recurrence_prevention_audits(recorded_at desc);

alter table app.master_build393_visual_stability_samples enable row level security;
alter table app.master_build393_visual_stability_samples force row level security;
alter table app.master_build393_remediation_effectiveness_reviews enable row level security;
alter table app.master_build393_remediation_effectiveness_reviews force row level security;
alter table app.master_build393_drift_recurrence_prevention_audits enable row level security;
alter table app.master_build393_drift_recurrence_prevention_audits force row level security;

create policy master_b393_stability_runtime_select
  on app.master_build393_visual_stability_samples
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b393_effectiveness_runtime_select
  on app.master_build393_remediation_effectiveness_reviews
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b393_recurrence_runtime_select
  on app.master_build393_drift_recurrence_prevention_audits
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_b393_stability_protected_insert
  on app.master_build393_visual_stability_samples
  for insert to ai_data_protected_runtime with check (true);
create policy master_b393_effectiveness_protected_insert
  on app.master_build393_remediation_effectiveness_reviews
  for insert to ai_data_protected_runtime with check (true);
create policy master_b393_recurrence_protected_insert
  on app.master_build393_drift_recurrence_prevention_audits
  for insert to ai_data_protected_runtime
  with check (
    audit_state <> 'VERIFIED'
    or (
      all_five_shells_covered
      and no_unresolved_recurrence
      and preventive_controls_verified
      and owner_accepted
      and independently_verified
    )
  );

create policy master_b393_stability_protected_select
  on app.master_build393_visual_stability_samples
  for select to ai_data_protected_runtime using (true);
create policy master_b393_effectiveness_protected_select
  on app.master_build393_remediation_effectiveness_reviews
  for select to ai_data_protected_runtime using (true);
create policy master_b393_recurrence_protected_select
  on app.master_build393_drift_recurrence_prevention_audits
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build393_visual_stability_samples,
  app.master_build393_remediation_effectiveness_reviews,
  app.master_build393_drift_recurrence_prevention_audits
to ai_data_runtime;

grant select,insert on
  app.master_build393_visual_stability_samples,
  app.master_build393_remediation_effectiveness_reviews,
  app.master_build393_drift_recurrence_prevention_audits
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build393_visual_stability_samples,
  app.master_build393_remediation_effectiveness_reviews,
  app.master_build393_drift_recurrence_prevention_audits
from ai_data_runtime;

revoke update,delete on
  app.master_build393_visual_stability_samples,
  app.master_build393_remediation_effectiveness_reviews,
  app.master_build393_drift_recurrence_prevention_audits
from ai_data_protected_runtime;
