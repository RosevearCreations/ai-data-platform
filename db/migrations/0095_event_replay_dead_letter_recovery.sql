-- Build 292 — Event Replay, Dead-Letter Queue & Recovery Console
-- Durable recovery evidence for Build 291 internal routes.
-- Replay remains internal and held; no outbound delivery is introduced.

create table if not exists app.event_bus_delivery_failures (
  failure_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  route_id uuid not null references app.event_bus_routes(route_id) on delete restrict,
  publication_id uuid not null references app.event_bus_publications(publication_id) on delete restrict,
  subscription_id uuid not null references app.event_bus_subscriptions(subscription_id) on delete restrict,
  failure_category text not null
    check (failure_category in ('transient','permanent','policy','unknown')),
  failure_code text not null
    check (
      failure_code ~ '^[a-z0-9][a-z0-9._-]{1,79}$'
    ),
  failure_summary text not null
    check (
      char_length(failure_summary) between 3 and 500
      and failure_summary !~ '[[:cntrl:]]'
    ),
  failure_details jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(failure_details)='object'
      and octet_length(failure_details::text) <= 16384
    ),
  attempt_number integer not null
    check (attempt_number between 1 and 1000),
  recorded_by text not null references auth."user"(id) on delete restrict,
  failed_at timestamptz not null default now(),
  unique (route_id,attempt_number)
);

create table if not exists app.event_bus_dead_letters (
  dead_letter_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  failure_id uuid not null unique
    references app.event_bus_delivery_failures(failure_id) on delete restrict,
  route_id uuid not null references app.event_bus_routes(route_id) on delete restrict,
  publication_id uuid not null references app.event_bus_publications(publication_id) on delete restrict,
  subscription_id uuid not null references app.event_bus_subscriptions(subscription_id) on delete restrict,
  entered_by text not null references auth."user"(id) on delete restrict,
  entered_at timestamptz not null default now()
);

create table if not exists app.event_bus_replay_requests (
  replay_request_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  dead_letter_id uuid not null references app.event_bus_dead_letters(dead_letter_id) on delete restrict,
  original_route_id uuid not null references app.event_bus_routes(route_id) on delete restrict,
  publication_id uuid not null references app.event_bus_publications(publication_id) on delete restrict,
  subscription_id uuid not null references app.event_bus_subscriptions(subscription_id) on delete restrict,
  replay_number integer not null
    check (replay_number between 1 and 5),
  reason text not null
    check (
      char_length(reason) between 8 and 500
      and reason !~ '[[:cntrl:]]'
    ),
  requested_by text not null references auth."user"(id) on delete restrict,
  requested_at timestamptz not null default now(),
  unique (dead_letter_id,replay_number)
);

create table if not exists app.event_bus_replay_routes (
  replay_route_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  replay_request_id uuid not null unique
    references app.event_bus_replay_requests(replay_request_id) on delete restrict,
  dead_letter_id uuid not null references app.event_bus_dead_letters(dead_letter_id) on delete restrict,
  original_route_id uuid not null references app.event_bus_routes(route_id) on delete restrict,
  publication_id uuid not null references app.event_bus_publications(publication_id) on delete restrict,
  subscription_id uuid not null references app.event_bus_subscriptions(subscription_id) on delete restrict,
  destination_application_id text not null,
  delivery_mode text not null default 'internal-queue'
    check (delivery_mode='internal-queue'),
  state text not null default 'held'
    check (state='held'),
  hold_reason text not null default 'recovery-replay-not-authorized'
    check (hold_reason='recovery-replay-not-authorized'),
  created_at timestamptz not null default now()
);

create table if not exists app.event_bus_recovery_audit (
  audit_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  action text not null
    check (action in (
      'failure-recorded',
      'dead-letter-created',
      'replay-requested',
      'replay-route-created',
      'dead-letter-dismissed',
      'recovery-note'
    )),
  route_id uuid references app.event_bus_routes(route_id) on delete restrict,
  failure_id uuid references app.event_bus_delivery_failures(failure_id) on delete restrict,
  dead_letter_id uuid references app.event_bus_dead_letters(dead_letter_id) on delete restrict,
  replay_request_id uuid references app.event_bus_replay_requests(replay_request_id) on delete restrict,
  replay_route_id uuid references app.event_bus_replay_routes(replay_route_id) on delete restrict,
  details jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(details)='object'
      and octet_length(details::text) <= 16384
    ),
  occurred_at timestamptz not null default now()
);

create index if not exists event_bus_delivery_failures_workspace_recent_idx
  on app.event_bus_delivery_failures(workspace_id,failed_at desc);

create index if not exists event_bus_dead_letters_workspace_recent_idx
  on app.event_bus_dead_letters(workspace_id,entered_at desc);

create index if not exists event_bus_replay_requests_dead_letter_idx
  on app.event_bus_replay_requests(dead_letter_id,replay_number desc);

create index if not exists event_bus_replay_routes_workspace_recent_idx
  on app.event_bus_replay_routes(workspace_id,created_at desc);

create index if not exists event_bus_recovery_audit_workspace_recent_idx
  on app.event_bus_recovery_audit(workspace_id,occurred_at desc);

grant select, insert on app.event_bus_delivery_failures to ai_data_runtime;
grant select, insert on app.event_bus_dead_letters to ai_data_runtime;
grant select, insert on app.event_bus_replay_requests to ai_data_runtime;
grant select, insert on app.event_bus_replay_routes to ai_data_runtime;
grant select, insert on app.event_bus_recovery_audit to ai_data_runtime;

revoke all on app.event_bus_delivery_failures from public;
revoke all on app.event_bus_dead_letters from public;
revoke all on app.event_bus_replay_requests from public;
revoke all on app.event_bus_replay_routes from public;
revoke all on app.event_bus_recovery_audit from public;

alter table app.event_bus_delivery_failures enable row level security;
alter table app.event_bus_dead_letters enable row level security;
alter table app.event_bus_replay_requests enable row level security;
alter table app.event_bus_replay_routes enable row level security;
alter table app.event_bus_recovery_audit enable row level security;

drop policy if exists event_bus_delivery_failures_read on app.event_bus_delivery_failures;
create policy event_bus_delivery_failures_read
on app.event_bus_delivery_failures
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_delivery_failures.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists event_bus_delivery_failures_insert on app.event_bus_delivery_failures;
create policy event_bus_delivery_failures_insert
on app.event_bus_delivery_failures
for insert to ai_data_runtime
with check (
  recorded_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_delivery_failures.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists event_bus_dead_letters_read on app.event_bus_dead_letters;
create policy event_bus_dead_letters_read
on app.event_bus_dead_letters
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_dead_letters.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists event_bus_dead_letters_insert on app.event_bus_dead_letters;
create policy event_bus_dead_letters_insert
on app.event_bus_dead_letters
for insert to ai_data_runtime
with check (
  entered_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_dead_letters.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists event_bus_replay_requests_read on app.event_bus_replay_requests;
create policy event_bus_replay_requests_read
on app.event_bus_replay_requests
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_replay_requests.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists event_bus_replay_requests_insert on app.event_bus_replay_requests;
create policy event_bus_replay_requests_insert
on app.event_bus_replay_requests
for insert to ai_data_runtime
with check (
  requested_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_replay_requests.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists event_bus_replay_routes_read on app.event_bus_replay_routes;
create policy event_bus_replay_routes_read
on app.event_bus_replay_routes
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_replay_routes.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists event_bus_replay_routes_insert on app.event_bus_replay_routes;
create policy event_bus_replay_routes_insert
on app.event_bus_replay_routes
for insert to ai_data_runtime
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_replay_routes.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists event_bus_recovery_audit_read on app.event_bus_recovery_audit;
create policy event_bus_recovery_audit_read
on app.event_bus_recovery_audit
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_recovery_audit.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists event_bus_recovery_audit_insert on app.event_bus_recovery_audit;
create policy event_bus_recovery_audit_insert
on app.event_bus_recovery_audit
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=event_bus_recovery_audit.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);
