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
