# Seven-app Sysop statistics and original-host procedure telemetry v1

**Authority:** AI Data Platform is the primary Server Shell registry. This is a read-only handoff for all seven separate repositories; no keys, automatic enrollment, or service activation are created by the source contract. It is complementary to the existing QL-455 business/master health envelope and Build 350 YW/iCamp mTLS probe. Do not replace verified protocol 1.0 clients with a mandatory 1.1 upgrade.

## Participants

| Kind | App ID | Repository |
|---|---|---|
| Master / Server Shell | ai-data-platform | RosevearCreations/ai-data-platform |
| Master / Original Windows host | rosevear-ai-hub | RosevearCreations/rosevear-ai-hub |
| Master / Communications | rosevear-comms-hub | RosevearCreations/rosevear-comms-hub |
| Governed external shell | yw | RosevearCreations/yw |
| Governed external shell | icamp | RosevearCreations/iCamp |
| Business application | rosiedazzlers | RosevearCreations/rosiedazzlers |
| Business application | devilndove | RosevearCreations/devilndove-site |

These are **3 Masters + 4 application sources**, where YW and iCamp are independently branded Slave Shells and Rosie/Devil are direct Master-governed business applications. The four are not to be conflated with one database or tenant.

## Contract and security

Use docs/contracts/rosevear-sysop-telemetry-v1.schema.json as the single shared source schema.

- **Read-only source endpoint proposed:** GET /internal/rosevear/sysop/telemetry/v1 (bounded authenticated server-to-server only). An app can also export an offline signed JSON file for owner review before network enrollment.
- The source signs canonical sorted compact JSON payload with a **service-owned Ed25519 key** whose raw public SHA-256 fingerprint is independently pinned by the receiving Master. Do not generate keys in CI or copy them into any repo, issue, browser or public build.
- Transport requires separately approved HTTPS/mTLS certificate, approved exact hostname, CA chain and pinned peer leaf; public network routing is not automatically trusted merely because GitHub CI is GREEN. Vercel/Cloudflare-hosted applications may require an approved intermediary rather than unsafe mutual-TLS assumptions.
- Each signed sample has an exact source commit, per-event ID, one-use nonce, issued/expiry window **at most 90 seconds**, no clock future tolerance over 2 seconds and data class NON_SENSITIVE_AGGREGATE. Reject stale/forged/replayed/wrong-audience observations. The source schema is intentionally not an authorization envelope.
- Metrics: requests, server errors, jobs completed/failed, queue depth, p95 latency and active sessions. If a field is not instrumented return **null**, never 0 by guess.
- Sysop: heartbeat, process-restart, original-host boot *observation*, maintenance, backup verification and incident *observations*. Only the original Windows Hub may report the Windows boot timestamp; other apps can report process restart/deploy events. Null for unknown time, never fabricated reboot.
- This contract deliberately fixes rebootIsIndependentlyWitnessed=false. True proof must be separately admitted by the existing QL-468–473 independent witness/evidence processes. Signed self-observation is not independent proof.
- No customer names, user emails/IDs, payment data, session tokens, IPs, tenants, camera images, orders, messages, raw logs or personal telemetry. **tenantId=null** and aggregate-only counters.
- `authorizesAction=false` means receipt creates **no** permission to restart a service, enable a task, run a recovery, dispatch a message, initiate a financial write, or activate Comms QL-340C.
- Receiver incident remains OPEN/HOLD and unknown physical OFF unless independently read; no silent closure.

## Implementation ownership and acceptance

1. Each of the seven repos adopts identical appId/schema and exposes **genuinely measured** counters or explicit nulls. Sign server-side only. Add negative tests for forged scope, invalid signature, replay, expiry, tenant leakage, excessive counters and unauthorized GET.
2. Each source announces an exact producer release SHA, non-sensitive operational status and implementation URL in its corresponding GitHub handoff issue. Do not connect a production endpoint before owner-approved trust pins, ingress restrictions, credentials and peer scope are present.
3. The original Windows Hub consumes opt-in signed observations using its existing QL-457/459 trust boundaries, and independently observes actual Windows Event Log/SCM/task status. Hub must distinguish source observation, independently witnessed historical evidence and live connected status.
4. AI Data Platform becomes the **central statistics/portfolio view**, verifies signed source identity, records last verified timestamp, short retention bounded by policy, source freshness/availability, counters and reboot/incident counts. Comms receives only minimal signed alert summaries (no customer data), with owner-governed routing/ACK.
5. Multi-tenant YW/iCamp statistics must be rolled up server-side with minimum privacy thresholds; no per-customer/per-site data crosses the boundary. Existing RLS and consent gates remain intact.
6. A source is CONNECTED only after the original deployed producer and collector pass a **real** authenticated signed live sample, anti-replay, expiry, independent signer pin and a complete audit receipt. Without that, present NOT ENROLLED, HOLD, STALE or UNKNOWN; do not show manufactured numbers.

## Sysop procedure timeline

For DESKTOP-AE894KC, retain start/end UTC, boot ID/time, actual source commit, exact Windows task and service names, planned vs unplanned reason when independently recorded, pre-/post-boot health, HA VM, MQTT, Caddy HTTPS, Ollama, camera status, backup integrity, operator approval and independent witness signature when available. The shared statistics message transports only coarse counters and hashes, not sensitive raw event details. Raw host evidence stays owner-only on the Windows system.

## Rollout

**Stage A:** protocol in this repo + separate issues in all six peers; code checks GREEN but network not connected.
**Stage B:** 7 signed producers and protected collectors with independent trust enrollment; one read-only handshake per app, under consent and rate caps.
**Stage C:** prove a real original-host reboot/rollback, 24-hour unattended continuity, independent backup restore and three-Master service ACK.
**Stage D:** dashboard status and limited alerts; acceptance metrics measured continuously before any production CONNECTED claim.

**Do not report live seven-app connectivity from this contract alone.**
