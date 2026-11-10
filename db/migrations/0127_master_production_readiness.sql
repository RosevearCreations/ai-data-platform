-- Build 349 — Master Shell Production Readiness, Recovery, Owner Acceptance & Rollback
-- Append-only source-scoped production readiness and explicit owner decision evidence.

create table if not exists app.master_production_readiness_runs (
  run_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null
    check (
      source_id in (
        'yw','icamp','rosiedazzlers','devilndove',
        'ai-data-platform','rosevear-ai-hub'
      )
    ),
  readiness_version bigint not null check (readiness_version > 0),
  reviewer text not null check (char_length(reviewer) between 1 and 160),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  branch text not null
    check (branch ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$'),
  commit_sha text not null
    check (commit_sha ~ '^[a-f0-9]{7,64}$'),
  notes text
    check (notes is null or char_length(notes) between 1 and 1200),
  owner_decision text not null
    check (owner_decision in ('not-reviewed','accepted','rejected','held')),
  owner_decision_evidence_uri text
    check (
      owner_decision_evidence_uri is null or
      owner_decision_evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
    ),
  owner_decision_detail text
    check (
      owner_decision_detail is null or
      char_length(owner_decision_detail) between 1 and 1200
    ),
  owner_decided_at timestamptz,
  recorded_at timestamptz not null default now(),
  check (expires_at > observed_at),
  check (
    (
      owner_decision='not-reviewed'
      and owner_decision_evidence_uri is null
      and owner_decision_detail is null
      and owner_decided_at is null
    )
    or
    (
      owner_decision in ('accepted','rejected','held')
      and owner_decision_evidence_uri is not null
      and owner_decision_detail is not null
      and owner_decided_at is not null
    )
  )
);

create unique index if not exists master_production_readiness_version_uidx
  on app.master_production_readiness_runs(source_id,readiness_version);

create index if not exists master_production_readiness_expiry_idx
  on app.master_production_readiness_runs(expires_at);

create table if not exists app.master_production_readiness_assertions (
  assertion_id uuid primary key,
  run_id uuid not null
    references app.master_production_readiness_runs(run_id)
    on delete restrict,
  dimension text not null
    check (
      dimension in (
        'source-onboarding',
        'operational-recovery',
        'accessibility',
        'production-safeguards',
        'rollback'
      )
    ),
  outcome text not null check (outcome in ('pass','fail','blocked')),
  evidence_uri text not null
    check (
      evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
    ),
  detail text not null check (char_length(detail) between 1 and 1200),
  recorded_at timestamptz not null default now(),
  unique (run_id,dimension)
);

alter table app.master_production_readiness_runs
  enable row level security;
alter table app.master_production_readiness_runs
  force row level security;
alter table app.master_production_readiness_assertions
  enable row level security;
alter table app.master_production_readiness_assertions
  force row level security;

drop policy if exists master_production_readiness_runs_admin_select
  on app.master_production_readiness_runs;
create policy master_production_readiness_runs_admin_select
on app.master_production_readiness_runs
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_production_readiness_runs_admin_insert
  on app.master_production_readiness_runs;
create policy master_production_readiness_runs_admin_insert
on app.master_production_readiness_runs
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_production_readiness_assertions_admin_select
  on app.master_production_readiness_assertions;
create policy master_production_readiness_assertions_admin_select
on app.master_production_readiness_assertions
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_production_readiness_assertions_admin_insert
  on app.master_production_readiness_assertions;
create policy master_production_readiness_assertions_admin_insert
on app.master_production_readiness_assertions
for insert to ai_data_runtime
with check (
  exists (
    select 1
    from app.master_production_readiness_runs r
    where r.run_id=master_production_readiness_assertions.run_id
      and r.actor_user_id=nullif(current_setting('app.user_id',true),'')
  )
);

revoke all on app.master_production_readiness_runs from public;
revoke all on app.master_production_readiness_assertions from public;
revoke all on app.master_production_readiness_runs from ai_data_runtime;
revoke all on app.master_production_readiness_assertions from ai_data_runtime;

grant select,insert on
  app.master_production_readiness_runs,
  app.master_production_readiness_assertions
to ai_data_runtime;

revoke update,delete on
  app.master_production_readiness_runs,
  app.master_production_readiness_assertions
from ai_data_runtime;
