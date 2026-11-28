-- Build 457: owner-isolated, diagnostic-only, daily recurrence assessments.
-- Forecasts are transparent heuristics, not actuarial predictions or permission to repair.
create table if not exists app.master_build457_recurrence_forecasts(
 inspection_day date not null,
 exception_key text not null references app.master_build455_exception_cases(exception_key),
 captured_at timestamptz not null default now(),
 risk_band text not null check(risk_band in ('INSUFFICIENT_EVIDENCE','LOW','ELEVATED','HIGH')),
 priority text not null check(priority in ('MONITOR','REVIEW','URGENT')),
 reopening_count integer not null check(reopening_count>=0),
 open_observations integer not null check(open_observations>=0),
 evidence_window_days integer not null check(evidence_window_days between 1 and 90),
 recommendation_code text not null check(length(recommendation_code) between 3 and 120),
 recommendation_authority text not null default 'ADVISORY_ONLY' check(recommendation_authority='ADVISORY_ONLY'),
 primary key(inspection_day,exception_key)
);
create index if not exists b457_forecast_recent on app.master_build457_recurrence_forecasts(captured_at desc);
alter table app.master_build457_recurrence_forecasts enable row level security;
alter table app.master_build457_recurrence_forecasts force row level security;
create policy b457_protected_read on app.master_build457_recurrence_forecasts for select to ai_data_protected_runtime using(true);
create policy b457_protected_insert on app.master_build457_recurrence_forecasts for insert to ai_data_protected_runtime with check(true);
create policy b457_owner_read on app.master_build457_recurrence_forecasts for select to ai_data_runtime using(app.current_master_sysop_role()='owner');
grant select,insert on app.master_build457_recurrence_forecasts to ai_data_protected_runtime;
grant select on app.master_build457_recurrence_forecasts to ai_data_runtime;
revoke update,delete on app.master_build457_recurrence_forecasts from ai_data_protected_runtime,ai_data_runtime;
