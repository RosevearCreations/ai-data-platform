create table if not exists app.master_build419_performance_budget_receipts (
  receipt_id text primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  domain text not null check (domain in ('USER_EXPERIENCE','API','DATABASE','INTEGRATION','DELIVERY')),
  metric_key text not null, unit text not null check (unit in ('ms','percent','count')),
  measured_value numeric not null check (measured_value>=0),
  warning_threshold numeric not null check (warning_threshold>=0),
  critical_threshold numeric not null check (critical_threshold>warning_threshold),
  sample_count integer not null check (sample_count>0),
  source_evidence_digest text not null check (source_evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  budget_policy_digest text not null check (budget_policy_digest ~ '^sha256:[a-f0-9]{64}$'),
  source_owned boolean not null, synthetic_evidence boolean not null,
  independently_verified boolean not null, observed_at timestamptz not null,
  expires_at timestamptz not null, state text not null check (state in ('VERIFIED','HOLD','FAILED')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  recorded_at timestamptz not null default now(), check (expires_at>observed_at)
);
create index if not exists master_b419_perf_slot_idx
 on app.master_build419_performance_budget_receipts(app_id,domain,observed_at desc);

create table if not exists app.master_build419_capacity_forecast_receipts (
  receipt_id text primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  scenario_id text not null,
  unit text not null check (unit in ('bytes','records','units','attempts','events','requests')),
  current_demand numeric not null check (current_demand>=0),
  forecast_demand numeric not null check (forecast_demand>=0),
  growth_multiplier numeric not null check (growth_multiplier>0),
  authoritative_capacity_known boolean not null, known_hard_capacity numeric null,
  headroom_claimed boolean not null, headroom_value numeric null,
  source_evidence_digest text not null check (source_evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  forecast_policy_digest text not null check (forecast_policy_digest ~ '^sha256:[a-f0-9]{64}$'),
  owner_reviewed boolean not null, automatic_scaling_authorized boolean not null,
  automatic_purchasing_authorized boolean not null, independently_verified boolean not null,
  observed_at timestamptz not null, expires_at timestamptz not null,
  state text not null check (state in ('VERIFIED','HOLD','FAILED')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  recorded_at timestamptz not null default now(), check (expires_at>observed_at),
  check (
    (authoritative_capacity_known and known_hard_capacity is not null and known_hard_capacity>=0 and headroom_claimed and headroom_value is not null)
    or
    (not authoritative_capacity_known and known_hard_capacity is null and not headroom_claimed and headroom_value is null)
  ),
  check (not automatic_scaling_authorized and not automatic_purchasing_authorized)
);
create index if not exists master_b419_capacity_app_idx
 on app.master_build419_capacity_forecast_receipts(app_id,observed_at desc);

create table if not exists app.master_build419_vercel_usage_receipts (
  receipt_id text primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  hosted_on_vercel boolean not null, project_id text null, window_hours integer not null check (window_hours=24),
  total_deployments integer not null check (total_deployments>=0),
  preview_deployments integer not null check (preview_deployments>=0),
  production_deployments integer not null check (production_deployments>=0),
  ready_deployments integer not null check (ready_deployments>=0),
  error_deployments integer not null check (error_deployments>=0),
  canceled_deployments integer not null check (canceled_deployments>=0),
  unique_commit_count integer not null check (unique_commit_count>=0),
  duplicate_deployment_count integer not null check (duplicate_deployment_count>=0),
  max_total_deployments_24h integer null, max_preview_deployments_24h integer null,
  max_production_deployments_24h integer null, max_duplicate_deployments_24h integer null,
  max_error_rate_pct numeric null, budget_source_digest text null,
  exact_sha_preview_reuse_observed boolean not null,
  preview_database_migrations_observed boolean not null,
  billing_imported boolean not null, plan_limit_imported boolean not null,
  owner_defined_budget boolean not null, independently_verified boolean not null,
  observed_at timestamptz not null, expires_at timestamptz not null,
  state text not null check (state in ('VERIFIED','HOLD','FAILED','NOT_APPLICABLE')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  recorded_at timestamptz not null default now(), check (expires_at>observed_at),
  check (preview_deployments+production_deployments=total_deployments),
  check (ready_deployments+error_deployments+canceled_deployments<=total_deployments),
  check (unique_commit_count<=total_deployments and duplicate_deployment_count<=total_deployments),
  check (
    (not hosted_on_vercel and project_id is null and state='NOT_APPLICABLE' and not billing_imported and not plan_limit_imported)
    or
    (hosted_on_vercel and project_id ~ '^prj_[A-Za-z0-9]+$' and owner_defined_budget
      and max_total_deployments_24h>0 and max_preview_deployments_24h>0
      and max_production_deployments_24h>0 and max_duplicate_deployments_24h>0
      and max_error_rate_pct>0 and budget_source_digest ~ '^sha256:[a-f0-9]{64}$'
      and exact_sha_preview_reuse_observed and not preview_database_migrations_observed
      and not billing_imported and not plan_limit_imported and state='VERIFIED')
  )
);
create index if not exists master_b419_vercel_app_idx
 on app.master_build419_vercel_usage_receipts(app_id,observed_at desc);

alter table app.master_build419_performance_budget_receipts enable row level security;
alter table app.master_build419_performance_budget_receipts force row level security;
alter table app.master_build419_capacity_forecast_receipts enable row level security;
alter table app.master_build419_capacity_forecast_receipts force row level security;
alter table app.master_build419_vercel_usage_receipts enable row level security;
alter table app.master_build419_vercel_usage_receipts force row level security;

create policy master_b419_perf_runtime_select on app.master_build419_performance_budget_receipts
 for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b419_capacity_runtime_select on app.master_build419_capacity_forecast_receipts
 for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b419_vercel_runtime_select on app.master_build419_vercel_usage_receipts
 for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b419_perf_protected_select on app.master_build419_performance_budget_receipts
 for select to ai_data_protected_runtime using (true);
create policy master_b419_capacity_protected_select on app.master_build419_capacity_forecast_receipts
 for select to ai_data_protected_runtime using (true);
create policy master_b419_vercel_protected_select on app.master_build419_vercel_usage_receipts
 for select to ai_data_protected_runtime using (true);
create policy master_b419_perf_protected_insert on app.master_build419_performance_budget_receipts
 for insert to ai_data_protected_runtime with check (
   source_owned and not synthetic_evidence and independently_verified and state='VERIFIED'
 );
create policy master_b419_capacity_protected_insert on app.master_build419_capacity_forecast_receipts
 for insert to ai_data_protected_runtime with check (
   owner_reviewed and not automatic_scaling_authorized and not automatic_purchasing_authorized
   and independently_verified and state='VERIFIED'
 );
create policy master_b419_vercel_protected_insert on app.master_build419_vercel_usage_receipts
 for insert to ai_data_protected_runtime with check (
   independently_verified and not billing_imported and not plan_limit_imported
   and not preview_database_migrations_observed
 );

grant select on app.master_build419_performance_budget_receipts,
 app.master_build419_capacity_forecast_receipts,
 app.master_build419_vercel_usage_receipts to ai_data_runtime;
grant select,insert on app.master_build419_performance_budget_receipts,
 app.master_build419_capacity_forecast_receipts,
 app.master_build419_vercel_usage_receipts to ai_data_protected_runtime;
revoke insert,update,delete on app.master_build419_performance_budget_receipts,
 app.master_build419_capacity_forecast_receipts,
 app.master_build419_vercel_usage_receipts from ai_data_runtime;
revoke update,delete on app.master_build419_performance_budget_receipts,
 app.master_build419_capacity_forecast_receipts,
 app.master_build419_vercel_usage_receipts from ai_data_protected_runtime;
