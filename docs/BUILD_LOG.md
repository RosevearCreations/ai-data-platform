# Build Log

## Build 000 — Shared AI Data Platform Foundation & Source of Truth

Date: 2026-10-02

Status: COMPLETE. Promotion is performed through the Build 000 pull request.

### Goal

Create a durable source of truth before application code.

### Delivered

- repository README and development workflow;
- product definition;
- architecture;
- canonical data model;
- AI responsibilities and cost controls;
- scraping/source-use policy;
- security baseline;
- numbered roadmap;
- durable architectural decision record.

### Acceptance

- shared platform scope is explicit;
- Rosie Dazzlers, Devil n Dove and Personal are defined as separate workspaces;
- local-first Chrome extension architecture is established;
- AI is separated from deterministic bulk extraction;
- external observations require provenance;
- production integration writes require an approval boundary by default;
- Build 001 has a concrete executable target.

### Next

Build 001 — Monorepo, Web App & Chrome Extension Shell.

## Build 001 — Monorepo, Web App & Chrome Extension Shell

Date: 2026-10-02

Status: COMPLETE. Promotion is performed through the Build 001 pull request.

### Goal

Create the first executable platform baseline with independently buildable web and browser-extension applications.

### Delivered

- pnpm workspace monorepo;
- Node.js 24 baseline;
- Next.js 16.3.8 App Router web shell;
- React 19.3.0 UI baseline;
- Chrome Manifest V3 side-panel extension shell;
- least-privilege extension manifest using only the `sidePanel` permission;
- Vite-based extension production build;
- shared TypeScript contracts package;
- shared TypeScript compiler baseline;
- ESLint 10-compatible web lint configuration;
- exact direct dependency versions;
- committed `pnpm-lock.yaml`;
- CI verification using frozen-lockfile installation;
- development and Chrome extension loading documentation.

### Verification

The Build 001 `dev` workflow verified:

- dependency installation;
- TypeScript checks for web, extension and contracts;
- lint/static checks;
- Next.js production build;
- Chrome extension production build;
- shared-contract smoke test.

### Security notes

- no Supabase keys or runtime secrets exist in Build 001;
- the extension has no host permissions, `activeTab`, or scripting permission;
- dependency lifecycle scripts are denied by default except the explicitly reviewed `unrs-resolver@1.12.2` build required by the lint toolchain.

### Next

Build 002 — Supabase Auth & Workspace Isolation.

## Build 002 — PostgreSQL Auth & Workspace Isolation

Date: 2026-10-03

Status: COMPLETE. Promotion is performed through the Build 002 pull request.

### Goal

Replace the Supabase-specific persistence assumption with provider-portable PostgreSQL authentication and database-enforced workspace isolation.

### Delivered

- Better Auth 1.7.7 email/password authentication;
- standard PostgreSQL via node-postgres;
- separate `auth` and `app` schemas;
- portable SQL migrations;
- restricted `ai_data_runtime` database role;
- transaction-local authenticated-user context;
- PostgreSQL row-level-security policies;
- seeded Rosie Dazzlers, Devil n Dove and Personal workspaces;
- first-user owner bootstrap with advisory-lock protection;
- authenticated Next.js sign-in/sign-out and workspace UI;
- authenticated `/api/workspaces` endpoint;
- migration and isolation verification scripts;
- PostgreSQL 18 integration service in GitHub Actions;
- frozen-lockfile CI after dependency bootstrap;
- source-of-truth migration from Supabase to portable PostgreSQL.

### Acceptance evidence

GitHub Actions verified against a fresh PostgreSQL 18 instance:

- dependency install: PASS;
- Better Auth schema migration: PASS;
- application workspace migration: PASS;
- typecheck: PASS;
- lint/static checks: PASS;
- web production build: PASS;
- Chrome extension production build: PASS;
- shared-contract tests: PASS;
- first authenticated user receives owner access to all three initial workspaces: PASS;
- second authenticated user receives no workspace access: PASS;
- RLS-scoped workspace query after switching users: PASS.

### Hosted database status

No persistent hosted database is required to promote this build. Neon is the selected initial managed PostgreSQL provider and can be provisioned when the web application is ready for deployment. The repository remains portable to another PostgreSQL host.

### Next

Build 003 — Page DOM Inspector.
