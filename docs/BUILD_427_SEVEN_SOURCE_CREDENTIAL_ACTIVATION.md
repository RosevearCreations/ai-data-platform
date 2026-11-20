# AI Data Platform Build 427 — Seven-Source Credential Enrollment, Signed Live Telemetry Activation, Continuous Statistical Rollups & Master Health Dashboard

Build 427 turns the Build 426 probe surface into an ongoing source-health system.

## Credential enrollment
AIDP records only the **name of the expected server environment variable** and whether it is present. Read-token values and private signing keys are never persisted in GitHub or database evidence. Source applications retain custody of their own Ed25519 private keys.

## Signed activation
A source is active only when its credential is present and a fresh telemetry envelope passes the existing exact-commit pin, Ed25519 signature, freshness, privacy, scope and anti-replay checks. A reachable origin, HTTP 200, deployment GREEN or configured token does not equal CONNECTED.

## Continuous rollups
Every operator refresh and every authenticated background sweep writes an activation observation. A security-invoker PostgreSQL view continuously groups the last seven days into 15-minute buckets with observed source count, reachable observations, verified source count and telemetry latency statistics.

The Vercel cron is the autonomous floor and runs once daily because the current Vercel Hobby project supports daily cron cadence. Operator sweeps can be run at any time and immediately add a new observation and rollup bucket.

## Master Health dashboard
The dashboard shows all seven sources, credential enrollment state, latest reachability, signed activation state, source commit, evidence age and recent statistical buckets. Missing credentials remain visible as HOLD rather than being converted to synthetic success.

## Authority boundary
Telemetry is read-only statistical evidence. It cannot send messages, alter source data, restart hosts, approve financial actions or authorize production changes.
