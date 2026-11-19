# AI Data Platform Build 423 — Operator Acceptance, Role Separation & Production Workflow Ceremony

Build 423 turns the seven-app Sysop telemetry contract into a production-capable, fail-closed evidence path while preserving each application's authority.

## 64 checkpoints

- 22 role-acceptance slots: owner/operator for each Master; owner/admin/worker/customer for YW, iCamp, Devil n Dove and Rosie Dazzlers.
- 35 consequential-workflow ceremony slots: production change, reboot/restart, recovery/rollback, external message, and financial/data export for each of seven applications.
- 7 signed Sysop telemetry source slots.

A software release can be GREEN while any live checkpoint remains HOLD. No missing evidence becomes PASS.

## Role separation

A requester may not approve their own consequential operation. High-risk workflows retain the owner gate. The source application retains operational authority; AI Data Platform validates evidence only.

## Sysop telemetry

The central intake verifies the canonical rosevear.sysop.statistics.v1 payload, exact source commit, independent Ed25519 public-key pin, freshness, privacy boundary and anti-replay event/nonce constraints. Transport and owner-review flags remain false until separately verified, so a signed source claim is not silently promoted to CONNECTED.

The AI Data Platform producer endpoint is GET /internal/rosevear/sysop/telemetry/v1. The central intake is POST /api/sysop-telemetry/intake. Both require the server-side ROSEVEAR_SYSOP_TELEMETRY_READ_TOKEN. Source signing requires ROSEVEAR_SYSOP_TELEMETRY_PRIVATE_KEY_PEM; receiver pins are supplied only through ROSEVEAR_SYSOP_TELEMETRY_PINS_JSON. No key is generated or stored in GitHub.

## Reboots and Sysop procedures

Only Rosevear AI Hub may report HOST_BOOT_OBSERVED/bootTimeMs. That remains a source observation until the existing independent witness path corroborates the physical reboot. Other sources may report process restart, maintenance, backup verification and incident observations.

Telemetry authorizes no reboot, service restart, recovery, message, payment, data export or configuration change.
