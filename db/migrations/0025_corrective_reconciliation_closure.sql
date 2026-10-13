create table if not exists app.workspace_corrective_delivery_reconciliations (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  corrective_reconciliation_id uuid not null,
  corrective_delivery_id uuid not null,
  source_delivery_id uuid not null,
  plan_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 512),
  plan_fingerprint text not null check (char_length(plan_fingerprint) between 1 and 128),
  corrective_package_id text not null check (char_length(corrective_package_id) between 1 and 512),
  corrective_replay_key text not null check (char_length(corrective_replay_key) between 1 and 1024),
  corrective_package_fingerprint text not null check (char_length(corrective_package_fingerprint) between 1 and 128),
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
  primary key (workspace_id,corrective_reconciliation_id),
  foreign key (workspace_id,corrective_delivery_id)
    references app.workspace_corrective_live_deliveries(workspace_id,delivery_id)
    on delete restrict,
  foreign key (workspace_id,source_delivery_id)
    references app.workspace_publication_live_deliveries(workspace_id,delivery_id)
    on delete restrict,
  foreign key (workspace_id,plan_id)
    references app.workspace_corrective_delivery_plans(workspace_id,plan_id)
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

create index if not exists workspace_corrective_delivery_reconciliations_recent_idx
  on app.workspace_corrective_delivery_reconciliations(workspace_id,created_at desc);

create index if not exists workspace_corrective_delivery_reconciliations_delivery_idx
  on app.workspace_corrective_delivery_reconciliations(
    workspace_id,corrective_delivery_id,created_at desc
  );

create table if not exists app.workspace_reconciliation_exception_closures (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  closure_id uuid not null,
  case_id uuid not null,
  plan_id uuid not null,
  corrective_delivery_id uuid not null,
  corrective_reconciliation_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  plan_fingerprint text not null check (char_length(plan_fingerprint) between 1 and 128),
  corrective_package_fingerprint text not null check (char_length(corrective_package_fingerprint) between 1 and 128),
  verification_fingerprint text not null check (char_length(verification_fingerprint) between 1 and 128),
  closure_fingerprint text not null check (char_length(closure_fingerprint) between 1 and 128),
  closure_note text not null check (char_length(closure_note) between 1 and 8000),
  closed_by text not null references auth."user"(id) on delete restrict,
  closed_at timestamptz not null default now(),
  primary key (workspace_id,closure_id),
  unique (workspace_id,case_id),
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict,
  foreign key (workspace_id,plan_id)
    references app.workspace_corrective_delivery_plans(workspace_id,plan_id)
    on delete restrict,
  foreign key (workspace_id,corrective_delivery_id)
    references app.workspace_corrective_live_deliveries(workspace_id,delivery_id)
    on delete restrict,
  foreign key (workspace_id,corrective_reconciliation_id)
    references app.workspace_corrective_delivery_reconciliations(workspace_id,corrective_reconciliation_id)
    on delete restrict
);

create index if not exists workspace_reconciliation_exception_closures_recent_idx
  on app.workspace_reconciliation_exception_closures(workspace_id,closed_at desc);

grant select,insert on app.workspace_corrective_delivery_reconciliations to ai_data_runtime;
grant select,insert on app.workspace_reconciliation_exception_closures to ai_data_runtime;

alter table app.workspace_corrective_delivery_reconciliations enable row level security;
alter table app.workspace_reconciliation_exception_closures enable row level security;

drop policy if exists workspace_corrective_delivery_reconciliations_member_select
  on app.workspace_corrective_delivery_reconciliations;
create policy workspace_corrective_delivery_reconciliations_member_select
on app.workspace_corrective_delivery_reconciliations
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_delivery_reconciliations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workspace_corrective_delivery_reconciliations_manager_insert
  on app.workspace_corrective_delivery_reconciliations;
create policy workspace_corrective_delivery_reconciliations_manager_insert
on app.workspace_corrective_delivery_reconciliations
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
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

drop policy if exists workspace_reconciliation_exception_closures_member_select
  on app.workspace_reconciliation_exception_closures;
create policy workspace_reconciliation_exception_closures_member_select
on app.workspace_reconciliation_exception_closures
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_exception_closures.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workspace_reconciliation_exception_closures_manager_insert
  on app.workspace_reconciliation_exception_closures;
create policy workspace_reconciliation_exception_closures_manager_insert
on app.workspace_reconciliation_exception_closures
for insert to ai_data_runtime
with check (
  closed_by=nullif(current_setting('app.user_id',true),'')
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
    ) then
      raise exception 'reconciliation_triage_verified_closure_required';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_reconciliation_exception_verified_close_guard
  on app.workspace_reconciliation_exception_cases;
create trigger workspace_reconciliation_exception_verified_close_guard
before update of status on app.workspace_reconciliation_exception_cases
for each row
execute function app.require_verified_corrective_closure();
