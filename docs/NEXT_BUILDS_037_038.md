# Detailed Build Plan — Builds 037–038

This finite queue was produced by Build 036 Production Learning II. It is deliberately short: first establish real operating evidence where adoption is still zero, then re-run production learning.

## Build 037 — Guided Production Adoption & First-Evidence Runbook

Status: IMPLEMENTED — EVIDENCE-CONDITIONAL RUNBOOK ACTIVE.

Priority: P1 only while one or more relevant workspaces remain at measured zero durable operational adoption.

Purpose: guide real first-use activity through already-built safe workflows instead of adding more platform features.

Implementation sequence:

1. Inspect existing RLS-scoped Build 035 adoption evidence.
2. Build a profile-aware workspace runbook.
3. Offer synchronized saved-scraper/reviewed-dataset work where history is enabled.
4. Offer Source Policy review where sourcePolicy is enabled.
5. Offer barcode intake only where barcodeIntake is enabled.
6. Gate scheduled jobs until a current source-policy source exists.
7. Keep remote execution behind Build 032 explicit operator approval.
8. Keep business delivery behind Build 033 receiver/operator gates.
9. Suggest installed connectors only within existing grants.
10. Re-open Adoption and Production Learning after genuine activity so their normal snapshots capture the change.

Manual intervention: perform only genuine work. Do not create fixtures, fake sources, fake receivers or provider runs merely to close a metric.

## Build 038 — Production Learning III & Trend Validation

Status: IMPLEMENTED — DURABLE TREND CHECKPOINT / ACTIVE QUEUE REDUCTION.

Priority: P2.

Purpose: validate whether Build 037 real-use activity, Browserless baseline progress, consumer-delivery progress and retention/adoption outcomes materially changed the evidence.

Build 038 writes a bounded cycle checkpoint, uses only genuinely historical Build 036 cycle rows for numeric deltas, and leaves an unavailable baseline unavailable when none exists. After the checkpoint is durable, Build 038 removes itself and does not invent Build 039. Any remaining queue consists only of unresolved evidence gates such as Build 032, Build 033 or the conditional Build 037 runbook.
