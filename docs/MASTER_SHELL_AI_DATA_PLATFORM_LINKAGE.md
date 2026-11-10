# AI Data Platform — Master Shell Role, Linkage & Connection Process

## Position

AI Data Platform is the **Master intelligence and monitoring coordinator** for the Rosevear Suite Master Shell.

In traditional master/slave terminology, AI Data Platform occupies the **master/coordinator position for monitoring, evidence normalization, analytics, readiness and suite-wide status composition**.

It is **not** a universal operational write-master. The other applications are not passive slaves. They are authoritative source systems that retain control of their own business data, operational state, trust, consent, recovery and acceptance decisions.

AI Data Platform is also one of the exact six registered source applications, so it reports its own health/readiness into the same evidence model rather than exempting itself.

## Exact six source applications

| Source | Repository | Shell relationship | Authority retained by source |
| --- | --- | --- | --- |
| Yard Workers | RosevearCreations/yw | platform-shell source | customers, companies, crews, jobs, scheduling, work state |
| iCamp | RosevearCreations/iCamp | platform-shell source | campgrounds, reservations, payments, staff, inventory, guest records |
| Rosie Dazzlers | RosevearCreations/rosiedazzlers | owned-business source | bookings, customers, detailing jobs, staff, payments |
| Devil n Dove | RosevearCreations/devilndove-site | owned-business source | products, workshop operations, commissions, inventory, orders |
| AI Data Platform | RosevearCreations/ai-data-platform | Master intelligence/monitoring + source | analytics, evidence normalization, Master Shell read models |
| Rosevear AI Hub | RosevearCreations/rosevear-ai-hub | local Windows support source | local process/device/server evidence and local execution authority |

Yard Workers and iCamp link at their **platform shell** level. Their individual customer businesses/campgrounds remain child tenants and do not become separate Master Shell sources.

## Rosevear Comms Hub

Rosevear Comms Hub is a **complementary communications/control plane**, not a seventh child source.

It retains authority for communications, notifications, incident routing, acknowledgements, follow-up tasks and operator communication workflows. AI Data Platform may consume authorized read models from Comms Hub and provide incident context or request intents, but does not silently replace Comms Hub authority.

## Connection process

1. Register the exact source identity, repository, environment and shell boundary.
2. Confirm the correct tenancy boundary.
3. Negotiate/validate the Master Shell contract and event schema version.
4. Validate approved origin, signer identity/fingerprint, audience and source revision where applicable.
5. Receive authorized source evidence/events.
6. Normalize provenance, correlation/causation IDs, freshness and verification state.
7. Project read-only health, module, readiness, performance and evidence views into AI Data Platform.
8. Correlate those views with Comms Hub incident/follow-up projections.
9. For retry or recovery, create a bounded request/handoff rather than an automatic peer write.
10. Wait for new source-owned acknowledgement/evidence before changing the displayed operational truth.

## Master / source update rules

### AI Data Platform as master/coordinator

AI Data Platform owns:

- suite-wide monitoring composition;
- evidence provenance normalization;
- freshness/staleness evaluation;
- cross-application analytics;
- Master Completion/readiness projections;
- performance and dependency intelligence;
- safe operator read/recheck controls;
- preparation of bounded retry/recovery intents.

### Source applications as authoritative workers/sources

Each connected application owns:

- its operational records;
- business transactions;
- tenant-specific state;
- permissions inside its application;
- source-side recovery and rollback;
- source acceptance and evidence publication;
- actual execution of consequential writes.

### Comms Hub as complementary control plane

Comms Hub owns:

- messages and notifications;
- incident workflows;
- follow-up tasks;
- acknowledgements;
- routing/IVR/communications state;
- communication-side escalation.

## Truth boundary

A successful AI Data Platform deployment proves only that its release deployed successfully.

It does not, by itself, prove that Yard Workers, iCamp, Rosie Dazzlers, Devil n Dove, Rosevear AI Hub or Comms Hub are currently connected, accepted or healthy. Those states require current source-owned evidence.
