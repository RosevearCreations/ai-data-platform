-- Build 296 — Shared Media & Asset Exchange
-- Store canonical media metadata and source references without binary uploads.
-- Exchange packages remain internal/held; no peer-application delivery is authorized.

create table if not exists app.shared_media_assets (
  asset_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  canonical_tenant_key text not null
    check (canonical_tenant_key ~ '^[a-z0-9][a-z0-9._:-]{1,119}$'),
  dedupe_sha256 text not null
    check (dedupe_sha256 ~ '^[a-f0-9]{64}$'),
  dedupe_basis text not null
    check (dedupe_basis in ('content-sha256','reference-url-sha256')),
  media_type text not null
    check (media_type in ('image','video','document','audio')),
  asset_kind text not null
    check (asset_kind in (
      'photo',
      'document',
      'receipt',
      'generated-media',
      'video',
      'audio'
    )),
  mime_type text
    check (
      mime_type is null
      or (
        length(mime_type) between 3 and 120
        and mime_type ~ '^[A-Za-z0-9][A-Za-z0-9.+_-]*/[A-Za-z0-9][A-Za-z0-9.+_-]*$'
      )
    ),
  byte_size bigint
    check (byte_size is null or (byte_size >= 0 and byte_size <= 10737418240)),
  content_sha256 text
    check (content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$'),
  first_recorded_by text not null references auth."user"(id) on delete restrict,
  first_recorded_at timestamptz not null default now(),
  unique (workspace_id,canonical_tenant_key,dedupe_sha256)
);

create table if not exists app.shared_media_references (
  reference_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  asset_id uuid not null references app.shared_media_assets(asset_id) on delete restrict,
  source_application_id text not null
    check (source_application_id in (
      'devilndove',
      'rosiedazzlers',
      'yard-workers',
      'icamp',
      'rosevear-comms-hub',
      'rosevear-ai-hub'
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
  asset_kind text not null
    check (asset_kind in (
      'photo',
      'document',
      'receipt',
      'generated-media',
      'video',
      'audio'
    )),
  owner_kind text
    check (
      owner_kind is null
      or (
        length(owner_kind) between 1 and 80
        and owner_kind !~ '[[:cntrl:]]'
      )
    ),
  owner_record_id text
    check (
      owner_record_id is null
      or (
        length(owner_record_id) between 1 and 160
        and owner_record_id !~ '[[:cntrl:]]'
      )
    ),
  source_url text not null
    check (
      length(source_url) between 8 and 2048
      and source_url like 'https://%'
      and source_url !~ '[[:cntrl:]]'
    ),
  contract_id text not null default 'rosevear.shared.media.v1'
    check (contract_id='rosevear.shared.media.v1'),
  contract_version text not null default '1.0.0'
    check (contract_version='1.0.0'),
  portable_record jsonb not null
    check (
      jsonb_typeof(portable_record)='object'
      and octet_length(portable_record::text) <= 32768
    ),
  reference_sha256 text not null
    check (reference_sha256 ~ '^[a-f0-9]{64}$'),
  recorded_by text not null references auth."user"(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  check (portable_record->>'url'=source_url),
  check (portable_record->>'mediaType' in ('image','video','document','audio')),
  unique (
    workspace_id,
    source_application_id,
    canonical_tenant_key,
    source_record_id,
    reference_sha256
  )
);

create table if not exists app.shared_media_exchange_packages (
  package_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  source_reference_id uuid not null
    references app.shared_media_references(reference_id) on delete restrict,
  destination_application_id text not null
    check (destination_application_id in (
      'devilndove',
      'rosiedazzlers',
      'yard-workers',
      'icamp',
      'rosevear-comms-hub',
      'rosevear-ai-hub'
    )),
  destination_tenant_key text not null
    check (destination_tenant_key ~ '^[a-z0-9][a-z0-9._:-]{1,119}$'),
  contract_id text not null default 'rosevear.shared.media.v1'
    check (contract_id='rosevear.shared.media.v1'),
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
  hold_reason text not null default 'media-exchange-not-authorized'
    check (hold_reason='media-exchange-not-authorized'),
  created_by text not null references auth."user"(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (
    source_reference_id,
    destination_application_id,
    destination_tenant_key,
    payload_sha256
  )
);

create table if not exists app.shared_media_exchange_reviews (
  review_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  package_id uuid not null unique
    references app.shared_media_exchange_packages(package_id) on delete restrict,
  decision text not null check (decision in ('approve','reject')),
  reason text not null
    check (
      length(reason) between 8 and 500
      and reason !~ '[[:cntrl:]]'
    ),
  reviewed_by text not null references auth."user"(id) on delete restrict,
  reviewed_at timestamptz not null default now()
);

create table if not exists app.shared_media_exchange_audit (
  audit_id uuid primary key,
  workspace_id uuid not null references app.workspaces(id) on delete restrict,
  actor_user_id text not null references auth."user"(id) on delete restrict,
  action text not null
    check (action in (
      'asset-created',
      'asset-reused',
      'reference-recorded',
      'package-prepared',
      'package-approved-for-future-transport',
      'package-rejected'
    )),
  asset_id uuid references app.shared_media_assets(asset_id) on delete restrict,
  reference_id uuid references app.shared_media_references(reference_id) on delete restrict,
  package_id uuid references app.shared_media_exchange_packages(package_id) on delete restrict,
  details jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(details)='object'
      and octet_length(details::text) <= 16384
    ),
  occurred_at timestamptz not null default now()
);

create index if not exists shared_media_assets_workspace_recent_idx
  on app.shared_media_assets(workspace_id,first_recorded_at desc);
create index if not exists shared_media_references_workspace_recent_idx
  on app.shared_media_references(workspace_id,recorded_at desc);
create index if not exists shared_media_references_asset_idx
  on app.shared_media_references(asset_id,recorded_at desc);
create index if not exists shared_media_exchange_packages_workspace_recent_idx
  on app.shared_media_exchange_packages(workspace_id,created_at desc);
create index if not exists shared_media_exchange_reviews_workspace_recent_idx
  on app.shared_media_exchange_reviews(workspace_id,reviewed_at desc);
create index if not exists shared_media_exchange_audit_workspace_recent_idx
  on app.shared_media_exchange_audit(workspace_id,occurred_at desc);

grant select, insert on app.shared_media_assets to ai_data_runtime;
grant select, insert on app.shared_media_references to ai_data_runtime;
grant select, insert on app.shared_media_exchange_packages to ai_data_runtime;
grant select, insert on app.shared_media_exchange_reviews to ai_data_runtime;
grant select, insert on app.shared_media_exchange_audit to ai_data_runtime;

revoke all on app.shared_media_assets from public;
revoke all on app.shared_media_references from public;
revoke all on app.shared_media_exchange_packages from public;
revoke all on app.shared_media_exchange_reviews from public;
revoke all on app.shared_media_exchange_audit from public;

alter table app.shared_media_assets enable row level security;
alter table app.shared_media_references enable row level security;
alter table app.shared_media_exchange_packages enable row level security;
alter table app.shared_media_exchange_reviews enable row level security;
alter table app.shared_media_exchange_audit enable row level security;

drop policy if exists shared_media_assets_read on app.shared_media_assets;
create policy shared_media_assets_read
on app.shared_media_assets
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=shared_media_assets.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists shared_media_assets_insert on app.shared_media_assets;
create policy shared_media_assets_insert
on app.shared_media_assets
for insert to ai_data_runtime
with check (
  first_recorded_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=shared_media_assets.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists shared_media_references_read on app.shared_media_references;
create policy shared_media_references_read
on app.shared_media_references
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=shared_media_references.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists shared_media_references_insert on app.shared_media_references;
create policy shared_media_references_insert
on app.shared_media_references
for insert to ai_data_runtime
with check (
  recorded_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=shared_media_references.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists shared_media_exchange_packages_read on app.shared_media_exchange_packages;
create policy shared_media_exchange_packages_read
on app.shared_media_exchange_packages
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=shared_media_exchange_packages.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists shared_media_exchange_packages_insert on app.shared_media_exchange_packages;
create policy shared_media_exchange_packages_insert
on app.shared_media_exchange_packages
for insert to ai_data_runtime
with check (
  created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=shared_media_exchange_packages.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists shared_media_exchange_reviews_read on app.shared_media_exchange_reviews;
create policy shared_media_exchange_reviews_read
on app.shared_media_exchange_reviews
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=shared_media_exchange_reviews.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists shared_media_exchange_reviews_insert on app.shared_media_exchange_reviews;
create policy shared_media_exchange_reviews_insert
on app.shared_media_exchange_reviews
for insert to ai_data_runtime
with check (
  reviewed_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=shared_media_exchange_reviews.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists shared_media_exchange_audit_read on app.shared_media_exchange_audit;
create policy shared_media_exchange_audit_read
on app.shared_media_exchange_audit
for select to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=shared_media_exchange_audit.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists shared_media_exchange_audit_insert on app.shared_media_exchange_audit;
create policy shared_media_exchange_audit_insert
on app.shared_media_exchange_audit
for insert to ai_data_runtime
with check (
  actor_user_id=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=shared_media_exchange_audit.workspace_id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);
