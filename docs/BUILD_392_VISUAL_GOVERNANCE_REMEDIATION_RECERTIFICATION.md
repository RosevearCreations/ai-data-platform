# AI Data Platform Build 392 — Visual-Governance Exception Routing, Remediation SLA Tracking & Cross-Shell Re-Certification Audit

Build 392 converts Build 391 theme drift or responsive-parity regressions into governed remediation evidence without weakening any Master authority boundary.

## Exception routing

Every shell detected by Build 391 as drifted or responsive-regressed requires a distinct owner-routed exception. Missing owner assignment or a held route remains fail-closed.

## Remediation SLA

Each routed exception carries a detection time and due time. Open remediation that passes its due time becomes an explicit SLA breach. Deployment success cannot resolve a visual exception.

## Re-certification

A resolved exception is not considered restored until fresh evidence confirms:

- the shell is back on `rosevear-master-instrument.v1`;
- the theme contract is restored;
- responsive parity is restored;
- the owner accepts the remediation;
- an independent reviewer verifies the result.

## Stable state

When Build 391 is already `VISUAL_GOVERNANCE_CLOSED_VERIFIED` and reports no drift or responsive regression, Build 392 reports `VISUAL_GOVERNANCE_STABLE` without manufacturing remediation work.

Migration `0155_master_visual_governance_remediation_recertification.sql` adds append-only exception, SLA-event and re-certification audit ledgers with forced RLS and protected-runtime writes.
