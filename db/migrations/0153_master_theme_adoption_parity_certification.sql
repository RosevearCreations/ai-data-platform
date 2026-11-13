-- Build 390 — Cross-Shell Theme Adoption Receipts,
-- Master Navigation Acceptance & YW/iCamp Visual-Parity Certification.

create table if not exists app.master_build390_theme_adoption_receipts (
  receipt_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  theme_version text not null,
  navigation_accepted boolean not null,
  instrument_kpis_accepted boolean not null,
  semantic_statuses_accepted boolean not null,
  desktop_accepted boolean not null,
  tablet_accepted boolean not null,
  mobile_accepted boolean not null,
  authority_boundary_preserved boolean not null,
  independently_verified boolean not null,
  acceptance_state text not null check (
    acceptance_state in ('ACCEPTED','HOLD','REJECTED')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    acceptance_state <> 'ACCEPTED'
    or (
      theme_version='rosevear-master-instrument.v1'
      and navigation_accepted
      and instrument_kpis_accepted
      and semantic_statuses_accepted
      and desktop_accepted
      and tablet_accepted
      and mobile_accepted
      and authority_boundary_preserved
      and independently_verified
    )
  )
);

create table if not exists app.master_build390_navigation_acceptance_audits (
  audit_id uuid primary key,
  module_id text not null check (
    module_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub')
  ),
  master_suite_visible boolean not null,
  module_navigation_visible boolean not null,
  active_state_visible boolean not null,
  responsive_navigation_verified boolean not null,
  authority_boundary_preserved boolean not null,
  acceptance_state text not null check (
    acceptance_state in ('ACCEPTED','HOLD','REJECTED')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    acceptance_state <> 'ACCEPTED'
    or (
      master_suite_visible
      and module_navigation_visible
      and active_state_visible
      and responsive_navigation_verified
      and authority_boundary_preserved
    )
  )
);

create table if not exists app.master_build390_yw_icamp_visual_parity_certifications (
  certification_id uuid primary key,
  yw_theme_version text not null,
  icamp_theme_version text not null,
  navigation_parity boolean not null,
  kpi_parity boolean not null,
  semantic_status_parity boolean not null,
  desktop_parity boolean not null,
  tablet_parity boolean not null,
  mobile_parity boolean not null,
  tenant_boundary_preserved boolean not null,
  independently_verified boolean not null,
  certification_state text not null check (
    certification_state in ('CERTIFIED','HOLD','REJECTED')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    certification_state <> 'CERTIFIED'
    or (
      yw_theme_version='rosevear-master-instrument.v1'
      and icamp_theme_version='rosevear-master-instrument.v1'
      and navigation_parity
      and kpi_parity
      and semantic_status_parity
      and desktop_parity
      and tablet_parity
      and mobile_parity
      and tenant_boundary_preserved
      and independently_verified
    )
  )
);

create index if not exists master_build390_theme_receipts_recent_idx
  on app.master_build390_theme_adoption_receipts(recorded_at desc);
create index if not exists master_build390_navigation_recent_idx
  on app.master_build390_navigation_acceptance_audits(recorded_at desc);
create index if not exists master_build390_parity_recent_idx
  on app.master_build390_yw_icamp_visual_parity_certifications(recorded_at desc);

alter table app.master_build390_theme_adoption_receipts enable row level security;
alter table app.master_build390_theme_adoption_receipts force row level security;
alter table app.master_build390_navigation_acceptance_audits enable row level security;
alter table app.master_build390_navigation_acceptance_audits force row level security;
alter table app.master_build390_yw_icamp_visual_parity_certifications enable row level security;
alter table app.master_build390_yw_icamp_visual_parity_certifications force row level security;

create policy master_build390_theme_runtime_select
  on app.master_build390_theme_adoption_receipts
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_build390_navigation_runtime_select
  on app.master_build390_navigation_acceptance_audits
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_build390_parity_runtime_select
  on app.master_build390_yw_icamp_visual_parity_certifications
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_build390_theme_protected_insert
  on app.master_build390_theme_adoption_receipts
  for insert to ai_data_protected_runtime with check (true);
create policy master_build390_navigation_protected_insert
  on app.master_build390_navigation_acceptance_audits
  for insert to ai_data_protected_runtime with check (true);
create policy master_build390_parity_protected_insert
  on app.master_build390_yw_icamp_visual_parity_certifications
  for insert to ai_data_protected_runtime with check (true);

create policy master_build390_theme_protected_select
  on app.master_build390_theme_adoption_receipts
  for select to ai_data_protected_runtime using (true);
create policy master_build390_navigation_protected_select
  on app.master_build390_navigation_acceptance_audits
  for select to ai_data_protected_runtime using (true);
create policy master_build390_parity_protected_select
  on app.master_build390_yw_icamp_visual_parity_certifications
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build390_theme_adoption_receipts,
  app.master_build390_navigation_acceptance_audits,
  app.master_build390_yw_icamp_visual_parity_certifications
to ai_data_runtime;

grant select,insert on
  app.master_build390_theme_adoption_receipts,
  app.master_build390_navigation_acceptance_audits,
  app.master_build390_yw_icamp_visual_parity_certifications
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build390_theme_adoption_receipts,
  app.master_build390_navigation_acceptance_audits,
  app.master_build390_yw_icamp_visual_parity_certifications
from ai_data_runtime;

revoke update,delete on
  app.master_build390_theme_adoption_receipts,
  app.master_build390_navigation_acceptance_audits,
  app.master_build390_yw_icamp_visual_parity_certifications
from ai_data_protected_runtime;
