-- Build 328 — Module Versioning, Safe Upgrade, Rollback & Migration Orchestration
-- Lifecycle evidence is explicit and owner-scoped. Planning never executes an upgrade.

create table if not exists app.module_host_instances (
  module_host_instance_id uuid primary key,
  enrollment_id uuid not null unique
    references app.module_host_enrollments(enrollment_id) on delete restrict,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  host_application_id text not null
    check (char_length(host_application_id) between 3 and 120),
  host_instance_id text not null
    check (char_length(host_instance_id) between 3 and 160),
  environment text not null
    check (environment in ('development','test','staging','production')),
  current_version text not null
    check (current_version ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$'),
  last_known_good_version text not null
    check (last_known_good_version ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$'),
  lifecycle_state text not null default 'installed'
    check (lifecycle_state in (
      'installed',
      'upgrade-planned',
      'upgrade-held',
      'canary',
      'rollback-ready'
    )),
  installation_evidence text not null
    check (char_length(installation_evidence) between 8 and 1000),
  observed_at timestamptz not null,
  revision integer not null default 1
    check (revision between 1 and 1000000),
  created_by text not null references auth."user"(id) on delete restrict,
  updated_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.module_upgrade_runs (
  run_id uuid primary key,
  module_host_instance_id uuid not null
    references app.module_host_instances(module_host_instance_id) on delete restrict,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  from_version text not null,
  target_version text not null,
  last_known_good_version text not null,
  canary boolean not null default false,
  breaking_boundary boolean not null default false,
  compatibility_state text not null
    check (compatibility_state in ('pass','held')),
  prerequisite_snapshot jsonb not null
    check (
      jsonb_typeof(prerequisite_snapshot)='object'
      and octet_length(prerequisite_snapshot::text)<=16384
    ),
  migration_plan jsonb not null
    check (
      jsonb_typeof(migration_plan)='array'
      and octet_length(migration_plan::text)<=32768
    ),
  migration_plan_sha256 text not null
    check (migration_plan_sha256 ~ '^[a-f0-9]{64}$'),
  rollback_snapshot jsonb not null
    check (
      jsonb_typeof(rollback_snapshot)='object'
      and octet_length(rollback_snapshot::text)<=16384
    ),
  plan_snapshot jsonb not null
    check (
      jsonb_typeof(plan_snapshot)='object'
      and octet_length(plan_snapshot::text)<=65536
    ),
  state text not null
    check (state in (
      'held',
      'ready-for-owner-approval',
      'approved',
      'rejected',
      'applied',
      'failed',
      'rollback-prepared',
      'rolled-back'
    )),
  owner_policy_allows_breaking boolean not null default false,
  owner_decision_by text references auth."user"(id) on delete restrict,
  owner_decision_at timestamptz,
  owner_decision_reason text
    check (
      owner_decision_reason is null
      or char_length(owner_decision_reason) between 3 and 500
    ),
  outcome_evidence jsonb
    check (
      outcome_evidence is null
      or (
        jsonb_typeof(outcome_evidence)='object'
        and octet_length(outcome_evidence::text)<=32768
      )
    ),
  applied_at timestamptz,
  completed_at timestamptz,
  revision integer not null default 1
    check (revision between 1 and 1000000),
  created_by text not null references auth."user"(id) on delete restrict,
  updated_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_version <> target_version),
  check (
    state not in ('approved','rejected','applied','failed','rollback-prepared','rolled-back')
    or (owner_decision_by is not null and owner_decision_at is not null)
  )
);

create table if not exists app.module_upgrade_events (
  event_id uuid primary key,
  run_id uuid not null
    references app.module_upgrade_runs(run_id) on delete restrict,
  module_host_instance_id uuid not null
    references app.module_host_instances(module_host_instance_id) on delete restrict,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  revision integer not null check (revision between 1 and 1000000),
  event_type text not null
    check (event_type in (
      'upgrade-plan-held',
      'upgrade-plan-ready',
      'owner-approved',
      'owner-rejected',
      'upgrade-applied',
      'upgrade-failed',
      'rollback-prepared',
      'rollback-completed',
      'stable-version-confirmed'
    )),
  details jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(details)='object'
      and octet_length(details::text)<=32768
    ),
  actor_user_id text not null references auth."user"(id) on delete restrict,
  occurred_at timestamptz not null default now()
);

create index if not exists module_host_instances_owner_recent_idx
  on app.module_host_instances(owner_user_id,updated_at desc);

create index if not exists module_host_instances_workspace_idx
  on app.module_host_instances(workspace_id,host_application_id,environment);

create index if not exists module_upgrade_runs_instance_recent_idx
  on app.module_upgrade_runs(module_host_instance_id,created_at desc);

create index if not exists module_upgrade_runs_workspace_state_idx
  on app.module_upgrade_runs(workspace_id,state,updated_at desc);

create index if not exists module_upgrade_events_run_recent_idx
  on app.module_upgrade_events(run_id,occurred_at desc);

alter table app.module_host_instances enable row level security;
alter table app.module_upgrade_runs enable row level security;
alter table app.module_upgrade_events enable row level security;

drop policy if exists module_host_instances_owner_admin_all
  on app.module_host_instances;
create policy module_host_instances_owner_admin_all
on app.module_host_instances
for all to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=module_host_instances.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and created_by=owner_user_id
  and updated_by=owner_user_id
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=module_host_instances.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists module_upgrade_runs_owner_admin_all
  on app.module_upgrade_runs;
create policy module_upgrade_runs_owner_admin_all
on app.module_upgrade_runs
for all to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=module_upgrade_runs.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and created_by=owner_user_id
  and updated_by=owner_user_id
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=module_upgrade_runs.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists module_upgrade_events_owner_admin_select
  on app.module_upgrade_events;
create policy module_upgrade_events_owner_admin_select
on app.module_upgrade_events
for select to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=module_upgrade_events.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists module_upgrade_events_owner_admin_insert
  on app.module_upgrade_events;
create policy module_upgrade_events_owner_admin_insert
on app.module_upgrade_events
for insert to ai_data_runtime
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and actor_user_id=owner_user_id
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=module_upgrade_events.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

revoke all on
  app.module_host_instances,
  app.module_upgrade_runs,
  app.module_upgrade_events
from public;

grant select, insert, update on
  app.module_host_instances,
  app.module_upgrade_runs
to ai_data_runtime;

grant select, insert on
  app.module_upgrade_events
to ai_data_runtime;

revoke update, delete on app.module_upgrade_events from ai_data_runtime;
