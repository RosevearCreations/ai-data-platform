# Build 286 — Cross-App Data Contract Registry

## Purpose

Build 286 creates the reusable, versioned data vocabulary that later integration builds can map between Rosevear applications.

The registry defines canonical v1 contracts for:

1. customers;
2. products;
3. services;
4. bookings;
5. jobs;
6. staff;
7. equipment;
8. invoices;
9. media;
10. inventory;
11. notifications.

These are declarative cross-app schemas. They do not activate a connection, move data, infer implementation by another application, or authorize a write.

## Contract identity

Every shared contract has:

- a stable contract ID such as `rosevear.shared.customer.v1`;
- semantic version `1.0.0`;
- a stable JSON Schema ID;
- SHA-256 schema fingerprint;
- an explicit list of typed fields;
- required-field declarations;
- `additionalProperties: false`;
- a `same-major-additive` compatibility policy.

All records use four common required envelope fields:

- `sourceApplicationId`;
- `sourceRecordId`;
- `tenantKey`;
- `updatedAt`.

Domain-specific fields then describe the portable portion of each record type.

## Validation

`validateCrossAppDataContractRecord()` fails closed when:

- the contract is unknown;
- the record is not a JSON object;
- a required field is missing;
- a field has the wrong type;
- an enum value is unsupported;
- an unknown field is present.

This gives Build 287 a stable target vocabulary for reviewed field mapping without silently accepting app-specific fields.

## Compatibility preflight

`evaluateCrossAppDataContractCompatibility()` checks:

- the contract exists;
- producer and consumer are registered peer applications;
- producer and consumer are different applications;
- semantic versions are valid;
- both use the registered major version;
- neither requests a future registry version;
- optional observed schema ID matches;
- optional observed schema fingerprint matches.

A passing result means only **structural contract compatibility**.

It explicitly does not prove that either peer application has implemented the contract. Build 287 field mapping remains required before any exchange.

## Existing business contracts

Build 286 does not replace the existing Build 022 delivery contracts in `packages/contracts/src/index.ts`:

- `rosie-dazzlers.competitive-intelligence.v1`;
- `devil-n-dove.supplier-inventory.v1`.

Those existing contracts remain authoritative for their established delivery paths. The Build 286 registry is the new reusable shared vocabulary for future cross-app mappings.

## API

Authenticated `/api/data-contracts` supports:

- `GET /api/data-contracts` — registry model;
- `GET /api/data-contracts?contractId=...` — generated JSON Schema;
- `POST` with `action: "compatibility"` — structural compatibility preflight;
- `POST` with `action: "validate-record"` — fail-closed record validation.

All responses are no-store. There is no data-contract mutation endpoint in Build 286.

## Operator surface

Authenticated `/data-contracts` provides:

- registry summary;
- all 11 canonical contracts;
- schema IDs and fingerprints;
- field definitions and required fields;
- downloadable/generated JSON Schema views;
- app-to-app structural compatibility preflight;
- preserved existing business-contract references.

## Safety boundary

Build 286:

- creates no database migration;
- stores no customer or business records;
- activates no connection;
- performs no external request;
- does not infer app implementation;
- performs no field mapping;
- authorizes no live exchange;
- keeps unknown contracts and unknown fields fail closed;
- keeps QL-266 `UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED`.

## Next build

Build 287 — Visual Field Mapping Studio will map application fields to these canonical contracts and persist reviewed mapping profiles.
