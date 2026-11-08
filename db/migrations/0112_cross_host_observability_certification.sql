-- Build 329 — Cross-Host Observability, Compatibility Matrix & Universal Certification Suite
-- Evidence is owner-scoped and append-only. Synthetic fixtures can prove harness behavior,
-- but they can never mark a host live-certified.

create table if not exists app.module_host_observations (
  observation_id uuid primary key,
  module_host_instance_id uuid not null
    references app.module_host_instances(module_host_instance_id) on delete restrict,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  evidence_kind text not null
    check (evidence_kind in ('synthetic-fixture','live-evidence')),
  observed_module_version text not null
    check (
      observed_module_version ~
      '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$'
    ),
  host_contract_version integer not null
    check (host_contract_version between 1 and 1000),
  protocol_version integer not null
    check (protocol_version between 1 and 1000),
  adapter_kind text not null
    check (adapter_kind in ('react','nextjs','vite','vanilla','electron')),
  compatibility_evidence_refs jsonb not null default '[]'::jsonb
    check (
      jsonb_typeof(compatibility_evidence_refs)='array'
      and jsonb_array_length(compatibility_evidence_refs)<=20
      and octet_length(compatibility_evidence_refs::text)<=8192
    ),
  checks_snapshot jsonb not null
    check (
      jsonb_typeof(checks_snapshot)='object'
      and octet_length(checks_snapshot::text)<=32768
    ),
  telemetry_snapshot jsonb not null
    check (
      jsonb_typeof(telemetry_snapshot)='object'
      and octet_length(telemetry_snapshot::text)<=8192
    ),
  observed_at timestamptz not null,
  recorded_by text not null references auth."user"(id) on delete restrict,
  recorded_at timestamptz not null default now()
);

create table if not exists app.module_host_certification_runs (
  run_id uuid primary key,
  observation_id uuid not null unique
    references app.module_host_observations(observation_id) on delete restrict,
  module_host_instance_id uuid not null
    references app.module_host_instances(module_host_instance_id) on delete restrict,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  suite_version text not null default '1.0.0'
    check (suite_version='1.0.0'),
  evidence_kind text not null
    check (evidence_kind in ('synthetic-fixture','live-evidence')),
  compatibility_state text not null
    check (compatibility_state in ('pass','fail','blocked')),
  health_state text not null
    check (health_state in ('healthy','degraded','unhealthy','unknown')),
  passed_count integer not null check (passed_count between 0 and 10),
  failed_count integer not null check (failed_count between 0 and 10),
  blocked_count integer not null check (blocked_count between 0 and 10),
  overall_outcome text not null
    check (overall_outcome in ('passed','failed','blocked')),
  certification_class text not null
    check (certification_class in (
      'live-certified',
      'fixture-certified',
      'not-certified'
    )),
  live_certified boolean not null default false,
  fixture_certified boolean not null default false,
  regression_count integer not null default 0
    check (regression_count between 0 and 20),
  regression_snapshot jsonb not null default '[]'::jsonb
    check (
      jsonb_typeof(regression_snapshot)='array'
      and jsonb_array_length(regression_snapshot)<=20
      and octet_length(regression_snapshot::text)<=16384
    ),
  certification_snapshot jsonb not null
    check (
      jsonb_typeof(certification_snapshot)='object'
      and octet_length(certification_snapshot::text)<=65536
    ),
  generated_by text not null references auth."user"(id) on delete restrict,
  generated_at timestamptz not null default now(),
  check (passed_count+failed_count+blocked_count=10),
  check (
    (overall_outcome='passed' and passed_count=10 and failed_count=0 and blocked_count=0)
    or (overall_outcome='failed' and failed_count>0)
    or (overall_outcome='blocked' and failed_count=0 and blocked_count>0)
  ),
  check (
    not live_certified
    or (
      evidence_kind='live-evidence'
      and overall_outcome='passed'
      and certification_class='live-certified'
    )
  ),
  check (
    not fixture_certified
    or (
      evidence_kind='synthetic-fixture'
      and overall_outcome='passed'
      and certification_class='fixture-certified'
      and live_certified=false
    )
  )
);

create table if not exists app.module_host_certification_assertions (
  assertion_id uuid primary key,
  run_id uuid not null
    references app.module_host_certification_runs(run_id) on delete restrict,
  module_host_instance_id uuid not null
    references app.module_host_instances(module_host_instance_id) on delete restrict,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  dimension text not null
    check (dimension in (
      'compatibility',
      'authentication',
      'tenant',
      'capability',
      'event',
      'workflow',
      'data',
      'search',
      'recovery',
      'offline'
    )),
  outcome text not null
    check (outcome in ('pass','fail','blocked')),
  synthetic boolean not null,
  evidence_refs jsonb not null default '[]'::jsonb
    check (
      jsonb_typeof(evidence_refs)='array'
      and jsonb_array_length(evidence_refs)<=20
      and octet_length(evidence_refs::text)<=8192
    ),
  detail text not null
    check (
      char_length(detail) between 3 and 700
      and detail !~ '[[:cntrl:]]'
    ),
  generated_by text not null references auth."user"(id) on delete restrict,
  checked_at timestamptz not null default now(),
  unique (run_id,dimension)
);

create index if not exists module_host_observations_instance_recent_idx
  on app.module_host_observations(module_host_instance_id,observed_at desc);

create index if not exists module_host_certification_runs_instance_recent_idx
  on app.module_host_certification_runs(module_host_instance_id,generated_at desc);

create index if not exists module_host_certification_runs_workspace_recent_idx
  on app.module_host_certification_runs(workspace_id,generated_at desc);

create index if not exists module_host_certification_assertions_run_idx
  on app.module_host_certification_assertions(run_id,dimension);

alter table app.module_host_observations enable row level security;
alter table app.module_host_certification_runs enable row level security;
alter table app.module_host_certification_assertions enable row level security;

drop policy if exists module_host_observations_owner_admin_select
  on app.module_host_observations;
create policy module_host_observations_owner_admin_select
on app.module_host_observations
for select to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=module_host_observations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists module_host_observations_owner_admin_insert
  on app.module_host_observations;
create policy module_host_observations_owner_admin_insert
on app.module_host_observations
for insert to ai_data_runtime
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and recorded_by=owner_user_id
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=module_host_observations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists module_host_certification_runs_owner_admin_select
  on app.module_host_certification_runs;
create policy module_host_certification_runs_owner_admin_select
on app.module_host_certification_runs
for select to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=module_host_certification_runs.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists module_host_certification_runs_owner_admin_insert
  on app.module_host_certification_runs;
create policy module_host_certification_runs_owner_admin_insert
on app.module_host_certification_runs
for insert to ai_data_runtime
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and generated_by=owner_user_id
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=module_host_certification_runs.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists module_host_certification_assertions_owner_admin_select
  on app.module_host_certification_assertions;
create policy module_host_certification_assertions_owner_admin_select
on app.module_host_certification_assertions
for select to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=module_host_certification_assertions.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists module_host_certification_assertions_owner_admin_insert
  on app.module_host_certification_assertions;
create policy module_host_certification_assertions_owner_admin_insert
on app.module_host_certification_assertions
for insert to ai_data_runtime
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and generated_by=owner_user_id
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=module_host_certification_assertions.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

revoke all on
  app.module_host_observations,
  app.module_host_certification_runs,
  app.module_host_certification_assertions
from public;

grant select, insert on
  app.module_host_observations,
  app.module_host_certification_runs,
  app.module_host_certification_assertions
to ai_data_runtime;

revoke update, delete on
  app.module_host_observations,
  app.module_host_certification_runs,
  app.module_host_certification_assertions
from ai_data_runtime;
