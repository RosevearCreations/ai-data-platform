# Build 266 — Security, Workspace Access & Least-Privilege Review

## Purpose

Build 266 adds an advisory security review over authorized workspaces.

## Review scope

The review surfaces:

- workspace membership and current role;
- effective profile capabilities inherited by each workspace;
- privileged-operation evidence from connector audit, integration delivery and operational outcomes;
- connector grants, observed successful grant use and unused grants;
- manager-only membership review for workspace owners/admins;
- advisory least-privilege recommendations.

## Stale-access interpretation

Build 266 does not claim inactivity from membership age alone.

For privileged roles, a review recommendation is raised when the reviewed privileged-operation evidence sources show no matching activity for at least 90 days, or no matching privileged activity since an older membership was created.

This is an evidence-gap indicator, not an automatic access-removal decision.

## Authority boundary

The ordinary workspace RLS policy remains unchanged.

Broader membership visibility is performed server-side only for users whose existing workspace role is owner/admin. Members do not gain visibility into other members.

## No automatic access changes

Build 266 does not:

- remove workspace members;
- change owner/admin/member roles;
- disable profile capabilities;
- revoke connector grants;
- rotate credentials;
- change downstream integration state.

Recommendations remain advisory until explicitly approved and performed through an authorized workflow.

## QL-266 boundary

The unrelated owner-deferred QL-266 remains **UNDER_REVIEW**.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
Build 266 does not resume QL-266.

## Next build

**Build 267 — Retention, Archive & Storage Governance Center.**
