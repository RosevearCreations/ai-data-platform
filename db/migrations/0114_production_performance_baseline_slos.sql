-- Build 331 — Production Performance Baseline, SLOs & Regression Budgets
-- Append-only, owner-scoped production performance evidence. This migration does
-- not infer browser/API metrics that are not yet instrumented.

create table if not exists app.performance_baseline_snapshots (
  snapshot_id uuid primary key,
  owner_user_id text not null references auth."user"(id) on delete restrict,
  overall_state text not null check (overall_state in ('healthy','attention','critical')),
  comparison_snapshot_id uuid references app.performance_baseline_snapshots(snapshot_id) on delete restrict,
  window_hours integer not null default 24 check (window_hours between 1 and 168),
  database_probe_ms numeric(12,3) not null check (database_probe_ms >= 0),
  connector_sample_count integer not null default 0 check (connector_sample_count >= 0),
  connector_p95_ms numeric(12,3) check (connector_p95_ms is null or connector_p95_ms >= 0),
  connector_error_rate_pct numeric(8,4) check (connector_error_rate_pct is null or (connector_error_rate_pct between 0 and 100)),
  webhook_sample_count integer not null default 0 check (webhook_sample_count >= 0),
  webhook_denied_rate_pct numeric(8,4) check (webhook_denied_rate_pct is null or (webhook_denied_rate_pct between 0 and 100)),
  delivery_failures_24h integer not null default 0 check (delivery_failures_24h >= 0),
  metric_snapshot jsonb not null check (jsonb_typeof(metric_snapshot)='array' and octet_length(metric_snapshot::text)<=65536),
  budget_snapshot jsonb not null check (jsonb_typeof(budget_snapshot)='array' and octet_length(budget_snapshot::text)<=65536),
  regression_snapshot jsonb not null check (jsonb_typeof(regression_snapshot)='array' and octet_length(regression_snapshot::text)<=65536),
  instrumentation_gaps jsonb not null check (jsonb_typeof(instrumentation_gaps)='array' and octet_length(instrumentation_gaps::text)<=16384),
  generated_by text not null references auth."user"(id) on delete restrict,
  generated_at timestamptz not null default now()
);

create index if not exists performance_baseline_snapshots_owner_recent_idx
  on app.performance_baseline_snapshots(owner_user_id,generated_at desc);

alter table app.performance_baseline_snapshots enable row level security;

drop policy if exists performance_baseline_snapshots_owner_select
  on app.performance_baseline_snapshots;
create policy performance_baseline_snapshots_owner_select
on app.performance_baseline_snapshots
for select to ai_data_runtime
using (owner_user_id=nullif(current_setting('app.user_id',true),''));

drop policy if exists performance_baseline_snapshots_owner_insert
  on app.performance_baseline_snapshots;
create policy performance_baseline_snapshots_owner_insert
on app.performance_baseline_snapshots
for insert to ai_data_runtime
with check (
  owner_user_id=nullif(current_setting('app.user_id',true),'')
  and generated_by=owner_user_id
);

revoke all on app.performance_baseline_snapshots from public;
grant select,insert on app.performance_baseline_snapshots to ai_data_runtime;
revoke update,delete on app.performance_baseline_snapshots from ai_data_runtime;
