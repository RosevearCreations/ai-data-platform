# AI Data Platform Build 432

## Cloudflare Three-Source Signer Provisioning, Original-Host AI Hub Signed Relay Activation & Seven-of-Seven Genuine Production Telemetry Closure

Build 432 removes Build 431's allowance for provider/original-host HOLDs. Final Production acceptance is **7/7 genuine protocol-v1.2 signed sources or fail closed**.

### Cloudflare sources

Devil n Dove and Rosie Dazzlers use Ed25519 private keys stored in Cloudflare Pages secrets. Their telemetry endpoints expose only `NON_SENSITIVE_AGGREGATE`, require a fresh 256-bit challenge, sign that exact challenge and authorize no action. A bearer token is intentionally not the integrity boundary for these public aggregate endpoints; the receiver requires the pinned Ed25519 public key, exact deployed Git commit, freshness and exact challenge signature.

Rosevear Comms Hub uses a Cloudflare Worker with a SQLite Durable Object. Its Ed25519 private key is generated and retained inside provider storage. The app's Vite build writes the exact `WORKERS_CI_COMMIT_SHA` into a deployed static source-commit asset, and the Worker signs that exact revision into every envelope.

### Original Windows host

Rosevear AI Hub cannot be certified by GitHub-hosted Windows CI. The source enforces `DESKTOP-AE894KC`, protocol 1.2, exact source commit and a local Ed25519 key file. Its one-shot relay obtains a fresh AIDP challenge, signs one aggregate envelope locally, POSTs it to the AIDP intake, prints the non-secret receipt and exits.

The Hub source repository has no self-hosted runner or remote-execution connector. Therefore the final seventh receipt can exist only after the actual original Windows host has the released code, signer path/source-commit environment configured, affected backend process restarted/reloaded, and the one-shot relay executed.

### Production gate

Build 432 Production GREEN requires fresh signed evidence from:
1. AI Data Platform
2. Rosevear AI Hub original Windows host
3. Rosevear Comms Hub Cloudflare Worker
4. iCamp
5. Yard Workers
6. Devil n Dove
7. Rosie Dazzlers

No HOLD state is accepted by the Build 432 production activation script. A failed seventh source leaves the prior Production deployment serving rather than relabeling incomplete evidence as GREEN.
