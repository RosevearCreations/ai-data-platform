-- Build 345 — Role/Device Acceptance Matrix
-- Append-only evidence for Customer/Worker/Admin x Mobile/Tablet/Desktop.
-- This ledger is intentionally separate from implementation and automated-test evidence.

create table if not exists app.master_role_device_acceptance_evidence (
  acceptance_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null
    check (source_id in (
      'yw','icamp','rosiedazzlers','devilndove',
      'ai-data-platform','rosevear-ai-hub'
    )),
  module_id text check (
    module_id is null or module_id ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$'
  ),
  role_name text not null
    check (role_name in ('customer','worker','admin')),
  device_class text not null
    check (device_class in ('mobile','tablet','desktop')),
  record_version bigint not null check (record_version > 0),
  state text not null
    check (state in ('ACCEPTED','PARTIAL','FAILED')),
  evidence_uri text not null check (
    evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
  ),
  reviewer text not null check (char_length(reviewer) between 1 and 160),
  confidence numeric(6,5) not null check (confidence >= 0 and confidence <= 1),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  branch text not null check (
    branch ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$'
  ),
  commit_sha text not null check (commit_sha ~ '^[a-f0-9]{7,64}$'),
  notes text check (
    notes is null or char_length(notes) between 1 and 1000
  ),
  recorded_at timestamptz not null default now(),
  check (expires_at > observed_at)
);

create unique index if not exists master_role_device_acceptance_version_uidx
  on app.master_role_device_acceptance_evidence(
    source_id,
    coalesce(module_id,''),
    role_name,
    device_class,
    record_version
  );

create index if not exists master_role_device_acceptance_latest_idx
  on app.master_role_device_acceptance_evidence(
    source_id,
    coalesce(module_id,''),
    role_name,
    device_class,
    record_version desc
  );

create index if not exists master_role_device_acceptance_expiry_idx
  on app.master_role_device_acceptance_evidence(expires_at);

alter table app.master_role_device_acceptance_evidence enable row level security;
alter table app.master_role_device_acceptance_evidence force row level security;

drop policy if exists master_role_device_acceptance_admin_select
  on app.master_role_device_acceptance_evidence;
create policy master_role_device_acceptance_admin_select
on app.master_role_device_acceptance_evidence
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_role_device_acceptance_admin_insert
  on app.master_role_device_acceptance_evidence;
create policy master_role_device_acceptance_admin_insert
on app.master_role_device_acceptance_evidence
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

revoke all on app.master_role_device_acceptance_evidence from public;
revoke all on app.master_role_device_acceptance_evidence from ai_data_runtime;
grant select, insert on app.master_role_device_acceptance_evidence to ai_data_runtime;
revoke update, delete on app.master_role_device_acceptance_evidence from ai_data_runtime;

  ),
  role_name text not null
    check (role_name in ('customer','worker','admin')),
  device_class text not null
    check (device_class in ('mobile','tablet','desktop')),
  record_version bigint not null check (record_version > 0),
  state text not null
    check (state in ('ACCEPTED','PARTIAL','FAILED')),
  evidence_uri text not null check (
    evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
  ),
  reviewer text not null check (char_length(reviewer) between 1 and 160),
  confidence numeric(6,5) not null check (confidence >= 0 and confidence <= 1),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  branch text not null check (
    branch ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$'
  ),
  commit_sha text not null check (commit_sha ~ '^[a-f0-9]{7,64}$'),
  notes text check (
    notes is null or char_length(notes) between 1 and 1000
  ),
  recorded_at timestamptz not null default now(),
  check (expires_at > observed_at)
);

create unique index if not exists master_role_device_acceptance_version_uidx
  on app.master_role_device_acceptance_evidence(
    source_id,
    coalesce(module_id,''),
    role_name,
    device_class,
    record_version
  );

create index if not exists master_role_device_acceptance_latest_idx
  on app.master_role_device_acceptance_evidence(
    source_id,
    coalesce(module_id,''),
    role_name,
    device_class,
    record_version desc
  );

create index if not exists master_role_device_acceptance_expiry_idx
  on app.master_role_device_acceptance_evidence(expires_at);

alter table app.master_role_device_acceptance_evidence enable row level security;
alter table app.master_role_device_acceptance_evidence force row level security;

drop policy if exists master_role_device_acceptance_admin_select
  on app.master_role_device_acceptance_evidence;
create policy master_role_device_acceptance_admin_select
on app.master_role_device_acceptance_evidence
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_role_device_acceptance_admin_insert
  on app.master_role_device_acceptance_evidence;
create policy master_role_device_acceptance_admin_insert
on app.master_role_device_acceptance_evidence
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

revoke all on app.master_role_device_acceptance_evidence from public;
revoke all on app.master_role_device_acceptance_evidence from ai_data_runtime;
grant select, insert on app.master_role_device_acceptance_evidence to ai_data_runtime;
revoke update, delete on app.master_role_device_acceptance_evidence from ai_data_runtime;
