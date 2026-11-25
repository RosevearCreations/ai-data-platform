-- Build 446: separate transport evidence for owner-triggered mailbox verification.
-- No email address, verification token, reset link or password is persisted.
create table if not exists app.master_build446_mailbox_verification_receipts(
 receipt_id uuid primary key,
 user_id text not null,
 stage text not null check(stage in ('REQUESTED','PROVIDER_ACCEPTED','PROVIDER_REJECTED')),
 provider_email_id text check(provider_email_id is null or provider_email_id ~ '^[a-zA-Z0-9-]{8,100}$'),
 occurred_at timestamptz not null default now(),
 check((stage='PROVIDER_ACCEPTED' and provider_email_id is not null)
       or (stage <> 'PROVIDER_ACCEPTED' and provider_email_id is null))
);
create index if not exists b446_verification_user_at
 on app.master_build446_mailbox_verification_receipts(user_id,occurred_at desc);
alter table app.master_build446_mailbox_verification_receipts enable row level security;
alter table app.master_build446_mailbox_verification_receipts force row level security;
create policy b446_verification_protected on app.master_build446_mailbox_verification_receipts
 for all to ai_data_protected_runtime using(true) with check(true);
create policy b446_verification_owner_read on app.master_build446_mailbox_verification_receipts
 for select to ai_data_runtime using(app.current_master_sysop_role()='owner');
grant select,insert on app.master_build446_mailbox_verification_receipts to ai_data_protected_runtime;
grant select on app.master_build446_mailbox_verification_receipts to ai_data_runtime;
revoke update,delete on app.master_build446_mailbox_verification_receipts from ai_data_runtime, ai_data_protected_runtime;
