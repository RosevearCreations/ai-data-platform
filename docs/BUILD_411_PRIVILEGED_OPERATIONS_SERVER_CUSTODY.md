# AI Data Platform Build 411

**Privileged Operations, Owner Approval, Break-Glass Custody, Administrative Separation & Audit Ceremony Governance + Server Module Enable/Disable & 24/7 Windows Service Custody**

Build 411 converts the Build 410 Server Shell module-state contract into a fail-closed privileged-control plane.

## Owner-gated Server Shell controls

The three server modules remain:
1. Data & Intelligence — AI Data Platform
2. AI, Home & Automation — Rosevear AI Hub
3. Communications & Operations — Rosevear Comms Hub

The authenticated Master Sysop owner may create module-control intents for ENABLE, DISABLE or RESTART. DISABLE requires explicit owner authority. ENABLE and RESTART additionally require a current independently issued custodian receipt from a different identity.

The cloud UI records an intent; it does **not** directly change Windows services. The protected Windows-side service must re-check the intent, expiry/custody evidence and module authority, perform the local action, and append an immutable physical-host receipt.

No action may silently enable another module, transfer authority, or turn Production GREEN into evidence of a physical host change.

## Privileged operations and administrative separation

Across all seven applications Build 411 requires:
- explicit owner gates for consequential privileged operations;
- no ordinary operator self-authorization;
- requester/approver separation;
- dual-control support;
- least privilege and privilege expiry;
- immutable audit receipts;
- no raw secrets in audit evidence.

## Break-glass custody

Break-glass is an emergency recovery path, not a replacement for normal authorization. A valid grant requires:
- owner approval;
- two distinct custodians;
- a SHA-256 reason digest;
- a maximum 30-minute window;
- single use;
- explicit expiry/revocation;
- no authority transfer;
- no raw secret evidence.

Expired, consumed, revoked, self-custodied or overlong grants fail closed.

## 24/7 Windows service custody

Three logical service custody records are established on the existing AI Hub Windows server host role:
- rosevear-ai-hub-automation-host;
- rosevear-ai-data-platform-worker;
- rosevear-comms-hub-worker.

Service custody requires a least-privilege service account, OS-managed secret storage, no required public inbound listener, approved-intent restart control and a physical-host receipt for any claimed activation.

Build 411 may enroll automatic-start custody, but Build 414 remains the supervised 24/7 activation/closure build. A GitHub/Vercel release therefore never claims that the physical Windows server has updated, restarted or activated a worker.

## Persistence and audit ceremony

Migration 0174 adds append-only, forced-RLS ledgers for privileged profiles, break-glass policies, independent custodian receipts, module control policies/intents, physical action receipts, Windows-service custody and audit ceremonies.

Normal runtime can read governed status. Only the Master Sysop owner may append a module control intent. Protected runtime appends custody, action and ceremony evidence. UPDATE/DELETE are denied.

## Final governance state

PRIVILEGED_OPERATIONS_AND_SERVER_MODULE_CUSTODY_ASSURED
