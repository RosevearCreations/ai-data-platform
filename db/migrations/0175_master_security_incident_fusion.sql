create table if not exists app.master_build412_telemetry_evidence (
  evidence_id text primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  dimension text not null check (dimension in ('DEPLOYMENT','RUNTIME','SOURCE','SIGNER','RECEIVER','QUEUE','DLQ','LATENCY','ERROR','MIGRATION','SECURITY','QUOTA')),
  state text not null check (state in ('HEALTHY','DEGRADED','FAILED','UNKNOWN')),
  evidence_digest text not null check (evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  source_owned boolean not null,
  raw_secret_present boolean not null default false,
  independently_verified boolean not null,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  check (expires_at > observed_at)
);

create table if not exists app.master_build412_incident_signals (
  signal_id text primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  correlation_id text not null check (char_length(correlation_id) between 8 and 200),
  severity text not null check (severity in ('INFO','WARNING','CRITICAL')),
  category text not null check (category in ('SECURITY','RUNTIME','DELIVERY','DATABASE','QUOTA','DEPENDENCY')),
  source_evidence_digest text not null check (source_evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  observed_at timestamptz not null,
  independently_verified boolean not null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details)='object')
);

create table if not exists app.master_build412_remediation_intents (
  intent_id uuid primary key,
  incident_correlation_id text not null check (char_length(incident_correlation_id) between 8 and 200),
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  action text not null check (action in ('CONTAIN','RECOVER','ROLLBACK','RESTART')),
  requester_user_id text not null references auth."user"(id) on delete restrict,
  reason_digest text not null check (reason_digest ~ '^sha256:[a-f0-9]{64}$'),
  owner_approval_receipt_id uuid not null,
  custodian_receipt_id text not null references app.master_build411_custodian_receipts(receipt_id) on delete restrict,
  state text not null check (state in ('QUEUED_FOR_SOURCE','HELD','REJECTED')),
  requested_at timestamptz not null default now()
);

create table if not exists app.master_build412_remediation_receipts (
  receipt_id uuid primary key,
  intent_id uuid not null references app.master_build412_remediation_intents(intent_id) on delete restrict,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  action text not null check (action in ('CONTAIN','RECOVER','ROLLBACK','RESTART')),
  source_authority text not null check (char_length(source_authority) between 3 and 200),
  owner_approval_receipt_id uuid not null,
  custodian_receipt_id text not null references app.master_build411_custodian_receipts(receipt_id) on delete restrict,
  before_state text not null,
  after_state text not null,
  action_digest text not null check (action_digest ~ '^sha256:[a-f0-9]{64}$'),
  post_action_telemetry_digest text not null check (post_action_telemetry_digest ~ '^sha256:[a-f0-9]{64}$'),
  source_execution_verified boolean not null,
  authority_transfer_occurred boolean not null default false,
  executed_at timestamptz not null,
  state text not null check (state in ('VERIFIED','HOLD','FAILED'))
);

create table if not exists app.master_build412_incident_fusion_receipts (
  fusion_receipt_id uuid primary key,
  correlation_id text not null check (char_length(correlation_id) between 8 and 200),
  app_ids text[] not null,
  signal_count integer not null check (signal_count > 0),
  fusion_digest text not null check (fusion_digest ~ '^sha256:[a-f0-9]{64}$'),
  local_authority_preserved boolean not null,
  comms_authority_preserved boolean not null,
  raw_secret_present boolean not null default false,
  observed_at timestamptz not null
);

alter table app.master_build412_telemetry_evidence enable row level security;
alter table app.master_build412_telemetry_evidence force row level security;
alter table app.master_build412_incident_signals enable row level security;
alter table app.master_build412_incident_signals force row level security;
alter table app.master_build412_remediation_intents enable row level security;
alter table app.master_build412_remediation_intents force row level security;
alter table app.master_build412_remediation_receipts enable row level security;
alter table app.master_build412_remediation_receipts force row level security;
alter table app.master_build412_incident_fusion_receipts enable row level security;
alter table app.master_build412_incident_fusion_receipts force row level security;

create policy master_b412_telemetry_runtime_select on app.master_build412_telemetry_evidence
for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b412_signal_runtime_select on app.master_build412_incident_signals
for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b412_intent_runtime_select on app.master_build412_remediation_intents
for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b412_receipt_runtime_select on app.master_build412_remediation_receipts
for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b412_fusion_runtime_select on app.master_build412_incident_fusion_receipts
for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));

create policy master_b412_intent_owner_insert on app.master_build412_remediation_intents
for insert to ai_data_runtime
with check (
  app.current_master_sysop_role()='owner'
  and requester_user_id=nullif(current_setting('app.user_id',true),'')
);

create policy master_b412_telemetry_protected_select on app.master_build412_telemetry_evidence for select to ai_data_protected_runtime using (true);
create policy master_b412_signal_protected_select on app.master_build412_incident_signals for select to ai_data_protected_runtime using (true);
create policy master_b412_intent_protected_select on app.master_build412_remediation_intents for select to ai_data_protected_runtime using (true);
create policy master_b412_receipt_protected_select on app.master_build412_remediation_receipts for select to ai_data_protected_runtime using (true);
create policy master_b412_fusion_protected_select on app.master_build412_incident_fusion_receipts for select to ai_data_protected_runtime using (true);

create policy master_b412_telemetry_protected_insert on app.master_build412_telemetry_evidence for insert to ai_data_protected_runtime with check (raw_secret_present=false);
create policy master_b412_signal_protected_insert on app.master_build412_incident_signals for insert to ai_data_protected_runtime with check (true);
create policy master_b412_intent_protected_insert on app.master_build412_remediation_intents for insert to ai_data_protected_runtime with check (true);
create policy master_b412_receipt_protected_insert on app.master_build412_remediation_receipts for insert to ai_data_protected_runtime with check (authority_transfer_occurred=false);
create policy master_b412_fusion_protected_insert on app.master_build412_incident_fusion_receipts for insert to ai_data_protected_runtime with check (raw_secret_present=false and local_authority_preserved and comms_authority_preserved);

grant select on
  app.master_build412_telemetry_evidence,
  app.master_build412_incident_signals,
  app.master_build412_remediation_intents,
  app.master_build412_remediation_receipts,
  app.master_build412_incident_fusion_receipts
to ai_data_runtime;
grant insert on app.master_build412_remediation_intents to ai_data_runtime;

grant select,insert on
  app.master_build412_telemetry_evidence,
  app.master_build412_incident_signals,
  app.master_build412_remediation_intents,
  app.master_build412_remediation_receipts,
  app.master_build412_incident_fusion_receipts
to ai_data_protected_runtime;

revoke update,delete on
  app.master_build412_telemetry_evidence,
  app.master_build412_incident_signals,
  app.master_build412_remediation_intents,
  app.master_build412_remediation_receipts,
  app.master_build412_incident_fusion_receipts
from ai_data_runtime,ai_data_protected_runtime;

revoke insert on
  app.master_build412_telemetry_evidence,
  app.master_build412_incident_signals,
  app.master_build412_remediation_receipts,
  app.master_build412_incident_fusion_receipts
from ai_data_runtime;
