-- Build 410 — sensitive data classification, encryption/redaction/retention/DLP
-- assurance plus Rosevear Server Shell convergence contracts.

create table if not exists app.master_build410_data_classification_policies (
  policy_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  data_class text not null check (data_class in ('D0_PUBLIC','D1_INTERNAL','D2_PERSONAL','D3_CONFIDENTIAL','D4_SECRET')),
  tls_required boolean not null check (tls_required),
  at_rest_encryption_required boolean not null,
  field_level_encryption_required boolean not null,
  log_redaction_required boolean not null,
  raw_value_allowed_in_logs boolean not null default false,
  raw_value_allowed_in_cross_app_messages boolean not null default false,
  raw_value_allowed_in_audit_evidence boolean not null default false,
  external_export_requires_inspection boolean not null check (external_export_requires_inspection),
  restricted_export_requires_owner_gate boolean not null,
  retention_purpose_bound boolean not null check (retention_purpose_bound),
  deletion_evidence_required boolean not null check (deletion_evidence_required),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  policy_state text not null check (policy_state in ('CERTIFIED','HOLD','FAILED')),
  evidence_uri text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique(app_id,data_class,observed_at)
);

create table if not exists app.master_build410_encryption_profiles (
  profile_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  transport_tls_verified boolean not null check (transport_tls_verified),
  sensitive_at_rest_encryption_verified boolean not null check (sensitive_at_rest_encryption_verified),
  secret_field_encryption_verified boolean not null check (secret_field_encryption_verified),
  key_material_outside_source_control boolean not null check (key_material_outside_source_control),
  raw_private_keys_in_evidence boolean not null default false check (raw_private_keys_in_evidence=false),
  key_rotation_supported boolean not null check (key_rotation_supported),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  profile_state text not null check (profile_state in ('VERIFIED','HOLD','FAILED')),
  evidence_uri text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique(app_id,observed_at)
);

create table if not exists app.master_build410_redaction_retention_dlp_assurance (
  assurance_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  structured_log_redaction_verified boolean not null check (structured_log_redaction_verified),
  token_password_key_pattern_redaction_verified boolean not null check (token_password_key_pattern_redaction_verified),
  personal_data_audit_minimization_verified boolean not null check (personal_data_audit_minimization_verified),
  purpose_bound_retention_verified boolean not null check (purpose_bound_retention_verified),
  expiry_deletion_workflow_verified boolean not null check (expiry_deletion_workflow_verified),
  deletion_evidence_preserved boolean not null check (deletion_evidence_preserved),
  export_dlp_inspection_verified boolean not null check (export_dlp_inspection_verified),
  restricted_export_owner_gate_verified boolean not null check (restricted_export_owner_gate_verified),
  raw_secret_exfiltration_blocked boolean not null check (raw_secret_exfiltration_blocked),
  cross_tenant_export_blocked boolean not null check (cross_tenant_export_blocked),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  assurance_state text not null check (assurance_state in ('ASSURED','HOLD','FAILED')),
  evidence_uri text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique(app_id,observed_at)
);

create table if not exists app.master_build410_server_shell_modules (
  module_id text primary key check (module_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub')),
  display_name text not null,
  module_role text not null,
  outer_shell_id text not null check (outer_shell_id='rosevear-server-shell'),
  independently_disableable boolean not null check (independently_disableable),
  owner_switch_required boolean not null check (owner_switch_required),
  disabled_state_fails_closed boolean not null check (disabled_state_fails_closed),
  shell_remains_available_when_disabled boolean not null check (shell_remains_available_when_disabled),
  primary_automation_host_role text not null check (primary_automation_host_role='rosevear-ai-hub-windows-server'),
  cloud_ui_may_remain_independent boolean not null check (cloud_ui_may_remain_independent),
  theme_profile_selectable boolean not null check (theme_profile_selectable),
  background_image_slot_selectable boolean not null check (background_image_slot_selectable),
  authority_preserved boolean not null check (authority_preserved),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  module_state text not null check (module_state in ('REGISTERED','HOLD','FAILED')),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create table if not exists app.master_build410_slave_monitoring_profiles (
  profile_id uuid primary key,
  shell_id text not null check (shell_id in ('yw','icamp')),
  read_only_by_default boolean not null check (read_only_by_default),
  deployment_status_visible boolean not null check (deployment_status_visible),
  runtime_health_visible boolean not null check (runtime_health_visible),
  source_revision_visible boolean not null check (source_revision_visible),
  signer_receiver_status_visible boolean not null check (signer_receiver_status_visible),
  queue_dead_letter_status_visible boolean not null check (queue_dead_letter_status_visible),
  latency_error_status_visible boolean not null check (latency_error_status_visible),
  migration_status_visible boolean not null check (migration_status_visible),
  security_holds_visible boolean not null check (security_holds_visible),
  vercel_quota_visible boolean not null check (vercel_quota_visible),
  unknown_state_fails_closed boolean not null check (unknown_state_fails_closed),
  monitoring_may_grant_slave_authority boolean not null default false check (monitoring_may_grant_slave_authority=false),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  profile_state text not null check (profile_state in ('REGISTERED','HOLD','FAILED')),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique(shell_id,observed_at)
);

create table if not exists app.master_build410_theme_profiles (
  profile_id text primary key check (profile_id in ('night-ops','copper-workshop','meadow-grid')),
  display_name text not null,
  colors_selectable boolean not null check (colors_selectable),
  background_image_slot_selectable boolean not null check (background_image_slot_selectable),
  semantic_security_colors_immutable boolean not null check (semantic_security_colors_immutable),
  status_meaning_immutable boolean not null check (status_meaning_immutable),
  theme_may_hide_security_state boolean not null default false check (theme_may_hide_security_state=false),
  applies_per_module boolean not null check (applies_per_module),
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  profile_state text not null check (profile_state in ('CERTIFIED','HOLD','FAILED')),
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_b410_class_recent_idx on app.master_build410_data_classification_policies(recorded_at desc);
create index if not exists master_b410_encryption_recent_idx on app.master_build410_encryption_profiles(recorded_at desc);
create index if not exists master_b410_dlp_recent_idx on app.master_build410_redaction_retention_dlp_assurance(recorded_at desc);
create index if not exists master_b410_modules_recent_idx on app.master_build410_server_shell_modules(recorded_at desc);
create index if not exists master_b410_slave_recent_idx on app.master_build410_slave_monitoring_profiles(recorded_at desc);
create index if not exists master_b410_theme_recent_idx on app.master_build410_theme_profiles(recorded_at desc);

alter table app.master_build410_data_classification_policies enable row level security;
alter table app.master_build410_data_classification_policies force row level security;
alter table app.master_build410_encryption_profiles enable row level security;
alter table app.master_build410_encryption_profiles force row level security;
alter table app.master_build410_redaction_retention_dlp_assurance enable row level security;
alter table app.master_build410_redaction_retention_dlp_assurance force row level security;
alter table app.master_build410_server_shell_modules enable row level security;
alter table app.master_build410_server_shell_modules force row level security;
alter table app.master_build410_slave_monitoring_profiles enable row level security;
alter table app.master_build410_slave_monitoring_profiles force row level security;
alter table app.master_build410_theme_profiles enable row level security;
alter table app.master_build410_theme_profiles force row level security;

create policy master_b410_class_runtime_select on app.master_build410_data_classification_policies for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b410_encryption_runtime_select on app.master_build410_encryption_profiles for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b410_dlp_runtime_select on app.master_build410_redaction_retention_dlp_assurance for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b410_modules_runtime_select on app.master_build410_server_shell_modules for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b410_slave_runtime_select on app.master_build410_slave_monitoring_profiles for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));
create policy master_b410_theme_runtime_select on app.master_build410_theme_profiles for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting('app.user_id',true),'') and wm.role in ('owner','admin')));

create policy master_b410_class_protected_select on app.master_build410_data_classification_policies for select to ai_data_protected_runtime using (true);
create policy master_b410_encryption_protected_select on app.master_build410_encryption_profiles for select to ai_data_protected_runtime using (true);
create policy master_b410_dlp_protected_select on app.master_build410_redaction_retention_dlp_assurance for select to ai_data_protected_runtime using (true);
create policy master_b410_modules_protected_select on app.master_build410_server_shell_modules for select to ai_data_protected_runtime using (true);
create policy master_b410_slave_protected_select on app.master_build410_slave_monitoring_profiles for select to ai_data_protected_runtime using (true);
create policy master_b410_theme_protected_select on app.master_build410_theme_profiles for select to ai_data_protected_runtime using (true);

create policy master_b410_class_protected_insert on app.master_build410_data_classification_policies for insert to ai_data_protected_runtime with check (true);
create policy master_b410_encryption_protected_insert on app.master_build410_encryption_profiles for insert to ai_data_protected_runtime with check (true);
create policy master_b410_dlp_protected_insert on app.master_build410_redaction_retention_dlp_assurance for insert to ai_data_protected_runtime with check (true);
create policy master_b410_modules_protected_insert on app.master_build410_server_shell_modules for insert to ai_data_protected_runtime with check (true);
create policy master_b410_slave_protected_insert on app.master_build410_slave_monitoring_profiles for insert to ai_data_protected_runtime with check (true);
create policy master_b410_theme_protected_insert on app.master_build410_theme_profiles for insert to ai_data_protected_runtime with check (true);

grant select on app.master_build410_data_classification_policies,app.master_build410_encryption_profiles,app.master_build410_redaction_retention_dlp_assurance,app.master_build410_server_shell_modules,app.master_build410_slave_monitoring_profiles,app.master_build410_theme_profiles to ai_data_runtime;
grant select,insert on app.master_build410_data_classification_policies,app.master_build410_encryption_profiles,app.master_build410_redaction_retention_dlp_assurance,app.master_build410_server_shell_modules,app.master_build410_slave_monitoring_profiles,app.master_build410_theme_profiles to ai_data_protected_runtime;
revoke insert,update,delete on app.master_build410_data_classification_policies,app.master_build410_encryption_profiles,app.master_build410_redaction_retention_dlp_assurance,app.master_build410_server_shell_modules,app.master_build410_slave_monitoring_profiles,app.master_build410_theme_profiles from ai_data_runtime;
revoke update,delete on app.master_build410_data_classification_policies,app.master_build410_encryption_profiles,app.master_build410_redaction_retention_dlp_assurance,app.master_build410_server_shell_modules,app.master_build410_slave_monitoring_profiles,app.master_build410_theme_profiles from ai_data_protected_runtime;
