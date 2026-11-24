-- Append-only nonce and independently verified witness custody. No general authenticated write path.
create table if not exists app.master_build442_witness_replay(
 key_id text not null,
 nonce text not null,
 app_id text not null,
 witness_id uuid not null references app.master_build441_field_witness(witness_id),
 accepted_at timestamptz not null default now(),
 primary key(key_id,nonce)
);
alter table app.master_build441_field_witness enable row level security;
create policy b442_witness_protected_insert on app.master_build441_field_witness
 for insert to ai_data_protected_runtime with check(signature_verified and independent_of_source);
create policy b442_replay_protected on app.master_build442_witness_replay for all to ai_data_protected_runtime using(true) with check(true);
alter table app.master_build442_witness_replay enable row level security;
alter table app.master_build442_witness_replay force row level security;
grant insert on app.master_build441_field_witness to ai_data_protected_runtime;
grant select,insert on app.master_build442_witness_replay to ai_data_protected_runtime;
revoke insert,update,delete on app.master_build442_witness_replay from ai_data_runtime;
