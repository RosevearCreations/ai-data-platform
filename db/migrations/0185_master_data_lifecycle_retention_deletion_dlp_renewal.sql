-- Build 422 — data lifecycle, retention, deletion and DLP renewal assurance.
create table if not exists app.master_build422_data_lifecycle_renewals (
 evidence_id text primary key,app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
 dimension text not null check (dimension in ('DATA_CLASSIFICATION','ENCRYPTION_SECRET_CUSTODY','REDACTION_MINIMIZATION','RETENTION_EXPIRY','DELETION_EVIDENCE','EXPORT_DLP','CROSS_TENANT_EXFILTRATION')),
 state text not null check (state in ('PASS','PARTIAL','FAILED')),
 classification_inventory_current boolean not null default false,all_five_data_classes_covered boolean not null default false,unknown_data_fails_closed boolean not null default false,
 transport_encryption_verified boolean not null default false,sensitive_at_rest_encryption_verified boolean not null default false,secret_field_protection_verified boolean not null default false,key_material_outside_source_control boolean not null default false,
 structured_log_redaction_verified boolean not null default false,credential_pattern_redaction_verified boolean not null default false,audit_minimization_verified boolean not null default false,raw_secret_material_absent boolean not null default false,
 purpose_bound_retention_verified boolean not null default false,retention_schedule_current boolean not null default false,expiry_enforced boolean not null default false,expired_data_requires_hold_or_deletion boolean not null default false,
 deletion_workflow_verified boolean not null default false,deletion_receipt_required boolean not null default false,deletion_evidence_immutable boolean not null default false,legal_hold_preserved boolean not null default false,
 export_inspection_verified boolean not null default false,restricted_export_owner_gate_verified boolean not null default false,classification_preserved_on_export boolean not null default false,raw_secret_exfiltration_blocked boolean not null default false,
 cross_tenant_export_blocked boolean not null default false,tenant_context_verified boolean not null default false,workspace_boundary_preserved boolean not null default false,destination_policy_compatible boolean not null default false,
 evidence_digest text not null check (evidence_digest ~ '^sha256:[a-f0-9]{64}$'),source_owned boolean not null,synthetic_evidence boolean not null default false check (synthetic_evidence=false),
 owner_reviewed boolean not null,independently_verified boolean not null,observed_at timestamptz not null,expires_at timestamptz not null,evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
 recorded_at timestamptz not null default now(),check (expires_at>observed_at),unique(app_id,dimension,observed_at)
);
create table if not exists app.master_build422_directional_dlp_renewals (
 receipt_id text primary key,source_app_id text not null check (source_app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
 target_app_id text not null check (target_app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
 data_class text not null check (data_class in ('D0_PUBLIC','D1_INTERNAL','D2_PERSONAL','D3_CONFIDENTIAL','D4_SECRET')),state text not null check (state in ('RENEWED','HOLD','BLOCKED')),
 exact_source_target_bound boolean not null default false,classification_current boolean not null default false,transport_encrypted boolean not null default false,payload_minimized boolean not null default false,redaction_applied boolean not null default false,
 consent_required boolean not null default false,consent_valid boolean not null default false,retention_boundary_preserved boolean not null default false,export_inspected boolean not null default false,restricted_owner_gate boolean not null default false,
 secret_reference_only boolean not null default false,cross_tenant_export_denied boolean not null default false,destination_policy_compatible boolean not null default false,
 evidence_digest text not null check (evidence_digest ~ '^sha256:[a-f0-9]{64}$'),source_owned boolean not null,synthetic_evidence boolean not null default false check (synthetic_evidence=false),
 owner_reviewed boolean not null,independently_verified boolean not null,observed_at timestamptz not null,expires_at timestamptz not null,evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
 recorded_at timestamptz not null default now(),check (source_app_id<>target_app_id),check (expires_at>observed_at),unique(source_app_id,target_app_id,observed_at)
);
create index if not exists master_b422_lifecycle_recent_idx on app.master_build422_data_lifecycle_renewals(app_id,dimension,observed_at desc);
create index if not exists master_b422_directional_recent_idx on app.master_build422_directional_dlp_renewals(source_app_id,target_app_id,observed_at desc);
alter table app.master_build422_data_lifecycle_renewals enable row level security;alter table app.master_build422_data_lifecycle_renewals force row level security;
alter table app.master_build422_directional_dlp_renewals enable row level security;alter table app.master_build422_directional_dlp_renewals force row level security;
create policy master_b422_lifecycle_runtime_select on app.master_build422_data_lifecycle_renewals for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b422_directional_runtime_select on app.master_build422_directional_dlp_renewals for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b422_lifecycle_protected_select on app.master_build422_data_lifecycle_renewals for select to ai_data_protected_runtime using (true);
create policy master_b422_directional_protected_select on app.master_build422_directional_dlp_renewals for select to ai_data_protected_runtime using (true);
create policy master_b422_lifecycle_protected_insert on app.master_build422_data_lifecycle_renewals for insert to ai_data_protected_runtime with check (source_owned and not synthetic_evidence and owner_reviewed and independently_verified);
create policy master_b422_directional_protected_insert on app.master_build422_directional_dlp_renewals for insert to ai_data_protected_runtime with check (source_owned and not synthetic_evidence and owner_reviewed and independently_verified);
grant select on app.master_build422_data_lifecycle_renewals,app.master_build422_directional_dlp_renewals to ai_data_runtime;
grant select,insert on app.master_build422_data_lifecycle_renewals,app.master_build422_directional_dlp_renewals to ai_data_protected_runtime;
revoke insert,update,delete on app.master_build422_data_lifecycle_renewals,app.master_build422_directional_dlp_renewals from ai_data_runtime;
revoke update,delete on app.master_build422_data_lifecycle_renewals,app.master_build422_directional_dlp_renewals from ai_data_protected_runtime;
