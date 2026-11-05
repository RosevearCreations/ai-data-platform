-- Build 293 — Idempotency, Duplicate Prevention & Delivery Guarantees
-- Exactly-once internal delivery intent and at-most-once attempt reservation.
-- This migration does not authorize outbound network delivery.

create table if not exists app.event_bus_delivery_intents (
  intent_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  publication_id uuid not null
    references app.event_bus_publications(publication_id) on delete restrict,
  subscription_id uuid not null
    references app.event_bus_subscriptions(subscription_id) on delete restrict,
  destination_application_id text not null,
  idempotency_key_sha256 text not null unique
    check (idempotency_key_sha256 ~ '^[a-f0-9]{64}$'),
  state text not null default 'held'
    check (state='held'),
  hold_reason text not null default 'delivery-not-authorized'
    check (hold_reason='delivery-not-authorized'),
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (
    workspace_id,
    publication_id,
    subscription_id,
    destination_application_id
  )
);

create table if not exists app.event_bus_delivery_attempt_reservations (
  reservation_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  intent_id uuid not null
    references app.event_bus_delivery_intents(intent_id) on delete restrict,
  source_kind text not null
    check (source_kind in ('original','replay')),
  route_id uuid unique
    references app.event_bus_routes(route_id) on delete restrict,
  replay_route_id uuid unique
    references app.event_bus_replay_routes(replay_route_id) on delete restrict,
  attempt_ordinal integer not null
    check (attempt_ordinal between 1 and 6),
  idempotency_key_sha256 text not null
    check (idempotency_key_sha256 ~ '^[a-f0-9]{64}$'),
  attempt_key_sha256 text not null unique
    check (attempt_key_sha256 ~ '^[a-f0-9]{64}$'),
  state text not null default 'held'
    check (state='held'),
  hold_reason text not null
    check (
      hold_reason in (
        'delivery-not-authorized',
        'recovery-replay-not-authorized'
      )
    ),
  reserved_by text not null references auth."user"(id) on delete restrict,
  reserved_at timestamptz not null default now(),
  check (
    (source_kind='original' and route_id is not null and replay_route_id is null)
    or
    (source_kind='replay' and route_id is null and replay_route_id is not null)
  )
);

create table if not exists app.event_bus_duplicate_decisions (
  decision_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  intent_id uuid not null
    references app.event_bus_delivery_intents(intent_id) on delete restrict,
  source_kind text not null
    check (source_kind in ('original','replay')),
  duplicate_scope text not null
    check (duplicate_scope in ('attempt-reservation')),
  duplicate_key_sha256 text not null
    check (duplicate_key_sha256 ~ '^[a-f0-9]{64}$'),
  reason text not null
    check (reason='existing-attempt-reservation'),
  observed_by text not null references auth."user"(id) on delete restrict,
  observed_at timestamptz not null default now(),
  unique (duplicate_scope,duplicate_key_sha256,reason)
);

create table if not exists app.event_bus_delivery_guarantee_audit (
  audit_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  action text not null
    check (action in (
      'intent-created',
      'intent-reused',
      'attempt-reserved',
      'duplicate-suppressed',
      'legacy-route-reconciled'
    )),
  intent_id uuid
    references app.event_bus_delivery_intents(intent_id) on delete restrict,
  reservation_id uuid
    references app.event_bus_delivery_attempt_reservations(reservation_id)
    on delete restrict,
  duplicate_decision_id uuid
    references app.event_bus_duplicate_decisions(decision_id) on delete restrict,
  details jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(details)='object'
      and octet_length(details::text) <= 16384
    ),
  occurred_at timestamptz not null default now()
);

create index if not exists event_bus_delivery_intents_workspace_recent_idx
  on app.event_bus_delivery_intents(workspace_id,created_at desc);

create index if not exists event_bus_delivery_attempts_workspace_recent_idx
  on app.event_bus_delivery_attempt_reservations(workspace_id,reserved_at desc);

create index if not exists event_bus_duplicate_decisions_workspace_recent_idx
  on app.event_bus_duplicate_decisions(workspace_id,observed_at desc);

create index if not exists event_bus_delivery_guarantee_audit_workspace_recent_idx
  on app.event_bus_delivery_guarantee_audit(workspace_id,occurred_at desc);

grant select, insert on app.event_bus_delivery_intents to ai_data_runtime;
grant select, insert on app.event_bus_delivery_attempt_reservations to ai_data_runtime;
grant select, insert on app.event_bus_duplicate_decisions to ai_data_runtime;
grant select, insert on app.event_bus_delivery_guarantee_audit to ai_data_runtime;

revoke all on app.event_bus_delivery_intents from public;
revoke all on app.event_bus_delivery_attempt_reservations from public;
revoke all on app.event_bus_duplicate_decisions from public;
revoke all on app.event_bus_delivery_guarantee_audit from public;

alter table app.event_bus_delivery_intents enable row level security;
alter table app.event_bus_delivery_attempt_reservations enable row level security;
alter table app.event_bus_duplicate_decisions enable row level security;
alter table app.event_bus_delivery_guarantee_audit enable row level security;

drop policy if exists event_bus_delivery_intents_read
  on app.event_bus_delivery_intents;
create policy event_bus_delivery_intents_read
on app.event_bus_delivery_intents
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_delivery_intents.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists event_bus_delivery_intents_insert
  on app.event_bus_delivery_intents;
create policy event_bus_delivery_intents_insert
on app.event_bus_delivery_intents
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_delivery_intents.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists event_bus_delivery_attempts_read
  on app.event_bus_delivery_attempt_reservations;
create policy event_bus_delivery_attempts_read
on app.event_bus_delivery_attempt_reservations
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_delivery_attempt_reservations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists event_bus_delivery_attempts_insert
  on app.event_bus_delivery_attempt_reservations;
create policy event_bus_delivery_attempts_insert
on app.event_bus_delivery_attempt_reservations
for insert to ai_data_runtime
with check (
  reserved_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_delivery_attempt_reservations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists event_bus_duplicate_decisions_read
  on app.event_bus_duplicate_decisions;
create policy event_bus_duplicate_decisions_read
on app.event_bus_duplicate_decisions
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_duplicate_decisions.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists event_bus_duplicate_decisions_insert
  on app.event_bus_duplicate_decisions;
create policy event_bus_duplicate_decisions_insert
on app.event_bus_duplicate_decisions
for insert to ai_data_runtime
with check (
  observed_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_duplicate_decisions.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists event_bus_delivery_guarantee_audit_read
  on app.event_bus_delivery_guarantee_audit;
create policy event_bus_delivery_guarantee_audit_read
on app.event_bus_delivery_guarantee_audit
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_delivery_guarantee_audit.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists event_bus_delivery_guarantee_audit_insert
  on app.event_bus_delivery_guarantee_audit;
create policy event_bus_delivery_guarantee_audit_insert
on app.event_bus_delivery_guarantee_audit
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_delivery_guarantee_audit.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);
