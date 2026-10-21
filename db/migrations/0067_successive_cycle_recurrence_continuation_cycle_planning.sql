create table if not exists app.workspace_successive_cycle_recurrence_triage_cycles (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  successive_cycle_retriage_id uuid not null,
  successive_cycle_recurrence_id uuid not null,
  successive_cycle_reclosure_id uuid not null,
  successive_cycle_reclosure_regression_check_id uuid not null,
  predecessor_subsequent_cycle_recurrence_id uuid not null,
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
  successive_cycle_recurrence_fingerprint text not null check (char_length(successive_cycle_recurrence_fingerprint) between 1 and 128),
  regression_fingerprint text not null check (char_length(regression_fingerprint) between 1 and 128),
  successive_cycle_reclosure_fingerprint text not null check (char_length(successive_cycle_reclosure_fingerprint) between 1 and 128),
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
  primary key (workspace_id,successive_cycle_retriage_id),
  unique (workspace_id,successive_cycle_recurrence_id),
  foreign key (workspace_id,successive_cycle_recurrence_id)
    references app.workspace_reconciliation_successive_cycle_recurrences(workspace_id,successive_cycle_recurrence_id)
    on delete restrict,
  foreign key (workspace_id,successive_cycle_reclosure_id)
    references app.workspace_reconciliation_successive_cycle_reclosures(workspace_id,successive_cycle_reclosure_id)
    on delete restrict,
  foreign key (workspace_id,successive_cycle_reclosure_regression_check_id)
    references app.workspace_post_successive_cycle_reclosure_checks(workspace_id,successive_cycle_reclosure_regression_check_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_subsequent_cycle_recurrence_id)
    references app.workspace_reconciliation_subsequent_cycle_recurrences(workspace_id,subsequent_cycle_recurrence_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict
);

create index if not exists workspace_successive_cycle_retriage_recent_idx
  on app.workspace_successive_cycle_recurrence_triage_cycles(workspace_id,updated_at desc);

create table if not exists app.workspace_continuation_cycle_corrective_delivery_plans (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  continuation_cycle_plan_id uuid not null,
  successive_cycle_retriage_id uuid not null,
  successive_cycle_recurrence_id uuid not null,
  successive_cycle_reclosure_id uuid not null,
  successive_cycle_reclosure_regression_check_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  status text not null default 'proposed'
    check (status in ('proposed','approved','rejected','withdrawn')),
  predecessor_successive_cycle_plan_id uuid not null,
  predecessor_successive_cycle_delivery_id uuid not null,
  source_successive_cycle_recurrence_fingerprint text not null check (char_length(source_successive_cycle_recurrence_fingerprint) between 1 and 128),
  source_regression_fingerprint text not null check (char_length(source_regression_fingerprint) between 1 and 128),
  source_successive_cycle_reclosure_fingerprint text not null check (char_length(source_successive_cycle_reclosure_fingerprint) between 1 and 128),
  source_successive_cycle_package_id text not null check (char_length(source_successive_cycle_package_id) between 1 and 512),
  source_successive_cycle_replay_key text not null check (char_length(source_successive_cycle_replay_key) between 1 and 1024),
  source_successive_cycle_package_fingerprint text not null check (char_length(source_successive_cycle_package_fingerprint) between 1 and 128),
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
  primary key (workspace_id,continuation_cycle_plan_id),
  unique (workspace_id,successive_cycle_retriage_id,plan_fingerprint),
  foreign key (workspace_id,successive_cycle_retriage_id)
    references app.workspace_successive_cycle_recurrence_triage_cycles(workspace_id,successive_cycle_retriage_id)
    on delete restrict,
  foreign key (workspace_id,successive_cycle_recurrence_id)
    references app.workspace_reconciliation_successive_cycle_recurrences(workspace_id,successive_cycle_recurrence_id)
    on delete restrict,
  foreign key (workspace_id,successive_cycle_reclosure_id)
    references app.workspace_reconciliation_successive_cycle_reclosures(workspace_id,successive_cycle_reclosure_id)
    on delete restrict,
  foreign key (workspace_id,successive_cycle_reclosure_regression_check_id)
    references app.workspace_post_successive_cycle_reclosure_checks(workspace_id,successive_cycle_reclosure_regression_check_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_successive_cycle_plan_id)
    references app.workspace_successive_cycle_corrective_delivery_plans(workspace_id,successive_cycle_plan_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_successive_cycle_delivery_id)
    references app.workspace_successive_cycle_corrective_live_deliveries(workspace_id,delivery_id)
    on delete restrict
);

create index if not exists workspace_continuation_cycle_plans_recent_idx
  on app.workspace_continuation_cycle_corrective_delivery_plans(workspace_id,created_at desc);

grant select,insert on app.workspace_successive_cycle_recurrence_triage_cycles to ai_data_runtime;
grant update (
  status,classification,severity,resolution_intent,summary,investigation_note,
  updated_by,updated_at,dismissed_by,dismissed_at
) on app.workspace_successive_cycle_recurrence_triage_cycles to ai_data_runtime;

grant select,insert on app.workspace_continuation_cycle_corrective_delivery_plans to ai_data_runtime;
grant update (status,reviewed_by,reviewed_at,review_note)
  on app.workspace_continuation_cycle_corrective_delivery_plans to ai_data_runtime;

alter table app.workspace_successive_cycle_recurrence_triage_cycles enable row level security;
alter table app.workspace_continuation_cycle_corrective_delivery_plans enable row level security;

drop policy if exists successive_cycle_recurrence_triage_member_select
  on app.workspace_successive_cycle_recurrence_triage_cycles;
create policy successive_cycle_recurrence_triage_member_select
on app.workspace_successive_cycle_recurrence_triage_cycles
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successive_cycle_recurrence_triage_cycles.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists successive_cycle_recurrence_triage_manager_insert
  on app.workspace_successive_cycle_recurrence_triage_cycles;
create policy successive_cycle_recurrence_triage_manager_insert
on app.workspace_successive_cycle_recurrence_triage_cycles
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and updated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_reconciliation_successive_cycle_recurrences recurrence3
    join app.workspace_post_successive_cycle_reclosure_checks regression
      on regression.workspace_id=recurrence3.workspace_id
     and regression.successive_cycle_reclosure_regression_check_id=recurrence3.successive_cycle_reclosure_regression_check_id
    join app.workspace_reconciliation_successive_cycle_reclosures reclosure
      on reclosure.workspace_id=recurrence3.workspace_id
     and reclosure.successive_cycle_reclosure_id=recurrence3.successive_cycle_reclosure_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=recurrence3.workspace_id
     and c.case_id=recurrence3.case_id
    where recurrence3.workspace_id=workspace_successive_cycle_recurrence_triage_cycles.workspace_id
      and recurrence3.successive_cycle_recurrence_id=workspace_successive_cycle_recurrence_triage_cycles.successive_cycle_recurrence_id
      and recurrence3.successive_cycle_reclosure_id=workspace_successive_cycle_recurrence_triage_cycles.successive_cycle_reclosure_id
      and recurrence3.successive_cycle_reclosure_regression_check_id=workspace_successive_cycle_recurrence_triage_cycles.successive_cycle_reclosure_regression_check_id
      and recurrence3.predecessor_subsequent_cycle_recurrence_id=workspace_successive_cycle_recurrence_triage_cycles.predecessor_subsequent_cycle_recurrence_id
      and recurrence3.case_id=workspace_successive_cycle_recurrence_triage_cycles.case_id
      and recurrence3.target=workspace_successive_cycle_recurrence_triage_cycles.target
      and recurrence3.successive_cycle_recurrence_fingerprint=workspace_successive_cycle_recurrence_triage_cycles.successive_cycle_recurrence_fingerprint
      and recurrence3.regression_fingerprint=workspace_successive_cycle_recurrence_triage_cycles.regression_fingerprint
      and recurrence3.successive_cycle_reclosure_fingerprint=workspace_successive_cycle_recurrence_triage_cycles.successive_cycle_reclosure_fingerprint
      and regression.status='recurred'
      and regression.verification_fingerprint=recurrence3.regression_fingerprint
      and reclosure.successive_cycle_reclosure_fingerprint=recurrence3.successive_cycle_reclosure_fingerprint
      and c.status='open'
      and recurrence3.successive_cycle_recurrence_id=(
        select newest.successive_cycle_recurrence_id
        from app.workspace_reconciliation_successive_cycle_recurrences newest
        where newest.workspace_id=recurrence3.workspace_id
          and newest.case_id=recurrence3.case_id
        order by newest.recurred_at desc,newest.successive_cycle_recurrence_id desc
        limit 1
      )
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successive_cycle_recurrence_triage_cycles.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists successive_cycle_recurrence_triage_manager_update
  on app.workspace_successive_cycle_recurrence_triage_cycles;
create policy successive_cycle_recurrence_triage_manager_update
on app.workspace_successive_cycle_recurrence_triage_cycles
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successive_cycle_recurrence_triage_cycles.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  updated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_reconciliation_successive_cycle_recurrences recurrence3
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=recurrence3.workspace_id and c.case_id=recurrence3.case_id
    where recurrence3.workspace_id=workspace_successive_cycle_recurrence_triage_cycles.workspace_id
      and recurrence3.successive_cycle_recurrence_id=workspace_successive_cycle_recurrence_triage_cycles.successive_cycle_recurrence_id
      and recurrence3.case_id=workspace_successive_cycle_recurrence_triage_cycles.case_id
      and c.status='open'
      and recurrence3.successive_cycle_recurrence_id=(
        select newest.successive_cycle_recurrence_id
        from app.workspace_reconciliation_successive_cycle_recurrences newest
        where newest.workspace_id=recurrence3.workspace_id
          and newest.case_id=recurrence3.case_id
        order by newest.recurred_at desc,newest.successive_cycle_recurrence_id desc
        limit 1
      )
  )
);

drop policy if exists continuation_cycle_plan_member_select
  on app.workspace_continuation_cycle_corrective_delivery_plans;
create policy continuation_cycle_plan_member_select
on app.workspace_continuation_cycle_corrective_delivery_plans
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_continuation_cycle_corrective_delivery_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists continuation_cycle_plan_manager_insert
  on app.workspace_continuation_cycle_corrective_delivery_plans;
create policy continuation_cycle_plan_manager_insert
on app.workspace_continuation_cycle_corrective_delivery_plans
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_successive_cycle_recurrence_triage_cycles triage
    join app.workspace_reconciliation_successive_cycle_recurrences recurrence3
      on recurrence3.workspace_id=triage.workspace_id
     and recurrence3.successive_cycle_recurrence_id=triage.successive_cycle_recurrence_id
    join app.workspace_reconciliation_successive_cycle_reclosures reclosure
      on reclosure.workspace_id=triage.workspace_id
     and reclosure.successive_cycle_reclosure_id=triage.successive_cycle_reclosure_id
    join app.workspace_successive_cycle_corrective_delivery_plans predecessor
      on predecessor.workspace_id=triage.workspace_id
     and predecessor.successive_cycle_plan_id=reclosure.successive_cycle_plan_id
    join app.workspace_successive_cycle_corrective_live_deliveries delivery
      on delivery.workspace_id=triage.workspace_id
     and delivery.delivery_id=reclosure.successive_cycle_delivery_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=triage.workspace_id and c.case_id=triage.case_id
    where triage.workspace_id=workspace_continuation_cycle_corrective_delivery_plans.workspace_id
      and triage.successive_cycle_retriage_id=workspace_continuation_cycle_corrective_delivery_plans.successive_cycle_retriage_id
      and triage.successive_cycle_recurrence_id=workspace_continuation_cycle_corrective_delivery_plans.successive_cycle_recurrence_id
      and triage.successive_cycle_reclosure_id=workspace_continuation_cycle_corrective_delivery_plans.successive_cycle_reclosure_id
      and triage.successive_cycle_reclosure_regression_check_id=workspace_continuation_cycle_corrective_delivery_plans.successive_cycle_reclosure_regression_check_id
      and triage.case_id=workspace_continuation_cycle_corrective_delivery_plans.case_id
      and triage.target=workspace_continuation_cycle_corrective_delivery_plans.target
      and triage.successive_cycle_recurrence_fingerprint=workspace_continuation_cycle_corrective_delivery_plans.source_successive_cycle_recurrence_fingerprint
      and triage.regression_fingerprint=workspace_continuation_cycle_corrective_delivery_plans.source_regression_fingerprint
      and triage.successive_cycle_reclosure_fingerprint=workspace_continuation_cycle_corrective_delivery_plans.source_successive_cycle_reclosure_fingerprint
      and predecessor.successive_cycle_plan_id=workspace_continuation_cycle_corrective_delivery_plans.predecessor_successive_cycle_plan_id
      and delivery.delivery_id=workspace_continuation_cycle_corrective_delivery_plans.predecessor_successive_cycle_delivery_id
      and predecessor.status='approved'
      and delivery.status='accepted'
      and delivery.successive_cycle_package_id=workspace_continuation_cycle_corrective_delivery_plans.source_successive_cycle_package_id
      and delivery.successive_cycle_replay_key=workspace_continuation_cycle_corrective_delivery_plans.source_successive_cycle_replay_key
      and delivery.successive_cycle_package_fingerprint=workspace_continuation_cycle_corrective_delivery_plans.source_successive_cycle_package_fingerprint
      and c.status='open'
      and triage.status in ('open','planned')
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_continuation_cycle_corrective_delivery_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists continuation_cycle_plan_manager_update
  on app.workspace_continuation_cycle_corrective_delivery_plans;
create policy continuation_cycle_plan_manager_update
on app.workspace_continuation_cycle_corrective_delivery_plans
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_continuation_cycle_corrective_delivery_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1
    from app.workspace_reconciliation_exception_cases c
    where c.workspace_id=workspace_continuation_cycle_corrective_delivery_plans.workspace_id
      and c.case_id=workspace_continuation_cycle_corrective_delivery_plans.case_id
      and c.status='open'
  )
);
