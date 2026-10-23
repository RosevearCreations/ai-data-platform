-- Build 114 — Legacy Corrective-Generation Compatibility & Historical Lineage Bridge

create table if not exists app.workspace_cg_legacy_terminal_events (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  legacy_terminal_event_id uuid not null,
  generation_lineage_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  generation_number integer not null check (generation_number in (1,2)),
  source_kind text not null check (source_kind in ('legacy-next','legacy-following')),
  plan_id uuid not null,
  terminal_recurrence_id uuid not null,
  terminal_recurrence_fingerprint text not null
    check (char_length(terminal_recurrence_fingerprint) between 1 and 128),
  terminal_regression_fingerprint text not null
    check (char_length(terminal_regression_fingerprint) between 1 and 128),
  event_fingerprint text not null check (char_length(event_fingerprint) between 1 and 512),
  observed_at timestamptz not null,
  adopted_by text not null references auth."user"(id) on delete restrict,
  adopted_at timestamptz not null default now(),
  primary key (workspace_id,legacy_terminal_event_id),
  unique (workspace_id,generation_lineage_id),
  unique (workspace_id,terminal_recurrence_id),
  foreign key (workspace_id,generation_lineage_id)
    references app.workspace_corrective_generation_registry(workspace_id,generation_lineage_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict
);

create index if not exists workspace_cg_legacy_terminal_recent_idx
  on app.workspace_cg_legacy_terminal_events(workspace_id,adopted_at desc);

revoke all on app.workspace_cg_legacy_terminal_events from ai_data_runtime;
grant select on app.workspace_cg_legacy_terminal_events to ai_data_runtime;

alter table app.workspace_cg_legacy_terminal_events enable row level security;

drop policy if exists cg_legacy_terminal_member_select
  on app.workspace_cg_legacy_terminal_events;
create policy cg_legacy_terminal_member_select
on app.workspace_cg_legacy_terminal_events
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=workspace_cg_legacy_terminal_events.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

create or replace function app.reject_cg_legacy_terminal_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'corrective_generation_legacy_terminal_append_only';
end;
$$;

drop trigger if exists workspace_cg_legacy_terminal_immutable_guard
  on app.workspace_cg_legacy_terminal_events;
create trigger workspace_cg_legacy_terminal_immutable_guard
before update or delete on app.workspace_cg_legacy_terminal_events
for each row execute function app.reject_cg_legacy_terminal_mutation();

create or replace function app.bridge_legacy_corrective_generation_lineage(
  p_workspace_id uuid,
  p_source_kind text,
  p_plan_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, app, auth
as $$
declare
  v_user_id text;
  v_role text;
  v_source record;
  v_registry record;
  v_event record;
  v_successor record;
  v_registry_fingerprint text;
  v_event_fingerprint text;
  v_successor_fingerprint text;
  v_effective_state text;
  v_action text := 'verified-existing';
  v_inserted integer := 0;
begin
  v_user_id := nullif(current_setting('app.user_id',true),'');
  if v_user_id is null then
    raise exception 'legacy_corrective_generation_bridge_user_required';
  end if;

  select wm.role
    into v_role
    from app.workspace_members wm
   where wm.workspace_id=p_workspace_id
     and wm.user_id=v_user_id
   limit 1;

  if v_role is null or v_role not in ('owner','admin') then
    raise exception 'legacy_corrective_generation_bridge_manager_required';
  end if;

  if p_source_kind is null or p_source_kind not in ('legacy-next','legacy-following') then
    raise exception 'legacy_corrective_generation_bridge_source_kind_invalid';
  end if;

  if p_source_kind='legacy-next' then
    select
      p.workspace_id,
      p.next_corrective_generation_plan_id as plan_id,
      p.case_id,
      p.target,
      p.continuation_cycle_recurrence_id as source_recurrence_id,
      p.source_continuation_cycle_recurrence_fingerprint as source_recurrence_fingerprint,
      p.plan_fingerprint,
      d.delivery_id,
      d.next_corrective_generation_package_id as package_id,
      d.next_corrective_generation_replay_key as replay_key,
      d.next_corrective_generation_package_fingerprint as package_fingerprint,
      rc.next_corrective_generation_reclosure_id as reclosure_id,
      rc.next_corrective_generation_reclosure_fingerprint as reclosure_fingerprint,
      rc.closed_at,
      r.next_corrective_generation_recurrence_id as terminal_recurrence_id,
      r.next_corrective_generation_recurrence_fingerprint as terminal_recurrence_fingerprint,
      r.regression_fingerprint as terminal_regression_fingerprint,
      r.recurred_at as terminal_recurred_at
    into v_source
    from app.workspace_next_corrective_generation_plans p
    join app.workspace_reconciliation_next_corrective_generation_reclosures rc
      on rc.workspace_id=p.workspace_id
     and rc.next_corrective_generation_plan_id=p.next_corrective_generation_plan_id
    join app.workspace_next_corrective_generation_live_deliveries d
      on d.workspace_id=rc.workspace_id
     and d.delivery_id=rc.next_corrective_generation_delivery_id
     and d.status='accepted'
    left join app.workspace_reconciliation_next_corrective_generation_recurrences r
      on r.workspace_id=rc.workspace_id
     and r.next_corrective_generation_reclosure_id=rc.next_corrective_generation_reclosure_id
    where p.workspace_id=p_workspace_id
      and p.next_corrective_generation_plan_id=p_plan_id
      and p.status='approved'
    limit 1;

    if not found then
      raise exception 'legacy_corrective_generation_bridge_complete_next_evidence_required';
    end if;

    v_registry_fingerprint :=
      'corrective-generation-registry1-' || md5(
        concat_ws(
          '|',
          v_source.plan_fingerprint,
          v_source.reclosure_fingerprint,
          coalesce(v_source.terminal_recurrence_fingerprint,'stable')
        )
      );

    insert into app.workspace_corrective_generation_registry (
      workspace_id,generation_lineage_id,case_id,target,generation_number,generation_label,
      generation_state,source_kind,predecessor_generation_lineage_id,source_recurrence_id,
      source_recurrence_fingerprint,plan_id,plan_fingerprint,delivery_id,package_id,replay_key,
      package_fingerprint,reclosure_id,reclosure_fingerprint,terminal_recurrence_id,
      terminal_recurrence_fingerprint,terminal_regression_fingerprint,registry_fingerprint,registered_at
    ) values (
      v_source.workspace_id,v_source.plan_id,v_source.case_id,v_source.target,1,
      'next-corrective-generation',
      case when v_source.terminal_recurrence_id is null then 'reclosed' else 'recurred' end,
      'legacy-next',null,v_source.source_recurrence_id,v_source.source_recurrence_fingerprint,
      v_source.plan_id,v_source.plan_fingerprint,v_source.delivery_id,v_source.package_id,
      v_source.replay_key,v_source.package_fingerprint,v_source.reclosure_id,
      v_source.reclosure_fingerprint,v_source.terminal_recurrence_id,
      v_source.terminal_recurrence_fingerprint,v_source.terminal_regression_fingerprint,
      v_registry_fingerprint,v_source.closed_at
    )
    on conflict do nothing;

    get diagnostics v_inserted = row_count;
    if v_inserted=1 then
      v_action := 'lineage-backfilled';
    end if;

    select r.*
      into v_registry
      from app.workspace_corrective_generation_registry r
     where r.workspace_id=p_workspace_id
       and r.plan_id=p_plan_id
     limit 1;

    if not found
       or v_registry.generation_lineage_id is distinct from v_source.plan_id
       or v_registry.case_id is distinct from v_source.case_id
       or v_registry.target is distinct from v_source.target
       or v_registry.generation_number is distinct from 1
       or v_registry.source_kind is distinct from 'legacy-next'
       or v_registry.predecessor_generation_lineage_id is not null
       or v_registry.source_recurrence_id is distinct from v_source.source_recurrence_id
       or v_registry.source_recurrence_fingerprint is distinct from v_source.source_recurrence_fingerprint
       or v_registry.plan_fingerprint is distinct from v_source.plan_fingerprint
       or v_registry.delivery_id is distinct from v_source.delivery_id
       or v_registry.package_id is distinct from v_source.package_id
       or v_registry.replay_key is distinct from v_source.replay_key
       or v_registry.package_fingerprint is distinct from v_source.package_fingerprint
       or v_registry.reclosure_id is distinct from v_source.reclosure_id
       or v_registry.reclosure_fingerprint is distinct from v_source.reclosure_fingerprint then
      raise exception 'legacy_corrective_generation_bridge_registry_conflict';
    end if;

  else
    select
      p.workspace_id,
      p.following_corrective_generation_plan_id as plan_id,
      p.case_id,
      p.target,
      p.predecessor_next_corrective_generation_plan_id as predecessor_plan_id,
      p.next_corrective_generation_recurrence_id as source_recurrence_id,
      p.source_next_corrective_generation_recurrence_fingerprint as source_recurrence_fingerprint,
      p.plan_fingerprint,
      d.delivery_id,
      d.following_corrective_generation_package_id as package_id,
      d.following_corrective_generation_replay_key as replay_key,
      d.following_corrective_generation_package_fingerprint as package_fingerprint,
      rc.following_corrective_generation_reclosure_id as reclosure_id,
      rc.following_corrective_generation_reclosure_fingerprint as reclosure_fingerprint,
      rc.closed_at,
      r.following_corrective_generation_recurrence_id as terminal_recurrence_id,
      r.following_corrective_generation_recurrence_fingerprint as terminal_recurrence_fingerprint,
      r.regression_fingerprint as terminal_regression_fingerprint,
      r.recurred_at as terminal_recurred_at
    into v_source
    from app.workspace_following_corrective_generation_plans p
    join app.workspace_reconciliation_following_cg_reclosures rc
      on rc.workspace_id=p.workspace_id
     and rc.following_corrective_generation_plan_id=p.following_corrective_generation_plan_id
    join app.workspace_following_corrective_generation_live_deliveries d
      on d.workspace_id=rc.workspace_id
     and d.delivery_id=rc.following_corrective_generation_delivery_id
     and d.status='accepted'
    left join app.workspace_reconciliation_following_cg_recurrences r
      on r.workspace_id=rc.workspace_id
     and r.following_corrective_generation_reclosure_id=rc.following_corrective_generation_reclosure_id
    where p.workspace_id=p_workspace_id
      and p.following_corrective_generation_plan_id=p_plan_id
      and p.status='approved'
    limit 1;

    if not found then
      raise exception 'legacy_corrective_generation_bridge_complete_following_evidence_required';
    end if;

    perform app.bridge_legacy_corrective_generation_lineage(
      p_workspace_id,
      'legacy-next',
      v_source.predecessor_plan_id
    );

    select r.*
      into v_event
      from app.workspace_corrective_generation_registry r
     where r.workspace_id=p_workspace_id
       and r.plan_id=v_source.predecessor_plan_id
     limit 1;

    if not found or v_event.generation_number<>1 then
      raise exception 'legacy_corrective_generation_bridge_predecessor_required';
    end if;

    v_registry_fingerprint :=
      'corrective-generation-registry1-' || md5(
        concat_ws(
          '|',
          v_source.plan_fingerprint,
          v_source.reclosure_fingerprint,
          coalesce(v_source.terminal_recurrence_fingerprint,'stable')
        )
      );

    insert into app.workspace_corrective_generation_registry (
      workspace_id,generation_lineage_id,case_id,target,generation_number,generation_label,
      generation_state,source_kind,predecessor_generation_lineage_id,source_recurrence_id,
      source_recurrence_fingerprint,plan_id,plan_fingerprint,delivery_id,package_id,replay_key,
      package_fingerprint,reclosure_id,reclosure_fingerprint,terminal_recurrence_id,
      terminal_recurrence_fingerprint,terminal_regression_fingerprint,registry_fingerprint,registered_at
    ) values (
      v_source.workspace_id,v_source.plan_id,v_source.case_id,v_source.target,2,
      'following-corrective-generation',
      case when v_source.terminal_recurrence_id is null then 'reclosed' else 'recurred' end,
      'legacy-following',v_source.predecessor_plan_id,v_source.source_recurrence_id,
      v_source.source_recurrence_fingerprint,v_source.plan_id,v_source.plan_fingerprint,
      v_source.delivery_id,v_source.package_id,v_source.replay_key,v_source.package_fingerprint,
      v_source.reclosure_id,v_source.reclosure_fingerprint,v_source.terminal_recurrence_id,
      v_source.terminal_recurrence_fingerprint,v_source.terminal_regression_fingerprint,
      v_registry_fingerprint,v_source.closed_at
    )
    on conflict do nothing;

    get diagnostics v_inserted = row_count;
    if v_inserted=1 then
      v_action := 'lineage-backfilled';
    end if;

    select r.*
      into v_registry
      from app.workspace_corrective_generation_registry r
     where r.workspace_id=p_workspace_id
       and r.plan_id=p_plan_id
     limit 1;

    if not found
       or v_registry.generation_lineage_id is distinct from v_source.plan_id
       or v_registry.case_id is distinct from v_source.case_id
       or v_registry.target is distinct from v_source.target
       or v_registry.generation_number is distinct from 2
       or v_registry.source_kind is distinct from 'legacy-following'
       or v_registry.predecessor_generation_lineage_id is distinct from v_source.predecessor_plan_id
       or v_registry.source_recurrence_id is distinct from v_source.source_recurrence_id
       or v_registry.source_recurrence_fingerprint is distinct from v_source.source_recurrence_fingerprint
       or v_registry.plan_fingerprint is distinct from v_source.plan_fingerprint
       or v_registry.delivery_id is distinct from v_source.delivery_id
       or v_registry.package_id is distinct from v_source.package_id
       or v_registry.replay_key is distinct from v_source.replay_key
       or v_registry.package_fingerprint is distinct from v_source.package_fingerprint
       or v_registry.reclosure_id is distinct from v_source.reclosure_id
       or v_registry.reclosure_fingerprint is distinct from v_source.reclosure_fingerprint then
      raise exception 'legacy_corrective_generation_bridge_registry_conflict';
    end if;
  end if;

  if v_source.terminal_recurrence_id is not null
     and v_registry.generation_state='reclosed' then
    v_event_fingerprint :=
      'legacy-terminal-event1-' || md5(
        concat_ws(
          '|',
          v_registry.registry_fingerprint,
          v_source.terminal_recurrence_id::text,
          v_source.terminal_recurrence_fingerprint,
          v_source.terminal_regression_fingerprint
        )
      );

    insert into app.workspace_cg_legacy_terminal_events (
      workspace_id,legacy_terminal_event_id,generation_lineage_id,case_id,target,generation_number,
      source_kind,plan_id,terminal_recurrence_id,terminal_recurrence_fingerprint,
      terminal_regression_fingerprint,event_fingerprint,observed_at,adopted_by
    ) values (
      p_workspace_id,v_source.terminal_recurrence_id,v_registry.generation_lineage_id,
      v_source.case_id,v_source.target,v_registry.generation_number,p_source_kind,v_source.plan_id,
      v_source.terminal_recurrence_id,v_source.terminal_recurrence_fingerprint,
      v_source.terminal_regression_fingerprint,v_event_fingerprint,
      v_source.terminal_recurred_at,v_user_id
    )
    on conflict do nothing;

    get diagnostics v_inserted = row_count;
    if v_inserted=1 then
      if v_action='lineage-backfilled' then
        v_action := 'lineage-and-terminal-bridged';
      else
        v_action := 'late-recurrence-bridged';
      end if;
    end if;

    select e.*
      into v_event
      from app.workspace_cg_legacy_terminal_events e
     where e.workspace_id=p_workspace_id
       and e.generation_lineage_id=v_registry.generation_lineage_id
     limit 1;

    if not found
       or v_event.terminal_recurrence_id is distinct from v_source.terminal_recurrence_id
       or v_event.terminal_recurrence_fingerprint is distinct from v_source.terminal_recurrence_fingerprint
       or v_event.terminal_regression_fingerprint is distinct from v_source.terminal_regression_fingerprint then
      raise exception 'legacy_corrective_generation_bridge_terminal_conflict';
    end if;
  end if;

  if p_source_kind='legacy-following'
     and v_source.terminal_recurrence_id is not null then
    v_successor_fingerprint :=
      'corrective-generation-successor1-' || md5(
        concat_ws(
          '|',
          v_registry.registry_fingerprint,
          v_source.terminal_recurrence_fingerprint,
          v_source.terminal_regression_fingerprint,
          '3'
        )
      );

    insert into app.workspace_corrective_generation_successors (
      workspace_id,successor_source_id,predecessor_generation_lineage_id,case_id,target,
      generation_number,source_recurrence_kind,source_recurrence_id,
      source_recurrence_fingerprint,source_regression_fingerprint,status,
      successor_fingerprint,created_at
    ) values (
      p_workspace_id,v_source.terminal_recurrence_id,v_registry.generation_lineage_id,
      v_source.case_id,v_source.target,3,'following-corrective-generation',
      v_source.terminal_recurrence_id,v_source.terminal_recurrence_fingerprint,
      v_source.terminal_regression_fingerprint,'ready-for-planning',
      v_successor_fingerprint,v_source.terminal_recurred_at
    )
    on conflict do nothing;

    get diagnostics v_inserted = row_count;
    if v_inserted=1 then
      if v_action='lineage-backfilled' then
        v_action := 'lineage-and-successor-backfilled';
      elsif v_action='lineage-and-terminal-bridged' then
        v_action := 'lineage-terminal-and-successor-bridged';
      elsif v_action='late-recurrence-bridged' then
        v_action := 'terminal-and-successor-bridged';
      else
        v_action := 'successor-backfilled';
      end if;
    end if;

    select s.*
      into v_successor
      from app.workspace_corrective_generation_successors s
     where s.workspace_id=p_workspace_id
       and s.source_recurrence_id=v_source.terminal_recurrence_id
     limit 1;

    if not found
       or v_successor.predecessor_generation_lineage_id is distinct from v_registry.generation_lineage_id
       or v_successor.case_id is distinct from v_source.case_id
       or v_successor.target is distinct from v_source.target
       or v_successor.generation_number is distinct from 3
       or v_successor.source_recurrence_kind is distinct from 'following-corrective-generation'
       or v_successor.source_recurrence_fingerprint is distinct from v_source.terminal_recurrence_fingerprint
       or v_successor.source_regression_fingerprint is distinct from v_source.terminal_regression_fingerprint then
      raise exception 'legacy_corrective_generation_bridge_successor_conflict';
    end if;
  end if;

  v_effective_state :=
    case
      when v_registry.generation_state='recurred' then 'recurred'
      when v_source.terminal_recurrence_id is not null then 'recurred'
      else 'reclosed'
    end;

  return jsonb_build_object(
    'workspaceId',p_workspace_id,
    'sourceKind',p_source_kind,
    'planId',p_plan_id,
    'generationLineageId',v_registry.generation_lineage_id,
    'registeredState',v_registry.generation_state,
    'effectiveState',v_effective_state,
    'terminalEventId',
      case when v_source.terminal_recurrence_id is not null and v_registry.generation_state='reclosed'
        then v_source.terminal_recurrence_id else null end,
    'successorSourceId',
      case when p_source_kind='legacy-following' then v_source.terminal_recurrence_id else null end,
    'action',v_action
  );
end;
$$;

revoke all on function app.bridge_legacy_corrective_generation_lineage(uuid,text,uuid) from public;
grant execute on function app.bridge_legacy_corrective_generation_lineage(uuid,text,uuid)
  to ai_data_runtime;

-- Build 114 keeps Build 109 registry/successor tables direct-runtime read-only.
revoke insert,update,delete on app.workspace_corrective_generation_registry from ai_data_runtime;
revoke insert,update,delete on app.workspace_corrective_generation_successors from ai_data_runtime;

-- Extend Build 110's re-triage insert boundary so an immutable legacy row that was
-- originally registered as reclosed can become effectively recurred through the
-- append-only Build 114 terminal-event bridge.
drop policy if exists cg_retriage_manager_insert
  on app.workspace_corrective_generation_retriage;
create policy cg_retriage_manager_insert
on app.workspace_corrective_generation_retriage
for insert to ai_data_runtime
with check (
  exists (
    select 1
    from app.workspace_corrective_generation_successors s
    join app.workspace_corrective_generation_registry r
      on r.workspace_id=s.workspace_id
     and r.generation_lineage_id=s.predecessor_generation_lineage_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=s.workspace_id and c.case_id=s.case_id
    join app.workspace_members wm
      on wm.workspace_id=s.workspace_id
     and wm.user_id=nullif(current_setting('app.user_id',true),'')
     and wm.role in ('owner','admin')
    where s.workspace_id=workspace_corrective_generation_retriage.workspace_id
      and s.successor_source_id=workspace_corrective_generation_retriage.successor_source_id
      and s.predecessor_generation_lineage_id=workspace_corrective_generation_retriage.predecessor_generation_lineage_id
      and s.case_id=workspace_corrective_generation_retriage.case_id
      and s.target=workspace_corrective_generation_retriage.target
      and s.generation_number=workspace_corrective_generation_retriage.generation_number
      and s.source_recurrence_kind=workspace_corrective_generation_retriage.source_recurrence_kind
      and s.source_recurrence_id=workspace_corrective_generation_retriage.source_recurrence_id
      and s.source_recurrence_fingerprint=workspace_corrective_generation_retriage.source_recurrence_fingerprint
      and s.source_regression_fingerprint=workspace_corrective_generation_retriage.source_regression_fingerprint
      and s.successor_fingerprint=workspace_corrective_generation_retriage.successor_fingerprint
      and r.registry_fingerprint=workspace_corrective_generation_retriage.predecessor_registry_fingerprint
      and r.generation_number + 1=s.generation_number
      and (
        r.generation_state='recurred'
        or exists (
          select 1
          from app.workspace_cg_legacy_terminal_events le
          where le.workspace_id=r.workspace_id
            and le.generation_lineage_id=r.generation_lineage_id
            and le.terminal_recurrence_id=s.source_recurrence_id
            and le.terminal_recurrence_fingerprint=s.source_recurrence_fingerprint
            and le.terminal_regression_fingerprint=s.source_regression_fingerprint
        )
      )
      and c.status='open'
      and not exists (
        select 1 from app.workspace_corrective_generation_successors newer
        where newer.workspace_id=s.workspace_id
          and newer.case_id=s.case_id
          and newer.generation_number>s.generation_number
      )
  )
);
