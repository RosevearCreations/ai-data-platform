# AI Data Platform Build 395 — Predictive Visual Recurrence Threshold Calibration, Preventive-Control Intervention Readiness & Cross-Shell Risk Escalation Governance

Build 395 turns Build 394 recurrence-risk evidence into governed thresholds, intervention readiness and cross-shell escalation decisions.

## Predictive threshold calibration

All five governed shells require measured calibration evidence. A calibrated threshold requires at least five evidence points, an evidence-backed baseline below the warning threshold, a warning threshold below the escalation threshold, owner approval and independent verification. False-positive and false-negative rates are retained as evidence rather than hidden.

## Preventive intervention readiness

Every shell requires a current readiness record. READY means all required controls are ready, the runbook is verified, rollback is ready, an owner-on-call is assigned and the readiness evidence is independently verified.

## Cross-shell risk escalation

Every shell requires a current risk escalation decision bound to its calibrated warning and escalation thresholds. WATCH, ACTION and CRITICAL decisions require owner acknowledgement. ACTION or CRITICAL risk also requires a ready intervention and an invoked intervention record.

Deployment GREEN cannot substitute for threshold calibration, intervention readiness or cross-shell escalation evidence.

Migration `0158_master_predictive_threshold_intervention_escalation.sql` adds append-only threshold calibration, intervention-readiness and risk-escalation ledgers with forced RLS.
