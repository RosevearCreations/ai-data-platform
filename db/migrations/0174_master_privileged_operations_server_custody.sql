create table if not exists app.master_build411_privileged_operation_profiles (
  profile_id text primary key,
  app_id text not null,
  owner_gate_required boolean not null,
  ordinary_operator_may_self_authorize boolean not null,
  requester_approver_separated boolean not null,
  dual_control_supported boolean not null,
  raw_secrets_allowed_in_audit boolean not null,
  immutable_receipt_required boolean not null,
  privilege_expiry_required boolean not null,
  least_privilege_required boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  state text not null check (state in ('CERTIFIED','HOLD','FAILED')),
  observed_at timestamptz not null,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object')
);

create table if not exists app.master_build411_break_glass_policies (
  policy_id text primary key,
  app_id text not null,
  normal_path_replacement boolean not null,
  owner_approval_required boolean not null,
  two_distinct_custodians_required boolean not null,
  maximum_minutes integer not null check (maximum_minutes between 1 and 30),
  single_use_required boolean not null,
  expiry_required boolean not null,
  authority_transfer_allowed boolean not null,
  raw_secret_evidence_allowed boolean not null,
  state text not null check (state in ('CERTIFIED','HOLD','FAILED')),
  observed_at timestamptz not null
);

create table if not exists app.master_build411_custodian_receipts (
  receipt_id text primary key,
  custodian_user_id text not null references auth."user"(id) on delete restrict,
  scope text not null check (char_length(scope) between 1 and 200),
  evidence_digest text not null check (evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  state text not null check (state in ('VERIFIED','REVOKED','EXPIRED','FAILED')),
  check (expires_at > issued_at),
  check (expires_at <= issued_at + interval '30 minutes')
);

create table if not exists app.master_build411_module_control_policies (
  policy_id text primary key,
  module_id text not null check (
    module_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub')
  ),
  disable_owner_gate_required boolean not null,
  enable_owner_gate_required boolean not null,
  enable_independent_custodian_required boolean not null,
  restart_owner_gate_required boolean not null,
  restart_independent_custodian_required boolean not null,
  disabled_state_fails_closed boolean not null,
  shell_remains_available_when_module_disabled boolean not null,
  implicit_cross_module_activation_allowed boolean not null,
  module_switch_may_transfer_authority boolean not null,
  exact_state_receipt_required boolean not null,
  immutable_audit_receipt_required boolean not null,
  state text not null check (state in ('CERTIFIED','HOLD','FAILED')),
  observed_at timestamptz not null
);

create table if not exists app.master_build411_module_control_intents (
  intent_id uuid primary key,
  module_id text not null check (
    module_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub')
  ),
  action text not null check (action in ('ENABLE','DISABLE','RESTART')),
  requester_user_id text not null references auth."user"(id) on delete restrict,
  reason_digest text not null check (reason_digest ~ '^sha256:[a-f0-9]{64}$'),
  owner_approval_receipt_id uuid not null,
  independent_custodian_receipt_id text references app.master_build411_custodian_receipts(receipt_id) on delete restrict,
  desired_state text not null check (desired_state in ('ENABLED','DISABLED')),
  control_state text not null check (control_state in ('QUEUED','HELD','REJECTED')),
  requested_at timestamptz not null default now(),
  check (
    action='DISABLE'
    or independent_custodian_receipt_id is not null
  )
);

create table if not exists app.master_build411_module_action_receipts (
  receipt_id uuid primary key,
  intent_id uuid not null references app.master_build411_module_control_intents(intent_id) on delete restrict,
  module_id text not null check (
    module_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub')
  ),
  action text not null check (action in ('ENABLE','DISABLE','RESTART')),
  before_state text not null check (before_state in ('ENABLED','DISABLED','UNKNOWN')),
  after_state text not null check (after_state in ('ENABLED','DISABLED','UNKNOWN')),
  host_role text not null check (host_role='rosevear-ai-hub-windows-server'),
  host_receipt_id text not null check (char_length(host_receipt_id) between 8 and 240),
  action_digest text not null check (action_digest ~ '^sha256:[a-f0-9]{64}$'),
  physical_action_completed boolean not null,
  completed_at timestamptz not null,
  state text not null check (state in ('VERIFIED','HOLD','FAILED'))
);

create table if not exists app.master_build411_windows_service_custody (
  custody_id text primary key,
  service_id text not null check (
    service_id in (
      'rosevear-ai-hub-automation-host',
      'rosevear-ai-data-platform-worker',
      'rosevear-comms-hub-worker'
    )
  ),
  module_id text not null check (
    module_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub')
  ),
  host_role text not null check (host_role='rosevear-ai-hub-windows-server'),
  least_privilege_service_account_required boolean not null,
  os_secret_store_required boolean not null,
  raw_credential_in_source_allowed boolean not null,
  automatic_start_may_be_enrolled boolean not null,
  restart_requires_approved_intent boolean not null,
  public_inbound_required boolean not null,
  physical_activation_requires_host_receipt boolean not null,
  cloud_green_may_claim_physical_activation boolean not null,
  state text not null check (state in ('ENROLLED','HOLD','FAILED')),
  observed_at timestamptz not null
);

create table if not exists app.master_build411_audit_ceremonies (
  ceremony_id uuid primary key,
  module_id text not null check (
    module_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub')
  ),
  intent_id uuid references app.master_build411_module_control_intents(intent_id) on delete restrict,
  owner_receipt_id text not null check (char_length(owner_receipt_id) between 8 and 240),
  custodian_receipt_id text references app.master_build411_custodian_receipts(receipt_id) on delete restrict,
  action_digest text not null check (action_digest ~ '^sha256:[a-f0-9]{64}$'),
  before_state text not null check (before_state in ('ENABLED','DISABLED','UNKNOWN')),
  after_state text not null check (after_state in ('ENABLED','DISABLED','UNKNOWN')),
  actor_user_id text not null references auth."user"(id) on delete restrict,
  raw_secret_evidence_present boolean not null default false,
  expiry_checked_before_execution boolean not null,
  host_receipt_id text,
  state text not null check (state in ('CERTIFIED','HOLD','FAILED')),
  recorded_at timestamptz not null default now()
);

alter table app.master_build411_privileged_operation_profiles enable row level security;
alter table app.master_build411_privileged_operation_profiles force row level security;
alter table app.master_build411_break_glass_policies enable row level security;
alter table app.master_build411_break_glass_policies force row level security;
alter table app.master_build411_custodian_receipts enable row level security;
alter table app.master_build411_custodian_receipts force row level security;
alter table app.master_build411_module_control_policies enable row level security;
alter table app.master_build411_module_control_policies force row level security;
alter table app.master_build411_module_control_intents enable row level security;
alter table app.master_build411_module_control_intents force row level security;
alter table app.master_build411_module_action_receipts enable row level security;
alter table app.master_build411_module_action_receipts force row level security;
alter table app.master_build411_windows_service_custody enable row level security;
alter table app.master_build411_windows_service_custody force row level security;
alter table app.master_build411_audit_ceremonies enable row level security;
alter table app.master_build411_audit_ceremonies force row level security;

create policy master_b411_profile_runtime_select on app.master_build411_privileged_operation_profiles
for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b411_break_runtime_select on app.master_build411_break_glass_policies
for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b411_custodian_runtime_select on app.master_build411_custodian_receipts
for select to ai_data_runtime using (app.current_master_sysop_role()='owner');
create policy master_b411_policy_runtime_select on app.master_build411_module_control_policies
for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b411_intent_runtime_select on app.master_build411_module_control_intents
for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b411_action_runtime_select on app.master_build411_module_action_receipts
for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b411_service_runtime_select on app.master_build411_windows_service_custody
for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b411_ceremony_runtime_select on app.master_build411_audit_ceremonies
for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));

create policy master_b411_intent_owner_insert on app.master_build411_module_control_intents
for insert to ai_data_runtime
with check (
  app.current_master_sysop_role()='owner'
  and requester_user_id=nullif(current_setting('app.user_id',true),'')
);

create policy master_b411_profile_protected_select on app.master_build411_privileged_operation_profiles for select to ai_data_protected_runtime using (true);
create policy master_b411_break_protected_select on app.master_build411_break_glass_policies for select to ai_data_protected_runtime using (true);
create policy master_b411_custodian_protected_select on app.master_build411_custodian_receipts for select to ai_data_protected_runtime using (true);
create policy master_b411_policy_protected_select on app.master_build411_module_control_policies for select to ai_data_protected_runtime using (true);
create policy master_b411_intent_protected_select on app.master_build411_module_control_intents for select to ai_data_protected_runtime using (true);
create policy master_b411_action_protected_select on app.master_build411_module_action_receipts for select to ai_data_protected_runtime using (true);
create policy master_b411_service_protected_select on app.master_build411_windows_service_custody for select to ai_data_protected_runtime using (true);
create policy master_b411_ceremony_protected_select on app.master_build411_audit_ceremonies for select to ai_data_protected_runtime using (true);

create policy master_b411_profile_protected_insert on app.master_build411_privileged_operation_profiles for insert to ai_data_protected_runtime with check (true);
create policy master_b411_break_protected_insert on app.master_build411_break_glass_policies for insert to ai_data_protected_runtime with check (true);
create policy master_b411_custodian_protected_insert on app.master_build411_custodian_receipts for insert to ai_data_protected_runtime with check (true);
create policy master_b411_policy_protected_insert on app.master_build411_module_control_policies for insert to ai_data_protected_runtime with check (true);
create policy master_b411_intent_protected_insert on app.master_build411_module_control_intents for insert to ai_data_protected_runtime with check (true);
create policy master_b411_action_protected_insert on app.master_build411_module_action_receipts for insert to ai_data_protected_runtime with check (true);
create policy master_b411_service_protected_insert on app.master_build411_windows_service_custody for insert to ai_data_protected_runtime with check (true);
create policy master_b411_ceremony_protected_insert on app.master_build411_audit_ceremonies for insert to ai_data_protected_runtime with check (true);

grant select on
  app.master_build411_privileged_operation_profiles,
  app.master_build411_break_glass_policies,
  app.master_build411_custodian_receipts,
  app.master_build411_module_control_policies,
  app.master_build411_module_control_intents,
  app.master_build411_module_action_receipts,
  app.master_build411_windows_service_custody,
  app.master_build411_audit_ceremonies
to ai_data_runtime;

grant insert on app.master_build411_module_control_intents to ai_data_runtime;

grant select,insert on
  app.master_build411_privileged_operation_profiles,
  app.master_build411_break_glass_policies,
  app.master_build411_custodian_receipts,
  app.master_build411_module_control_policies,
  app.master_build411_module_control_intents,
  app.master_build411_module_action_receipts,
  app.master_build411_windows_service_custody,
  app.master_build411_audit_ceremonies
to ai_data_protected_runtime;

revoke update,delete on
  app.master_build411_privileged_operation_profiles,
  app.master_build411_break_glass_policies,
  app.master_build411_custodian_receipts,
  app.master_build411_module_control_policies,
  app.master_build411_module_control_intents,
  app.master_build411_module_action_receipts,
  app.master_build411_windows_service_custody,
  app.master_build411_audit_ceremonies
from ai_data_runtime,ai_data_protected_runtime;

revoke insert on
  app.master_build411_privileged_operation_profiles,
  app.master_build411_break_glass_policies,
  app.master_build411_custodian_receipts,
  app.master_build411_module_control_policies,
  app.master_build411_module_action_receipts,
  app.master_build411_windows_service_custody,
  app.master_build411_audit_ceremonies
from ai_data_runtime;
