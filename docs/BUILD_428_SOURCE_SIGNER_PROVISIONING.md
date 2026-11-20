# AI Data Platform Build 428 — Source-Side Signer Provisioning, Credential Pairing & First Genuine Heartbeats

Build 428 moves the Master Health system from credential-readiness into genuine signed activation for the sources whose deployment authority is currently connected.

## Genuine activation in this build

**Yard Workers** and **iCamp** retain their own Ed25519 private signing keys and telemetry read tokens in their Vercel production environments. AI Data Platform stores the matching read credentials in its own protected production environment and stores only the public signer pins/fingerprints and exact deployed source commits as verification material.

Yard Workers additionally required a canonical route publication repair: `/internal/rosevear/sysop/telemetry/v1` now rewrites to its Vercel function while preserving the canonical signed scope. The accepted YW source revision is `0681809271428de7aea94ea83ca6a0dc9abacd0c`.

The Build 428 production build runs an authenticated read-only source sweep **after database migrations and before the final Next.js compile**. Production fails closed unless both YW and iCamp return fresh telemetry envelopes that pass:
- exact source application identity;
- exact source commit pin;
- Ed25519 signature validation;
- public-key fingerprint validation;
- freshness and expiry checks;
- privacy/scope validation;
- replay protection.

Accepted heartbeats are persisted through the existing Build 423 signed telemetry receipt ledger, Build 427 continuous health observations, and the new Build 428 source-pairing acceptance ledger.

## Holds remain truthful

The remaining sources are not converted into synthetic CONNECTED states:
- AI Data Platform local signer: connected Vercel tooling refused the private-key write, so the local source signer remains HOLD.
- Rosevear AI Hub: original Windows host requires its own signer custody and approved HTTPS relay.
- Rosevear Comms Hub: telemetry route exists, but Cloudflare secret authority is not connected here.
- Devil n Dove: source telemetry route and Cloudflare secret authority are both still required.
- Rosie Dazzlers: telemetry source code exists, but Cloudflare secret authority is not connected here.

## Continuous Master Health

Build 427 daily autonomous sweeps and operator-triggered sweeps continue unchanged. Build 428 adds a durable first-heartbeat acceptance layer so the dashboard can distinguish:
1. route present;
2. credential present;
3. public signer pin present and exact;
4. live telemetry verified;
5. first signed heartbeat accepted;
6. source still held for provider/original-host work.

Production GREEN certifies Build 428 software and the required YW+iCamp first-heartbeat gate. It does **not** claim seven-source CONNECTED until all seven independently satisfy the same signed evidence requirements.
