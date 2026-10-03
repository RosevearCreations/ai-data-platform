# Database

The AI Data Platform uses standard PostgreSQL.

## Schemas

- `auth` — Better Auth tables and sessions.
- `app` — platform/workspace data.

## Runtime isolation

The application connects with the database owner connection but does not issue application queries directly as that role.

Every user-scoped operation:

1. opens a transaction;
2. uses `SET LOCAL ROLE ai_data_runtime`;
3. sets `app.user_id` with `set_config(..., true)`;
4. executes the query;
5. commits or rolls back.

The `ai_data_runtime` role is not the table owner, so PostgreSQL row-level-security policies apply. `SET LOCAL` keeps the identity value transaction-scoped so it cannot leak between pooled requests.

## Initial workspaces

The first migration seeds:

- Rosie Dazzlers
- Devil n Dove
- Personal

The first Better Auth user is assigned the `owner` role for all three. Later accounts receive no workspace membership automatically.

## Migrations

Migrations are executed by the web package's `db:migrate` command. We keep SQL migrations in this directory so the schema remains portable across managed PostgreSQL providers.
