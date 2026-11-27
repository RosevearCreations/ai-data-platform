# AI Data Platform Build 452 — Site 12 end-to-end trace and complete issue-closure runbook
**Authority:** Rosevear All Applications Source of Truth, 26 November 2026, especially "Three Masters", "Autonomous testing", "Finance" and "Build order and release evidence".

## 1. What is built and what is not
The Master is a read-only observer. iCamp owns Camp Rosevear guest/site/stay IDs, free repair work, paid add-on acceptance, final folio and deposits/payment/provider settlement. Do **not** manufacture an iCamp booking, charge, staff login or signing key in AIDP.

Build 452 adds an original-owner-only Site 12 trace over the **existing authenticated webhook receipt ledger**. Contracted iCamp event types:
- `camp.site.maintenance.requested`, `camp.site.maintenance.acknowledged`, `camp.site.maintenance.resolved`;
- `camp.site.addon.requested`, `camp.site.addon.approved`, `camp.site.addon.delivered`;
- `camp.site.payment.captured`, `camp.site.folio.posted`.

The source's authorized, redacted event metadata must contain `siteNumber: "12"`, `objectId`, `operationId`, positive integer `version`, `purpose: "OPERATIONS_SUMMARY"`; optional `folioReference`. All IDs are opaque and tenant-scoped. Raw guest names, addresses, photos, payment cards and ledger lines stay in iCamp. An existing authenticated webhook receipt supplies the source identity, event ID, source event timestamp, observed receipt timestamp and webhook receipt ID.

**Current ground truth:** At Build452 baseline, the production AIDP database contained **0** `app.webhook_receipts`, **0** `app.event_bus_publications`, and **0** `app.event_bus_routes`. This is a missing source-feed outcome, **not** successful Site12 production acceptance. AIDP's previous 7/7 telemetry only proved signed health exchange, not business events.

The trace:
- rejects wrong site, missing tenant/object/operation context and unknown/unapproved event type;
- deduplicates exact `tenantId+eventId`; contradictory reuse is a conflict;
- uses source version plus event time so a late old "resolved" cannot overrule newer staff status;
- reports missing repair ACK, paid approval, delivery, payment, folio and folio reference;
- shows most recent source receipt age and stale status after 120 minutes;
- never posts business money or estimates margin without source costs;
- marks a reported final folio and capture as **source-reported**, not independently settled.

## 2. Autonomous actions in connected tools (no owner typing)
1. Review this repository's open build PRs, committed test suite, exact protected branch refs and Vercel deployment ID.
2. Deploy Code Build452 to `dev`, isolate from unrelated divergence, then merge exactly its source to `main`.
3. Verify TypeScript build, Build452 duplicate/out-of-order/stale/tenancy tests, prior Build451 regression tests and DB migrations.
4. Read production webhook counts and authenticated source-receipt schemas. Keep no fabricated production records.
5. Check production Vercel exact `main` SHA `READY`; report Release GREEN separately from Site12 pilot HOLD.
6. Review connected GitHub, Vercel and Neon source diagnostics. No mutation of Cloudflare production secrets, original Windows private keys, source application financial records or user account data.
7. After a legitimate iCamp event feed exists, AIDP automatically reads permitted Site12 events; it never tells iCamp what to charge.

## 3. One consolidated owner-only sequence for external blockers (only if an agent cannot reach the system)

### A. Original Windows AI Hub relay — original DESKTOP-AE894KC only
**Purpose:** Restore the legitimate Windows source. This is not a cloud simulation and is separate from the Comms private relay.

1. On Ree's original Windows machine, open **PowerShell**.
2. Enter `cd C:\Users\Ree\rosevearaihub`. If this folder does not exist, use the original checked-out Hub repository path; **do not create a competing clone or overwrite working copies**.
3. Enter `git status -sb`. Record dirty paths. Do not discard `package-lock.json`, local configs, or other personal files.
4. If on `main` and the working tree permits safe fast-forward, enter `git pull --ff-only origin main`. If Git refuses, stop; do not force, reset or stash.
5. Enter `python --version` then verify the existing Python environment can import `rosevear_ai_hub`. If Python isn't the existing configured interpreter, **do not install another global Python**; use the application's already working virtual environment.
6. Inspect the read-only existing Hub state: `node scripts/ql339a-relay-agent.mjs --inspect` and `node scripts/ql339a-relay-agent.mjs --probe-local`. These checks do not activate the Comms receiver.
7. Only after current Git source and private telemetry signing configuration are confirmed, run the existing one-shot **AIDP-only** relay `python scripts/send-build432-sysop-relay.py` using the correctly configured Python environment. It checks the exact original Windows host, requests a fresh server challenge, signs one non-sensitive event and sends it to AIDP. Never paste its private signing key or secrets here.
8. Expected success is an authentic `ACTIVE_V12_SIGNED` receipt. If it fails, retain its **sanitized error code** (e.g. host mismatch, 401/403, bad pin, expired challenge, network issue). Do not disable firewall, Tailscale, Windows execution protections or pass a fake private key.
9. The AIDP signed source dashboard must record a **fresh receipt** within the five-minute relay window. A green Windows process by itself is not a signed AIDP receipt.
10. Do **not** turn on `QL-340C` or a Comms private receiver automatically; those are separately held authorizations.

### B. iCamp and Yard Workers V1.2 source signer authority
1. In each application's GitHub repository, view the most recently **approved `main`** commit and its Vercel **Production READY** deployment.
2. In AIDP's owner-only `/owner-signer-authority` dashboard, review the exact error. A successful HTTP 200 or previously signed receipt is **not enough** for current signed acceptance.
3. Have the connected app's original source custodian verify that the deployed source signs protocol 1.2 envelopes containing the fresh challenge and approved non-sensitive scope. Compare the enrolled public pin's **expected source commit** with the independently verified production SHA.
4. If the source release changed, use approved source-owner public-key / pin rotation workflow. **Never** blindly replace the expected commit, reveal a private signing key or set another app to `VERIFIED` manually.
5. Rerun the AIDP signed challenge sweep and require a new accepted receipt in its protected ledger. Repeat negative tests for wrong commit, stale timestamp, wrong app and invalid challenge.

### C. Comms Hub, Devil n Dove and Rosie Dazzlers Cloudflare signers
1. In the respective **Cloudflare account** choose the exact deployed Workers/Pages application (not a similarly named preview).
2. Inspect **Settings → Variables and Secrets** for the source's own original signer authority and public telemetry route. Note **present/absent only**—never show the secret values, paste them into chat, commit them to GitHub or duplicate another application's keys.
3. Confirm the Worker/Pages production deployment, route and source-signed protocol-v1.2 challenge handling. A public GET returning HTTP 200 does not establish the right key, current deployed SHA or signed acknowledgement.
4. If source-held signer secrets are missing, the **original authorized source owner** must create/recover them in that provider using the application's approved enrollment process. Never fabricate random replacements without enrolling matching pinned public keys and independently verifying device/source custody.
5. Redeploy that source through its own release procedure, then run AIDP source verification again; record exact source revision and one newly admitted signed receipt.

### D. Original owner email verification and account recovery
1. **Do not repeat password recovery.** Original owner reset and new owner sign-in already succeeded.
2. If the application's separate Better Auth `emailVerified` flag is still false, use the normal **original Gmail verification link** from the authenticated recovery dashboard. This is a separate gate, not failure of the existing account reset.
3. Check only the original registered mailbox, not the Resend sender `ree@devilndove.com`. Never mark emailVerified directly in the database or copy the sign-in link to other systems.
4. Keep the sending-domain Resend configuration unchanged if live delivery is working.

### E. Seven independent original-device witnesses
1. Existing signed Master source telemetry does **not** equal an independently observed physical field witness.
2. Only after original-device signers and public pin custody have been approved can independent device agents submit signed envelopes to the original protected witness endpoint.
3. Source custodian retains each **private key on the original device**. Do not share key material in ChatGPT, web forms, repositories, email or Vercel.
4. Validate device ID, app ID, approved source revision, real interface/receiver ACK, owner review, anti-replay and evidence freshness for each of the seven.
5. Report number of actually verified independent field witnesses, not software tests passed or network pings. If source agents cannot be accessed, this stays HOLD, not a reason to rebuild AIDP endlessly.

### F. Camp Rosevear Site 12 end-to-end customer/business acceptance
**Best performed by the connected iCamp test-tenant workflow; only ask an actual person for a genuine physical/site observation or unavailable permission.**
1. In **Camp Rosevear tenant**, use approved test accounts and a genuine published Site 12 map. Open a **guest phone-size session** and **staff tablet-size session**, each with its own authorized role. The outer iCamp Shell must not display guest private information.
2. Guest submits a **free maintenance request** on Site 12. Record source case ID, site/stay ID, timestamp, tenant and version; verify staff monitoring map gains an **orange repair overlay** while occupancy remains correct.
3. Staff accepts/acknowledges the repair. Confirm the guest sees an acknowledgement and the same case ID remains linked. Duplicate/replay the event in a controlled test and verify one logical case.
4. Guest submits a **priced firewood order/add-on**. Validate displayed tax, charge terms and approval before committing. Record a test-only provider payment reference; no real card or charge.
5. Staff fulfills the firewood delivery. Confirm the site monitor shows its **separate purple service marker**, keeping unresolved orange repair visible.
6. Confirm **one** folio line on the **same stay**, one permitted payment allocation and correct inventory movement. Reconcile in iCamp's **own** ledger and test payment provider; AIDP must not post or mutate amounts.
7. Confirm the iCamp source emits the **approved redacted** Stage 12 event contracts through the existing authenticated webhook gateway. No raw guest personal data, photographs or card numbers go to the Master.
8. In AIDP, sign in as original owner and open `/owner-site12-trace`. Verify the two operation tracks and whether every stage is present. Source age, exclusions, duplicate suppression and missing folio/ACK must be visible.
9. Send the same event twice; then deliver an **older resolution after a newer acknowledgement**. Confirm one logical case and that older status is ignored. Repeat with another campsite/tenant and verify isolation.
10. Refresh and disconnect/reconnect staff session; record observed map update latency and source acknowledgement, and check the paid line survives. Source-of-truth acceptance requires actual guest/tenant/workflow evidence, not only green code.

## 4. What is blocked and what happens next
- Production AIDP event bus had **zero Site12 business receipts** at baseline; code can detect but not invent them. The dependency is **iCamp's authorized Site 12 event publishing and tenant test sessions**.
- Current source challenge gaps: historical 7/7 signed telemetry vs latest 1/7; repair through original source owners and original Windows device. Never equate historical success, source reachability and independent field attestation.
- Production Vercel is protected behind SSO for an external anonymous cloud browser. Code tests and database reads are feasible; an actual authenticated role-based phone/tablet browser test requires accessible authorized sessions. Don't call unauthenticated redirected pages accepted.
- Close/relabel obsolete GitHub issues only after comparing them to evidence and owner authority; an open issue count is *not* a build count.
- Once Site12 trace is demonstrably end-to-end, select the next verified Master gap: release-to-customer-task regression comparison by product, role and device, with denominator and missing observations (Source of Truth "Distinctive features" AI Data Platform row).

## 5. Build handoff
**Build 452 · AI Data Platform Master** — original owner-only `/owner-site12-trace`; read-only `webhook_receipts` iCamp events, no guest/customer data or business financial postings; duplicate and older-version handling; missing stages, source freshness and margin suppression; production code tests and exact release health; genuine Camp Rosevear phone/tablet folio pilot pending source authorization and evidence.
