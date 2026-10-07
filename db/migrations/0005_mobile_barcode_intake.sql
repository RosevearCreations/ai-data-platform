create table if not exists app.workspace_barcode_captures (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  capture_id uuid not null,
  target text not null check (target in ('personal-movie', 'devil-supplier')),
  raw_code text not null,
  normalized_code text not null,
  barcode_format text not null,
  capture_method text not null check (capture_method in ('camera', 'manual')),
  captured_at timestamptz not null,
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  match_status text not null check (match_status in ('exact', 'unmatched', 'duplicate')),
  match_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(match_payload) = 'object'),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, capture_id)
);

create index if not exists workspace_barcode_captures_recent_idx
  on app.workspace_barcode_captures(workspace_id, created_at desc);

create index if not exists workspace_barcode_captures_code_idx
  on app.workspace_barcode_captures(workspace_id, target, normalized_code);

grant select, insert, update
  on app.workspace_barcode_captures
  to ai_data_runtime;

alter table app.workspace_barcode_captures enable row level security;

drop policy if exists workspace_barcode_captures_member_all
  on app.workspace_barcode_captures;
create policy workspace_barcode_captures_member_all
on app.workspace_barcode_captures
for all
to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_barcode_captures.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
)
with check (
  exists (
    select 1
    from app.workspace_members wm
    where wm.workspace_id = workspace_barcode_captures.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);
