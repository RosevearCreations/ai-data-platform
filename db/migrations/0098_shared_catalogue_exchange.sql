-- Build 295 — Shared Product, Service & Catalogue Exchange
-- Standardize catalogue snapshots and reviewed exchange packages.
-- Packages remain internal/held; no peer-application delivery is authorized.

create table if not exists app.catalogue_exchange_items (
  item_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  source_application_id text not null
    check (source_application_id in (
      'devilndove',
      'rosiedazzlers',
      'yard-workers',
      'icamp'
    )),
  canonical_tenant_key text not null
    check (canonical_tenant_key ~ '^[a-z0-9][a-z0-9._:-]{1,119}$'),
  source_record_id text not null
    check (
      length(source_record_id) between 1 and 160
      and source_record_id !~ '[[:cntrl:]]'
    ),
  source_record_version text
    check (
      source_record_version is null
      or (
        length(source_record_version) between 1 and 120
        and source_record_version !~ '[[:cntrl:]]'
      )
    ),
  item_kind text not null
    check (item_kind in (
      'product',
      'service',
      'package',
      'addon',
      'campsite',
      'amenity',
      'rental'
    )),
  contract_id text not null
    check (contract_id in (
      'rosevear.shared.product.v1',
      'rosevear.shared.service.v1'
    )),
  contract_version text not null default '1.0.0'
    check (contract_version='1.0.0'),
  portable_record jsonb not null
    check (
      jsonb_typeof(portable_record)='object'
      and octet_length(portable_record::text) <= 32768
    ),
  content_sha256 text not null
    check (content_sha256 ~ '^[a-f0-9]{64}$'),
  recorded_by text not null references auth."user"(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  check (
    (item_kind='product' and contract_id='rosevear.shared.product.v1')
    or
    (item_kind<>'product' and contract_id='rosevear.shared.service.v1')
  ),
  check (portable_record->>'sourceApplicationId'=source_application_id),
  check (portable_record->>'sourceRecordId'=source_record_id),
  check (portable_record->>'tenantKey'=canonical_tenant_key),
  unique (
    workspace_id,
    source_application_id,
    canonical_tenant_key,
    source_record_id,
    content_sha256
  )
);

create table if not exists app.catalogue_exchange_packages (
  package_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  source_item_id uuid not null
    references app.catalogue_exchange_items(item_id) on delete restrict,
  destination_application_id text not null
    check (destination_application_id in (
      'devilndove',
      'rosiedazzlers',
      'yard-workers',
      'icamp'
    )),
  destination_tenant_key text not null
    check (destination_tenant_key ~ '^[a-z0-9][a-z0-9._:-]{1,119}$'),
  contract_id text not null
    check (contract_id in (
      'rosevear.shared.product.v1',
      'rosevear.shared.service.v1'
    )),
  contract_version text not null default '1.0.0'
    check (contract_version='1.0.0'),
  payload jsonb not null
    check (
      jsonb_typeof(payload)='object'
      and octet_length(payload::text) <= 49152
    ),
  payload_sha256 text not null
    check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  state text not null default 'held'
    check (state='held'),
  hold_reason text not null default 'catalogue-exchange-not-authorized'
    check (hold_reason='catalogue-exchange-not-authorized'),
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (
    source_item_id,
    destination_application_id,
    destination_tenant_key,
    payload_sha256
  )
);

create table if not exists app.catalogue_exchange_reviews (
  review_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  package_id uuid not null unique
    references app.catalogue_exchange_packages(package_id) on delete restrict,
  decision text not null
    check (decision in ('approve','reject')),
  reason text not null
    check (
      length(reason) between 8 and 500
      and reason !~ '[[:cntrl:]]'
    ),
  reviewed_by text not null references auth."user"(id) on delete restrict,
  reviewed_at timestamptz not null default now()
);

create table if not exists app.catalogue_exchange_audit (
  audit_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  action text not null
    check (action in (
      'item-recorded',
      'package-prepared',
      'package-approved-for-future-transport',
      'package-rejected'
    )),
  item_id uuid
    references app.catalogue_exchange_items(item_id) on delete restrict,
  package_id uuid
    references app.catalogue_exchange_packages(package_id) on delete restrict,
  details jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(details)='object'
      and octet_length(details::text) <= 16384
    ),
  occurred_at timestamptz not null default now()
);

create index if not exists catalogue_exchange_items_workspace_recent_idx
  on app.catalogue_exchange_items(workspace_id,recorded_at desc);
create index if not exists catalogue_exchange_items_source_idx
  on app.catalogue_exchange_items(
    workspace_id,source_application_id,canonical_tenant_key,source_record_id
  );
create index if not exists catalogue_exchange_packages_workspace_recent_idx
  on app.catalogue_exchange_packages(workspace_id,created_at desc);
create index if not exists catalogue_exchange_reviews_workspace_recent_idx
  on app.catalogue_exchange_reviews(workspace_id,reviewed_at desc);
create index if not exists catalogue_exchange_audit_workspace_recent_idx
  on app.catalogue_exchange_audit(workspace_id,occurred_at desc);

grant select, insert on app.catalogue_exchange_items to ai_data_runtime;
grant select, insert on app.catalogue_exchange_packages to ai_data_runtime;
grant select, insert on app.catalogue_exchange_reviews to ai_data_runtime;
grant select, insert on app.catalogue_exchange_audit to ai_data_runtime;

revoke all on app.catalogue_exchange_items from public;
revoke all on app.catalogue_exchange_packages from public;
revoke all on app.catalogue_exchange_reviews from public;
revoke all on app.catalogue_exchange_audit from public;

alter table app.catalogue_exchange_items enable row level security;
alter table app.catalogue_exchange_packages enable row level security;
alter table app.catalogue_exchange_reviews enable row level security;
alter table app.catalogue_exchange_audit enable row level security;

drop policy if exists catalogue_exchange_items_read on app.catalogue_exchange_items;
create policy catalogue_exchange_items_read
on app.catalogue_exchange_items
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=catalogue_exchange_items.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists catalogue_exchange_items_insert on app.catalogue_exchange_items;
create policy catalogue_exchange_items_insert
on app.catalogue_exchange_items
for insert to ai_data_runtime
with check (
  recorded_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=catalogue_exchange_items.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists catalogue_exchange_packages_read on app.catalogue_exchange_packages;
create policy catalogue_exchange_packages_read
on app.catalogue_exchange_packages
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=catalogue_exchange_packages.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists catalogue_exchange_packages_insert on app.catalogue_exchange_packages;
create policy catalogue_exchange_packages_insert
on app.catalogue_exchange_packages
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=catalogue_exchange_packages.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists catalogue_exchange_reviews_read on app.catalogue_exchange_reviews;
create policy catalogue_exchange_reviews_read
on app.catalogue_exchange_reviews
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=catalogue_exchange_reviews.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists catalogue_exchange_reviews_insert on app.catalogue_exchange_reviews;
create policy catalogue_exchange_reviews_insert
on app.catalogue_exchange_reviews
for insert to ai_data_runtime
with check (
  reviewed_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=catalogue_exchange_reviews.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists catalogue_exchange_audit_read on app.catalogue_exchange_audit;
create policy catalogue_exchange_audit_read
on app.catalogue_exchange_audit
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=catalogue_exchange_audit.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists catalogue_exchange_audit_insert on app.catalogue_exchange_audit;
create policy catalogue_exchange_audit_insert
on app.catalogue_exchange_audit
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=catalogue_exchange_audit.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);
