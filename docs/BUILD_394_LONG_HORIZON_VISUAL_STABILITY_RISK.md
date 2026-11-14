# AI Data Platform Build 394 — Long-Horizon Visual Stability Trend Correlation, Preventive-Control Degradation Detection & Cross-Shell Recurrence Risk Forecasting

Build 394 extends Build 393 from current post-recertification stability into long-horizon evidence and recurrence-risk governance.

## Long-horizon trend correlation

All five governed shells require independently observed visual-stability windows of at least 24 hours with two or more samples. The trend layer records stable ratio, recurrence count and whether the observed direction is improving, stable or degrading.

## Preventive-control degradation

Each governed shell receives a preventive-control health review. A healthy review requires every expected control to remain healthy, zero degradation signals, owner review and independent verification.

## Cross-shell recurrence risk forecasting

Each shell requires a verified recurrence-risk forecast using at least three evidence points and a forecast horizon of at least 24 hours. High or critical risk blocks long-horizon closure even when the deployment itself is GREEN.

Deployment GREEN cannot erase trend degradation, preventive-control deterioration or elevated recurrence risk.

Migration `0157_master_long_horizon_visual_stability_risk.sql` adds append-only long-horizon trend, preventive-control health and recurrence-risk forecast ledgers with forced RLS.
