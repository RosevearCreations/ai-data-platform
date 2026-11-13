-- Build 391 — Cross-Shell Theme Drift Monitoring,
-- Responsive-Parity Regression Detection & Master Visual-Governance Closure Audit.

create table if not exists app.master_build391_theme_drift_observations (
  observation_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  theme_version text not null,
  navigation_accepted boolean not null,
  instrument_kpis_accepted boolean not null,
  semantic_statuses_accepted boolean not null,
  authority_boundary_preserved boolean not null,
  independently_observed boolean not null,
  drift_state text not null check (
    drift_state in ('NO_DRIFT','DRIFT_DETECTED','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    drift_state <> 'NO_DRIFT'
    or (
      theme_version='rosevear-master-instrument.v1'
      and navigation_accepted
      and instrument_kpis_accepted
      and semantic_statuses_accepted
      and authority_boundary_preserved
      and independently_observed
    )
  )
);

create table if not exists app.master_build391_responsive_parity_regressions (
  observation_id uuid primary key,
  shell_id text not null check (shell_id in ('yw','icamp')),
  desktop_accepted boolean not null,
  tablet_accepted boolean not null,
  mobile_accepted boolean not null,
  regression_state text not null check (
    regression_state in ('NO_REGRESSION','REGRESSION_DETECTED','HOLD')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    regression_state <> 'NO_REGRESSION'
    or (desktop_accepted and tablet_accepted and mobile_accepted)
  )
);

create table if not exists app.master_build391_visual_governance_closure_audits (
  audit_id uuid primary key,
  ai_data_platform_acknowledged boolean not null,
  comms_hub_acknowledged boolean not null,
  ai_hub_acknowledged boolean not null,
  owner_accepted boolean not null,
  independently_verified boolean not null,
  drift_clear boolean not null,
  responsive_parity_clear boolean not null,
  closure_state text not null check (
    closure_state in ('CLOSED_VERIFIED','HOLD','REJECTED')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    closure_state <> 'CLOSED_VERIFIED'
    or (
      ai_data_platform_acknowledged
      and comms_hub_acknowledged
      and ai_hub_acknowledged
      and owner_accepted
      and independently_verified
      and drift_clear
      and responsive_parity_clear
    )
  )
);

create index if not exists master_build391_theme_drift_recent_idx
  on app.master_build391_theme_drift_observations(recorded_at desc);
create index if not exists master_build391_responsive_regression_recent_idx
  on app.master_build391_responsive_parity_regressions(recorded_at desc);
create index if not exists master_build391_visual_closure_recent_idx
  on app.master_build391_visual_governance_closure_audits(recorded_at desc);

alter table app.master_build391_theme_drift_observations enable row level security;
alter table app.master_build391_theme_drift_observations force row level security;
alter table app.master_build391_responsive_parity_regressions enable row level security;
alter table app.master_build391_responsive_parity_regressions force row level security;
alter table app.master_build391_visual_governance_closure_audits enable row level security;
alter table app.master_build391_visual_governance_closure_audits force row level security;

create policy master_build391_theme_runtime_select
  on app.master_build391_theme_drift_observations
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_build391_responsive_runtime_select
  on app.master_build391_responsive_parity_regressions
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_build391_closure_runtime_select
  on app.master_build391_visual_governance_closure_audits
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_build391_theme_protected_insert
  on app.master_build391_theme_drift_observations
  for insert to ai_data_protected_runtime with check (true);
create policy master_build391_responsive_protected_insert
  on app.master_build391_responsive_parity_regressions
  for insert to ai_data_protected_runtime with check (true);
create policy master_build391_closure_protected_insert
  on app.master_build391_visual_governance_closure_audits
  for insert to ai_data_protected_runtime
  with check (
    closure_state <> 'CLOSED_VERIFIED'
    or (
      ai_data_platform_acknowledged
      and comms_hub_acknowledged
      and ai_hub_acknowledged
      and owner_accepted
      and independently_verified
      and drift_clear
      and responsive_parity_clear
    )
  );

create policy master_build391_theme_protected_select
  on app.master_build391_theme_drift_observations
  for select to ai_data_protected_runtime using (true);
create policy master_build391_responsive_protected_select
  on app.master_build391_responsive_parity_regressions
  for select to ai_data_protected_runtime using (true);
create policy master_build391_closure_protected_select
  on app.master_build391_visual_governance_closure_audits
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build391_theme_drift_observations,
  app.master_build391_responsive_parity_regressions,
  app.master_build391_visual_governance_closure_audits
to ai_data_runtime;

grant select,insert on
  app.master_build391_theme_drift_observations,
  app.master_build391_responsive_parity_regressions,
  app.master_build391_visual_governance_closure_audits
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build391_theme_drift_observations,
  app.master_build391_responsive_parity_regressions,
  app.master_build391_visual_governance_closure_audits
from ai_data_runtime;

revoke update,delete on
  app.master_build391_theme_drift_observations,
  app.master_build391_responsive_parity_regressions,
  app.master_build391_visual_governance_closure_audits
from ai_data_protected_runtime;
