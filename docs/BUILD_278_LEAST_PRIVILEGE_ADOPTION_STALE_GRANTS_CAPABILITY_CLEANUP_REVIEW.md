# Build 278 — Least-Privilege Adoption, Stale Grants & Capability Cleanup Review

## Purpose

Build 278 re-runs the existing Build 035 adoption evidence and Build 266 security/access review together so the owner can see one current least-privilege cleanup queue.

## Evidence reviewed

Build 278 uses existing evidence for:

- workspace owner/admin/member coverage;
- enabled versus durably used profile capabilities;
- high-risk enabled but unused capabilities;
- observed use of currently disabled capabilities;
- connector grants with successful/failed execution evidence;
- unused connector grants;
- connector grants unused for at least 30 days;
- owner/admin memberships with stale privileged-operation evidence.

Build 035 adoption snapshots remain fingerprint-deduplicated and RLS-scoped. Build 278 adds no new permission store or access-control migration.

## Advisory cleanup queue

Every finding is advisory and requires explicit owner/admin disposition through existing controls.

Build 278 does **not**:

- remove or demote a workspace member;
- assign an owner;
- enable or disable a profile capability;
- revoke a connector grant;
- broaden connector access;
- infer approval from deployment.

## Exit criterion

The Build 278 evidence criterion is met only when no ownerless workspace, disabled-but-used capability, stale connector grant, or permission-review workspace remains.

High-risk unused capabilities and non-stale unused grants remain visible for least-privilege review even when the core exit criterion is otherwise met.

## Safety boundaries

- Existing RLS and workspace membership remain authoritative.
- Existing workspace/profile/connector mutation controls remain unchanged.
- Recommendations are advisory only.
- No automatic role, membership, capability or grant change occurs.
- No database migration is introduced.
- QL-266 remains **UNDER_REVIEW**, **REVIEW_DEFERRED**, and **DISCONNECTED**.

## Next build

Build 279 — Reliability Trend Validation, Failure Patterns & Recovery Readiness.
