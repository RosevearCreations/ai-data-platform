-- Build 350 — Production Learning VIII, Master Shell Acceptance & Next Roadmap Renewal
-- Append-only Master Shell closeout snapshots and unnumbered renewal candidates.

create table if not exists app.production_learning_viii_snapshots (
  snapshot_id uuid primary key,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  suite_acceptance text not null
    check (suite_acceptance in ('ACCEPTED','READY_FOR_OWNER','HOLD','FAIL','STALE')),
  accepted_sources integer not null check (accepted_sources between 0 and 6),
  ready_for_owner_sources integer not null check (ready_for_owner_sources between 0 and 6),
  hold_sources integer not null check (hold_sources between 0 and 6),
  failed_sources integer not null check (failed_sources between 0 and 6),
  stale_sources integer not null check (stale_sources between 0 and 6),
  unresolved_sources integer not null check (unresolved_sources between 0 and 6),
  candidate_count integer not null check (candidate_count between 0 and 12),
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
  generated_at timestamptz not null default now(),
  check (
    accepted_sources + ready_for_owner_sources + hold_sources +
    failed_sources + stale_sources = 6
  ),
  check (unresolved_sources = 6 - accepted_sources)
);

create index if not exists production_learning_viii_snapshots_owner_recent_idx
  on app.production_learning_viii_snapshots(owner_user_id,generated_at desc);

create table if not exists app.production_learning_viii_candidates (
  candidate_id uuid primary key,
  snapshot_id uuid not null
    references app.production_learning_viii_snapshots(snapshot_id)
    on delete restrict,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  priority text not null check (priority in ('P0','P1','P2')),
  area text not null
    check (
      area in (
        'source-readiness',
        'owner-acceptance',
        'recovery',
        'accessibility',
        'production-safeguards',
        'rollback',
        'evidence-freshness'
      )
    ),
  source_id text
    check (
      source_id is null or
      source_id in (
        'yw','icamp','rosiedazzlers','devilndove',
        'ai-data-platform','rosevear-ai-hub'
      )
    ),
  title text not null
    check (
      char_length(title) between 3 and 240
      and title !~ '[[:cntrl:]]'
    ),
  rationale text not null
    check (
      char_length(rationale) between 8 and 1800
      and rationale !~ '[[:cntrl:]]'
    ),
  evidence text not null
    check (
      char_length(evidence) between 3 and 2200
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

create index if not exists production_learning_viii_candidates_snapshot_idx
  on app.production_learning_viii_candidates(snapshot_id,priority,created_at);

alter table app.production_learning_viii_snapshots
  enable row level security;
alter table app.production_learning_viii_snapshots
  force row level security;
alter table app.production_learning_viii_candidates
  enable row level security;
alter table app.production_learning_viii_candidates
  force row level security;

drop policy if exists production_learning_viii_snapshots_owner_select
  on app.production_learning_viii_snapshots;
create policy production_learning_viii_snapshots_owner_select
on app.production_learning_viii_snapshots
for select to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
);

drop policy if exists production_learning_viii_snapshots_owner_insert
  on app.production_learning_viii_snapshots;
create policy production_learning_viii_snapshots_owner_insert
on app.production_learning_viii_snapshots
for insert to ai_data_runtime
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and generated_by=owner_user_id
);

drop policy if exists production_learning_viii_candidates_owner_select
  on app.production_learning_viii_candidates;
create policy production_learning_viii_candidates_owner_select
on app.production_learning_viii_candidates
for select to ai_data_runtime
using (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
);

drop policy if exists production_learning_viii_candidates_owner_insert
  on app.production_learning_viii_candidates;
create policy production_learning_viii_candidates_owner_insert
on app.production_learning_viii_candidates
for insert to ai_data_runtime
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
);

revoke all on
  app.production_learning_viii_snapshots,
  app.production_learning_viii_candidates
from public;

revoke all on
  app.production_learning_viii_snapshots,
  app.production_learning_viii_candidates
from ai_data_runtime;

grant select,insert on
  app.production_learning_viii_snapshots,
  app.production_learning_viii_candidates
to ai_data_runtime;

revoke update,delete on
  app.production_learning_viii_snapshots,
  app.production_learning_viii_candidates
from ai_data_runtime;
