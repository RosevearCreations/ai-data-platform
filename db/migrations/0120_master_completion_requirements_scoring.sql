-- Build 338 — Master Completion Requirements Registry & Evidence-Axis Scoring
-- Suite-wide append-only requirement revisions, explicit denominator approvals
-- and independent evidence-axis records. No source application is mutated.

create table if not exists app.master_completion_requirement_revisions (
  requirement_id text not null,
  revision_number bigint not null check (revision_number > 0),
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null
    check (source_id in (
      'yw','icamp','rosiedazzlers','devilndove',
      'ai-data-platform','rosevear-ai-hub'
    )),
  module_id text,
  requirement_key text not null,
  title text not null check (char_length(title) between 1 and 240),
  description text not null check (char_length(description) between 1 and 1000),
  applicability text not null
    check (applicability in ('required','not-applicable','unscoped')),
  required_axes jsonb not null check (
    jsonb_typeof(required_axes)='array'
    and required_axes <@ '[
      "design","implementation","automated-testing",
      "integration-verification","security",
      "accessibility-device-acceptance",
      "production-user-acceptance"
    ]'::jsonb
  ),
  weight numeric(8,3) not null check (weight > 0 and weight <= 100),
  critical boolean not null default false,
  recorded_at timestamptz not null default now(),
  primary key (requirement_id, revision_number),
  unique (source_id, module_id, requirement_key, revision_number),
  check (
    (applicability='required' and jsonb_array_length(required_axes) > 0)
    or
    (applicability<>'required' and jsonb_array_length(required_axes) = 0)
  )
);

create table if not exists app.master_completion_denominator_approvals (
  approval_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  scope_key text not null,
  scope_version bigint not null check (scope_version > 0),
  source_id text not null
    check (source_id in (
      'yw','icamp','rosiedazzlers','devilndove',
      'ai-data-platform','rosevear-ai-hub'
    )),
  module_id text,
  scope_date date not null,
  branch text not null check (char_length(branch) between 1 and 160),
  commit_sha text not null check (commit_sha ~ '^[a-f0-9]{7,64}$'),
  denominator_hash text not null check (denominator_hash ~ '^[a-f0-9]{64}$'),
  items jsonb not null check (
    jsonb_typeof(items)='array' and jsonb_array_length(items) > 0
  ),
  approved_by text not null check (char_length(approved_by) between 1 and 160),
  approved_at timestamptz not null default now(),
  unique (scope_key, scope_version)
);

create table if not exists app.master_completion_evidence (
  evidence_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  requirement_id text not null,
  requirement_revision bigint not null,
  axis text not null
    check (axis in (
      'design','implementation','automated-testing',
      'integration-verification','security',
      'accessibility-device-acceptance',
      'production-user-acceptance'
    )),
  record_version bigint not null check (record_version > 0),
  state text not null check (state in ('SATISFIED','PARTIAL','FAILED')),
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  reviewer text not null check (char_length(reviewer) between 1 and 160),
  confidence numeric(6,5) not null check (confidence >= 0 and confidence <= 1),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  branch text not null check (char_length(branch) between 1 and 160),
  commit_sha text not null check (commit_sha ~ '^[a-f0-9]{7,64}$'),
  notes text check (notes is null or char_length(notes) between 1 and 1000),
  recorded_at timestamptz not null default now(),
  unique (requirement_id, requirement_revision, axis, record_version),
  foreign key (requirement_id, requirement_revision)
    references app.master_completion_requirement_revisions(
      requirement_id, revision_number
    ) on delete restrict,
  check (expires_at > observed_at)
);

create index if not exists master_completion_requirement_source_idx
  on app.master_completion_requirement_revisions(
    source_id, module_id, requirement_id, revision_number desc
  );

create index if not exists master_completion_denominator_scope_idx
  on app.master_completion_denominator_approvals(
    scope_key, scope_version desc
  );

create index if not exists master_completion_evidence_current_idx
  on app.master_completion_evidence(
    requirement_id, requirement_revision, axis, record_version desc
  );

create index if not exists master_completion_evidence_expiry_idx
  on app.master_completion_evidence(expires_at);

alter table app.master_completion_requirement_revisions enable row level security;
alter table app.master_completion_denominator_approvals enable row level security;
alter table app.master_completion_evidence enable row level security;

drop policy if exists master_completion_requirement_admin_select
  on app.master_completion_requirement_revisions;
create policy master_completion_requirement_admin_select
on app.master_completion_requirement_revisions
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_completion_requirement_admin_insert
  on app.master_completion_requirement_revisions;
create policy master_completion_requirement_admin_insert
on app.master_completion_requirement_revisions
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_completion_denominator_admin_select
  on app.master_completion_denominator_approvals;
create policy master_completion_denominator_admin_select
on app.master_completion_denominator_approvals
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_completion_denominator_admin_insert
  on app.master_completion_denominator_approvals;
create policy master_completion_denominator_admin_insert
on app.master_completion_denominator_approvals
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_completion_evidence_admin_select
  on app.master_completion_evidence;
create policy master_completion_evidence_admin_select
on app.master_completion_evidence
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_completion_evidence_admin_insert
  on app.master_completion_evidence;
create policy master_completion_evidence_admin_insert
on app.master_completion_evidence
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

revoke all on app.master_completion_requirement_revisions from public;
revoke all on app.master_completion_denominator_approvals from public;
revoke all on app.master_completion_evidence from public;

grant select, insert on app.master_completion_requirement_revisions to ai_data_runtime;
grant select, insert on app.master_completion_denominator_approvals to ai_data_runtime;
grant select, insert on app.master_completion_evidence to ai_data_runtime;

revoke update, delete on app.master_completion_requirement_revisions from ai_data_runtime;
revoke update, delete on app.master_completion_denominator_approvals from ai_data_runtime;
revoke update, delete on app.master_completion_evidence from ai_data_runtime;
