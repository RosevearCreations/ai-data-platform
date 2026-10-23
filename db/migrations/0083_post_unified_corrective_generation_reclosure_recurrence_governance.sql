-- Build 113 — Post-Unified Corrective-Generation Re-Closure Regression Monitoring & Recurrence Governance

create table if not exists app.workspace_post_unified_cg_reclosure_checks (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  regression_check_id uuid not null,
  reclosure_id uuid not null,
  successor_source_id uuid not null,
  predecessor_generation_lineage_id uuid not null,
  case_id uuid not null,
  corrective_generation_plan_id uuid not null,
  delivery_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  generation_number integer not null check (generation_number between 2 and 10000),
  consumer_id text not null check (char_length(consumer_id) between 1 and 512),
  reclosure_fingerprint text not null check (char_length(reclosure_fingerprint) between 1 and 128),
  source_recurrence_id uuid not null,
  source_recurrence_fingerprint text not null check (char_length(source_recurrence_fingerprint) between 1 and 128),
  source_regression_fingerprint text not null check (char_length(source_regression_fingerprint) between 1 and 128),
  source_successor_fingerprint text not null check (char_length(source_successor_fingerprint) between 1 and 512),
  predecessor_registry_fingerprint text not null check (char_length(predecessor_registry_fingerprint) between 1 and 512),
  plan_fingerprint text not null check (char_length(plan_fingerprint) between 1 and 128),
  unified_package_id text not null check (char_length(unified_package_id) between 1 and 512),
  unified_replay_key text not null check (char_length(unified_replay_key) between 1 and 1024),
  unified_package_fingerprint text not null check (char_length(unified_package_fingerprint) between 1 and 128),
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
  primary key (workspace_id,regression_check_id),
  foreign key (workspace_id,reclosure_id)
    references app.workspace_reconciliation_unified_cg_reclosures(workspace_id,reclosure_id) on delete restrict,
  foreign key (workspace_id,successor_source_id)
    references app.workspace_corrective_generation_successors(workspace_id,successor_source_id) on delete restrict,
  foreign key (workspace_id,predecessor_generation_lineage_id)
    references app.workspace_corrective_generation_registry(workspace_id,generation_lineage_id) on delete restrict,
  foreign key (workspace_id,corrective_generation_plan_id)
    references app.workspace_corrective_generation_plans(workspace_id,corrective_generation_plan_id) on delete restrict,
  foreign key (workspace_id,delivery_id)
    references app.workspace_unified_cg_live_deliveries(workspace_id,delivery_id) on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id) on delete restrict,
  check (
    (status in ('stable','recurred') and matched_count + mismatched_count + missing_count = expected_record_count)
    or
    (status in ('rejected','transport-error') and matched_count=0 and mismatched_count=0 and missing_count=0)
  )
);

create index if not exists workspace_ucg113_check_recent_idx
  on app.workspace_post_unified_cg_reclosure_checks(workspace_id,created_at desc);
create index if not exists workspace_ucg113_check_link_idx
  on app.workspace_post_unified_cg_reclosure_checks(
    workspace_id,reclosure_id,created_at desc,regression_check_id desc
  );

create table if not exists app.workspace_reconciliation_unified_cg_recurrences (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  recurrence_id uuid not null,
  reclosure_id uuid not null,
  regression_check_id uuid not null,
  successor_source_id uuid not null,
  predecessor_generation_lineage_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  generation_number integer not null check (generation_number between 2 and 9999),
  reclosure_fingerprint text not null check (char_length(reclosure_fingerprint) between 1 and 128),
  regression_fingerprint text not null check (char_length(regression_fingerprint) between 1 and 128),
  recurrence_fingerprint text not null check (char_length(recurrence_fingerprint) between 1 and 128),
  recurrence_reason text not null check (char_length(recurrence_reason) between 1 and 8000),
  recurred_by text not null references auth."user"(id) on delete restrict,
  recurred_at timestamptz not null default now(),
  primary key (workspace_id,recurrence_id),
  unique (workspace_id,reclosure_id),
  unique (workspace_id,successor_source_id),
  foreign key (workspace_id,reclosure_id)
    references app.workspace_reconciliation_unified_cg_reclosures(workspace_id,reclosure_id) on delete restrict,
  foreign key (workspace_id,regression_check_id)
    references app.workspace_post_unified_cg_reclosure_checks(workspace_id,regression_check_id) on delete restrict,
  foreign key (workspace_id,successor_source_id)
    references app.workspace_corrective_generation_successors(workspace_id,successor_source_id) on delete restrict,
  foreign key (workspace_id,predecessor_generation_lineage_id)
    references app.workspace_corrective_generation_registry(workspace_id,generation_lineage_id) on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id) on delete restrict
);

create index if not exists workspace_ucg113_recur_recent_idx
  on app.workspace_reconciliation_unified_cg_recurrences(
    workspace_id,recurred_at desc,recurrence_id desc
  );

grant select,insert on app.workspace_post_unified_cg_reclosure_checks to ai_data_runtime;
grant select,insert on app.workspace_reconciliation_unified_cg_recurrences to ai_data_runtime;

alter table app.workspace_post_unified_cg_reclosure_checks enable row level security;
alter table app.workspace_reconciliation_unified_cg_recurrences enable row level security;

drop policy if exists ucg113_checks_member_select on app.workspace_post_unified_cg_reclosure_checks;
create policy ucg113_checks_member_select
on app.workspace_post_unified_cg_reclosure_checks
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_post_unified_cg_reclosure_checks.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists ucg113_checks_manager_insert on app.workspace_post_unified_cg_reclosure_checks;
create policy ucg113_checks_manager_insert
on app.workspace_post_unified_cg_reclosure_checks
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_reconciliation_unified_cg_reclosures rc
    join app.workspace_unified_cg_live_deliveries d
      on d.workspace_id=rc.workspace_id and d.delivery_id=rc.delivery_id
    join app.workspace_corrective_generation_plans p
      on p.workspace_id=rc.workspace_id
     and p.corrective_generation_plan_id=rc.corrective_generation_plan_id
    join app.workspace_corrective_generation_successors s
      on s.workspace_id=rc.workspace_id and s.successor_source_id=rc.successor_source_id
    join app.workspace_corrective_generation_registry pred
      on pred.workspace_id=rc.workspace_id
     and pred.generation_lineage_id=rc.predecessor_generation_lineage_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=rc.workspace_id and c.case_id=rc.case_id
    join app.workspace_members wm
      on wm.workspace_id=rc.workspace_id
     and wm.user_id=nullif(current_setting('app.user_id',true),'')
     and wm.role in ('owner','admin')
    where rc.workspace_id=workspace_post_unified_cg_reclosure_checks.workspace_id
      and rc.reclosure_id=workspace_post_unified_cg_reclosure_checks.reclosure_id
      and rc.successor_source_id=workspace_post_unified_cg_reclosure_checks.successor_source_id
      and rc.predecessor_generation_lineage_id=workspace_post_unified_cg_reclosure_checks.predecessor_generation_lineage_id
      and rc.case_id=workspace_post_unified_cg_reclosure_checks.case_id
      and rc.corrective_generation_plan_id=workspace_post_unified_cg_reclosure_checks.corrective_generation_plan_id
      and rc.delivery_id=workspace_post_unified_cg_reclosure_checks.delivery_id
      and rc.target=workspace_post_unified_cg_reclosure_checks.target
      and rc.generation_number=workspace_post_unified_cg_reclosure_checks.generation_number
      and rc.reclosure_fingerprint=workspace_post_unified_cg_reclosure_checks.reclosure_fingerprint
      and rc.source_recurrence_id=workspace_post_unified_cg_reclosure_checks.source_recurrence_id
      and rc.source_recurrence_fingerprint=workspace_post_unified_cg_reclosure_checks.source_recurrence_fingerprint
      and rc.source_regression_fingerprint=workspace_post_unified_cg_reclosure_checks.source_regression_fingerprint
      and rc.source_successor_fingerprint=workspace_post_unified_cg_reclosure_checks.source_successor_fingerprint
      and rc.predecessor_registry_fingerprint=workspace_post_unified_cg_reclosure_checks.predecessor_registry_fingerprint
      and rc.plan_fingerprint=workspace_post_unified_cg_reclosure_checks.plan_fingerprint
      and d.consumer_id=workspace_post_unified_cg_reclosure_checks.consumer_id
      and d.unified_package_id=workspace_post_unified_cg_reclosure_checks.unified_package_id
      and d.unified_replay_key=workspace_post_unified_cg_reclosure_checks.unified_replay_key
      and d.unified_package_fingerprint=workspace_post_unified_cg_reclosure_checks.unified_package_fingerprint
      and d.status='accepted'
      and p.status='approved'
      and s.successor_fingerprint=rc.source_successor_fingerprint
      and pred.registry_fingerprint=rc.predecessor_registry_fingerprint
      and c.status='closed'
      and not exists (
        select 1 from app.workspace_reconciliation_unified_cg_recurrences r2
        where r2.workspace_id=rc.workspace_id and r2.reclosure_id=rc.reclosure_id
      )
      and rc.reclosure_id=(
        select newest.reclosure_id
        from app.workspace_reconciliation_unified_cg_reclosures newest
        where newest.workspace_id=rc.workspace_id and newest.case_id=rc.case_id
        order by newest.closed_at desc,newest.reclosure_id desc
        limit 1
      )
  )
);

drop policy if exists ucg113_recurrences_member_select on app.workspace_reconciliation_unified_cg_recurrences;
create policy ucg113_recurrences_member_select
on app.workspace_reconciliation_unified_cg_recurrences
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_unified_cg_recurrences.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists ucg113_recurrences_manager_insert on app.workspace_reconciliation_unified_cg_recurrences;
create policy ucg113_recurrences_manager_insert
on app.workspace_reconciliation_unified_cg_recurrences
for insert to ai_data_runtime
with check (
  recurred_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_post_unified_cg_reclosure_checks x
    join app.workspace_reconciliation_unified_cg_reclosures rc
      on rc.workspace_id=x.workspace_id and rc.reclosure_id=x.reclosure_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=x.workspace_id and c.case_id=x.case_id
    join app.workspace_members wm
      on wm.workspace_id=x.workspace_id
     and wm.user_id=nullif(current_setting('app.user_id',true),'')
     and wm.role in ('owner','admin')
    where x.workspace_id=workspace_reconciliation_unified_cg_recurrences.workspace_id
      and x.regression_check_id=workspace_reconciliation_unified_cg_recurrences.regression_check_id
      and x.reclosure_id=workspace_reconciliation_unified_cg_recurrences.reclosure_id
      and x.successor_source_id=workspace_reconciliation_unified_cg_recurrences.successor_source_id
      and x.predecessor_generation_lineage_id=workspace_reconciliation_unified_cg_recurrences.predecessor_generation_lineage_id
      and x.case_id=workspace_reconciliation_unified_cg_recurrences.case_id
      and x.target=workspace_reconciliation_unified_cg_recurrences.target
      and x.generation_number=workspace_reconciliation_unified_cg_recurrences.generation_number
      and x.reclosure_fingerprint=workspace_reconciliation_unified_cg_recurrences.reclosure_fingerprint
      and x.verification_fingerprint=workspace_reconciliation_unified_cg_recurrences.regression_fingerprint
      and x.status='recurred'
      and c.status='closed'
      and x.regression_check_id=(
        select newest.regression_check_id
        from app.workspace_post_unified_cg_reclosure_checks newest
        where newest.workspace_id=x.workspace_id and newest.reclosure_id=x.reclosure_id
        order by newest.created_at desc,newest.regression_check_id desc
        limit 1
      )
      and rc.reclosure_id=(
        select newest.reclosure_id
        from app.workspace_reconciliation_unified_cg_reclosures newest
        where newest.workspace_id=rc.workspace_id and newest.case_id=rc.case_id
        order by newest.closed_at desc,newest.reclosure_id desc
        limit 1
      )
  )
);

create or replace function app.register_unified_cg_recurrence_lineage(
  p_workspace_id uuid,
  p_recurrence_id uuid,
  p_registry_fingerprint text,
  p_successor_fingerprint text
)
returns table(generation_lineage_id uuid, successor_source_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, app, auth
as $$
declare
  e record;
  v_user_id text;
begin
  v_user_id := nullif(current_setting('app.user_id',true),'');
  if v_user_id is null then
    raise exception 'unified_corrective_generation_lineage_user_required';
  end if;

  select
    r.recurrence_id,r.reclosure_id,r.regression_check_id,r.case_id,r.target,
    r.generation_number,r.reclosure_fingerprint,r.regression_fingerprint,
    r.recurrence_fingerprint,r.recurred_at,
    rc.corrective_generation_plan_id,rc.predecessor_generation_lineage_id,
    rc.source_recurrence_id,rc.source_recurrence_fingerprint,
    rc.source_regression_fingerprint,rc.plan_fingerprint,
    d.delivery_id,d.unified_package_id,d.unified_replay_key,d.unified_package_fingerprint,
    pred.registry_fingerprint as predecessor_registry_fingerprint
  into e
  from app.workspace_reconciliation_unified_cg_recurrences r
  join app.workspace_reconciliation_unified_cg_reclosures rc
    on rc.workspace_id=r.workspace_id and rc.reclosure_id=r.reclosure_id
  join app.workspace_unified_cg_live_deliveries d
    on d.workspace_id=rc.workspace_id and d.delivery_id=rc.delivery_id
  join app.workspace_corrective_generation_registry pred
    on pred.workspace_id=rc.workspace_id
   and pred.generation_lineage_id=rc.predecessor_generation_lineage_id
  join app.workspace_reconciliation_exception_cases c
    on c.workspace_id=r.workspace_id and c.case_id=r.case_id
  join app.workspace_members wm
    on wm.workspace_id=r.workspace_id and wm.user_id=v_user_id and wm.role in ('owner','admin')
  where r.workspace_id=p_workspace_id
    and r.recurrence_id=p_recurrence_id
    and c.status='closed'
    and d.status='accepted'
    and rc.reclosure_fingerprint=r.reclosure_fingerprint
    and r.regression_check_id=(
      select newest.regression_check_id
      from app.workspace_post_unified_cg_reclosure_checks newest
      where newest.workspace_id=r.workspace_id and newest.reclosure_id=r.reclosure_id
      order by newest.created_at desc,newest.regression_check_id desc
      limit 1
    )
  limit 1;

  if e.recurrence_id is null then
    raise exception 'unified_corrective_generation_lineage_verified_recurrence_required';
  end if;

  insert into app.workspace_corrective_generation_registry (
    workspace_id,generation_lineage_id,case_id,target,generation_number,generation_label,
    generation_state,source_kind,predecessor_generation_lineage_id,source_recurrence_id,
    source_recurrence_fingerprint,plan_id,plan_fingerprint,delivery_id,package_id,replay_key,
    package_fingerprint,reclosure_id,reclosure_fingerprint,terminal_recurrence_id,
    terminal_recurrence_fingerprint,terminal_regression_fingerprint,registry_fingerprint,registered_at
  ) values (
    p_workspace_id,e.corrective_generation_plan_id,e.case_id,e.target,e.generation_number,
    'corrective-generation-' || e.generation_number::text,'recurred','generic',
    e.predecessor_generation_lineage_id,e.source_recurrence_id,e.source_recurrence_fingerprint,
    e.corrective_generation_plan_id,e.plan_fingerprint,e.delivery_id,e.unified_package_id,
    e.unified_replay_key,e.unified_package_fingerprint,e.reclosure_id,e.reclosure_fingerprint,
    e.recurrence_id,e.recurrence_fingerprint,e.regression_fingerprint,p_registry_fingerprint,e.recurred_at
  )
  on conflict (workspace_id,plan_id) do nothing;

  insert into app.workspace_corrective_generation_successors (
    workspace_id,successor_source_id,predecessor_generation_lineage_id,case_id,target,
    generation_number,source_recurrence_kind,source_recurrence_id,source_recurrence_fingerprint,
    source_regression_fingerprint,status,successor_fingerprint,created_at
  ) values (
    p_workspace_id,e.recurrence_id,e.corrective_generation_plan_id,e.case_id,e.target,
    e.generation_number+1,'generic-corrective-generation',e.recurrence_id,e.recurrence_fingerprint,
    e.regression_fingerprint,'ready-for-planning',p_successor_fingerprint,e.recurred_at
  )
  on conflict (workspace_id,source_recurrence_id) do nothing;

  generation_lineage_id := e.corrective_generation_plan_id;
  successor_source_id := e.recurrence_id;
  return next;
end;
$$;

revoke all on function app.register_unified_cg_recurrence_lineage(uuid,uuid,text,text) from public;
grant execute on function app.register_unified_cg_recurrence_lineage(uuid,uuid,text,text) to ai_data_runtime;

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
      select 1 from app.workspace_reconciliation_continuation_cycle_recurrences x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1 from app.workspace_reconciliation_next_corrective_generation_recurrences x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1 from app.workspace_reconciliation_following_cg_recurrences x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    )
    and not exists (
      select 1 from app.workspace_reconciliation_unified_cg_recurrences x
      where x.workspace_id=new.workspace_id and x.case_id=new.case_id
        and x.recurred_at >= coalesce(old.closed_at,'epoch'::timestamptz)
    ) then
      raise exception 'reconciliation_exception_governed_reopen_required';
    end if;
  end if;
  return new;
end;
$$;



create or replace function app.require_no_unified_cg_recurrence_for_successor()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from app.workspace_reconciliation_unified_cg_recurrences r
    where r.workspace_id=new.workspace_id
      and r.successor_source_id=new.successor_source_id
  ) then
    raise exception 'unified_corrective_generation_recurrence_requires_new_generation';
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_ucg113_plan_recur_guard on app.workspace_corrective_generation_plans;
create trigger workspace_ucg113_plan_recur_guard
before insert or update on app.workspace_corrective_generation_plans
for each row execute function app.require_no_unified_cg_recurrence_for_successor();

drop trigger if exists workspace_ucg113_retriage_recur_guard on app.workspace_corrective_generation_retriage;
create trigger workspace_ucg113_retriage_recur_guard
before insert or update on app.workspace_corrective_generation_retriage
for each row execute function app.require_no_unified_cg_recurrence_for_successor();

drop trigger if exists workspace_ucg113_activation_recur_guard on app.workspace_unified_cg_delivery_activations;
create trigger workspace_ucg113_activation_recur_guard
before insert or update on app.workspace_unified_cg_delivery_activations
for each row execute function app.require_no_unified_cg_recurrence_for_successor();

drop trigger if exists workspace_ucg113_recon_recur_guard on app.workspace_unified_cg_delivery_reconciliations;
create trigger workspace_ucg113_recon_recur_guard
before insert or update on app.workspace_unified_cg_delivery_reconciliations
for each row execute function app.require_no_unified_cg_recurrence_for_successor();

drop trigger if exists workspace_ucg113_reclosure_recur_guard on app.workspace_reconciliation_unified_cg_reclosures;
create trigger workspace_ucg113_reclosure_recur_guard
before insert or update on app.workspace_reconciliation_unified_cg_reclosures
for each row execute function app.require_no_unified_cg_recurrence_for_successor();

create or replace function app.require_no_unified_cg_recurrence_for_delivery()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from app.workspace_corrective_generation_plans p
    join app.workspace_reconciliation_unified_cg_recurrences r
      on r.workspace_id=p.workspace_id and r.successor_source_id=p.successor_source_id
    where p.workspace_id=new.workspace_id
      and p.corrective_generation_plan_id=new.corrective_generation_plan_id
  ) then
    raise exception 'unified_corrective_generation_recurrence_requires_new_generation';
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_ucg113_delivery_recur_guard on app.workspace_unified_cg_live_deliveries;
create trigger workspace_ucg113_delivery_recur_guard
before insert or update on app.workspace_unified_cg_live_deliveries
for each row execute function app.require_no_unified_cg_recurrence_for_delivery();
