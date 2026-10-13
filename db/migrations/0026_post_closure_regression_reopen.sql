create table if not exists app.workspace_post_closure_regression_checks (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  regression_check_id uuid not null,
  closure_id uuid not null,
  case_id uuid not null,
  plan_id uuid not null,
  corrective_delivery_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 512),
  closure_fingerprint text not null check (char_length(closure_fingerprint) between 1 and 128),
  corrective_package_id text not null check (char_length(corrective_package_id) between 1 and 512),
  corrective_replay_key text not null check (char_length(corrective_replay_key) between 1 and 1024),
  corrective_package_fingerprint text not null check (char_length(corrective_package_fingerprint) between 1 and 128),
  status text not null check (status in ('stable','regressed','rejected','transport-error')),
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
  primary key (workspace_id,regression_check_id),
  foreign key (workspace_id,closure_id)
    references app.workspace_reconciliation_exception_closures(workspace_id,closure_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict,
  foreign key (workspace_id,plan_id)
    references app.workspace_corrective_delivery_plans(workspace_id,plan_id)
    on delete restrict,
  foreign key (workspace_id,corrective_delivery_id)
    references app.workspace_corrective_live_deliveries(workspace_id,delivery_id)
    on delete restrict,
  check (
    (status in ('stable','regressed') and matched_count + mismatched_count + missing_count = expected_record_count)
    or
    (status in ('rejected','transport-error') and matched_count=0 and mismatched_count=0 and missing_count=0)
  )
);

create index if not exists workspace_post_closure_regression_checks_recent_idx
  on app.workspace_post_closure_regression_checks(workspace_id,created_at desc);

create index if not exists workspace_post_closure_regression_checks_closure_idx
  on app.workspace_post_closure_regression_checks(
    workspace_id,closure_id,created_at desc,regression_check_id desc
  );

create table if not exists app.workspace_reconciliation_exception_reopens (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  reopen_id uuid not null,
  closure_id uuid not null,
  regression_check_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  closure_fingerprint text not null check (char_length(closure_fingerprint) between 1 and 128),
  regression_fingerprint text not null check (char_length(regression_fingerprint) between 1 and 128),
  reopen_fingerprint text not null check (char_length(reopen_fingerprint) between 1 and 128),
  reopen_reason text not null check (char_length(reopen_reason) between 1 and 8000),
  reopened_by text not null references auth."user"(id) on delete restrict,
  reopened_at timestamptz not null default now(),
  primary key (workspace_id,reopen_id),
  unique (workspace_id,closure_id),
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

create index if not exists workspace_reconciliation_exception_reopens_recent_idx
  on app.workspace_reconciliation_exception_reopens(workspace_id,reopened_at desc);

grant select,insert on app.workspace_post_closure_regression_checks to ai_data_runtime;
grant select,insert on app.workspace_reconciliation_exception_reopens to ai_data_runtime;

alter table app.workspace_post_closure_regression_checks enable row level security;
alter table app.workspace_reconciliation_exception_reopens enable row level security;

drop policy if exists workspace_post_closure_regression_checks_member_select
  on app.workspace_post_closure_regression_checks;
create policy workspace_post_closure_regression_checks_member_select
on app.workspace_post_closure_regression_checks
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_post_closure_regression_checks.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workspace_post_closure_regression_checks_manager_insert
  on app.workspace_post_closure_regression_checks;
create policy workspace_post_closure_regression_checks_manager_insert
on app.workspace_post_closure_regression_checks
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_post_closure_regression_checks.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
  and exists (
    select 1
    from app.workspace_reconciliation_exception_closures closure
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=closure.workspace_id and c.case_id=closure.case_id
    join app.workspace_corrective_live_deliveries d
      on d.workspace_id=closure.workspace_id
     and d.delivery_id=closure.corrective_delivery_id
    join app.workspace_corrective_delivery_plans p
      on p.workspace_id=closure.workspace_id and p.plan_id=closure.plan_id
    where closure.workspace_id=workspace_post_closure_regression_checks.workspace_id
      and closure.closure_id=workspace_post_closure_regression_checks.closure_id
      and closure.case_id=workspace_post_closure_regression_checks.case_id
      and closure.plan_id=workspace_post_closure_regression_checks.plan_id
      and closure.corrective_delivery_id=workspace_post_closure_regression_checks.corrective_delivery_id
      and closure.target=workspace_post_closure_regression_checks.target
      and closure.closure_fingerprint=workspace_post_closure_regression_checks.closure_fingerprint
      and closure.corrective_package_fingerprint=workspace_post_closure_regression_checks.corrective_package_fingerprint
      and d.consumer_id=workspace_post_closure_regression_checks.consumer_id
      and d.corrective_package_id=workspace_post_closure_regression_checks.corrective_package_id
      and d.corrective_replay_key=workspace_post_closure_regression_checks.corrective_replay_key
      and d.corrective_package_fingerprint=workspace_post_closure_regression_checks.corrective_package_fingerprint
      and d.status='accepted'
      and p.status='approved'
      and c.status='closed'
  )
);

drop policy if exists workspace_reconciliation_exception_reopens_member_select
  on app.workspace_reconciliation_exception_reopens;
create policy workspace_reconciliation_exception_reopens_member_select
on app.workspace_reconciliation_exception_reopens
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_exception_reopens.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workspace_reconciliation_exception_reopens_manager_insert
  on app.workspace_reconciliation_exception_reopens;
create policy workspace_reconciliation_exception_reopens_manager_insert
on app.workspace_reconciliation_exception_reopens
for insert to ai_data_runtime
with check (
  reopened_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_exception_reopens.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
  and exists (
    select 1
    from app.workspace_post_closure_regression_checks regression
    join app.workspace_reconciliation_exception_closures closure
      on closure.workspace_id=regression.workspace_id
     and closure.closure_id=regression.closure_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=closure.workspace_id and c.case_id=closure.case_id
    where regression.workspace_id=workspace_reconciliation_exception_reopens.workspace_id
      and regression.regression_check_id=workspace_reconciliation_exception_reopens.regression_check_id
      and regression.closure_id=workspace_reconciliation_exception_reopens.closure_id
      and regression.case_id=workspace_reconciliation_exception_reopens.case_id
      and regression.target=workspace_reconciliation_exception_reopens.target
      and regression.closure_fingerprint=workspace_reconciliation_exception_reopens.closure_fingerprint
      and regression.verification_fingerprint=workspace_reconciliation_exception_reopens.regression_fingerprint
      and regression.status='regressed'
      and c.status='closed'
      and regression.regression_check_id=(
        select newest.regression_check_id
        from app.workspace_post_closure_regression_checks newest
        where newest.workspace_id=regression.workspace_id
          and newest.closure_id=regression.closure_id
        order by newest.created_at desc,newest.regression_check_id desc
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
    ) then
      raise exception 'reconciliation_exception_governed_reopen_required';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_reconciliation_exception_governed_reopen_guard
  on app.workspace_reconciliation_exception_cases;
create trigger workspace_reconciliation_exception_governed_reopen_guard
before update of status on app.workspace_reconciliation_exception_cases
for each row
execute function app.require_governed_exception_reopen();

create or replace function app.require_verified_corrective_closure()
returns trigger
language plpgsql
as $$
begin
  if new.status='closed' and old.status is distinct from 'closed' then
    if not exists (
      select 1
      from app.workspace_reconciliation_exception_closures closure
      where closure.workspace_id=new.workspace_id
        and closure.case_id=new.case_id
        and not exists (
          select 1
          from app.workspace_reconciliation_exception_reopens reopen
          where reopen.workspace_id=closure.workspace_id
            and reopen.closure_id=closure.closure_id
        )
    ) then
      raise exception 'reconciliation_triage_verified_closure_required';
    end if;
  end if;
  return new;
end;
$$;
