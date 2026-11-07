-- Build 304 — Six-App End-to-End Integration Certification Suite
-- Durable operator-owned certification snapshots. The suite records evidence outcomes only.
-- It does not activate connections, release held actions, replay events or execute peer writes.

create table if not exists app.integration_certification_runs (
  run_id uuid primary key,
  suite_version text not null default '304.1'
    check (suite_version='304.1'),
  applications_expected integer not null default 6
    check (applications_expected=6),
  checks_expected integer not null default 30
    check (checks_expected=30),
  evidence_window_days integer not null default 30
    check (evidence_window_days between 1 and 90),
  passed_count integer not null check (passed_count between 0 and 30),
  failed_count integer not null check (failed_count between 0 and 30),
  blocked_count integer not null check (blocked_count between 0 and 30),
  overall_outcome text not null
    check (overall_outcome in ('passed','failed','blocked')),
  generated_by text not null references auth."user"(id) on delete restrict,
  generated_at timestamptz not null default now(),
  check (passed_count+failed_count+blocked_count=checks_expected),
  check (
    (overall_outcome='passed' and passed_count=checks_expected and failed_count=0 and blocked_count=0)
    or (overall_outcome='failed' and failed_count>0)
    or (overall_outcome='blocked' and failed_count=0 and blocked_count>0)
  )
);

create table if not exists app.integration_certification_assertions (
  assertion_id uuid primary key,
  run_id uuid not null references app.integration_certification_runs(run_id) on delete restrict,
  application_id text not null
    check (application_id in (
      'devilndove',
      'rosiedazzlers',
      'yard-workers',
      'icamp',
      'rosevear-comms-hub',
      'rosevear-ai-hub'
    )),
  dimension text not null
    check (dimension in (
      'authentication',
      'approved-exchange',
      'event-handling',
      'failure-recovery',
      'tenant-isolation'
    )),
  outcome text not null
    check (outcome in ('pass','fail','blocked')),
  evidence_code text not null
    check (evidence_code ~ '^[a-z0-9][a-z0-9._-]{2,119}$'),
  evidence_refs jsonb not null default '[]'::jsonb
    check (
      jsonb_typeof(evidence_refs)='array'
      and jsonb_array_length(evidence_refs)<=20
      and octet_length(evidence_refs::text)<=8192
    ),
  detail text not null
    check (char_length(detail) between 3 and 700 and detail !~ '[[:cntrl:]]'),
  generated_by text not null references auth."user"(id) on delete restrict,
  checked_at timestamptz not null default now(),
  unique (run_id,application_id,dimension)
);

create index if not exists integration_certification_runs_user_recent_idx
  on app.integration_certification_runs(generated_by,generated_at desc);

create index if not exists integration_certification_assertions_run_idx
  on app.integration_certification_assertions(run_id,application_id,dimension);

alter table app.integration_certification_runs enable row level security;
alter table app.integration_certification_assertions enable row level security;

drop policy if exists integration_certification_runs_owner_select
  on app.integration_certification_runs;
create policy integration_certification_runs_owner_select
on app.integration_certification_runs
for select to ai_data_runtime
using (
  generated_by=nullif(current_setting('app.user_id',true),'')
);

drop policy if exists integration_certification_runs_owner_insert
  on app.integration_certification_runs;
create policy integration_certification_runs_owner_insert
on app.integration_certification_runs
for insert to ai_data_runtime
with check (
  generated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists integration_certification_assertions_owner_select
  on app.integration_certification_assertions;
create policy integration_certification_assertions_owner_select
on app.integration_certification_assertions
for select to ai_data_runtime
using (
  generated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.integration_certification_runs r
    where r.run_id=integration_certification_assertions.run_id
      and r.generated_by=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists integration_certification_assertions_owner_insert
  on app.integration_certification_assertions;
create policy integration_certification_assertions_owner_insert
on app.integration_certification_assertions
for insert to ai_data_runtime
with check (
  generated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.integration_certification_runs r
    where r.run_id=integration_certification_assertions.run_id
      and r.generated_by=nullif(current_setting('app.user_id',true),'')
  )
);

revoke update, delete on
  app.integration_certification_runs,
  app.integration_certification_assertions
from ai_data_runtime;

grant select, insert on
  app.integration_certification_runs,
  app.integration_certification_assertions
to ai_data_runtime;
