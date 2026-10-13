create table if not exists app.workspace_recurrent_exception_triage_cycles (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  recurrence_retriage_id uuid not null,
  recurrence_id uuid not null,
  reclosure_id uuid not null,
  reclosure_regression_check_id uuid not null,
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
  recurrence_fingerprint text not null check (char_length(recurrence_fingerprint) between 1 and 128),
  regression_fingerprint text not null check (char_length(regression_fingerprint) between 1 and 128),
  reclosure_fingerprint text not null check (char_length(reclosure_fingerprint) between 1 and 128),
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
  primary key (workspace_id,recurrence_retriage_id),
  unique (workspace_id,recurrence_id),
  foreign key (workspace_id,recurrence_id)
    references app.workspace_reconciliation_exception_recurrences(workspace_id,recurrence_id)
    on delete restrict,
  foreign key (workspace_id,reclosure_id)
    references app.workspace_reconciliation_exception_reclosures(workspace_id,reclosure_id)
    on delete restrict,
  foreign key (workspace_id,reclosure_regression_check_id)
    references app.workspace_post_reclosure_regression_checks(workspace_id,reclosure_regression_check_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict
);

create index if not exists workspace_recurrent_exception_triage_recent_idx
  on app.workspace_recurrent_exception_triage_cycles(workspace_id,updated_at desc);

create table if not exists app.workspace_next_generation_corrective_delivery_plans (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  next_generation_plan_id uuid not null,
  recurrence_retriage_id uuid not null,
  recurrence_id uuid not null,
  reclosure_id uuid not null,
  reclosure_regression_check_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  status text not null default 'proposed'
    check (status in ('proposed','approved','rejected','withdrawn')),
  predecessor_successor_plan_id uuid not null,
  predecessor_successor_delivery_id uuid not null,
  source_recurrence_fingerprint text not null check (char_length(source_recurrence_fingerprint) between 1 and 128),
  source_regression_fingerprint text not null check (char_length(source_regression_fingerprint) between 1 and 128),
  source_reclosure_fingerprint text not null check (char_length(source_reclosure_fingerprint) between 1 and 128),
  source_successor_package_id text not null check (char_length(source_successor_package_id) between 1 and 512),
  source_successor_replay_key text not null check (char_length(source_successor_replay_key) between 1 and 1024),
  source_successor_package_fingerprint text not null check (char_length(source_successor_package_fingerprint) between 1 and 128),
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
  primary key (workspace_id,next_generation_plan_id),
  unique (workspace_id,recurrence_retriage_id,plan_fingerprint),
  foreign key (workspace_id,recurrence_retriage_id)
    references app.workspace_recurrent_exception_triage_cycles(workspace_id,recurrence_retriage_id)
    on delete restrict,
  foreign key (workspace_id,recurrence_id)
    references app.workspace_reconciliation_exception_recurrences(workspace_id,recurrence_id)
    on delete restrict,
  foreign key (workspace_id,reclosure_id)
    references app.workspace_reconciliation_exception_reclosures(workspace_id,reclosure_id)
    on delete restrict,
  foreign key (workspace_id,reclosure_regression_check_id)
    references app.workspace_post_reclosure_regression_checks(workspace_id,reclosure_regression_check_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_successor_plan_id)
    references app.workspace_successor_corrective_delivery_plans(workspace_id,successor_plan_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_successor_delivery_id)
    references app.workspace_successor_corrective_live_deliveries(workspace_id,delivery_id)
    on delete restrict
);

create index if not exists workspace_next_generation_corrective_plans_recent_idx
  on app.workspace_next_generation_corrective_delivery_plans(workspace_id,created_at desc);

grant select,insert on app.workspace_recurrent_exception_triage_cycles to ai_data_runtime;
grant update (
  status,classification,severity,resolution_intent,summary,investigation_note,
  updated_by,updated_at,dismissed_by,dismissed_at
) on app.workspace_recurrent_exception_triage_cycles to ai_data_runtime;

grant select,insert on app.workspace_next_generation_corrective_delivery_plans to ai_data_runtime;
grant update (status,reviewed_by,reviewed_at,review_note)
  on app.workspace_next_generation_corrective_delivery_plans to ai_data_runtime;

alter table app.workspace_recurrent_exception_triage_cycles enable row level security;
alter table app.workspace_next_generation_corrective_delivery_plans enable row level security;

drop policy if exists recurrent_triage_member_select
  on app.workspace_recurrent_exception_triage_cycles;
create policy recurrent_triage_member_select
on app.workspace_recurrent_exception_triage_cycles
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_recurrent_exception_triage_cycles.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists recurrent_triage_manager_insert
  on app.workspace_recurrent_exception_triage_cycles;
create policy recurrent_triage_manager_insert
on app.workspace_recurrent_exception_triage_cycles
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and updated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_reconciliation_exception_recurrences recurrence
    join app.workspace_post_reclosure_regression_checks regression
      on regression.workspace_id=recurrence.workspace_id
     and regression.reclosure_regression_check_id=recurrence.reclosure_regression_check_id
    join app.workspace_reconciliation_exception_reclosures reclosure
      on reclosure.workspace_id=recurrence.workspace_id
     and reclosure.reclosure_id=recurrence.reclosure_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=recurrence.workspace_id and c.case_id=recurrence.case_id
    where recurrence.workspace_id=workspace_recurrent_exception_triage_cycles.workspace_id
      and recurrence.recurrence_id=workspace_recurrent_exception_triage_cycles.recurrence_id
      and recurrence.reclosure_id=workspace_recurrent_exception_triage_cycles.reclosure_id
      and recurrence.reclosure_regression_check_id=workspace_recurrent_exception_triage_cycles.reclosure_regression_check_id
      and recurrence.case_id=workspace_recurrent_exception_triage_cycles.case_id
      and recurrence.target=workspace_recurrent_exception_triage_cycles.target
      and recurrence.recurrence_fingerprint=workspace_recurrent_exception_triage_cycles.recurrence_fingerprint
      and recurrence.regression_fingerprint=workspace_recurrent_exception_triage_cycles.regression_fingerprint
      and recurrence.reclosure_fingerprint=workspace_recurrent_exception_triage_cycles.reclosure_fingerprint
      and regression.status='recurred'
      and regression.verification_fingerprint=recurrence.regression_fingerprint
      and reclosure.reclosure_fingerprint=recurrence.reclosure_fingerprint
      and c.status='open'
      and recurrence.recurrence_id=(
        select newest.recurrence_id
        from app.workspace_reconciliation_exception_recurrences newest
        where newest.workspace_id=recurrence.workspace_id
          and newest.case_id=recurrence.case_id
        order by newest.recurred_at desc,newest.recurrence_id desc
        limit 1
      )
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_recurrent_exception_triage_cycles.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists recurrent_triage_manager_update
  on app.workspace_recurrent_exception_triage_cycles;
create policy recurrent_triage_manager_update
on app.workspace_recurrent_exception_triage_cycles
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_recurrent_exception_triage_cycles.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  updated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_reconciliation_exception_recurrences recurrence
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=recurrence.workspace_id and c.case_id=recurrence.case_id
    where recurrence.workspace_id=workspace_recurrent_exception_triage_cycles.workspace_id
      and recurrence.recurrence_id=workspace_recurrent_exception_triage_cycles.recurrence_id
      and recurrence.case_id=workspace_recurrent_exception_triage_cycles.case_id
      and c.status='open'
      and recurrence.recurrence_id=(
        select newest.recurrence_id
        from app.workspace_reconciliation_exception_recurrences newest
        where newest.workspace_id=recurrence.workspace_id
          and newest.case_id=recurrence.case_id
        order by newest.recurred_at desc,newest.recurrence_id desc
        limit 1
      )
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_recurrent_exception_triage_cycles.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists next_generation_plan_member_select
  on app.workspace_next_generation_corrective_delivery_plans;
create policy next_generation_plan_member_select
on app.workspace_next_generation_corrective_delivery_plans
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_next_generation_corrective_delivery_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists next_generation_plan_manager_insert
  on app.workspace_next_generation_corrective_delivery_plans;
create policy next_generation_plan_manager_insert
on app.workspace_next_generation_corrective_delivery_plans
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_recurrent_exception_triage_cycles triage
    join app.workspace_reconciliation_exception_recurrences recurrence
      on recurrence.workspace_id=triage.workspace_id
     and recurrence.recurrence_id=triage.recurrence_id
    join app.workspace_post_reclosure_regression_checks regression
      on regression.workspace_id=triage.workspace_id
     and regression.reclosure_regression_check_id=triage.reclosure_regression_check_id
    join app.workspace_reconciliation_exception_reclosures reclosure
      on reclosure.workspace_id=triage.workspace_id
     and reclosure.reclosure_id=triage.reclosure_id
    join app.workspace_successor_corrective_delivery_plans predecessor
      on predecessor.workspace_id=triage.workspace_id
     and predecessor.successor_plan_id=reclosure.successor_plan_id
    join app.workspace_successor_corrective_live_deliveries delivery
      on delivery.workspace_id=triage.workspace_id
     and delivery.delivery_id=reclosure.successor_delivery_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=triage.workspace_id and c.case_id=triage.case_id
    where triage.workspace_id=workspace_next_generation_corrective_delivery_plans.workspace_id
      and triage.recurrence_retriage_id=workspace_next_generation_corrective_delivery_plans.recurrence_retriage_id
      and triage.recurrence_id=workspace_next_generation_corrective_delivery_plans.recurrence_id
      and triage.reclosure_id=workspace_next_generation_corrective_delivery_plans.reclosure_id
      and triage.reclosure_regression_check_id=workspace_next_generation_corrective_delivery_plans.reclosure_regression_check_id
      and triage.case_id=workspace_next_generation_corrective_delivery_plans.case_id
      and triage.target=workspace_next_generation_corrective_delivery_plans.target
      and triage.resolution_intent='plan-correction'
      and triage.status in ('open','planned')
      and recurrence.recurrence_fingerprint=workspace_next_generation_corrective_delivery_plans.source_recurrence_fingerprint
      and recurrence.regression_fingerprint=workspace_next_generation_corrective_delivery_plans.source_regression_fingerprint
      and recurrence.reclosure_fingerprint=workspace_next_generation_corrective_delivery_plans.source_reclosure_fingerprint
      and regression.status='recurred'
      and regression.verification_fingerprint=workspace_next_generation_corrective_delivery_plans.source_regression_fingerprint
      and reclosure.reclosure_fingerprint=workspace_next_generation_corrective_delivery_plans.source_reclosure_fingerprint
      and predecessor.successor_plan_id=workspace_next_generation_corrective_delivery_plans.predecessor_successor_plan_id
      and predecessor.status='approved'
      and delivery.delivery_id=workspace_next_generation_corrective_delivery_plans.predecessor_successor_delivery_id
      and delivery.status='accepted'
      and delivery.successor_package_id=workspace_next_generation_corrective_delivery_plans.source_successor_package_id
      and delivery.successor_replay_key=workspace_next_generation_corrective_delivery_plans.source_successor_replay_key
      and delivery.successor_package_fingerprint=workspace_next_generation_corrective_delivery_plans.source_successor_package_fingerprint
      and c.status='open'
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_next_generation_corrective_delivery_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists next_generation_plan_manager_update
  on app.workspace_next_generation_corrective_delivery_plans;
create policy next_generation_plan_manager_update
on app.workspace_next_generation_corrective_delivery_plans
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_next_generation_corrective_delivery_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1
    from app.workspace_recurrent_exception_triage_cycles triage
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=triage.workspace_id and c.case_id=triage.case_id
    where triage.workspace_id=workspace_next_generation_corrective_delivery_plans.workspace_id
      and triage.recurrence_retriage_id=workspace_next_generation_corrective_delivery_plans.recurrence_retriage_id
      and c.status='open'
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_next_generation_corrective_delivery_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

create or replace function app.require_no_recurrence_for_reopened_planning()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from app.workspace_reconciliation_exception_recurrences recurrence
    where recurrence.workspace_id=new.workspace_id
      and recurrence.case_id=new.case_id
  ) then
    raise exception 'recurrent_exception_requires_next_generation_planning';
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_reopened_triage_recurrence_guard
  on app.workspace_reopened_exception_triage_cycles;
create trigger workspace_reopened_triage_recurrence_guard
before insert or update on app.workspace_reopened_exception_triage_cycles
for each row
execute function app.require_no_recurrence_for_reopened_planning();

drop trigger if exists workspace_successor_plan_recurrence_guard
  on app.workspace_successor_corrective_delivery_plans;
create trigger workspace_successor_plan_recurrence_guard
before insert or update on app.workspace_successor_corrective_delivery_plans
for each row
execute function app.require_no_recurrence_for_reopened_planning();
