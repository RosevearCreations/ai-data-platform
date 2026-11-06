# Build 300 — Unified Integration Health Command Center

## Purpose

Build 300 consolidates authorized integration-health evidence into one authenticated dashboard.

The command center covers:

- registered peer connection state;
- measured database and connector latency;
- connector execution failures;
- credential-reference rotation and expiry risk;
- webhook endpoint status and recent accepted/denied intake;
- held and pending event-bus routes;
- recent delivery failures;
- dead-letter and replay evidence;
- inherited degraded-service signals from System Reliability.

## Evidence sources

Build 300 deliberately reuses existing governed evidence rather than creating a second health store.

Primary sources are:

- Build 281 application connection registry;
- Build 263 System Reliability dashboard;
- Build 284 credential-reference vault;
- connector execution audit evidence;
- Build 290 webhook gateway tables;
- Builds 291–293 event-bus, failure, replay and delivery-guarantee evidence.

No Build 300 database migration is required.

## Connection-state semantics

The peer-application panel reports the registered connection state exactly as stored by the application registry.

A registry state such as `DISCONNECTED` is not converted into a live-health claim.

Build 300 performs no external health probe and does not infer remote availability.

## Latency

The dashboard displays:

- the existing authenticated RLS database probe latency from System Reliability;
- the latest measured connector execution duration per workspace/connector;
- average and maximum duration across the latest connector audit records in the current RLS scope.

These are observed local/database metrics only.

## Credential health

Credential health uses reference-only metadata:

- lifecycle status;
- replacement state;
- rotation due date;
- expiry date.

Secret values are never read by the dashboard.

## Webhook health

The dashboard shows each authorized webhook endpoint with:

- enabled/disabled state;
- source application and environment;
- accepted requests in the last 24 hours;
- denied requests in the last 24 hours;
- most recent stored receipt time.

Counts are computed independently per endpoint to avoid join multiplication.

## Event queue health

The event-bus panel reports:

- held routes;
- pending routes;
- delivery failures observed in the last 24 hours;
- current dead letters;
- replay requests.

The dashboard does not release held routes or trigger replay.

## Degraded services

Build 300 combines its integration-specific signals with current Build 263 System Reliability attention/critical signals.

Each degraded item links back to the source evidence surface.

## Authorization boundary

Build 300 is read-only. It performs:

- no external health probe;
- no remote availability inference;
- no credential-value read;
- no automatic retry or recovery;
- no automatic connection activation;
- no event release;
- no QL-266 resumption.

## Operator surface

Authenticated route:

`/integration-health`

Navigation label:

**Integration Health**

## Next queued build

**Build 301 — Self-Healing Connection Recovery & Safe Retry Automation**.
