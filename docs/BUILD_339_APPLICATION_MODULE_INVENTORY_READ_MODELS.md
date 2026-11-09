# Build 339 — Application & Module Inventory, Capability and Readiness Read Models

## Purpose

Build 339 composes the existing Master Shell evidence foundations into one read-only application/module inventory.

It does not create a parallel source-of-truth inventory table and does not fabricate missing source data.

The exact six child source applications remain:

- Yard Workers (`yw`);
- iCamp;
- Rosie Dazzlers;
- Devil n Dove;
- AI Data Platform;
- Rosevear AI Hub.

Rosevear Comms Hub remains the complementary communications/control plane and is not counted as a seventh child source.

## Evidence sources

Build 339 composes:

### Build 336 source registry

Application-level:

- exact source/shell/repository identity;
- current source state and freshness;
- source environment;
- source manifest URI;
- immutable source revision;
- source capability version;
- source-reported allowed roles;
- registry evidence authority.

### Build 337 signed source updates

Latest per source/module:

- module ID;
- source-reported readiness state;
- source-reported completion percentage;
- evidence URI;
- source revision;
- source sequence;
- verification state;
- observed/published/expiry timestamps.

Latest per source:

- release ID;
- release branch;
- deployment status;
- release evidence;
- source revision/sequence;
- evidence expiry.

Freshness is recalculated at read time. A previously fresh event may become STALE without mutating its stored record.

### Build 338 Master Completion

Module inventory also includes module IDs appearing in:

- requirement revisions;
- approved completion scopes.

For an approved module scope the read model shows:

- completion numerator/denominator/percentage;
- evidence coverage;
- UNKNOWN/STALE blockers;
- failed/partial/critical counts;
- scope date;
- branch/commit;
- denominator version/hash.

Source-reported completion and Master Completion remain separate values.

### Build 328 installed AI Data module evidence

Where a recorded installed host maps exactly to a Master Shell source, Build 339 may show:

- installed AI Data module version;
- last-known-good version;
- environment;
- lifecycle state;
- installation evidence;
- observed/updated timestamps.

This is evidence that the AI Data Platform module was observed on that host. It is **not** evidence that the host application's own source modules are accepted.

### Build 281 read-only discovery catalogue

For peer applications, Build 339 may show the existing metadata/read-only discovery capabilities.

These remain discovery-only. They do not grant authorization, prove remote availability or prove acceptance.

AI Data Platform's own headless capability list is source-owned local contract data from the universal module manifest.

## Module inventory origins

A module may appear because of one or more explicit origins:

- `source-readiness-event`;
- `master-completion-requirement`;
- `master-completion-scope`;
- `installed-ai-data-module`.

Presence alone is never acceptance.

## Ownership

Build 339 displays source-registry role evidence when present.

It does not invent a named product owner or module owner when no verified owner field exists.

Missing owner information remains `UNMEASURED`.

## Version semantics

Application-level source revision/capability version may come from Build 336 registry evidence.

Module-level source version remains `UNMEASURED` unless a distinct source-owned version exists in evidence.

Build 328 installed AI Data module versions are shown separately from source-owned module versions.

A GREEN release is displayed as release evidence only and is not converted into functional acceptance.

## Readiness semantics

Three truths remain separate:

1. **Application state** — Build 336 source registry.
2. **Source-reported module readiness** — Build 337 signed source event.
3. **Master Completion evidence** — Build 338 approved denominator and independent evidence axes.

A source-reported `ACCEPTED` module does not automatically become Master Completion accepted.

A 100% Master Completion scope does not rewrite the source's own readiness event.

## Surfaces

- `/master-application-inventory`;
- `/api/master-application-inventory`.

Both are authenticated, suite-admin scoped and read-only.

## Persistence

Build 339 adds **no new inventory persistence table**.

It composes existing RLS-scoped evidence and static contract metadata. Source-owned evidence remains authoritative in its existing ledger.

## Safety boundaries

Build 339 does not:

- mutate a source;
- create or approve a Build 338 denominator;
- record Build 338 evidence;
- activate a connection;
- grant a capability;
- infer ownership;
- infer module versions;
- infer acceptance from catalogue presence;
- infer acceptance from installed module presence;
- infer functional acceptance from deployment GREEN;
- perform an outbound request or peer write.

## Next queued build

**Build 340 — Master Shell Command Center V1: Applications, IT, Management & Statistics.**
