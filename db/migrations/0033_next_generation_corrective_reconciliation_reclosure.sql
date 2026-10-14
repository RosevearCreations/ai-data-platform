create table if not exists app.workspace_next_generation_corrective_delivery_reconciliations (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  next_generation_reconciliation_id uuid not null,
  next_generation_delivery_id uuid not null,
  activation_id uuid not null,
  next_generation_plan_id uuid not null,
  recurrence_retriage_id uuid not null,
  recurrence_id uuid not null,
  predecessor_reclosure_id uuid not null,
  reclosure_regression_check_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 512),
  next_generation_plan_fingerprint text not null check (char_length(next_generation_plan_fingerprint) between 1 and 128),
  source_recurrence_fingerprint text not null check (char_length(source_recurrence_fingerprint) between 1 and 128),
  source_regression_fingerprint text not null check (char_length(source_regression_fingerprint) between 1 and 128),
  source_reclosure_fingerprint text not null check (char_length(source_reclosure_fingerprint) between 1 and 128),
  next_generation_package_id text not null check (char_length(next_generation_package_id) between 1 and 512),
  next_generation_replay_key text not null check (char_length(next_generation_replay_key) between 1 and 1024),
  next_generation_package_fingerprint text not null check (char_length(next_generation_package_fingerprint) between 1 and 128),
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
  primary key (workspace_id,next_generation_reconciliation_id),
  foreign key (workspace_id,next_generation_delivery_id)
    references app.workspace_next_generation_corrective_live_deliveries(workspace_id,delivery_id)
    on delete restrict,
  foreign key (workspace_id,activation_id)
    references app.workspace_next_generation_corrective_delivery_activations(workspace_id,activation_id)
    on delete restrict,
  foreign key (workspace_id,next_generation_plan_id)
    references app.workspace_next_generation_corrective_delivery_plans(workspace_id,next_generation_plan_id)
    on delete restrict,
  foreign key (workspace_id,recurrence_retriage_id)
    references app.workspace_recurrent_exception_triage_cycles(workspace_id,recurrence_retriage_id)
    on delete restrict,
  foreign key (workspace_id,recurrence_id)
    references app.workspace_reconciliation_exception_recurrences(workspace_id,recurrence_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_reclosure_id)
    references app.workspace_reconciliation_exception_reclosures(workspace_id,reclosure_id)
    on delete restrict,
  foreign key (workspace_id,reclosure_regression_check_id)
    references app.workspace_post_reclosure_regression_checks(workspace_id,reclosure_regression_check_id)
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

create index if not exists workspace_next_generation_reconciliations_recent_idx
  on app.workspace_next_generation_corrective_delivery_reconciliations(workspace_id,created_at desc);

create index if not exists workspace_next_generation_reconciliations_delivery_idx
  on app.workspace_next_generation_corrective_delivery_reconciliations(
    workspace_id,next_generation_delivery_id,created_at desc,next_generation_reconciliation_id desc
  );

create table if not exists app.workspace_reconciliation_exception_next_generation_reclosures (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  next_generation_reclosure_id uuid not null,
  predecessor_reclosure_id uuid not null,
  recurrence_id uuid not null,
  recurrence_retriage_id uuid not null,
  next_generation_plan_id uuid not null,
  next_generation_delivery_id uuid not null,
  next_generation_reconciliation_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  predecessor_reclosure_fingerprint text not null check (char_length(predecessor_reclosure_fingerprint) between 1 and 128),
  recurrence_fingerprint text not null check (char_length(recurrence_fingerprint) between 1 and 128),
  next_generation_plan_fingerprint text not null check (char_length(next_generation_plan_fingerprint) between 1 and 128),
  next_generation_package_fingerprint text not null check (char_length(next_generation_package_fingerprint) between 1 and 128),
  verification_fingerprint text not null check (char_length(verification_fingerprint) between 1 and 128),
  next_generation_reclosure_fingerprint text not null check (char_length(next_generation_reclosure_fingerprint) between 1 and 128),
  reclosure_note text not null check (char_length(reclosure_note) between 1 and 8000),
  closed_by text not null references auth."user"(id) on delete restrict,
  closed_at timestamptz not null default now(),
  primary key (workspace_id,next_generation_reclosure_id),
  unique (workspace_id,recurrence_id),
  foreign key (workspace_id,predecessor_reclosure_id)
    references app.workspace_reconciliation_exception_reclosures(workspace_id,reclosure_id)
    on delete restrict,
  foreign key (workspace_id,recurrence_id)
    references app.workspace_reconciliation_exception_recurrences(workspace_id,recurrence_id)
    on delete restrict,
  foreign key (workspace_id,recurrence_retriage_id)
    references app.workspace_recurrent_exception_triage_cycles(workspace_id,recurrence_retriage_id)
    on delete restrict,
  foreign key (workspace_id,next_generation_plan_id)
    references app.workspace_next_generation_corrective_delivery_plans(workspace_id,next_generation_plan_id)
    on delete restrict,
  foreign key (workspace_id,next_generation_delivery_id)
    references app.workspace_next_generation_corrective_live_deliveries(workspace_id,delivery_id)
    on delete restrict,
  foreign key (workspace_id,next_generation_reconciliation_id)
    references app.workspace_next_generation_corrective_delivery_reconciliations(workspace_id,next_generation_reconciliation_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict
);

create index if not exists workspace_next_generation_reclosures_recent_idx
  on app.workspace_reconciliation_exception_next_generation_reclosures(
    workspace_id,closed_at desc,next_generation_reclosure_id desc
  );

grant select,insert on app.workspace_next_generation_corrective_delivery_reconciliations to ai_data_runtime;
grant select,insert on app.workspace_reconciliation_exception_next_generation_reclosures to ai_data_runtime;

alter table app.workspace_next_generation_corrective_delivery_reconciliations enable row level security;
alter table app.workspace_reconciliation_exception_next_generation_reclosures enable row level security;

drop policy if exists next_generation_reconciliations_member_select
  on app.workspace_next_generation_corrective_delivery_reconciliations;
create policy next_generation_reconciliations_member_select
on app.workspace_next_generation_corrective_delivery_reconciliations
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_next_generation_corrective_delivery_reconciliations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists next_generation_reconciliations_manager_insert
  on app.workspace_next_generation_corrective_delivery_reconciliations;
create policy next_generation_reconciliations_manager_insert
on app.workspace_next_generation_corrective_delivery_reconciliations
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_next_generation_corrective_delivery_reconciliations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
  and exists (
    select 1
    from app.workspace_next_generation_corrective_live_deliveries d
    join app.workspace_next_generation_corrective_delivery_activations a
      on a.workspace_id=d.workspace_id and a.activation_id=d.activation_id
    join app.workspace_next_generation_corrective_delivery_plans p
      on p.workspace_id=d.workspace_id
     and p.next_generation_plan_id=d.next_generation_plan_id
    join app.workspace_recurrent_exception_triage_cycles t
      on t.workspace_id=p.workspace_id
     and t.recurrence_retriage_id=p.recurrence_retriage_id
    join app.workspace_reconciliation_exception_recurrences recurrence
      on recurrence.workspace_id=p.workspace_id
     and recurrence.recurrence_id=p.recurrence_id
    join app.workspace_reconciliation_exception_reclosures predecessor_reclosure
      on predecessor_reclosure.workspace_id=p.workspace_id
     and predecessor_reclosure.reclosure_id=p.reclosure_id
    join app.workspace_post_reclosure_regression_checks regression
      on regression.workspace_id=p.workspace_id
     and regression.reclosure_regression_check_id=p.reclosure_regression_check_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    where d.workspace_id=workspace_next_generation_corrective_delivery_reconciliations.workspace_id
      and d.delivery_id=workspace_next_generation_corrective_delivery_reconciliations.next_generation_delivery_id
      and d.activation_id=workspace_next_generation_corrective_delivery_reconciliations.activation_id
      and d.next_generation_plan_id=workspace_next_generation_corrective_delivery_reconciliations.next_generation_plan_id
      and d.target=workspace_next_generation_corrective_delivery_reconciliations.target
      and d.consumer_id=workspace_next_generation_corrective_delivery_reconciliations.consumer_id
      and d.next_generation_plan_fingerprint=workspace_next_generation_corrective_delivery_reconciliations.next_generation_plan_fingerprint
      and d.next_generation_package_id=workspace_next_generation_corrective_delivery_reconciliations.next_generation_package_id
      and d.next_generation_replay_key=workspace_next_generation_corrective_delivery_reconciliations.next_generation_replay_key
      and d.next_generation_package_fingerprint=workspace_next_generation_corrective_delivery_reconciliations.next_generation_package_fingerprint
      and d.status='accepted'
      and p.recurrence_retriage_id=workspace_next_generation_corrective_delivery_reconciliations.recurrence_retriage_id
      and p.recurrence_id=workspace_next_generation_corrective_delivery_reconciliations.recurrence_id
      and p.reclosure_id=workspace_next_generation_corrective_delivery_reconciliations.predecessor_reclosure_id
      and p.reclosure_regression_check_id=workspace_next_generation_corrective_delivery_reconciliations.reclosure_regression_check_id
      and p.case_id=workspace_next_generation_corrective_delivery_reconciliations.case_id
      and p.status='approved'
      and p.plan_fingerprint=workspace_next_generation_corrective_delivery_reconciliations.next_generation_plan_fingerprint
      and p.source_recurrence_fingerprint=workspace_next_generation_corrective_delivery_reconciliations.source_recurrence_fingerprint
      and p.source_regression_fingerprint=workspace_next_generation_corrective_delivery_reconciliations.source_regression_fingerprint
      and p.source_reclosure_fingerprint=workspace_next_generation_corrective_delivery_reconciliations.source_reclosure_fingerprint
      and t.status='approved'
      and recurrence.recurrence_fingerprint=p.source_recurrence_fingerprint
      and recurrence.regression_fingerprint=p.source_regression_fingerprint
      and recurrence.reclosure_fingerprint=p.source_reclosure_fingerprint
      and predecessor_reclosure.reclosure_fingerprint=p.source_reclosure_fingerprint
      and regression.status='recurred'
      and regression.verification_fingerprint=p.source_regression_fingerprint
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
);

drop policy if exists next_generation_reclosures_member_select
  on app.workspace_reconciliation_exception_next_generation_reclosures;
create policy next_generation_reclosures_member_select
on app.workspace_reconciliation_exception_next_generation_reclosures
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_exception_next_generation_reclosures.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists next_generation_reclosures_manager_insert
  on app.workspace_reconciliation_exception_next_generation_reclosures;
create policy next_generation_reclosures_manager_insert
on app.workspace_reconciliation_exception_next_generation_reclosures
for insert to ai_data_runtime
with check (
  closed_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_exception_next_generation_reclosures.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
  and exists (
    select 1
    from app.workspace_next_generation_corrective_delivery_reconciliations r
    join app.workspace_next_generation_corrective_live_deliveries d
      on d.workspace_id=r.workspace_id
     and d.delivery_id=r.next_generation_delivery_id
    join app.workspace_next_generation_corrective_delivery_plans p
      on p.workspace_id=r.workspace_id
     and p.next_generation_plan_id=r.next_generation_plan_id
    join app.workspace_recurrent_exception_triage_cycles t
      on t.workspace_id=p.workspace_id
     and t.recurrence_retriage_id=p.recurrence_retriage_id
    join app.workspace_reconciliation_exception_recurrences recurrence
      on recurrence.workspace_id=p.workspace_id
     and recurrence.recurrence_id=p.recurrence_id
    join app.workspace_reconciliation_exception_reclosures predecessor_reclosure
      on predecessor_reclosure.workspace_id=p.workspace_id
     and predecessor_reclosure.reclosure_id=p.reclosure_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    where r.workspace_id=workspace_reconciliation_exception_next_generation_reclosures.workspace_id
      and r.next_generation_reconciliation_id=workspace_reconciliation_exception_next_generation_reclosures.next_generation_reconciliation_id
      and r.next_generation_delivery_id=workspace_reconciliation_exception_next_generation_reclosures.next_generation_delivery_id
      and r.next_generation_plan_id=workspace_reconciliation_exception_next_generation_reclosures.next_generation_plan_id
      and r.recurrence_retriage_id=workspace_reconciliation_exception_next_generation_reclosures.recurrence_retriage_id
      and r.recurrence_id=workspace_reconciliation_exception_next_generation_reclosures.recurrence_id
      and r.predecessor_reclosure_id=workspace_reconciliation_exception_next_generation_reclosures.predecessor_reclosure_id
      and r.case_id=workspace_reconciliation_exception_next_generation_reclosures.case_id
      and r.target=workspace_reconciliation_exception_next_generation_reclosures.target
      and r.next_generation_plan_fingerprint=workspace_reconciliation_exception_next_generation_reclosures.next_generation_plan_fingerprint
      and r.next_generation_package_fingerprint=workspace_reconciliation_exception_next_generation_reclosures.next_generation_package_fingerprint
      and r.verification_fingerprint=workspace_reconciliation_exception_next_generation_reclosures.verification_fingerprint
      and r.status='matched'
      and d.status='accepted'
      and p.status='approved'
      and t.status='approved'
      and predecessor_reclosure.reclosure_fingerprint=workspace_reconciliation_exception_next_generation_reclosures.predecessor_reclosure_fingerprint
      and recurrence.recurrence_fingerprint=workspace_reconciliation_exception_next_generation_reclosures.recurrence_fingerprint
      and c.status='open'
      and r.next_generation_reconciliation_id=(
        select newest.next_generation_reconciliation_id
        from app.workspace_next_generation_corrective_delivery_reconciliations newest
        where newest.workspace_id=r.workspace_id
          and newest.next_generation_delivery_id=r.next_generation_delivery_id
        order by newest.created_at desc,newest.next_generation_reconciliation_id desc
        limit 1
      )
      and recurrence.recurrence_id=(
        select newest_recurrence.recurrence_id
        from app.workspace_reconciliation_exception_recurrences newest_recurrence
        where newest_recurrence.workspace_id=recurrence.workspace_id
          and newest_recurrence.case_id=recurrence.case_id
        order by newest_recurrence.recurred_at desc,newest_recurrence.recurrence_id desc
        limit 1
      )
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
      from app.workspace_reconciliation_exception_recurrences recurrence
      where recurrence.workspace_id=new.workspace_id
        and recurrence.case_id=new.case_id
    ) then
      if not exists (
        select 1
        from app.workspace_reconciliation_exception_next_generation_reclosures reclosure
        where reclosure.workspace_id=new.workspace_id
          and reclosure.case_id=new.case_id
          and reclosure.recurrence_id=(
            select latest_recurrence.recurrence_id
            from app.workspace_reconciliation_exception_recurrences latest_recurrence
            where latest_recurrence.workspace_id=new.workspace_id
              and latest_recurrence.case_id=new.case_id
            order by latest_recurrence.recurred_at desc,latest_recurrence.recurrence_id desc
            limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_next_generation_reclosure_required';
      end if;
    elsif exists (
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
