-- Build 441: original-source-separated witness evidence custody.
-- No user-facing write policy or automatic witness enrollment; rows require a trusted verifier.
create table if not exists app.master_build441_field_witness(
 witness_id uuid primary key,
 app_id text not null check(length(app_id) between 2 and 80),
 source_commit text not null check(source_commit ~ '^[a-f0-9]{40}$'),
 witness_role text not null check(length(witness_role) between 3 and 80),
 original_device_id text not null check(length(original_device_id) between 3 and 200),
 observed_at timestamptz not null,
 signature_verified boolean not null default false,
 independent_of_source boolean not null default false,
 interface_certified boolean not null default false,
 receiver_ack_verified boolean not null default false,
 owner_acceptance_verified boolean not null default false,
 verifier_receipt_id text not null check(length(verifier_receipt_id) between 8 and 250),
 revoked boolean not null default false,
 created_at timestamptz not null default now(),
 unique(app_id,source_commit,verifier_receipt_id)
);
create index if not exists master_build441_witness_latest_idx on app.master_build441_field_witness(app_id,observed_at desc);
alter table app.master_build441_field_witness enable row level security;
alter table app.master_build441_field_witness force row level security;
create policy b441_witness_runtime_read on app.master_build441_field_witness
 for select to ai_data_runtime using(app.current_master_sysop_role() in ('owner','operator'));
create policy b441_witness_protected_read on app.master_build441_field_witness
 for select to ai_data_protected_runtime using(true);
grant select on app.master_build441_field_witness to ai_data_runtime,ai_data_protected_runtime;
revoke insert,update,delete on app.master_build441_field_witness from ai_data_runtime,ai_data_protected_runtime;
