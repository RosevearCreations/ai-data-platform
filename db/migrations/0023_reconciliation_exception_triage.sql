create table if not exists app.workspace_reconciliation_exception_cases (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  case_id uuid not null,
  reconciliation_id uuid not null,
  delivery_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  status text not null default 'open'
    check (status in ('open','planned','approved','closed','dismissed')),
  classification text not null
    check (classification in ('consumer-drift','consumer-missing','expected-change','source-superseded','mixed','unknown')),
  severity text not null
    check (severity in ('low','medium','high','critical')),
  resolution_intent text not null
    check (resolution_intent in ('investigate','accept-drift','plan-correction','no-action')),
  summary text not null check (char_length(summary) between 1 and 4000),
  investigation_note text not null default '' check (char_length(investigation_note) <= 8000),
  reconciliation_fingerprint text not null check (char_length(reconciliation_fingerprint) between 1 and 128),
  package_id text not null check (char_length(package_id) between 1 and 512),
  package_fingerprint text not null check (char_length(package_fingerprint) between 1 and 128),
  affected_record_count integer not null check (affected_record_count between 1 and 500),
  affected_integration_keys jsonb not null check (
    jsonb_typeof(affected_integration_keys)='array'
    and jsonb_array_length(affected_integration_keys) between 1 and 500
    and octet_length(affected_integration_keys::text) <= 131072
  ),
  affected_fields jsonb not null check (
    jsonb_typeof(affected_fields)='array'
    and jsonb_array_length(affected_fields) between 1 and 100
    and octet_length(affected_fields::text) <= 32768
  ),
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by text not null references auth."user"(id) on delete restrict,
  updated_at timestamptz not null default now(),
  closed_by text references auth."user"(id) on delete restrict,
  closed_at timestamptz,
  primary key (workspace_id,case_id),
  unique (workspace_id,reconciliation_id),
  foreign key (workspace_id,reconciliation_id)
    references app.workspace_live_delivery_reconciliations(workspace_id,reconciliation_id)
    on delete restrict,
  foreign key (workspace_id,delivery_id)
    references app.workspace_publication_live_deliveries(workspace_id,delivery_id)
    on delete restrict
);

create index if not exists workspace_reconciliation_exception_cases_recent_idx
  on app.workspace_reconciliation_exception_cases(workspace_id,updated_at desc);

create table if not exists app.workspace_corrective_delivery_plans (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  plan_id uuid not null,
  case_id uuid not null,
  reconciliation_id uuid not null,
  delivery_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  status text not null default 'proposed'
    check (status in ('proposed','approved','rejected','withdrawn')),
  reconciliation_fingerprint text not null check (char_length(reconciliation_fingerprint) between 1 and 128),
  package_id text not null check (char_length(package_id) between 1 and 512),
  replay_key text not null check (char_length(replay_key) between 1 and 1024),
  package_fingerprint text not null check (char_length(package_fingerprint) between 1 and 128),
  correction_scope jsonb not null check (
    jsonb_typeof(correction_scope)='array'
    and jsonb_array_length(correction_scope) between 1 and 500
    and octet_length(correction_scope::text) <= 262144
  ),
  plan_fingerprint text not null check (char_length(plan_fingerprint) between 1 and 128),
  rationale text not null check (char_length(rationale) between 1 and 8000),
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  reviewed_by text references auth."user"(id) on delete restrict,
  reviewed_at timestamptz,
  review_note text not null default '' check (char_length(review_note) <= 8000),
  primary key (workspace_id,plan_id),
  unique (workspace_id,case_id,plan_fingerprint),
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict,
  foreign key (workspace_id,reconciliation_id)
    references app.workspace_live_delivery_reconciliations(workspace_id,reconciliation_id)
    on delete restrict,
  foreign key (workspace_id,delivery_id)
    references app.workspace_publication_live_deliveries(workspace_id,delivery_id)
    on delete restrict
);

create index if not exists workspace_corrective_delivery_plans_recent_idx
  on app.workspace_corrective_delivery_plans(workspace_id,created_at desc);

grant select,insert on app.workspace_reconciliation_exception_cases to ai_data_runtime;
grant update (
  status,classification,severity,resolution_intent,summary,investigation_note,
  updated_by,updated_at,closed_by,closed_at
) on app.workspace_reconciliation_exception_cases to ai_data_runtime;

grant select,insert on app.workspace_corrective_delivery_plans to ai_data_runtime;
grant update (
  status,reviewed_by,reviewed_at,review_note
) on app.workspace_corrective_delivery_plans to ai_data_runtime;

alter table app.workspace_reconciliation_exception_cases enable row level security;
alter table app.workspace_corrective_delivery_plans enable row level security;

drop policy if exists workspace_reconciliation_exception_cases_member_select
  on app.workspace_reconciliation_exception_cases;
create policy workspace_reconciliation_exception_cases_member_select
on app.workspace_reconciliation_exception_cases
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_exception_cases.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workspace_reconciliation_exception_cases_manager_insert
  on app.workspace_reconciliation_exception_cases;
create policy workspace_reconciliation_exception_cases_manager_insert
on app.workspace_reconciliation_exception_cases
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and updated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_exception_cases.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_reconciliation_exception_cases_manager_update
  on app.workspace_reconciliation_exception_cases;
create policy workspace_reconciliation_exception_cases_manager_update
on app.workspace_reconciliation_exception_cases
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_exception_cases.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  updated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_reconciliation_exception_cases.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_corrective_delivery_plans_member_select
  on app.workspace_corrective_delivery_plans;
create policy workspace_corrective_delivery_plans_member_select
on app.workspace_corrective_delivery_plans
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_delivery_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workspace_corrective_delivery_plans_manager_insert
  on app.workspace_corrective_delivery_plans;
create policy workspace_corrective_delivery_plans_manager_insert
on app.workspace_corrective_delivery_plans
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_delivery_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_corrective_delivery_plans_manager_update
  on app.workspace_corrective_delivery_plans;
create policy workspace_corrective_delivery_plans_manager_update
on app.workspace_corrective_delivery_plans
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_delivery_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_delivery_plans.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);
