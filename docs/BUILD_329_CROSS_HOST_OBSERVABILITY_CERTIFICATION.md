# Build 329 — Cross-Host Observability, Compatibility Matrix & Universal Certification Suite

## Purpose

Build 329 creates one host-level control plane for proving that the AI Data Platform module behaves correctly across registered host types, module versions and adapter combinations.

It builds on Build 328 installed-host inventory. A generated install package is not proof of installation, and a passing synthetic fixture is not proof of a live host.

## Delivered

- host/module compatibility matrix across registered Build 328 installed hosts;
- reusable universal host certification harness;
- React, Next.js, Vite, vanilla browser and Electron adapter coverage;
- authentication certification;
- tenant/workspace isolation certification;
- least-privilege capability certification;
- event certification;
- workflow certification;
- data-contract/exchange certification;
- read-only search certification;
- safe-recovery certification;
- offline/idempotent synchronization certification;
- latency P95, error-count and retry-count telemetry;
- per-host health states: healthy, degraded, unhealthy and unknown;
- append-only regression history;
- explicit synthetic-fixture versus live-evidence separation;
- compatibility evidence for module version, host contract, protocol and adapter;
- operator control plane at `/module-certification`;
- authenticated JSON API at `/api/module-certification`.

## Certification dimensions

Every certification run contains exactly ten assertions:

1. compatibility;
2. authentication;
3. tenant;
4. capability;
5. event;
6. workflow;
7. data;
8. search;
9. recovery;
10. offline.

PASS, FAIL and BLOCKED are preserved independently.

## Compatibility matrix

Compatibility is derived against the registered Build 328 host record, not browser-supplied expectations.

The matrix compares:

- observed module version versus the installed current version;
- observed host contract versus the enrollment host contract;
- observed protocol versus the enrollment protocol;
- observed adapter versus the enrollment adapter.

A mismatch is FAIL. A live compatibility PASS with no concrete evidence reference is BLOCKED.

## Synthetic fixture separation

Synthetic fixtures exist to prove that the reusable certification harness behaves consistently across supported adapter and evidence scenarios.

Synthetic evidence:

- may produce `fixture-certified`;
- never produces `live-certified`;
- reports per-host health as `unknown`;
- cannot activate a connection;
- cannot grant capabilities;
- cannot execute workflows;
- cannot mutate a host.

This distinction is enforced both in the certification core and by database constraints.

## Live certification

A host can be marked `live-certified` only when:

- the evidence class is `live-evidence`;
- all ten dimensions PASS;
- every PASS contains at least one concrete evidence reference;
- compatibility exactly matches the registered host record;
- telemetry contains at least one sample;
- health is neither `unknown` nor `unhealthy`.

Live certification records evidence only. It does not authorize peer communication, trust, capabilities or consequential actions.

## Telemetry and health

Build 329 records:

- sample count;
- P95 latency;
- error count;
- retry count.

For genuine live evidence:

- any failed certification dimension makes health `unhealthy`;
- blocked evidence or zero telemetry samples makes health `unknown`;
- successful evidence with errors, retries or P95 latency above 2000 ms makes health `degraded`;
- otherwise health is `healthy`.

Synthetic fixtures always report health as `unknown`.

## Regression history

Each new run is compared with the previous certification for the same installed host.

Regressions are recorded when:

- a prior PASS becomes BLOCKED or FAIL;
- health moves to a lower state;
- a previously live-certified host loses live-certified status.

Regression evidence is append-only.

## Persistence

Migration: `0112_cross_host_observability_certification.sql`

Tables:

- `app.module_host_observations`
- `app.module_host_certification_runs`
- `app.module_host_certification_assertions`

All three tables are owner-scoped, workspace-admin protected, RLS-enabled and append-only for the runtime role.

## API

### GET `/api/module-certification`

Returns:

- certification descriptor;
- installed hosts;
- host/module compatibility matrix;
- certification runs;
- observations;
- assertions;
- live/fixture/regression summary.

### POST `/api/module-certification`

Supported action:

- `certify-host`

The server loads expected host/module compatibility values from Build 328 persistence and does not trust the browser to define expected compatibility.

## Security boundaries

Build 329 does not:

- probe a host automatically;
- scan a network or filesystem;
- read raw credentials;
- infer trust;
- activate a connection;
- grant capabilities;
- release an event or workflow hold;
- execute a host action;
- mutate host configuration;
- treat synthetic fixtures as live evidence;
- convert missing live evidence into PASS.

## Next queued build

**Build 330 — Autonomous Operations V2, Production Learning VII & Next Roadmap Renewal** is the next mandatory roadmap-renewal checkpoint.
