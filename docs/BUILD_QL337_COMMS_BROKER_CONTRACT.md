# QL-337 — Governed Comms broker TEST event contract

Build 291/292 source routing and recovery remain held; this build is **not** live outbound delivery.

The new `apps/web/lib/ql337-comms-broker-contract.ts` prepares metadata-only, unsigned TEST envelopes to the fixed Comms Hub audience. It refuses pending routes, missing original source/owner/consent/workload proofs, cross-child/tenant scope, invalid events, and stale or excessive expiry. It exposes no HTTP sender, key material or customer payload. No existing subscription is activated.

Schema registry: `docs/integration/ql337-comms-broker-contract.v1.json`. It must byte-for-byte match the independent Comms Hub verifier's canonical sorted JSON hash `af38fb0956b2905f5c89a655959d64760af375f677354d18b86910200e3b6599` for the shared deterministic fixture.

The authoritative compact `ci:promotion` runner now includes `verify-ql337-comms-broker.ts` after the integration spine, with no new trigger or required-check bypass. Tests prove safe construction and negative authorization. There is no database schema change in AI Data Platform: Build 291/292 already persist routed/held/replay provenance.

The master Comms Hub independently stores duplicate-safe private HOLD receipts through Supabase migration `20261105132334_ql337_private_broker_inbox_no_delivery.sql`; no network delivery or source enrollment follows automatically.

External signed TEST delivery and workload trust remain blocked pending separate original-source authority, independently pinned signing key, owner approval, tenant/child isolation verification and real broker-to-Comms receipt continuity.
