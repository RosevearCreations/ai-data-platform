# AI Data Platform Build 397 — Recalibrated Threshold Stability Validation, Intervention-Outcome Persistence & Cross-Shell Escalation Confidence Governance

Build 397 validates that Build 396 recalibration remains stable, that intervention benefits persist, and that escalation decisions are supported by current high-confidence evidence.

## Recalibrated threshold stability

Every governed shell requires at least a 24-hour validation window, three samples, zero threshold breaches, no recurrence, owner review and independent verification before recalibrated thresholds are considered STABLE.

## Intervention-outcome persistence

Every shell receives a current persistence record. When no intervention occurred, NOT_REQUIRED is explicitly reviewed and independently verified. When an intervention occurred, PERSISTENT requires at least 48 hours, three samples, current recurrence risk no worse than the verified post-intervention baseline, and no recurrence.

## Escalation confidence governance

Every shell requires at least five evidence points and a confidence score of at least 7000 basis points. Threshold evidence and intervention evidence must both be current, with owner review and independent verification.

Deployment GREEN cannot substitute for stability validation, persistence evidence or escalation confidence.

Migration `0160_master_recalibrated_stability_outcome_persistence_confidence.sql` adds append-only stability, persistence and confidence ledgers with forced RLS.
