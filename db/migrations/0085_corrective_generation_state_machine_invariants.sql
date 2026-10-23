-- Build 115 — Corrective-Generation State Machine & Cross-Generation Invariant Enforcement

create or replace function app.cg115_effective_terminal_recurrence(
  p_workspace_id uuid,
  p_generation_lineage_id uuid
)
returns table(
  effective_state text,
  terminal_recurrence_id uuid,
  terminal_recurrence_fingerprint text,
  terminal_regression_fingerprint text
)
language sql
stable
security definer
set search_path = pg_catalog, app, auth
as $$
  select
    case
      when r.generation_state='recurred' or le.legacy_terminal_event_id is not null
        then 'recurred'
      else 'reclosed'
    end as effective_state,
    coalesce(le.terminal_recurrence_id,r.terminal_recurrence_id),
    coalesce(le.terminal_recurrence_fingerprint,r.terminal_recurrence_fingerprint),
    coalesce(le.terminal_regression_fingerprint,r.terminal_regression_fingerprint)
  from app.workspace_corrective_generation_registry r
  left join app.workspace_cg_legacy_terminal_events le
    on le.workspace_id=r.workspace_id
   and le.generation_lineage_id=r.generation_lineage_id
  where r.workspace_id=p_workspace_id
    and r.generation_lineage_id=p_generation_lineage_id
  limit 1;
$$;

revoke all on function app.cg115_effective_terminal_recurrence(uuid,uuid) from public;
grant execute on function app.cg115_effective_terminal_recurrence(uuid,uuid) to ai_data_runtime;

create or replace function app.cg115_require_registry_invariants()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, app, auth
as $$
declare
  v_predecessor record;
  v_terminal record;
  v_successor record;
  v_plan record;
begin
  if new.generation_lineage_id is distinct from new.plan_id then
    raise exception 'cg115_registry_lineage_plan_identity_mismatch';
  end if;

  if new.generation_state='recurred' then
    if new.terminal_recurrence_id is null
       or new.terminal_recurrence_fingerprint is null
       or new.terminal_regression_fingerprint is null then
      raise exception 'cg115_registry_recurred_terminal_evidence_required';
    end if;
  elsif new.terminal_recurrence_id is not null
     or new.terminal_recurrence_fingerprint is not null
     or new.terminal_regression_fingerprint is not null then
    raise exception 'cg115_registry_reclosed_terminal_evidence_forbidden';
  end if;

  if new.generation_number=1 then
    if new.source_kind<>'legacy-next'
       or new.predecessor_generation_lineage_id is not null then
      raise exception 'cg115_registry_generation1_shape_invalid';
    end if;
    return new;
  end if;

  select r.*
    into v_predecessor
    from app.workspace_corrective_generation_registry r
   where r.workspace_id=new.workspace_id
     and r.generation_lineage_id=new.predecessor_generation_lineage_id
   limit 1;

  if not found
     or v_predecessor.case_id is distinct from new.case_id
     or v_predecessor.target is distinct from new.target
     or v_predecessor.generation_number + 1 <> new.generation_number then
    raise exception 'cg115_registry_predecessor_continuity_required';
  end if;

  select *
    into v_terminal
    from app.cg115_effective_terminal_recurrence(
      new.workspace_id,
      new.predecessor_generation_lineage_id
    );

  if v_terminal.effective_state is distinct from 'recurred'
     or v_terminal.terminal_recurrence_id is distinct from new.source_recurrence_id
     or v_terminal.terminal_recurrence_fingerprint is distinct from new.source_recurrence_fingerprint then
    raise exception 'cg115_registry_predecessor_recurrence_identity_required';
  end if;

  if new.generation_number=2 then
    if new.source_kind<>'legacy-following'
       or v_predecessor.source_kind<>'legacy-next' then
      raise exception 'cg115_registry_generation2_shape_invalid';
    end if;
    return new;
  end if;

  if new.source_kind<>'generic' then
    raise exception 'cg115_registry_generic_source_kind_required';
  end if;

  select s.*
    into v_successor
    from app.workspace_corrective_generation_successors s
   where s.workspace_id=new.workspace_id
     and s.case_id=new.case_id
     and s.generation_number=new.generation_number
     and s.source_recurrence_id=new.source_recurrence_id
   limit 1;

  if not found
     or v_successor.predecessor_generation_lineage_id is distinct from new.predecessor_generation_lineage_id
     or v_successor.target is distinct from new.target
     or v_successor.source_recurrence_fingerprint is distinct from new.source_recurrence_fingerprint then
    raise exception 'cg115_registry_generic_successor_identity_required';
  end if;

  select p.*
    into v_plan
    from app.workspace_corrective_generation_plans p
   where p.workspace_id=new.workspace_id
     and p.corrective_generation_plan_id=new.plan_id
   limit 1;

  if not found
     or v_plan.case_id is distinct from new.case_id
     or v_plan.target is distinct from new.target
     or v_plan.generation_number is distinct from new.generation_number
     or v_plan.predecessor_generation_lineage_id is distinct from new.predecessor_generation_lineage_id
     or v_plan.successor_source_id is distinct from v_successor.successor_source_id
     or v_plan.source_recurrence_id is distinct from new.source_recurrence_id
     or v_plan.source_recurrence_fingerprint is distinct from new.source_recurrence_fingerprint
     or v_plan.plan_fingerprint is distinct from new.plan_fingerprint then
    raise exception 'cg115_registry_generic_plan_identity_required';
  end if;

  return new;
end;
$$;

drop trigger if exists workspace_cg115_registry_invariant_guard
  on app.workspace_corrective_generation_registry;
create trigger workspace_cg115_registry_invariant_guard
before insert on app.workspace_corrective_generation_registry
for each row execute function app.cg115_require_registry_invariants();

create or replace function app.cg115_require_successor_invariants()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, app, auth
as $$
declare
  v_predecessor record;
  v_terminal record;
begin
  if new.successor_source_id is distinct from new.source_recurrence_id then
    raise exception 'cg115_successor_source_recurrence_identity_required';
  end if;

  if new.status<>'ready-for-planning' then
    raise exception 'cg115_successor_initial_state_invalid';
  end if;

  select r.*
    into v_predecessor
    from app.workspace_corrective_generation_registry r
   where r.workspace_id=new.workspace_id
     and r.generation_lineage_id=new.predecessor_generation_lineage_id
   limit 1;

  if not found
     or v_predecessor.case_id is distinct from new.case_id
     or v_predecessor.target is distinct from new.target
     or v_predecessor.generation_number + 1 <> new.generation_number then
    raise exception 'cg115_successor_predecessor_continuity_required';
  end if;

  select *
    into v_terminal
    from app.cg115_effective_terminal_recurrence(
      new.workspace_id,
      new.predecessor_generation_lineage_id
    );

  if v_terminal.effective_state is distinct from 'recurred'
     or v_terminal.terminal_recurrence_id is distinct from new.source_recurrence_id
     or v_terminal.terminal_recurrence_fingerprint is distinct from new.source_recurrence_fingerprint
     or v_terminal.terminal_regression_fingerprint is distinct from new.source_regression_fingerprint then
    raise exception 'cg115_successor_terminal_recurrence_identity_required';
  end if;

  if v_predecessor.source_kind='legacy-following' then
    if new.source_recurrence_kind<>'following-corrective-generation' then
      raise exception 'cg115_successor_legacy_transition_kind_invalid';
    end if;
  elsif v_predecessor.source_kind='generic' then
    if new.source_recurrence_kind<>'generic-corrective-generation' then
      raise exception 'cg115_successor_generic_transition_kind_invalid';
    end if;
  else
    raise exception 'cg115_successor_predecessor_kind_invalid';
  end if;

  return new;
end;
$$;

drop trigger if exists workspace_cg115_successor_invariant_guard
  on app.workspace_corrective_generation_successors;
create trigger workspace_cg115_successor_invariant_guard
before insert on app.workspace_corrective_generation_successors
for each row execute function app.cg115_require_successor_invariants();

create or replace function app.cg115_require_retriage_transition()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, app, auth
as $$
begin
  if tg_op='INSERT' then
    if new.status<>'open' then
      raise exception 'cg115_retriage_initial_state_invalid';
    end if;
    return new;
  end if;

  if old.status in ('approved','dismissed') and new.status<>old.status then
    raise exception 'cg115_retriage_terminal_state_immutable';
  end if;

  if old.status='open' and new.status not in ('open','planned','dismissed') then
    raise exception 'cg115_retriage_transition_invalid';
  end if;

  if old.status='planned' and new.status not in ('planned','open','approved','dismissed') then
    raise exception 'cg115_retriage_transition_invalid';
  end if;

  if new.status='planned' and not exists (
    select 1
    from app.workspace_corrective_generation_plans p
    where p.workspace_id=new.workspace_id
      and p.corrective_generation_retriage_id=new.corrective_generation_retriage_id
      and p.status='proposed'
  ) then
    raise exception 'cg115_retriage_planned_plan_required';
  end if;

  if new.status='approved' and not exists (
    select 1
    from app.workspace_corrective_generation_plans p
    where p.workspace_id=new.workspace_id
      and p.corrective_generation_retriage_id=new.corrective_generation_retriage_id
      and p.status='approved'
  ) then
    raise exception 'cg115_retriage_approved_plan_required';
  end if;

  return new;
end;
$$;

drop trigger if exists workspace_cg115_retriage_transition_guard
  on app.workspace_corrective_generation_retriage;
create trigger workspace_cg115_retriage_transition_guard
before insert or update of status on app.workspace_corrective_generation_retriage
for each row execute function app.cg115_require_retriage_transition();

create or replace function app.cg115_require_plan_transition()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, app, auth
as $$
declare
  v_retriage_status text;
begin
  if tg_op='INSERT' then
    if new.status<>'proposed' then
      raise exception 'cg115_plan_initial_state_invalid';
    end if;
    return new;
  end if;

  if old.status<>'proposed' and new.status<>old.status then
    raise exception 'cg115_plan_terminal_state_immutable';
  end if;

  if old.status='proposed'
     and new.status not in ('proposed','approved','rejected','withdrawn') then
    raise exception 'cg115_plan_transition_invalid';
  end if;

  if old.status='proposed' and new.status<>old.status then
    select t.status
      into v_retriage_status
      from app.workspace_corrective_generation_retriage t
     where t.workspace_id=new.workspace_id
       and t.corrective_generation_retriage_id=new.corrective_generation_retriage_id
     limit 1;

    if v_retriage_status is distinct from 'planned' then
      raise exception 'cg115_plan_review_planned_retriage_required';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists workspace_cg115_plan_transition_guard
  on app.workspace_corrective_generation_plans;
create trigger workspace_cg115_plan_transition_guard
before insert or update of status on app.workspace_corrective_generation_plans
for each row execute function app.cg115_require_plan_transition();

create or replace function app.cg115_require_activation_transition()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, app, auth
as $$
declare
  v_plan_status text;
  v_retriage_status text;
begin
  if tg_op='INSERT' then
    if new.status<>'active' then
      raise exception 'cg115_activation_initial_state_invalid';
    end if;

    select p.status,t.status
      into v_plan_status,v_retriage_status
      from app.workspace_corrective_generation_plans p
      join app.workspace_corrective_generation_retriage t
        on t.workspace_id=p.workspace_id
       and t.corrective_generation_retriage_id=p.corrective_generation_retriage_id
     where p.workspace_id=new.workspace_id
       and p.corrective_generation_plan_id=new.corrective_generation_plan_id
       and p.corrective_generation_retriage_id=new.corrective_generation_retriage_id
       and p.successor_source_id=new.successor_source_id
       and p.predecessor_generation_lineage_id=new.predecessor_generation_lineage_id
       and p.case_id=new.case_id
       and p.target=new.target
       and p.generation_number=new.generation_number
     limit 1;

    if v_plan_status is distinct from 'approved'
       or v_retriage_status is distinct from 'approved' then
      raise exception 'cg115_activation_approved_cycle_required';
    end if;
    return new;
  end if;

  if old.status='revoked' and new.status<>'revoked' then
    raise exception 'cg115_activation_revoked_state_immutable';
  end if;

  if old.status='active' and new.status not in ('active','revoked') then
    raise exception 'cg115_activation_transition_invalid';
  end if;

  return new;
end;
$$;

drop trigger if exists workspace_cg115_activation_transition_guard
  on app.workspace_unified_cg_delivery_activations;
create trigger workspace_cg115_activation_transition_guard
before insert or update of status on app.workspace_unified_cg_delivery_activations
for each row execute function app.cg115_require_activation_transition();

create or replace function app.cg115_require_delivery_transition()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, app, auth
as $$
declare
  v_activation record;
  v_plan record;
begin
  select a.*,p.status as plan_status
    into v_activation
    from app.workspace_unified_cg_delivery_activations a
    join app.workspace_corrective_generation_plans p
      on p.workspace_id=a.workspace_id
     and p.corrective_generation_plan_id=a.corrective_generation_plan_id
   where a.workspace_id=new.workspace_id
     and a.activation_id=new.activation_id
     and a.corrective_generation_plan_id=new.corrective_generation_plan_id
   limit 1;

  if not found
     or v_activation.generation_number is distinct from new.generation_number
     or v_activation.target is distinct from new.target
     or v_activation.predecessor_delivery_id is distinct from new.predecessor_delivery_id
     or v_activation.plan_fingerprint is distinct from new.plan_fingerprint
     or v_activation.activation_fingerprint is distinct from new.activation_fingerprint
     or v_activation.unified_package_id is distinct from new.unified_package_id
     or v_activation.unified_replay_key is distinct from new.unified_replay_key
     or v_activation.unified_package_fingerprint is distinct from new.unified_package_fingerprint
     or v_activation.plan_status is distinct from 'approved' then
    raise exception 'cg115_delivery_activation_identity_required';
  end if;

  if tg_op='INSERT' then
    if new.status<>'reserved' or v_activation.status<>'active' then
      raise exception 'cg115_delivery_initial_state_invalid';
    end if;
    return new;
  end if;

  if old.status in ('accepted','rejected') and new.status<>old.status then
    raise exception 'cg115_delivery_terminal_state_immutable';
  end if;

  if old.status='transport-error' and new.status not in ('transport-error','reserved') then
    raise exception 'cg115_delivery_retry_transition_invalid';
  end if;

  if old.status='reserved'
     and new.status not in ('reserved','accepted','rejected','transport-error') then
    raise exception 'cg115_delivery_transition_invalid';
  end if;

  if new.status='reserved' and v_activation.status<>'active' then
    raise exception 'cg115_delivery_retry_active_activation_required';
  end if;

  return new;
end;
$$;

drop trigger if exists workspace_cg115_delivery_transition_guard
  on app.workspace_unified_cg_live_deliveries;
create trigger workspace_cg115_delivery_transition_guard
before insert or update of status on app.workspace_unified_cg_live_deliveries
for each row execute function app.cg115_require_delivery_transition();

create or replace function app.cg115_require_reclosure_invariants()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, app, auth
as $$
declare
  v_cycle record;
begin
  select
    p.status as plan_status,
    t.status as retriage_status,
    d.status as delivery_status,
    vr.status as reconciliation_status,
    p.successor_source_id,
    p.predecessor_generation_lineage_id,
    p.case_id,
    p.target,
    p.generation_number,
    p.plan_fingerprint,
    d.delivery_id,
    vr.reconciliation_id
  into v_cycle
  from app.workspace_corrective_generation_plans p
  join app.workspace_corrective_generation_retriage t
    on t.workspace_id=p.workspace_id
   and t.corrective_generation_retriage_id=p.corrective_generation_retriage_id
  join app.workspace_unified_cg_live_deliveries d
    on d.workspace_id=p.workspace_id
   and d.corrective_generation_plan_id=p.corrective_generation_plan_id
  join app.workspace_unified_cg_delivery_reconciliations vr
    on vr.workspace_id=d.workspace_id
   and vr.delivery_id=d.delivery_id
   and vr.reconciliation_id=new.reconciliation_id
  where p.workspace_id=new.workspace_id
    and p.corrective_generation_plan_id=new.corrective_generation_plan_id
    and t.corrective_generation_retriage_id=new.corrective_generation_retriage_id
    and d.delivery_id=new.delivery_id
  limit 1;

  if not found
     or v_cycle.plan_status is distinct from 'approved'
     or v_cycle.retriage_status is distinct from 'approved'
     or v_cycle.delivery_status is distinct from 'accepted'
     or v_cycle.reconciliation_status is distinct from 'matched'
     or v_cycle.successor_source_id is distinct from new.successor_source_id
     or v_cycle.predecessor_generation_lineage_id is distinct from new.predecessor_generation_lineage_id
     or v_cycle.case_id is distinct from new.case_id
     or v_cycle.target is distinct from new.target
     or v_cycle.generation_number is distinct from new.generation_number
     or v_cycle.plan_fingerprint is distinct from new.plan_fingerprint then
    raise exception 'cg115_reclosure_verified_cycle_invariants_required';
  end if;

  return new;
end;
$$;

drop trigger if exists workspace_cg115_reclosure_invariant_guard
  on app.workspace_reconciliation_unified_cg_reclosures;
create trigger workspace_cg115_reclosure_invariant_guard
before insert on app.workspace_reconciliation_unified_cg_reclosures
for each row execute function app.cg115_require_reclosure_invariants();

-- Preserve direct-runtime immutability for the lineage boundary.
revoke insert,update,delete on app.workspace_corrective_generation_registry from ai_data_runtime;
revoke insert,update,delete on app.workspace_corrective_generation_successors from ai_data_runtime;
