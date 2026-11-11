-- Build 366 — Independent Source Signer Enrollment Intake, Public-Key Pin
-- Custody Verification, Genuine Signed Health Receipt Admission & Owner Review Preparation.
-- Candidate public keys, challenge material and audit outcomes are non-secret.
-- Private source signing keys are never accepted or stored.

create table if not exists app.master_source_signer_enrollment_intake_events (
  event_id uuid primary key,
  intake_id uuid not null,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id in ('yw','icamp')),
  event_type text not null check (
    event_type in (
      'SUBMITTED',
      'CHALLENGE_ISSUED',
      'CUSTODY_VERIFIED',
      'ENROLLMENT_COMMITTED',
      'REJECTED'
    )
  ),
  key_id text not null check (char_length(key_id) between 1 and 160),
  public_key_pem text
    check (
      public_key_pem is null or (
        char_length(public_key_pem) between 64 and 4096
        and public_key_pem like '%BEGIN PUBLIC KEY%'
        and public_key_pem like '%END PUBLIC KEY%'
      )
    ),
  computed_spki_sha256 text
    check (
      computed_spki_sha256 is null
      or computed_spki_sha256 ~ '^sha256:[a-f0-9]{64}$'
    ),
  independent_pin_spki_sha256 text
    check (
      independent_pin_spki_sha256 is null
      or independent_pin_spki_sha256 ~ '^sha256:[a-f0-9]{64}$'
    ),
  pin_evidence_uri text
    check (
      pin_evidence_uri is null
      or pin_evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
    ),
  custody_evidence_uri text
    check (
      custody_evidence_uri is null
      or custody_evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
    ),
  witness_evidence_uri text
    check (
      witness_evidence_uri is null
      or witness_evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
    ),
  challenge_text text
    check (challenge_text is null or char_length(challenge_text) between 32 and 1024),
  challenge_expires_at timestamptz,
  challenge_signature_base64 text
    check (
      challenge_signature_base64 is null
      or char_length(challenge_signature_base64) between 40 and 4096
    ),
  detail text not null check (char_length(detail) between 1 and 1800),
  recorded_at timestamptz not null default now()
);

create index if not exists master_source_signer_intake_recent_idx
  on app.master_source_signer_enrollment_intake_events(
    source_id,intake_id,recorded_at desc
  );

create table if not exists app.master_source_health_admission_events (
  admission_event_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id in ('yw','icamp')),
  key_id text not null check (char_length(key_id) between 1 and 160),
  receipt_sha256 text not null check (receipt_sha256 ~ '^[a-f0-9]{64}$'),
  source_revision text not null check (source_revision ~ '^[a-f0-9]{40}$'),
  outcome text not null check (outcome in ('ADMITTED','REJECTED')),
  receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  blockers jsonb not null default '[]'::jsonb
    check (
      jsonb_typeof(blockers)='array'
      and octet_length(blockers::text)<=8192
    ),
  recorded_at timestamptz not null default now(),
  check (
    (outcome='ADMITTED' and receipt_id is not null)
    or (outcome='REJECTED' and receipt_id is null)
  )
);

create index if not exists master_source_health_admission_recent_idx
  on app.master_source_health_admission_events(source_id,recorded_at desc);

alter table app.master_source_signer_enrollment_intake_events enable row level security;
alter table app.master_source_signer_enrollment_intake_events force row level security;
alter table app.master_source_health_admission_events enable row level security;
alter table app.master_source_health_admission_events force row level security;

drop policy if exists master_source_signer_intake_select
  on app.master_source_signer_enrollment_intake_events;
create policy master_source_signer_intake_select
on app.master_source_signer_enrollment_intake_events
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_source_signer_intake_insert
  on app.master_source_signer_enrollment_intake_events;
create policy master_source_signer_intake_insert
on app.master_source_signer_enrollment_intake_events
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role='owner'
  )
);

drop policy if exists master_source_health_admission_select
  on app.master_source_health_admission_events;
create policy master_source_health_admission_select
on app.master_source_health_admission_events
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists master_source_health_admission_insert
  on app.master_source_health_admission_events;
create policy master_source_health_admission_insert
on app.master_source_health_admission_events
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

revoke all on
  app.master_source_signer_enrollment_intake_events,
  app.master_source_health_admission_events
from public;

revoke all on
  app.master_source_signer_enrollment_intake_events,
  app.master_source_health_admission_events
from ai_data_runtime;

grant select,insert on
  app.master_source_signer_enrollment_intake_events,
  app.master_source_health_admission_events
to ai_data_runtime;

revoke update,delete on
  app.master_source_signer_enrollment_intake_events,
  app.master_source_health_admission_events
from ai_data_runtime;
