-- Build 109 — Corrective-Generation Lineage Registry & Successor Generation Abstraction

create table if not exists app.workspace_corrective_generation_registry (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  generation_lineage_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  generation_number integer not null check (generation_number between 1 and 10000),
  generation_label text not null check (char_length(generation_label) between 1 and 96),
  generation_state text not null check (generation_state in ('reclosed','recurred')),
  source_kind text not null check (source_kind in ('legacy-next','legacy-following','generic')),
  predecessor_generation_lineage_id uuid,
  source_recurrence_id uuid not null,
  source_recurrence_fingerprint text not null check (char_length(source_recurrence_fingerprint) between 1 and 128),
  plan_id uuid not null,
  plan_fingerprint text not null check (char_length(plan_fingerprint) between 1 and 128),
  delivery_id uuid not null,
  package_id text not null check (char_length(package_id) between 1 and 512),
  replay_key text not null check (char_length(replay_key) between 1 and 1024),
  package_fingerprint text not null check (char_length(package_fingerprint) between 1 and 128),
  reclosure_id uuid not null,
  reclosure_fingerprint text not null check (char_length(reclosure_fingerprint) between 1 and 128),
  terminal_recurrence_id uuid,
  terminal_recurrence_fingerprint text check (
    terminal_recurrence_fingerprint is null or char_length(terminal_recurrence_fingerprint) between 1 and 128
  ),
  terminal_regression_fingerprint text check (
    terminal_regression_fingerprint is null or char_length(terminal_regression_fingerprint) between 1 and 128
  ),
  registry_fingerprint text not null check (char_length(registry_fingerprint) between 1 and 512),
  registered_at timestamptz not null default now(),
  primary key (workspace_id,generation_lineage_id),
  unique (workspace_id,case_id,generation_number),
  unique (workspace_id,plan_id),
  foreign key (workspace_id,predecessor_generation_lineage_id)
    references app.workspace_corrective_generation_registry(workspace_id,generation_lineage_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict
);

create index if not exists workspace_cg_registry_case_idx
  on app.workspace_corrective_generation_registry(workspace_id,case_id,generation_number);

create table if not exists app.workspace_corrective_generation_successors (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
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
  status text not null default 'ready-for-planning'
    check (status in ('ready-for-planning','consumed')),
  successor_fingerprint text not null check (char_length(successor_fingerprint) between 1 and 512),
  created_at timestamptz not null default now(),
  primary key (workspace_id,successor_source_id),
  unique (workspace_id,source_recurrence_id),
  unique (workspace_id,case_id,generation_number),
  foreign key (workspace_id,predecessor_generation_lineage_id)
    references app.workspace_corrective_generation_registry(workspace_id,generation_lineage_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict
);

create index if not exists workspace_cg_successors_ready_idx
  on app.workspace_corrective_generation_successors(workspace_id,status,created_at desc);

-- Historical Generation 1 read-model: Build 101–104 next corrective-generation.
insert into app.workspace_corrective_generation_registry (
  workspace_id,generation_lineage_id,case_id,target,generation_number,generation_label,generation_state,
  source_kind,predecessor_generation_lineage_id,source_recurrence_id,source_recurrence_fingerprint,
  plan_id,plan_fingerprint,delivery_id,package_id,replay_key,package_fingerprint,
  reclosure_id,reclosure_fingerprint,terminal_recurrence_id,terminal_recurrence_fingerprint,
  terminal_regression_fingerprint,registry_fingerprint,registered_at
)
select
  p.workspace_id,p.next_corrective_generation_plan_id,p.case_id,p.target,1,'next-corrective-generation',
  case when r.next_corrective_generation_recurrence_id is null then 'reclosed' else 'recurred' end,
  'legacy-next',null,p.continuation_cycle_recurrence_id,p.source_continuation_cycle_recurrence_fingerprint,
  p.next_corrective_generation_plan_id,p.plan_fingerprint,d.delivery_id,
  d.next_corrective_generation_package_id,d.next_corrective_generation_replay_key,
  d.next_corrective_generation_package_fingerprint,rc.next_corrective_generation_reclosure_id,
  rc.next_corrective_generation_reclosure_fingerprint,r.next_corrective_generation_recurrence_id,
  r.next_corrective_generation_recurrence_fingerprint,r.regression_fingerprint,
  'corrective-generation-registry1-' || md5(
    concat_ws('|',p.plan_fingerprint,rc.next_corrective_generation_reclosure_fingerprint,
      coalesce(r.next_corrective_generation_recurrence_fingerprint,'stable'))
  ),
  rc.closed_at
from app.workspace_next_corrective_generation_plans p
join app.workspace_reconciliation_next_corrective_generation_reclosures rc
  on rc.workspace_id=p.workspace_id
 and rc.next_corrective_generation_plan_id=p.next_corrective_generation_plan_id
join app.workspace_next_corrective_generation_live_deliveries d
  on d.workspace_id=rc.workspace_id
 and d.delivery_id=rc.next_corrective_generation_delivery_id
 and d.status='accepted'
left join app.workspace_reconciliation_next_corrective_generation_recurrences r
  on r.workspace_id=rc.workspace_id
 and r.next_corrective_generation_reclosure_id=rc.next_corrective_generation_reclosure_id
where p.status='approved'
on conflict do nothing;

-- Historical Generation 2 read-model: Build 105–108 following corrective-generation.
insert into app.workspace_corrective_generation_registry (
  workspace_id,generation_lineage_id,case_id,target,generation_number,generation_label,generation_state,
  source_kind,predecessor_generation_lineage_id,source_recurrence_id,source_recurrence_fingerprint,
  plan_id,plan_fingerprint,delivery_id,package_id,replay_key,package_fingerprint,
  reclosure_id,reclosure_fingerprint,terminal_recurrence_id,terminal_recurrence_fingerprint,
  terminal_regression_fingerprint,registry_fingerprint,registered_at
)
select
  p.workspace_id,p.following_corrective_generation_plan_id,p.case_id,p.target,2,'following-corrective-generation',
  case when r.following_corrective_generation_recurrence_id is null then 'reclosed' else 'recurred' end,
  'legacy-following',p.predecessor_next_corrective_generation_plan_id,p.next_corrective_generation_recurrence_id,
  p.source_next_corrective_generation_recurrence_fingerprint,p.following_corrective_generation_plan_id,
  p.plan_fingerprint,d.delivery_id,d.following_corrective_generation_package_id,
  d.following_corrective_generation_replay_key,d.following_corrective_generation_package_fingerprint,
  rc.following_corrective_generation_reclosure_id,rc.following_corrective_generation_reclosure_fingerprint,
  r.following_corrective_generation_recurrence_id,r.following_corrective_generation_recurrence_fingerprint,
  r.regression_fingerprint,
  'corrective-generation-registry1-' || md5(
    concat_ws('|',p.plan_fingerprint,rc.following_corrective_generation_reclosure_fingerprint,
      coalesce(r.following_corrective_generation_recurrence_fingerprint,'stable'))
  ),
  rc.closed_at
from app.workspace_following_corrective_generation_plans p
join app.workspace_reconciliation_following_cg_reclosures rc
  on rc.workspace_id=p.workspace_id
 and rc.following_corrective_generation_plan_id=p.following_corrective_generation_plan_id
join app.workspace_following_corrective_generation_live_deliveries d
  on d.workspace_id=rc.workspace_id
 and d.delivery_id=rc.following_corrective_generation_delivery_id
 and d.status='accepted'
left join app.workspace_reconciliation_following_cg_recurrences r
  on r.workspace_id=rc.workspace_id
 and r.following_corrective_generation_reclosure_id=rc.following_corrective_generation_reclosure_id
where p.status='approved'
on conflict do nothing;

-- Generation 3 abstraction source: consume Build 108 recurrence without creating a plan yet.
insert into app.workspace_corrective_generation_successors (
  workspace_id,successor_source_id,predecessor_generation_lineage_id,case_id,target,generation_number,
  source_recurrence_kind,source_recurrence_id,source_recurrence_fingerprint,
  source_regression_fingerprint,status,successor_fingerprint,created_at
)
select
  r.workspace_id,r.following_corrective_generation_recurrence_id,reg.generation_lineage_id,
  r.case_id,r.target,reg.generation_number + 1,'following-corrective-generation',
  r.following_corrective_generation_recurrence_id,r.following_corrective_generation_recurrence_fingerprint,
  r.regression_fingerprint,'ready-for-planning',
  'corrective-generation-successor1-' || md5(
    concat_ws('|',reg.registry_fingerprint,r.following_corrective_generation_recurrence_fingerprint,
      r.regression_fingerprint,(reg.generation_number + 1)::text)
  ),
  r.recurred_at
from app.workspace_reconciliation_following_cg_recurrences r
join app.workspace_reconciliation_following_cg_reclosures rc
  on rc.workspace_id=r.workspace_id
 and rc.following_corrective_generation_reclosure_id=r.following_corrective_generation_reclosure_id
join app.workspace_corrective_generation_registry reg
  on reg.workspace_id=rc.workspace_id
 and reg.plan_id=rc.following_corrective_generation_plan_id
 and reg.generation_number=2
on conflict do nothing;

revoke all on app.workspace_corrective_generation_registry from ai_data_runtime;
revoke all on app.workspace_corrective_generation_successors from ai_data_runtime;
grant select on app.workspace_corrective_generation_registry to ai_data_runtime;
grant select on app.workspace_corrective_generation_successors to ai_data_runtime;

alter table app.workspace_corrective_generation_registry enable row level security;
alter table app.workspace_corrective_generation_successors enable row level security;

drop policy if exists cg_registry_member_select on app.workspace_corrective_generation_registry;
create policy cg_registry_member_select
on app.workspace_corrective_generation_registry
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_generation_registry.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists cg_successors_member_select on app.workspace_corrective_generation_successors;
create policy cg_successors_member_select
on app.workspace_corrective_generation_successors
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_generation_successors.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

create or replace function app.reject_corrective_generation_registry_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'corrective_generation_registry_append_only';
end;
$$;

drop trigger if exists workspace_cg_registry_immutable_guard on app.workspace_corrective_generation_registry;
create trigger workspace_cg_registry_immutable_guard
before update or delete on app.workspace_corrective_generation_registry
for each row execute function app.reject_corrective_generation_registry_mutation();

drop trigger if exists workspace_cg_successors_immutable_guard on app.workspace_corrective_generation_successors;
create trigger workspace_cg_successors_immutable_guard
before update or delete on app.workspace_corrective_generation_successors
for each row execute function app.reject_corrective_generation_registry_mutation();
