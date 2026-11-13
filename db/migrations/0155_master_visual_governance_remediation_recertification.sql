-- Build 392 — Visual-Governance Exception Routing,
-- Remediation SLA Tracking & Cross-Shell Re-Certification Audit.

create table if not exists app.master_build392_visual_governance_exceptions (
  exception_id uuid primary key,
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  source_kind text not null check (
    source_kind in ('THEME_DRIFT','RESPONSIVE_PARITY_REGRESSION')
  ),
  severity text not null check (severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  detected_at timestamptz not null,
  due_at timestamptz not null,
  owner_assigned boolean not null,
  routing_state text not null check (routing_state in ('ROUTED','HOLD')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  recorded_at timestamptz not null default now(),
  check (routing_state <> 'ROUTED' or (owner_assigned and due_at > detected_at))
);

create table if not exists app.master_build392_remediation_sla_events (
  event_id uuid primary key,
  exception_id uuid not null references app.master_build392_visual_governance_exceptions(exception_id),
  event_type text not null check (
    event_type in ('ROUTED','ACKNOWLEDGED','WORK_STARTED','SLA_BREACH','RESOLVED')
  ),
  owner_acknowledged boolean not null,
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create table if not exists app.master_build392_recertification_audits (
  audit_id uuid primary key,
  exception_id uuid not null references app.master_build392_visual_governance_exceptions(exception_id),
  shell_id text not null check (
    shell_id in ('ai-data-platform','rosevear-comms-hub','rosevear-ai-hub','yw','icamp')
  ),
  theme_version text not null,
  theme_contract_restored boolean not null,
  responsive_parity_restored boolean not null,
  owner_accepted boolean not null,
  independently_verified boolean not null,
  recertification_state text not null check (
    recertification_state in ('RECERTIFIED','HOLD','REJECTED')
  ),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (
    recertification_state <> 'RECERTIFIED'
    or (
      theme_version='rosevear-master-instrument.v1'
      and theme_contract_restored
      and responsive_parity_restored
      and owner_accepted
      and independently_verified
    )
  )
);

create index if not exists master_b392_visual_exception_recent_idx
  on app.master_build392_visual_governance_exceptions(recorded_at desc);
create index if not exists master_b392_remediation_sla_recent_idx
  on app.master_build392_remediation_sla_events(recorded_at desc);
create index if not exists master_b392_recertification_recent_idx
  on app.master_build392_recertification_audits(recorded_at desc);

alter table app.master_build392_visual_governance_exceptions enable row level security;
alter table app.master_build392_visual_governance_exceptions force row level security;
alter table app.master_build392_remediation_sla_events enable row level security;
alter table app.master_build392_remediation_sla_events force row level security;
alter table app.master_build392_recertification_audits enable row level security;
alter table app.master_build392_recertification_audits force row level security;

create policy master_b392_exception_runtime_select
  on app.master_build392_visual_governance_exceptions
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b392_sla_runtime_select
  on app.master_build392_remediation_sla_events
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));
create policy master_b392_recert_runtime_select
  on app.master_build392_recertification_audits
  for select to ai_data_runtime
  using (exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  ));

create policy master_b392_exception_protected_insert
  on app.master_build392_visual_governance_exceptions
  for insert to ai_data_protected_runtime with check (true);
create policy master_b392_sla_protected_insert
  on app.master_build392_remediation_sla_events
  for insert to ai_data_protected_runtime with check (true);
create policy master_b392_recert_protected_insert
  on app.master_build392_recertification_audits
  for insert to ai_data_protected_runtime
  with check (
    recertification_state <> 'RECERTIFIED'
    or (
      theme_version='rosevear-master-instrument.v1'
      and theme_contract_restored
      and responsive_parity_restored
      and owner_accepted
      and independently_verified
    )
  );

create policy master_b392_exception_protected_select
  on app.master_build392_visual_governance_exceptions
  for select to ai_data_protected_runtime using (true);
create policy master_b392_sla_protected_select
  on app.master_build392_remediation_sla_events
  for select to ai_data_protected_runtime using (true);
create policy master_b392_recert_protected_select
  on app.master_build392_recertification_audits
  for select to ai_data_protected_runtime using (true);

grant select on
  app.master_build392_visual_governance_exceptions,
  app.master_build392_remediation_sla_events,
  app.master_build392_recertification_audits
to ai_data_runtime;

grant select,insert on
  app.master_build392_visual_governance_exceptions,
  app.master_build392_remediation_sla_events,
  app.master_build392_recertification_audits
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build392_visual_governance_exceptions,
  app.master_build392_remediation_sla_events,
  app.master_build392_recertification_audits
from ai_data_runtime;

revoke update,delete on
  app.master_build392_visual_governance_exceptions,
  app.master_build392_remediation_sla_events,
  app.master_build392_recertification_audits
from ai_data_protected_runtime;
