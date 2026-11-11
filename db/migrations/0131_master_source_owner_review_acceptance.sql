-- Build 367 — Verified Source Signer Evidence Reception, Signed Health Admission
-- Reconciliation, Master-Gate Owner Review Packet & Explicit Acceptance Decision.
-- Review packets and decisions are append-only. ACCEPT remains fail-closed unless
-- the packet was READY when recorded and still references current source evidence.

create table if not exists app.master_source_owner_review_packets (
  packet_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id in ('yw','icamp')),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  source_manifest_revision text,
  source_revision_state text not null
    check (source_revision_state in ('VERIFIED_CURRENT','HOLD_MANIFEST_STALE','HOLD_MANIFEST_UNVERIFIED')),
  signer_key_id text,
  signer_state text not null
    check (signer_state in ('TRUSTED_SIGNER_ENROLLED','HOLD_UNENROLLED','HOLD_AMBIGUOUS')),
  receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  receipt_state text not null
    check (receipt_state in ('VERIFIED_CURRENT','HOLD_NOT_RECEIVED','HOLD_STALE','HOLD_REVISION_MISMATCH','HOLD_NOT_ADMITTED')),
  admission_event_id uuid references app.master_source_health_admission_events(admission_event_id) on delete restrict,
  master_gate_state text not null check (master_gate_state in ('OPEN','HOLD')),
  master_snapshot jsonb not null
    check (jsonb_typeof(master_snapshot)='object' and octet_length(master_snapshot::text)<=32768),
  blockers jsonb not null
    check (jsonb_typeof(blockers)='array' and octet_length(blockers::text)<=16384),
  packet_state text not null check (packet_state in ('READY_FOR_OWNER_DECISION','HOLD')),
  captured_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_source_owner_review_packets_source_recent_idx
  on app.master_source_owner_review_packets(source_id,recorded_at desc);

create table if not exists app.master_source_acceptance_decision_events (
  decision_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  packet_id uuid not null references app.master_source_owner_review_packets(packet_id) on delete restrict,
  source_id text not null check (source_id in ('yw','icamp')),
  receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  decision text not null check (decision in ('HOLD','ACCEPT','REJECT')),
  evidence_uri text not null
    check (evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'),
  detail text not null check (char_length(detail) between 1 and 1800),
  decided_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  check (decision <> 'ACCEPT' or receipt_id is not null)
);

create index if not exists master_source_acceptance_decision_source_recent_idx
  on app.master_source_acceptance_decision_events(source_id,recorded_at desc);

alter table app.master_source_owner_review_packets enable row level security;
alter table app.master_source_owner_review_packets force row level security;
alter table app.master_source_acceptance_decision_events enable row level security;
alter table app.master_source_acceptance_decision_events force row level security;

drop policy if exists master_source_owner_review_packets_select
  on app.master_source_owner_review_packets;
create policy master_source_owner_review_packets_select
on app.master_source_owner_review_packets
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_source_owner_review_packets_insert
  on app.master_source_owner_review_packets;
create policy master_source_owner_review_packets_insert
on app.master_source_owner_review_packets
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner'
  )
);

drop policy if exists master_source_acceptance_decision_events_select
  on app.master_source_acceptance_decision_events;
create policy master_source_acceptance_decision_events_select
on app.master_source_acceptance_decision_events
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_source_acceptance_decision_events_insert
  on app.master_source_acceptance_decision_events;
create policy master_source_acceptance_decision_events_insert
on app.master_source_acceptance_decision_events
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner'
  )
);

revoke all on
  app.master_source_owner_review_packets,
  app.master_source_acceptance_decision_events
from public;

revoke all on
  app.master_source_owner_review_packets,
  app.master_source_acceptance_decision_events
from ai_data_runtime;

grant select,insert on
  app.master_source_owner_review_packets,
  app.master_source_acceptance_decision_events
to ai_data_runtime;

revoke update,delete on
  app.master_source_owner_review_packets,
  app.master_source_acceptance_decision_events
from ai_data_runtime;
