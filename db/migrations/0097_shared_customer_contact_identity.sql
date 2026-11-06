-- Build 294 — Shared Customer & Contact Identity Resolution
-- Evidence-backed exact matching with owner/admin review.
-- Raw email, phone, name and postal values are never persisted.

create table if not exists app.customer_identity_observations (
  observation_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  source_application_id text not null
    check (source_application_id in (
      'devilndove',
      'rosiedazzlers',
      'yard-workers',
      'icamp',
      'rosevear-comms-hub',
      'rosevear-ai-hub'
    )),
  canonical_tenant_key text not null
    check (
      canonical_tenant_key ~ '^[a-z0-9][a-z0-9._:-]{1,119}$'
    ),
  source_record_id text not null
    check (
      length(source_record_id) between 1 and 160
      and source_record_id !~ '[[:cntrl:]]'
    ),
  source_record_version text
    check (
      source_record_version is null
      or (
        length(source_record_version) between 1 and 120
        and source_record_version !~ '[[:cntrl:]]'
      )
    ),
  email_sha256 text
    check (
      email_sha256 is null
      or email_sha256 ~ '^[a-f0-9]{64}$'
    ),
  phone_sha256 text
    check (
      phone_sha256 is null
      or phone_sha256 ~ '^[a-f0-9]{64}$'
    ),
  name_sha256 text
    check (
      name_sha256 is null
      or name_sha256 ~ '^[a-f0-9]{64}$'
    ),
  postal_sha256 text
    check (
      postal_sha256 is null
      or postal_sha256 ~ '^[a-f0-9]{64}$'
    ),
  evidence_sha256 text not null
    check (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  observed_by text not null references auth."user"(id) on delete restrict,
  observed_at timestamptz not null default now(),
  check (
    email_sha256 is not null
    or phone_sha256 is not null
    or (name_sha256 is not null and postal_sha256 is not null)
  ),
  unique (
    workspace_id,
    source_application_id,
    canonical_tenant_key,
    source_record_id,
    evidence_sha256
  )
);

create table if not exists app.customer_identity_candidates (
  candidate_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  canonical_tenant_key text not null
    check (
      canonical_tenant_key ~ '^[a-z0-9][a-z0-9._:-]{1,119}$'
    ),
  observation_a_id uuid not null
    references app.customer_identity_observations(observation_id)
    on delete restrict,
  observation_b_id uuid not null
    references app.customer_identity_observations(observation_id)
    on delete restrict,
  match_rule text not null
    check (match_rule in (
      'email-and-phone-exact',
      'email-exact',
      'phone-exact',
      'name-postal-exact'
    )),
  confidence_score integer not null
    check (confidence_score between 1 and 100),
  evidence_fields text[] not null
    check (
      cardinality(evidence_fields) between 1 and 2
      and evidence_fields <@ array[
        'email','phone','name','postal'
      ]::text[]
    ),
  state text not null default 'pending-review'
    check (state='pending-review'),
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (observation_a_id <> observation_b_id),
  check (observation_a_id::text < observation_b_id::text),
  unique (observation_a_id,observation_b_id)
);

create table if not exists app.customer_identity_decisions (
  decision_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  candidate_id uuid not null unique
    references app.customer_identity_candidates(candidate_id)
    on delete restrict,
  decision text not null
    check (decision in ('accept','reject')),
  reason text not null
    check (
      length(reason) between 8 and 500
      and reason !~ '[[:cntrl:]]'
    ),
  decided_by text not null references auth."user"(id) on delete restrict,
  decided_at timestamptz not null default now()
);

create table if not exists app.customer_identity_groups (
  group_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  created_from_candidate_id uuid not null unique
    references app.customer_identity_candidates(candidate_id)
    on delete restrict,
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists app.customer_identity_links (
  link_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  group_id uuid not null
    references app.customer_identity_groups(group_id) on delete restrict,
  observation_id uuid not null unique
    references app.customer_identity_observations(observation_id)
    on delete restrict,
  linked_by text not null references auth."user"(id) on delete restrict,
  linked_at timestamptz not null default now(),
  unique (group_id,observation_id)
);

create table if not exists app.customer_identity_audit (
  audit_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  action text not null
    check (action in (
      'observation-recorded',
      'candidate-created',
      'match-accepted',
      'match-rejected',
      'observation-linked'
    )),
  observation_id uuid
    references app.customer_identity_observations(observation_id)
    on delete restrict,
  candidate_id uuid
    references app.customer_identity_candidates(candidate_id)
    on delete restrict,
  group_id uuid
    references app.customer_identity_groups(group_id)
    on delete restrict,
  details jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(details)='object'
      and octet_length(details::text) <= 16384
    ),
  occurred_at timestamptz not null default now()
);

create index if not exists customer_identity_observations_workspace_recent_idx
  on app.customer_identity_observations(workspace_id,observed_at desc);
create index if not exists customer_identity_observations_email_idx
  on app.customer_identity_observations(workspace_id,canonical_tenant_key,email_sha256)
  where email_sha256 is not null;
create index if not exists customer_identity_observations_phone_idx
  on app.customer_identity_observations(workspace_id,canonical_tenant_key,phone_sha256)
  where phone_sha256 is not null;
create index if not exists customer_identity_candidates_workspace_recent_idx
  on app.customer_identity_candidates(workspace_id,created_at desc);
create index if not exists customer_identity_decisions_workspace_recent_idx
  on app.customer_identity_decisions(workspace_id,decided_at desc);
create index if not exists customer_identity_links_group_idx
  on app.customer_identity_links(workspace_id,group_id);
create index if not exists customer_identity_audit_workspace_recent_idx
  on app.customer_identity_audit(workspace_id,occurred_at desc);

grant select, insert on app.customer_identity_observations to ai_data_runtime;
grant select, insert on app.customer_identity_candidates to ai_data_runtime;
grant select, insert on app.customer_identity_decisions to ai_data_runtime;
grant select, insert on app.customer_identity_groups to ai_data_runtime;
grant select, insert on app.customer_identity_links to ai_data_runtime;
grant select, insert on app.customer_identity_audit to ai_data_runtime;

revoke all on app.customer_identity_observations from public;
revoke all on app.customer_identity_candidates from public;
revoke all on app.customer_identity_decisions from public;
revoke all on app.customer_identity_groups from public;
revoke all on app.customer_identity_links from public;
revoke all on app.customer_identity_audit from public;

alter table app.customer_identity_observations enable row level security;
alter table app.customer_identity_candidates enable row level security;
alter table app.customer_identity_decisions enable row level security;
alter table app.customer_identity_groups enable row level security;
alter table app.customer_identity_links enable row level security;
alter table app.customer_identity_audit enable row level security;

drop policy if exists customer_identity_observations_read
  on app.customer_identity_observations;
create policy customer_identity_observations_read
on app.customer_identity_observations
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=customer_identity_observations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists customer_identity_observations_insert
  on app.customer_identity_observations;
create policy customer_identity_observations_insert
on app.customer_identity_observations
for insert to ai_data_runtime
with check (
  observed_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=customer_identity_observations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists customer_identity_candidates_read
  on app.customer_identity_candidates;
create policy customer_identity_candidates_read
on app.customer_identity_candidates
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=customer_identity_candidates.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists customer_identity_candidates_insert
  on app.customer_identity_candidates;
create policy customer_identity_candidates_insert
on app.customer_identity_candidates
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=customer_identity_candidates.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists customer_identity_decisions_read
  on app.customer_identity_decisions;
create policy customer_identity_decisions_read
on app.customer_identity_decisions
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=customer_identity_decisions.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists customer_identity_decisions_insert
  on app.customer_identity_decisions;
create policy customer_identity_decisions_insert
on app.customer_identity_decisions
for insert to ai_data_runtime
with check (
  decided_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=customer_identity_decisions.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists customer_identity_groups_read
  on app.customer_identity_groups;
create policy customer_identity_groups_read
on app.customer_identity_groups
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=customer_identity_groups.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists customer_identity_groups_insert
  on app.customer_identity_groups;
create policy customer_identity_groups_insert
on app.customer_identity_groups
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=customer_identity_groups.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists customer_identity_links_read
  on app.customer_identity_links;
create policy customer_identity_links_read
on app.customer_identity_links
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=customer_identity_links.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists customer_identity_links_insert
  on app.customer_identity_links;
create policy customer_identity_links_insert
on app.customer_identity_links
for insert to ai_data_runtime
with check (
  linked_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=customer_identity_links.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists customer_identity_audit_read
  on app.customer_identity_audit;
create policy customer_identity_audit_read
on app.customer_identity_audit
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=customer_identity_audit.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists customer_identity_audit_insert
  on app.customer_identity_audit;
create policy customer_identity_audit_insert
on app.customer_identity_audit
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=customer_identity_audit.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);
