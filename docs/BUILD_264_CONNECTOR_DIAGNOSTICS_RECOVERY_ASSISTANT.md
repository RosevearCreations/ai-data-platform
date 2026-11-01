# Build 264 — Connector Diagnostics, Configuration Validation & Recovery Assistant

## Purpose

Build 264 adds an authenticated connector-diagnostics surface that explains connector readiness before operators rely on a connector in production workflows.

## Diagnostics

The assistant checks:

- connector registration and installed-version compatibility;
- required configuration completeness and value validation;
- workspace role and granted-capability compatibility;
- endpoint-shaped configuration values using URL parsing;
- required secret-reference structure without exposing secret values;
- credential-reference age based only on the connector installation's last configuration timestamp;
- latest append-only connector execution status and failure code.

## Connection tests

Owners and admins can run a controlled connector connection test using a non-export capability when one is available.

The diagnostic test:

- uses the existing bounded connector execution boundary;
- creates normal connector audit evidence;
- uses an empty diagnostic record set;
- never automatically exercises an export-only connector.

Export-only connectors remain manual-review only.

## Recovery guidance

Every diagnostic result includes an operator-facing recovery instruction. The assistant does not automatically rotate credentials, change grants, modify endpoints, enable connectors or bypass workspace authority.

## Secret handling

Secret values are not displayed or returned to the client. The dashboard works with configured secret-reference metadata only.

## QL-266 boundary

QL-266 remains **UNDER_REVIEW**.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
Build 264 does not restart external integration testing.

## Next build

**Build 265 — Integration Delivery Simulator & Contract Compatibility Center.**
