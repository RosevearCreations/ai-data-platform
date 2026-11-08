# Build 321 — Connector Driver Packaging & Dynamic Module Registry

## Purpose

Build 321 turns trusted Connector SDK definitions into versioned driver packages that the universal AI Data Platform runtime can discover without activating a connection.

The existing Build 289 Connector SDK remains the execution authority. Build 321 adds packaging, compatibility metadata, install-state projection and registry validation.

## Connector driver manifest

Each registered Connector SDK v2 manifest is packaged as a driver containing:

- stable driver/connector ID;
- semantic driver version;
- SDK and connector manifest versions;
- display metadata;
- capability metadata;
- health contract;
- auth-reference requirements;
- module compatibility;
- install/disable state;
- package provenance;
- validation evidence.

Only Connector SDK/manifest v2 definitions are eligible for Build 321 driver packages.

## Capability metadata

Build 321 maps the existing SDK capabilities into portable metadata:

- `import` → inbound;
- `enrichment` → processing;
- `export` → outbound/consequential.

Every capability still requires the existing workspace grant. Discovery never grants capabilities.

## Health contract

Local connectors publish a local health contract with no external probe.

HTTP connectors publish their Build 289 declared:

- GET/HEAD method;
- health path;
- accepted statuses;
- optional timeout.

The registry does not execute a health probe. Health metadata never activates a connection.

## Auth-reference requirements

Driver packages expose only the Build 289 secret declarations:

- secret key;
- label;
- required/optional standing;
- fixed environment-variable reference.

Raw credential values are not accepted or included in the registry.

## Semantic compatibility

Build 321 driver packages require:

- Connector SDK v2;
- Connector manifest v2;
- AI Data Platform module API `>=1.0.0 <2.0.0`.

The registry reports incompatible installed connector versions rather than silently upgrading or activating them.

## Install and disable state

The registry can project the existing workspace installation rows into:

- `available`;
- `installed-disabled`;
- `installed-enabled`;
- `installed-incompatible`.

The authenticated existing `/api/connectors` overview now includes this driver-state projection for each workspace.

An enabled installation does **not** prove a live remote connection. Build 289 execution gates, credentials, capability grants, transport policy and health evidence remain separately authoritative.

## Package provenance

Every package receives a deterministic SHA-256 digest over the trusted connector manifest and driver compatibility metadata.

Built-in packages identify their source as `trusted-built-in-registry`.

The provenance contract supports optional Ed25519 signature metadata where such package provenance is available. Build 321 does not invent signatures and does not claim cryptographic verification merely because signature metadata is present.

The built-in sample therefore reports:

- signature: null;
- signatureStatus: `not-provided`;
- signatureVerifiedByRegistry: false.

## Dynamic registry validation

`buildConnectorDriverRegistry()` rebuilds the registry from the current trusted connector definitions at runtime.

Validation checks:

- Connector SDK manifest validity;
- unique driver IDs;
- semantic module compatibility;
- SDK/manifest v2 eligibility;
- supported capabilities;
- provenance digest shape;
- security-boundary invariants.

Invalid drivers remain visible as invalid evidence rather than being silently treated as usable.

## Discovery API

Read-only discovery:

`GET /api/module-connector-drivers`

The discovery route contains no raw credentials and performs no health probe, install, enable, connector execution or connection activation.

## Operator surface

The existing `/connectors` page remains authoritative for workspace configuration, enable/disable controls and connector execution evidence.

Build 321 adds a link to the dynamic driver registry descriptor and explains that driver presence/install state does not activate a connection.

## Security boundary

Build 321 does not:

- activate a connection because a driver exists;
- treat installed/enabled as proof of remote availability;
- grant workspace capabilities;
- read or expose secret values;
- perform an external health probe during discovery;
- auto-upgrade an incompatible installation;
- auto-enable a newly configured connector;
- claim a package signature that does not exist;
- treat signature metadata as cryptographically verified.

## Next queued build

**Build 322 — Webhook, Callback & Inbound Endpoint Module** remains the next regular product roadmap item.
