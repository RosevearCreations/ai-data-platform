# Build 307 — Headless Module SDK & Host Adapter Interface

## Purpose

Build 307 turns the Build 306 universal host contract into a framework-neutral headless SDK boundary that any supported host can call without embedding the AI Data Platform UI.

The SDK deliberately separates **host context** from **module authorization**. A host may request capabilities, but request or discovery is not a grant. A separate module authorizer must allow each invocation.

## Framework-neutral SDK

Source:

`apps/web/lib/headless-module-sdk.ts`

The SDK has no React, Next.js, DOM-mount or transport dependency. It provides:

- `HeadlessModuleSdk`;
- `HeadlessModuleHostAdapter`;
- `HeadlessModuleContextProvider`;
- `HeadlessModuleCapabilityAuthorizer`;
- `HeadlessModuleServiceInvoker`;
- typed invocation/result envelopes;
- standardized error codes and retry hints;
- deterministic test adapter/authorizer/invoker helpers.

Framework-specific adapters remain deferred to Build 309.

## Lifecycle

`initialize()`:

1. asks the host adapter context provider for Build 306 host context;
2. validates that context fail-closed;
3. creates a module-owned runtime identity;
4. runs the host adapter initialization lifecycle hook;
5. enters `ready` state only after successful validation and lifecycle completion.

`teardown()`:

- runs the host adapter teardown hook;
- keeps the SDK active if that hook fails;
- clears runtime identity/context only after successful teardown;
- is safe and idempotent when already idle.

## Invocation boundary

Each `invoke()` requires:

- an initialized SDK;
- a Build 306-advertised capability;
- that capability to have been explicitly requested by the validated host context;
- a stable operation identifier;
- an independent authorization decision from the module authorizer.

Only after all of those checks pass is the typed invocation envelope handed to the service invoker.

**The separate module authorizer is the authority boundary. The host adapter does not grant platform authority.**

## Correlation and audit metadata

Every accepted invocation gets a module-generated request ID and carries the Build 306 host audit correlation ID.

Audit events carry:

- request ID;
- audit correlation ID;
- module instance ID;
- host application/environment;
- tenant/workspace;
- capability and operation;
- requested/authorized/denied/succeeded/failed state;
- standardized error code where applicable.

This gives later transports, relays and host adapters one consistent evidence envelope.

## Standard errors and retry hints

The SDK distinguishes:

- not initialized / already initialized;
- invalid host context;
- adapter initialization/teardown failure;
- unsupported capability;
- capability not requested;
- capability denied;
- invalid operation;
- invocation failure.

Unknown invocation failures default to **do not retry** because the remote outcome may be unknown. A later service may supply narrower idempotent retry evidence.

## Deterministic certification adapter

Build 307 includes deterministic test helpers for:

- stable host context;
- lifecycle capture;
- audit-event capture;
- explicit synthetic capability grants/denials;
- deterministic capability handlers.

These helpers support certification only. Passing them does not prove a live peer connection or live authorization.

## Safety and QL-266

Build 307 does not:

- create a peer connection;
- create credentials;
- expose raw host secrets;
- let a host capability request become authorization;
- enable a consequential peer mutation;
- resume QL-266.

Mutating operations remain governed by their existing approval, consent, idempotency and evidence gates.

QL-266 remains `DISCONNECTED / HOLD`.

## Verification

`apps/web/scripts/verify-build-307-headless-module-sdk.ts` verifies:

- initialization and teardown lifecycle;
- module-owned runtime identity;
- deterministic request/audit correlation;
- accepted read capability invocation;
- independent capability denial;
- requested-versus-granted separation;
- unsupported capability rejection;
- invalid operation rejection;
- secret-bearing host-context rejection inherited from Build 306;
- standardized retry/error behavior;
- Build 307 documentation/review/roadmap/build-gate wiring.

Inherited compact promotion and exhaustive historical audits remain required.

## Next queued build

**Build 308 — Embeddable Module Runtime Shell & Secure Mount Boundary** — add an isolated mount lifecycle, secure host-to-module message boundary, surface routing and iframe/custom-element compatible shell without exposing raw host secrets.
