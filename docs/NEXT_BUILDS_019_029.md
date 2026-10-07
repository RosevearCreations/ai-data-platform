# Detailed Build Plan — Builds 019–030

Date: 2026-10-06

This document is the execution order after Build 018. Each build should be completed, verified on `dev`, promoted through the protected pull-request path, and verified GREEN on `main` before the next build starts.

## Execution order

1. Build 019 — Authenticated Workspace Binding & Extension Session Bridge
2. Build 020 — Workspace Persistence & Cross-Device Sync Foundation
3. Build 021 — Persistent Intelligence, History & Audit Continuity
4. Build 022 — Integration Contract Verification & Consumer Readiness
5. Build 023 — Advanced Recipe Drift Detection & Repair Workbench
6. Build 024 — Mobile Barcode & Camera Intake
7. Build 025 — Source Policy Registry & Crawl Governance
8. Build 026 — Remote Execution Provider Abstraction & Cloud Worker Readiness
9. Build 027 — Controlled Remote Browser Pilot & Egress Policy
10. Build 028 — Configurable Workspace Types & Domain Profiles
11. Build 029 — Plugin & Connector SDK Foundation
12. Build 030 — Production Learning, Cost Review & Roadmap Renewal

## Why this order

Builds 019–021 finish the architectural promise already present since Build 002: real authenticated workspaces and durable workspace-scoped persistence.

Build 022 hardens business-system handoffs before enabling live intake.

Builds 023–024 improve day-to-day usability without adding remote infrastructure.

Build 025 establishes a durable source-policy registry so local scheduling and future remote execution share the same reviewed governance evidence and fail-closed rules.

Build 026 proves the remote execution lifecycle without provider lock-in or production crawling.

Build 027 is the first point where a real remote-browser provider and credentials are intentionally required.

Builds 027–028 generalize the product only after the original three workspace use cases and remote boundary are proven.

Build 030 stops the roadmap from becoming assumption-driven and requires measured evidence before defining another long queue.

## Build 019 detailed plan

Implementation sequence:

1. Add an authenticated extension bridge endpoint to the web app.
2. Return the current user plus authorized workspace memberships only.
3. Add extension-side signed-in/signed-out/expired/unavailable states.
4. Replace the disabled hard-coded workspace selector.
5. Persist the selected workspace ID locally without persisting session secrets into page-accessible storage.
6. Tag newly created local records with the active workspace ID.
7. Treat existing unscoped local records as migration candidates, never silently assign them.
8. Add database/RLS and extension tests for unauthorized workspace access.
9. Document trusted-origin/extension-origin requirements.
10. Promote only after production session and workspace selection work together.

Potential user walkthrough if required:

1. Open Chrome and go to `chrome://extensions`.
2. Turn on Developer mode if the extension is loaded unpacked.
3. Find AI Data Platform and copy only the public Extension ID. Do not copy tokens/cookies.
4. Open the deployed AI Data Platform web app and sign in normally.
5. If the app has a production environment/trusted-origin setting screen, add the extension origin shown by the implementation instructions exactly as `chrome-extension://<EXTENSION_ID>`.
6. Reload the extension.
7. Confirm the workspace selector shows only Rosie Dazzlers, Devil n Dove and Personal workspaces that the signed-in account is authorized to access.
8. Sign out of the web app and confirm the extension changes to signed-out/fail-closed state.
9. Sign back in and confirm workspace selection returns.

Only perform these steps if Build 019 explicitly reports that the production trusted-origin bridge needs them.

## Build 020 detailed plan

Implementation sequence:

1. Add workspace-scoped recipe/template tables.
2. Add reviewed dataset/provenance tables with bounded record storage.
3. Apply RLS to every new table.
4. Create authenticated sync APIs.
5. Add local sync metadata and conflict states.
6. Build non-destructive local migration/import.
7. Add offline deferred-sync queue.
8. Add cross-device retrieval.
9. Verify conflict and workspace-denial behavior.
10. Keep local copies until server confirmation; never delete local data merely because upload succeeded.

No manual user action is expected unless production database configuration is incomplete.

## Build 021 detailed plan

Implementation sequence:

1. Persist Build 013 history/change queues.
2. Persist Build 014 Rosie competitor series.
3. Persist Build 015 supplier staging and price history.
4. Persist applicable Build 016 Personal movie review state.
5. Persist Build 017 job definitions/run history.
6. Persist Build 018 integration batches/audit events.
7. Add reconciliation rules and retention limits.
8. Add web read views for history/review/audit.
9. Add append-only semantics to approval/export/cancellation evidence.
10. Verify browser reinstall/cross-device recovery.

No manual setup is expected.

## Build 022 detailed plan

Implementation sequence:

1. Define machine-readable v1 schemas for Rosie and Devil n Dove adapter packages.
2. Add contract/version/fingerprint validation.
3. Add duplicate/replay package identifiers.
4. Add stale-source policy.
5. Create valid/invalid contract fixtures.
6. Add platform-side package verifier.
7. Document consumer-side authentication/authorization requirements.
8. Define the exact receiver behavior expected in Rosie Dazzlers.
9. Define the exact receiver behavior expected in Devil n Dove.
10. Run non-production conformance simulations without live writes.

When a real intake endpoint is later enabled, repeat this walkthrough separately for each business application:

1. Open the business application's production admin environment-variable dashboard.
2. Create only the secret/token name specified by that consuming application's implementation; never paste the secret into ChatGPT.
3. Copy the public intake URL shown by that application's completed build.
4. In AI Data Platform integration settings, enter the public URL only.
5. Use the platform's Test contract button.
6. Confirm the business app reports contract v1, authentication required, and dry-run/no-write mode.
7. Send the supplied harmless test fixture.
8. Confirm the business app records the package as a test and performs no production mutation.
9. Enable live ingestion only after both systems show the same fingerprint and the consumer's own audit log is GREEN.

Do not perform this walkthrough until a business application has actually implemented the matching receiver.

## Build 023 detailed plan

Implementation sequence:

1. Store structural fingerprints with saved recipe revisions.
2. Detect selector/record-boundary drift.
3. Classify failure causes.
4. Generate deterministic nearby repair candidates.
5. Capture bounded failed-selector context.
6. Optionally ask AI to explain/rank candidates, never to auto-approve.
7. Show old/new sample extraction diff.
8. Require explicit approval.
9. Create a new recipe revision and retain rollback.
10. Require scheduled-job re-review before use.

No environment setup is expected.

## Build 024 detailed plan

Implementation sequence:

1. Add mobile-friendly capture UI.
2. Add barcode-detection capability check.
3. Add explicit camera start/stop.
4. Add UPC/EAN normalization and manual fallback.
5. Route Personal scans to movie matching.
6. Route Devil n Dove scans to supplier/inventory staging.
7. Detect duplicates.
8. Require review before enrichment/write staging.
9. Add offline capture queue.
10. Add permission/privacy tests.

Mobile camera walkthrough:

1. Open the AI Data Platform capture page in Chrome/Edge on the phone.
2. Choose Scan barcode.
3. When the browser asks for camera permission, choose Allow while using this site or the browser's equivalent one-time/site permission.
4. Point the camera at the UPC/EAN until the number is detected.
5. Verify the detected digits on screen before continuing.
6. Choose the intended workspace: Personal or Devil n Dove.
7. Review the proposed match.
8. Approve or reject it.
9. After scanning, choose Stop camera; the application must release the camera.
10. If permission was denied accidentally, use the browser's site permissions for the AI Data Platform site, set Camera to Allow, reload, and try again.

No camera permission is needed if manual barcode entry is used.

## Build 025 detailed plan

Status: COMPLETE (2026-10-07).

Implementation sequence:

1. Add a workspace-scoped source policy registry keyed by normalized HTTP/HTTPS origin.
2. Record source name, factual collection purpose and preferred collection method.
3. Record public/authorized status, applicable terms review and robots/crawl evidence.
4. Block restricted/private crawler use and any login/paywall/CAPTCHA/technical access-control bypass.
5. Add conservative minimum delay plus page/record budgets and review expiry.
6. Add approved, review-required and blocked lifecycle states.
7. Add monotonic revisions and a deterministic policy fingerprint.
8. Synchronize registry state through the existing Build 021 workspace intelligence/RLS path.
9. Pin Build 017 scheduled jobs to the exact registry policy ID/revision/fingerprint and fail closed on drift/expiry/blocking.
10. Add pure governance acceptance tests and database persistence/isolation verification.
11. Bump the extension to 0.25.0 and document the operator review workflow.

No external account, credential or environment variable is required. Human review of each real source's applicable terms/API conditions and crawl rules remains intentional.

## Build 026 detailed plan

Implementation sequence:

1. Define provider-neutral remote worker interface.
2. Add workspace-scoped job state.
3. Add lease/heartbeat/timeout/cancellation.
4. Add encrypted config references.
5. Copy source-policy evidence into every remote job.
6. Add run budgets.
7. Add idempotent result ingestion.
8. Add mock worker.
9. Add CI lifecycle tests.
10. Keep production provider execution disabled by feature flag.

No provider account or user credential setup is required.

## Build 027 detailed plan

Before implementation, the user must choose the provider from the options presented by the build based on current price, browser support, region, reliability and security. The implementation should research current options at that time rather than hard-code today's assumption.

Provider credential walkthrough:

1. Create/sign in to the selected remote-browser provider account in a normal browser.
2. Open the provider's API keys/service credentials page.
3. Create a dedicated key named for AI Data Platform production.
4. Limit its permissions/scope if the provider supports this.
5. Do not paste the key into ChatGPT or commit it to GitHub.
6. Open the production hosting environment used by the AI Data Platform web/backend.
7. Add the secret under the exact variable name given by Build 027.
8. Save it as an encrypted production secret.
9. Add a separate non-production key/secret if the provider supports environment separation.
10. Return to AI Data Platform Admin → Remote Execution.
11. Run Connection test.
12. Confirm provider identity/region without exposing the secret.
13. Add one approved low-risk source to the source allowlist.
14. Set the supplied low pilot concurrency, page, time and spend limits.
15. Keep proxy mode Off unless the build documents a lawful, necessary use case.
16. Run the dry/pilot test and confirm audit, cost and kill-switch controls before enabling another source.

Proxy credentials, if ever needed, follow the same rule: provider dashboard → dedicated limited credential → encrypted production secret → never paste into chat.

## Build 028 detailed plan

Implementation sequence:

1. Add workspace profile schema.
2. Convert existing three domains into built-in profiles.
3. Add profile-specific normalization/review settings.
4. Add profile-scoped templates/capabilities.
5. Add create/edit/archive controls.
6. Preserve RLS isolation.
7. Add safe custom profile defaults.
8. Add migration compatibility.
9. Add documentation.
10. Verify old workspaces behave unchanged.

No setup is required. The user supplies a name/purpose only when actually creating a new workspace.

## Build 029 detailed plan

Implementation sequence:

1. Define connector manifest/capabilities.
2. Define configuration schema.
3. Add secret references.
4. Add isolated server execution boundary.
5. Add compatibility/version checks.
6. Add workspace grants.
7. Add audit events.
8. Add enable/disable controls.
9. Add test harness.
10. Ship an example no-secret connector and starter template.

No external account is required for the foundation build.

## Build 030 detailed plan

Implementation sequence:

1. Collect platform operational evidence from Builds 019–029.
2. Review synchronization reliability and storage.
3. Review recipe-repair outcomes.
4. Review mobile capture outcomes.
5. Review source-policy adoption, expiry/staleness and blocked-run outcomes.
6. Review remote worker costs and failure rates.
7. Review integration/consumer readiness.
8. Review additional workspace/profile adoption.
9. Review connector SDK readiness.
10. Review security/permissions/retention.
11. Produce the next prioritized build sequence with evidence gaps and explicit user decisions.

No infrastructure setup is required. The user may be asked to choose among business priorities after the evidence report is complete.

## Promotion rule for every build

For every numbered build:

1. Confirm current `dev` and `main` heads before editing.
2. Implement the complete scoped build on `dev`.
3. Run the full repository Verify workflow.
4. Repair any failure before promotion.
5. Open the protected `dev → main` pull request on the exact verified head.
6. Require PR-context Verify GREEN.
7. Merge with expected head SHA pinned.
8. Confirm `main` tree equals the verified `dev` tree.
9. Require the `main` Production Verify workflow GREEN.
10. Only then mark the build complete and advance the queue.
