-- Build 424 operational maturity closure, security renewal and next roadmap ceremony.
create table if not exists app.master_build424_operational_maturity_renewals(
 evidence_id text primary key,app_id text not null check(app_id in('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
 domain text not null check(domain in('RELEASE_MATURITY','SECURITY_RENEWAL','COMMUNICATIONS_ASSURANCE','RECOVERY_READINESS','TELEMETRY_ENROLLMENT','OPERATIONS_RUNBOOK_CUSTODY')),
 state text not null check(state in('PASS','HOLD','FAILED')),exact_release_revision_verified boolean not null default false,release_checks_green boolean not null default false,
 security_baseline_current boolean not null default false,secret_custody_verified boolean not null default false,communications_authority_preserved boolean not null default false,consent_authority_preserved boolean not null default false,
 recovery_readiness_verified boolean not null default false,rollback_or_abort_available boolean not null default false,telemetry_source_implemented boolean not null default false,telemetry_signer_enrolled boolean not null default false,
 telemetry_transport_verified boolean not null default false,runbook_current boolean not null default false,reboot_procedure_documented boolean not null default false,physical_reboot_independently_witnessed boolean not null default false,
 evidence_digest text not null check(evidence_digest~'^sha256:[a-f0-9]{64}$'),source_owned boolean not null,synthetic_evidence boolean not null default false check(synthetic_evidence=false),owner_reviewed boolean not null,independently_verified boolean not null,
 observed_at timestamptz not null,expires_at timestamptz not null,evidence jsonb not null default '{}'::jsonb check(jsonb_typeof(evidence)='object'),recorded_at timestamptz not null default now(),check(expires_at>observed_at),unique(app_id,domain,observed_at));
create table if not exists app.master_build424_relationship_security_renewals(
 receipt_id text primary key,source_app_id text not null,target_app_id text not null,state text not null check(state in('PASS','HOLD','FAILED')),exact_relationship_bound boolean not null default false,
 source_revision_verified boolean not null default false,target_revision_verified boolean not null default false,transport_security_current boolean not null default false,consent_and_purpose_preserved boolean not null default false,
 source_authority_preserved boolean not null default false,communications_authority_preserved boolean not null default false,duplicate_replay_safety_verified boolean not null default false,dlp_boundary_preserved boolean not null default false,
 evidence_digest text not null check(evidence_digest~'^sha256:[a-f0-9]{64}$'),source_owned boolean not null,synthetic_evidence boolean not null default false check(synthetic_evidence=false),owner_reviewed boolean not null,independently_verified boolean not null,
 observed_at timestamptz not null,expires_at timestamptz not null,evidence jsonb not null default '{}'::jsonb check(jsonb_typeof(evidence)='object'),recorded_at timestamptz not null default now(),check(source_app_id<>target_app_id),check(expires_at>observed_at),unique(source_app_id,target_app_id,observed_at));
create table if not exists app.master_build424_roadmap_ceremony_receipts(
 receipt_id text primary key,slot text not null,state text not null check(state in('PASS','HOLD','FAILED')),current_roadmap_closed boolean not null default false,remaining_holds_published boolean not null default false,
 pathway_to_100_published boolean not null default false,next_roadmap_owner_gated boolean not null default false,no_automatic_build425 boolean not null default false,denominator_rule_published boolean not null default false,
 evidence_digest text not null check(evidence_digest~'^sha256:[a-f0-9]{64}$'),source_owned boolean not null,synthetic_evidence boolean not null default false check(synthetic_evidence=false),owner_reviewed boolean not null,independently_verified boolean not null,
 observed_at timestamptz not null,expires_at timestamptz not null,evidence jsonb not null default '{}'::jsonb check(jsonb_typeof(evidence)='object'),recorded_at timestamptz not null default now(),check(expires_at>observed_at),unique(slot,observed_at));
alter table app.master_build424_operational_maturity_renewals enable row level security;alter table app.master_build424_operational_maturity_renewals force row level security;
alter table app.master_build424_relationship_security_renewals enable row level security;alter table app.master_build424_relationship_security_renewals force row level security;
alter table app.master_build424_roadmap_ceremony_receipts enable row level security;alter table app.master_build424_roadmap_ceremony_receipts force row level security;
create policy b424_local_read on app.master_build424_operational_maturity_renewals for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b424_rel_read on app.master_build424_relationship_security_renewals for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b424_roadmap_read on app.master_build424_roadmap_ceremony_receipts for select to ai_data_runtime using(app.current_master_sysop_role() in('owner','operator'));
create policy b424_local_protected on app.master_build424_operational_maturity_renewals for select to ai_data_protected_runtime using(true);
create policy b424_rel_protected on app.master_build424_relationship_security_renewals for select to ai_data_protected_runtime using(true);
create policy b424_roadmap_protected on app.master_build424_roadmap_ceremony_receipts for select to ai_data_protected_runtime using(true);
create policy b424_local_insert on app.master_build424_operational_maturity_renewals for insert to ai_data_protected_runtime with check(source_owned and not synthetic_evidence and owner_reviewed and independently_verified);
create policy b424_rel_insert on app.master_build424_relationship_security_renewals for insert to ai_data_protected_runtime with check(source_owned and not synthetic_evidence and owner_reviewed and independently_verified);
create policy b424_roadmap_insert on app.master_build424_roadmap_ceremony_receipts for insert to ai_data_protected_runtime with check(source_owned and not synthetic_evidence and owner_reviewed and independently_verified);
grant select on app.master_build424_operational_maturity_renewals,app.master_build424_relationship_security_renewals,app.master_build424_roadmap_ceremony_receipts to ai_data_runtime;
grant select,insert on app.master_build424_operational_maturity_renewals,app.master_build424_relationship_security_renewals,app.master_build424_roadmap_ceremony_receipts to ai_data_protected_runtime;
revoke insert,update,delete on app.master_build424_operational_maturity_renewals,app.master_build424_relationship_security_renewals,app.master_build424_roadmap_ceremony_receipts from ai_data_runtime;
revoke update,delete on app.master_build424_operational_maturity_renewals,app.master_build424_relationship_security_renewals,app.master_build424_roadmap_ceremony_receipts from ai_data_protected_runtime;
