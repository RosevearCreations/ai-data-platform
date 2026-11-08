# Build 327 — Zero-Touch Module Installer & Guided Host Enrollment

## Purpose

Build 327 turns the reusable module work from Builds 306–326 into a guided host-enrollment workflow.

The installer automates preparation:

- explicit host manifest discovery;
- adapter selection;
- exact tenant/workspace mapping;
- capability preview;
- credential-reference requirements;
- transport configuration selection;
- compatibility validation;
- install dry run;
- owner approval/rejection;
- generated host integration package.

Zero-touch means automated preparation, not automatic trust authorization.

## Explicit host manifest

The installer accepts a strict `rosevear.ai-data-platform.host-install-manifest.v1`.

The manifest identifies:

- host application ID and display name;
- exact host instance;
- environment;
- host tenant;
- platform tenant;
- existing workspace;
- runtime/framework;
- default module surface;
- requested capabilities;
- credential-reference requirements and bindings;
- transport configuration.

Unknown fields are rejected.

Secret-like fields such as password, token, cookie, API key, client secret or private key are rejected before dry-run preparation.

The installer does not scan the filesystem or network to infer host identity.

## Adapter selection

The runtime/framework field selects one of the existing Build 309 adapters:

- React;
- Next.js;
- Vite;
- vanilla browser JavaScript;
- Electron / desktop web shell.

The generated integration package reuses the Build 309 credential-free scaffold generator rather than creating a second host adapter system.

## Exact tenant/workspace mapping

The manifest must explicitly name:

- host tenant ID;
- platform tenant ID;
- workspace ID.

The authenticated operator must be an owner/admin of that workspace.

No default tenant, cross-workspace fallback or inferred tenant mapping is accepted.

## Capability preview

Requested capabilities are compared with the live universal module manifest.

The preview distinguishes supported and unsupported requests.

Capability discovery and preview never create a grant.

Unsupported requested capabilities hold the install dry run.

## Credential-reference requirements

A manifest may declare zero or more credential-reference requirements.

Requirements can accept reference metadata from the existing Credential Vault:

- environment-variable reference;
- external-vault reference;
- provider-managed reference.

A required reference must:

- exist in the same workspace;
- match the requirement;
- use an accepted reference kind;
- remain active;
- not be expired at dry-run time.

The installer reads no secret values.

The generated package contains credential-reference IDs only. Credential locators are deliberately excluded.

## Transport configuration selection

The installer prepares one Build 323 secure transport manifest.

Supported kinds:

- direct HTTPS;
- trusted local relay;
- approved cloud relay.

The Build 323 manifest validator enforces origin/security rules.

The installer performs no network request or health probe.

Therefore installer transport preparation does not prove runtime transport health.

Normal Build 323 health evidence and runtime transport selection remain required later.

## Compatibility validation

The install dry run validates:

- host contract version;
- module protocol version;
- supported adapter;
- supported module surface;
- supported requested capabilities;
- explicit tenant/workspace mapping;
- credential-reference readiness;
- secure transport configuration;
- non-authorizing security boundary.

The dry run is either `pass` or `held`.

Only a passing dry run is eligible for owner approval.

## Durable host enrollment inventory

Migration:

`0110_module_host_guided_enrollment.sql`

The durable enrollment row stores:

- exact host scope;
- module version;
- host contract/protocol versions;
- adapter;
- default surface;
- requested capabilities;
- credential requirement/binding metadata;
- transport preparation;
- canonical manifest SHA-256;
- canonical dry-run SHA-256;
- state/revision;
- owner decision;
- generated package SHA-256 when one is produced.

This becomes the enrollment inventory that Build 328 can use for versioning and safe upgrade work.

An enrollment package does not prove the host applied the files or is live.

## Owner approval

Owner/admin approval requires a passing dry run.

Approval is recorded with an append-only event and permits package generation only.

Approval does not:

- activate a connection;
- authorize trust;
- grant capabilities;
- create credentials;
- create a Build 326 autonomy policy;
- write files into the host application.

Rejection is also append-only evidence and invalidates package generation.

## Generated host integration package

After approval, the service re-verifies the persisted manifest and dry-run hashes before generating a package.

The package includes:

- the Build 309 host scaffold;
- `ai-data-installation.json`;
- `OWNER-APPROVAL.md`.

The package records exact host scope, adapter, requested capabilities, credential-reference IDs, transport configuration and owner-preparation approval.

It contains no credential values or credential locators.

AI Data Platform returns the package as data. It does not write the package into the host repository or filesystem.

## Evidence integrity

Manifest and dry-run evidence use canonical SHA-256 hashing so JSONB key ordering cannot change the evidence identity.

Enrollment events are append-only:

- dry-run-held;
- dry-run-passed;
- owner-approved;
- owner-rejected;
- package-generated.

Runtime UPDATE/DELETE is revoked from event evidence.

## Security boundary

Build 327 does not automatically:

- scan the network or filesystem;
- read raw secrets;
- grant capabilities;
- authorize trust;
- activate a connection;
- prove transport health;
- write files into a host;
- create autonomy policy;
- mark an enrollment as live-installed.

The generated package is preparation evidence only.

## Next queued build

**Build 328 — Module Versioning, Safe Upgrade, Rollback & Migration Orchestration** remains the next regular product roadmap item.
