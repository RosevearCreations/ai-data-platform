-- Build 327 — Zero-Touch Module Installer & Guided Host Enrollment
-- Durable exact-host enrollment preparation and append-only owner decisions.
-- Zero-touch automates preparation only; it never activates trust, capabilities or connections.

create table if not exists app.module_host_enrollments (
  enrollment_id uuid primary key,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  host_application_id text not null
    check (
      char_length(host_application_id) between 3 and 120
      and host_application_id ~ '^[a-z][a-z0-9]*([.-][a-z0-9]+)*$'
    ),
  host_instance_id text not null
    check (
      char_length(host_instance_id) between 3 and 160
      and host_instance_id ~ '^[A-Za-z0-9][A-Za-z0-9._:@/+-]*$'
    ),
  environment text not null
    check (environment in ('development','test','staging','production')),
  host_tenant_id text not null
    check (char_length(host_tenant_id) between 3 and 160),
  platform_tenant_id text not null
    check (char_length(platform_tenant_id) between 3 and 160),
  module_version text not null
    check (char_length(module_version) between 5 and 40),
  host_contract_version integer not null
    check (host_contract_version between 1 and 1000),
  protocol_version integer not null
    check (protocol_version between 1 and 1000),
  adapter_kind text not null
    check (adapter_kind in ('react','nextjs','vite','vanilla','electron')),
  default_surface text not null
    check (char_length(default_surface) between 3 and 80),
  requested_capabilities text[] not null
    check (cardinality(requested_capabilities) between 1 and 32),
  credential_requirements jsonb not null default '[]'::jsonb
    check (
      jsonb_typeof(credential_requirements)='array'
      and octet_length(credential_requirements::text)<=16384
    ),
  credential_bindings jsonb not null default '[]'::jsonb
    check (
      jsonb_typeof(credential_bindings)='array'
      and octet_length(credential_bindings::text)<=16384
    ),
  transport_id text not null
    check (char_length(transport_id) between 3 and 120),
  transport_kind text not null
    check (transport_kind in ('direct-https','trusted-local-relay','approved-cloud-relay')),
  transport_origin text not null
    check (char_length(transport_origin) between 8 and 300),
  transport_security_level text not null
    check (transport_security_level in ('standard','hardened')),
  manifest_snapshot jsonb not null
    check (
      jsonb_typeof(manifest_snapshot)='object'
      and octet_length(manifest_snapshot::text)<=32768
    ),
  manifest_sha256 text not null
    check (manifest_sha256 ~ '^[a-f0-9]{64}$'),
  dry_run_snapshot jsonb not null
    check (
      jsonb_typeof(dry_run_snapshot)='object'
      and octet_length(dry_run_snapshot::text)<=32768
    ),
  dry_run_sha256 text not null
    check (dry_run_sha256 ~ '^[a-f0-9]{64}$'),
  state text not null
    check (state in ('dry-run-held','dry-run-passed','approved','rejected')),
  revision integer not null default 1
    check (revision between 1 and 1000000),
  approved_by text references auth."user"(id) on delete restrict,
  approved_at timestamptz,
  approval_reason text
    check (approval_reason is null or char_length(approval_reason) between 3 and 500),
  approval_event_id uuid,
  package_sha256 text
    check (package_sha256 is null or package_sha256 ~ '^[a-f0-9]{64}$'),
  package_generated_at timestamptz,
  created_by text not null references auth."user"(id) on delete restrict,
  updated_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (
    owner_user_id,
    workspace_id,
    host_application_id,
    host_instance_id,
    environment,
    platform_tenant_id
  ),
  check (
    (state='approved' and approved_by is not null and approved_at is not null and approval_event_id is not null)
    or state<>'approved'
  ),
  check (
    package_sha256 is null
    or (state='approved' and package_generated_at is not null)
  )
);

create table if not exists app.module_host_enrollment_events (
  event_id uuid primary key,
  enrollment_id uuid not null
    references app.module_host_enrollments(enrollment_id) on delete restrict,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  revision integer not null check (revision between 1 and 1000000),
  event_type text not null
    check (event_type in (
      'dry-run-held',
      'dry-run-passed',
      'owner-approved',
      'owner-rejected',
      'package-generated'
    )),
  manifest_sha256 text not null
    check (manifest_sha256 ~ '^[a-f0-9]{64}$'),
  dry_run_sha256 text not null
    check (dry_run_sha256 ~ '^[a-f0-9]{64}$'),
  details jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(details)='object'
      and octet_length(details::text)<=16384
    ),
  actor_user_id text not null references auth."user"(id) on delete restrict,
  occurred_at timestamptz not null default now()
);

create index if not exists module_host_enrollments_owner_recent_idx
  on app.module_host_enrollments(owner_user_id,updated_at desc);

create index if not exists module_host_enrollments_workspace_idx
  on app.module_host_enrollments(workspace_id,host_application_id,environment);

create index if not exists module_host_enrollment_events_recent_idx
  on app.module_host_enrollment_events(enrollment_id,occurred_at desc);

alter table app.module_host_enrollments enable row level security;
alter table app.module_host_enrollment_events enable row level security;

drop policy if exists module_host_enrollments_owner_admin_all
  on app.module_host_enrollments;
create policy module_host_enrollments_owner_admin_all
on app.module_host_enrollments
for all to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=module_host_enrollments.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and created_by=owner_user_id
  and updated_by=owner_user_id
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=module_host_enrollments.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists module_host_enrollment_events_owner_admin_select
  on app.module_host_enrollment_events;
create policy module_host_enrollment_events_owner_admin_select
on app.module_host_enrollment_events
for select to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=module_host_enrollment_events.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists module_host_enrollment_events_owner_admin_insert
  on app.module_host_enrollment_events;
create policy module_host_enrollment_events_owner_admin_insert
on app.module_host_enrollment_events
for insert to ai_data_runtime
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and actor_user_id=owner_user_id
  and exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id=module_host_enrollment_events.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

revoke all on
  app.module_host_enrollments,
  app.module_host_enrollment_events
from public;

grant select, insert, update on
  app.module_host_enrollments
to ai_data_runtime;

grant select, insert on
  app.module_host_enrollment_events
to ai_data_runtime;

revoke update, delete on
  app.module_host_enrollment_events
from ai_data_runtime;
