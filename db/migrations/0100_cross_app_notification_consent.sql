-- Build 297 — Cross-App Notification & Consent Service
create table if not exists app.notification_consent_evidence (
  consent_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  canonical_tenant_key text not null,
  customer_record_id text not null,
  channel text not null check (channel in ('email','sms','push','in-app','voice')),
  consent_state text not null check (consent_state in ('granted','denied','revoked','unknown')),
  consent_basis text not null,
  source_application_id text not null,
  source_record_id text not null,
  observed_at timestamptz not null,
  expires_at timestamptz,
  evidence_sha256 text not null check (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  recorded_by uuid not null,
  recorded_at timestamptz not null default now(),
  unique (workspace_id, canonical_tenant_key, customer_record_id, channel, evidence_sha256)
);

create index if not exists notification_consent_lookup_idx
  on app.notification_consent_evidence
  (workspace_id, canonical_tenant_key, customer_record_id, channel, observed_at desc);

create table if not exists app.notification_requests (
  request_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  canonical_tenant_key text not null,
  source_application_id text not null,
  source_record_id text not null,
  customer_record_id text not null,
  channel text not null check (channel in ('email','sms','push','in-app','voice')),
  template_key text not null,
  consent_basis text not null,
  requested_at timestamptz not null,
  scheduled_at timestamptz,
  subject text,
  content_summary text not null,
  operator_application_id text not null default 'rosevear-comms-hub'
    check (operator_application_id='rosevear-comms-hub'),
  contract_id text not null default 'rosevear.shared.notification.v1'
    check (contract_id='rosevear.shared.notification.v1'),
  contract_version text not null default '1.0.0',
  portable_record jsonb not null,
  request_sha256 text not null check (request_sha256 ~ '^[a-f0-9]{64}$'),
  consent_id uuid references app.notification_consent_evidence(consent_id),
  consent_check text not null,
  state text not null default 'held' check (state='held'),
  hold_reason text not null default 'notification-dispatch-not-authorized'
    check (hold_reason='notification-dispatch-not-authorized'),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, request_sha256)
);

create table if not exists app.notification_request_reviews (
  review_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  request_id uuid not null unique references app.notification_requests(request_id) on delete cascade,
  decision text not null check (decision in ('approve','reject')),
  reason text not null,
  reviewed_by uuid not null,
  reviewed_at timestamptz not null default now()
);

create table if not exists app.notification_delivery_evidence (
  evidence_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  request_id uuid not null references app.notification_requests(request_id) on delete cascade,
  operator_application_id text not null default 'rosevear-comms-hub'
    check (operator_application_id='rosevear-comms-hub'),
  status text not null check (status in ('not-dispatched','external-evidence-only')),
  provider_message_id text,
  observed_at timestamptz not null,
  evidence_sha256 text not null check (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  recorded_by uuid not null,
  recorded_at timestamptz not null default now(),
  unique (workspace_id, request_id, evidence_sha256)
);

create table if not exists app.notification_consent_audit (
  audit_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  actor_user_id uuid not null,
  action text not null,
  consent_id uuid,
  request_id uuid,
  review_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table app.notification_consent_evidence enable row level security;
alter table app.notification_requests enable row level security;
alter table app.notification_request_reviews enable row level security;
alter table app.notification_delivery_evidence enable row level security;
alter table app.notification_consent_audit enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'notification_consent_evidence',
    'notification_requests',
    'notification_request_reviews',
    'notification_delivery_evidence',
    'notification_consent_audit'
  ]
  loop
    execute format('drop policy if exists %I_member_select on app.%I', t, t);
    execute format(
      'create policy %I_member_select on app.%I for select using (exists (select 1 from app.workspace_members wm where wm.workspace_id=%I.workspace_id and wm.user_id=nullif(current_setting(''app.user_id'',true),'''')::uuid))',
      t, t, t
    );
    execute format('drop policy if exists %I_admin_insert on app.%I', t, t);
    execute format(
      'create policy %I_admin_insert on app.%I for insert with check (exists (select 1 from app.workspace_members wm where wm.workspace_id=%I.workspace_id and wm.user_id=nullif(current_setting(''app.user_id'',true),'''')::uuid and wm.role in (''owner'',''admin'')))',
      t, t, t
    );
  end loop;
end $$;

revoke update, delete on
  app.notification_consent_evidence,
  app.notification_requests,
  app.notification_request_reviews,
  app.notification_delivery_evidence,
  app.notification_consent_audit
from ai_data_runtime;

grant select, insert on
  app.notification_consent_evidence,
  app.notification_requests,
  app.notification_request_reviews,
  app.notification_delivery_evidence,
  app.notification_consent_audit
to ai_data_runtime;
