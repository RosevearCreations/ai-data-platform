create table if not exists app.workspace_profiles (
  profile_key text primary key,
  name text not null,
  description text not null default '',
  workspace_type text not null check (workspace_type in ('business','personal')),
  normalization_fields jsonb not null default '[]'::jsonb check (jsonb_typeof(normalization_fields)='array'),
  review_dimensions jsonb not null default '[]'::jsonb check (jsonb_typeof(review_dimensions)='array'),
  provenance_policy jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance_policy)='object'),
  history_policy jsonb not null default '{}'::jsonb check (jsonb_typeof(history_policy)='object'),
  review_policy jsonb not null default '{}'::jsonb check (jsonb_typeof(review_policy)='object'),
  templates jsonb not null default '[]'::jsonb check (jsonb_typeof(templates)='array'),
  capabilities jsonb not null default '{}'::jsonb check (jsonb_typeof(capabilities)='object'),
  is_builtin boolean not null default false,
  created_by text references auth."user"(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into app.workspace_profiles (
  profile_key,name,description,workspace_type,normalization_fields,
  review_dimensions,provenance_policy,history_policy,review_policy,
  templates,capabilities,is_builtin
) values
('rosie-detailing','Rosie Detailing','Vehicle-detailing competitive intelligence, services, pricing and local-market evidence.','business',
 '[{"key":"business_name","label":"Business Name","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"offering_name","label":"Offering Name","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"category","label":"Category","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"price","label":"Price","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"vehicle_size","label":"Vehicle Size","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"service_area","label":"Service Area","kind":"text","transforms":["trim","collapse-whitespace"]}]',
 '[{"key":"identity","label":"Identity","required":true},{"key":"pricing","label":"Pricing","required":true},{"key":"service_scope","label":"Service Scope","required":true},{"key":"source_evidence","label":"Source Evidence","required":true}]',
 '{"requireSourceUrl":true,"requireRetrievedAt":true,"retainRawEvidence":false}',
 '{"enabled":true,"identityStrategy":"operator-defined","snapshotLimit":500}',
 '{"mode":"explicit","requireHumanApproval":true,"allowAutomaticWrites":false}',
 '[{"id":"default","name":"Detailing competitive intelligence","fieldKeys":["business_name","offering_name","category","price","vehicle_size","service_area"]}]',
 '{"history":true,"sourcePolicy":true,"scheduledJobs":true,"remoteExecution":true,"barcodeIntake":false,"businessIntegrations":true}',true),
('maker-commerce','Maker Commerce','Supplier, product, tool, material and inventory intelligence for maker businesses.','business',
 '[{"key":"supplier_name","label":"Supplier Name","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"product_name","label":"Product Name","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"supplier_sku","label":"Supplier Sku","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"package_price","label":"Package Price","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"stock_unit","label":"Stock Unit","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"usage_unit","label":"Usage Unit","kind":"text","transforms":["trim","collapse-whitespace"]}]',
 '[{"key":"identity","label":"Identity","required":true},{"key":"supplier","label":"Supplier","required":true},{"key":"unit_economics","label":"Unit Economics","required":true},{"key":"source_evidence","label":"Source Evidence","required":true}]',
 '{"requireSourceUrl":true,"requireRetrievedAt":true,"retainRawEvidence":false}',
 '{"enabled":true,"identityStrategy":"operator-defined","snapshotLimit":500}',
 '{"mode":"explicit","requireHumanApproval":true,"allowAutomaticWrites":false}',
 '[{"id":"default","name":"Supplier and inventory staging","fieldKeys":["supplier_name","product_name","supplier_sku","package_price","stock_unit","usage_unit"]}]',
 '{"history":true,"sourcePolicy":true,"scheduledJobs":true,"remoteExecution":true,"barcodeIntake":true,"businessIntegrations":true}',true),
('personal-media','Personal Media','Private movie/media metadata enrichment with explicit ownership review boundaries.','personal',
 '[{"key":"title","label":"Title","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"year","label":"Year","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"barcode","label":"Barcode","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"format","label":"Format","kind":"text","transforms":["trim","collapse-whitespace"]}]',
 '[{"key":"identity","label":"Identity","required":true},{"key":"metadata_accuracy","label":"Metadata Accuracy","required":true},{"key":"ownership_boundary","label":"Ownership Boundary","required":true},{"key":"source_evidence","label":"Source Evidence","required":true}]',
 '{"requireSourceUrl":true,"requireRetrievedAt":true,"retainRawEvidence":false}',
 '{"enabled":true,"identityStrategy":"operator-defined","snapshotLimit":500}',
 '{"mode":"explicit","requireHumanApproval":true,"allowAutomaticWrites":false}',
 '[{"id":"default","name":"Personal media metadata","fieldKeys":["title","year","barcode","format"]}]',
 '{"history":true,"sourcePolicy":true,"scheduledJobs":false,"remoteExecution":false,"barcodeIntake":true,"businessIntegrations":false}',true),
('generic-business','Generic Business','Conservative reusable business profile for a new domain before specialized capabilities are enabled.','business',
 '[{"key":"name","label":"Name","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"source_url","label":"Source Url","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"retrieved_at","label":"Retrieved At","kind":"text","transforms":["trim","collapse-whitespace"]}]',
 '[{"key":"identity","label":"Identity","required":true},{"key":"source_evidence","label":"Source Evidence","required":true},{"key":"accuracy","label":"Accuracy","required":true}]',
 '{"requireSourceUrl":true,"requireRetrievedAt":true,"retainRawEvidence":false}',
 '{"enabled":true,"identityStrategy":"operator-defined","snapshotLimit":500}',
 '{"mode":"explicit","requireHumanApproval":true,"allowAutomaticWrites":false}',
 '[{"id":"default","name":"Default extraction","fieldKeys":["name","source_url","retrieved_at"]}]',
 '{"history":true,"sourcePolicy":true,"scheduledJobs":false,"remoteExecution":false,"barcodeIntake":false,"businessIntegrations":false}',true),
('generic-personal','Generic Personal','Conservative reusable personal profile with no automatic downstream writes.','personal',
 '[{"key":"name","label":"Name","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"source_url","label":"Source Url","kind":"text","transforms":["trim","collapse-whitespace"]},{"key":"retrieved_at","label":"Retrieved At","kind":"text","transforms":["trim","collapse-whitespace"]}]',
 '[{"key":"identity","label":"Identity","required":true},{"key":"source_evidence","label":"Source Evidence","required":true},{"key":"accuracy","label":"Accuracy","required":true}]',
 '{"requireSourceUrl":true,"requireRetrievedAt":true,"retainRawEvidence":false}',
 '{"enabled":true,"identityStrategy":"operator-defined","snapshotLimit":500}',
 '{"mode":"explicit","requireHumanApproval":true,"allowAutomaticWrites":false}',
 '[{"id":"default","name":"Default extraction","fieldKeys":["name","source_url","retrieved_at"]}]',
 '{"history":true,"sourcePolicy":true,"scheduledJobs":false,"remoteExecution":false,"barcodeIntake":false,"businessIntegrations":false}',true)
on conflict (profile_key) do update set
 name=excluded.name,description=excluded.description,workspace_type=excluded.workspace_type,
 normalization_fields=excluded.normalization_fields,review_dimensions=excluded.review_dimensions,
 provenance_policy=excluded.provenance_policy,history_policy=excluded.history_policy,
 review_policy=excluded.review_policy,templates=excluded.templates,
 capabilities=excluded.capabilities,is_builtin=true,updated_at=now();

alter table app.workspaces
  add column if not exists profile_key text,
  add column if not exists purpose text not null default '',
  add column if not exists archived_at timestamptz,
  add column if not exists created_by text references auth."user"(id) on delete set null;

update app.workspaces set profile_key = case
  when slug='rosiedazzlers' then 'rosie-detailing'
  when slug='devilndove' then 'maker-commerce'
  when slug='personal' then 'personal-media'
  when type='personal' then 'generic-personal'
  else 'generic-business'
end where profile_key is null;

alter table app.workspaces alter column profile_key set not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='workspaces_profile_key_fkey') then
    alter table app.workspaces add constraint workspaces_profile_key_fkey
      foreign key (profile_key) references app.workspace_profiles(profile_key);
  end if;
end $$;

create index if not exists workspaces_profile_key_idx on app.workspaces(profile_key);

grant select,insert,update on app.workspace_profiles to ai_data_runtime;
grant update on app.workspaces to ai_data_runtime;
alter table app.workspace_profiles enable row level security;

drop policy if exists workspace_profile_read on app.workspace_profiles;
create policy workspace_profile_read on app.workspace_profiles
for select to ai_data_runtime using (
  is_builtin=true
  or created_by=nullif(current_setting('app.user_id',true),'')
  or exists (
    select 1 from app.workspaces w
    join app.workspace_members wm on wm.workspace_id=w.id
    where w.profile_key=workspace_profiles.profile_key
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
  )
);

drop policy if exists workspace_profile_insert on app.workspace_profiles;
create policy workspace_profile_insert on app.workspace_profiles
for insert to ai_data_runtime with check (
  is_builtin=false
  and created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_profile_update on app.workspace_profiles;
create policy workspace_profile_update on app.workspace_profiles
for update to ai_data_runtime
using (
  is_builtin=false
  and created_by=nullif(current_setting('app.user_id',true),'')
  and exists (
    select 1 from app.workspace_members wm
    where wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  is_builtin=false
  and created_by=nullif(current_setting('app.user_id',true),'')
);

drop policy if exists workspace_admin_update on app.workspaces;
create policy workspace_admin_update on app.workspaces
for update to ai_data_runtime
using (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspaces.id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from app.workspace_members wm
    where wm.workspace_id=workspaces.id
      and wm.user_id=nullif(current_setting('app.user_id',true),'')
      and wm.role in ('owner','admin')
  )
);

create or replace function app.create_profiled_workspace(
  p_slug text,p_name text,p_purpose text,p_profile_key text
) returns uuid
language plpgsql security definer set search_path=app,public
as $$
declare
  v_user_id text := nullif(current_setting('app.user_id',true),'');
  v_workspace_type text;
  v_workspace_id uuid;
begin
  if v_user_id is null then raise exception 'workspace_access_denied'; end if;
  if not exists (
    select 1 from app.workspace_members wm
    where wm.user_id=v_user_id and wm.role in ('owner','admin')
  ) then raise exception 'workspace_profile_manager_required'; end if;

  select p.workspace_type into v_workspace_type
  from app.workspace_profiles p
  where p.profile_key=p_profile_key and p.archived_at is null
    and (
      p.is_builtin=true or p.created_by=v_user_id
      or exists (
        select 1 from app.workspaces w
        join app.workspace_members wm on wm.workspace_id=w.id
        where w.profile_key=p.profile_key and wm.user_id=v_user_id
      )
    )
  limit 1;

  if v_workspace_type is null then raise exception 'workspace_profile_not_available'; end if;
  if p_slug !~ '^[a-z0-9][a-z0-9-]{2,62}$' then raise exception 'workspace_slug_invalid'; end if;

  insert into app.workspaces(slug,name,type,profile_key,purpose,created_by)
  values (
    p_slug,left(trim(p_name),120),v_workspace_type,p_profile_key,
    left(trim(coalesce(p_purpose,'')),1000),v_user_id
  ) returning id into v_workspace_id;

  insert into app.workspace_members(workspace_id,user_id,role)
  values (v_workspace_id,v_user_id,'owner');

  return v_workspace_id;
end;
$$;

revoke all on function app.create_profiled_workspace(text,text,text,text) from public;
grant execute on function app.create_profiled_workspace(text,text,text,text) to ai_data_runtime;
