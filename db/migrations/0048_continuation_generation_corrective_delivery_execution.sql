create table if not exists app.workspace_continuation_generation_corrective_delivery_activations (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  activation_id uuid not null,
  continuation_generation_plan_id uuid not null,
  successive_generation_retriage_id uuid not null,
  successive_generation_recurrence_id uuid not null,
  successive_generation_reclosure_id uuid not null,
  successive_generation_reclosure_regression_check_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  status text not null default 'active' check (status in ('active','revoked')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 512),
  continuation_generation_plan_fingerprint text not null check (char_length(continuation_generation_plan_fingerprint) between 1 and 128),
  source_successive_generation_recurrence_fingerprint text not null check (char_length(source_successive_generation_recurrence_fingerprint) between 1 and 128),
  source_regression_fingerprint text not null check (char_length(source_regression_fingerprint) between 1 and 128),
  source_successive_generation_reclosure_fingerprint text not null check (char_length(source_successive_generation_reclosure_fingerprint) between 1 and 128),
  predecessor_successive_generation_plan_id uuid not null,
  predecessor_successive_generation_delivery_id uuid not null,
  predecessor_successive_generation_package_id text not null check (char_length(predecessor_successive_generation_package_id) between 1 and 512),
  predecessor_successive_generation_replay_key text not null check (char_length(predecessor_successive_generation_replay_key) between 1 and 1024),
  predecessor_successive_generation_package_fingerprint text not null check (char_length(predecessor_successive_generation_package_fingerprint) between 1 and 128),
  continuation_generation_package_id text not null check (char_length(continuation_generation_package_id) between 1 and 512),
  continuation_generation_replay_key text not null check (char_length(continuation_generation_replay_key) between 1 and 1024),
  continuation_generation_package_fingerprint text not null check (char_length(continuation_generation_package_fingerprint) between 1 and 128),
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
  unique (workspace_id,continuation_generation_plan_id,activation_fingerprint),
  foreign key (workspace_id,continuation_generation_plan_id)
    references app.workspace_continuation_generation_corrective_delivery_plans(workspace_id,continuation_generation_plan_id)
    on delete restrict,
  foreign key (workspace_id,successive_generation_retriage_id)
    references app.workspace_successive_generation_recurrence_triage_cycles(workspace_id,successive_generation_retriage_id)
    on delete restrict,
  foreign key (workspace_id,successive_generation_recurrence_id)
    references app.workspace_reconciliation_successive_generation_recurrences(workspace_id,successive_generation_recurrence_id)
    on delete restrict,
  foreign key (workspace_id,successive_generation_reclosure_id)
    references app.workspace_reconciliation_successive_generation_reclosures(workspace_id,successive_generation_reclosure_id)
    on delete restrict,
  foreign key (workspace_id,successive_generation_reclosure_regression_check_id)
    references app.workspace_post_successive_generation_reclosure_checks(workspace_id,successive_generation_reclosure_regression_check_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_successive_generation_plan_id)
    references app.workspace_successive_generation_corrective_delivery_plans(workspace_id,successive_generation_plan_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_successive_generation_delivery_id)
    references app.workspace_successive_generation_corrective_live_deliveries(workspace_id,delivery_id)
    on delete restrict
);

create unique index if not exists workspace_continuation_generation_activations_one_active_idx
  on app.workspace_continuation_generation_corrective_delivery_activations(workspace_id,continuation_generation_plan_id)
  where status='active';

create index if not exists workspace_continuation_generation_activations_recent_idx
  on app.workspace_continuation_generation_corrective_delivery_activations(workspace_id,activated_at desc);

create table if not exists app.workspace_continuation_generation_corrective_live_deliveries (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  delivery_id uuid not null,
  activation_id uuid not null,
  continuation_generation_plan_id uuid not null,
  predecessor_successive_generation_delivery_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 512),
  continuation_generation_plan_fingerprint text not null check (char_length(continuation_generation_plan_fingerprint) between 1 and 128),
  activation_fingerprint text not null check (char_length(activation_fingerprint) between 1 and 128),
  continuation_generation_package_id text not null check (char_length(continuation_generation_package_id) between 1 and 512),
  continuation_generation_replay_key text not null check (char_length(continuation_generation_replay_key) between 1 and 1024),
  continuation_generation_package_fingerprint text not null check (char_length(continuation_generation_package_fingerprint) between 1 and 128),
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
  unique (workspace_id,consumer_id,continuation_generation_package_id),
  foreign key (workspace_id,activation_id)
    references app.workspace_continuation_generation_corrective_delivery_activations(workspace_id,activation_id)
    on delete restrict,
  foreign key (workspace_id,continuation_generation_plan_id)
    references app.workspace_continuation_generation_corrective_delivery_plans(workspace_id,continuation_generation_plan_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_successive_generation_delivery_id)
    references app.workspace_successive_generation_corrective_live_deliveries(workspace_id,delivery_id)
    on delete restrict
);

create index if not exists workspace_continuation_generation_live_recent_idx
  on app.workspace_continuation_generation_corrective_live_deliveries(workspace_id,updated_at desc);

grant select,insert on app.workspace_continuation_generation_corrective_delivery_activations to ai_data_runtime;
grant update (status,revoked_by,revoked_at,revocation_note)
  on app.workspace_continuation_generation_corrective_delivery_activations to ai_data_runtime;

grant select,insert on app.workspace_continuation_generation_corrective_live_deliveries to ai_data_runtime;
grant update (
  status,attempt_count,validation_code,http_status,consumer_received_at,
  acknowledgement,last_attempt_at,updated_at
) on app.workspace_continuation_generation_corrective_live_deliveries to ai_data_runtime;

alter table app.workspace_continuation_generation_corrective_delivery_activations enable row level security;
alter table app.workspace_continuation_generation_corrective_live_deliveries enable row level security;

drop policy if exists continuation_generation_activations_member_select
  on app.workspace_continuation_generation_corrective_delivery_activations;
create policy continuation_generation_activations_member_select
on app.workspace_continuation_generation_corrective_delivery_activations
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_continuation_generation_corrective_delivery_activations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists continuation_generation_activations_manager_insert
  on app.workspace_continuation_generation_corrective_delivery_activations;
create policy continuation_generation_activations_manager_insert
on app.workspace_continuation_generation_corrective_delivery_activations
for insert to ai_data_runtime
with check (
  activated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_continuation_generation_corrective_delivery_plans p
    join app.workspace_successive_generation_recurrence_triage_cycles t
      on t.workspace_id=p.workspace_id
     and t.successive_generation_retriage_id=p.successive_generation_retriage_id
    join app.workspace_reconciliation_successive_generation_recurrences recurrence
      on recurrence.workspace_id=p.workspace_id
     and recurrence.successive_generation_recurrence_id=p.successive_generation_recurrence_id
    join app.workspace_post_successive_generation_reclosure_checks regression
      on regression.workspace_id=p.workspace_id
     and regression.successive_generation_reclosure_regression_check_id=p.successive_generation_reclosure_regression_check_id
    join app.workspace_reconciliation_successive_generation_reclosures reclosure
      on reclosure.workspace_id=p.workspace_id
     and reclosure.successive_generation_reclosure_id=p.successive_generation_reclosure_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    join app.workspace_successive_generation_corrective_delivery_plans predecessor_plan
      on predecessor_plan.workspace_id=p.workspace_id
     and predecessor_plan.successive_generation_plan_id=p.predecessor_successive_generation_plan_id
    join app.workspace_successive_generation_corrective_live_deliveries predecessor_delivery
      on predecessor_delivery.workspace_id=p.workspace_id
     and predecessor_delivery.delivery_id=p.predecessor_successive_generation_delivery_id
    where p.workspace_id=workspace_continuation_generation_corrective_delivery_activations.workspace_id
      and p.continuation_generation_plan_id=workspace_continuation_generation_corrective_delivery_activations.continuation_generation_plan_id
      and p.successive_generation_retriage_id=workspace_continuation_generation_corrective_delivery_activations.successive_generation_retriage_id
      and p.successive_generation_recurrence_id=workspace_continuation_generation_corrective_delivery_activations.successive_generation_recurrence_id
      and p.successive_generation_reclosure_id=workspace_continuation_generation_corrective_delivery_activations.successive_generation_reclosure_id
      and p.successive_generation_reclosure_regression_check_id=workspace_continuation_generation_corrective_delivery_activations.successive_generation_reclosure_regression_check_id
      and p.case_id=workspace_continuation_generation_corrective_delivery_activations.case_id
      and p.target=workspace_continuation_generation_corrective_delivery_activations.target
      and p.status='approved'
      and p.plan_fingerprint=workspace_continuation_generation_corrective_delivery_activations.continuation_generation_plan_fingerprint
      and p.source_successive_generation_recurrence_fingerprint=workspace_continuation_generation_corrective_delivery_activations.source_successive_generation_recurrence_fingerprint
      and p.source_regression_fingerprint=workspace_continuation_generation_corrective_delivery_activations.source_regression_fingerprint
      and p.source_successive_generation_reclosure_fingerprint=workspace_continuation_generation_corrective_delivery_activations.source_successive_generation_reclosure_fingerprint
      and p.predecessor_successive_generation_plan_id=workspace_continuation_generation_corrective_delivery_activations.predecessor_successive_generation_plan_id
      and p.predecessor_successive_generation_delivery_id=workspace_continuation_generation_corrective_delivery_activations.predecessor_successive_generation_delivery_id
      and t.status='approved'
      and recurrence.successive_generation_recurrence_fingerprint=p.source_successive_generation_recurrence_fingerprint
      and recurrence.regression_fingerprint=p.source_regression_fingerprint
      and recurrence.successive_generation_reclosure_fingerprint=p.source_successive_generation_reclosure_fingerprint
      and regression.status='recurred'
      and regression.verification_fingerprint=p.source_regression_fingerprint
      and reclosure.successive_generation_reclosure_fingerprint=p.source_successive_generation_reclosure_fingerprint
      and c.status='open'
      and predecessor_plan.status='approved'
      and predecessor_delivery.status='accepted'
      and predecessor_delivery.delivery_id=workspace_continuation_generation_corrective_delivery_activations.predecessor_successive_generation_delivery_id
      and predecessor_delivery.consumer_id=workspace_continuation_generation_corrective_delivery_activations.consumer_id
      and predecessor_delivery.successive_generation_package_id=workspace_continuation_generation_corrective_delivery_activations.predecessor_successive_generation_package_id
      and predecessor_delivery.successive_generation_replay_key=workspace_continuation_generation_corrective_delivery_activations.predecessor_successive_generation_replay_key
      and predecessor_delivery.successive_generation_package_fingerprint=workspace_continuation_generation_corrective_delivery_activations.predecessor_successive_generation_package_fingerprint
      and recurrence.successive_generation_recurrence_id=(
        select newest.successive_generation_recurrence_id
        from app.workspace_reconciliation_successive_generation_recurrences newest
        where newest.workspace_id=recurrence.workspace_id
          and newest.case_id=recurrence.case_id
        order by newest.recurred_at desc,newest.successive_generation_recurrence_id desc
        limit 1
      )
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_continuation_generation_corrective_delivery_activations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists continuation_generation_activations_manager_update
  on app.workspace_continuation_generation_corrective_delivery_activations;
create policy continuation_generation_activations_manager_update
on app.workspace_continuation_generation_corrective_delivery_activations
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_continuation_generation_corrective_delivery_activations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_continuation_generation_corrective_delivery_activations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists continuation_generation_deliveries_member_select
  on app.workspace_continuation_generation_corrective_live_deliveries;
create policy continuation_generation_deliveries_member_select
on app.workspace_continuation_generation_corrective_live_deliveries
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_continuation_generation_corrective_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists continuation_generation_deliveries_manager_insert
  on app.workspace_continuation_generation_corrective_live_deliveries;
create policy continuation_generation_deliveries_manager_insert
on app.workspace_continuation_generation_corrective_live_deliveries
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_continuation_generation_corrective_delivery_activations a
    join app.workspace_continuation_generation_corrective_delivery_plans p
      on p.workspace_id=a.workspace_id
     and p.continuation_generation_plan_id=a.continuation_generation_plan_id
    join app.workspace_successive_generation_recurrence_triage_cycles t
      on t.workspace_id=p.workspace_id
     and t.successive_generation_retriage_id=p.successive_generation_retriage_id
    join app.workspace_reconciliation_successive_generation_recurrences recurrence
      on recurrence.workspace_id=p.workspace_id
     and recurrence.successive_generation_recurrence_id=p.successive_generation_recurrence_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    where a.workspace_id=workspace_continuation_generation_corrective_live_deliveries.workspace_id
      and a.activation_id=workspace_continuation_generation_corrective_live_deliveries.activation_id
      and a.continuation_generation_plan_id=workspace_continuation_generation_corrective_live_deliveries.continuation_generation_plan_id
      and a.predecessor_successive_generation_delivery_id=workspace_continuation_generation_corrective_live_deliveries.predecessor_successive_generation_delivery_id
      and a.target=workspace_continuation_generation_corrective_live_deliveries.target
      and a.consumer_id=workspace_continuation_generation_corrective_live_deliveries.consumer_id
      and a.continuation_generation_plan_fingerprint=workspace_continuation_generation_corrective_live_deliveries.continuation_generation_plan_fingerprint
      and a.activation_fingerprint=workspace_continuation_generation_corrective_live_deliveries.activation_fingerprint
      and a.continuation_generation_package_id=workspace_continuation_generation_corrective_live_deliveries.continuation_generation_package_id
      and a.continuation_generation_replay_key=workspace_continuation_generation_corrective_live_deliveries.continuation_generation_replay_key
      and a.continuation_generation_package_fingerprint=workspace_continuation_generation_corrective_live_deliveries.continuation_generation_package_fingerprint
      and workspace_continuation_generation_corrective_live_deliveries.idempotency_key=a.continuation_generation_replay_key
      and a.status='active'
      and a.expires_at>now()
      and p.status='approved'
      and t.status='approved'
      and c.status='open'
      and recurrence.successive_generation_recurrence_id=(
        select newest.successive_generation_recurrence_id
        from app.workspace_reconciliation_successive_generation_recurrences newest
        where newest.workspace_id=recurrence.workspace_id
          and newest.case_id=recurrence.case_id
        order by newest.recurred_at desc,newest.successive_generation_recurrence_id desc
        limit 1
      )
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_continuation_generation_corrective_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists continuation_generation_deliveries_manager_update
  on app.workspace_continuation_generation_corrective_live_deliveries;
create policy continuation_generation_deliveries_manager_update
on app.workspace_continuation_generation_corrective_live_deliveries
for update to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_continuation_generation_corrective_delivery_plans p
    join app.workspace_successive_generation_recurrence_triage_cycles t
      on t.workspace_id=p.workspace_id
     and t.successive_generation_retriage_id=p.successive_generation_retriage_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    where p.workspace_id=workspace_continuation_generation_corrective_live_deliveries.workspace_id
      and p.continuation_generation_plan_id=workspace_continuation_generation_corrective_live_deliveries.continuation_generation_plan_id
      and p.status='approved'
      and t.status='approved'
      and c.status='open'
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_continuation_generation_corrective_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1
    from app.workspace_continuation_generation_corrective_delivery_plans p
    join app.workspace_successive_generation_recurrence_triage_cycles t
      on t.workspace_id=p.workspace_id
     and t.successive_generation_retriage_id=p.successive_generation_retriage_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    where p.workspace_id=workspace_continuation_generation_corrective_live_deliveries.workspace_id
      and p.continuation_generation_plan_id=workspace_continuation_generation_corrective_live_deliveries.continuation_generation_plan_id
      and p.status='approved'
      and t.status='approved'
      and c.status='open'
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_continuation_generation_corrective_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

create or replace function app.require_no_successive_execution_for_subsequent_recurrence()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from app.workspace_continuation_generation_corrective_delivery_activations activation
    where activation.workspace_id=new.workspace_id
      and activation.case_id=new.case_id
  ) then
    raise exception 'continuation_generation_execution_freezes_subsequent_recurrence_planning';
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_subsequent_retriage_successive_exec_guard
  on app.workspace_successive_generation_recurrence_triage_cycles;
create trigger workspace_subsequent_retriage_successive_exec_guard
before insert or update on app.workspace_successive_generation_recurrence_triage_cycles
for each row
execute function app.require_no_successive_execution_for_subsequent_recurrence();

drop trigger if exists workspace_successive_plan_execution_guard
  on app.workspace_continuation_generation_corrective_delivery_plans;
create trigger workspace_successive_plan_execution_guard
before insert or update on app.workspace_continuation_generation_corrective_delivery_plans
for each row
execute function app.require_no_successive_execution_for_subsequent_recurrence();
