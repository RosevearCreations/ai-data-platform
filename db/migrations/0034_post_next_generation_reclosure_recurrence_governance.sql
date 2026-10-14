create table if not exists app.workspace_post_next_generation_reclosure_regression_checks (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  next_generation_reclosure_regression_check_id uuid not null,
  next_generation_reclosure_id uuid not null,
  predecessor_reclosure_id uuid not null,
  recurrence_id uuid not null,
  case_id uuid not null,
  next_generation_plan_id uuid not null,
  next_generation_delivery_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 512),
  next_generation_reclosure_fingerprint text not null check (char_length(next_generation_reclosure_fingerprint) between 1 and 128),
  recurrence_fingerprint text not null check (char_length(recurrence_fingerprint) between 1 and 128),
  next_generation_plan_fingerprint text not null check (char_length(next_generation_plan_fingerprint) between 1 and 128),
  next_generation_package_id text not null check (char_length(next_generation_package_id) between 1 and 512),
  next_generation_replay_key text not null check (char_length(next_generation_replay_key) between 1 and 1024),
  next_generation_package_fingerprint text not null check (char_length(next_generation_package_fingerprint) between 1 and 128),
  status text not null check (status in ('stable','recurred','rejected','transport-error')),
  expected_record_count integer not null check (expected_record_count between 1 and 500),
  matched_count integer not null default 0 check (matched_count between 0 and 500),
  mismatched_count integer not null default 0 check (mismatched_count between 0 and 500),
  missing_count integer not null default 0 check (missing_count between 0 and 500),
  validation_code text not null check (char_length(validation_code) between 1 and 96),
  http_status integer check (http_status is null or http_status between 100 and 599),
  consumer_verified_at timestamptz,
  verification_fingerprint text not null check (char_length(verification_fingerprint) between 1 and 128),
  record_results jsonb not null default '[]'::jsonb check (
    jsonb_typeof(record_results)='array'
    and jsonb_array_length(record_results) <= 500
    and octet_length(record_results::text) <= 262144
  ),
  actor_user_id text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (workspace_id,next_generation_reclosure_regression_check_id),
  foreign key (workspace_id,next_generation_reclosure_id)
    references app.workspace_reconciliation_exception_next_generation_reclosures(workspace_id,next_generation_reclosure_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_reclosure_id)
    references app.workspace_reconciliation_exception_reclosures(workspace_id,reclosure_id)
    on delete restrict,
  foreign key (workspace_id,recurrence_id)
    references app.workspace_reconciliation_exception_recurrences(workspace_id,recurrence_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict,
  foreign key (workspace_id,next_generation_plan_id)
    references app.workspace_next_generation_corrective_delivery_plans(workspace_id,next_generation_plan_id)
    on delete restrict,
  foreign key (workspace_id,next_generation_delivery_id)
    references app.workspace_next_generation_corrective_live_deliveries(workspace_id,delivery_id)
    on delete restrict,
  check (
    (status in ('stable','recurred') and matched_count + mismatched_count + missing_count = expected_record_count)
    or
    (status in ('rejected','transport-error') and matched_count=0 and mismatched_count=0 and missing_count=0)
  )
);

create index if not exists workspace_post_next_generation_reclosure_checks_recent_idx
  on app.workspace_post_next_generation_reclosure_regression_checks(workspace_id,created_at desc);

create index if not exists workspace_post_next_generation_reclosure_checks_reclosure_idx
  on app.workspace_post_next_generation_reclosure_regression_checks(
    workspace_id,next_generation_reclosure_id,created_at desc,next_generation_reclosure_regression_check_id desc
  );

create table if not exists app.workspace_reconciliation_exception_next_generation_recurrences (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  next_generation_recurrence_id uuid not null,
  next_generation_reclosure_id uuid not null,
  next_generation_reclosure_regression_check_id uuid not null,
  predecessor_recurrence_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  next_generation_reclosure_fingerprint text not null check (char_length(next_generation_reclosure_fingerprint) between 1 and 128),
  regression_fingerprint text not null check (char_length(regression_fingerprint) between 1 and 128),
  next_generation_recurrence_fingerprint text not null check (char_length(next_generation_recurrence_fingerprint) between 1 and 128),
  recurrence_reason text not null check (char_length(recurrence_reason) between 1 and 8000),
  recurred_by text not null references auth."user"(id) on delete restrict,
  recurred_at timestamptz not null default now(),
  primary key (workspace_id,next_generation_recurrence_id),
  unique (workspace_id,next_generation_reclosure_id),
  foreign key (workspace_id,next_generation_reclosure_id)
    references app.workspace_reconciliation_exception_next_generation_reclosures(workspace_id,next_generation_reclosure_id)
    on delete restrict,
  foreign key (workspace_id,next_generation_reclosure_regression_check_id)
    references app.workspace_post_next_generation_reclosure_regression_checks(workspace_id,next_generation_reclosure_regression_check_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_recurrence_id)
    references app.workspace_reconciliation_exception_recurrences(workspace_id,recurrence_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict
);

create index if not exists workspace_next_generation_recurrences_recent_idx
  on app.workspace_reconciliation_exception_next_generation_recurrences(
    workspace_id,recurred_at desc,next_generation_recurrence_id desc
  );

grant select,insert on app.workspace_post_next_generation_reclosure_regression_checks to ai_data_runtime;
grant select,insert on app.workspace_reconciliation_exception_next_generation_recurrences to ai_data_runtime;

alter table app.workspace_post_next_generation_reclosure_regression_checks enable row level security;
alter table app.workspace_reconciliation_exception_next_generation_recurrences enable row level security;

drop policy if exists post_next_generation_reclosure_checks_member_select
  on app.workspace_post_next_generation_reclosure_regression_checks;
create policy post_next_generation_reclosure_checks_member_select
on app.workspace_post_next_generation_reclosure_regression_checks
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_post_next_generation_reclosure_regression_checks.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists post_next_generation_reclosure_checks_manager_insert
  on app.workspace_post_next_generation_reclosure_regression_checks;
create policy post_next_generation_reclosure_checks_manager_insert
on app.workspace_post_next_generation_reclosure_regression_checks
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_post_next_generation_reclosure_regression_checks.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
  and not exists (
    select 1
    from app.workspace_reconciliation_exception_next_generation_recurrences recurrence2
    where recurrence2.workspace_id=workspace_post_next_generation_reclosure_regression_checks.workspace_id
      and recurrence2.next_generation_reclosure_id=workspace_post_next_generation_reclosure_regression_checks.next_generation_reclosure_id
  )
  and exists (
    select 1
    from app.workspace_reconciliation_exception_next_generation_reclosures reclosure
    join app.workspace_next_generation_corrective_live_deliveries delivery
      on delivery.workspace_id=reclosure.workspace_id
     and delivery.delivery_id=reclosure.next_generation_delivery_id
    join app.workspace_next_generation_corrective_delivery_plans plan
      on plan.workspace_id=reclosure.workspace_id
     and plan.next_generation_plan_id=reclosure.next_generation_plan_id
    join app.workspace_reconciliation_exception_recurrences recurrence
      on recurrence.workspace_id=reclosure.workspace_id
     and recurrence.recurrence_id=reclosure.recurrence_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=reclosure.workspace_id and c.case_id=reclosure.case_id
    where reclosure.workspace_id=workspace_post_next_generation_reclosure_regression_checks.workspace_id
      and reclosure.next_generation_reclosure_id=workspace_post_next_generation_reclosure_regression_checks.next_generation_reclosure_id
      and reclosure.predecessor_reclosure_id=workspace_post_next_generation_reclosure_regression_checks.predecessor_reclosure_id
      and reclosure.recurrence_id=workspace_post_next_generation_reclosure_regression_checks.recurrence_id
      and reclosure.case_id=workspace_post_next_generation_reclosure_regression_checks.case_id
      and reclosure.next_generation_plan_id=workspace_post_next_generation_reclosure_regression_checks.next_generation_plan_id
      and reclosure.next_generation_delivery_id=workspace_post_next_generation_reclosure_regression_checks.next_generation_delivery_id
      and reclosure.target=workspace_post_next_generation_reclosure_regression_checks.target
      and reclosure.next_generation_reclosure_fingerprint=workspace_post_next_generation_reclosure_regression_checks.next_generation_reclosure_fingerprint
      and reclosure.recurrence_fingerprint=workspace_post_next_generation_reclosure_regression_checks.recurrence_fingerprint
      and reclosure.next_generation_plan_fingerprint=workspace_post_next_generation_reclosure_regression_checks.next_generation_plan_fingerprint
      and delivery.status='accepted'
      and delivery.consumer_id=workspace_post_next_generation_reclosure_regression_checks.consumer_id
      and delivery.next_generation_package_id=workspace_post_next_generation_reclosure_regression_checks.next_generation_package_id
      and delivery.next_generation_replay_key=workspace_post_next_generation_reclosure_regression_checks.next_generation_replay_key
      and delivery.next_generation_package_fingerprint=workspace_post_next_generation_reclosure_regression_checks.next_generation_package_fingerprint
      and plan.status='approved'
      and plan.plan_fingerprint=workspace_post_next_generation_reclosure_regression_checks.next_generation_plan_fingerprint
      and recurrence.recurrence_fingerprint=workspace_post_next_generation_reclosure_regression_checks.recurrence_fingerprint
      and c.status='closed'
      and reclosure.next_generation_reclosure_id=(
        select latest_reclosure.next_generation_reclosure_id
        from app.workspace_reconciliation_exception_next_generation_reclosures latest_reclosure
        where latest_reclosure.workspace_id=reclosure.workspace_id
          and latest_reclosure.case_id=reclosure.case_id
        order by latest_reclosure.closed_at desc,latest_reclosure.next_generation_reclosure_id desc
        limit 1
      )
  )
);

drop policy if exists next_generation_recurrences_member_select
  on app.workspace_reconciliation_exception_next_generation_recurrences;
create policy next_generation_recurrences_member_select
on app.workspace_reconciliation_exception_next_generation_recurrences
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_exception_next_generation_recurrences.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists next_generation_recurrences_manager_insert
  on app.workspace_reconciliation_exception_next_generation_recurrences;
create policy next_generation_recurrences_manager_insert
on app.workspace_reconciliation_exception_next_generation_recurrences
for insert to ai_data_runtime
with check (
  recurred_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_exception_next_generation_recurrences.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
  and exists (
    select 1
    from app.workspace_post_next_generation_reclosure_regression_checks regression
    join app.workspace_reconciliation_exception_next_generation_reclosures reclosure
      on reclosure.workspace_id=regression.workspace_id
     and reclosure.next_generation_reclosure_id=regression.next_generation_reclosure_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=regression.workspace_id and c.case_id=regression.case_id
    where regression.workspace_id=workspace_reconciliation_exception_next_generation_recurrences.workspace_id
      and regression.next_generation_reclosure_regression_check_id=workspace_reconciliation_exception_next_generation_recurrences.next_generation_reclosure_regression_check_id
      and regression.next_generation_reclosure_id=workspace_reconciliation_exception_next_generation_recurrences.next_generation_reclosure_id
      and regression.recurrence_id=workspace_reconciliation_exception_next_generation_recurrences.predecessor_recurrence_id
      and regression.case_id=workspace_reconciliation_exception_next_generation_recurrences.case_id
      and regression.target=workspace_reconciliation_exception_next_generation_recurrences.target
      and regression.next_generation_reclosure_fingerprint=workspace_reconciliation_exception_next_generation_recurrences.next_generation_reclosure_fingerprint
      and regression.verification_fingerprint=workspace_reconciliation_exception_next_generation_recurrences.regression_fingerprint
      and regression.status='recurred'
      and reclosure.next_generation_reclosure_fingerprint=workspace_reconciliation_exception_next_generation_recurrences.next_generation_reclosure_fingerprint
      and c.status='closed'
      and regression.next_generation_reclosure_regression_check_id=(
        select latest_check.next_generation_reclosure_regression_check_id
        from app.workspace_post_next_generation_reclosure_regression_checks latest_check
        where latest_check.workspace_id=regression.workspace_id
          and latest_check.next_generation_reclosure_id=regression.next_generation_reclosure_id
        order by latest_check.created_at desc,latest_check.next_generation_reclosure_regression_check_id desc
        limit 1
      )
      and reclosure.next_generation_reclosure_id=(
        select latest_reclosure.next_generation_reclosure_id
        from app.workspace_reconciliation_exception_next_generation_reclosures latest_reclosure
        where latest_reclosure.workspace_id=reclosure.workspace_id
          and latest_reclosure.case_id=reclosure.case_id
        order by latest_reclosure.closed_at desc,latest_reclosure.next_generation_reclosure_id desc
        limit 1
      )
  )
);

create or replace function app.require_governed_exception_reopen()
returns trigger
language plpgsql
as $$
begin
  if old.status='closed' and new.status is distinct from 'closed' then
    if not exists (
      select 1
      from app.workspace_reconciliation_exception_reopens reopen
      where reopen.workspace_id=new.workspace_id
        and reopen.case_id=new.case_id
        and reopen.reopened_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1
      from app.workspace_reconciliation_exception_recurrences recurrence
      where recurrence.workspace_id=new.workspace_id
        and recurrence.case_id=new.case_id
        and recurrence.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1
      from app.workspace_reconciliation_exception_next_generation_recurrences recurrence2
      where recurrence2.workspace_id=new.workspace_id
        and recurrence2.case_id=new.case_id
        and recurrence2.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    ) then
      raise exception 'reconciliation_exception_governed_reopen_required';
    end if;
  end if;
  return new;
end;
$$;

create or replace function app.require_no_next_generation_recurrence_for_case()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from app.workspace_reconciliation_exception_next_generation_recurrences recurrence2
    where recurrence2.workspace_id=new.workspace_id
      and recurrence2.case_id=new.case_id
  ) then
    raise exception 'next_generation_cycle_recurrence_requires_new_generation';
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_next_generation_activation_recurrence_guard
  on app.workspace_next_generation_corrective_delivery_activations;
create trigger workspace_next_generation_activation_recurrence_guard
before insert or update on app.workspace_next_generation_corrective_delivery_activations
for each row
execute function app.require_no_next_generation_recurrence_for_case();

drop trigger if exists workspace_next_generation_reconciliation_recurrence_guard
  on app.workspace_next_generation_corrective_delivery_reconciliations;
create trigger workspace_next_generation_reconciliation_recurrence_guard
before insert or update on app.workspace_next_generation_corrective_delivery_reconciliations
for each row
execute function app.require_no_next_generation_recurrence_for_case();

drop trigger if exists workspace_next_generation_reclosure_recurrence_guard
  on app.workspace_reconciliation_exception_next_generation_reclosures;
create trigger workspace_next_generation_reclosure_recurrence_guard
before insert or update on app.workspace_reconciliation_exception_next_generation_reclosures
for each row
execute function app.require_no_next_generation_recurrence_for_case();

create or replace function app.require_no_next_generation_recurrence_for_delivery()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from app.workspace_next_generation_corrective_delivery_plans plan
    join app.workspace_reconciliation_exception_next_generation_recurrences recurrence2
      on recurrence2.workspace_id=plan.workspace_id
     and recurrence2.case_id=plan.case_id
    where plan.workspace_id=new.workspace_id
      and plan.next_generation_plan_id=new.next_generation_plan_id
  ) then
    raise exception 'next_generation_cycle_recurrence_requires_new_generation';
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_next_generation_delivery_recurrence_guard
  on app.workspace_next_generation_corrective_live_deliveries;
create trigger workspace_next_generation_delivery_recurrence_guard
before insert or update on app.workspace_next_generation_corrective_live_deliveries
for each row
execute function app.require_no_next_generation_recurrence_for_delivery();
