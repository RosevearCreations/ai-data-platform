-- Build 110 — Unified Corrective-Generation Recurrence Re-Triage & Planning Engine

create table if not exists app.workspace_corrective_generation_retriage (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  corrective_generation_retriage_id uuid not null,
  successor_source_id uuid not null,
  predecessor_generation_lineage_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  generation_number integer not null check (generation_number between 2 and 10000),
  source_recurrence_kind text not null check (
    source_recurrence_kind in ('following-corrective-generation','generic-corrective-generation')
  ),
  source_recurrence_id uuid not null,
  source_recurrence_fingerprint text not null check (char_length(source_recurrence_fingerprint) between 1 and 128),
  source_regression_fingerprint text not null check (char_length(source_regression_fingerprint) between 1 and 128),
  predecessor_registry_fingerprint text not null check (char_length(predecessor_registry_fingerprint) between 1 and 512),
  successor_fingerprint text not null check (char_length(successor_fingerprint) between 1 and 512),
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
  primary key (workspace_id,corrective_generation_retriage_id),
  unique (workspace_id,successor_source_id),
  foreign key (workspace_id,successor_source_id)
    references app.workspace_corrective_generation_successors(workspace_id,successor_source_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_generation_lineage_id)
    references app.workspace_corrective_generation_registry(workspace_id,generation_lineage_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict
);

create index if not exists workspace_cg_retriage110_recent_idx
  on app.workspace_corrective_generation_retriage(workspace_id,updated_at desc);

create table if not exists app.workspace_corrective_generation_plans (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  corrective_generation_plan_id uuid not null,
  corrective_generation_retriage_id uuid not null,
  successor_source_id uuid not null,
  predecessor_generation_lineage_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  generation_number integer not null check (generation_number between 2 and 10000),
  status text not null default 'proposed'
    check (status in ('proposed','approved','rejected','withdrawn')),
  predecessor_plan_id uuid not null,
  predecessor_delivery_id uuid not null,
  predecessor_package_id text not null check (char_length(predecessor_package_id) between 1 and 512),
  predecessor_replay_key text not null check (char_length(predecessor_replay_key) between 1 and 1024),
  predecessor_package_fingerprint text not null check (char_length(predecessor_package_fingerprint) between 1 and 128),
  predecessor_reclosure_id uuid not null,
  predecessor_reclosure_fingerprint text not null check (char_length(predecessor_reclosure_fingerprint) between 1 and 128),
  source_recurrence_id uuid not null,
  source_recurrence_fingerprint text not null check (char_length(source_recurrence_fingerprint) between 1 and 128),
  source_regression_fingerprint text not null check (char_length(source_regression_fingerprint) between 1 and 128),
  source_successor_fingerprint text not null check (char_length(source_successor_fingerprint) between 1 and 512),
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
  primary key (workspace_id,corrective_generation_plan_id),
  unique (workspace_id,corrective_generation_retriage_id,plan_fingerprint),
  foreign key (workspace_id,corrective_generation_retriage_id)
    references app.workspace_corrective_generation_retriage(workspace_id,corrective_generation_retriage_id)
    on delete restrict,
  foreign key (workspace_id,successor_source_id)
    references app.workspace_corrective_generation_successors(workspace_id,successor_source_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_generation_lineage_id)
    references app.workspace_corrective_generation_registry(workspace_id,generation_lineage_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict
);

create index if not exists workspace_cg_plans110_recent_idx
  on app.workspace_corrective_generation_plans(workspace_id,created_at desc);

grant select,insert on app.workspace_corrective_generation_retriage to ai_data_runtime;
grant update (
  status,classification,severity,resolution_intent,summary,investigation_note,
  updated_by,updated_at,dismissed_by,dismissed_at
) on app.workspace_corrective_generation_retriage to ai_data_runtime;

grant select,insert on app.workspace_corrective_generation_plans to ai_data_runtime;
grant update (status,reviewed_by,reviewed_at,review_note)
  on app.workspace_corrective_generation_plans to ai_data_runtime;

alter table app.workspace_corrective_generation_retriage enable row level security;
alter table app.workspace_corrective_generation_plans enable row level security;

drop policy if exists cg_retriage_member_select
  on app.workspace_corrective_generation_retriage;
create policy cg_retriage_member_select
on app.workspace_corrective_generation_retriage
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_generation_retriage.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists cg_retriage_manager_insert
  on app.workspace_corrective_generation_retriage;
create policy cg_retriage_manager_insert
on app.workspace_corrective_generation_retriage
for insert to ai_data_runtime
with check (
  exists (
    select 1
    from app.workspace_corrective_generation_successors s
    join app.workspace_corrective_generation_registry r
      on r.workspace_id=s.workspace_id
     and r.generation_lineage_id=s.predecessor_generation_lineage_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=s.workspace_id and c.case_id=s.case_id
    join app.workspace_members wm
      on wm.workspace_id=s.workspace_id
     and wm.user_id=nullif(current_setting('app.user_id',true),'')
     and wm.role in ('owner','admin')
    where s.workspace_id=workspace_corrective_generation_retriage.workspace_id
      and s.successor_source_id=workspace_corrective_generation_retriage.successor_source_id
      and s.predecessor_generation_lineage_id=workspace_corrective_generation_retriage.predecessor_generation_lineage_id
      and s.case_id=workspace_corrective_generation_retriage.case_id
      and s.target=workspace_corrective_generation_retriage.target
      and s.generation_number=workspace_corrective_generation_retriage.generation_number
      and s.source_recurrence_kind=workspace_corrective_generation_retriage.source_recurrence_kind
      and s.source_recurrence_id=workspace_corrective_generation_retriage.source_recurrence_id
      and s.source_recurrence_fingerprint=workspace_corrective_generation_retriage.source_recurrence_fingerprint
      and s.source_regression_fingerprint=workspace_corrective_generation_retriage.source_regression_fingerprint
      and s.successor_fingerprint=workspace_corrective_generation_retriage.successor_fingerprint
      and r.registry_fingerprint=workspace_corrective_generation_retriage.predecessor_registry_fingerprint
      and r.generation_number + 1=s.generation_number
      and r.generation_state='recurred'
      and c.status='open'
      and not exists (
        select 1 from app.workspace_corrective_generation_successors newer
        where newer.workspace_id=s.workspace_id
          and newer.case_id=s.case_id
          and newer.generation_number>s.generation_number
      )
  )
);

drop policy if exists cg_retriage_manager_update
  on app.workspace_corrective_generation_retriage;
create policy cg_retriage_manager_update
on app.workspace_corrective_generation_retriage
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_generation_retriage.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1
    from app.workspace_corrective_generation_successors s
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=s.workspace_id and c.case_id=s.case_id
    where s.workspace_id=workspace_corrective_generation_retriage.workspace_id
      and s.successor_source_id=workspace_corrective_generation_retriage.successor_source_id
      and c.status='open'
      and not exists (
        select 1 from app.workspace_corrective_generation_successors newer
        where newer.workspace_id=s.workspace_id
          and newer.case_id=s.case_id
          and newer.generation_number>s.generation_number
      )
  )
);

drop policy if exists cg_plan_member_select
  on app.workspace_corrective_generation_plans;
create policy cg_plan_member_select
on app.workspace_corrective_generation_plans
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_generation_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists cg_plan_manager_insert
  on app.workspace_corrective_generation_plans;
create policy cg_plan_manager_insert
on app.workspace_corrective_generation_plans
for insert to ai_data_runtime
with check (
  exists (
    select 1
    from app.workspace_corrective_generation_retriage t
    join app.workspace_corrective_generation_successors s
      on s.workspace_id=t.workspace_id and s.successor_source_id=t.successor_source_id
    join app.workspace_corrective_generation_registry r
      on r.workspace_id=s.workspace_id
     and r.generation_lineage_id=s.predecessor_generation_lineage_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=t.workspace_id and c.case_id=t.case_id
    join app.workspace_members wm
      on wm.workspace_id=t.workspace_id
     and wm.user_id=nullif(current_setting('app.user_id',true),'')
     and wm.role in ('owner','admin')
    where t.workspace_id=workspace_corrective_generation_plans.workspace_id
      and t.corrective_generation_retriage_id=workspace_corrective_generation_plans.corrective_generation_retriage_id
      and t.successor_source_id=workspace_corrective_generation_plans.successor_source_id
      and t.predecessor_generation_lineage_id=workspace_corrective_generation_plans.predecessor_generation_lineage_id
      and t.case_id=workspace_corrective_generation_plans.case_id
      and t.target=workspace_corrective_generation_plans.target
      and t.generation_number=workspace_corrective_generation_plans.generation_number
      and t.source_recurrence_id=workspace_corrective_generation_plans.source_recurrence_id
      and t.source_recurrence_fingerprint=workspace_corrective_generation_plans.source_recurrence_fingerprint
      and t.source_regression_fingerprint=workspace_corrective_generation_plans.source_regression_fingerprint
      and t.successor_fingerprint=workspace_corrective_generation_plans.source_successor_fingerprint
      and t.resolution_intent='plan-correction'
      and t.status in ('open','planned')
      and r.plan_id=workspace_corrective_generation_plans.predecessor_plan_id
      and r.delivery_id=workspace_corrective_generation_plans.predecessor_delivery_id
      and r.package_id=workspace_corrective_generation_plans.predecessor_package_id
      and r.replay_key=workspace_corrective_generation_plans.predecessor_replay_key
      and r.package_fingerprint=workspace_corrective_generation_plans.predecessor_package_fingerprint
      and r.reclosure_id=workspace_corrective_generation_plans.predecessor_reclosure_id
      and r.reclosure_fingerprint=workspace_corrective_generation_plans.predecessor_reclosure_fingerprint
      and c.status='open'
      and not exists (
        select 1 from app.workspace_corrective_generation_successors newer
        where newer.workspace_id=s.workspace_id
          and newer.case_id=s.case_id
          and newer.generation_number>s.generation_number
      )
  )
);

drop policy if exists cg_plan_manager_update
  on app.workspace_corrective_generation_plans;
create policy cg_plan_manager_update
on app.workspace_corrective_generation_plans
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_generation_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1
    from app.workspace_corrective_generation_successors s
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=s.workspace_id and c.case_id=s.case_id
    where s.workspace_id=workspace_corrective_generation_plans.workspace_id
      and s.successor_source_id=workspace_corrective_generation_plans.successor_source_id
      and c.status='open'
      and not exists (
        select 1 from app.workspace_corrective_generation_successors newer
        where newer.workspace_id=s.workspace_id
          and newer.case_id=s.case_id
          and newer.generation_number>s.generation_number
      )
  )
);
