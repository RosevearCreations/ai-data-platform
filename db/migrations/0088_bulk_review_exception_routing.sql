create table if not exists app.workspace_data_review_exceptions (
  workspace_id uuid not null,
  exception_id uuid not null,
  review_id uuid not null,
  status text not null default 'open'
    check (status in ('open','resolved','dismissed')),
  reason_code text not null,
  note text not null default '',
  created_by text not null,
  created_at timestamptz not null default now(),
  resolved_by text,
  resolved_at timestamptz,
  primary key (workspace_id, exception_id),
  foreign key (workspace_id, review_id)
    references app.workspace_data_review_batches(workspace_id, review_id)
    on delete cascade
);
create index if not exists workspace_data_review_exceptions_queue_idx
  on app.workspace_data_review_exceptions(workspace_id, status, created_at desc);
alter table app.workspace_data_review_events drop constraint if exists workspace_data_review_events_action_check;
alter table app.workspace_data_review_events add constraint workspace_data_review_events_action_check
  check (action in ('created','saved','approved','rejected','held'));
grant select, insert, update on app.workspace_data_review_exceptions to ai_data_runtime;
alter table app.workspace_data_review_exceptions enable row level security;
drop policy if exists workspace_data_review_exceptions_member_all on app.workspace_data_review_exceptions;
create policy workspace_data_review_exceptions_member_all
on app.workspace_data_review_exceptions for all to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_data_review_exceptions.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id = workspace_data_review_exceptions.workspace_id
      and wm.user_id = nullif(current_setting('app.user_id', true), '')
  )
);
