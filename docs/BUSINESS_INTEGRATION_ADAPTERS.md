# Business Integration Adapter Contracts

Build 018 defines the controlled handoff boundary between the AI Data Platform and the independent business applications.

## Shared rules

- Adapter contract version: 1.
- Transport in Build 018: approved JSON package.
- No shared database tables.
- No production credentials stored in the extension.
- No HTTP endpoint is guessed.
- Every package originates from a persisted dry run.
- Every package requires explicit approval of the exact dry-run fingerprint.
- A changed source dataset invalidates approval of an older dry run.
- Imported snapshots may mark fields as user-owned. Those fields are never included in update payloads.
- Only create and update operations are exported.
- Unchanged and blocked-only operations are excluded.
- Source URL and retrieval timestamp travel with every operation.

## Rosie Dazzlers

Contract:

`rosie-dazzlers.competitive-intelligence.v1`

Stable integration key:

`rosie-competitor::<offeringKey>`

Allowed values:

- `competitorBusinessName`
- `offeringName`
- `offeringKind`
- `category`
- `priceMinimumCad`
- `priceMaximumCad`
- `priceStartingAt`
- `vehicleSize`
- `serviceAreas`
- `deliveryMode`
- `packageContents`
- `sourceUrl`
- `sourceScope`
- `retrievedAt`

The adapter intentionally excludes customer, booking, quote, payment, staff and internal-note data.

## Devil n Dove

Contract:

`devil-n-dove.supplier-inventory.v1`

Stable integration key:

`devil-supplier::<stagingKey>`

Only Build 015 supplier staging items with `reviewStatus = approved` are eligible.

Allowed values:

- `supplierName`
- `productName`
- `supplierSku`
- `supplierImageUrl`
- `packagePriceCad`
- `packageQuantity`
- `stockUnit`
- `usageUnit`
- `usageUnitsPerStockUnit`
- `totalUsageUnits`
- `costPerStockUnitCad`
- `costPerUsageUnitCad`
- `sourceUrl`
- `sourceScope`
- `retrievedAt`

## Current-state snapshot

A business app may export a snapshot in this shape:

```json
{
  "version": 1,
  "target": "rosie-dazzlers",
  "capturedAt": "2026-10-06T14:00:00.000Z",
  "records": [
    {
      "integrationKey": "rosie-competitor::example",
      "values": {
        "offeringName": "Example package",
        "priceMinimumCad": 199
      },
      "userOwnedKeys": ["internalNotes"]
    }
  ]
}
```

The snapshot is comparison evidence only. Importing it does not mutate the business application.

## Approved package

An approved package has this top-level shape:

```json
{
  "version": 1,
  "target": "rosie-dazzlers",
  "adapterContract": "rosie-dazzlers.competitive-intelligence.v1",
  "contractVersion": 1,
  "batchId": "integration-batch-...",
  "approvedAt": "...",
  "generatedAt": "...",
  "fingerprint": "...",
  "operations": [
    {
      "action": "create",
      "integrationKey": "rosie-competitor::...",
      "values": {},
      "sourceEvidence": {
        "sourceUrl": "https://...",
        "retrievedAt": "..."
      }
    }
  ]
}
```

The consuming application is responsible for authenticating its import surface, verifying the contract/version, applying its own authorization and validation rules, recording its own write audit, and rejecting unsupported or stale packages.


## Build 022 contract verification metadata

Approved v1 packages now also require:

- schemaId;
- packageId;
- replayKey;
- sourceDatasetUpdatedAt;
- expiresAt.

The canonical fingerprint covers target, adapter contract, contract version, batch ID, approval timestamp, source dataset timestamp and the ordered create/update operations including source evidence.

A package is rejected when:

- package or contract version is unsupported;
- schema ID/adapter contract does not match target;
- fingerprint, packageId or replayKey does not recompute;
- integration key prefix is wrong;
- a values object contains a non-allowlisted field;
- source evidence is invalid;
- packageId is already consumed;
- package is expired;
- source dataset is stale;
- generation time is materially in the future.

Default freshness limits are 30 days for source data and 24 hours for package handoff.

Machine-readable schemas:

- packages/contracts/schemas/rosie-dazzlers.competitive-intelligence.v1.schema.json
- packages/contracts/schemas/devil-n-dove.supplier-inventory.v1.schema.json

Conformance fixtures:

- packages/contracts/fixtures/rosie-valid-v1.json
- packages/contracts/fixtures/devil-valid-v1.json
- packages/contracts/fixtures/unsupported-version.json

See docs/INTEGRATION_CONSUMER_READINESS.md for receiver implementation and live-activation gates.
