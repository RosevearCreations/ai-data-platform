create table if not exists app.master_build417_delivery_sla_receipts (
  receipt_id text primary key,
  left_app_id text not null check (left_app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  right_app_id text not null check (right_app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  message_id text not null check (char_length(message_id) between 12 and 180),
  correlation_id text not null check (char_length(correlation_id) between 12 and 180),
  queued_at timestamptz not null,
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  delivery_state text not null check (delivery_state in ('ACKNOWLEDGED','DEAD_LETTER','HOLD','FAILED')),
  duplicate_count integer not null default 0 check (duplicate_count>=0),
  duplicate_suppressed boolean not null,
  replay_attempt_count integer not null default 0 check (replay_attempt_count between 0 and 3),
  replay_outcome text not null check (replay_outcome in ('NOT_REQUIRED','RECOVERED','HELD','FAILED')),
  dead_letter_id text,
  transport_authenticated boolean not null,
  source_identity_verified boolean not null,
  target_audience_verified boolean not null,
  tenant_boundary_verified boolean not null,
  replay_protection_verified boolean not null,
  authority_holder text not null check (authority_holder='rosevear-comms-hub'),
  authority_preserved boolean not null,
  direct_peer_database_write boolean not null check (direct_peer_database_write=false),
  evidence_digest text not null check (evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  independently_verified boolean not null,
  state text not null check (state in ('VERIFIED','HOLD','FAILED')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  recorded_at timestamptz not null default now(),
  check (left_app_id<>right_app_id),
  check (delivered_at is null or delivered_at>=queued_at),
  check (acknowledged_at is null or (delivered_at is not null and acknowledged_at>=delivered_at)),
  check (expires_at>observed_at),
  check (duplicate_count=0 or duplicate_suppressed),
  check (delivery_state<>'ACKNOWLEDGED' or acknowledged_at is not null),
  check (delivery_state<>'DEAD_LETTER' or dead_letter_id is not null)
);
create index if not exists master_b417_delivery_relationship_idx
  on app.master_build417_delivery_sla_receipts(left_app_id,right_app_id,observed_at desc);

create table if not exists app.master_build417_dead_letter_recovery_receipts (
  receipt_id text primary key,
  dead_letter_id text not null,
  left_app_id text not null check (left_app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  right_app_id text not null check (right_app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  failure_digest text not null check (failure_digest ~ '^sha256:[a-f0-9]{64}$'),
  entered_at timestamptz not null,
  replay_requested_at timestamptz,
  recovered_at timestamptz,
  replay_number integer not null check (replay_number between 0 and 3),
  disposition text not null check (disposition in ('RECOVERED','OPEN','FAILED')),
  duplicate_suppression_preserved boolean not null,
  original_message_identity_preserved boolean not null,
  authority_preserved boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  evidence_digest text not null check (evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  state text not null check (state in ('VERIFIED','HOLD','FAILED')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  recorded_at timestamptz not null default now(),
  check (left_app_id<>right_app_id),
  check (replay_requested_at is null or replay_requested_at>=entered_at),
  check (recovered_at is null or recovered_at>=entered_at),
  check (expires_at>observed_at)
);
create index if not exists master_b417_dead_letter_idx
  on app.master_build417_dead_letter_recovery_receipts(dead_letter_id,observed_at desc);

alter table app.master_build417_delivery_sla_receipts enable row level security;
alter table app.master_build417_delivery_sla_receipts force row level security;
alter table app.master_build417_dead_letter_recovery_receipts enable row level security;
alter table app.master_build417_dead_letter_recovery_receipts force row level security;

create policy master_b417_delivery_runtime_select
  on app.master_build417_delivery_sla_receipts for select to ai_data_runtime
  using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b417_recovery_runtime_select
  on app.master_build417_dead_letter_recovery_receipts for select to ai_data_runtime
  using (app.current_master_sysop_role() in ('owner','operator'));

create policy master_b417_delivery_protected_select
  on app.master_build417_delivery_sla_receipts for select to ai_data_protected_runtime using (true);
create policy master_b417_recovery_protected_select
  on app.master_build417_dead_letter_recovery_receipts for select to ai_data_protected_runtime using (true);

create policy master_b417_delivery_protected_insert
  on app.master_build417_delivery_sla_receipts for insert to ai_data_protected_runtime
  with check (
    transport_authenticated and source_identity_verified and target_audience_verified
    and tenant_boundary_verified and replay_protection_verified
    and authority_holder='rosevear-comms-hub' and authority_preserved
    and direct_peer_database_write=false and independently_verified
  );
create policy master_b417_recovery_protected_insert
  on app.master_build417_dead_letter_recovery_receipts for insert to ai_data_protected_runtime
  with check (
    duplicate_suppression_preserved and original_message_identity_preserved
    and authority_preserved and owner_reviewed and independently_verified
  );

grant select on
  app.master_build417_delivery_sla_receipts,
  app.master_build417_dead_letter_recovery_receipts
to ai_data_runtime;
grant select,insert on
  app.master_build417_delivery_sla_receipts,
  app.master_build417_dead_letter_recovery_receipts
to ai_data_protected_runtime;

revoke insert,update,delete on
  app.master_build417_delivery_sla_receipts,
  app.master_build417_dead_letter_recovery_receipts
from ai_data_runtime;
revoke update,delete on
  app.master_build417_delivery_sla_receipts,
  app.master_build417_dead_letter_recovery_receipts
from ai_data_protected_runtime;
