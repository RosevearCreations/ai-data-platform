-- Build 347 — Master Security, Authorization, Consent & Evidence Certification
-- Append-only source-scoped security certification evidence for the six
-- Master Shell source identities.

create table if not exists app.master_security_certification_runs (
  run_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null
    check (
      source_id in (
        'yw','icamp','rosiedazzlers','devilndove',
        'ai-data-platform','rosevear-ai-hub'
      )
    ),
  certification_version bigint not null
    check (certification_version > 0),
  overall_outcome text not null
    check (overall_outcome in ('passed','failed','blocked')),
  reviewer text not null
    check (char_length(reviewer) between 1 and 160),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  branch text not null
    check (branch ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$'),
  commit_sha text not null
    check (commit_sha ~ '^[a-f0-9]{7,64}$'),
  notes text
    check (notes is null or char_length(notes) between 1 and 1200),
  recorded_at timestamptz not null default now(),
  check (expires_at > observed_at)
);

create unique index if not exists master_security_certification_version_uidx
  on app.master_security_certification_runs(source_id, certification_version);

create index if not exists master_security_certification_expiry_idx
  on app.master_security_certification_runs(expires_at);

create table if not exists app.master_security_certification_assertions (
  assertion_id uuid primary key,
  run_id uuid not null
    references app.master_security_certification_runs(run_id)
    on delete restrict,
  dimension text not null
    check (
      dimension in (
        'source-signing-trust',
        'role-authorization',
        'consent',
        'sensitive-data-handling',
        'audit-evidence',
        'fail-closed-controls'
      )
    ),
  outcome text not null
    check (outcome in ('pass','fail','blocked')),
  evidence_uri text not null
    check (
      evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
    ),
  detail text not null
    check (char_length(detail) between 1 and 1200),
  recorded_at timestamptz not null default now(),
  unique (run_id, dimension)
);

alter table app.master_security_certification_runs
  enable row level security;
alter table app.master_security_certification_runs
  force row level security;
alter table app.master_security_certification_assertions
  enable row level security;
alter table app.master_security_certification_assertions
  force row level security;

drop policy if exists master_security_certification_runs_admin_select
  on app.master_security_certification_runs;
create policy master_security_certification_runs_admin_select
on app.master_security_certification_runs
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_security_certification_runs_admin_insert
  on app.master_security_certification_runs;
create policy master_security_certification_runs_admin_insert
on app.master_security_certification_runs
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

drop policy if exists master_security_certification_assertions_admin_select
  on app.master_security_certification_assertions;
create policy master_security_certification_assertions_admin_select
on app.master_security_certification_assertions
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_security_certification_assertions_admin_insert
  on app.master_security_certification_assertions;
create policy master_security_certification_assertions_admin_insert
on app.master_security_certification_assertions
for insert to ai_data_runtime
with check (
  exists (
    select 1
    from app.master_security_certification_runs r
    where r.run_id=master_security_certification_assertions.run_id
      and r.actor_user_id=nullif(current_setting('app.user_id',true),'')
  )
);

revoke all on app.master_security_certification_runs from public;
revoke all on app.master_security_certification_assertions from public;
revoke all on app.master_security_certification_runs from ai_data_runtime;
revoke all on app.master_security_certification_assertions from ai_data_runtime;

grant select, insert on
  app.master_security_certification_runs,
  app.master_security_certification_assertions
to ai_data_runtime;

revoke update, delete on
  app.master_security_certification_runs,
  app.master_security_certification_assertions
from ai_data_runtime;
