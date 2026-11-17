create table if not exists app.master_build415_evidence_freshness_observations (
  observation_id text primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  evidence_domain text not null check (evidence_domain in ('SOURCE_RUNTIME','COMPLETION','SECURITY','COMMUNICATIONS','ACCESSIBILITY_DEVICE','PERFORMANCE_UX','PRIVILEGED_RECOVERY')),
  source_evidence_id text not null check (length(source_evidence_id) between 1 and 240),
  evidence_digest text not null check (evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  independently_verified boolean not null,
  authority_preserved boolean not null,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  recorded_at timestamptz not null default now(),
  check (expires_at > observed_at),
  check (
    expires_at <= observed_at +
      case evidence_domain
        when 'SOURCE_RUNTIME' then interval '2 hours'
        when 'COMPLETION' then interval '168 hours'
        when 'SECURITY' then interval '24 hours'
        when 'COMMUNICATIONS' then interval '4 hours'
        when 'ACCESSIBILITY_DEVICE' then interval '168 hours'
        when 'PERFORMANCE_UX' then interval '24 hours'
        when 'PRIVILEGED_RECOVERY' then interval '24 hours'
      end
  )
);

create index if not exists master_build415_freshness_slot_idx
  on app.master_build415_evidence_freshness_observations(app_id,evidence_domain,observed_at desc);

create table if not exists app.master_build415_renewal_requests (
  request_id uuid primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  evidence_domain text not null check (evidence_domain in ('SOURCE_RUNTIME','COMPLETION','SECURITY','COMMUNICATIONS','ACCESSIBILITY_DEVICE','PERFORMANCE_UX','PRIVILEGED_RECOVERY')),
  requester_user_id text not null references auth."user"(id) on delete restrict,
  requester_role text not null check (requester_role in ('owner','operator')),
  reason_digest text not null check (reason_digest ~ '^sha256:[a-f0-9]{64}$'),
  requested_at timestamptz not null default now()
);

create index if not exists master_build415_renewal_request_slot_idx
  on app.master_build415_renewal_requests(app_id,evidence_domain,requested_at desc);

create table if not exists app.master_build415_renewal_receipts (
  receipt_id text primary key,
  request_id uuid not null references app.master_build415_renewal_requests(request_id) on delete restrict,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  evidence_domain text not null check (evidence_domain in ('SOURCE_RUNTIME','COMPLETION','SECURITY','COMMUNICATIONS','ACCESSIBILITY_DEVICE','PERFORMANCE_UX','PRIVILEGED_RECOVERY')),
  source_app_id text not null,
  delivery_authority text not null check (delivery_authority='rosevear-comms-hub'),
  direct_peer_database_write boolean not null check (direct_peer_database_write=false),
  source_authority_preserved boolean not null check (source_authority_preserved),
  receipt_digest text not null check (receipt_digest ~ '^sha256:[a-f0-9]{64}$'),
  outcome text not null check (outcome in ('ACKNOWLEDGED','RENEWED','REJECTED','HOLD')),
  observed_at timestamptz not null,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object')
);

create table if not exists app.master_build415_expiry_alerts (
  alert_id text primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  evidence_domain text not null check (evidence_domain in ('SOURCE_RUNTIME','COMPLETION','SECURITY','COMMUNICATIONS','ACCESSIBILITY_DEVICE','PERFORMANCE_UX','PRIVILEGED_RECOVERY')),
  observation_id text references app.master_build415_evidence_freshness_observations(observation_id) on delete restrict,
  alert_state text not null check (alert_state in ('MISSING','INVALID','EXPIRED','DUE_NOW','DUE_SOON')),
  alert_digest text not null check (alert_digest ~ '^sha256:[a-f0-9]{64}$'),
  observed_at timestamptz not null,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object')
);

alter table app.master_build415_evidence_freshness_observations enable row level security;
alter table app.master_build415_evidence_freshness_observations force row level security;
alter table app.master_build415_renewal_requests enable row level security;
alter table app.master_build415_renewal_requests force row level security;
alter table app.master_build415_renewal_receipts enable row level security;
alter table app.master_build415_renewal_receipts force row level security;
alter table app.master_build415_expiry_alerts enable row level security;
alter table app.master_build415_expiry_alerts force row level security;

create policy master_b415_observations_runtime_select
  on app.master_build415_evidence_freshness_observations
  for select to ai_data_runtime
  using (app.current_master_sysop_role() in ('owner','operator'));

create policy master_b415_requests_runtime_select
  on app.master_build415_renewal_requests
  for select to ai_data_runtime
  using (app.current_master_sysop_role() in ('owner','operator'));

create policy master_b415_requests_runtime_insert
  on app.master_build415_renewal_requests
  for insert to ai_data_runtime
  with check (
    app.current_master_sysop_role() in ('owner','operator')
    and requester_role=app.current_master_sysop_role()
    and requester_user_id=nullif(current_setting('app.user_id',true),'')
  );

create policy master_b415_receipts_runtime_select
  on app.master_build415_renewal_receipts
  for select to ai_data_runtime
  using (app.current_master_sysop_role() in ('owner','operator'));

create policy master_b415_alerts_runtime_select
  on app.master_build415_expiry_alerts
  for select to ai_data_runtime
  using (app.current_master_sysop_role() in ('owner','operator'));

create policy master_b415_observations_protected_select
  on app.master_build415_evidence_freshness_observations
  for select to ai_data_protected_runtime using (true);

create policy master_b415_observations_protected_insert
  on app.master_build415_evidence_freshness_observations
  for insert to ai_data_protected_runtime
  with check (independently_verified and authority_preserved);

create policy master_b415_requests_protected_select
  on app.master_build415_renewal_requests
  for select to ai_data_protected_runtime using (true);

create policy master_b415_receipts_protected_select
  on app.master_build415_renewal_receipts
  for select to ai_data_protected_runtime using (true);

create policy master_b415_receipts_protected_insert
  on app.master_build415_renewal_receipts
  for insert to ai_data_protected_runtime
  with check (
    delivery_authority='rosevear-comms-hub'
    and direct_peer_database_write=false
    and source_authority_preserved
  );

create policy master_b415_alerts_protected_select
  on app.master_build415_expiry_alerts
  for select to ai_data_protected_runtime using (true);

create policy master_b415_alerts_protected_insert
  on app.master_build415_expiry_alerts
  for insert to ai_data_protected_runtime
  with check (true);

grant select on
  app.master_build415_evidence_freshness_observations,
  app.master_build415_renewal_requests,
  app.master_build415_renewal_receipts,
  app.master_build415_expiry_alerts
to ai_data_runtime;

grant insert on app.master_build415_renewal_requests to ai_data_runtime;

grant select on
  app.master_build415_evidence_freshness_observations,
  app.master_build415_renewal_requests,
  app.master_build415_renewal_receipts,
  app.master_build415_expiry_alerts
to ai_data_protected_runtime;

grant insert on
  app.master_build415_evidence_freshness_observations,
  app.master_build415_renewal_receipts,
  app.master_build415_expiry_alerts
to ai_data_protected_runtime;

revoke update,delete on
  app.master_build415_evidence_freshness_observations,
  app.master_build415_renewal_requests,
  app.master_build415_renewal_receipts,
  app.master_build415_expiry_alerts
from ai_data_runtime,ai_data_protected_runtime;

revoke insert on
  app.master_build415_evidence_freshness_observations,
  app.master_build415_renewal_receipts,
  app.master_build415_expiry_alerts
from ai_data_runtime;
