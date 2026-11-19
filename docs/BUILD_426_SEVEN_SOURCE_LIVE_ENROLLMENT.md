# AI Data Platform Build 426 — Seven-Source Live Enrollment Ceremony, Independent Transport Verification & First Statistical Rollup Acceptance

Build 426 moves AI Data Platform from mostly evidence/readiness presentation into live runtime operation.

## Live immediately
Every authenticated operator view reads current production database time, applied migration count and latest migration, current Vercel commit/environment/region, Node/process uptime, database pool counts, 24-hour API/database performance evidence and current Build 423/425 evidence row counts.

## Operator-triggered live refresh
The **Refresh live sources** action performs bounded GET-only HTTPS probes. It stores:
- origin reachability and latency;
- telemetry HTTP status and latency;
- whether a receiver-side read token is configured;
- whether a source envelope passed the existing exact-revision, Ed25519 signature, freshness, privacy and anti-replay admission;
- a first aggregate statistical rollup without turning missing values into zero.

Default public origins are defined for AIDP, Comms public worker, iCamp, YW, Devil n Dove and Rosie. AI Hub has no public default because its canonical telemetry is original-host/private; an owner-approved HTTPS relay/origin must be configured outside source control.

## Secret custody
Read tokens remain server environment values. The database stores only booleans/statuses, public origins, timing/status evidence and admitted signed receipt identifiers. No private signing key or read-token value is written to GitHub or evidence tables.

## Truth boundary
A reachable homepage is **not** a live telemetry connection. HTTP 401 means a protected endpoint answered but receiver authorization is missing/rejected. HTTP 503 means source enrollment is incomplete. Only a successfully admitted signed envelope counts as verified telemetry. Production GREEN proves Build 426 software only and never claims seven-source connection.
