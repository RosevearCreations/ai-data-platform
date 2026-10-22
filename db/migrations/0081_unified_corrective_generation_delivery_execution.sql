-- Build 111 — Unified Corrective-Generation Activation & Idempotent Delivery Execution

create table if not exists app.workspace_unified_cg_delivery_activations (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  activation_id uuid not null,
  corrective_generation_plan_id uuid not null,
  corrective_generation_retriage_id uuid not null,
  successor_source_id uuid not null,
  predecessor_generation_lineage_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  generation_number integer not null check (generation_number between 2 and 10000),
  status text not null default 'active' check (status in ('active','revoked')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 512),
  plan_fingerprint text not null check (char_length(plan_fingerprint) between 1 and 128),
  source_recurrence_fingerprint text not null check (char_length(source_recurrence_fingerprint) between 1 and 128),
  source_regression_fingerprint text not null check (char_length(source_regression_fingerprint) between 1 and 128),
  source_successor_fingerprint text not null check (char_length(source_successor_fingerprint) between 1 and 512),
  predecessor_registry_fingerprint text not null check (char_length(predecessor_registry_fingerprint) between 1 and 512),
  predecessor_plan_id uuid not null,
  predecessor_delivery_id uuid not null,
  predecessor_package_id text not null check (char_length(predecessor_package_id) between 1 and 512),
  predecessor_replay_key text not null check (char_length(predecessor_replay_key) between 1 and 1024),
  predecessor_package_fingerprint text not null check (char_length(predecessor_package_fingerprint) between 1 and 128),
  unified_package_id text not null check (char_length(unified_package_id) between 1 and 512),
  unified_replay_key text not null check (char_length(unified_replay_key) between 1 and 1024),
  unified_package_fingerprint text not null check (char_length(unified_package_fingerprint) between 1 and 128),
  dry_run_validation_code text not null check (char_length(dry_run_validation_code) between 1 and 96),
  dry_run_http_status integer check (dry_run_http_status is null or dry_run_http_status between 100 and 599),
  dry_run_consumer_received_at timestamptz not null,
  dry_run_acknowledgement jsonb not null default '{}'::jsonb
    check (jsonb_typeof(dry_run_acknowledgement)='object'
      and octet_length(dry_run_acknowledgement::text) <= 32768),
  activation_fingerprint text not null check (char_length(activation_fingerprint) between 1 and 128),
  activated_by text not null references auth."user"(id) on delete restrict,
  activated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_by text references auth."user"(id) on delete restrict,
  revoked_at timestamptz,
  revocation_note text not null default '' check (char_length(revocation_note) <= 4000),
  primary key (workspace_id,activation_id),
  unique (workspace_id,corrective_generation_plan_id,activation_fingerprint),
  foreign key (workspace_id,corrective_generation_plan_id)
    references app.workspace_corrective_generation_plans(workspace_id,corrective_generation_plan_id)
    on delete restrict,
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

create unique index if not exists workspace_ucg111_one_active_idx
  on app.workspace_unified_cg_delivery_activations(workspace_id,corrective_generation_plan_id)
  where status='active';

create index if not exists workspace_ucg111_act_recent_idx
  on app.workspace_unified_cg_delivery_activations(workspace_id,activated_at desc);

create table if not exists app.workspace_unified_cg_live_deliveries (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  delivery_id uuid not null,
  activation_id uuid not null,
  corrective_generation_plan_id uuid not null,
  predecessor_delivery_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  generation_number integer not null check (generation_number between 2 and 10000),
  consumer_id text not null check (char_length(consumer_id) between 1 and 512),
  plan_fingerprint text not null check (char_length(plan_fingerprint) between 1 and 128),
  activation_fingerprint text not null check (char_length(activation_fingerprint) between 1 and 128),
  unified_package_id text not null check (char_length(unified_package_id) between 1 and 512),
  unified_replay_key text not null check (char_length(unified_replay_key) between 1 and 1024),
  unified_package_fingerprint text not null check (char_length(unified_package_fingerprint) between 1 and 128),
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 1024),
  status text not null default 'reserved'
    check (status in ('reserved','accepted','rejected','transport-error')),
  attempt_count integer not null default 1 check (attempt_count between 1 and 5),
  validation_code text not null default 'reserved' check (char_length(validation_code) between 1 and 96),
  http_status integer check (http_status is null or http_status between 100 and 599),
  consumer_received_at timestamptz,
  acknowledgement jsonb not null default '{}'::jsonb
    check (jsonb_typeof(acknowledgement)='object'
      and octet_length(acknowledgement::text) <= 32768),
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id,delivery_id),
  unique (workspace_id,consumer_id,unified_package_id),
  foreign key (workspace_id,activation_id)
    references app.workspace_unified_cg_delivery_activations(workspace_id,activation_id)
    on delete restrict,
  foreign key (workspace_id,corrective_generation_plan_id)
    references app.workspace_corrective_generation_plans(workspace_id,corrective_generation_plan_id)
    on delete restrict
);

create index if not exists workspace_ucg111_live_recent_idx
  on app.workspace_unified_cg_live_deliveries(workspace_id,updated_at desc);

grant select,insert on app.workspace_unified_cg_delivery_activations to ai_data_runtime;
grant update (status,revoked_by,revoked_at,revocation_note)
  on app.workspace_unified_cg_delivery_activations to ai_data_runtime;

grant select,insert on app.workspace_unified_cg_live_deliveries to ai_data_runtime;
grant update (
  status,attempt_count,validation_code,http_status,consumer_received_at,
  acknowledgement,last_attempt_at,updated_at
) on app.workspace_unified_cg_live_deliveries to ai_data_runtime;

alter table app.workspace_unified_cg_delivery_activations enable row level security;
alter table app.workspace_unified_cg_live_deliveries enable row level security;

drop policy if exists ucg111_activations_member_select on app.workspace_unified_cg_delivery_activations;
create policy ucg111_activations_member_select
on app.workspace_unified_cg_delivery_activations
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_unified_cg_delivery_activations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists ucg111_activations_manager_insert on app.workspace_unified_cg_delivery_activations;
create policy ucg111_activations_manager_insert
on app.workspace_unified_cg_delivery_activations
for insert to ai_data_runtime
with check (
  activated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_corrective_generation_plans p
    join app.workspace_corrective_generation_retriage t
      on t.workspace_id=p.workspace_id
     and t.corrective_generation_retriage_id=p.corrective_generation_retriage_id
    join app.workspace_corrective_generation_successors s
      on s.workspace_id=p.workspace_id and s.successor_source_id=p.successor_source_id
    join app.workspace_corrective_generation_registry r
      on r.workspace_id=p.workspace_id
     and r.generation_lineage_id=p.predecessor_generation_lineage_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    join app.workspace_members wm
      on wm.workspace_id=p.workspace_id
     and wm.user_id=nullif(current_setting('app.user_id',true),'')
     and wm.role in ('owner','admin')
    where p.workspace_id=workspace_unified_cg_delivery_activations.workspace_id
      and p.corrective_generation_plan_id=workspace_unified_cg_delivery_activations.corrective_generation_plan_id
      and p.corrective_generation_retriage_id=workspace_unified_cg_delivery_activations.corrective_generation_retriage_id
      and p.successor_source_id=workspace_unified_cg_delivery_activations.successor_source_id
      and p.predecessor_generation_lineage_id=workspace_unified_cg_delivery_activations.predecessor_generation_lineage_id
      and p.case_id=workspace_unified_cg_delivery_activations.case_id
      and p.target=workspace_unified_cg_delivery_activations.target
      and p.generation_number=workspace_unified_cg_delivery_activations.generation_number
      and p.status='approved'
      and t.status='approved'
      and c.status='open'
      and p.plan_fingerprint=workspace_unified_cg_delivery_activations.plan_fingerprint
      and p.source_recurrence_fingerprint=workspace_unified_cg_delivery_activations.source_recurrence_fingerprint
      and p.source_regression_fingerprint=workspace_unified_cg_delivery_activations.source_regression_fingerprint
      and p.source_successor_fingerprint=workspace_unified_cg_delivery_activations.source_successor_fingerprint
      and r.registry_fingerprint=workspace_unified_cg_delivery_activations.predecessor_registry_fingerprint
      and r.plan_id=workspace_unified_cg_delivery_activations.predecessor_plan_id
      and r.delivery_id=workspace_unified_cg_delivery_activations.predecessor_delivery_id
      and r.package_id=workspace_unified_cg_delivery_activations.predecessor_package_id
      and r.replay_key=workspace_unified_cg_delivery_activations.predecessor_replay_key
      and r.package_fingerprint=workspace_unified_cg_delivery_activations.predecessor_package_fingerprint
      and s.successor_fingerprint=p.source_successor_fingerprint
      and s.generation_number=p.generation_number
      and s.successor_source_id=(
        select newest.successor_source_id
        from app.workspace_corrective_generation_successors newest
        where newest.workspace_id=s.workspace_id and newest.case_id=s.case_id
        order by newest.generation_number desc,newest.created_at desc,newest.successor_source_id desc
        limit 1
      )
  )
);

drop policy if exists ucg111_activations_manager_update on app.workspace_unified_cg_delivery_activations;
create policy ucg111_activations_manager_update
on app.workspace_unified_cg_delivery_activations
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_unified_cg_delivery_activations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_unified_cg_delivery_activations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists ucg111_deliveries_member_select on app.workspace_unified_cg_live_deliveries;
create policy ucg111_deliveries_member_select
on app.workspace_unified_cg_live_deliveries
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_unified_cg_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists ucg111_deliveries_manager_insert on app.workspace_unified_cg_live_deliveries;
create policy ucg111_deliveries_manager_insert
on app.workspace_unified_cg_live_deliveries
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and idempotency_key=unified_replay_key
  and exists (
    select 1
    from app.workspace_unified_cg_delivery_activations a
    join app.workspace_corrective_generation_plans p
      on p.workspace_id=a.workspace_id
     and p.corrective_generation_plan_id=a.corrective_generation_plan_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    join app.workspace_members wm
      on wm.workspace_id=p.workspace_id
     and wm.user_id=nullif(current_setting('app.user_id',true),'')
     and wm.role in ('owner','admin')
    where a.workspace_id=workspace_unified_cg_live_deliveries.workspace_id
      and a.activation_id=workspace_unified_cg_live_deliveries.activation_id
      and a.corrective_generation_plan_id=workspace_unified_cg_live_deliveries.corrective_generation_plan_id
      and a.predecessor_delivery_id=workspace_unified_cg_live_deliveries.predecessor_delivery_id
      and a.target=workspace_unified_cg_live_deliveries.target
      and a.generation_number=workspace_unified_cg_live_deliveries.generation_number
      and a.consumer_id=workspace_unified_cg_live_deliveries.consumer_id
      and a.plan_fingerprint=workspace_unified_cg_live_deliveries.plan_fingerprint
      and a.activation_fingerprint=workspace_unified_cg_live_deliveries.activation_fingerprint
      and a.unified_package_id=workspace_unified_cg_live_deliveries.unified_package_id
      and a.unified_replay_key=workspace_unified_cg_live_deliveries.unified_replay_key
      and a.unified_package_fingerprint=workspace_unified_cg_live_deliveries.unified_package_fingerprint
      and a.status='active'
      and a.expires_at>now()
      and p.status='approved'
      and c.status='open'
  )
);

drop policy if exists ucg111_deliveries_manager_update on app.workspace_unified_cg_live_deliveries;
create policy ucg111_deliveries_manager_update
on app.workspace_unified_cg_live_deliveries
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_unified_cg_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_unified_cg_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

create or replace function app.require_no_b111_unified_exec_for_plan()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from app.workspace_unified_cg_delivery_activations a
    where a.workspace_id=old.workspace_id
      and a.corrective_generation_plan_id=old.corrective_generation_plan_id
  ) then
    raise exception 'unified_corrective_generation_execution_started';
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_cg_plan_b111_exec_guard on app.workspace_corrective_generation_plans;
create trigger workspace_cg_plan_b111_exec_guard
before update or delete on app.workspace_corrective_generation_plans
for each row execute function app.require_no_b111_unified_exec_for_plan();

create or replace function app.require_no_b111_unified_exec_for_retriage()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from app.workspace_unified_cg_delivery_activations a
    where a.workspace_id=old.workspace_id
      and a.corrective_generation_retriage_id=old.corrective_generation_retriage_id
  ) then
    raise exception 'unified_corrective_generation_execution_started';
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_cg_retriage_b111_exec_guard on app.workspace_corrective_generation_retriage;
create trigger workspace_cg_retriage_b111_exec_guard
before update or delete on app.workspace_corrective_generation_retriage
for each row execute function app.require_no_b111_unified_exec_for_retriage();
