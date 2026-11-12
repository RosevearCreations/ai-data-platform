-- Build 379 — YW562 Protected Runtime Evidence Admission,
-- Exact Receipt/Owner Continuity, QL-422 Protected Correlation Closure &
-- Supervised Activation Decision Execution.
-- The protected role is server-only and has no browser/user identity.

grant usage on schema app to ai_data_protected_runtime;

create table if not exists app.master_build379_protected_runtime_admission_events (
  admission_event_id uuid primary key,
  authority_key_id text not null check (char_length(authority_key_id) between 1 and 160),
  authority_key_spki_sha256 text not null check (authority_key_spki_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  envelope_sha256 text not null check (envelope_sha256 ~ '^[a-f0-9]{64}$'),
  signature_sha256 text not null check (signature_sha256 ~ '^[a-f0-9]{64}$'),
  nonce text not null check (char_length(nonce) between 16 and 160),
  controller_revision text not null check (controller_revision ~ '^[a-f0-9]{40}$'),
  source_revision text not null check (source_revision ~ '^[a-f0-9]{40}$'),
  ai_hub_main text not null check (ai_hub_main ~ '^[a-f0-9]{40}$'),
  comms_main text not null check (comms_main ~ '^[a-f0-9]{40}$'),
  original_host_id text not null check (char_length(original_host_id) between 1 and 128),
  prerequisite_evidence_id uuid not null references app.master_yw562_runtime_prerequisite_evidence_intakes(evidence_id) on delete restrict,
  fresh_receipt_admission_event_id uuid not null references app.master_yw562_fresh_source_receipt_admission_events(admission_event_id) on delete restrict,
  exact_receipt_id uuid not null references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  owner_decision_id uuid not null references app.master_owner_decision_audit(decision_id) on delete restrict,
  ql422_correlation_event_id uuid not null references app.master_ql422_original_host_three_master_correlation_events(correlation_event_id) on delete restrict,
  evidence_uri text not null check (char_length(evidence_uri) between 1 and 512),
  observed_at timestamptz not null,
  admission_state text not null check (admission_state='VERIFIED_ADMITTED'),
  recorded_at timestamptz not null default now()
);

create unique index if not exists master_build379_protected_runtime_nonce_unique_idx
  on app.master_build379_protected_runtime_admission_events(nonce);
create index if not exists master_build379_protected_runtime_recent_idx
  on app.master_build379_protected_runtime_admission_events(recorded_at desc);

create table if not exists app.master_build379_supervised_activation_decision_events (
  decision_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  protected_admission_event_id uuid not null references app.master_build379_protected_runtime_admission_events(admission_event_id) on delete restrict,
  exact_receipt_id uuid not null references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  owner_decision_id uuid not null references app.master_owner_decision_audit(decision_id) on delete restrict,
  decision text not null check (decision in ('APPROVE_ACTIVATION','REJECT_ACTIVATION')),
  owner_attested boolean not null check (owner_attested=true),
  owner_note text not null check (char_length(btrim(owner_note)) between 15 and 500),
  decision_state text not null check (
    decision_state in (
      'ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME',
      'REJECTED_HOLD'
    )
  ),
  decided_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique(protected_admission_event_id)
);

create index if not exists master_build379_supervised_activation_decision_recent_idx
  on app.master_build379_supervised_activation_decision_events(recorded_at desc);

create table if not exists app.master_build379_activation_decision_execution_events (
  execution_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  decision_event_id uuid not null unique references app.master_build379_supervised_activation_decision_events(decision_event_id) on delete restrict,
  protected_admission_event_id uuid not null references app.master_build379_protected_runtime_admission_events(admission_event_id) on delete restrict,
  exact_receipt_id uuid not null references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  execution_state text not null check (
    execution_state in (
      'SUPERVISED_ACTIVATION_AUTHORIZED_NOT_RUNTIME_EXECUTED',
      'SUPERVISED_ACTIVATION_REJECTED_HOLD'
    )
  ),
  receiver_state text not null check (receiver_state='OFF'),
  connection_state text not null check (connection_state='DISCONNECTED_HOLD'),
  masters_synced boolean not null check (masters_synced=false),
  executed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_build379_activation_decision_execution_recent_idx
  on app.master_build379_activation_decision_execution_events(recorded_at desc);

alter table app.master_build379_protected_runtime_admission_events enable row level security;
alter table app.master_build379_protected_runtime_admission_events force row level security;
alter table app.master_build379_supervised_activation_decision_events enable row level security;
alter table app.master_build379_supervised_activation_decision_events force row level security;
alter table app.master_build379_activation_decision_execution_events enable row level security;
alter table app.master_build379_activation_decision_execution_events force row level security;

drop policy if exists master_ql422_original_host_three_master_correlation_events_protected_insert
  on app.master_ql422_original_host_three_master_correlation_events;
create policy master_ql422_original_host_three_master_correlation_events_protected_insert
  on app.master_ql422_original_host_three_master_correlation_events
  for insert to ai_data_protected_runtime
  with check (
    evidence_authority='protected-runtime'
    and actor_user_id is null
    and correlation_state='VERIFIED_CORRELATED'
  );

drop policy if exists master_ql422_original_host_three_master_correlation_events_protected_select
  on app.master_ql422_original_host_three_master_correlation_events;
create policy master_ql422_original_host_three_master_correlation_events_protected_select
  on app.master_ql422_original_host_three_master_correlation_events
  for select to ai_data_protected_runtime
  using (true);

drop policy if exists master_build379_protected_runtime_admission_events_select
  on app.master_build379_protected_runtime_admission_events;
create policy master_build379_protected_runtime_admission_events_select
  on app.master_build379_protected_runtime_admission_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build379_protected_runtime_admission_events_protected_select
  on app.master_build379_protected_runtime_admission_events;
create policy master_build379_protected_runtime_admission_events_protected_select
  on app.master_build379_protected_runtime_admission_events
  for select to ai_data_protected_runtime using (true);

drop policy if exists master_build379_protected_runtime_admission_events_protected_insert
  on app.master_build379_protected_runtime_admission_events;
create policy master_build379_protected_runtime_admission_events_protected_insert
  on app.master_build379_protected_runtime_admission_events
  for insert to ai_data_protected_runtime
  with check (
    admission_state='VERIFIED_ADMITTED'
  );

drop policy if exists master_build379_supervised_activation_decision_events_select
  on app.master_build379_supervised_activation_decision_events;
create policy master_build379_supervised_activation_decision_events_select
  on app.master_build379_supervised_activation_decision_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build379_supervised_activation_decision_events_insert
  on app.master_build379_supervised_activation_decision_events;
create policy master_build379_supervised_activation_decision_events_insert
  on app.master_build379_supervised_activation_decision_events
  for insert to ai_data_runtime with check (
    actor_user_id=nullif(current_setting('app.user_id',true),'')
    and exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role='owner'
    )
  );

drop policy if exists master_build379_activation_decision_execution_events_select
  on app.master_build379_activation_decision_execution_events;
create policy master_build379_activation_decision_execution_events_select
  on app.master_build379_activation_decision_execution_events
  for select to ai_data_runtime using (
    exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role in ('owner','admin')
    )
  );

drop policy if exists master_build379_activation_decision_execution_events_insert
  on app.master_build379_activation_decision_execution_events;
create policy master_build379_activation_decision_execution_events_insert
  on app.master_build379_activation_decision_execution_events
  for insert to ai_data_runtime with check (
    actor_user_id=nullif(current_setting('app.user_id',true),'')
    and exists (
      select 1 from app.workspace_members wm
      where wm.user_id=nullif(current_setting('app.user_id',true),'')
        and wm.role='owner'
    )
  );

do $
declare t text;
begin
  foreach t in array array[
    'master_source_signer_registry_events',
    'master_convergence_receipt_ledger',
    'master_source_health_admission_events',
    'master_owner_decision_audit',
    'master_yw561_replay_correlation_events',
    'master_yw562_runtime_prerequisite_evidence_intakes',
    'master_yw562_fresh_source_receipt_admission_events',
    'master_build378_protected_activation_readiness_events'
  ] loop
    execute format('drop policy if exists %I_build379_protected_select on app.%I',t,t);
    execute format(
      'create policy %I_build379_protected_select on app.%I for select to ai_data_protected_runtime using (true)',
      t,t
    );
  end loop;
end $;

grant select on
  app.master_source_signer_registry_events,
  app.master_convergence_receipt_ledger,
  app.master_source_health_admission_events,
  app.master_owner_decision_audit,
  app.master_yw561_replay_correlation_events,
  app.master_yw562_runtime_prerequisite_evidence_intakes,
  app.master_yw562_fresh_source_receipt_admission_events,
  app.master_build378_protected_activation_readiness_events
to ai_data_protected_runtime;

grant select,insert on app.master_ql422_original_host_three_master_correlation_events
to ai_data_protected_runtime;

grant select,insert on app.master_build379_protected_runtime_admission_events
to ai_data_protected_runtime;

grant select on app.master_build379_protected_runtime_admission_events
to ai_data_runtime;

grant select,insert on
  app.master_build379_supervised_activation_decision_events,
  app.master_build379_activation_decision_execution_events
to ai_data_runtime;

revoke insert,update,delete on app.master_build379_protected_runtime_admission_events
from ai_data_runtime;

revoke update,delete on
  app.master_build379_protected_runtime_admission_events
from ai_data_protected_runtime;

revoke update,delete on
  app.master_build379_supervised_activation_decision_events,
  app.master_build379_activation_decision_execution_events
from ai_data_runtime;
