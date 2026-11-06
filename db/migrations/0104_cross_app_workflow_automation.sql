-- Build 302 — Cross-App Workflow Automation Builder
-- Reviewed event rules may create held action intents only.
-- Destination actions retain their existing authorization and execution gates.

create table if not exists app.workflow_automation_rules (
  rule_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  name text not null check (char_length(name) between 3 and 160),
  source_application_id text
    check (
      source_application_id is null
      or source_application_id in (
        'devilndove',
        'rosiedazzlers',
        'yard-workers',
        'icamp',
        'rosevear-comms-hub',
        'rosevear-ai-hub'
      )
    ),
  destination_application_id text not null
    check (destination_application_id in (
      'devilndove',
      'rosiedazzlers',
      'yard-workers',
      'icamp',
      'rosevear-comms-hub',
      'rosevear-ai-hub'
    )),
  environment text not null
    check (environment in ('nonproduction','production')),
  tenant_id text
    check (tenant_id is null or char_length(tenant_id) between 1 and 128),
  event_types jsonb not null
    check (
      jsonb_typeof(event_types)='array'
      and jsonb_array_length(event_types) between 1 and 50
      and octet_length(event_types::text)<=8192
    ),
  action_kind text not null
    check (action_kind in (
      'prepare-shared-task',
      'prepare-notification',
      'prepare-schedule',
      'review-event-recovery',
      'review-integration-recovery'
    )),
  action_config jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(action_config)='object'
      and octet_length(action_config::text)<=4096
    ),
  rule_fingerprint_sha256 text not null unique
    check (rule_fingerprint_sha256 ~ '^[a-f0-9]{64}$'),
  supersedes_rule_id uuid references app.workflow_automation_rules(rule_id) on delete restrict,
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (
    source_application_id is null
    or source_application_id <> destination_application_id
  )
);

create table if not exists app.workflow_automation_rule_reviews (
  review_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  rule_id uuid not null references app.workflow_automation_rules(rule_id) on delete restrict,
  decision text not null check (decision in ('approve','reject','disable')),
  reason text not null
    check (char_length(reason) between 8 and 500 and reason !~ '[[:cntrl:]]'),
  reviewed_by text not null references auth."user"(id) on delete restrict,
  reviewed_at timestamptz not null default now()
);

create table if not exists app.workflow_automation_action_intents (
  intent_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  rule_id uuid not null references app.workflow_automation_rules(rule_id) on delete restrict,
  rule_review_id uuid not null references app.workflow_automation_rule_reviews(review_id) on delete restrict,
  publication_id uuid not null references app.event_bus_publications(publication_id) on delete restrict,
  source_application_id text not null,
  destination_application_id text not null,
  event_id text not null,
  event_type text not null,
  action_kind text not null
    check (action_kind in (
      'prepare-shared-task',
      'prepare-notification',
      'prepare-schedule',
      'review-event-recovery',
      'review-integration-recovery'
    )),
  action_config jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(action_config)='object'
      and octet_length(action_config::text)<=4096
    ),
  target_href text not null check (char_length(target_href) between 2 and 240),
  state text not null default 'held' check (state='held'),
  hold_reason text not null default 'workflow-action-not-authorized'
    check (hold_reason='workflow-action-not-authorized'),
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (rule_id,publication_id)
);

create table if not exists app.workflow_automation_audit (
  audit_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  action text not null
    check (action in (
      'rule-created',
      'rule-approved',
      'rule-rejected',
      'rule-disabled',
      'action-intent-created',
      'publication-evaluated-no-match'
    )),
  rule_id uuid references app.workflow_automation_rules(rule_id) on delete restrict,
  review_id uuid references app.workflow_automation_rule_reviews(review_id) on delete restrict,
  publication_id uuid references app.event_bus_publications(publication_id) on delete restrict,
  intent_id uuid references app.workflow_automation_action_intents(intent_id) on delete restrict,
  details jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(details)='object'
      and octet_length(details::text)<=16384
    ),
  occurred_at timestamptz not null default now()
);

create index if not exists workflow_automation_rules_workspace_idx
  on app.workflow_automation_rules(workspace_id,created_at desc);

create index if not exists workflow_automation_reviews_rule_idx
  on app.workflow_automation_rule_reviews(rule_id,reviewed_at desc,review_id desc);

create index if not exists workflow_automation_intents_workspace_idx
  on app.workflow_automation_action_intents(workspace_id,created_at desc);

create index if not exists workflow_automation_audit_workspace_idx
  on app.workflow_automation_audit(workspace_id,occurred_at desc);

alter table app.workflow_automation_rules enable row level security;
alter table app.workflow_automation_rule_reviews enable row level security;
alter table app.workflow_automation_action_intents enable row level security;
alter table app.workflow_automation_audit enable row level security;

drop policy if exists workflow_automation_rules_read on app.workflow_automation_rules;
create policy workflow_automation_rules_read
on app.workflow_automation_rules
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workflow_automation_rules.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workflow_automation_rules_insert on app.workflow_automation_rules;
create policy workflow_automation_rules_insert
on app.workflow_automation_rules
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workflow_automation_rules.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workflow_automation_rule_reviews_read on app.workflow_automation_rule_reviews;
create policy workflow_automation_rule_reviews_read
on app.workflow_automation_rule_reviews
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workflow_automation_rule_reviews.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workflow_automation_rule_reviews_insert on app.workflow_automation_rule_reviews;
create policy workflow_automation_rule_reviews_insert
on app.workflow_automation_rule_reviews
for insert to ai_data_runtime
with check (
  reviewed_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workflow_automation_rule_reviews.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workflow_automation_action_intents_read on app.workflow_automation_action_intents;
create policy workflow_automation_action_intents_read
on app.workflow_automation_action_intents
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workflow_automation_action_intents.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workflow_automation_action_intents_insert on app.workflow_automation_action_intents;
create policy workflow_automation_action_intents_insert
on app.workflow_automation_action_intents
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workflow_automation_action_intents.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workflow_automation_audit_read on app.workflow_automation_audit;
create policy workflow_automation_audit_read
on app.workflow_automation_audit
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workflow_automation_audit.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workflow_automation_audit_insert on app.workflow_automation_audit;
create policy workflow_automation_audit_insert
on app.workflow_automation_audit
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workflow_automation_audit.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

revoke update, delete on
  app.workflow_automation_rules,
  app.workflow_automation_rule_reviews,
  app.workflow_automation_action_intents,
  app.workflow_automation_audit
from ai_data_runtime;

grant select, insert on
  app.workflow_automation_rules,
  app.workflow_automation_rule_reviews,
  app.workflow_automation_action_intents,
  app.workflow_automation_audit
to ai_data_runtime;
