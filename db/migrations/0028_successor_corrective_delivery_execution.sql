create table if not exists app.workspace_successor_corrective_delivery_activations (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  activation_id uuid not null,
  successor_plan_id uuid not null,
  retriage_id uuid not null,
  reopen_id uuid not null,
  regression_check_id uuid not null,
  case_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  status text not null default 'active' check (status in ('active','revoked')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 512),
  successor_plan_fingerprint text not null check (char_length(successor_plan_fingerprint) between 1 and 128),
  source_regression_fingerprint text not null check (char_length(source_regression_fingerprint) between 1 and 128),
  predecessor_corrective_delivery_id uuid not null,
  predecessor_corrective_package_id text not null check (char_length(predecessor_corrective_package_id) between 1 and 512),
  predecessor_corrective_replay_key text not null check (char_length(predecessor_corrective_replay_key) between 1 and 1024),
  predecessor_corrective_package_fingerprint text not null check (char_length(predecessor_corrective_package_fingerprint) between 1 and 128),
  successor_package_id text not null check (char_length(successor_package_id) between 1 and 512),
  successor_replay_key text not null check (char_length(successor_replay_key) between 1 and 1024),
  successor_package_fingerprint text not null check (char_length(successor_package_fingerprint) between 1 and 128),
  dry_run_validation_code text not null check (char_length(dry_run_validation_code) between 1 and 96),
  dry_run_http_status integer check (dry_run_http_status between 100 and 599),
  dry_run_consumer_received_at timestamptz not null,
  dry_run_acknowledgement jsonb not null default '{}'::jsonb
    check (jsonb_typeof(dry_run_acknowledgement)='object'
      and octet_length(dry_run_acknowledgement::text) <= 32768),
  activation_fingerprint text not null check (char_length(activation_fingerprint) between 1 and 128),
  activated_by text not null references auth."user"(id) on delete restrict,
  activated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_by text references auth."user"(id) on delete restrict,
  revoked_at timestamptz,
  revocation_note text not null default '' check (char_length(revocation_note) <= 4000),
  primary key (workspace_id,activation_id),
  unique (workspace_id,successor_plan_id,activation_fingerprint),
  foreign key (workspace_id,successor_plan_id)
    references app.workspace_successor_corrective_delivery_plans(workspace_id,successor_plan_id)
    on delete restrict,
  foreign key (workspace_id,retriage_id)
    references app.workspace_reopened_exception_triage_cycles(workspace_id,retriage_id)
    on delete restrict,
  foreign key (workspace_id,reopen_id)
    references app.workspace_reconciliation_exception_reopens(workspace_id,reopen_id)
    on delete restrict,
  foreign key (workspace_id,regression_check_id)
    references app.workspace_post_closure_regression_checks(workspace_id,regression_check_id)
    on delete restrict,
  foreign key (workspace_id,case_id)
    references app.workspace_reconciliation_exception_cases(workspace_id,case_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_corrective_delivery_id)
    references app.workspace_corrective_live_deliveries(workspace_id,delivery_id)
    on delete restrict
);

create unique index if not exists workspace_successor_corrective_delivery_activations_one_active_idx
  on app.workspace_successor_corrective_delivery_activations(workspace_id,successor_plan_id)
  where status='active';

create index if not exists workspace_successor_corrective_delivery_activations_recent_idx
  on app.workspace_successor_corrective_delivery_activations(workspace_id,activated_at desc);

create table if not exists app.workspace_successor_corrective_live_deliveries (
  workspace_id uuid not null references app.workspaces(id) on delete cascade,
  delivery_id uuid not null,
  activation_id uuid not null,
  successor_plan_id uuid not null,
  predecessor_corrective_delivery_id uuid not null,
  target text not null check (target in ('rosie-dazzlers','devil-n-dove')),
  consumer_id text not null check (char_length(consumer_id) between 1 and 512),
  successor_plan_fingerprint text not null check (char_length(successor_plan_fingerprint) between 1 and 128),
  activation_fingerprint text not null check (char_length(activation_fingerprint) between 1 and 128),
  successor_package_id text not null check (char_length(successor_package_id) between 1 and 512),
  successor_replay_key text not null check (char_length(successor_replay_key) between 1 and 1024),
  successor_package_fingerprint text not null check (char_length(successor_package_fingerprint) between 1 and 128),
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 1024),
  status text not null default 'reserved'
    check (status in ('reserved','accepted','rejected','transport-error')),
  attempt_count integer not null default 1 check (attempt_count between 1 and 5),
  validation_code text not null default 'reserved' check (char_length(validation_code) between 1 and 96),
  http_status integer check (http_status between 100 and 599),
  consumer_received_at timestamptz,
  acknowledgement jsonb not null default '{}'::jsonb
    check (jsonb_typeof(acknowledgement)='object'
      and octet_length(acknowledgement::text) <= 32768),
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id,delivery_id),
  unique (workspace_id,consumer_id,successor_package_id),
  foreign key (workspace_id,activation_id)
    references app.workspace_successor_corrective_delivery_activations(workspace_id,activation_id)
    on delete restrict,
  foreign key (workspace_id,successor_plan_id)
    references app.workspace_successor_corrective_delivery_plans(workspace_id,successor_plan_id)
    on delete restrict,
  foreign key (workspace_id,predecessor_corrective_delivery_id)
    references app.workspace_corrective_live_deliveries(workspace_id,delivery_id)
    on delete restrict
);

create index if not exists workspace_successor_corrective_live_deliveries_recent_idx
  on app.workspace_successor_corrective_live_deliveries(workspace_id,updated_at desc);

grant select,insert on app.workspace_successor_corrective_delivery_activations to ai_data_runtime;
grant update (status,revoked_by,revoked_at,revocation_note)
  on app.workspace_successor_corrective_delivery_activations to ai_data_runtime;

grant select,insert on app.workspace_successor_corrective_live_deliveries to ai_data_runtime;
grant update (
  status,attempt_count,validation_code,http_status,consumer_received_at,
  acknowledgement,last_attempt_at,updated_at
) on app.workspace_successor_corrective_live_deliveries to ai_data_runtime;

alter table app.workspace_successor_corrective_delivery_activations enable row level security;
alter table app.workspace_successor_corrective_live_deliveries enable row level security;

drop policy if exists workspace_successor_corrective_delivery_activations_member_select
  on app.workspace_successor_corrective_delivery_activations;
create policy workspace_successor_corrective_delivery_activations_member_select
on app.workspace_successor_corrective_delivery_activations
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successor_corrective_delivery_activations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workspace_successor_corrective_delivery_activations_manager_insert
  on app.workspace_successor_corrective_delivery_activations;
create policy workspace_successor_corrective_delivery_activations_manager_insert
on app.workspace_successor_corrective_delivery_activations
for insert to ai_data_runtime
with check (
  activated_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_successor_corrective_delivery_plans p
    join app.workspace_reopened_exception_triage_cycles t
      on t.workspace_id=p.workspace_id and t.retriage_id=p.retriage_id
    join app.workspace_reconciliation_exception_reopens reopen
      on reopen.workspace_id=p.workspace_id and reopen.reopen_id=p.reopen_id
    join app.workspace_post_closure_regression_checks regression
      on regression.workspace_id=p.workspace_id
     and regression.regression_check_id=p.regression_check_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    join app.workspace_corrective_live_deliveries predecessor
      on predecessor.workspace_id=p.workspace_id
     and predecessor.delivery_id=p.predecessor_corrective_delivery_id
    where p.workspace_id=workspace_successor_corrective_delivery_activations.workspace_id
      and p.successor_plan_id=workspace_successor_corrective_delivery_activations.successor_plan_id
      and p.retriage_id=workspace_successor_corrective_delivery_activations.retriage_id
      and p.reopen_id=workspace_successor_corrective_delivery_activations.reopen_id
      and p.regression_check_id=workspace_successor_corrective_delivery_activations.regression_check_id
      and p.case_id=workspace_successor_corrective_delivery_activations.case_id
      and p.target=workspace_successor_corrective_delivery_activations.target
      and p.status='approved'
      and p.plan_fingerprint=workspace_successor_corrective_delivery_activations.successor_plan_fingerprint
      and p.source_regression_fingerprint=workspace_successor_corrective_delivery_activations.source_regression_fingerprint
      and t.status='approved'
      and regression.status='regressed'
      and regression.verification_fingerprint=p.source_regression_fingerprint
      and c.status='open'
      and predecessor.status='accepted'
      and predecessor.delivery_id=workspace_successor_corrective_delivery_activations.predecessor_corrective_delivery_id
      and predecessor.consumer_id=workspace_successor_corrective_delivery_activations.consumer_id
      and predecessor.corrective_package_id=workspace_successor_corrective_delivery_activations.predecessor_corrective_package_id
      and predecessor.corrective_replay_key=workspace_successor_corrective_delivery_activations.predecessor_corrective_replay_key
      and predecessor.corrective_package_fingerprint=workspace_successor_corrective_delivery_activations.predecessor_corrective_package_fingerprint
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successor_corrective_delivery_activations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_successor_corrective_delivery_activations_manager_update
  on app.workspace_successor_corrective_delivery_activations;
create policy workspace_successor_corrective_delivery_activations_manager_update
on app.workspace_successor_corrective_delivery_activations
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successor_corrective_delivery_activations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successor_corrective_delivery_activations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_successor_corrective_live_deliveries_member_select
  on app.workspace_successor_corrective_live_deliveries;
create policy workspace_successor_corrective_live_deliveries_member_select
on app.workspace_successor_corrective_live_deliveries
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successor_corrective_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workspace_successor_corrective_live_deliveries_manager_insert
  on app.workspace_successor_corrective_live_deliveries;
create policy workspace_successor_corrective_live_deliveries_manager_insert
on app.workspace_successor_corrective_live_deliveries
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1
    from app.workspace_successor_corrective_delivery_activations a
    join app.workspace_successor_corrective_delivery_plans p
      on p.workspace_id=a.workspace_id and p.successor_plan_id=a.successor_plan_id
    join app.workspace_reopened_exception_triage_cycles t
      on t.workspace_id=p.workspace_id and t.retriage_id=p.retriage_id
    join app.workspace_post_closure_regression_checks regression
      on regression.workspace_id=p.workspace_id
     and regression.regression_check_id=p.regression_check_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    where a.workspace_id=workspace_successor_corrective_live_deliveries.workspace_id
      and a.activation_id=workspace_successor_corrective_live_deliveries.activation_id
      and a.successor_plan_id=workspace_successor_corrective_live_deliveries.successor_plan_id
      and a.predecessor_corrective_delivery_id=workspace_successor_corrective_live_deliveries.predecessor_corrective_delivery_id
      and a.target=workspace_successor_corrective_live_deliveries.target
      and a.consumer_id=workspace_successor_corrective_live_deliveries.consumer_id
      and a.successor_plan_fingerprint=workspace_successor_corrective_live_deliveries.successor_plan_fingerprint
      and a.activation_fingerprint=workspace_successor_corrective_live_deliveries.activation_fingerprint
      and a.successor_package_id=workspace_successor_corrective_live_deliveries.successor_package_id
      and a.successor_replay_key=workspace_successor_corrective_live_deliveries.successor_replay_key
      and a.successor_package_fingerprint=workspace_successor_corrective_live_deliveries.successor_package_fingerprint
      and workspace_successor_corrective_live_deliveries.idempotency_key=a.successor_replay_key
      and a.status='active'
      and a.expires_at>now()
      and p.status='approved'
      and t.status='approved'
      and regression.status='regressed'
      and c.status='open'
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successor_corrective_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_successor_corrective_live_deliveries_manager_update
  on app.workspace_successor_corrective_live_deliveries;
create policy workspace_successor_corrective_live_deliveries_manager_update
on app.workspace_successor_corrective_live_deliveries
for update to ai_data_runtime
using (
  exists (
    select 1
    from app.workspace_successor_corrective_delivery_plans p
    join app.workspace_reopened_exception_triage_cycles t
      on t.workspace_id=p.workspace_id and t.retriage_id=p.retriage_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    where p.workspace_id=workspace_successor_corrective_live_deliveries.workspace_id
      and p.successor_plan_id=workspace_successor_corrective_live_deliveries.successor_plan_id
      and p.status='approved'
      and t.status='approved'
      and c.status='open'
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successor_corrective_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1
    from app.workspace_successor_corrective_delivery_plans p
    join app.workspace_reopened_exception_triage_cycles t
      on t.workspace_id=p.workspace_id and t.retriage_id=p.retriage_id
    join app.workspace_reconciliation_exception_cases c
      on c.workspace_id=p.workspace_id and c.case_id=p.case_id
    where p.workspace_id=workspace_successor_corrective_live_deliveries.workspace_id
      and p.successor_plan_id=workspace_successor_corrective_live_deliveries.successor_plan_id
      and p.status='approved'
      and t.status='approved'
      and c.status='open'
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_successor_corrective_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_corrective_delivery_activations_manager_insert
  on app.workspace_corrective_delivery_activations;
create policy workspace_corrective_delivery_activations_manager_insert
on app.workspace_corrective_delivery_activations
for insert to ai_data_runtime
with check (
  activated_by=nullif(current_setting('app.user_id',true),'')
  and not exists (
    select 1
    from app.workspace_corrective_delivery_plans p
    join app.workspace_reconciliation_exception_reopens reopen
      on reopen.workspace_id=p.workspace_id and reopen.case_id=p.case_id
    where p.workspace_id=workspace_corrective_delivery_activations.workspace_id
      and p.plan_id=workspace_corrective_delivery_activations.plan_id
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_delivery_activations.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_corrective_live_deliveries_manager_insert
  on app.workspace_corrective_live_deliveries;
create policy workspace_corrective_live_deliveries_manager_insert
on app.workspace_corrective_live_deliveries
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and not exists (
    select 1
    from app.workspace_corrective_delivery_plans p
    join app.workspace_reconciliation_exception_reopens reopen
      on reopen.workspace_id=p.workspace_id and reopen.case_id=p.case_id
    where p.workspace_id=workspace_corrective_live_deliveries.workspace_id
      and p.plan_id=workspace_corrective_live_deliveries.plan_id
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_corrective_live_deliveries_manager_update
  on app.workspace_corrective_live_deliveries;
create policy workspace_corrective_live_deliveries_manager_update
on app.workspace_corrective_live_deliveries
for update to ai_data_runtime
using (
  not exists (
    select 1
    from app.workspace_corrective_delivery_plans p
    join app.workspace_reconciliation_exception_reopens reopen
      on reopen.workspace_id=p.workspace_id and reopen.case_id=p.case_id
    where p.workspace_id=workspace_corrective_live_deliveries.workspace_id
      and p.plan_id=workspace_corrective_live_deliveries.plan_id
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  not exists (
    select 1
    from app.workspace_corrective_delivery_plans p
    join app.workspace_reconciliation_exception_reopens reopen
      on reopen.workspace_id=p.workspace_id and reopen.case_id=p.case_id
    where p.workspace_id=workspace_corrective_live_deliveries.workspace_id
      and p.plan_id=workspace_corrective_live_deliveries.plan_id
  )
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspace_corrective_live_deliveries.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);
