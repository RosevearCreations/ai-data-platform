# Integration Consumer Readiness

Build 022 defines the exact receiver-side contract that Rosie Dazzlers and Devil n Dove must implement before AI Data Platform live ingestion can be enabled.

## Current state

- AI Data Platform can generate and validate approved v1 packages.
- AI Data Platform can run a non-production consumer simulation.
- No Rosie Dazzlers production intake endpoint is assumed or enabled.
- No Devil n Dove production intake endpoint is assumed or enabled.
- No business-system credential is required or stored by Build 022.
- Build 022 does not write either production database.

## Shared v1 receiver requirements

A future receiver must, in this order:

1. authenticate the caller using a dedicated application-to-application credential;
2. authorize the credential for the exact target contract;
3. parse JSON and reject malformed payloads;
4. require package version 1 and contract version 1;
5. require the exact target-specific schema ID and adapter contract;
6. validate the package against the published JSON Schema;
7. recompute the canonical fingerprint and reject mismatch;
8. recompute packageId and replayKey and reject mismatch;
9. reject packageId values already recorded as consumed;
10. reject generatedAt values materially in the future;
11. reject packages after expiresAt;
12. reject sourceDatasetUpdatedAt older than the configured source-freshness window;
13. reject integration keys with the wrong target prefix;
14. reject fields outside the target allowlist;
15. require HTTP(S) source URL and retrieval timestamp on every operation;
16. execute a receiver-side dry run with no mutation;
17. record the package identity, validation result and dry-run outcome in the business application's own audit log;
18. require the business application's own authorization/enablement gate before mutation;
19. apply each accepted package idempotently;
20. record successful consumption before acknowledging success.

The receiver must never interpret unknown fields as instructions and must never accept a newer contract version by default.

## Replay and identity rules

The package fingerprint covers:

- target;
- adapter contract;
- contract version;
- batch ID;
- approval timestamp;
- source dataset timestamp;
- ordered create/update operations and source evidence.

packageId is derived from target, batch ID, approval timestamp and fingerprint.

replayKey is:

target::packageId::fingerprint

Re-exporting the same approved batch intentionally retains the same packageId/replayKey even though generatedAt/expiresAt change. A receiver that already consumed the package must reject the replay.

## Freshness rules

- source freshness default: 30 days;
- package handoff window: 24 hours from package generation;
- generated timestamps more than five minutes in the future are rejected.

A consumer may use a stricter source-freshness window, but it must not silently use a looser rule than its documented policy.

## Rosie Dazzlers readiness checklist

Contract:

rosie-dazzlers.competitive-intelligence.v1

Schema:

packages/contracts/schemas/rosie-dazzlers.competitive-intelligence.v1.schema.json

Integration-key prefix:

rosie-competitor::

Receiver requirements:

- store competitor intelligence separately from customer/booking/payment operational records;
- accept only the allowlisted competitive-offering fields in the schema;
- do not expose or overwrite customer, booking, quote, payment, staff or internal-note fields;
- enforce create/update idempotency by integrationKey;
- maintain source URL/retrieval evidence;
- record packageId/replayKey as consumed only after the package-level transaction is accepted;
- support dry-run/no-write validation before live enablement.

Rosie Dazzlers is consumer-ready only when its own repository has:

- an authenticated intake endpoint;
- the same v1 schema/validator;
- replay registry;
- receiver audit log;
- transaction/idempotency behavior;
- dry-run mode;
- disabled-by-default live mutation flag;
- CI proof for valid, tampered, duplicate, stale and unsupported-version fixtures.

## Devil n Dove readiness checklist

Contract:

devil-n-dove.supplier-inventory.v1

Schema:

packages/contracts/schemas/devil-n-dove.supplier-inventory.v1.schema.json

Integration-key prefix:

devil-supplier::

Receiver requirements:

- accept only reviewed/approved supplier-intelligence fields represented by the contract;
- keep Devil n Dove's internal/user-owned inventory fields authoritative;
- do not treat external supplier metadata as permission to overwrite internal quantity/location/category/workstation/business notes unless a future receiver contract explicitly allows it;
- enforce create/update idempotency by integrationKey;
- maintain source URL/retrieval evidence;
- record packageId/replayKey as consumed only after the package-level transaction is accepted;
- support dry-run/no-write validation before live enablement.

Devil n Dove is consumer-ready only when its own repository has:

- an authenticated intake endpoint;
- the same v1 schema/validator;
- replay registry;
- receiver audit log;
- transaction/idempotency behavior;
- dry-run mode;
- disabled-by-default live mutation flag;
- CI proof for valid, tampered, duplicate, stale and unsupported-version fixtures.

## Build 022 non-production conformance simulation

The extension's Business-system integrations panel includes a consumer simulator.

Workflow:

1. export an approved package;
2. upload that JSON package into Build 022 consumer simulation;
3. the simulator validates shape, target, contract, schema, version, fields, evidence, fingerprint, package ID, replay key, timestamps and freshness;
4. if accepted, packageId is added to a local test-only replay registry;
5. upload the same package again;
6. the simulator must reject it as duplicate;
7. clear the simulation replay registry to repeat testing.

The simulator performs no business-system HTTP request and no production mutation.

## Future live activation walkthrough

Do not perform this until the selected business application has implemented and promoted its receiver.

1. Open that business application's production environment/secret dashboard.
2. Create the exact dedicated receiver secret named by the consumer implementation.
3. Do not paste the secret into ChatGPT, GitHub source, screenshots or documentation.
4. Copy the public receiver URL from the completed consumer build.
5. In AI Data Platform integration settings, enter only that public receiver URL.
6. Use Test contract.
7. Confirm the receiver identifies contract v1, authentication required and dry-run/no-write mode.
8. Send the harmless repository conformance fixture.
9. Confirm the consumer audit log records validation without mutation.
10. Send a tampered fixture and confirm fingerprint rejection.
11. Send the valid fixture twice and confirm the second submission is rejected as duplicate.
12. Confirm stale and unsupported-version fixtures are rejected.
13. Enable live intake only after both applications show GREEN contract tests and matching package fingerprints.
