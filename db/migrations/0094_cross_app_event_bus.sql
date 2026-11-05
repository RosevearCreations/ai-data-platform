-- Build 291 — Cross-App Event Bus & Subscription Manager
-- Governed internal publish/subscribe routing for reviewed Build 290 webhook receipts.
-- No outbound network delivery is introduced in this build.

create table if not exists app.event_bus_subscriptions (
  subscription_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 160),
  source_application_id text
    check (
      source_application_id is null
      or source_application_id in (
        'devilndove',
        'rosiedazzlers',
        'yard-workers',
        'icamp',
        'rosevear-comms-hub',
        'rosevear-ai-hub'
      )
    ),
  destination_application_id text not null
    check (destination_application_id in (
      'devilndove',
      'rosiedazzlers',
      'yard-workers',
      'icamp',
      'rosevear-comms-hub',
      'rosevear-ai-hub'
    )),
  environment text not null
    check (environment in ('nonproduction','production')),
  tenant_id text
    check (tenant_id is null or char_length(tenant_id) between 1 and 128),
  event_types jsonb not null
    check (
      jsonb_typeof(event_types)='array'
      and jsonb_array_length(event_types) between 1 and 100
      and octet_length(event_types::text) <= 8192
    ),
  delivery_mode text not null default 'internal-queue'
    check (delivery_mode='internal-queue'),
  state text not null default 'draft'
    check (state in ('draft','active','paused')),
  created_by text not null references auth."user"(id) on delete restrict,
  updated_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    source_application_id is null
    or source_application_id <> destination_application_id
  )
);

create table if not exists app.event_bus_publications (
  publication_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  webhook_receipt_id text not null unique
    references app.webhook_receipts(receipt_id) on delete restrict,
  source_application_id text not null,
  environment text not null
    check (environment in ('nonproduction','production')),
  tenant_id text,
  event_id text not null,
  event_type text not null,
  body_sha256 text not null check (body_sha256 ~ '^[a-f0-9]{64}$'),
  published_by text not null references auth."user"(id) on delete restrict,
  published_at timestamptz not null default now()
);

create table if not exists app.event_bus_routes (
  route_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  publication_id uuid not null
    references app.event_bus_publications(publication_id) on delete restrict,
  subscription_id uuid not null
    references app.event_bus_subscriptions(subscription_id) on delete restrict,
  destination_application_id text not null,
  delivery_mode text not null default 'internal-queue'
    check (delivery_mode='internal-queue'),
  state text not null default 'pending'
    check (state in ('pending','held')),
  created_at timestamptz not null default now(),
  unique (publication_id,subscription_id)
);

create table if not exists app.event_bus_audit (
  audit_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  action text not null
    check (action in (
      'subscription-created',
      'subscription-updated',
      'receipt-published',
      'route-enqueued',
      'publication-no-match'
    )),
  subscription_id uuid references app.event_bus_subscriptions(subscription_id) on delete restrict,
  publication_id uuid references app.event_bus_publications(publication_id) on delete restrict,
  details jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(details)='object'
      and octet_length(details::text) <= 16384
    ),
  occurred_at timestamptz not null default now()
);

create index if not exists event_bus_subscriptions_workspace_state_idx
  on app.event_bus_subscriptions(workspace_id,state,updated_at desc);

create index if not exists event_bus_publications_workspace_recent_idx
  on app.event_bus_publications(workspace_id,published_at desc);

create index if not exists event_bus_routes_workspace_state_idx
  on app.event_bus_routes(workspace_id,state,created_at desc);

create index if not exists event_bus_audit_workspace_recent_idx
  on app.event_bus_audit(workspace_id,occurred_at desc);

grant select, insert, update on app.event_bus_subscriptions to ai_data_runtime;
grant select, insert on app.event_bus_publications to ai_data_runtime;
grant select, insert on app.event_bus_routes to ai_data_runtime;
grant select, insert on app.event_bus_audit to ai_data_runtime;

revoke all on app.event_bus_subscriptions from public;
revoke all on app.event_bus_publications from public;
revoke all on app.event_bus_routes from public;
revoke all on app.event_bus_audit from public;

alter table app.event_bus_subscriptions enable row level security;
alter table app.event_bus_publications enable row level security;
alter table app.event_bus_routes enable row level security;
alter table app.event_bus_audit enable row level security;

drop policy if exists event_bus_subscriptions_read on app.event_bus_subscriptions;
create policy event_bus_subscriptions_read
on app.event_bus_subscriptions
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_subscriptions.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists event_bus_subscriptions_insert on app.event_bus_subscriptions;
create policy event_bus_subscriptions_insert
on app.event_bus_subscriptions
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and updated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_subscriptions.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists event_bus_subscriptions_update on app.event_bus_subscriptions;
create policy event_bus_subscriptions_update
on app.event_bus_subscriptions
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_subscriptions.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  updated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_subscriptions.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists event_bus_publications_read on app.event_bus_publications;
create policy event_bus_publications_read
on app.event_bus_publications
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_publications.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists event_bus_publications_insert on app.event_bus_publications;
create policy event_bus_publications_insert
on app.event_bus_publications
for insert to ai_data_runtime
with check (
  published_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_publications.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists event_bus_routes_read on app.event_bus_routes;
create policy event_bus_routes_read
on app.event_bus_routes
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_routes.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists event_bus_routes_insert on app.event_bus_routes;
create policy event_bus_routes_insert
on app.event_bus_routes
for insert to ai_data_runtime
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_routes.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists event_bus_audit_read on app.event_bus_audit;
create policy event_bus_audit_read
on app.event_bus_audit
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_audit.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists event_bus_audit_insert on app.event_bus_audit;
create policy event_bus_audit_insert
on app.event_bus_audit
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_audit.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);
