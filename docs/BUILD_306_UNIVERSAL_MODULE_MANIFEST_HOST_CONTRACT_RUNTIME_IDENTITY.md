# Build 306 — Universal Module Manifest, Host Contract & Runtime Identity

## Purpose

Build 306 starts the owner-authorized 306–330 universal-module batch by defining the single host contract that later module SDKs, adapters, embedded surfaces and transport layers must use.

The foundation is intentionally discovery-first and fail-closed. **Manifest discovery is not authorization.**

## Universal module manifest

Source:

`apps/web/lib/universal-module-contract.ts`

Read-only discovery route:

`GET /api/module-manifest`

The manifest publishes:

- stable module ID: `rosevear.ai-data-platform`;
- semantic module version: `1.0.0`;
- module-host protocol version: `1`;
- supported embedded/deep-link surfaces;
- currently supported headless read capabilities;
- required and optional host-context declarations;
- feature flags;
- compatibility range;
- runtime-identity requirements;
- explicit security statements proving that discovery does not activate a connection, grant capabilities, authorize peer writes or resume QL-266.

The route is `no-store` and contains no credentials or raw secret values.

## Host contract v1

A supported host must provide all of the following before a runtime identity can be created:

- host contract version;
- host application ID;
- environment;
- host instance ID;
- authenticated subject ID;
- tenant ID;
- workspace ID;
- requested capabilities;
- audit correlation ID.

Optional context is limited to supported feature flags, locale, time zone and light/dark/system theme preference.

Validation fails closed when:

- the contract version is unsupported;
- host/environment/identity fields are malformed;
- a requested capability or feature flag is not supported;
- duplicate capability/feature entries are supplied;
- unknown fields are supplied;
- raw secret-like fields such as tokens, cookies, passwords, API keys or authorization headers appear anywhere in host context.

Host-requested capabilities remain requests only. They are not AI Data Platform authorization grants.

## Runtime identity

`createModuleRuntimeIdentity()` first validates the host contract, then creates a module-owned runtime identity bound to:

- module ID/version/protocol;
- host application/environment/instance;
- authenticated subject;
- tenant and workspace;
- audit correlation ID;
- module instance ID;
- creation timestamp.

The host does not get to declare a connection state or mint module authority merely by supplying context.

## Compatibility boundary

Build 306 supports:

- manifest version `1`;
- host contract version `1`;
- protocol version `1`;
- module API range `>=1.0.0 <2.0.0`.

Breaking contract changes require a new protocol/contract version rather than silently accepting incompatible hosts.

## Safety and QL-266

Build 306 does not:

- activate a peer connection;
- create credentials;
- authorize an external write;
- infer trust, issuer, witness or owner consent;
- mark a synthetic host as live-certified;
- resume QL-266.

The QL-266 state remains `DISCONNECTED / HOLD` unless authentic external evidence independently satisfies its existing requirements.

## Verification

`apps/web/scripts/verify-build-306-universal-module-manifest.ts` proves:

- valid host context acceptance;
- deterministic runtime identity binding;
- fail-closed unsupported capability rejection;
- unsupported environment/version rejection;
- unknown-field rejection;
- secret-bearing host-context rejection;
- manifest security assertions;
- Build 306 documentation/review/roadmap wiring;
- web production build includes the Build 306 verifier.

Inherited promotion checks, database gates and Builds 296–305 verification remain in place.

## Next queued build

**Build 307 — Headless Module SDK & Host Adapter Interface** — package this stable Build 306 contract behind a framework-neutral initialization, teardown, invocation, context-provider and standardized error interface.
