-- Build 370 — Independent Deployed Manifest Observation, Source Signer Custody
-- Evidence Correlation, Fresh Receipt Admission Closure & Three-Master Runtime Decision Recheck.
-- All evidence is append-only. Source private keys are never accepted or stored.

create table if not exists app.master_deployed_manifest_observation_events (
  observation_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id in ('yw','icamp')),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  deployment_id text not null check (char_length(deployment_id) between 8 and 160),
  deployment_url text not null check (
    deployment_url ~ '^https://[^[:space:]]{1,500}$'
  ),
  deployment_git_revision text not null check (deployment_git_revision ~ '^[a-f0-9]{40}$'),
  observed_manifest_revision text not null check (observed_manifest_revision ~ '^[a-f0-9]{40}$'),
  observed_source_id text not null check (observed_source_id in ('yw','icamp')),
  observed_source_role text not null check (observed_source_role in ('platform_shell','business_shell')),
  tenant_boundary text not null check (tenant_boundary='platform_shell'),
  signature_state text not null check (
    signature_state in ('AWAITING_INDEPENDENT_SOURCE_SIGNER','SIGNED')
  ),
  connection_state text not null check (
    connection_state in ('DISCONNECTED / HOLD','CONNECTED')
  ),
  observation_state text not null check (
    observation_state in ('VERIFIED_EXACT','HOLD_ROLE_MISMATCH','HOLD_MISMATCH','HOLD_UNVERIFIED')
  ),
  response_etag text,
  request_trace text,
  evidence_uri text not null check (
    evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
  ),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_deployed_manifest_observation_recent_idx
  on app.master_deployed_manifest_observation_events(source_id,recorded_at desc);

create table if not exists app.master_source_custody_correlation_events (
  correlation_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id in ('yw','icamp')),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  signer_key_id text,
  registry_event_id uuid references app.master_source_signer_registry_events(event_id) on delete restrict,
  enrollment_intake_id uuid,
  computed_spki_sha256 text check (
    computed_spki_sha256 is null or computed_spki_sha256 ~ '^sha256:[a-f0-9]{64}$'
  ),
  independent_pin_spki_sha256 text check (
    independent_pin_spki_sha256 is null or independent_pin_spki_sha256 ~ '^sha256:[a-f0-9]{64}$'
  ),
  custody_evidence_uri text,
  witness_evidence_uri text,
  custody_state text not null check (
    custody_state in (
      'VERIFIED_CORRELATED',
      'HOLD_UNENROLLED',
      'HOLD_CUSTODY_EVIDENCE',
      'HOLD_CUSTODY_MISMATCH',
      'HOLD_AMBIGUOUS'
    )
  ),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_source_custody_correlation_recent_idx
  on app.master_source_custody_correlation_events(source_id,recorded_at desc);

create table if not exists app.master_fresh_receipt_admission_closure_events (
  closure_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id in ('yw','icamp')),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  manifest_observation_id uuid references app.master_deployed_manifest_observation_events(observation_id) on delete restrict,
  custody_correlation_id uuid references app.master_source_custody_correlation_events(correlation_id) on delete restrict,
  receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  receipt_state text not null check (
    receipt_state in (
      'VERIFIED_CURRENT',
      'HOLD_NOT_RECEIVED',
      'HOLD_STALE',
      'HOLD_REVISION_MISMATCH',
      'HOLD_NOT_ADMITTED',
      'HOLD_SIGNER_CUSTODY'
    )
  ),
  closure_state text not null check (
    closure_state in ('VERIFIED_CURRENT','HOLD')
  ),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_fresh_receipt_admission_closure_recent_idx
  on app.master_fresh_receipt_admission_closure_events(source_id,recorded_at desc);

create table if not exists app.master_three_master_runtime_decision_rechecks (
  decision_recheck_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id in ('yw','icamp')),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  manifest_observation_id uuid references app.master_deployed_manifest_observation_events(observation_id) on delete restrict,
  custody_correlation_id uuid references app.master_source_custody_correlation_events(correlation_id) on delete restrict,
  receipt_closure_id uuid references app.master_fresh_receipt_admission_closure_events(closure_id) on delete restrict,
  controller_base_revision text not null check (controller_base_revision ~ '^[a-f0-9]{40}$'),
  ai_hub_ack text not null,
  ai_hub_main text not null check (ai_hub_main ~ '^[a-f0-9]{40}$'),
  comms_handoff text not null,
  comms_main text not null check (comms_main ~ '^[a-f0-9]{40}$'),
  master_gate_state text not null check (master_gate_state in ('OPEN','HOLD')),
  source_closure_state text not null check (source_closure_state in ('READY','HOLD')),
  decision_state text not null check (
    decision_state in ('READY_FOR_OWNER_DECISION','HOLD')
  ),
  blockers jsonb not null check (
    jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384
  ),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_three_master_runtime_decision_recent_idx
  on app.master_three_master_runtime_decision_rechecks(source_id,recorded_at desc);

alter table app.master_deployed_manifest_observation_events enable row level security;
alter table app.master_deployed_manifest_observation_events force row level security;
alter table app.master_source_custody_correlation_events enable row level security;
alter table app.master_source_custody_correlation_events force row level security;
alter table app.master_fresh_receipt_admission_closure_events enable row level security;
alter table app.master_fresh_receipt_admission_closure_events force row level security;
alter table app.master_three_master_runtime_decision_rechecks enable row level security;
alter table app.master_three_master_runtime_decision_rechecks force row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'master_deployed_manifest_observation_events',
    'master_source_custody_correlation_events',
    'master_fresh_receipt_admission_closure_events',
    'master_three_master_runtime_decision_rechecks'
  ] loop
    execute format('drop policy if exists %I_select on app.%I',t,t);
    execute format(
      'create policy %I_select on app.%I for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting(''app.user_id'',true),'''') and wm.role in (''owner'',''admin'')))',
      t,t
    );
    execute format('drop policy if exists %I_insert on app.%I',t,t);
    execute format(
      'create policy %I_insert on app.%I for insert to ai_data_runtime with check (actor_user_id=nullif(current_setting(''app.user_id'',true),'''') and exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting(''app.user_id'',true),'''') and wm.role=''owner''))',
      t,t
    );
  end loop;
end $$;

revoke all on
  app.master_deployed_manifest_observation_events,
  app.master_source_custody_correlation_events,
  app.master_fresh_receipt_admission_closure_events,
  app.master_three_master_runtime_decision_rechecks
from public, ai_data_runtime;

grant select,insert on
  app.master_deployed_manifest_observation_events,
  app.master_source_custody_correlation_events,
  app.master_fresh_receipt_admission_closure_events,
  app.master_three_master_runtime_decision_rechecks
to ai_data_runtime;

revoke update,delete on
  app.master_deployed_manifest_observation_events,
  app.master_source_custody_correlation_events,
  app.master_fresh_receipt_admission_closure_events,
  app.master_three_master_runtime_decision_rechecks
from ai_data_runtime;
