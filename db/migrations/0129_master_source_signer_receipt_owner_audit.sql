-- Build 365 — Trusted Source Signer Registry, Durable Convergence Receipt Ledger,
-- Replay/Aging Evidence & Owner Decision Audit Trail.
-- All evidence is append-only. Private signing keys are never stored.

create table if not exists app.master_source_signer_registry_events (
  event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id in ('yw','icamp')),
  event_type text not null check (event_type in ('ENROLLED','REVOKED')),
  key_id text not null check (char_length(key_id) between 1 and 160),
  public_key_pem text not null
    check (
      char_length(public_key_pem) between 64 and 4096
      and public_key_pem like '%BEGIN PUBLIC KEY%'
      and public_key_pem like '%END PUBLIC KEY%'
    ),
  public_key_spki_sha256 text not null
    check (public_key_spki_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  custody_evidence_uri text not null
    check (custody_evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'),
  independently_verified_at timestamptz not null,
  note text check (note is null or char_length(note) between 1 and 1200),
  recorded_at timestamptz not null default now()
);

create index if not exists master_source_signer_registry_source_recent_idx
  on app.master_source_signer_registry_events(source_id,key_id,recorded_at desc);

create table if not exists app.master_convergence_receipt_ledger (
  receipt_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id in ('yw','icamp')),
  signer_event_id uuid not null
    references app.master_source_signer_registry_events(event_id) on delete restrict,
  key_id text not null check (char_length(key_id) between 1 and 160),
  source_revision text not null check (source_revision ~ '^[a-f0-9]{40}$'),
  manifest_revision text not null check (manifest_revision ~ '^[a-f0-9]{40}$'),
  receipt_sha256 text not null unique check (receipt_sha256 ~ '^[a-f0-9]{64}$'),
  nonce text not null check (char_length(nonce) between 1 and 256),
  issued_at timestamptz not null,
  health_observed_at timestamptz not null,
  health_state text not null check (health_state='HEALTHY'),
  source_runtime text not null check (char_length(source_runtime) between 1 and 256),
  canonical_payload jsonb not null
    check (
      jsonb_typeof(canonical_payload)='object'
      and octet_length(canonical_payload::text)<=32768
    ),
  signature_base64 text not null check (char_length(signature_base64) between 40 and 4096),
  verification_state text not null
    check (verification_state='VERIFIED_SOURCE_BOUND_HEALTH'),
  verified_at timestamptz not null default now(),
  unique (source_id,nonce)
);

create index if not exists master_convergence_receipt_source_recent_idx
  on app.master_convergence_receipt_ledger(source_id,verified_at desc);

create table if not exists app.master_owner_decision_audit (
  decision_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
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

create index if not exists master_owner_decision_source_recent_idx
  on app.master_owner_decision_audit(source_id,recorded_at desc);

alter table app.master_source_signer_registry_events enable row level security;
alter table app.master_source_signer_registry_events force row level security;
alter table app.master_convergence_receipt_ledger enable row level security;
alter table app.master_convergence_receipt_ledger force row level security;
alter table app.master_owner_decision_audit enable row level security;
alter table app.master_owner_decision_audit force row level security;

drop policy if exists master_source_signer_registry_select on app.master_source_signer_registry_events;
create policy master_source_signer_registry_select
on app.master_source_signer_registry_events for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_source_signer_registry_insert on app.master_source_signer_registry_events;
create policy master_source_signer_registry_insert
on app.master_source_signer_registry_events for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner'
  )
);

drop policy if exists master_convergence_receipt_ledger_select on app.master_convergence_receipt_ledger;
create policy master_convergence_receipt_ledger_select
on app.master_convergence_receipt_ledger for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_convergence_receipt_ledger_insert on app.master_convergence_receipt_ledger;
create policy master_convergence_receipt_ledger_insert
on app.master_convergence_receipt_ledger for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_owner_decision_audit_select on app.master_owner_decision_audit;
create policy master_owner_decision_audit_select
on app.master_owner_decision_audit for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_owner_decision_audit_insert on app.master_owner_decision_audit;
create policy master_owner_decision_audit_insert
on app.master_owner_decision_audit for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner'
  )
);

revoke all on
  app.master_source_signer_registry_events,
  app.master_convergence_receipt_ledger,
  app.master_owner_decision_audit
from public;

revoke all on
  app.master_source_signer_registry_events,
  app.master_convergence_receipt_ledger,
  app.master_owner_decision_audit
from ai_data_runtime;

grant select,insert on
  app.master_source_signer_registry_events,
  app.master_convergence_receipt_ledger,
  app.master_owner_decision_audit
to ai_data_runtime;

revoke update,delete on
  app.master_source_signer_registry_events,
  app.master_convergence_receipt_ledger,
  app.master_owner_decision_audit
from ai_data_runtime;
