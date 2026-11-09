create table if not exists app.master_sysop_members (
  user_id text primary key references auth."user"(id) on delete cascade,
  role text not null check (role in ('owner','operator')),
  granted_by text not null references auth."user"(id) on delete restrict,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  note text check (note is null or char_length(note) between 1 and 500)
);

create index if not exists master_sysop_members_active_idx
  on app.master_sysop_members(role,user_id)
  where revoked_at is null;

create table if not exists app.master_sysop_handoff_audit (
  handoff_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  destination_key text not null check (char_length(destination_key) between 1 and 128),
  workspace_id uuid references app.workspaces(id) on delete restrict,
  workspace_role text check (
    workspace_role is null or workspace_role in ('owner','admin','member')
  ),
  handoff_state text not null check (
    handoff_state in (
      'prepared',
      'internal',
      'origin-unmeasured',
      'tenant-unmapped',
      'tenant-denied',
      'destination-held'
    )
  ),
  context_hash text not null check (context_hash ~ '^[a-f0-9]{64}$'),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details)='object'),
  check (expires_at > issued_at)
);

create index if not exists master_sysop_handoff_actor_idx
  on app.master_sysop_handoff_audit(actor_user_id,issued_at desc);

do $$
declare
  candidate_count integer;
  candidate_user text;
begin
  select count(distinct wm.user_id), min(wm.user_id)
  into candidate_count, candidate_user
  from app.workspace_members wm
  join app.workspaces w on w.id=wm.workspace_id
  where w.slug='personal'
    and wm.role='owner';

  if candidate_count=1 and candidate_user is not null then
    insert into app.master_sysop_members (
      user_id,role,granted_by,note
    )
    values (
      candidate_user,'owner',candidate_user,
      'Build 341 safe bootstrap from the sole Personal workspace owner.'
    )
    on conflict (user_id) do nothing;
  end if;
end $$;

create or replace function app.enforce_master_sysop_member_update()
returns trigger
language plpgsql
as $$
declare
  other_active_owners integer;
begin
  if new.user_id <> old.user_id
     or new.granted_by <> old.granted_by
     or new.granted_at <> old.granted_at then
    raise exception 'master_sysop_identity_immutable';
  end if;

  if old.role='owner'
     and old.revoked_at is null
     and (new.role <> 'owner' or new.revoked_at is not null) then
    select count(*) into other_active_owners
    from app.master_sysop_members m
    where m.user_id <> old.user_id
      and m.role='owner'
      and m.revoked_at is null;

    if other_active_owners < 1 then
      raise exception 'master_sysop_last_owner_required';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists master_sysop_member_update_guard
  on app.master_sysop_members;
create trigger master_sysop_member_update_guard
before update on app.master_sysop_members
for each row execute function app.enforce_master_sysop_member_update();

create or replace function app.current_master_sysop_role()
returns text
language sql
stable
security definer
set search_path=pg_catalog,app
as $$
  select role
  from app.master_sysop_members
  where user_id=nullif(current_setting('app.user_id',true),'')
    and revoked_at is null
  limit 1
$$;

create or replace function app.master_sysop_claim_eligible()
returns boolean
language sql
stable
security definer
set search_path=pg_catalog,app
as $$
  select
    not exists (
      select 1 from app.master_sysop_members
      where revoked_at is null
    )
    and exists (
      select 1
      from app.workspace_members wm
      join app.workspaces w on w.id=wm.workspace_id
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role='owner'
        and w.slug='personal'
    )
$$;

revoke all on function app.current_master_sysop_role() from public;
revoke all on function app.master_sysop_claim_eligible() from public;
grant execute on function app.current_master_sysop_role() to ai_data_runtime;
grant execute on function app.master_sysop_claim_eligible() to ai_data_runtime;

alter table app.master_sysop_members enable row level security;
alter table app.master_sysop_handoff_audit enable row level security;

drop policy if exists master_sysop_members_select
  on app.master_sysop_members;
create policy master_sysop_members_select
on app.master_sysop_members
for select
to ai_data_runtime
using (
  user_id=nullif(current_setting('app.user_id',true),'')
  or app.current_master_sysop_role()='owner'
);

drop policy if exists master_sysop_members_insert
  on app.master_sysop_members;
create policy master_sysop_members_insert
on app.master_sysop_members
for insert
to ai_data_runtime
with check (
  app.current_master_sysop_role()='owner'
  or (
    app.master_sysop_claim_eligible()
    and user_id=nullif(current_setting('app.user_id',true),'')
    and granted_by=user_id
    and role='owner'
  )
);

drop policy if exists master_sysop_members_update
  on app.master_sysop_members;
create policy master_sysop_members_update
on app.master_sysop_members
for update
to ai_data_runtime
using (app.current_master_sysop_role()='owner')
with check (app.current_master_sysop_role()='owner');

drop policy if exists master_sysop_handoff_select
  on app.master_sysop_handoff_audit;
create policy master_sysop_handoff_select
on app.master_sysop_handoff_audit
for select
to ai_data_runtime
using (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  or app.current_master_sysop_role()='owner'
);

drop policy if exists master_sysop_handoff_insert
  on app.master_sysop_handoff_audit;
create policy master_sysop_handoff_insert
on app.master_sysop_handoff_audit
for insert
to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and app.current_master_sysop_role() in ('owner','operator')
);

grant select,insert on app.master_sysop_members to ai_data_runtime;
grant update(role,revoked_at,note) on app.master_sysop_members to ai_data_runtime;
revoke delete on app.master_sysop_members from ai_data_runtime;

grant select,insert on app.master_sysop_handoff_audit to ai_data_runtime;
revoke update,delete on app.master_sysop_handoff_audit from ai_data_runtime;
