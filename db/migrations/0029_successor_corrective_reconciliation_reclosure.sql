create table if not exists app.workspace_successor_corrective_delivery_reconciliations (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  successor_reconciliation_id uuid not null,
  successor_delivery_id uuid not null,
  activation_id uuid not null,
  successor_plan_id uuid not null,
  retriage_id uuid not null,
  reopen_id uuid not null,
  regression_check_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 512),
  successor_plan_fingerprint text not null check (char_length(successor_plan_fingerprint) between 1 and 128),
  source_regression_fingerprint text not null check (char_length(source_regression_fingerprint) between 1 and 128),
  successor_package_id text not null check (char_length(successor_package_id) between 1 and 512),
  successor_replay_key text not null check (char_length(successor_replay_key) between 1 and 1024),
  successor_package_fingerprint text not null check (char_length(successor_package_fingerprint) between 1 and 128),
  status text not null check (status in ('matched','drift','rejected','transport-error')),
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
  primary key (workspace_id,successor_reconciliation_id),
  foreign key (workspace_id,successor_delivery_id)
    references app.workspace_successor_corrective_live_deliveries(workspace_id,delivery_id)
    on delete restrict,
  foreign key (workspace_id,activation_id)
    references app.workspace_successor_corrective_delivery_activations(workspace_id,activation_id)
    on delete restrict,
  foreign key (workspace_id,successor_plan_id)
    references app.workspace_successor_corrective_delivery_plans(workspace_id,successor_plan_id)
    on delete restrict,
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
  check (
    (status in ('matched','drift') and matched_count + mismatched_count + missing_count = expected_record_count)
    or
    (status in ('rejected','transport-error') and matched_count=0 and mismatched_count=0 and missing_count=0)
  )
);

create index if not exists workspace_successor_corrective_delivery_reconciliations_recent_idx
  on app.workspace_successor_corrective_delivery_reconciliations(workspace_id,created_at desc);

create index if not exists workspace_successor_corrective_delivery_reconciliations_delivery_idx
  on app.workspace_successor_corrective_delivery_reconciliations(
    workspace_id,successor_delivery_id,created_at desc,successor_reconciliation_id desc
  );

create table if not exists app.workspace_reconciliation_exception_reclosures (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  reclosure_id uuid not null,
  original_closure_id uuid not null,
  reopen_id uuid not null,
  retriage_id uuid not null,
  successor_plan_id uuid not null,
  successor_delivery_id uuid not null,
  successor_reconciliation_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  original_closure_fingerprint text not null check (char_length(original_closure_fingerprint) between 1 and 128),
  reopen_fingerprint text not null check (char_length(reopen_fingerprint) between 1 and 128),
  successor_plan_fingerprint text not null check (char_length(successor_plan_fingerprint) between 1 and 128),
  successor_package_fingerprint text not null check (char_length(successor_package_fingerprint) between 1 and 128),
  verification_fingerprint text not null check (char_length(verification_fingerprint) between 1 and 128),
  reclosure_fingerprint text not null check (char_length(reclosure_fingerprint) between 1 and 128),
  reclosure_note text not null check (char_length(reclosure_note) between 1 and 8000),
  closed_by text not null references auth."user"(id) on delete restrict,
  closed_at timestamptz not null default now(),
  primary key (workspace_id,reclosure_id),
  unique (workspace_id,reopen_id),
  foreign key (workspace_id,original_closure_id)
    references app.workspace_reconciliation_exception_closures(workspace_id,closure_id)
    on delete restrict,
  foreign key (workspace_id,reopen_id)
    references app.workspace_reconciliation_exception_reopens(workspace_id,reopen_id)
    on delete restrict,
  foreign key (workspace_id,retriage_id)
    references app.workspace_reopened_exception_triage_cycles(workspace_id,retriage_id)
    on delete restrict,
  foreign key (workspace_id,successor_plan_id)
    references app.workspace_successor_corrective_delivery_plans(workspace_id,successor_plan_id)
    on delete restrict,
  foreign key (workspace_id,successor_delivery_id)
    references app.workspace_successor_corrective_live_deliveries(workspace_id,delivery_id)
    on delete restrict,
  foreign key (workspace_id,successor_reconciliation_id)
    references app.workspace_successor_corrective_delivery_reconciliations(workspace_id,successor_reconciliation_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict
);

create index if not exists workspace_reconciliation_exception_reclosures_recent_idx
  on app.workspace_reconciliation_exception_reclosures(workspace_id,closed_at desc,reclosure_id desc);

grant select,insert on app.workspace_successor_corrective_delivery_reconciliations to ai_data_runtime;
grant select,insert on app.workspace_reconciliation_exception_reclosures to ai_data_runtime;

alter table app.workspace_successor_corrective_delivery_reconciliations enable row level security;
alter table app.workspace_reconciliation_exception_reclosures enable row level security;

drop policy if exists workspace_successor_corrective_delivery_reconciliations_member_select
  on app.workspace_successor_corrective_delivery_reconciliations;
create policy workspace_successor_corrective_delivery_reconciliations_member_select
on app.workspace_successor_corrective_delivery_reconciliations
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successor_corrective_delivery_reconciliations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workspace_successor_corrective_delivery_reconciliations_manager_insert
  on app.workspace_successor_corrective_delivery_reconciliations;
create policy workspace_successor_corrective_delivery_reconciliations_manager_insert
on app.workspace_successor_corrective_delivery_reconciliations
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successor_corrective_delivery_reconciliations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
  and exists (
    select 1
    from app.workspace_successor_corrective_live_deliveries d
    join app.workspace_successor_corrective_delivery_activations a
      on a.workspace_id=d.workspace_id and a.activation_id=d.activation_id
    join app.workspace_successor_corrective_delivery_plans p
      on p.workspace_id=d.workspace_id and p.successor_plan_id=d.successor_plan_id
    join app.workspace_reopened_exception_triage_cycles t
      on t.workspace_id=p.workspace_id and t.retriage_id=p.retriage_id
    join app.workspace_reconciliation_exception_reopens reopen
      on reopen.workspace_id=p.workspace_id and reopen.reopen_id=p.reopen_id
    join app.workspace_post_closure_regression_checks regression
      on regression.workspace_id=p.workspace_id
     and regression.regression_check_id=p.regression_check_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    where d.workspace_id=workspace_successor_corrective_delivery_reconciliations.workspace_id
      and d.delivery_id=workspace_successor_corrective_delivery_reconciliations.successor_delivery_id
      and d.activation_id=workspace_successor_corrective_delivery_reconciliations.activation_id
      and d.successor_plan_id=workspace_successor_corrective_delivery_reconciliations.successor_plan_id
      and d.target=workspace_successor_corrective_delivery_reconciliations.target
      and d.consumer_id=workspace_successor_corrective_delivery_reconciliations.consumer_id
      and d.successor_plan_fingerprint=workspace_successor_corrective_delivery_reconciliations.successor_plan_fingerprint
      and d.successor_package_id=workspace_successor_corrective_delivery_reconciliations.successor_package_id
      and d.successor_replay_key=workspace_successor_corrective_delivery_reconciliations.successor_replay_key
      and d.successor_package_fingerprint=workspace_successor_corrective_delivery_reconciliations.successor_package_fingerprint
      and d.status='accepted'
      and p.retriage_id=workspace_successor_corrective_delivery_reconciliations.retriage_id
      and p.reopen_id=workspace_successor_corrective_delivery_reconciliations.reopen_id
      and p.regression_check_id=workspace_successor_corrective_delivery_reconciliations.regression_check_id
      and p.case_id=workspace_successor_corrective_delivery_reconciliations.case_id
      and p.status='approved'
      and p.plan_fingerprint=workspace_successor_corrective_delivery_reconciliations.successor_plan_fingerprint
      and p.source_regression_fingerprint=workspace_successor_corrective_delivery_reconciliations.source_regression_fingerprint
      and t.status='approved'
      and reopen.case_id=p.case_id
      and regression.status='regressed'
      and regression.verification_fingerprint=p.source_regression_fingerprint
      and c.status='open'
  )
);

drop policy if exists workspace_reconciliation_exception_reclosures_member_select
  on app.workspace_reconciliation_exception_reclosures;
create policy workspace_reconciliation_exception_reclosures_member_select
on app.workspace_reconciliation_exception_reclosures
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_exception_reclosures.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workspace_reconciliation_exception_reclosures_manager_insert
  on app.workspace_reconciliation_exception_reclosures;
create policy workspace_reconciliation_exception_reclosures_manager_insert
on app.workspace_reconciliation_exception_reclosures
for insert to ai_data_runtime
with check (
  closed_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_exception_reclosures.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
  and exists (
    select 1
    from app.workspace_successor_corrective_delivery_reconciliations r
    join app.workspace_successor_corrective_live_deliveries d
      on d.workspace_id=r.workspace_id and d.delivery_id=r.successor_delivery_id
    join app.workspace_successor_corrective_delivery_plans p
      on p.workspace_id=r.workspace_id and p.successor_plan_id=r.successor_plan_id
    join app.workspace_reopened_exception_triage_cycles t
      on t.workspace_id=p.workspace_id and t.retriage_id=p.retriage_id
    join app.workspace_reconciliation_exception_reopens reopen
      on reopen.workspace_id=p.workspace_id and reopen.reopen_id=p.reopen_id
    join app.workspace_reconciliation_exception_closures original
      on original.workspace_id=reopen.workspace_id and original.closure_id=reopen.closure_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    where r.workspace_id=workspace_reconciliation_exception_reclosures.workspace_id
      and r.successor_reconciliation_id=workspace_reconciliation_exception_reclosures.successor_reconciliation_id
      and r.successor_delivery_id=workspace_reconciliation_exception_reclosures.successor_delivery_id
      and r.successor_plan_id=workspace_reconciliation_exception_reclosures.successor_plan_id
      and r.retriage_id=workspace_reconciliation_exception_reclosures.retriage_id
      and r.reopen_id=workspace_reconciliation_exception_reclosures.reopen_id
      and r.case_id=workspace_reconciliation_exception_reclosures.case_id
      and r.target=workspace_reconciliation_exception_reclosures.target
      and r.successor_plan_fingerprint=workspace_reconciliation_exception_reclosures.successor_plan_fingerprint
      and r.successor_package_fingerprint=workspace_reconciliation_exception_reclosures.successor_package_fingerprint
      and r.verification_fingerprint=workspace_reconciliation_exception_reclosures.verification_fingerprint
      and r.status='matched'
      and d.status='accepted'
      and p.status='approved'
      and t.status='approved'
      and reopen.closure_id=workspace_reconciliation_exception_reclosures.original_closure_id
      and reopen.reopen_fingerprint=workspace_reconciliation_exception_reclosures.reopen_fingerprint
      and original.closure_fingerprint=workspace_reconciliation_exception_reclosures.original_closure_fingerprint
      and c.status='open'
      and r.successor_reconciliation_id=(
        select newest.successor_reconciliation_id
        from app.workspace_successor_corrective_delivery_reconciliations newest
        where newest.workspace_id=r.workspace_id
          and newest.successor_delivery_id=r.successor_delivery_id
        order by newest.created_at desc,newest.successor_reconciliation_id desc
        limit 1
      )
      and reopen.reopen_id=(
        select newest_reopen.reopen_id
        from app.workspace_reconciliation_exception_reopens newest_reopen
        where newest_reopen.workspace_id=reopen.workspace_id
          and newest_reopen.case_id=reopen.case_id
        order by newest_reopen.reopened_at desc,newest_reopen.reopen_id desc
        limit 1
      )
  )
);

drop policy if exists workspace_corrective_delivery_reconciliations_manager_insert
  on app.workspace_corrective_delivery_reconciliations;
create policy workspace_corrective_delivery_reconciliations_manager_insert
on app.workspace_corrective_delivery_reconciliations
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and not exists (
    select 1
    from app.workspace_reconciliation_exception_reopens reopen
    where reopen.workspace_id=workspace_corrective_delivery_reconciliations.workspace_id
      and reopen.case_id=workspace_corrective_delivery_reconciliations.case_id
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_delivery_reconciliations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
  and exists (
    select 1
    from app.workspace_corrective_live_deliveries d
    join app.workspace_corrective_delivery_plans p
      on p.workspace_id=d.workspace_id and p.plan_id=d.plan_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    where d.workspace_id=workspace_corrective_delivery_reconciliations.workspace_id
      and d.delivery_id=workspace_corrective_delivery_reconciliations.corrective_delivery_id
      and d.status='accepted'
      and d.plan_id=workspace_corrective_delivery_reconciliations.plan_id
      and d.source_delivery_id=workspace_corrective_delivery_reconciliations.source_delivery_id
      and d.target=workspace_corrective_delivery_reconciliations.target
      and d.consumer_id=workspace_corrective_delivery_reconciliations.consumer_id
      and d.plan_fingerprint=workspace_corrective_delivery_reconciliations.plan_fingerprint
      and d.corrective_package_id=workspace_corrective_delivery_reconciliations.corrective_package_id
      and d.corrective_replay_key=workspace_corrective_delivery_reconciliations.corrective_replay_key
      and d.corrective_package_fingerprint=workspace_corrective_delivery_reconciliations.corrective_package_fingerprint
      and p.status='approved'
      and c.case_id=workspace_corrective_delivery_reconciliations.case_id
      and c.status='approved'
  )
);

drop policy if exists workspace_reconciliation_exception_closures_manager_insert
  on app.workspace_reconciliation_exception_closures;
create policy workspace_reconciliation_exception_closures_manager_insert
on app.workspace_reconciliation_exception_closures
for insert to ai_data_runtime
with check (
  closed_by=nullif(current_setting('app.user_id',true),'')
  and not exists (
    select 1
    from app.workspace_reconciliation_exception_reopens reopen
    where reopen.workspace_id=workspace_reconciliation_exception_closures.workspace_id
      and reopen.case_id=workspace_reconciliation_exception_closures.case_id
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_exception_closures.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
  and exists (
    select 1
    from app.workspace_corrective_delivery_reconciliations r
    join app.workspace_corrective_live_deliveries d
      on d.workspace_id=r.workspace_id and d.delivery_id=r.corrective_delivery_id
    join app.workspace_corrective_delivery_plans p
      on p.workspace_id=r.workspace_id and p.plan_id=r.plan_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=r.workspace_id and c.case_id=r.case_id
    where r.workspace_id=workspace_reconciliation_exception_closures.workspace_id
      and r.corrective_reconciliation_id=workspace_reconciliation_exception_closures.corrective_reconciliation_id
      and r.corrective_delivery_id=workspace_reconciliation_exception_closures.corrective_delivery_id
      and r.plan_id=workspace_reconciliation_exception_closures.plan_id
      and r.case_id=workspace_reconciliation_exception_closures.case_id
      and r.target=workspace_reconciliation_exception_closures.target
      and r.plan_fingerprint=workspace_reconciliation_exception_closures.plan_fingerprint
      and r.corrective_package_fingerprint=workspace_reconciliation_exception_closures.corrective_package_fingerprint
      and r.verification_fingerprint=workspace_reconciliation_exception_closures.verification_fingerprint
      and r.status='matched'
      and d.status='accepted'
      and p.status='approved'
      and c.status='approved'
      and r.corrective_reconciliation_id=(
        select newest.corrective_reconciliation_id
        from app.workspace_corrective_delivery_reconciliations newest
        where newest.workspace_id=r.workspace_id
          and newest.corrective_delivery_id=r.corrective_delivery_id
        order by newest.created_at desc,newest.corrective_reconciliation_id desc
        limit 1
      )
  )
);

drop policy if exists workspace_post_closure_regression_checks_manager_insert
  on app.workspace_post_closure_regression_checks;
create policy workspace_post_closure_regression_checks_manager_insert
on app.workspace_post_closure_regression_checks
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and not exists (
    select 1
    from app.workspace_reconciliation_exception_reopens reopen
    where reopen.workspace_id=workspace_post_closure_regression_checks.workspace_id
      and reopen.case_id=workspace_post_closure_regression_checks.case_id
  )
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
      and d.consumer_id=workspace_post_closure_regression_checks.consumer_id
      and d.corrective_package_id=workspace_post_closure_regression_checks.corrective_package_id
      and d.corrective_replay_key=workspace_post_closure_regression_checks.corrective_replay_key
      and d.corrective_package_fingerprint=workspace_post_closure_regression_checks.corrective_package_fingerprint
      and d.status='accepted'
      and p.status='approved'
      and c.status='closed'
  )
);

create or replace function app.require_verified_corrective_closure()
returns trigger
language plpgsql
as $$
begin
  if new.status='closed' and old.status is distinct from 'closed' then
    if exists (
      select 1
      from app.workspace_reconciliation_exception_reopens reopen
      where reopen.workspace_id=new.workspace_id
        and reopen.case_id=new.case_id
    ) then
      if not exists (
        select 1
        from app.workspace_reconciliation_exception_reclosures reclosure
        where reclosure.workspace_id=new.workspace_id
          and reclosure.case_id=new.case_id
          and reclosure.reopen_id=(
            select latest_reopen.reopen_id
            from app.workspace_reconciliation_exception_reopens latest_reopen
            where latest_reopen.workspace_id=new.workspace_id
              and latest_reopen.case_id=new.case_id
            order by latest_reopen.reopened_at desc,latest_reopen.reopen_id desc
            limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_successor_reclosure_required';
      end if;
    elsif not exists (
      select 1
      from app.workspace_reconciliation_exception_closures closure
      where closure.workspace_id=new.workspace_id
        and closure.case_id=new.case_id
    ) then
      raise exception 'reconciliation_triage_verified_closure_required';
    end if;
  end if;
  return new;
end;
$$;
