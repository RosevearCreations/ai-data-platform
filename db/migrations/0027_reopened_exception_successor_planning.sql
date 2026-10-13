create table if not exists app.workspace_reopened_exception_triage_cycles (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  retriage_id uuid not null,
  reopen_id uuid not null,
  closure_id uuid not null,
  regression_check_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  status text not null default 'open'
    check (status in ('open','planned','approved','dismissed')),
  classification text not null
    check (classification in ('consumer-drift','consumer-missing','expected-change','source-superseded','mixed','unknown')),
  severity text not null
    check (severity in ('low','medium','high','critical')),
  resolution_intent text not null
    check (resolution_intent in ('investigate','accept-drift','plan-correction','no-action')),
  summary text not null check (char_length(summary) between 1 and 4000),
  investigation_note text not null default '' check (char_length(investigation_note) <= 8000),
  regression_fingerprint text not null check (char_length(regression_fingerprint) between 1 and 128),
  affected_record_count integer not null check (affected_record_count between 1 and 500),
  affected_integration_keys jsonb not null check (
    jsonb_typeof(affected_integration_keys)='array'
    and jsonb_array_length(affected_integration_keys) between 1 and 500
    and octet_length(affected_integration_keys::text) <= 131072
  ),
  affected_fields jsonb not null check (
    jsonb_typeof(affected_fields)='array'
    and jsonb_array_length(affected_fields) between 1 and 100
    and octet_length(affected_fields::text) <= 32768
  ),
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by text not null references auth."user"(id) on delete restrict,
  updated_at timestamptz not null default now(),
  dismissed_by text references auth."user"(id) on delete restrict,
  dismissed_at timestamptz,
  primary key (workspace_id,retriage_id),
  unique (workspace_id,reopen_id),
  foreign key (workspace_id,reopen_id)
    references app.workspace_reconciliation_exception_reopens(workspace_id,reopen_id)
    on delete restrict,
  foreign key (workspace_id,closure_id)
    references app.workspace_reconciliation_exception_closures(workspace_id,closure_id)
    on delete restrict,
  foreign key (workspace_id,regression_check_id)
    references app.workspace_post_closure_regression_checks(workspace_id,regression_check_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict
);

create index if not exists workspace_reopened_exception_triage_cycles_recent_idx
  on app.workspace_reopened_exception_triage_cycles(workspace_id,updated_at desc);

create table if not exists app.workspace_successor_corrective_delivery_plans (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  successor_plan_id uuid not null,
  retriage_id uuid not null,
  reopen_id uuid not null,
  regression_check_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  status text not null default 'proposed'
    check (status in ('proposed','approved','rejected','withdrawn')),
  predecessor_plan_id uuid not null,
  predecessor_corrective_delivery_id uuid not null,
  source_regression_fingerprint text not null check (char_length(source_regression_fingerprint) between 1 and 128),
  source_corrective_package_id text not null check (char_length(source_corrective_package_id) between 1 and 512),
  source_corrective_replay_key text not null check (char_length(source_corrective_replay_key) between 1 and 1024),
  source_corrective_package_fingerprint text not null check (char_length(source_corrective_package_fingerprint) between 1 and 128),
  correction_scope jsonb not null check (
    jsonb_typeof(correction_scope)='array'
    and jsonb_array_length(correction_scope) between 1 and 500
    and octet_length(correction_scope::text) <= 262144
  ),
  plan_fingerprint text not null check (char_length(plan_fingerprint) between 1 and 128),
  rationale text not null check (char_length(rationale) between 1 and 8000),
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  reviewed_by text references auth."user"(id) on delete restrict,
  reviewed_at timestamptz,
  review_note text not null default '' check (char_length(review_note) <= 8000),
  primary key (workspace_id,successor_plan_id),
  unique (workspace_id,retriage_id,plan_fingerprint),
  foreign key (workspace_id,retriage_id)
    references app.workspace_reopened_exception_triage_cycles(workspace_id,retriage_id)
    on delete restrict,
  foreign key (workspace_id,reopen_id)
    references app.workspace_reconciliation_exception_reopens(workspace_id,reopen_id)
    on delete restrict,
  foreign key (workspace_id,regression_check_id)
    references app.workspace_post_closure_regression_checks(workspace_id,regression_check_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_plan_id)
    references app.workspace_corrective_delivery_plans(workspace_id,plan_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_corrective_delivery_id)
    references app.workspace_corrective_live_deliveries(workspace_id,delivery_id)
    on delete restrict
);

create index if not exists workspace_successor_corrective_delivery_plans_recent_idx
  on app.workspace_successor_corrective_delivery_plans(workspace_id,created_at desc);

grant select,insert on app.workspace_reopened_exception_triage_cycles to ai_data_runtime;
grant update (
  status,classification,severity,resolution_intent,summary,investigation_note,
  updated_by,updated_at,dismissed_by,dismissed_at
) on app.workspace_reopened_exception_triage_cycles to ai_data_runtime;

grant select,insert on app.workspace_successor_corrective_delivery_plans to ai_data_runtime;
grant update (status,reviewed_by,reviewed_at,review_note)
  on app.workspace_successor_corrective_delivery_plans to ai_data_runtime;

alter table app.workspace_reopened_exception_triage_cycles enable row level security;
alter table app.workspace_successor_corrective_delivery_plans enable row level security;

drop policy if exists workspace_reopened_exception_triage_cycles_member_select
  on app.workspace_reopened_exception_triage_cycles;
create policy workspace_reopened_exception_triage_cycles_member_select
on app.workspace_reopened_exception_triage_cycles
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reopened_exception_triage_cycles.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workspace_reopened_exception_triage_cycles_manager_insert
  on app.workspace_reopened_exception_triage_cycles;
create policy workspace_reopened_exception_triage_cycles_manager_insert
on app.workspace_reopened_exception_triage_cycles
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and updated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_reconciliation_exception_reopens reopen
    join app.workspace_post_closure_regression_checks regression
      on regression.workspace_id=reopen.workspace_id
     and regression.regression_check_id=reopen.regression_check_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=reopen.workspace_id and c.case_id=reopen.case_id
    where reopen.workspace_id=workspace_reopened_exception_triage_cycles.workspace_id
      and reopen.reopen_id=workspace_reopened_exception_triage_cycles.reopen_id
      and reopen.closure_id=workspace_reopened_exception_triage_cycles.closure_id
      and reopen.regression_check_id=workspace_reopened_exception_triage_cycles.regression_check_id
      and reopen.case_id=workspace_reopened_exception_triage_cycles.case_id
      and reopen.target=workspace_reopened_exception_triage_cycles.target
      and reopen.regression_fingerprint=workspace_reopened_exception_triage_cycles.regression_fingerprint
      and regression.status='regressed'
      and c.status='open'
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reopened_exception_triage_cycles.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_reopened_exception_triage_cycles_manager_update
  on app.workspace_reopened_exception_triage_cycles;
create policy workspace_reopened_exception_triage_cycles_manager_update
on app.workspace_reopened_exception_triage_cycles
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reopened_exception_triage_cycles.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  updated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reopened_exception_triage_cycles.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_successor_corrective_delivery_plans_member_select
  on app.workspace_successor_corrective_delivery_plans;
create policy workspace_successor_corrective_delivery_plans_member_select
on app.workspace_successor_corrective_delivery_plans
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successor_corrective_delivery_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workspace_successor_corrective_delivery_plans_manager_insert
  on app.workspace_successor_corrective_delivery_plans;
create policy workspace_successor_corrective_delivery_plans_manager_insert
on app.workspace_successor_corrective_delivery_plans
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_reopened_exception_triage_cycles triage
    join app.workspace_reconciliation_exception_reopens reopen
      on reopen.workspace_id=triage.workspace_id and reopen.reopen_id=triage.reopen_id
    join app.workspace_post_closure_regression_checks regression
      on regression.workspace_id=triage.workspace_id
     and regression.regression_check_id=triage.regression_check_id
    join app.workspace_corrective_delivery_plans predecessor
      on predecessor.workspace_id=triage.workspace_id
     and predecessor.plan_id=regression.plan_id
    join app.workspace_corrective_live_deliveries delivery
      on delivery.workspace_id=triage.workspace_id
     and delivery.delivery_id=regression.corrective_delivery_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=triage.workspace_id and c.case_id=triage.case_id
    where triage.workspace_id=workspace_successor_corrective_delivery_plans.workspace_id
      and triage.retriage_id=workspace_successor_corrective_delivery_plans.retriage_id
      and triage.reopen_id=workspace_successor_corrective_delivery_plans.reopen_id
      and triage.regression_check_id=workspace_successor_corrective_delivery_plans.regression_check_id
      and triage.case_id=workspace_successor_corrective_delivery_plans.case_id
      and triage.target=workspace_successor_corrective_delivery_plans.target
      and triage.resolution_intent='plan-correction'
      and triage.status in ('open','planned')
      and regression.status='regressed'
      and regression.verification_fingerprint=workspace_successor_corrective_delivery_plans.source_regression_fingerprint
      and predecessor.plan_id=workspace_successor_corrective_delivery_plans.predecessor_plan_id
      and predecessor.status='approved'
      and delivery.delivery_id=workspace_successor_corrective_delivery_plans.predecessor_corrective_delivery_id
      and delivery.status='accepted'
      and delivery.corrective_package_id=workspace_successor_corrective_delivery_plans.source_corrective_package_id
      and delivery.corrective_replay_key=workspace_successor_corrective_delivery_plans.source_corrective_replay_key
      and delivery.corrective_package_fingerprint=workspace_successor_corrective_delivery_plans.source_corrective_package_fingerprint
      and c.status='open'
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successor_corrective_delivery_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_successor_corrective_delivery_plans_manager_update
  on app.workspace_successor_corrective_delivery_plans;
create policy workspace_successor_corrective_delivery_plans_manager_update
on app.workspace_successor_corrective_delivery_plans
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successor_corrective_delivery_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successor_corrective_delivery_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_corrective_delivery_plans_manager_insert
  on app.workspace_corrective_delivery_plans;
create policy workspace_corrective_delivery_plans_manager_insert
on app.workspace_corrective_delivery_plans
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and not exists (
    select 1
    from app.workspace_reconciliation_exception_reopens reopen
    where reopen.workspace_id=workspace_corrective_delivery_plans.workspace_id
      and reopen.case_id=workspace_corrective_delivery_plans.case_id
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_delivery_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

create or replace function app.require_successor_cycle_for_reopened_case()
returns trigger
language plpgsql
as $$
begin
  if old.status is distinct from 'closed'
     and new.status in ('planned','approved','dismissed')
     and exists (
       select 1
       from app.workspace_reconciliation_exception_reopens reopen
       where reopen.workspace_id=new.workspace_id
         and reopen.case_id=new.case_id
     ) then
    raise exception 'reopened_exception_successor_cycle_required';
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_reconciliation_exception_reopened_cycle_guard
  on app.workspace_reconciliation_exception_cases;
create trigger workspace_reconciliation_exception_reopened_cycle_guard
before update of status on app.workspace_reconciliation_exception_cases
for each row
execute function app.require_successor_cycle_for_reopened_case();
