-- Build 348 — Six-Application Source Onboarding & Supervised Production Pilot
-- Append-only source-scoped onboarding readiness and supervised pilot evidence.

create table if not exists app.master_source_onboarding_runs (
  run_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null
    check (
      source_id in (
        'yw','icamp','rosiedazzlers','devilndove',
        'ai-data-platform','rosevear-ai-hub'
      )
    ),
  onboarding_version bigint not null check (onboarding_version > 0),
  reviewer text not null check (char_length(reviewer) between 1 and 160),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  branch text not null
    check (branch ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$'),
  commit_sha text not null
    check (commit_sha ~ '^[a-f0-9]{7,64}$'),
  notes text
    check (notes is null or char_length(notes) between 1 and 1200),
  pilot_outcome text not null
    check (pilot_outcome in ('not-run','pass','fail','blocked')),
  pilot_started_at timestamptz,
  pilot_ended_at timestamptz,
  pilot_evidence_uri text
    check (
      pilot_evidence_uri is null or
      pilot_evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
    ),
  pilot_detail text
    check (
      pilot_detail is null or char_length(pilot_detail) between 1 and 1200
    ),
  recorded_at timestamptz not null default now(),
  check (expires_at > observed_at),
  check (
    (
      pilot_outcome='not-run'
      and pilot_started_at is null
      and pilot_ended_at is null
      and pilot_evidence_uri is null
      and pilot_detail is null
    )
    or
    (
      pilot_outcome in ('pass','fail','blocked')
      and pilot_started_at is not null
      and pilot_ended_at is not null
      and pilot_ended_at > pilot_started_at
      and pilot_evidence_uri is not null
      and pilot_detail is not null
    )
  )
);

create unique index if not exists master_source_onboarding_version_uidx
  on app.master_source_onboarding_runs(source_id,onboarding_version);

create index if not exists master_source_onboarding_expiry_idx
  on app.master_source_onboarding_runs(expires_at);

create index if not exists master_source_onboarding_pilot_window_idx
  on app.master_source_onboarding_runs(pilot_started_at,pilot_ended_at)
  where pilot_started_at is not null and pilot_ended_at is not null;

create table if not exists app.master_source_onboarding_assertions (
  assertion_id uuid primary key,
  run_id uuid not null
    references app.master_source_onboarding_runs(run_id)
    on delete restrict,
  prerequisite text not null
    check (
      prerequisite in (
        'original-source-owned-evidence',
        'source-registry-readiness',
        'security-certification',
        'recovery-readiness',
        'rollback-readiness',
        'owner-pilot-authorization'
      )
    ),
  outcome text not null check (outcome in ('pass','fail','blocked')),
  evidence_uri text not null
    check (
      evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
    ),
  detail text not null check (char_length(detail) between 1 and 1200),
  recorded_at timestamptz not null default now(),
  unique (run_id,prerequisite)
);

alter table app.master_source_onboarding_runs
  enable row level security;
alter table app.master_source_onboarding_runs
  force row level security;
alter table app.master_source_onboarding_assertions
  enable row level security;
alter table app.master_source_onboarding_assertions
  force row level security;

drop policy if exists master_source_onboarding_runs_admin_select
  on app.master_source_onboarding_runs;
create policy master_source_onboarding_runs_admin_select
on app.master_source_onboarding_runs
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_source_onboarding_runs_admin_insert
  on app.master_source_onboarding_runs;
create policy master_source_onboarding_runs_admin_insert
on app.master_source_onboarding_runs
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

drop policy if exists master_source_onboarding_assertions_admin_select
  on app.master_source_onboarding_assertions;
create policy master_source_onboarding_assertions_admin_select
on app.master_source_onboarding_assertions
for select to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_source_onboarding_assertions_admin_insert
  on app.master_source_onboarding_assertions;
create policy master_source_onboarding_assertions_admin_insert
on app.master_source_onboarding_assertions
for insert to ai_data_runtime
with check (
  exists (
    select 1
    from app.master_source_onboarding_runs r
    where r.run_id=master_source_onboarding_assertions.run_id
      and r.actor_user_id=nullif(current_setting('app.user_id',true),'')
  )
);

revoke all on app.master_source_onboarding_runs from public;
revoke all on app.master_source_onboarding_assertions from public;
revoke all on app.master_source_onboarding_runs from ai_data_runtime;
revoke all on app.master_source_onboarding_assertions from ai_data_runtime;

grant select,insert on
  app.master_source_onboarding_runs,
  app.master_source_onboarding_assertions
to ai_data_runtime;

revoke update,delete on
  app.master_source_onboarding_runs,
  app.master_source_onboarding_assertions
from ai_data_runtime;
