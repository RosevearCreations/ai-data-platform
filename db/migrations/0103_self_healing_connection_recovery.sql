-- Build 301 — Self-Healing Connection Recovery & Safe Retry Automation
-- Recovery plans are immutable; safe retry attempts and owner decisions are append-only.
-- Consequential actions remain held for explicit owner/admin approval.

create table if not exists app.integration_recovery_plans (
  plan_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  source_kind text not null
    check (source_kind in ('connector-audit','event-dead-letter','credential-reference')),
  source_id text not null
    check (char_length(source_id) between 1 and 240),
  source_key_sha256 text not null unique
    check (source_key_sha256 ~ '^[a-f0-9]{64}$'),
  recovery_action text not null
    check (recovery_action in ('connector-health-retry','event-held-replay','credential-remediation')),
  classification text not null
    check (classification in ('safe-bounded-retry','owner-approval-required','not-retryable')),
  reason_code text not null
    check (reason_code ~ '^[a-z0-9][a-z0-9._-]{1,119}$'),
  source_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(source_payload)='object' and octet_length(source_payload::text)<=16384),
  max_attempts integer not null default 0 check (max_attempts between 0 and 3),
  cooldown_seconds integer not null default 0 check (cooldown_seconds between 0 and 3600),
  auto_execution_allowed boolean not null default false,
  expires_at timestamptz,
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (
    (classification='safe-bounded-retry'
      and recovery_action='connector-health-retry'
      and auto_execution_allowed=true
      and max_attempts between 1 and 3
      and cooldown_seconds between 60 and 3600)
    or
    (classification<>'safe-bounded-retry'
      and auto_execution_allowed=false
      and max_attempts=0
      and cooldown_seconds=0)
  )
);

create table if not exists app.integration_recovery_attempts (
  attempt_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  plan_id uuid not null references app.integration_recovery_plans(plan_id) on delete restrict,
  attempt_number integer not null check (attempt_number between 1 and 3),
  outcome text not null check (outcome in ('succeeded','failed','blocked')),
  error_code text,
  duration_ms integer not null default 0 check (duration_ms between 0 and 120000),
  evidence jsonb not null default '{}'::jsonb
    check (jsonb_typeof(evidence)='object' and octet_length(evidence::text)<=16384),
  attempted_by text not null references auth."user"(id) on delete restrict,
  attempted_at timestamptz not null default now(),
  unique (plan_id,attempt_number)
);

create table if not exists app.integration_recovery_decisions (
  decision_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  plan_id uuid not null unique references app.integration_recovery_plans(plan_id) on delete restrict,
  decision text not null check (decision in ('approve','reject')),
  reason text not null
    check (char_length(reason) between 8 and 500 and reason !~ '[[:cntrl:]]'),
  consequence text not null
    check (consequence in (
      'prepare-held-event-replay',
      'credential-remediation-authorized-for-owner-workbench',
      'connector-remediation-authorized-for-owner-workbench'
    )),
  decided_by text not null references auth."user"(id) on delete restrict,
  decided_at timestamptz not null default now()
);

create table if not exists app.integration_recovery_audit (
  audit_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  plan_id uuid references app.integration_recovery_plans(plan_id) on delete restrict,
  attempt_id uuid references app.integration_recovery_attempts(attempt_id) on delete restrict,
  decision_id uuid references app.integration_recovery_decisions(decision_id) on delete restrict,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  action text not null
    check (action in (
      'plan-created',
      'safe-retry-attempted',
      'safe-retry-succeeded',
      'safe-retry-failed',
      'owner-approved',
      'owner-rejected',
      'held-event-replay-prepared'
    )),
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details)='object' and octet_length(details::text)<=16384),
  occurred_at timestamptz not null default now()
);

create index if not exists integration_recovery_plans_workspace_idx
  on app.integration_recovery_plans(workspace_id,classification,created_at desc);

create index if not exists integration_recovery_attempts_plan_idx
  on app.integration_recovery_attempts(plan_id,attempt_number desc);

create index if not exists integration_recovery_audit_workspace_idx
  on app.integration_recovery_audit(workspace_id,occurred_at desc);

alter table app.integration_recovery_plans enable row level security;
alter table app.integration_recovery_attempts enable row level security;
alter table app.integration_recovery_decisions enable row level security;
alter table app.integration_recovery_audit enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'integration_recovery_plans',
    'integration_recovery_attempts',
    'integration_recovery_decisions',
    'integration_recovery_audit'
  ]
  loop
    execute format('drop policy if exists %I_member_select on app.%I', t, t);
    execute format(
      'create policy %I_member_select on app.%I for select using (exists (select 1 from app.workspace_members wm where wm.workspace_id=%I.workspace_id and wm.user_id=nullif(current_setting(''app.user_id'',true),'''')))',
      t,t,t
    );
    execute format('drop policy if exists %I_admin_insert on app.%I', t, t);
    execute format(
      'create policy %I_admin_insert on app.%I for insert with check (exists (select 1 from app.workspace_members wm where wm.workspace_id=%I.workspace_id and wm.user_id=nullif(current_setting(''app.user_id'',true),'''') and wm.role in (''owner'',''admin'')))',
      t,t,t
    );
  end loop;
end $$;

revoke update, delete on
  app.integration_recovery_plans,
  app.integration_recovery_attempts,
  app.integration_recovery_decisions,
  app.integration_recovery_audit
from ai_data_runtime;

grant select, insert on
  app.integration_recovery_plans,
  app.integration_recovery_attempts,
  app.integration_recovery_decisions,
  app.integration_recovery_audit
to ai_data_runtime;
