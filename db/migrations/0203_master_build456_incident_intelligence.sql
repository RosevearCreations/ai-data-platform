-- Build 456: durable, bounded daily intelligence snapshots from genuine Build 455 case evidence.
-- This is diagnostic-only; no remote mutations or fabricated source attestations.
create table if not exists app.master_build456_incident_intelligence(
 inspection_day date primary key,
 captured_at timestamptz not null default now(),
 unique_open_incidents integer not null check(unique_open_incidents>=0),
 repeated_observations integer not null check(repeated_observations>=0),
 owner_escalations integer not null check(owner_escalations>=0),
 aged_escalations integer not null check(aged_escalations>=0),
 verified_recoveries integer not null check(verified_recoveries>=0),
 recovery_effectiveness_percent numeric(5,1),
 source_case_count integer not null check(source_case_count>=0),
 evidence jsonb not null,
 check(recovery_effectiveness_percent is null or (recovery_effectiveness_percent>=0 and recovery_effectiveness_percent<=100))
);
create index if not exists b456_incident_intelligence_time on app.master_build456_incident_intelligence(captured_at desc);
alter table app.master_build456_incident_intelligence enable row level security;
alter table app.master_build456_incident_intelligence force row level security;
create policy b456_protected_select on app.master_build456_incident_intelligence for select to ai_data_protected_runtime using(true);
create policy b456_protected_insert on app.master_build456_incident_intelligence for insert to ai_data_protected_runtime with check(true);
create policy b456_owner_select on app.master_build456_incident_intelligence for select to ai_data_runtime using(app.current_master_sysop_role()='owner');
grant select,insert on app.master_build456_incident_intelligence to ai_data_protected_runtime;
grant select on app.master_build456_incident_intelligence to ai_data_runtime;
revoke update,delete on app.master_build456_incident_intelligence from ai_data_protected_runtime,ai_data_runtime;
