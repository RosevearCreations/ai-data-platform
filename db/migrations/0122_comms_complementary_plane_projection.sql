create table if not exists app.comms_plane_projection_evidence (
  projection_id uuid primary key,
  source_id text not null check (source_id='rosevear-comms-hub'),
  schema_name text not null check (
    schema_name='rosevear.comms.master-shell-read-model.v1'
  ),
  source_revision text not null check (
    source_revision ~ '^[0-9a-f]{40,64}$'
  ),
  projection_mode text not null check (
    projection_mode='AUTHORIZED_READ_MODEL'
  ),
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  evidence_uri text not null check (
    evidence_uri ~ '^(https://|urn:rosevear:evidence:)[^[:space:]]{1,500}$'
  ),
  evidence_authority text not null check (
    evidence_authority='independent-source-verification'
  ),
  projection_sha256 text not null check (
    projection_sha256 ~ '^[0-9a-f]{64}$'
  ),
  projection jsonb not null check (
    jsonb_typeof(projection)='object'
    and octet_length(projection::text) <= 65536
  ),
  recorded_at timestamptz not null default now(),
  check (expires_at > observed_at),
  check (expires_at - observed_at <= interval '30 minutes')
);

create index if not exists comms_plane_projection_latest_idx
  on app.comms_plane_projection_evidence(observed_at desc,recorded_at desc);

alter table app.comms_plane_projection_evidence enable row level security;
alter table app.comms_plane_projection_evidence force row level security;

drop policy if exists comms_plane_projection_sysop_select
  on app.comms_plane_projection_evidence;
create policy comms_plane_projection_sysop_select
on app.comms_plane_projection_evidence
for select
to ai_data_runtime
using (
  source_id='rosevear-comms-hub'
  and evidence_authority='independent-source-verification'
  and app.current_master_sysop_role() in ('owner','operator')
);

revoke all on app.comms_plane_projection_evidence from public;
revoke all on app.comms_plane_projection_evidence from ai_data_runtime;
grant select on app.comms_plane_projection_evidence to ai_data_runtime;
revoke insert,update,delete on app.comms_plane_projection_evidence
  from ai_data_runtime;
