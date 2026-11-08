-- Build 326 — Per-Host Owner Policies, Kill Switches & Autonomy Budgets
-- Exact-host policy, append-only policy history, conservative budget reservations
-- and owner-wide emergency global stop. All controls fail closed.

create table if not exists app.module_supervisor_global_controls (
  owner_user_id text primary key references auth."user"(id) on delete restrict,
  emergency_stop_engaged boolean not null default true,
  revision integer not null default 1
    check (revision between 1 and 1000000),
  reason text
    check (reason is null or char_length(reason) between 3 and 240),
  updated_by text not null references auth."user"(id) on delete restrict,
  updated_at timestamptz not null default now()
);

create table if not exists app.module_supervisor_global_control_events (
  event_id uuid primary key,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  revision integer not null check (revision between 1 and 1000000),
  action text not null check (action in (
    'created',
    'emergency-stop-engaged',
    'emergency-stop-released',
    'reason-updated'
  )),
  control_snapshot jsonb not null
    check (
      jsonb_typeof(control_snapshot)='object'
      and octet_length(control_snapshot::text)<=4096
    ),
  actor_user_id text not null references auth."user"(id) on delete restrict,
  occurred_at timestamptz not null default now()
);

create table if not exists app.module_supervisor_host_policies (
  policy_id uuid primary key,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  host_application_id text not null
    check (
      char_length(host_application_id) between 3 and 120
      and host_application_id ~ '^[a-z][a-z0-9]*([.-][a-z0-9]+)*$'
    ),
  host_instance_id text not null
    check (
      char_length(host_instance_id) between 6 and 160
      and host_instance_id ~ '^[A-Za-z0-9][A-Za-z0-9._:@/+-]*$'
    ),
  environment text not null
    check (environment in ('development','test','staging','production')),
  tenant_id text not null
    check (
      char_length(tenant_id) between 6 and 160
      and tenant_id ~ '^[A-Za-z0-9][A-Za-z0-9._:@/+-]*$'
    ),
  enabled boolean not null default false,
  kill_switch_engaged boolean not null default true,
  safe_actions text[] not null default '{}'::text[]
    check (
      cardinality(safe_actions)<=1
      and safe_actions <@ array['connector-health-retry']::text[]
    ),
  max_cycles_per_hour integer not null default 1
    check (max_cycles_per_hour between 1 and 12),
  max_safe_health_actions_per_cycle integer not null default 0
    check (max_safe_health_actions_per_cycle between 0 and 3),
  max_safe_health_actions_per_hour integer not null default 0
    check (max_safe_health_actions_per_hour between 0 and 20),
  max_safe_health_actions_per_day integer not null default 0
    check (max_safe_health_actions_per_day between 0 and 50),
  maintenance_window jsonb
    check (
      maintenance_window is null
      or (
        jsonb_typeof(maintenance_window)='object'
        and octet_length(maintenance_window::text)<=2048
      )
    ),
  policy_revision integer not null default 1
    check (policy_revision between 1 and 1000000),
  updated_by text not null references auth."user"(id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique (
    owner_user_id,
    workspace_id,
    host_application_id,
    host_instance_id,
    environment,
    tenant_id
  ),
  check (
    cardinality(safe_actions)=0
    or (
      max_safe_health_actions_per_cycle>0
      and max_safe_health_actions_per_hour>0
      and max_safe_health_actions_per_day>0
    )
  )
);

create table if not exists app.module_supervisor_host_policy_events (
  event_id uuid primary key,
  policy_id uuid not null
    references app.module_supervisor_host_policies(policy_id) on delete restrict,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  policy_revision integer not null check (policy_revision between 1 and 1000000),
  action text not null check (action in (
    'created',
    'updated',
    'enabled',
    'disabled',
    'kill-switch-engaged',
    'kill-switch-released'
  )),
  policy_snapshot jsonb not null
    check (
      jsonb_typeof(policy_snapshot)='object'
      and octet_length(policy_snapshot::text)<=8192
    ),
  actor_user_id text not null references auth."user"(id) on delete restrict,
  occurred_at timestamptz not null default now()
);

create table if not exists app.module_supervisor_budget_reservations (
  reservation_id uuid primary key,
  policy_id uuid not null
    references app.module_supervisor_host_policies(policy_id) on delete restrict,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  policy_revision integer not null check (policy_revision between 1 and 1000000),
  global_control_revision integer not null check (global_control_revision between 1 and 1000000),
  cycle_quantity integer not null default 1 check (cycle_quantity=1),
  safe_health_quantity integer not null default 0
    check (safe_health_quantity between 0 and 3),
  decision_reason text not null
    check (char_length(decision_reason) between 3 and 120),
  reserved_at timestamptz not null default now(),
  grant_expires_at timestamptz,
  check (
    grant_expires_at is null
    or grant_expires_at>reserved_at
  )
);

create index if not exists module_supervisor_global_events_owner_recent_idx
  on app.module_supervisor_global_control_events(owner_user_id,occurred_at desc);

create index if not exists module_supervisor_host_policies_owner_recent_idx
  on app.module_supervisor_host_policies(owner_user_id,updated_at desc);

create index if not exists module_supervisor_host_policies_workspace_idx
  on app.module_supervisor_host_policies(workspace_id,host_application_id,environment);

create index if not exists module_supervisor_host_policy_events_policy_recent_idx
  on app.module_supervisor_host_policy_events(policy_id,occurred_at desc);

create index if not exists module_supervisor_budget_reservations_policy_recent_idx
  on app.module_supervisor_budget_reservations(policy_id,reserved_at desc);

alter table app.module_supervisor_global_controls enable row level security;
alter table app.module_supervisor_global_control_events enable row level security;
alter table app.module_supervisor_host_policies enable row level security;
alter table app.module_supervisor_host_policy_events enable row level security;
alter table app.module_supervisor_budget_reservations enable row level security;

drop policy if exists module_supervisor_global_controls_owner_all
  on app.module_supervisor_global_controls;
create policy module_supervisor_global_controls_owner_all
on app.module_supervisor_global_controls
for all to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
)
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and updated_by=nullif(current_setting('app.user_id',true),'')
);

drop policy if exists module_supervisor_host_policies_owner_all
  on app.module_supervisor_host_policies;
create policy module_supervisor_host_policies_owner_all
on app.module_supervisor_host_policies
for all to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=module_supervisor_host_policies.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and updated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=module_supervisor_host_policies.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists module_supervisor_global_control_events_owner_select
  on app.module_supervisor_global_control_events;
create policy module_supervisor_global_control_events_owner_select
on app.module_supervisor_global_control_events
for select to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
);

drop policy if exists module_supervisor_global_control_events_owner_insert
  on app.module_supervisor_global_control_events;
create policy module_supervisor_global_control_events_owner_insert
on app.module_supervisor_global_control_events
for insert to ai_data_runtime
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and actor_user_id=nullif(current_setting('app.user_id',true),'')
);

drop policy if exists module_supervisor_host_policy_events_owner_select
  on app.module_supervisor_host_policy_events;
create policy module_supervisor_host_policy_events_owner_select
on app.module_supervisor_host_policy_events
for select to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=module_supervisor_host_policy_events.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists module_supervisor_host_policy_events_owner_insert
  on app.module_supervisor_host_policy_events;
create policy module_supervisor_host_policy_events_owner_insert
on app.module_supervisor_host_policy_events
for insert to ai_data_runtime
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=module_supervisor_host_policy_events.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists module_supervisor_budget_reservations_owner_select
  on app.module_supervisor_budget_reservations;
create policy module_supervisor_budget_reservations_owner_select
on app.module_supervisor_budget_reservations
for select to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=module_supervisor_budget_reservations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists module_supervisor_budget_reservations_owner_insert
  on app.module_supervisor_budget_reservations;
create policy module_supervisor_budget_reservations_owner_insert
on app.module_supervisor_budget_reservations
for insert to ai_data_runtime
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=module_supervisor_budget_reservations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

revoke all on
  app.module_supervisor_global_controls,
  app.module_supervisor_global_control_events,
  app.module_supervisor_host_policies,
  app.module_supervisor_host_policy_events,
  app.module_supervisor_budget_reservations
from public;

grant select, insert, update on
  app.module_supervisor_global_controls,
  app.module_supervisor_host_policies
to ai_data_runtime;

grant select, insert on
  app.module_supervisor_global_control_events,
  app.module_supervisor_host_policy_events,
  app.module_supervisor_budget_reservations
to ai_data_runtime;

revoke update, delete on
  app.module_supervisor_global_control_events,
  app.module_supervisor_host_policy_events,
  app.module_supervisor_budget_reservations
from ai_data_runtime;
