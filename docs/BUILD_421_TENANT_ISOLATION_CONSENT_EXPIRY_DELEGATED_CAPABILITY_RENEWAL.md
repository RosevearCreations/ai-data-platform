# AI Data Platform Build 421 — Tenant Isolation, Consent Expiry & Delegated-Capability Renewal

Build 421 renews the Build 408 fine-grained authorization foundation after the Build 420 accessibility/device/network re-certification. It deliberately fails closed when tenant boundaries, consent state or delegated authority are stale, expired, revoked or incomplete.

## Renewal surface

Each of the seven Rosevear applications must provide fresh source-owned, owner-reviewed and independently verified evidence for three application-local dimensions:

- least privilege;
- tenant/workspace isolation;
- consent lifecycle, expiry and revocation.

That produces **21 local renewal slots**.

The 28 canonical directional relationships from Build 407 must also provide a fresh delegated-capability renewal receipt. Total Build 421 scope is therefore **49 required renewal checkpoints**.

## Least privilege

A PASS requires deny-by-default policy, exact capability namespaces, no wildcard capability grants, a completed stale-grant review, current least-privilege policy, non-delegable T5 authority and no cross-tenant override.

## Tenant/workspace isolation

A PASS requires current API, database RLS and storage-boundary evidence, validated tenant context, denial of same-tenant foreign records where not authorized, denial of cross-tenant access and denial of cross-workspace access.

## Consent lifecycle

Personal-data capabilities require explicit, purpose-bound consent. Expiry must be enforced. Withdrawal must revoke the dependent capability, revocation must propagate, revoked grants must be rejected, renewal requires fresh current consent, consent cannot create a new capability by itself, and evidence must not contain raw personal data.

## Delegated capability renewal

Every directional grant must:

- use an exact capability namespace and exact audience;
- preserve tenant, workspace and consent scope;
- require explicit renewal rather than self-renewing from an old grant;
- have current consent at renewal;
- prohibit subdelegation, authority transfer and T5 delegation;
- propagate revocation;
- keep consequential writes owner-gated;
- have a maximum lifetime of 24 hours;
- remain fresh and unrevoked at evaluation time.

## Feature-completion release discipline

Starting with Build 421, each future queued build must consolidate enough meaningful feature-list work to support an evidence-backed **5–10 percentage-point** movement in the tracked completion estimate. Small fragments should be grouped into a larger build instead of consuming a build number without material feature completion.

The percentage movement is a planning and source-of-truth estimate, not something production GREEN can manufacture. A build may only claim the movement when the feature inventory supports it.

## Safety boundary

Production GREEN proves that the Build 421 software and migration were promoted successfully. It does not prove all 49 live renewal checkpoints are PASS, does not reactivate a revoked grant and does not extend expired consent.
