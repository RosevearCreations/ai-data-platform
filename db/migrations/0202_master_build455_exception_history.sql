-- Build 455: protected autonomous exception case ledger and append-only observation history.
-- This does not grant control of other applications, credentials, payments or original Windows host.
create table if not exists app.master_build455_exception_cases(
 exception_key text primary key check(length(exception_key) between 3 and 120),
 severity text not null check(severity in ('ACTION_REQUIRED','WATCH','INFORMATION')),
 owner_scope text not null check(owner_scope in ('AI_DATA_PLATFORM','EXTERNAL_SOURCE','ORIGINAL_WINDOWS_HOST')),
 status text not null check(status in ('OPEN','RECOVERY_VERIFIED')),
 observed_state text not null check(length(observed_state) between 2 and 120),
 action_code text not null check(length(action_code) between 3 and 160),
 detail text not null check(length(detail)<=1000),
 first_seen_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 recovered_at timestamptz,
 next_check_at timestamptz,
 consecutive_open integer not null default 1 check(consecutive_open>=0),
 escalation text not null check(escalation in ('OWNER_REVIEW','WATCH_ONLY','NONE')),
 check(status<>'RECOVERY_VERIFIED' or recovered_at is not null)
);
create table if not exists app.master_build455_exception_history(
 event_id uuid primary key,
 exception_key text not null references app.master_build455_exception_cases(exception_key),
 inspection_day date not null,
 outcome text not null check(outcome in ('OPEN','RECOVERY_VERIFIED')),
 observed_state text not null check(length(observed_state) between 2 and 120),
 captured_at timestamptz not null default now(),
 next_check_at timestamptz,
 evidence_type text not null check(evidence_type='PROTECTED_MASTER_INTAKE_SNAPSHOT'),
 unique(exception_key,inspection_day,outcome)
);
create index if not exists b455_open_next_check on app.master_build455_exception_cases(status,next_check_at);
create index if not exists b455_history_recent on app.master_build455_exception_history(captured_at desc);
alter table app.master_build455_exception_cases enable row level security;
alter table app.master_build455_exception_cases force row level security;
alter table app.master_build455_exception_history enable row level security;
alter table app.master_build455_exception_history force row level security;
create policy b455_cases_protected_select on app.master_build455_exception_cases for select to ai_data_protected_runtime using(true);
create policy b455_cases_protected_insert on app.master_build455_exception_cases for insert to ai_data_protected_runtime with check(true);
create policy b455_cases_protected_update on app.master_build455_exception_cases for update to ai_data_protected_runtime using(true) with check(true);
create policy b455_cases_owner_read on app.master_build455_exception_cases for select to ai_data_runtime using(app.current_master_sysop_role()='owner');
create policy b455_history_protected_select on app.master_build455_exception_history for select to ai_data_protected_runtime using(true);
create policy b455_history_protected_insert on app.master_build455_exception_history for insert to ai_data_protected_runtime with check(true);
create policy b455_history_owner_read on app.master_build455_exception_history for select to ai_data_runtime using(app.current_master_sysop_role()='owner');
grant select,insert,update on app.master_build455_exception_cases to ai_data_protected_runtime;
grant select,insert on app.master_build455_exception_history to ai_data_protected_runtime;
grant select on app.master_build455_exception_cases,app.master_build455_exception_history to ai_data_runtime;
revoke delete on app.master_build455_exception_cases,app.master_build455_exception_history from ai_data_protected_runtime,ai_data_runtime;
revoke update on app.master_build455_exception_history from ai_data_protected_runtime,ai_data_runtime;
