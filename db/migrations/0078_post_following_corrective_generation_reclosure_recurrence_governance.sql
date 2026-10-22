create table if not exists app.workspace_post_following_corrective_generation_reclosure_checks (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  following_corrective_generation_reclosure_regression_check_id uuid not null,
  following_corrective_generation_reclosure_id uuid not null,
  predecessor_next_corrective_generation_reclosure_id uuid not null,
  next_corrective_generation_recurrence_id uuid not null,
  case_id uuid not null,
  following_corrective_generation_plan_id uuid not null,
  following_corrective_generation_delivery_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 512),
  following_corrective_generation_reclosure_fingerprint text not null check (char_length(following_corrective_generation_reclosure_fingerprint) between 1 and 128),
  next_corrective_generation_recurrence_fingerprint text not null check (char_length(next_corrective_generation_recurrence_fingerprint) between 1 and 128),
  following_corrective_generation_plan_fingerprint text not null check (char_length(following_corrective_generation_plan_fingerprint) between 1 and 128),
  following_corrective_generation_package_id text not null check (char_length(following_corrective_generation_package_id) between 1 and 512),
  following_corrective_generation_replay_key text not null check (char_length(following_corrective_generation_replay_key) between 1 and 1024),
  following_corrective_generation_package_fingerprint text not null check (char_length(following_corrective_generation_package_fingerprint) between 1 and 128),
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
  primary key (workspace_id,following_corrective_generation_reclosure_regression_check_id),
  foreign key (workspace_id,following_corrective_generation_reclosure_id)
    references app.workspace_reconciliation_following_corrective_generation_reclosures(workspace_id,following_corrective_generation_reclosure_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_next_corrective_generation_reclosure_id)
    references app.workspace_reconciliation_next_corrective_generation_reclosures(workspace_id,next_corrective_generation_reclosure_id)
    on delete restrict,
  foreign key (workspace_id,next_corrective_generation_recurrence_id)
    references app.workspace_reconciliation_next_corrective_generation_recurrences(workspace_id,next_corrective_generation_recurrence_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict,
  foreign key (workspace_id,following_corrective_generation_plan_id)
    references app.workspace_following_corrective_generation_plans(workspace_id,following_corrective_generation_plan_id)
    on delete restrict,
  foreign key (workspace_id,following_corrective_generation_delivery_id)
    references app.workspace_following_corrective_generation_live_deliveries(workspace_id,delivery_id)
    on delete restrict,
  check (
    (status in ('stable','recurred') and matched_count + mismatched_count + missing_count = expected_record_count)
    or
    (status in ('rejected','transport-error') and matched_count=0 and mismatched_count=0 and missing_count=0)
  )
);

create index if not exists workspace_post_ncg_reclosure_checks_recent_idx
  on app.workspace_post_following_corrective_generation_reclosure_checks(workspace_id,created_at desc);

create index if not exists workspace_post_ncg_reclosure_checks_reclosure_idx
  on app.workspace_post_following_corrective_generation_reclosure_checks(
    workspace_id,following_corrective_generation_reclosure_id,created_at desc,following_corrective_generation_reclosure_regression_check_id desc
  );

create table if not exists app.workspace_reconciliation_following_corrective_generation_recurrences (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  following_corrective_generation_recurrence_id uuid not null,
  following_corrective_generation_reclosure_id uuid not null,
  following_corrective_generation_reclosure_regression_check_id uuid not null,
  predecessor_next_corrective_generation_recurrence_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  following_corrective_generation_reclosure_fingerprint text not null check (char_length(following_corrective_generation_reclosure_fingerprint) between 1 and 128),
  regression_fingerprint text not null check (char_length(regression_fingerprint) between 1 and 128),
  following_corrective_generation_recurrence_fingerprint text not null check (char_length(following_corrective_generation_recurrence_fingerprint) between 1 and 128),
  recurrence_reason text not null check (char_length(recurrence_reason) between 1 and 8000),
  recurred_by text not null references auth."user"(id) on delete restrict,
  recurred_at timestamptz not null default now(),
  primary key (workspace_id,following_corrective_generation_recurrence_id),
  unique (workspace_id,following_corrective_generation_reclosure_id),
  foreign key (workspace_id,following_corrective_generation_reclosure_id)
    references app.workspace_reconciliation_following_corrective_generation_reclosures(workspace_id,following_corrective_generation_reclosure_id)
    on delete restrict,
  foreign key (workspace_id,following_corrective_generation_reclosure_regression_check_id)
    references app.workspace_post_following_corrective_generation_reclosure_checks(workspace_id,following_corrective_generation_reclosure_regression_check_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_next_corrective_generation_recurrence_id)
    references app.workspace_reconciliation_next_corrective_generation_recurrences(workspace_id,next_corrective_generation_recurrence_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict
);

create index if not exists workspace_ncg_recurrences_recent_idx
  on app.workspace_reconciliation_following_corrective_generation_recurrences(
    workspace_id,recurred_at desc,following_corrective_generation_recurrence_id desc
  );

grant select,insert on app.workspace_post_following_corrective_generation_reclosure_checks to ai_data_runtime;
grant select,insert on app.workspace_reconciliation_following_corrective_generation_recurrences to ai_data_runtime;

alter table app.workspace_post_following_corrective_generation_reclosure_checks enable row level security;
alter table app.workspace_reconciliation_following_corrective_generation_recurrences enable row level security;

drop policy if exists post_following_corrective_generation_reclosure_checks_member_select
  on app.workspace_post_following_corrective_generation_reclosure_checks;
create policy post_following_corrective_generation_reclosure_checks_member_select
on app.workspace_post_following_corrective_generation_reclosure_checks
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_post_following_corrective_generation_reclosure_checks.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists post_following_corrective_generation_reclosure_checks_manager_insert
  on app.workspace_post_following_corrective_generation_reclosure_checks;
create policy post_following_corrective_generation_reclosure_checks_manager_insert
on app.workspace_post_following_corrective_generation_reclosure_checks
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_post_following_corrective_generation_reclosure_checks.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
  and not exists (
    select 1
    from app.workspace_reconciliation_following_corrective_generation_recurrences recurrence2
    where recurrence2.workspace_id=workspace_post_following_corrective_generation_reclosure_checks.workspace_id
      and recurrence2.following_corrective_generation_reclosure_id=workspace_post_following_corrective_generation_reclosure_checks.following_corrective_generation_reclosure_id
  )
  and exists (
    select 1
    from app.workspace_reconciliation_following_corrective_generation_reclosures reclosure
    join app.workspace_following_corrective_generation_live_deliveries delivery
      on delivery.workspace_id=reclosure.workspace_id
     and delivery.delivery_id=reclosure.following_corrective_generation_delivery_id
    join app.workspace_following_corrective_generation_plans plan
      on plan.workspace_id=reclosure.workspace_id
     and plan.following_corrective_generation_plan_id=reclosure.following_corrective_generation_plan_id
    join app.workspace_reconciliation_next_corrective_generation_recurrences recurrence
      on recurrence.workspace_id=reclosure.workspace_id
     and recurrence.next_corrective_generation_recurrence_id=reclosure.next_corrective_generation_recurrence_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=reclosure.workspace_id and c.case_id=reclosure.case_id
    where reclosure.workspace_id=workspace_post_following_corrective_generation_reclosure_checks.workspace_id
      and reclosure.following_corrective_generation_reclosure_id=workspace_post_following_corrective_generation_reclosure_checks.following_corrective_generation_reclosure_id
      and reclosure.predecessor_next_corrective_generation_reclosure_id=workspace_post_following_corrective_generation_reclosure_checks.predecessor_next_corrective_generation_reclosure_id
      and reclosure.next_corrective_generation_recurrence_id=workspace_post_following_corrective_generation_reclosure_checks.next_corrective_generation_recurrence_id
      and reclosure.case_id=workspace_post_following_corrective_generation_reclosure_checks.case_id
      and reclosure.following_corrective_generation_plan_id=workspace_post_following_corrective_generation_reclosure_checks.following_corrective_generation_plan_id
      and reclosure.following_corrective_generation_delivery_id=workspace_post_following_corrective_generation_reclosure_checks.following_corrective_generation_delivery_id
      and reclosure.target=workspace_post_following_corrective_generation_reclosure_checks.target
      and reclosure.following_corrective_generation_reclosure_fingerprint=workspace_post_following_corrective_generation_reclosure_checks.following_corrective_generation_reclosure_fingerprint
      and reclosure.next_corrective_generation_recurrence_fingerprint=workspace_post_following_corrective_generation_reclosure_checks.next_corrective_generation_recurrence_fingerprint
      and reclosure.following_corrective_generation_plan_fingerprint=workspace_post_following_corrective_generation_reclosure_checks.following_corrective_generation_plan_fingerprint
      and delivery.status='accepted'
      and delivery.consumer_id=workspace_post_following_corrective_generation_reclosure_checks.consumer_id
      and delivery.following_corrective_generation_package_id=workspace_post_following_corrective_generation_reclosure_checks.following_corrective_generation_package_id
      and delivery.following_corrective_generation_replay_key=workspace_post_following_corrective_generation_reclosure_checks.following_corrective_generation_replay_key
      and delivery.following_corrective_generation_package_fingerprint=workspace_post_following_corrective_generation_reclosure_checks.following_corrective_generation_package_fingerprint
      and plan.status='approved'
      and plan.plan_fingerprint=workspace_post_following_corrective_generation_reclosure_checks.following_corrective_generation_plan_fingerprint
      and recurrence.next_corrective_generation_recurrence_fingerprint=workspace_post_following_corrective_generation_reclosure_checks.next_corrective_generation_recurrence_fingerprint
      and c.status='closed'
      and reclosure.following_corrective_generation_reclosure_id=(
        select latest_reclosure.following_corrective_generation_reclosure_id
        from app.workspace_reconciliation_following_corrective_generation_reclosures latest_reclosure
        where latest_reclosure.workspace_id=reclosure.workspace_id
          and latest_reclosure.case_id=reclosure.case_id
        order by latest_reclosure.closed_at desc,latest_reclosure.following_corrective_generation_reclosure_id desc
        limit 1
      )
  )
);

drop policy if exists following_corrective_generation_recurrences_member_select
  on app.workspace_reconciliation_following_corrective_generation_recurrences;
create policy following_corrective_generation_recurrences_member_select
on app.workspace_reconciliation_following_corrective_generation_recurrences
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_following_corrective_generation_recurrences.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists following_corrective_generation_recurrences_manager_insert
  on app.workspace_reconciliation_following_corrective_generation_recurrences;
create policy following_corrective_generation_recurrences_manager_insert
on app.workspace_reconciliation_following_corrective_generation_recurrences
for insert to ai_data_runtime
with check (
  recurred_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_following_corrective_generation_recurrences.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
  and exists (
    select 1
    from app.workspace_post_following_corrective_generation_reclosure_checks regression
    join app.workspace_reconciliation_following_corrective_generation_reclosures reclosure
      on reclosure.workspace_id=regression.workspace_id
     and reclosure.following_corrective_generation_reclosure_id=regression.following_corrective_generation_reclosure_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=regression.workspace_id and c.case_id=regression.case_id
    where regression.workspace_id=workspace_reconciliation_following_corrective_generation_recurrences.workspace_id
      and regression.following_corrective_generation_reclosure_regression_check_id=workspace_reconciliation_following_corrective_generation_recurrences.following_corrective_generation_reclosure_regression_check_id
      and regression.following_corrective_generation_reclosure_id=workspace_reconciliation_following_corrective_generation_recurrences.following_corrective_generation_reclosure_id
      and regression.next_corrective_generation_recurrence_id=workspace_reconciliation_following_corrective_generation_recurrences.predecessor_next_corrective_generation_recurrence_id
      and regression.case_id=workspace_reconciliation_following_corrective_generation_recurrences.case_id
      and regression.target=workspace_reconciliation_following_corrective_generation_recurrences.target
      and regression.following_corrective_generation_reclosure_fingerprint=workspace_reconciliation_following_corrective_generation_recurrences.following_corrective_generation_reclosure_fingerprint
      and regression.verification_fingerprint=workspace_reconciliation_following_corrective_generation_recurrences.regression_fingerprint
      and regression.status='recurred'
      and reclosure.following_corrective_generation_reclosure_fingerprint=workspace_reconciliation_following_corrective_generation_recurrences.following_corrective_generation_reclosure_fingerprint
      and c.status='closed'
      and regression.following_corrective_generation_reclosure_regression_check_id=(
        select latest_check.following_corrective_generation_reclosure_regression_check_id
        from app.workspace_post_following_corrective_generation_reclosure_checks latest_check
        where latest_check.workspace_id=regression.workspace_id
          and latest_check.following_corrective_generation_reclosure_id=regression.following_corrective_generation_reclosure_id
        order by latest_check.created_at desc,latest_check.following_corrective_generation_reclosure_regression_check_id desc
        limit 1
      )
      and reclosure.following_corrective_generation_reclosure_id=(
        select latest_reclosure.following_corrective_generation_reclosure_id
        from app.workspace_reconciliation_following_corrective_generation_reclosures latest_reclosure
        where latest_reclosure.workspace_id=reclosure.workspace_id
          and latest_reclosure.case_id=reclosure.case_id
        order by latest_reclosure.closed_at desc,latest_reclosure.following_corrective_generation_reclosure_id desc
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
      select 1 from app.workspace_reconciliation_exception_reopens x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.reopened_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1 from app.workspace_reconciliation_exception_recurrences x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1 from app.workspace_reconciliation_exception_next_generation_recurrences x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1 from app.workspace_reconciliation_successor_generation_recurrences x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1 from app.workspace_reconciliation_subsequent_generation_recurrences x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1 from app.workspace_reconciliation_successive_generation_recurrences x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1 from app.workspace_reconciliation_continuation_generation_recurrences x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1 from app.workspace_reconciliation_next_cycle_recurrences x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1 from app.workspace_reconciliation_following_cycle_recurrences x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1 from app.workspace_reconciliation_subsequent_cycle_recurrences x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1 from app.workspace_reconciliation_successive_cycle_recurrences x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1 from app.workspace_reconciliation_next_corrective_generation_recurrences x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1 from app.workspace_reconciliation_following_corrective_generation_recurrences x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    ) then
      raise exception 'reconciliation_exception_governed_reopen_required';
    end if;
  end if;
  return new;
end;
$$;

create or replace function app.require_no_following_corrective_generation_recurrence_for_case()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from app.workspace_reconciliation_following_corrective_generation_recurrences recurrence4
    where recurrence4.workspace_id=new.workspace_id
      and recurrence4.case_id=new.case_id
  ) then
    raise exception 'following_corrective_generation_recurrence_requires_new_generation';
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_ncg_activation_recurrence_guard
  on app.workspace_following_corrective_generation_delivery_activations;
create trigger workspace_ncg_activation_recurrence_guard
before insert or update on app.workspace_following_corrective_generation_delivery_activations
for each row
execute function app.require_no_following_corrective_generation_recurrence_for_case();

drop trigger if exists workspace_ncg_reconciliation_recurrence_guard
  on app.workspace_following_corrective_generation_delivery_reconciliations;
create trigger workspace_ncg_reconciliation_recurrence_guard
before insert or update on app.workspace_following_corrective_generation_delivery_reconciliations
for each row
execute function app.require_no_following_corrective_generation_recurrence_for_case();

drop trigger if exists workspace_ncg_reclosure_recurrence_guard
  on app.workspace_reconciliation_following_corrective_generation_reclosures;
create trigger workspace_ncg_reclosure_recurrence_guard
before insert or update on app.workspace_reconciliation_following_corrective_generation_reclosures
for each row
execute function app.require_no_following_corrective_generation_recurrence_for_case();

drop trigger if exists workspace_ncg_plan_recurrence_guard
  on app.workspace_following_corrective_generation_plans;
create trigger workspace_ncg_plan_recurrence_guard
before insert or update on app.workspace_following_corrective_generation_plans
for each row
execute function app.require_no_following_corrective_generation_recurrence_for_case();

drop trigger if exists workspace_contcycle_retriage_ncg_recur_guard
  on app.workspace_next_corrective_generation_recurrence_triage;
create trigger workspace_contcycle_retriage_ncg_recur_guard
before insert or update on app.workspace_next_corrective_generation_recurrence_triage
for each row
execute function app.require_no_following_corrective_generation_recurrence_for_case();

create or replace function app.require_no_following_corrective_generation_recurrence_for_delivery()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from app.workspace_following_corrective_generation_plans plan
    join app.workspace_reconciliation_following_corrective_generation_recurrences recurrence4
      on recurrence4.workspace_id=plan.workspace_id
     and recurrence4.case_id=plan.case_id
    where plan.workspace_id=new.workspace_id
      and plan.following_corrective_generation_plan_id=new.following_corrective_generation_plan_id
  ) then
    raise exception 'following_corrective_generation_recurrence_requires_new_generation';
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_ncg_delivery_recurrence_guard
  on app.workspace_following_corrective_generation_live_deliveries;
create trigger workspace_ncg_delivery_recurrence_guard
before insert or update on app.workspace_following_corrective_generation_live_deliveries
for each row
execute function app.require_no_following_corrective_generation_recurrence_for_delivery();

create or replace function app.require_verified_corrective_closure()
returns trigger
language plpgsql
as $$
begin
  if new.status='closed' and old.status is distinct from 'closed' then
    if exists (
      select 1 from app.workspace_reconciliation_following_corrective_generation_recurrences r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      raise exception 'reconciliation_triage_post_following_corrective_generation_reclosure_required';
    elsif exists (
      select 1 from app.workspace_reconciliation_next_corrective_generation_recurrences r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      if not exists (
        select 1 from app.workspace_reconciliation_following_corrective_generation_reclosures rc
        where rc.workspace_id=new.workspace_id and rc.case_id=new.case_id
          and rc.next_corrective_generation_recurrence_id=(
            select lr.next_corrective_generation_recurrence_id
            from app.workspace_reconciliation_next_corrective_generation_recurrences lr
            where lr.workspace_id=new.workspace_id and lr.case_id=new.case_id
            order by lr.recurred_at desc,lr.next_corrective_generation_recurrence_id desc limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_following_corrective_generation_reclosure_required';
      end if;
    elsif exists (
      select 1 from app.workspace_reconciliation_successive_cycle_recurrences r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      if not exists (
        select 1 from app.workspace_reconciliation_next_corrective_generation_reclosures rc
        where rc.workspace_id=new.workspace_id and rc.case_id=new.case_id
          and rc.successive_cycle_recurrence_id=(
            select lr.successive_cycle_recurrence_id
            from app.workspace_reconciliation_successive_cycle_recurrences lr
            where lr.workspace_id=new.workspace_id and lr.case_id=new.case_id
            order by lr.recurred_at desc,lr.successive_cycle_recurrence_id desc limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_next_corrective_generation_reclosure_required';
      end if;
    elsif exists (
      select 1 from app.workspace_reconciliation_subsequent_cycle_recurrences r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      if not exists (
        select 1 from app.workspace_reconciliation_successive_cycle_reclosures rc
        where rc.workspace_id=new.workspace_id and rc.case_id=new.case_id
          and rc.subsequent_cycle_recurrence_id=(
            select lr.subsequent_cycle_recurrence_id
            from app.workspace_reconciliation_subsequent_cycle_recurrences lr
            where lr.workspace_id=new.workspace_id and lr.case_id=new.case_id
            order by lr.recurred_at desc,lr.subsequent_cycle_recurrence_id desc limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_successive_cycle_reclosure_required';
      end if;
    elsif exists (
      select 1 from app.workspace_reconciliation_following_cycle_recurrences r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      if not exists (
        select 1 from app.workspace_reconciliation_subsequent_cycle_reclosures rc
        where rc.workspace_id=new.workspace_id and rc.case_id=new.case_id
          and rc.following_cycle_recurrence_id=(
            select lr.following_cycle_recurrence_id
            from app.workspace_reconciliation_following_cycle_recurrences lr
            where lr.workspace_id=new.workspace_id and lr.case_id=new.case_id
            order by lr.recurred_at desc,lr.following_cycle_recurrence_id desc limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_subsequent_cycle_reclosure_required';
      end if;
    elsif exists (
      select 1 from app.workspace_reconciliation_next_cycle_recurrences r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      if not exists (
        select 1 from app.workspace_reconciliation_following_cycle_reclosures rc
        where rc.workspace_id=new.workspace_id and rc.case_id=new.case_id
          and rc.next_cycle_recurrence_id=(
            select lr.next_cycle_recurrence_id
            from app.workspace_reconciliation_next_cycle_recurrences lr
            where lr.workspace_id=new.workspace_id and lr.case_id=new.case_id
            order by lr.recurred_at desc,lr.next_cycle_recurrence_id desc limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_following_cycle_reclosure_required';
      end if;
    elsif exists (
      select 1 from app.workspace_reconciliation_continuation_generation_recurrences r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      if not exists (
        select 1 from app.workspace_reconciliation_next_cycle_reclosures rc
        where rc.workspace_id=new.workspace_id and rc.case_id=new.case_id
          and rc.continuation_generation_recurrence_id=(
            select lr.continuation_generation_recurrence_id
            from app.workspace_reconciliation_continuation_generation_recurrences lr
            where lr.workspace_id=new.workspace_id and lr.case_id=new.case_id
            order by lr.recurred_at desc,lr.continuation_generation_recurrence_id desc limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_next_cycle_reclosure_required';
      end if;
    elsif exists (
      select 1 from app.workspace_reconciliation_successive_generation_recurrences r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      if not exists (
        select 1 from app.workspace_reconciliation_continuation_generation_reclosures rc
        where rc.workspace_id=new.workspace_id and rc.case_id=new.case_id
          and rc.successive_generation_recurrence_id=(
            select lr.successive_generation_recurrence_id
            from app.workspace_reconciliation_successive_generation_recurrences lr
            where lr.workspace_id=new.workspace_id and lr.case_id=new.case_id
            order by lr.recurred_at desc,lr.successive_generation_recurrence_id desc limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_continuation_generation_reclosure_required';
      end if;
    elsif exists (
      select 1 from app.workspace_reconciliation_subsequent_generation_recurrences r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      if not exists (
        select 1 from app.workspace_reconciliation_successive_generation_reclosures rc
        where rc.workspace_id=new.workspace_id and rc.case_id=new.case_id
          and rc.subsequent_generation_recurrence_id=(
            select lr.subsequent_generation_recurrence_id
            from app.workspace_reconciliation_subsequent_generation_recurrences lr
            where lr.workspace_id=new.workspace_id and lr.case_id=new.case_id
            order by lr.recurred_at desc,lr.subsequent_generation_recurrence_id desc limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_successive_generation_reclosure_required';
      end if;
    elsif exists (
      select 1 from app.workspace_reconciliation_successor_generation_recurrences r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      if not exists (
        select 1 from app.workspace_reconciliation_subsequent_generation_reclosures rc
        where rc.workspace_id=new.workspace_id and rc.case_id=new.case_id
          and rc.successor_generation_recurrence_id=(
            select lr.successor_generation_recurrence_id
            from app.workspace_reconciliation_successor_generation_recurrences lr
            where lr.workspace_id=new.workspace_id and lr.case_id=new.case_id
            order by lr.recurred_at desc,lr.successor_generation_recurrence_id desc limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_subsequent_generation_reclosure_required';
      end if;
    elsif exists (
      select 1 from app.workspace_reconciliation_exception_next_generation_recurrences r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      if not exists (
        select 1 from app.workspace_reconciliation_successor_generation_reclosures rc
        where rc.workspace_id=new.workspace_id and rc.case_id=new.case_id
          and rc.next_generation_recurrence_id=(
            select lr.next_generation_recurrence_id
            from app.workspace_reconciliation_exception_next_generation_recurrences lr
            where lr.workspace_id=new.workspace_id and lr.case_id=new.case_id
            order by lr.recurred_at desc,lr.next_generation_recurrence_id desc limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_successor_generation_reclosure_required';
      end if;
    elsif exists (
      select 1 from app.workspace_reconciliation_exception_recurrences r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      if not exists (
        select 1 from app.workspace_reconciliation_exception_next_generation_reclosures rc
        where rc.workspace_id=new.workspace_id and rc.case_id=new.case_id
          and rc.recurrence_id=(
            select lr.recurrence_id
            from app.workspace_reconciliation_exception_recurrences lr
            where lr.workspace_id=new.workspace_id and lr.case_id=new.case_id
            order by lr.recurred_at desc,lr.recurrence_id desc limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_next_generation_reclosure_required';
      end if;
    elsif exists (
      select 1 from app.workspace_reconciliation_exception_reopens r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      if not exists (
        select 1 from app.workspace_reconciliation_exception_reclosures rc
        where rc.workspace_id=new.workspace_id and rc.case_id=new.case_id
          and rc.reopen_id=(
            select lr.reopen_id
            from app.workspace_reconciliation_exception_reopens lr
            where lr.workspace_id=new.workspace_id and lr.case_id=new.case_id
            order by lr.reopened_at desc,lr.reopen_id desc limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_successor_reclosure_required';
      end if;
    elsif not exists (
      select 1 from app.workspace_reconciliation_exception_closures rc
      where rc.workspace_id=new.workspace_id and rc.case_id=new.case_id
    ) then
      raise exception 'reconciliation_triage_verified_closure_required';
    end if;
  end if;
  return new;
end;
$$;
