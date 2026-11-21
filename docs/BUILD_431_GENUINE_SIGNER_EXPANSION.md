# AI Data Platform Build 431

## Remaining Five-Source Genuine Signer Enrollment, Cross-Provider Production Telemetry Activation & Seven-Source Continuous Signed-Health Expansion

Build 431 advances the five sources that were still held after Builds 428–430 without turning missing provider authority into fake connectivity.

## Genuine progress in this build

AI Data Platform gains a service-owned production Ed25519 signer in Vercel secret custody. Its canonical telemetry endpoint now accepts the same unpredictable 256-bit challenge used for Yard Workers and iCamp, returns protocol 1.2, signs the exact challenge and binds the source commit to the running Vercel deployment.

The receiver supports a special AIDP self-pin marker only for the AIDP source. That marker resolves to the running `VERCEL_GIT_COMMIT_SHA`; it does not relax the exact-commit rule for any other source. The public key fingerprint remains pinned independently in the receiver configuration. Self-signing proves source possession and exact deployment binding, but is not described as an independent outside witness.

Build 431 also expands the challenge sweep to all seven named production sources and records every source as either fresh v1.2 signed evidence or a specific provider/original-host HOLD.

## Remaining four provider/original-host HOLDs

- Rosevear AI Hub: repository support is not proof that the original Windows service is running new code. The local signer, read token and HTTPS relay must be installed on the original host, and that original-host process must be restarted/reloaded when its runtime code or environment changes.
- Rosevear Comms Hub: the known telemetry source is loopback/private. A public read-only Cloudflare bridge and Cloudflare secret authority are still required.
- Devil n Dove: the Pages Function source exists, but the Cloudflare service-owned private signer and read token require Cloudflare provider authority.
- Rosie Dazzlers: the Pages Function source exists, but the Cloudflare service-owned private signer and read token require Cloudflare provider authority.

Those four sources remain HOLD until their own provider/original-host evidence is genuinely observed.

## Restart policy

Vercel deployments need **no manual restart** after a normal update. Vercel builds a fresh immutable deployment and moves production traffic to it when READY.

Cloudflare Pages/Workers deployments likewise do not normally require a server restart; a new deployment becomes the running edge version. Secret/configuration changes may require a new deployment depending on the provider workflow.

The Rosevear AI Hub is different because it includes original-host Windows processes. When executable/runtime code or environment-backed signer configuration changes there, the affected original-host process/service must be restarted or explicitly reloaded before AIDP may claim the new runtime is active.

## Production gate

Build 431 Production GREEN requires:
1. all seven sources are observed and classified;
2. AI Data Platform, Yard Workers and iCamp each return a fresh signed protocol 1.2 challenge receipt;
3. the other sources are either genuinely signed or remain explicit named HOLDs;
4. database migration 0194, static verification and the Next.js production build pass.

Production GREEN therefore means the Build 431 release is truthful and fully deployed. It does **not** mean seven-source CONNECTED while Cloudflare/original-host authority is still missing.
