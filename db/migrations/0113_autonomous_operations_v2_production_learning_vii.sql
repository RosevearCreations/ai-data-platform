-- Build 330 — Autonomous Operations V2, Production Learning VII & Next Roadmap Renewal
-- Evidence-driven closeout of Builds 306–330. Snapshots and unnumbered renewal
-- candidates are append-only and owner-scoped. No candidate authorizes execution.

create table if not exists app.production_learning_vii_snapshots (
  snapshot_id uuid primary key,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  overall_state text not null
    check (overall_state in ('healthy','attention','blocked')),
  installed_hosts integer not null default 0
    check (installed_hosts between 0 and 100000),
  live_certified_hosts integer not null default 0
    check (live_certified_hosts between 0 and 100000),
  upgrade_runs integer not null default 0
    check (upgrade_runs between 0 and 1000000),
  autonomous_cycles integer not null default 0
    check (autonomous_cycles between 0 and 1000000),
  recovery_plans integer not null default 0
    check (recovery_plans between 0 and 1000000),
  blocker_count integer not null default 0
    check (blocker_count between 0 and 1000),
  attention_count integer not null default 0
    check (attention_count between 0 and 1000),
  candidate_count integer not null default 0
    check (candidate_count between 0 and 12),
  evidence_snapshot jsonb not null
    check (
      jsonb_typeof(evidence_snapshot)='object'
      and octet_length(evidence_snapshot::text)<=65536
    ),
  model_snapshot jsonb not null
    check (
      jsonb_typeof(model_snapshot)='object'
      and octet_length(model_snapshot::text)<=131072
    ),
  generated_by text not null references auth."user"(id) on delete restrict,
  generated_at timestamptz not null default now()
);

create table if not exists app.production_learning_vii_candidates (
  candidate_id uuid primary key,
  snapshot_id uuid not null
    references app.production_learning_vii_snapshots(snapshot_id)
    on delete restrict,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  priority text not null check (priority in ('P0','P1','P2')),
  area text not null
    check (area in (
      'adoption',
      'capability-governance',
      'certification',
      'lifecycle',
      'autonomy',
      'recovery',
      'tenant-isolation',
      'activity',
      'health',
      'owner-policy'
    )),
  title text not null
    check (
      char_length(title) between 3 and 220
      and title !~ '[[:cntrl:]]'
    ),
  rationale text not null
    check (
      char_length(rationale) between 8 and 1600
      and rationale !~ '[[:cntrl:]]'
    ),
  evidence text not null
    check (
      char_length(evidence) between 3 and 2000
      and evidence !~ '[[:cntrl:]]'
    ),
  source_href text not null
    check (
      char_length(source_href) between 2 and 240
      and source_href like '/%'
    ),
  state text not null default 'candidate'
    check (state='candidate'),
  numbered_build integer
    check (numbered_build is null),
  created_at timestamptz not null default now(),
  unique (snapshot_id,title,source_href)
);

create index if not exists production_learning_vii_snapshots_owner_recent_idx
  on app.production_learning_vii_snapshots(owner_user_id,generated_at desc);

create index if not exists production_learning_vii_candidates_snapshot_idx
  on app.production_learning_vii_candidates(snapshot_id,priority,created_at);

alter table app.production_learning_vii_snapshots enable row level security;
alter table app.production_learning_vii_candidates enable row level security;

drop policy if exists production_learning_vii_snapshots_owner_select
  on app.production_learning_vii_snapshots;
create policy production_learning_vii_snapshots_owner_select
on app.production_learning_vii_snapshots
for select to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
);

drop policy if exists production_learning_vii_snapshots_owner_insert
  on app.production_learning_vii_snapshots;
create policy production_learning_vii_snapshots_owner_insert
on app.production_learning_vii_snapshots
for insert to ai_data_runtime
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and generated_by=owner_user_id
);

drop policy if exists production_learning_vii_candidates_owner_select
  on app.production_learning_vii_candidates;
create policy production_learning_vii_candidates_owner_select
on app.production_learning_vii_candidates
for select to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
);

drop policy if exists production_learning_vii_candidates_owner_insert
  on app.production_learning_vii_candidates;
create policy production_learning_vii_candidates_owner_insert
on app.production_learning_vii_candidates
for insert to ai_data_runtime
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
);

revoke all on
  app.production_learning_vii_snapshots,
  app.production_learning_vii_candidates
from public;

grant select, insert on
  app.production_learning_vii_snapshots,
  app.production_learning_vii_candidates
to ai_data_runtime;

revoke update, delete on
  app.production_learning_vii_snapshots,
  app.production_learning_vii_candidates
from ai_data_runtime;
