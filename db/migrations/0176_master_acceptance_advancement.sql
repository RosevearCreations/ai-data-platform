create table if not exists app.master_build413_acceptance_evidence (
  evidence_id text primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  dimension text not null check (dimension in ('ROLE_DEVICE','ACCESSIBILITY','PERFORMANCE','UX','LOADING_DEGRADED')),
  state text not null check (state in ('PASS','PARTIAL','FAILED')),
  acceptance_percent numeric(5,2) not null check (acceptance_percent between 0 and 100),
  critical_failure_count integer not null check (critical_failure_count >= 0),
  evidence_digest text not null check (evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  check (expires_at > observed_at)
);

create table if not exists app.master_build413_completion_advancement_evidence (
  evidence_id text primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  axis text not null check (axis in ('design','implementation','automated-testing','integration-verification','security','accessibility-device-acceptance','production-user-acceptance')),
  baseline_percent numeric(5,2) not null check (baseline_percent between 0 and 100),
  target_percent numeric(5,2) not null check (target_percent between 0 and 100),
  observed_percent numeric(5,2) not null check (observed_percent between 0 and 100),
  denominator_hash text not null check (denominator_hash ~ '^[a-f0-9]{64}$'),
  baseline_denominator_hash text not null check (baseline_denominator_hash ~ '^[a-f0-9]{64}$'),
  evidence_digest text not null check (evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  state text not null check (state in ('ADVANCED','PARTIAL','FAILED')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  check (expires_at > observed_at),
  check (target_percent >= least(100, baseline_percent + 10)),
  check (denominator_hash = baseline_denominator_hash)
);

create table if not exists app.master_build413_theme_selection_events (
  selection_id uuid primary key,
  module_id text not null check (module_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub')),
  profile_id text not null check (profile_id in ('night-ops','copper-workshop','meadow-grid')),
  background_slot text not null default '' check (char_length(background_slot) <= 120),
  owner_user_id text not null references auth."user"(id) on delete restrict,
  semantic_status_meaning_immutable boolean not null check (semantic_status_meaning_immutable),
  security_state_visible boolean not null check (security_state_visible),
  selected_at timestamptz not null default now()
);

alter table app.master_build413_acceptance_evidence enable row level security;
alter table app.master_build413_acceptance_evidence force row level security;
alter table app.master_build413_completion_advancement_evidence enable row level security;
alter table app.master_build413_completion_advancement_evidence force row level security;
alter table app.master_build413_theme_selection_events enable row level security;
alter table app.master_build413_theme_selection_events force row level security;

create policy master_b413_acceptance_runtime_select on app.master_build413_acceptance_evidence
for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b413_advancement_runtime_select on app.master_build413_completion_advancement_evidence
for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b413_theme_runtime_select on app.master_build413_theme_selection_events
for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b413_theme_owner_insert on app.master_build413_theme_selection_events
for insert to ai_data_runtime with check (
  app.current_master_sysop_role()='owner'
  and owner_user_id=nullif(current_setting('app.user_id',true),'')
);

create policy master_b413_acceptance_protected_select on app.master_build413_acceptance_evidence for select to ai_data_protected_runtime using (true);
create policy master_b413_advancement_protected_select on app.master_build413_completion_advancement_evidence for select to ai_data_protected_runtime using (true);
create policy master_b413_theme_protected_select on app.master_build413_theme_selection_events for select to ai_data_protected_runtime using (true);
create policy master_b413_acceptance_protected_insert on app.master_build413_acceptance_evidence for insert to ai_data_protected_runtime with check (true);
create policy master_b413_advancement_protected_insert on app.master_build413_completion_advancement_evidence for insert to ai_data_protected_runtime with check (true);
create policy master_b413_theme_protected_insert on app.master_build413_theme_selection_events for insert to ai_data_protected_runtime with check (semantic_status_meaning_immutable and security_state_visible);

grant select on
  app.master_build413_acceptance_evidence,
  app.master_build413_completion_advancement_evidence,
  app.master_build413_theme_selection_events
to ai_data_runtime;
grant insert on app.master_build413_theme_selection_events to ai_data_runtime;

grant select,insert on
  app.master_build413_acceptance_evidence,
  app.master_build413_completion_advancement_evidence,
  app.master_build413_theme_selection_events
to ai_data_protected_runtime;

revoke update,delete on
  app.master_build413_acceptance_evidence,
  app.master_build413_completion_advancement_evidence,
  app.master_build413_theme_selection_events
from ai_data_runtime,ai_data_protected_runtime;

revoke insert on
  app.master_build413_acceptance_evidence,
  app.master_build413_completion_advancement_evidence
from ai_data_runtime;
