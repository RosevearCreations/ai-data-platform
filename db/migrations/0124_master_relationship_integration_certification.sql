-- Build 346 — Relationship-pattern integration certification
-- Append-only certification runs for one-to-one, one-to-many,
-- many-to-one and many-to-many Master Shell source relationships.

create table if not exists app.master_relationship_certification_runs (
  run_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  relationship_id text not null
    check (relationship_id ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$'),
  certification_version bigint not null
    check (certification_version > 0),
  relationship_pattern text not null
    check (
      relationship_pattern in (
        'one-to-one',
        'one-to-many',
        'many-to-one',
        'many-to-many'
      )
    ),
  source_ids text[] not null,
  destination_ids text[] not null,
  overall_outcome text not null
    check (overall_outcome in ('passed','failed','blocked')),
  reviewer text not null
    check (char_length(reviewer) between 1 and 160),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  branch text not null
    check (branch ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$'),
  commit_sha text not null
    check (commit_sha ~ '^[a-f0-9]{7,64}$'),
  notes text
    check (notes is null or char_length(notes) between 1 and 1200),
  recorded_at timestamptz not null default now(),
  check (expires_at > observed_at),
  check (cardinality(source_ids) between 1 and 6),
  check (cardinality(destination_ids) between 1 and 6),
  check (
    relationship_pattern <> 'one-to-one'
    or (
      cardinality(source_ids) = 1
      and cardinality(destination_ids) = 1
    )
  ),
  check (
    relationship_pattern <> 'one-to-many'
    or (
      cardinality(source_ids) = 1
      and cardinality(destination_ids) >= 2
    )
  ),
  check (
    relationship_pattern <> 'many-to-one'
    or (
      cardinality(source_ids) >= 2
      and cardinality(destination_ids) = 1
    )
  ),
  check (
    relationship_pattern <> 'many-to-many'
    or (
      cardinality(source_ids) >= 2
      and cardinality(destination_ids) >= 2
    )
  )
);

create unique index if not exists master_relationship_certification_version_uidx
  on app.master_relationship_certification_runs(
    relationship_id,
    certification_version
  );

create index if not exists master_relationship_certification_pattern_idx
  on app.master_relationship_certification_runs(
    relationship_pattern,
    recorded_at desc
  );

create index if not exists master_relationship_certification_expiry_idx
  on app.master_relationship_certification_runs(expires_at);

create table if not exists app.master_relationship_certification_assertions (
  assertion_id uuid primary key,
  run_id uuid not null
    references app.master_relationship_certification_runs(run_id)
    on delete restrict,
  dimension text not null
    check (
      dimension in (
        'contract',
        'identity',
        'replay',
        'expiry',
        'audience',
        'tenant-isolation'
      )
    ),
  outcome text not null
    check (outcome in ('pass','fail','blocked')),
  evidence_uri text not null
    check (
      evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
    ),
  detail text not null
    check (char_length(detail) between 1 and 1200),
  recorded_at timestamptz not null default now(),
  unique (run_id, dimension)
);

alter table app.master_relationship_certification_runs
  enable row level security;
alter table app.master_relationship_certification_runs
  force row level security;
alter table app.master_relationship_certification_assertions
  enable row level security;
alter table app.master_relationship_certification_assertions
  force row level security;

drop policy if exists master_relationship_certification_runs_admin_select
  on app.master_relationship_certification_runs;
create policy master_relationship_certification_runs_admin_select
on app.master_relationship_certification_runs
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_relationship_certification_runs_admin_insert
  on app.master_relationship_certification_runs;
create policy master_relationship_certification_runs_admin_insert
on app.master_relationship_certification_runs
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

drop policy if exists master_relationship_certification_assertions_admin_select
  on app.master_relationship_certification_assertions;
create policy master_relationship_certification_assertions_admin_select
on app.master_relationship_certification_assertions
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_relationship_certification_assertions_admin_insert
  on app.master_relationship_certification_assertions;
create policy master_relationship_certification_assertions_admin_insert
on app.master_relationship_certification_assertions
for insert to ai_data_runtime
with check (
  exists (
    select 1
    from app.master_relationship_certification_runs r
    where r.run_id=master_relationship_certification_assertions.run_id
      and r.actor_user_id=nullif(current_setting('app.user_id',true),'')
  )
);

revoke all on app.master_relationship_certification_runs from public;
revoke all on app.master_relationship_certification_assertions from public;
revoke all on app.master_relationship_certification_runs from ai_data_runtime;
revoke all on app.master_relationship_certification_assertions from ai_data_runtime;

grant select, insert on
  app.master_relationship_certification_runs,
  app.master_relationship_certification_assertions
to ai_data_runtime;

revoke update, delete on
  app.master_relationship_certification_runs,
  app.master_relationship_certification_assertions
from ai_data_runtime;
