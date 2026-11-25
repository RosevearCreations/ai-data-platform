-- Provider-acceptance and password-reset closure evidence; no email, password, link or token persisted.
create table if not exists app.master_build445_owner_recovery_receipts(
 receipt_id uuid primary key,
 user_id text not null,
 stage text not null check(stage in ('PROVIDER_ACCEPTED','PROVIDER_REJECTED','RESET_COMPLETED')),
 provider_email_id text null check(provider_email_id is null or provider_email_id~'^[a-zA-Z0-9-]{8,100}$'),
 occurred_at timestamptz not null default now(),
 check((stage='PROVIDER_ACCEPTED' and provider_email_id is not null) or (stage<>'PROVIDER_ACCEPTED' and provider_email_id is null))
);
create index if not exists b445_owner_receipt_user_at on app.master_build445_owner_recovery_receipts(user_id,occurred_at desc);
alter table app.master_build445_owner_recovery_receipts enable row level security;
alter table app.master_build445_owner_recovery_receipts force row level security;
create policy b445_owner_receipt_protected on app.master_build445_owner_recovery_receipts for all to ai_data_protected_runtime using(true) with check(true);
create policy b445_owner_receipt_owner_read on app.master_build445_owner_recovery_receipts for select to ai_data_runtime using(app.current_master_sysop_role()='owner');
grant select,insert on app.master_build445_owner_recovery_receipts to ai_data_protected_runtime;
grant select on app.master_build445_owner_recovery_receipts to ai_data_runtime;
revoke update,delete on app.master_build445_owner_recovery_receipts from ai_data_runtime,ai_data_protected_runtime;
