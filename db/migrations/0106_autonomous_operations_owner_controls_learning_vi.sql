-- Build 305 — Autonomous Operations V1, Owner Controls & Production Learning VI
-- Owner-controlled observation and bounded safe recovery only.
-- No consequential peer mutation, connection activation, trust change or automatic roadmap numbering.

create table if not exists app.autonomous_operation_policies (
  owner_user_id text primary key references auth."user"(id) on delete restrict,
  enabled boolean not null default false,
  kill_switch_engaged boolean not null default true,
  monitoring_enabled boolean not null default true,
  recovery_scan_enabled boolean not null default true,
  safe_recovery_enabled boolean not null default false,
  max_safe_recoveries_per_cycle integer not null default 3
    check (max_safe_recoveries_per_cycle between 0 and 10),
  max_cycles_per_hour integer not null default 4
    check (max_cycles_per_hour between 1 and 12),
  policy_revision integer not null default 1
    check (policy_revision between 1 and 1000000),
  updated_by text not null references auth."user"(id) on delete restrict,
  updated_at timestamptz not null default now(),
  check (
    safe_recovery_enabled=false
    or max_safe_recoveries_per_cycle>0
  )
);

create table if not exists app.autonomous_operation_policy_events (
  event_id uuid primary key,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  policy_revision integer not null check (policy_revision between 1 and 1000000),
  action text not null
    check (action in (
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

create table if not exists app.autonomous_operation_cycles (
  cycle_id uuid primary key,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  policy_revision integer not null check (policy_revision between 1 and 1000000),
  mode text not null check (mode in ('observe-only','safe-recovery')),
  state text not null check (state in ('completed','blocked','failed')),
  certification_run_id uuid references app.integration_certification_runs(run_id) on delete restrict,
  recovery_plans_created integer not null default 0 check (recovery_plans_created between 0 and 100000),
  safe_recoveries_eligible integer not null default 0 check (safe_recoveries_eligible between 0 and 10000),
  safe_recoveries_executed integer not null default 0 check (safe_recoveries_executed between 0 and 10),
  safe_recoveries_succeeded integer not null default 0 check (safe_recoveries_succeeded between 0 and 10),
  safe_recoveries_failed integer not null default 0 check (safe_recoveries_failed between 0 and 10),
  details jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(details)='object'
      and octet_length(details::text)<=16384
    ),
  started_at timestamptz not null,
  completed_at timestamptz not null default now(),
  check (safe_recoveries_succeeded+safe_recoveries_failed<=safe_recoveries_executed)
);

create table if not exists app.autonomous_operation_actions (
  action_id uuid primary key,
  cycle_id uuid not null references app.autonomous_operation_cycles(cycle_id) on delete restrict,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  action_kind text not null
    check (action_kind in (
      'certification-refresh',
      'recovery-scan',
      'safe-health-recovery',
      'production-learning-vi'
    )),
  state text not null check (state in ('executed','skipped','blocked','failed')),
  source_ref text,
  details jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(details)='object'
      and octet_length(details::text)<=16384
    ),
  occurred_at timestamptz not null default now()
);

create table if not exists app.production_learning_vi_snapshots (
  snapshot_id uuid primary key,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  cycle_id uuid references app.autonomous_operation_cycles(cycle_id) on delete restrict,
  certification_run_id uuid references app.integration_certification_runs(run_id) on delete restrict,
  certification_passed integer not null default 0 check (certification_passed between 0 and 30),
  certification_failed integer not null default 0 check (certification_failed between 0 and 30),
  certification_blocked integer not null default 30 check (certification_blocked between 0 and 30),
  recovery_ready integer not null default 0 check (recovery_ready between 0 and 100000),
  recovery_owner_approval_required integer not null default 0
    check (recovery_owner_approval_required between 0 and 100000),
  recovery_succeeded integer not null default 0 check (recovery_succeeded between 0 and 100000),
  learning_action_findings integer not null default 0 check (learning_action_findings between 0 and 100000),
  learning_watch_findings integer not null default 0 check (learning_watch_findings between 0 and 100000),
  candidate_count integer not null default 0 check (candidate_count between 0 and 1000),
  overall_state text not null check (overall_state in ('healthy','attention','blocked')),
  generated_at timestamptz not null default now(),
  check (certification_passed+certification_failed+certification_blocked=30)
);

create table if not exists app.production_learning_vi_candidates (
  candidate_id uuid primary key,
  snapshot_id uuid not null references app.production_learning_vi_snapshots(snapshot_id) on delete restrict,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  priority text not null check (priority in ('P0','P1','P2')),
  area text not null
    check (area in (
      'connectivity',
      'recovery',
      'security',
      'operations',
      'data-governance',
      'adoption',
      'performance'
    )),
  title text not null check (char_length(title) between 3 and 220),
  rationale text not null check (char_length(rationale) between 8 and 1200),
  evidence text not null check (char_length(evidence) between 3 and 1600),
  source_href text not null check (char_length(source_href) between 2 and 240),
  state text not null default 'candidate' check (state='candidate'),
  created_at timestamptz not null default now(),
  unique (snapshot_id,title)
);

create index if not exists autonomous_operation_policy_events_owner_recent_idx
  on app.autonomous_operation_policy_events(owner_user_id,occurred_at desc);

create index if not exists autonomous_operation_cycles_owner_recent_idx
  on app.autonomous_operation_cycles(owner_user_id,completed_at desc);

create index if not exists autonomous_operation_actions_cycle_idx
  on app.autonomous_operation_actions(cycle_id,occurred_at);

create index if not exists production_learning_vi_snapshots_owner_recent_idx
  on app.production_learning_vi_snapshots(owner_user_id,generated_at desc);

create index if not exists production_learning_vi_candidates_snapshot_idx
  on app.production_learning_vi_candidates(snapshot_id,priority,created_at);

alter table app.autonomous_operation_policies enable row level security;
alter table app.autonomous_operation_policy_events enable row level security;
alter table app.autonomous_operation_cycles enable row level security;
alter table app.autonomous_operation_actions enable row level security;
alter table app.production_learning_vi_snapshots enable row level security;
alter table app.production_learning_vi_candidates enable row level security;

drop policy if exists autonomous_operation_policies_owner_all
  on app.autonomous_operation_policies;
create policy autonomous_operation_policies_owner_all
on app.autonomous_operation_policies
for all to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
)
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and updated_by=nullif(current_setting('app.user_id',true),'')
);

do $$
declare
  t text;
begin
  foreach t in array array[
    'autonomous_operation_policy_events',
    'autonomous_operation_cycles',
    'autonomous_operation_actions',
    'production_learning_vi_snapshots',
    'production_learning_vi_candidates'
  ]
  loop
    execute format('drop policy if exists %I_owner_select on app.%I',t,t);
    execute format(
      'create policy %I_owner_select on app.%I for select to ai_data_runtime using (owner_user_id=nullif(current_setting(''app.user_id'',true),''''))',
      t,t,t
    );
    execute format('drop policy if exists %I_owner_insert on app.%I',t,t);
    execute format(
      'create policy %I_owner_insert on app.%I for insert to ai_data_runtime with check (owner_user_id=nullif(current_setting(''app.user_id'',true),''''))',
      t,t,t
    );
  end loop;
end $$;

revoke all on
  app.autonomous_operation_policies,
  app.autonomous_operation_policy_events,
  app.autonomous_operation_cycles,
  app.autonomous_operation_actions,
  app.production_learning_vi_snapshots,
  app.production_learning_vi_candidates
from public;

grant select, insert, update on app.autonomous_operation_policies to ai_data_runtime;

grant select, insert on
  app.autonomous_operation_policy_events,
  app.autonomous_operation_cycles,
  app.autonomous_operation_actions,
  app.production_learning_vi_snapshots,
  app.production_learning_vi_candidates
to ai_data_runtime;

revoke update, delete on
  app.autonomous_operation_policy_events,
  app.autonomous_operation_cycles,
  app.autonomous_operation_actions,
  app.production_learning_vi_snapshots,
  app.production_learning_vi_candidates
from ai_data_runtime;
