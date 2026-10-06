create table if not exists app.extension_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references auth."user"(id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  extension_id text not null check (extension_id ~ '^[a-p]{32}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists extension_sessions_user_id_idx
  on app.extension_sessions(user_id);

create index if not exists extension_sessions_expires_at_idx
  on app.extension_sessions(expires_at);

comment on table app.extension_sessions is
  'Build 019 hashed short-lived bearer sessions issued through an authenticated Chrome identity web flow. This table is intentionally not granted to ai_data_runtime.';
