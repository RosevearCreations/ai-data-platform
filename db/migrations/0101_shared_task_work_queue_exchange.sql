-- Build 298 — Shared Tasks, Follow-Ups & Work Queue Exchange
create table if not exists app.shared_task_work_items (
  task_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  source_application_id text not null,
  destination_application_id text not null,
  canonical_tenant_key text not null,
  source_record_type text not null,
  source_record_id text not null,
  task_kind text not null check (task_kind in ('exception','follow-up','review','maintenance','customer-action','internal-action')),
  priority text not null check (priority in ('low','normal','high','urgent')),
  title text not null,
  summary text not null,
  due_at timestamptz,
  assignee_hint text,
  linked_customer_record_id text,
  linked_job_record_id text,
  task_sha256 text not null check (task_sha256 ~ '^[a-f0-9]{64}$'),
  state text not null default 'held' check (state='held'),
  hold_reason text not null default 'task-exchange-not-authorized'
    check (hold_reason='task-exchange-not-authorized'),
  created_by text not null,
  created_at timestamptz not null default now(),
  check (source_application_id <> destination_application_id),
  unique (workspace_id, task_sha256)
);

create index if not exists shared_task_queue_lookup_idx
  on app.shared_task_work_items
  (workspace_id, destination_application_id, priority, due_at, created_at desc);

create table if not exists app.shared_task_links (
  link_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  parent_task_id uuid not null references app.shared_task_work_items(task_id) on delete cascade,
  child_task_id uuid not null references app.shared_task_work_items(task_id) on delete cascade,
  relationship text not null check (relationship in ('follow-up','blocks','relates-to','derived-from')),
  reason text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  check (parent_task_id <> child_task_id),
  unique (workspace_id, parent_task_id, child_task_id, relationship)
);

create table if not exists app.shared_task_exchange_packages (
  package_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  task_id uuid not null references app.shared_task_work_items(task_id) on delete cascade,
  destination_application_id text not null,
  destination_tenant_key text not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  state text not null default 'held' check (state='held'),
  hold_reason text not null default 'task-exchange-not-authorized'
    check (hold_reason='task-exchange-not-authorized'),
  peer_application_write_requested boolean not null default false
    check (peer_application_write_requested=false),
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, task_id, destination_application_id, destination_tenant_key, payload_sha256)
);

create table if not exists app.shared_task_exchange_reviews (
  review_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  package_id uuid not null unique references app.shared_task_exchange_packages(package_id) on delete cascade,
  decision text not null check (decision in ('approve','reject')),
  reason text not null,
  reviewed_by text not null,
  reviewed_at timestamptz not null default now()
);

create table if not exists app.shared_task_exchange_audit (
  audit_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  actor_user_id text not null,
  action text not null,
  task_id uuid,
  link_id uuid,
  package_id uuid,
  review_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table app.shared_task_work_items enable row level security;
alter table app.shared_task_links enable row level security;
alter table app.shared_task_exchange_packages enable row level security;
alter table app.shared_task_exchange_reviews enable row level security;
alter table app.shared_task_exchange_audit enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'shared_task_work_items',
    'shared_task_links',
    'shared_task_exchange_packages',
    'shared_task_exchange_reviews',
    'shared_task_exchange_audit'
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
  app.shared_task_work_items,
  app.shared_task_links,
  app.shared_task_exchange_packages,
  app.shared_task_exchange_reviews,
  app.shared_task_exchange_audit
from ai_data_runtime;

grant select, insert on
  app.shared_task_work_items,
  app.shared_task_links,
  app.shared_task_exchange_packages,
  app.shared_task_exchange_reviews,
  app.shared_task_exchange_audit
to ai_data_runtime;
