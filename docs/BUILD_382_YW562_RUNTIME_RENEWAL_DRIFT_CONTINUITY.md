# AI Data Platform Build 382

## Protected Runtime Renewal Drift Detection, Automatic Fail-Closed Recovery Validation & Three-Master CONNECTED Continuity Audit

Build 382 extends the Build 381 receiver-health continuity gate. It does not create connectivity from repository state, deployment success, or historical pilot evidence.

### Runtime decision rules

- A current Build 381 protected renewal is required.
- The YW562 source revision, AI Hub production revision, Comms Hub production revision, and original-host binding must remain exact.
- The AI Hub, Comms Hub, and AI Data Platform renewal receipts must all remain present and distinct.
- Any expired renewal, revision mismatch, missing renewal, receipt drift, or non-CONNECTED Build 381 state is treated as runtime drift.
- Runtime drift cannot extend CONNECTED state.
- Drift requires fail-closed behaviour. CONNECTED may only be reported again after the protected Build 381 renewal path independently re-establishes current three-master evidence.
- A verified Build 381 rollback is treated as valid fail-closed recovery and remains DISCONNECTED_HOLD.

### Durable audit

Migration 0146 adds an append-only Build 382 continuity audit table protected by RLS. Runtime users may read owner/admin-scoped audit rows but cannot insert, update, or delete them. Protected runtime may append audits but cannot modify history.

### Safety boundary

Build 382 never upgrades code GREEN, a Vercel deployment, or historical acceptance evidence into live CONNECTED runtime evidence. Live continuity is derived only from the protected Build 381 runtime evidence chain.
