-- Build 112 — Unified Corrective-Generation Delivery Reconciliation & Verified Re-Closure

create table if not exists app.workspace_unified_cg_delivery_reconciliations (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  reconciliation_id uuid not null,
  delivery_id uuid not null,
  activation_id uuid not null,
  corrective_generation_plan_id uuid not null,
  corrective_generation_retriage_id uuid not null,
  successor_source_id uuid not null,
  predecessor_generation_lineage_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  generation_number integer not null check (generation_number between 2 and 10000),
  consumer_id text not null check (char_length(consumer_id) between 1 and 512),
  plan_fingerprint text not null check (char_length(plan_fingerprint) between 1 and 128),
  source_recurrence_id uuid not null,
  source_recurrence_fingerprint text not null check (char_length(source_recurrence_fingerprint) between 1 and 128),
  source_regression_fingerprint text not null check (char_length(source_regression_fingerprint) between 1 and 128),
  source_successor_fingerprint text not null check (char_length(source_successor_fingerprint) between 1 and 512),
  predecessor_registry_fingerprint text not null check (char_length(predecessor_registry_fingerprint) between 1 and 512),
  unified_package_id text not null check (char_length(unified_package_id) between 1 and 512),
  unified_replay_key text not null check (char_length(unified_replay_key) between 1 and 1024),
  unified_package_fingerprint text not null check (char_length(unified_package_fingerprint) between 1 and 128),
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
  primary key (workspace_id,reconciliation_id),
  foreign key (workspace_id,delivery_id)
    references app.workspace_unified_cg_live_deliveries(workspace_id,delivery_id) on delete restrict,
  foreign key (workspace_id,activation_id)
    references app.workspace_unified_cg_delivery_activations(workspace_id,activation_id) on delete restrict,
  foreign key (workspace_id,corrective_generation_plan_id)
    references app.workspace_corrective_generation_plans(workspace_id,corrective_generation_plan_id) on delete restrict,
  foreign key (workspace_id,corrective_generation_retriage_id)
    references app.workspace_corrective_generation_retriage(workspace_id,corrective_generation_retriage_id) on delete restrict,
  foreign key (workspace_id,successor_source_id)
    references app.workspace_corrective_generation_successors(workspace_id,successor_source_id) on delete restrict,
  foreign key (workspace_id,predecessor_generation_lineage_id)
    references app.workspace_corrective_generation_registry(workspace_id,generation_lineage_id) on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id) on delete restrict,
  check (
    (status in ('matched','drift') and matched_count + mismatched_count + missing_count = expected_record_count)
    or
    (status in ('rejected','transport-error') and matched_count=0 and mismatched_count=0 and missing_count=0)
  )
);

create index if not exists workspace_ucg112_recon_recent_idx
  on app.workspace_unified_cg_delivery_reconciliations(workspace_id,created_at desc);
create index if not exists workspace_ucg112_recon_delivery_idx
  on app.workspace_unified_cg_delivery_reconciliations(
    workspace_id,delivery_id,created_at desc,reconciliation_id desc
  );

create table if not exists app.workspace_reconciliation_unified_cg_reclosures (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  reclosure_id uuid not null,
  predecessor_generation_lineage_id uuid not null,
  successor_source_id uuid not null,
  corrective_generation_retriage_id uuid not null,
  corrective_generation_plan_id uuid not null,
  delivery_id uuid not null,
  reconciliation_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  generation_number integer not null check (generation_number between 2 and 10000),
  predecessor_registry_fingerprint text not null check (char_length(predecessor_registry_fingerprint) between 1 and 512),
  source_recurrence_id uuid not null,
  source_recurrence_fingerprint text not null check (char_length(source_recurrence_fingerprint) between 1 and 128),
  source_regression_fingerprint text not null check (char_length(source_regression_fingerprint) between 1 and 128),
  source_successor_fingerprint text not null check (char_length(source_successor_fingerprint) between 1 and 512),
  plan_fingerprint text not null check (char_length(plan_fingerprint) between 1 and 128),
  package_fingerprint text not null check (char_length(package_fingerprint) between 1 and 128),
  verification_fingerprint text not null check (char_length(verification_fingerprint) between 1 and 128),
  reclosure_fingerprint text not null check (char_length(reclosure_fingerprint) between 1 and 128),
  reclosure_note text not null check (char_length(reclosure_note) between 1 and 8000),
  closed_by text not null references auth."user"(id) on delete restrict,
  closed_at timestamptz not null default now(),
  primary key (workspace_id,reclosure_id),
  unique (workspace_id,successor_source_id),
  foreign key (workspace_id,predecessor_generation_lineage_id)
    references app.workspace_corrective_generation_registry(workspace_id,generation_lineage_id) on delete restrict,
  foreign key (workspace_id,successor_source_id)
    references app.workspace_corrective_generation_successors(workspace_id,successor_source_id) on delete restrict,
  foreign key (workspace_id,corrective_generation_retriage_id)
    references app.workspace_corrective_generation_retriage(workspace_id,corrective_generation_retriage_id) on delete restrict,
  foreign key (workspace_id,corrective_generation_plan_id)
    references app.workspace_corrective_generation_plans(workspace_id,corrective_generation_plan_id) on delete restrict,
  foreign key (workspace_id,delivery_id)
    references app.workspace_unified_cg_live_deliveries(workspace_id,delivery_id) on delete restrict,
  foreign key (workspace_id,reconciliation_id)
    references app.workspace_unified_cg_delivery_reconciliations(workspace_id,reconciliation_id) on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id) on delete restrict
);

create index if not exists workspace_ucg112_reclosure_recent_idx
  on app.workspace_reconciliation_unified_cg_reclosures(
    workspace_id,closed_at desc,reclosure_id desc
  );

grant select,insert on app.workspace_unified_cg_delivery_reconciliations to ai_data_runtime;
grant select,insert on app.workspace_reconciliation_unified_cg_reclosures to ai_data_runtime;

alter table app.workspace_unified_cg_delivery_reconciliations enable row level security;
alter table app.workspace_reconciliation_unified_cg_reclosures enable row level security;

drop policy if exists ucg112_reconciliations_member_select on app.workspace_unified_cg_delivery_reconciliations;
create policy ucg112_reconciliations_member_select
on app.workspace_unified_cg_delivery_reconciliations
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_unified_cg_delivery_reconciliations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists ucg112_reconciliations_manager_insert on app.workspace_unified_cg_delivery_reconciliations;
create policy ucg112_reconciliations_manager_insert
on app.workspace_unified_cg_delivery_reconciliations
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_unified_cg_live_deliveries d
    join app.workspace_unified_cg_delivery_activations a
      on a.workspace_id=d.workspace_id and a.activation_id=d.activation_id
    join app.workspace_corrective_generation_plans p
      on p.workspace_id=d.workspace_id
     and p.corrective_generation_plan_id=d.corrective_generation_plan_id
    join app.workspace_corrective_generation_retriage t
      on t.workspace_id=p.workspace_id
     and t.corrective_generation_retriage_id=p.corrective_generation_retriage_id
    join app.workspace_corrective_generation_successors s
      on s.workspace_id=p.workspace_id and s.successor_source_id=p.successor_source_id
    join app.workspace_corrective_generation_registry pred
      on pred.workspace_id=p.workspace_id
     and pred.generation_lineage_id=p.predecessor_generation_lineage_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    where d.workspace_id=workspace_unified_cg_delivery_reconciliations.workspace_id
      and d.delivery_id=workspace_unified_cg_delivery_reconciliations.delivery_id
      and d.activation_id=workspace_unified_cg_delivery_reconciliations.activation_id
      and d.corrective_generation_plan_id=workspace_unified_cg_delivery_reconciliations.corrective_generation_plan_id
      and d.target=workspace_unified_cg_delivery_reconciliations.target
      and d.generation_number=workspace_unified_cg_delivery_reconciliations.generation_number
      and d.consumer_id=workspace_unified_cg_delivery_reconciliations.consumer_id
      and d.plan_fingerprint=workspace_unified_cg_delivery_reconciliations.plan_fingerprint
      and d.unified_package_id=workspace_unified_cg_delivery_reconciliations.unified_package_id
      and d.unified_replay_key=workspace_unified_cg_delivery_reconciliations.unified_replay_key
      and d.unified_package_fingerprint=workspace_unified_cg_delivery_reconciliations.unified_package_fingerprint
      and d.status='accepted'
      and p.corrective_generation_retriage_id=workspace_unified_cg_delivery_reconciliations.corrective_generation_retriage_id
      and p.successor_source_id=workspace_unified_cg_delivery_reconciliations.successor_source_id
      and p.predecessor_generation_lineage_id=workspace_unified_cg_delivery_reconciliations.predecessor_generation_lineage_id
      and p.case_id=workspace_unified_cg_delivery_reconciliations.case_id
      and p.source_recurrence_id=workspace_unified_cg_delivery_reconciliations.source_recurrence_id
      and p.status='approved'
      and p.plan_fingerprint=workspace_unified_cg_delivery_reconciliations.plan_fingerprint
      and p.source_recurrence_fingerprint=workspace_unified_cg_delivery_reconciliations.source_recurrence_fingerprint
      and p.source_regression_fingerprint=workspace_unified_cg_delivery_reconciliations.source_regression_fingerprint
      and p.source_successor_fingerprint=workspace_unified_cg_delivery_reconciliations.source_successor_fingerprint
      and t.status='approved'
      and t.successor_source_id=p.successor_source_id
      and s.source_recurrence_id=p.source_recurrence_id
      and s.source_recurrence_fingerprint=p.source_recurrence_fingerprint
      and s.source_regression_fingerprint=p.source_regression_fingerprint
      and s.successor_fingerprint=p.source_successor_fingerprint
      and pred.registry_fingerprint=workspace_unified_cg_delivery_reconciliations.predecessor_registry_fingerprint
      and c.status='open'
      and s.successor_source_id=(
        select newest.successor_source_id
        from app.workspace_corrective_generation_successors newest
        where newest.workspace_id=s.workspace_id and newest.case_id=s.case_id
        order by newest.generation_number desc,newest.created_at desc,newest.successor_source_id desc
        limit 1
      )
  )
);

drop policy if exists ucg112_reclosures_member_select on app.workspace_reconciliation_unified_cg_reclosures;
create policy ucg112_reclosures_member_select
on app.workspace_reconciliation_unified_cg_reclosures
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_unified_cg_reclosures.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists ucg112_reclosures_manager_insert on app.workspace_reconciliation_unified_cg_reclosures;
create policy ucg112_reclosures_manager_insert
on app.workspace_reconciliation_unified_cg_reclosures
for insert to ai_data_runtime
with check (
  closed_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_unified_cg_delivery_reconciliations vr
    join app.workspace_unified_cg_live_deliveries d
      on d.workspace_id=vr.workspace_id and d.delivery_id=vr.delivery_id
    join app.workspace_corrective_generation_plans p
      on p.workspace_id=vr.workspace_id
     and p.corrective_generation_plan_id=vr.corrective_generation_plan_id
    join app.workspace_corrective_generation_retriage t
      on t.workspace_id=p.workspace_id
     and t.corrective_generation_retriage_id=p.corrective_generation_retriage_id
    join app.workspace_corrective_generation_successors s
      on s.workspace_id=p.workspace_id and s.successor_source_id=p.successor_source_id
    join app.workspace_corrective_generation_registry pred
      on pred.workspace_id=p.workspace_id
     and pred.generation_lineage_id=p.predecessor_generation_lineage_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    join app.workspace_members wm
      on wm.workspace_id=p.workspace_id
     and wm.user_id=nullif(current_setting('app.user_id',true),'')
     and wm.role in ('owner','admin')
    where vr.workspace_id=workspace_reconciliation_unified_cg_reclosures.workspace_id
      and vr.reconciliation_id=workspace_reconciliation_unified_cg_reclosures.reconciliation_id
      and vr.delivery_id=workspace_reconciliation_unified_cg_reclosures.delivery_id
      and vr.corrective_generation_plan_id=workspace_reconciliation_unified_cg_reclosures.corrective_generation_plan_id
      and vr.corrective_generation_retriage_id=workspace_reconciliation_unified_cg_reclosures.corrective_generation_retriage_id
      and vr.successor_source_id=workspace_reconciliation_unified_cg_reclosures.successor_source_id
      and vr.predecessor_generation_lineage_id=workspace_reconciliation_unified_cg_reclosures.predecessor_generation_lineage_id
      and vr.case_id=workspace_reconciliation_unified_cg_reclosures.case_id
      and vr.target=workspace_reconciliation_unified_cg_reclosures.target
      and vr.generation_number=workspace_reconciliation_unified_cg_reclosures.generation_number
      and vr.predecessor_registry_fingerprint=workspace_reconciliation_unified_cg_reclosures.predecessor_registry_fingerprint
      and vr.source_recurrence_id=workspace_reconciliation_unified_cg_reclosures.source_recurrence_id
      and vr.source_recurrence_fingerprint=workspace_reconciliation_unified_cg_reclosures.source_recurrence_fingerprint
      and vr.source_regression_fingerprint=workspace_reconciliation_unified_cg_reclosures.source_regression_fingerprint
      and vr.source_successor_fingerprint=workspace_reconciliation_unified_cg_reclosures.source_successor_fingerprint
      and vr.plan_fingerprint=workspace_reconciliation_unified_cg_reclosures.plan_fingerprint
      and vr.unified_package_fingerprint=workspace_reconciliation_unified_cg_reclosures.package_fingerprint
      and vr.verification_fingerprint=workspace_reconciliation_unified_cg_reclosures.verification_fingerprint
      and vr.status='matched'
      and d.status='accepted'
      and p.status='approved'
      and t.status='approved'
      and c.status='open'
      and pred.registry_fingerprint=workspace_reconciliation_unified_cg_reclosures.predecessor_registry_fingerprint
      and s.source_recurrence_id=workspace_reconciliation_unified_cg_reclosures.source_recurrence_id
      and s.source_recurrence_fingerprint=workspace_reconciliation_unified_cg_reclosures.source_recurrence_fingerprint
      and s.source_regression_fingerprint=workspace_reconciliation_unified_cg_reclosures.source_regression_fingerprint
      and s.successor_fingerprint=workspace_reconciliation_unified_cg_reclosures.source_successor_fingerprint
      and vr.reconciliation_id=(
        select newest.reconciliation_id
        from app.workspace_unified_cg_delivery_reconciliations newest
        where newest.workspace_id=vr.workspace_id and newest.delivery_id=vr.delivery_id
        order by newest.created_at desc,newest.reconciliation_id desc
        limit 1
      )
      and s.successor_source_id=(
        select newest.successor_source_id
        from app.workspace_corrective_generation_successors newest
        where newest.workspace_id=s.workspace_id and newest.case_id=s.case_id
        order by newest.generation_number desc,newest.created_at desc,newest.successor_source_id desc
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
      select 1 from app.workspace_corrective_generation_successors s
      where s.workspace_id=new.workspace_id and s.case_id=new.case_id
    ) then
      if not exists (
        select 1 from app.workspace_reconciliation_unified_cg_reclosures rc
        where rc.workspace_id=new.workspace_id and rc.case_id=new.case_id
          and rc.successor_source_id=(
            select newest.successor_source_id
            from app.workspace_corrective_generation_successors newest
            where newest.workspace_id=new.workspace_id and newest.case_id=new.case_id
            order by newest.generation_number desc,newest.created_at desc,newest.successor_source_id desc
            limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_unified_corrective_generation_reclosure_required';
      end if;
    elsif exists (
      select 1 from app.workspace_reconciliation_following_cg_recurrences r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      raise exception 'reconciliation_triage_post_following_corrective_generation_reclosure_required';
    elsif exists (
      select 1 from app.workspace_reconciliation_next_corrective_generation_recurrences r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      if not exists (
        select 1 from app.workspace_reconciliation_following_cg_reclosures rc
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
      select 1 from app.workspace_reconciliation_continuation_cycle_recurrences r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      if not exists (
        select 1 from app.workspace_reconciliation_next_corrective_generation_reclosures rc
        where rc.workspace_id=new.workspace_id and rc.case_id=new.case_id
          and rc.continuation_cycle_recurrence_id=(
            select lr.continuation_cycle_recurrence_id
            from app.workspace_reconciliation_continuation_cycle_recurrences lr
            where lr.workspace_id=new.workspace_id and lr.case_id=new.case_id
            order by lr.recurred_at desc,lr.continuation_cycle_recurrence_id desc limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_next_corrective_generation_reclosure_required';
      end if;
    elsif exists (
      select 1 from app.workspace_reconciliation_successive_cycle_recurrences r
      where r.workspace_id=new.workspace_id and r.case_id=new.case_id
    ) then
      if not exists (
        select 1 from app.workspace_reconciliation_continuation_cycle_reclosures rc
        where rc.workspace_id=new.workspace_id and rc.case_id=new.case_id
          and rc.successive_cycle_recurrence_id=(
            select lr.successive_cycle_recurrence_id
            from app.workspace_reconciliation_successive_cycle_recurrences lr
            where lr.workspace_id=new.workspace_id and lr.case_id=new.case_id
            order by lr.recurred_at desc,lr.successive_cycle_recurrence_id desc limit 1
          )
      ) then
        raise exception 'reconciliation_triage_verified_continuation_cycle_reclosure_required';
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

