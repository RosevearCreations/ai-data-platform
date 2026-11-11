-- Build 368 — Master Runtime Evidence Closure, iCamp Revision Re-Convergence,
-- Source Receipt Refresh & Supervised Acceptance Recheck.
-- All evidence is append-only; source private keys and controller-side source mutation are prohibited.

create table if not exists app.master_runtime_evidence_rechecks (
  recheck_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  controller_revision text not null check (controller_revision ~ '^[a-f0-9]{40}$'),
  ai_hub_ack text not null,
  ai_hub_main text not null check (ai_hub_main ~ '^[a-f0-9]{40}$'),
  ai_hub_state jsonb not null check (jsonb_typeof(ai_hub_state)='object'),
  comms_ack text not null,
  comms_main text not null check (comms_main ~ '^[a-f0-9]{40}$'),
  comms_state jsonb not null check (jsonb_typeof(comms_state)='object'),
  blockers jsonb not null check (jsonb_typeof(blockers)='array'),
  gate_state text not null check (gate_state in ('OPEN','HOLD')),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create table if not exists app.master_source_receipt_refresh_requests (
  refresh_request_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  source_id text not null check (source_id in ('yw','icamp')),
  source_production_revision text not null check (source_production_revision ~ '^[a-f0-9]{40}$'),
  observed_manifest_revision text,
  revision_state text not null
    check (revision_state in ('VERIFIED_CURRENT','HOLD_MANIFEST_STALE','HOLD_MANIFEST_UNVERIFIED')),
  signer_state text not null
    check (signer_state in ('TRUSTED_SIGNER_ENROLLED','HOLD_UNENROLLED','HOLD_AMBIGUOUS')),
  current_receipt_id uuid references app.master_convergence_receipt_ledger(receipt_id) on delete restrict,
  receipt_state text not null
    check (receipt_state in ('VERIFIED_CURRENT','HOLD_NOT_RECEIVED','HOLD_STALE','HOLD_REVISION_MISMATCH','HOLD_NOT_ADMITTED')),
  requested_action text not null
    check (requested_action in ('RECONVERGE_MANIFEST_AND_REFRESH_RECEIPT','REFRESH_SIGNER_AND_RECEIPT','REFRESH_RECEIPT','NO_REFRESH_REQUIRED')),
  handoff_token text not null,
  blockers jsonb not null check (jsonb_typeof(blockers)='array'),
  requested_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create table if not exists app.master_supervised_acceptance_rechecks (
  acceptance_recheck_id uuid primary key,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  runtime_recheck_id uuid not null references app.master_runtime_evidence_rechecks(recheck_id) on delete restrict,
  refresh_request_id uuid not null references app.master_source_receipt_refresh_requests(refresh_request_id) on delete restrict,
  source_id text not null check (source_id in ('yw','icamp')),
  source_revision text not null check (source_revision ~ '^[a-f0-9]{40}$'),
  master_gate_state text not null check (master_gate_state in ('OPEN','HOLD')),
  source_evidence_state text not null check (source_evidence_state in ('READY','HOLD')),
  acceptance_state text not null check (acceptance_state in ('READY_FOR_OWNER_REVIEW','HOLD')),
  blockers jsonb not null check (jsonb_typeof(blockers)='array'),
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists master_runtime_evidence_rechecks_recent_idx
  on app.master_runtime_evidence_rechecks(recorded_at desc);
create index if not exists master_source_receipt_refresh_requests_source_idx
  on app.master_source_receipt_refresh_requests(source_id,recorded_at desc);
create index if not exists master_supervised_acceptance_rechecks_source_idx
  on app.master_supervised_acceptance_rechecks(source_id,recorded_at desc);

alter table app.master_runtime_evidence_rechecks enable row level security;
alter table app.master_runtime_evidence_rechecks force row level security;
alter table app.master_source_receipt_refresh_requests enable row level security;
alter table app.master_source_receipt_refresh_requests force row level security;
alter table app.master_supervised_acceptance_rechecks enable row level security;
alter table app.master_supervised_acceptance_rechecks force row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'master_runtime_evidence_rechecks',
    'master_source_receipt_refresh_requests',
    'master_supervised_acceptance_rechecks'
  ] loop
    execute format('drop policy if exists %I_select on app.%I',t,t);
    execute format(
      'create policy %I_select on app.%I for select to ai_data_runtime using (exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting(''app.user_id'',true),'''') and wm.role in (''owner'',''admin'')))',
      t,t
    );
    execute format('drop policy if exists %I_insert on app.%I',t,t);
    execute format(
      'create policy %I_insert on app.%I for insert to ai_data_runtime with check (actor_user_id=nullif(current_setting(''app.user_id'',true),'''') and exists (select 1 from app.workspace_members wm where wm.user_id=nullif(current_setting(''app.user_id'',true),'''') and wm.role=''owner''))',
      t,t
    );
  end loop;
end $$;

revoke all on
  app.master_runtime_evidence_rechecks,
  app.master_source_receipt_refresh_requests,
  app.master_supervised_acceptance_rechecks
from public, ai_data_runtime;

grant select,insert on
  app.master_runtime_evidence_rechecks,
  app.master_source_receipt_refresh_requests,
  app.master_supervised_acceptance_rechecks
to ai_data_runtime;

revoke update,delete on
  app.master_runtime_evidence_rechecks,
  app.master_source_receipt_refresh_requests,
  app.master_supervised_acceptance_rechecks
from ai_data_runtime;
