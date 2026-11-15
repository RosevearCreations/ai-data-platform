# AI Data Platform Build 406 — Unified Security Tier Baseline, Cross-Application Trust Matrix & Completion Acceleration Denominator Governance

Build 406 turns Build 405's acceleration targets into a shared baseline model that the seven applications can use without inventing different security vocabularies or incomparable completion percentages.

## Canonical two-layer security model

Build 406 resolves the security naming collision by separating **access/authority tiers** from **security control domains**.

The six canonical access tiers are:

- **T0 PUBLIC_READ** — public brochures, storefront and help; no protected customer data.
- **T1 USER_SCOPED** — authenticated users limited to their own resources.
- **T2 TENANT_SCOPED** — tenant staff with tenant ownership enforced in API, database and storage.
- **T3 OPERATOR_SCOPED** — administrators/operators with least privilege, separation and audit.
- **T4 MASTER_GOVERNANCE** — independent Master signatures, freshness, replay protection and no trust transitivity.
- **T5 ORIGINAL_HOST_OWNER_CEREMONY** — protected on-machine owner ceremony; never routed through ordinary HTTP, queues, Cloudflare, Vercel or customer accounts.

Build 405's five security tiers remain intact as five **control domains** applied across every access tier: identity/provenance; transport/authentication; authorization/tenant/consent; data/audit/replay/fail-closed; privileged operations/recovery.

This creates **42 required access-tier baselines** across seven applications, each proving all five control domains.

## Cross-application trust matrix

The same 14 canonical relationships from Build 405 remain the only ordinary cross-application trust relationships.

Trust is explicit, non-transitive and non-delegating. T4 cannot grant T5. T5 cannot traverse ordinary application transport. Raw secrets and direct peer database writes remain forbidden. Consequential writes remain owner-gated.

## Completion denominator governance

Build 406 introduces 13 functional/security/operational aspects for every application:

customer/guest; worker/admin; product/storefront; finance/tax; stock/inventory; scheduling/jobs; HR/payroll; media/social; security/privacy; cross-app integration; accessibility/mobile; deployment/recovery; observability/support.

That creates **91 application/aspect denominators**. Every applicable denominator must record the number of applicable requirements, verified requirements, a SHA-256 denominator digest, an evidence-backed baseline percentage and a target equal to baseline +10 percentage points capped at 100.

A percentage cannot advance if its denominator is not locked. UNMEASURED is not treated as zero. Production GREEN does not imply runtime CONNECTED or completion advancement.

## Build 406 final governance state

The final state is:

`UNIFIED_SECURITY_TRUST_AND_COMPLETION_BASELINE_VERIFIED`

Missing tier evidence, trust evidence or denominator evidence fails closed.
