-- Build 299 — Shared Scheduling, Appointments & Calendar Exchange
create table if not exists app.shared_schedule_items (
  schedule_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  canonical_tenant_key text not null,
  source_application_id text not null,
  destination_application_id text not null,
  source_record_id text not null,
  item_type text not null check (item_type in ('appointment','booking','job','maintenance','event','hold')),
  title text not null,
  status text not null check (status in ('tentative','confirmed','cancelled','completed')),
  start_at timestamptz not null,
  end_at timestamptz,
  timezone text not null,
  location_text text,
  customer_record_id text,
  service_record_id text,
  staff_record_ids jsonb not null default '[]'::jsonb,
  equipment_record_ids jsonb not null default '[]'::jsonb,
  notes text,
  contract_id text not null default 'rosevear.shared.booking.v1'
    check (contract_id='rosevear.shared.booking.v1'),
  contract_version text not null default '1.0.0'
    check (contract_version='1.0.0'),
  portable_record jsonb not null,
  schedule_sha256 text not null check (schedule_sha256 ~ '^[a-f0-9]{64}$'),
  state text not null default 'held' check (state='held'),
  hold_reason text not null default 'schedule-exchange-not-authorized'
    check (hold_reason='schedule-exchange-not-authorized'),
  created_by text not null,
  created_at timestamptz not null default now(),
  check (source_application_id <> destination_application_id),
  check (end_at is null or end_at > start_at),
  unique (workspace_id, schedule_sha256)
);

create index if not exists shared_schedule_time_idx
  on app.shared_schedule_items
  (workspace_id, destination_application_id, start_at, end_at);

create table if not exists app.shared_schedule_conflict_evidence (
  conflict_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  schedule_id uuid not null references app.shared_schedule_items(schedule_id) on delete cascade,
  conflicting_schedule_id uuid not null references app.shared_schedule_items(schedule_id) on delete cascade,
  conflict_scope text not null default 'local-held-items-only'
    check (conflict_scope='local-held-items-only'),
  reason text not null,
  recorded_by text not null,
  recorded_at timestamptz not null default now(),
  check (schedule_id <> conflicting_schedule_id),
  unique (workspace_id, schedule_id, conflicting_schedule_id)
);

create table if not exists app.shared_schedule_exchange_packages (
  package_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  schedule_id uuid not null references app.shared_schedule_items(schedule_id) on delete cascade,
  destination_application_id text not null,
  destination_tenant_key text not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  local_conflict_count integer not null default 0 check (local_conflict_count >= 0),
  state text not null default 'held' check (state='held'),
  hold_reason text not null default 'schedule-exchange-not-authorized'
    check (hold_reason='schedule-exchange-not-authorized'),
  peer_calendar_write_requested boolean not null default false
    check (peer_calendar_write_requested=false),
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, schedule_id, destination_application_id, destination_tenant_key, payload_sha256)
);

create table if not exists app.shared_schedule_exchange_reviews (
  review_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  package_id uuid not null unique references app.shared_schedule_exchange_packages(package_id) on delete cascade,
  decision text not null check (decision in ('approve','reject')),
  reason text not null,
  reviewed_by text not null,
  reviewed_at timestamptz not null default now()
);

create table if not exists app.shared_schedule_exchange_audit (
  audit_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  actor_user_id text not null,
  action text not null,
  schedule_id uuid,
  conflict_id uuid,
  package_id uuid,
  review_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table app.shared_schedule_items enable row level security;
alter table app.shared_schedule_conflict_evidence enable row level security;
alter table app.shared_schedule_exchange_packages enable row level security;
alter table app.shared_schedule_exchange_reviews enable row level security;
alter table app.shared_schedule_exchange_audit enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'shared_schedule_items',
    'shared_schedule_conflict_evidence',
    'shared_schedule_exchange_packages',
    'shared_schedule_exchange_reviews',
    'shared_schedule_exchange_audit'
  ]
  loop
    execute format('drop policy if exists %I_member_select on app.%I', t, t);
    execute format(
      'create policy %I_member_select on app.%I for select using (exists (select 1 from app.workspace_members wm where wm.workspace_id=%I.workspace_id and wm.user_id=nullif(current_setting(''app.user_id'',true),'''')))',
      t, t, t
    );
    execute format('drop policy if exists %I_admin_insert on app.%I', t, t);
    execute format(
      'create policy %I_admin_insert on app.%I for insert with check (exists (select 1 from app.workspace_members wm where wm.workspace_id=%I.workspace_id and wm.user_id=nullif(current_setting(''app.user_id'',true),'''') and wm.role in (''owner'',''admin'')))',
      t, t, t
    );
  end loop;
end $$;

revoke update, delete on
  app.shared_schedule_items,
  app.shared_schedule_conflict_evidence,
  app.shared_schedule_exchange_packages,
  app.shared_schedule_exchange_reviews,
  app.shared_schedule_exchange_audit
from ai_data_runtime;

grant select, insert on
  app.shared_schedule_items,
  app.shared_schedule_conflict_evidence,
  app.shared_schedule_exchange_packages,
  app.shared_schedule_exchange_reviews,
  app.shared_schedule_exchange_audit
to ai_data_runtime;
