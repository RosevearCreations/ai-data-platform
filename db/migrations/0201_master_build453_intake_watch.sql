-- Build 453: Master-owned intake readiness without granting source actions or guest-data access.
-- Only an aggregate SECURITY DEFINER readback is exposed to the protected runtime.
create or replace function app.build453_intake_source_summary()
returns jsonb language sql stable security definer
set search_path=pg_catalog,app
as $body$
 select jsonb_build_object(
  'sourceEndpointCount',(select count(*)::int from app.webhook_endpoints where source_application_id='icamp' and environment='production' and enabled=true and revoked_at is null),
  'site12AllowedEndpointCount',(select count(*)::int from app.webhook_endpoints where source_application_id='icamp' and environment='production' and enabled=true and revoked_at is null and allowed_event_types ? 'camp.site.maintenance.requested' and allowed_event_types ? 'camp.site.folio.posted'),
  'sourceSecretEnvNames',coalesce((select jsonb_agg(distinct secret_env_var) from app.webhook_endpoints where source_application_id='icamp' and environment='production' and enabled=true and revoked_at is null and allowed_event_types ? 'camp.site.maintenance.requested' and allowed_event_types ? 'camp.site.folio.posted'),'[]'::jsonb),
  'activeSubscriptions',(select count(*)::int from app.event_bus_subscriptions where environment='production' and state='active' and (source_application_id='icamp' or source_application_id is null)),
  'webhookReceipts',(select count(*)::int from app.webhook_receipts where source_application_id='icamp'),
  'site12EventReceipts',(select count(*)::int from app.webhook_receipts where source_application_id='icamp' and event_type in ('camp.site.maintenance.requested','camp.site.maintenance.acknowledged','camp.site.maintenance.resolved','camp.site.addon.requested','camp.site.addon.approved','camp.site.addon.delivered','camp.site.payment.captured','camp.site.folio.posted')),
  'lastSite12ReceiptAt',(select max(received_at) from app.webhook_receipts where source_application_id='icamp' and event_type in ('camp.site.maintenance.requested','camp.site.maintenance.acknowledged','camp.site.addon.requested','camp.site.folio.posted')),
  'eventPublications',(select count(*)::int from app.event_bus_publications where source_application_id='icamp'),
  'eventRoutes',(select count(*)::int from app.event_bus_routes),
  'lastSignedSweepAt',(select max(observed_at) from app.master_build432_closure_runs),
  'lastWindowsRelayAt',(select max(received_at) from app.master_build432_hub_relay_receipts)
 );
$body$;
revoke all on function app.build453_intake_source_summary() from public;
grant execute on function app.build453_intake_source_summary() to ai_data_protected_runtime;

create table if not exists app.master_build453_intake_watch(
 inspection_day date primary key,
 capture_id uuid not null unique,
 capture_mode text not null check (capture_mode='CRON'),
 state text not null check(length(state) between 5 and 120),
 site12_receipts integer not null default 0 check(site12_receipts>=0),
 intake_endpoints integer not null default 0 check(intake_endpoints>=0),
 event_subscriptions integer not null default 0 check(event_subscriptions>=0),
 evidence jsonb not null,
 captured_at timestamptz not null default now()
);
create index if not exists b453_intake_watch_at on app.master_build453_intake_watch(captured_at desc);
alter table app.master_build453_intake_watch enable row level security;
alter table app.master_build453_intake_watch force row level security;
create policy b453_protected_insert on app.master_build453_intake_watch for insert to ai_data_protected_runtime with check (true);
create policy b453_protected_read on app.master_build453_intake_watch for select to ai_data_protected_runtime using(true);
create policy b453_owner_read on app.master_build453_intake_watch for select to ai_data_runtime using(app.current_master_sysop_role()='owner');
grant select,insert on app.master_build453_intake_watch to ai_data_protected_runtime;
grant select on app.master_build453_intake_watch to ai_data_runtime;
revoke update,delete on app.master_build453_intake_watch from ai_data_protected_runtime,ai_data_runtime;
