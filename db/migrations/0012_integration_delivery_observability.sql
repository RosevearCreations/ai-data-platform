create table if not exists app.integration_delivery_events (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  event_id uuid not null,
  consumer_id text not null check (char_length(consumer_id) between 1 and 128),
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  transport_mode text not null check (transport_mode in ('conformance','live')),
  event_type text not null check (
    event_type in (
      'handshake-accepted',
      'handshake-rejected',
      'delivery-attempted',
      'delivery-accepted',
      'delivery-rejected',
      'transport-error'
    )
  ),
  batch_id text,
  package_id text,
  replay_key text,
  fingerprint text,
  validation_code text not null check (char_length(validation_code) between 1 and 96),
  http_status integer check (http_status is null or http_status between 100 and 599),
  actor_user_id text not null references auth."user"(id) on delete restrict,
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details)='object' and octet_length(details::text) <= 4096
  ),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (workspace_id,event_id)
);

create index if not exists integration_delivery_events_recent_idx
  on app.integration_delivery_events(workspace_id, occurred_at desc);

create index if not exists integration_delivery_events_target_idx
  on app.integration_delivery_events(workspace_id, target, event_type, occurred_at desc);

create table if not exists app.integration_consumer_receipts (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  consumer_id text not null check (char_length(consumer_id) between 1 and 128),
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  package_id text not null check (char_length(package_id) between 1 and 256),
  replay_key text not null check (char_length(replay_key) between 1 and 512),
  fingerprint text not null check (char_length(fingerprint) between 1 and 128),
  actor_user_id text not null references auth."user"(id) on delete restrict,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (workspace_id, consumer_id, target, package_id)
);

create index if not exists integration_consumer_receipts_recent_idx
  on app.integration_consumer_receipts(workspace_id, received_at desc);

grant select, insert
  on app.integration_delivery_events, app.integration_consumer_receipts
  to ai_data_runtime;

alter table app.integration_delivery_events enable row level security;
alter table app.integration_consumer_receipts enable row level security;

drop policy if exists integration_delivery_events_read on app.integration_delivery_events;
create policy integration_delivery_events_read
on app.integration_delivery_events
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = integration_delivery_events.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists integration_delivery_events_insert on app.integration_delivery_events;
create policy integration_delivery_events_insert
on app.integration_delivery_events
for insert to ai_data_runtime
with check (
  actor_user_id = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = integration_delivery_events.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists integration_consumer_receipts_read on app.integration_consumer_receipts;
create policy integration_consumer_receipts_read
on app.integration_consumer_receipts
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = integration_consumer_receipts.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

drop policy if exists integration_consumer_receipts_insert on app.integration_consumer_receipts;
create policy integration_consumer_receipts_insert
on app.integration_consumer_receipts
for insert to ai_data_runtime
with check (
  actor_user_id = nullif(current_setting('app.user_id', true), '')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = integration_consumer_receipts.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);

create or replace function app.prune_integration_delivery_event_retention()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, app
as $$
begin
  delete from app.integration_delivery_events
  where workspace_id = new.workspace_id
    and occurred_at < now() - interval '365 days';

  delete from app.integration_delivery_events
  where (workspace_id,event_id) in (
    select workspace_id,event_id
    from app.integration_delivery_events
    where workspace_id = new.workspace_id
    order by occurred_at desc, created_at desc
    offset 2000
  );

  return new;
end;
$$;

revoke all on function app.prune_integration_delivery_event_retention() from public;

drop trigger if exists integration_delivery_event_retention_after_insert
  on app.integration_delivery_events;
create trigger integration_delivery_event_retention_after_insert
after insert on app.integration_delivery_events
for each row execute function app.prune_integration_delivery_event_retention();
