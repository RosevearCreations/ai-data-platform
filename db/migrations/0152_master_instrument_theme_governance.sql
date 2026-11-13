-- Build 388 — Unified Master Instrument Navigation,
-- Master Module Fusion Layout & Cross-Shell Theme Governance.

create table if not exists app.master_build388_theme_governance_audits (
  audit_id uuid primary key,
  shell_id text not null,
  theme_version text not null,
  persistent_navigation boolean not null,
  module_rail boolean not null,
  instrument_kpis boolean not null,
  responsive_desktop boolean not null,
  responsive_tablet boolean not null,
  responsive_mobile boolean not null,
  semantic_status_colors boolean not null,
  authority_boundaries_preserved boolean not null,
  governance_state text not null check (
    governance_state in ('COMPLIANT','HOLD','REJECTED')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    governance_state <> 'COMPLIANT'
    or (
      theme_version='rosevear-master-instrument.v1'
      and persistent_navigation
      and module_rail
      and instrument_kpis
      and responsive_desktop
      and responsive_tablet
      and responsive_mobile
      and semantic_status_colors
      and authority_boundaries_preserved
    )
  )
);

create table if not exists app.master_build388_module_fusion_audits (
  audit_id uuid primary key,
  module_id text not null check (
    module_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub')
  ),
  navigation_visible boolean not null,
  authority_boundary_preserved boolean not null,
  source_identity_preserved boolean not null,
  fusion_state text not null check (
    fusion_state in ('VISIBLE','HOLD','REJECTED')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    fusion_state <> 'VISIBLE'
    or (navigation_visible and authority_boundary_preserved and source_identity_preserved)
  )
);

create index if not exists master_build388_theme_governance_recent_idx
  on app.master_build388_theme_governance_audits(recorded_at desc);
create index if not exists master_build388_module_fusion_recent_idx
  on app.master_build388_module_fusion_audits(recorded_at desc);

alter table app.master_build388_theme_governance_audits enable row level security;
alter table app.master_build388_theme_governance_audits force row level security;
alter table app.master_build388_module_fusion_audits enable row level security;
alter table app.master_build388_module_fusion_audits force row level security;

create policy master_build388_theme_runtime_select
  on app.master_build388_theme_governance_audits
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_build388_fusion_runtime_select
  on app.master_build388_module_fusion_audits
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_build388_theme_protected_insert
  on app.master_build388_theme_governance_audits
  for insert to ai_data_protected_runtime
  with check (
    governance_state <> 'COMPLIANT'
    or (
      theme_version='rosevear-master-instrument.v1'
      and persistent_navigation
      and module_rail
      and instrument_kpis
      and responsive_desktop
      and responsive_tablet
      and responsive_mobile
      and semantic_status_colors
      and authority_boundaries_preserved
    )
  );

create policy master_build388_fusion_protected_insert
  on app.master_build388_module_fusion_audits
  for insert to ai_data_protected_runtime
  with check (
    fusion_state <> 'VISIBLE'
    or (navigation_visible and authority_boundary_preserved and source_identity_preserved)
  );

create policy master_build388_theme_protected_select
  on app.master_build388_theme_governance_audits
  for select to ai_data_protected_runtime using (true);

create policy master_build388_fusion_protected_select
  on app.master_build388_module_fusion_audits
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build388_theme_governance_audits,
  app.master_build388_module_fusion_audits
to ai_data_runtime;

grant select,insert on
  app.master_build388_theme_governance_audits,
  app.master_build388_module_fusion_audits
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build388_theme_governance_audits,
  app.master_build388_module_fusion_audits
from ai_data_runtime;

revoke update,delete on
  app.master_build388_theme_governance_audits,
  app.master_build388_module_fusion_audits
from ai_data_protected_runtime;
