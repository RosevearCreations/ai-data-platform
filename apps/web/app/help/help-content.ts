export const HELP_TOPICS = {
  "command-center": {
    title: "Application Command Center & Workspace Home",
    summary: "Build 043 turns the signed-in home page into a read-only operational command center assembled from existing RLS-scoped adoption, remote execution, retention and integration-delivery evidence.",
    steps: [
      "Start with the attention count, then open the workspace cards that show a measured review condition.",
      "Use Operational pulse to see whether sync, barcode, scheduled, remote and integration workflows are actually being used.",
      "Read workspace attention chips as review prompts only; they do not change permissions, profiles, storage policy or execution controls.",
      "Use Latest provider & delivery events for recent durable evidence and then open the relevant workflow for full details.",
      "Launch work from the direct workflow links instead of treating the dashboard as an execution surface."
    ],
    notes: [
      "Build 043 creates no new telemetry table and never manufactures dashboard events.",
      "All workspace content comes through existing authenticated functions that preserve PostgreSQL row-level security.",
      "The command center is intentionally read-only; consequential actions remain inside their existing controlled workflows."
    ],
    manual: [
      "No new account, environment variable, paid service or database migration is required.",
      "If a workspace shows no activity, create only genuine operational evidence through the normal workflow rather than test activity just to populate the dashboard."
    ]
  },
  "corrective-closure-overview": {
    title: "Corrective Delivery Reconciliation & Exception Closure",
    summary: "Build 055 independently verifies the fields written by an accepted Build 054 corrective delivery and permits closure only from the latest matched read-back. Transport acceptance alone never closes an exception.",
    steps: [
      "Start from an accepted Build 054 corrective delivery whose Build 053 plan and exception case are still approved.",
      "Confirm the configured consumer origin still matches the consumer origin pinned to the corrective delivery.",
      "Require a fresh stateVerificationSupported=true handshake before reading current consumer state.",
      "Request only the integration keys and governed field names present in the frozen corrective package; expected values are never sent to the consumer.",
      "Compare current consumer state server-side against the exact corrective package.",
      "Treat matched, drift, rejected and transport-error results as append-only evidence.",
      "Allow closure only when the latest corrective reconciliation for that delivery is matched.",
      "Require a separate typed closure confirmation and a non-empty closure note before recording immutable closure evidence."
    ],
    notes: [
      "Build 055 sends no corrective mutation and never retries Build 054 delivery.",
      "A later drift/rejected/transport-error verification supersedes an earlier matched result for closure eligibility.",
      "The Build 053 case cannot transition to closed through the generic triage path; the database requires a Build 055 closure row.",
      "Closure evidence pins the case, approved plan, accepted corrective delivery, latest matched reconciliation and verification fingerprints."
    ],
    manual: [
      "Apply 0025_corrective_reconciliation_closure.sql before using Build 055.",
      "Build 055 reuses the existing supported consumer URL/token variables and introduces no new secret or paid service."
    ]
  },
  "corrective-closure-verify": {
    title: "Corrective state read-back",
    summary: "Read-back asks the consumer for current values after Build 054 without revealing the expected values in the request.",
    steps: [
      "Choose an accepted corrective delivery.",
      "Build 055 verifies consumer-origin continuity and performs a fresh state-verification handshake.",
      "The verify-state request identifies the exact corrective package and governed field names only.",
      "Matched means every governed corrective field now equals the frozen expected value.",
      "Drift or missing state keeps the exception open and should return to planning rather than being auto-repaired."
    ],
    notes: [
      "Every verification is append-only so later regression cannot erase earlier evidence.",
      "Verification errors are evidence, not closure."
    ]
  },
  "corrective-closure-evidence": {
    title: "Verified closure evidence",
    summary: "Exception closure is a distinct owner/admin action backed by the latest matched corrective reconciliation.",
    steps: [
      "Review the latest matched corrective reconciliation and its per-key results.",
      "Enter a closure note explaining why the evidence warrants closure.",
      "Type the exact CLOSE VERIFIED <TARGET> EXCEPTION phrase.",
      "Build 055 inserts immutable closure evidence before setting the Build 053 case to closed.",
      "If a newer corrective reconciliation exists and is not matched, closure fails closed."
    ],
    notes: [
      "Closure rows are SELECT/INSERT only for the runtime role; they cannot be edited or deleted.",
      "The database trigger blocks direct case closure when no verified closure row exists."
    ]
  },
  "corrective-delivery-overview": {
    title: "Approved Corrective Delivery Activation & Idempotent Execution",
    summary: "Build 054 converts one approved Build 053 corrective plan into a new deterministic corrective package, proves that exact package by external dry-run, grants short-lived corrective authority, then executes with sender-side reservation and replay-key idempotency.",
    steps: [
      "Start only from a Build 053 corrective plan whose status is approved and whose exception case is still approved.",
      "Confirm the Build 052 reconciliation referenced by the plan is still the newest reconciliation for the original accepted delivery.",
      "Resolve every manual-review scope item by creating and approving a new executable plan; Build 054 never guesses create semantics.",
      "Type the target-specific activation confirmation, then require a fresh liveMutationEnabled=true handshake with replayKey / return-original-ack idempotency.",
      "Send an authenticated external dry-run of the exact corrective package and activate only after that consumer accepts it.",
      "Use the separate execution confirmation during the active one-hour window; Build 054 revalidates live/idempotency capability before every live attempt.",
      "Reserve the corrective delivery before the network mutation and send the corrective replay key as Idempotency-Key.",
      "Treat accepted/rejected as terminal; retry only transport-error with the exact same corrective package, activation and idempotency key."
    ],
    notes: [
      "The corrective package receives a new package ID and replay key derived from the approved plan; it never reuses the original Build 051 replay identity.",
      "Activation lasts at most one hour and never beyond the corrective package's 24-hour approved-plan window.",
      "A newer reconciliation makes the approved plan stale and blocks activation.",
      "Corrective package values come only from frozen Build 053 governed values; browser input cannot supply corrective data, endpoint, token or idempotency identity.",
      "Accepted corrective execution does not automatically close the exception because downstream state still requires post-correction verification."
    ],
    manual: [
      "Apply 0024_corrective_delivery_execution.sql before using Build 054.",
      "Build 054 reuses the existing INTEGRATION_CONSUMER_ROSIE_DAZZLERS_URL / TOKEN or INTEGRATION_CONSUMER_DEVIL_N_DOVE_URL / TOKEN configuration and introduces no new secret or paid service."
    ]
  },
  "corrective-delivery-activation": {
    title: "Corrective dry-run & short-lived activation",
    summary: "Activation is a temporary grant for one exact approved plan, one exact corrective package and the same consumer origin that accepted the original Build 051 delivery.",
    steps: [
      "Verify the configured consumer origin still matches the original accepted delivery consumer.",
      "Type the displayed ACTIVATE <TARGET> CORRECTIVE phrase exactly.",
      "Build 054 performs a fresh live/idempotency handshake and then an external dry-run of the corrective package.",
      "Activation is created only when the dry-run acknowledgement is accepted and echoes the exact corrective package ID, replay key and fingerprint.",
      "Use Revoke activation immediately when the correction should no longer be executable."
    ],
    notes: [
      "Dry-run acknowledgement evidence is stored inside the activation row and cannot be rewritten by the runtime role.",
      "Expired activations are fail-closed and may be replaced only after a new accepted dry-run."
    ]
  },
  "corrective-delivery-idempotency": {
    title: "Corrective execution, retry & terminal evidence",
    summary: "Every corrective mutation has one durable sender-side delivery identity and one immutable replay key. This preserves exactly-once intent even when the network outcome is uncertain.",
    steps: [
      "Type the displayed EXECUTE <TARGET> CORRECTIVE phrase for the active plan.",
      "Build 054 revalidates liveMutationEnabled and return-original-ack behavior before reserving a send.",
      "The platform reserves the delivery row before contacting the consumer.",
      "The corrective replay key is the Idempotency-Key for every attempt.",
      "If transport certainty is lost, retry only through the same workbench; the attempt count increases but package/idempotency identity does not change.",
      "Accepted and rejected results are terminal and a later execution request returns the stored terminal evidence without another send."
    ],
    notes: [
      "Retries are bounded to five attempts.",
      "Runtime UPDATE privileges cannot change plan fingerprint, activation fingerprint, corrective package identity, replay key or idempotency key.",
      "A rejected corrective package requires a new reviewed plan rather than an automatic resend."
    ]
  },
  "reconciliation-triage-overview": {
    title: "Reconciliation Exception Triage & Corrective Delivery Planning",
    summary: "Build 053 turns Build 052 drift evidence into an explicit owner/admin triage case and, when justified, an immutable corrective delivery plan. It freezes affected integration keys, governed fields, desired values, package identity, rationale and review evidence without contacting a consumer or executing a correction.",
    steps: [
      "Start only from a Build 052 reconciliation with status=drift.",
      "Create one canonical exception case and classify the discrepancy, severity and intended resolution.",
      "Use investigation notes to record why the drift is expected, acceptable, uncertain or potentially corrective.",
      "Set resolution intent to plan-correction only when a corrective delivery should be designed.",
      "Create a frozen corrective plan; Build 053 reconstructs the accepted package and scopes only mismatched or missing governed fields.",
      "Review the frozen scope and approve, reject or withdraw the plan as a planning artifact."
    ],
    notes: [
      "Approval is not execution: Build 053 has no consumer transport, live activation or corrective delivery endpoint.",
      "One triage case is canonical per reconciliation so repeated UI actions cannot create competing exception identities.",
      "Plan scope is immutable after creation; only review status and review evidence may change.",
      "A missing record that originated from an update operation is marked manual-review instead of assuming that a create is safe.",
      "Pinned reconciliation fingerprint, package ID, replay key and package fingerprint cannot be edited by the runtime role."
    ],
    manual: [
      "Apply 0023_reconciliation_exception_triage.sql before using Build 053.",
      "Build 053 introduces no new secret, external account or paid service.",
      "A future build is required before any approved corrective plan can be activated or executed."
    ]
  },
  "reconciliation-triage-case": {
    title: "Exception case classification",
    summary: "A triage case records the operational interpretation of immutable Build 052 drift without changing the underlying reconciliation.",
    steps: [
      "Choose a classification that reflects the current evidence rather than the desired outcome.",
      "Set severity according to business impact, not simply the number of changed fields.",
      "Use investigate when the cause is uncertain, accept-drift for an intentional downstream difference, plan-correction for a deliberate corrective proposal, and no-action when evidence should remain informational.",
      "Keep investigation notes factual and separate from the frozen reconciliation evidence."
    ],
    notes: [
      "Case metadata may be updated by an owner/admin, but reconciliation fingerprint, package identity and affected-key snapshot remain immutable."
    ]
  },
  "reconciliation-triage-planning": {
    title: "Corrective delivery plan scope",
    summary: "A corrective plan is generated from the original accepted package plus the exact mismatched/missing records in one Build 052 drift reconciliation.",
    steps: [
      "For mismatched records, include only the governed fields that Build 052 proved differ.",
      "For missing records that were originally created, plan restore-missing with the original governed values.",
      "For missing records that were originally updates, mark manual-review instead of inferring that creation is safe.",
      "Freeze package identity, reconciliation fingerprint, desired values and rationale into one plan fingerprint.",
      "Create a new plan if the rationale or intended scope needs to change; do not edit an existing frozen plan."
    ],
    notes: [
      "The plan contains desired governed values from the accepted package, not values invented during triage.",
      "No plan creation path calls the downstream consumer."
    ]
  },
  "reconciliation-triage-review": {
    title: "Plan review & approval",
    summary: "Review status records whether a frozen corrective plan is acceptable for a later execution workflow. It never authorizes Build 053 to send anything.",
    steps: [
      "Confirm reconciliation fingerprint, package fingerprint, affected keys and governed field scope.",
      "Review any manual-review entries before approving the planning artifact.",
      "Record a review note and choose approved, rejected or withdrawn.",
      "Treat approved as ready for a future controlled-execution build, not as a live delivery request."
    ],
    notes: [
      "A proposed plan can be reviewed only once; terminal review status cannot be overwritten through the runtime API.",
      "Execution must require a separate future control boundary with its own dry-run, activation, idempotency and post-delivery verification."
    ]
  },
  "post-delivery-reconciliation-overview": {
    title: "Post-Delivery Reconciliation & Consumer State Verification",
    summary: "Build 052 performs a read-only comparison after an accepted Build 051 live delivery. It reconstructs the exact historical package, asks the configured consumer for current state, compares only package-governed fields and stores immutable matched, mismatched or missing evidence.",
    steps: [
      "Start from an accepted Build 051 live-delivery record; rejected, transport-error and reserved deliveries are not eligible.",
      "Confirm the currently configured consumer origin is the same origin that accepted the original live package.",
      "Run Verify current consumer state; Build 052 first requires a fresh handshake with stateVerificationSupported=true.",
      "The request sends package identity, integration keys and governed field names, but not the expected values that the consumer is supposed to prove.",
      "Review matched, mismatched and missing counts plus the field-level discrepancy names and expected/observed fingerprints.",
      "Treat drift as evidence for follow-up. Build 052 does not automatically repair, roll back, retry or send a new delivery."
    ],
    notes: [
      "Historical reconciliation remains available after the publication is withdrawn or the delivery mapping is retired because those controls stop future writes, not audit reads.",
      "The consumer response must cover every expected integration key exactly once; duplicate, omitted or unexpected keys fail closed.",
      "Only fields governed by the original package are compared. Consumer-managed fields outside that package are ignored.",
      "Observed values are compared in memory; durable reconciliation evidence stores fingerprints and differing field names rather than copying the full consumer record.",
      "Reconciliation evidence is append-only through the runtime role."
    ],
    manual: [
      "Apply 0022_post_delivery_reconciliation.sql before using Build 052.",
      "Build 052 reuses the existing configured consumer URL/token variables and introduces no new secret or paid service.",
      "The downstream consumer must advertise stateVerificationSupported=true and implement the read-only verify-state request/response contract before verification can succeed."
    ]
  },
  "post-delivery-reconciliation-verify": {
    title: "Read-only consumer state verification",
    summary: "Verification proves the consumer's current governed fields against the exact accepted package without granting any mutation authority.",
    steps: [
      "The platform reconstructs the historical package from immutable publication and mapping evidence and verifies package ID, replay key and fingerprint against the accepted live-delivery row.",
      "A fresh consumer handshake must advertise stateVerificationSupported=true.",
      "The platform requests only the expected integration keys and governed field names.",
      "A found record is compared field-by-field against package values; a missing record is recorded explicitly.",
      "A rejected or transport-error verification is preserved as evidence but is not treated as drift."
    ],
    notes: [
      "Consumer identity changes fail closed rather than querying a different endpoint.",
      "The verification call is read-only and does not use the Build 051 live activation."
    ]
  },
  "post-delivery-reconciliation-evidence": {
    title: "Reconciliation evidence & drift",
    summary: "Each verification creates one immutable reconciliation record with package identity, outcome counts, per-record fingerprints and differing governed field names.",
    steps: [
      "Matched means every governed field for every expected integration key equals the delivered package.",
      "Mismatched means the consumer record exists but one or more governed fields differ.",
      "Missing means the expected integration key is not currently present at the consumer.",
      "Rejected means the consumer answered the verification request but refused to provide state.",
      "Transport-error means capability, transport or response validation prevented a trustworthy comparison."
    ],
    notes: [
      "Build 052 records evidence only. Corrective mutation requires a later explicit remediation workflow.",
      "Repeated verification creates additional evidence so later drift can be distinguished from the state observed immediately after delivery."
    ]
  },
  "controlled-live-delivery-overview": {
    title: "Controlled Consumer Activation & Idempotent Live Delivery",
    summary: "Build 051 is the first AI Data Platform path that may send dryRun=false to a business consumer. It does so only after an explicit 24-hour activation tied to one Build 050 mapping, one configured consumer origin, one recent accepted external dry-run and a fresh handshake that proves live mutation plus replay-key idempotency.",
    steps: [
      "Complete Build 050 conformance, external handshake and an accepted external dry-run for the exact mapping first.",
      "Verify the consumer handshake advertises liveMutationEnabled=true and idempotency with replayKey plus return-original-ack duplicate behavior.",
      "Type the exact activation phrase shown by the workbench; activation is owner/admin-only and expires after 24 hours.",
      "Before each live send, review the publication, mapping, consumer origin and prior delivery state, then type the separate delivery confirmation phrase.",
      "Treat an accepted live-delivery record as terminal; the platform returns the existing result instead of sending a second mutation.",
      "Retry only a transport-error outcome and only while the same activation remains valid; the exact replay key is reused."
    ],
    notes: [
      "A configured consumer URL/token alone is never enough to enable live mutation.",
      "A local conformance result does not satisfy the activation gate; the accepted dry-run must come from the configured external consumer within the preceding 24 hours.",
      "The live-delivery Idempotency-Key is the existing package replayKey and cannot be edited by the runtime role.",
      "The consumer must advertise duplicateBehavior=return-original-ack so duplicate replay keys return the original acknowledgement instead of applying the mutation again.",
      "Activation revocation or expiry blocks new live sends but does not rewrite earlier delivery evidence."
    ],
    manual: [
      "Apply 0021_controlled_live_delivery.sql before using Build 051.",
      "Build 051 reuses the existing Build 033 consumer URL/token variables; it introduces no new secret or paid service.",
      "The downstream Rosie Dazzlers or Devil n Dove consumer must be upgraded to return the Build 051 live/idempotency handshake fields before activation becomes possible."
    ]
  },
  "controlled-live-delivery-activation": {
    title: "Live activation prerequisites",
    summary: "Activation is temporary authorization for one immutable publication/mapping/package identity and one configured consumer origin. It is not a general workspace permission.",
    steps: [
      "Confirm the Build 050 mapping is active and package-ready.",
      "Confirm the external dry-run receipt is accepted, belongs to the same package/mapping/consumer and is less than 24 hours old.",
      "Confirm the fresh consumer handshake still advertises live mutation and replay-key idempotency.",
      "Type the target-specific activation phrase exactly; do not copy an old activation to a changed mapping or endpoint.",
      "Revoke activation immediately when the consumer endpoint, mapping intent or operational plan changes."
    ],
    notes: [
      "An activation pins the publication fingerprint, mapping fingerprint, package fingerprint, package ID, replay key, consumer origin and dry-run receipt.",
      "Only one active activation may exist for a mapping; an expired activation is revoked before a replacement is created."
    ]
  },
  "controlled-live-delivery-idempotency": {
    title: "Idempotent live delivery & retry",
    summary: "Build 051 reserves one canonical delivery record per consumer origin and package ID before the network call. The replay key is sent as the Idempotency-Key and is reused unchanged if a transport result is uncertain.",
    steps: [
      "A first live send creates a reserved delivery record before contacting the consumer.",
      "If the consumer returns an accepted acknowledgement with dryRun=false, the delivery becomes terminal accepted and cannot be resent.",
      "If the consumer explicitly rejects the package, the delivery becomes terminal rejected and requires a corrected/new mapping rather than a resend.",
      "If transport or acknowledgement validation fails, the result is transport-error and may be retried with the identical replay key, up to the bounded retry limit.",
      "Compare publication, mapping, activation and package fingerprints when reconciling a live receipt."
    ],
    notes: [
      "A retry never invents a new idempotency key.",
      "Concurrent or rapid duplicate sends are blocked by the durable reservation.",
      "A transport error means mutation outcome may be unknown; consumer-side return-original-ack behavior is what makes retry safe."
    ]
  },
  "publication-delivery-overview": {
    title: "Approved Publication Delivery Mapping & Consumer Receipt Bridge",
    summary: "Build 050 maps one immutable Build 049 publication into the existing Build 033 v1 consumer contract and keeps a fingerprint-linked receipt chain from publication through mapping and package to consumer acknowledgement.",
    steps: [
      "Start from an active Build 049 publication; withdrawn publications fail closed.",
      "Have a workspace owner/admin create an immutable mapping for Rosie Dazzlers or Devil n Dove.",
      "Choose the publication field used for the integration key, the create/update intent, source-evidence URL/timestamp fields, and the explicit consumer-field map.",
      "Run conformance first so the generated package is independently validated and replay behavior is proven without contacting a business application.",
      "When the target consumer is configured, test the authenticated handshake before sending one external dry-run package.",
      "Confirm the receipt card carries the publication fingerprint, mapping fingerprint and package fingerprint before treating the handoff as proven."
    ],
    notes: [
      "Mapping content is immutable after creation; retirement is the only runtime update and corrections require a new mapping.",
      "The package identity binds the Build 049 publication ID/fingerprint and Build 050 mapping ID/fingerprint.",
      "A withdrawn publication or retired mapping cannot generate a new package.",
      "Build 050 external transport remains dry-run only and does not authorize a live Rosie Dazzlers or Devil n Dove mutation."
    ],
    manual: [
      "Apply 0020_publication_delivery_bridge.sql before using the Build 050 workbench.",
      "No new external account or paid service is required; local conformance works without a configured business consumer.",
      "External dry-run uses the existing INTEGRATION_CONSUMER_ROSIE_DAZZLERS_URL / INTEGRATION_CONSUMER_ROSIE_DAZZLERS_TOKEN or INTEGRATION_CONSUMER_DEVIL_N_DOVE_URL / INTEGRATION_CONSUMER_DEVIL_N_DOVE_TOKEN server configuration."
    ]
  },
  "publication-delivery-mapping": {
    title: "Immutable publication-to-consumer mapping",
    summary: "A mapping records exactly how frozen publication fields become consumer contract values. It is validated against every publication row before it can be saved.",
    steps: [
      "Select a stable scalar publication field for the consumer integration key.",
      "Choose create or update explicitly; Build 050 never infers consumer state.",
      "Select a valid source-evidence timestamp field and either a row URL field or the publication source URL.",
      "Map only allowed consumer contract fields to existing publication fields.",
      "Create the mapping only after every row can produce a unique key, scalar values and valid source evidence."
    ],
    notes: [
      "Duplicate integration keys, non-scalar mapped values, invalid URLs or invalid evidence timestamps fail closed.",
      "An identical mapping for the same publication and target resolves to the existing canonical mapping."
    ]
  },
  "publication-delivery-consumer": {
    title: "Conformance, handshake & dry-run delivery",
    summary: "Build 050 reuses the Build 033 consumer protocol instead of creating a second transport. Conformance is local; external handshake and delivery require the existing configured HTTPS endpoint and bearer credential.",
    steps: [
      "Run conformance before any external contact.",
      "Use Test handshake to confirm protocol, target, schema, bearer authentication and dry-run support.",
      "Use Send dry-run only while the mapping remains ready and the consumer is configured.",
      "Treat any rejection, replay response, invalid acknowledgement or transport error as evidence to resolve rather than a reason to bypass validation."
    ],
    notes: [
      "No browser request can supply an arbitrary outbound endpoint.",
      "External delivery follows the existing no-redirect, bounded-timeout Build 033 transport.",
      "An acknowledgement claiming a live mutation is rejected."
    ]
  },
  "publication-delivery-receipts": {
    title: "Publication-linked consumer receipts",
    summary: "The receipt ledger is append-only evidence connecting the exact publication and mapping fingerprints to the generated package and the consumer result.",
    steps: [
      "Compare publicationFingerprint, mappingFingerprint and packageFingerprint on each receipt.",
      "Use transportMode to distinguish local conformance from an external consumer acknowledgement.",
      "Use validationCode and receipt status to understand accepted, rejected and transport-error outcomes.",
      "Keep prior receipts when a mapping is retired; retirement stops future package generation but does not rewrite evidence."
    ],
    notes: [
      "Receipt details are bounded and do not contain bearer credentials or full package bodies.",
      "Runtime access is SELECT/INSERT only; receipts cannot be edited or deleted through the normal application role."
    ]
  },
  "approved-data-overview": {
    title: "Approved Dataset Publishing & Export Handoff",
    summary: "Build 049 turns one terminal approved Build 048 review into one immutable publication snapshot. The publication keeps the exact approved cleaned rows, source provenance, review approval evidence and a publication fingerprint before any export is produced.",
    steps: [
      "Start only from a Build 048 review whose status is approved.",
      "Have a workspace owner/admin publish the approved review once; the publication snapshot is canonical for that review.",
      "Confirm the source dataset ID/version/fingerprint and publication fingerprint before handing the data to another process.",
      "Use JSON when the receiving workflow needs the full manifest plus rows; use CSV for a flat tabular handoff.",
      "Copy the manifest when a recipient needs provenance without the full dataset payload.",
      "Withdraw a publication if future exports should stop; create a new approved review for corrected data rather than editing the published snapshot."
    ],
    notes: [
      "Publishing never changes the Build 048 review or the original reviewed dataset.",
      "A publication contains only rows included in the approved review and freezes the approved cleaned values at publication time.",
      "Each JSON/CSV export is recorded as a workspace-scoped audit event.",
      "Withdrawal blocks new platform exports but cannot recall copies that were already downloaded.",
      "Build 049 creates files and handoff evidence only; it does not automatically write into Rosie Dazzlers, Devil n Dove or another downstream system."
    ],
    manual: [
      "No new external account, environment variable, secret or paid service is required.",
      "The normal database migration applies 0019_approved_dataset_publishing.sql before the application surface is used."
    ]
  },
  "approved-data-publish": {
    title: "Publishing an approved snapshot",
    summary: "Publishing is an owner/admin action that converts the exact terminal approval into an immutable export snapshot. One approved review has one canonical publication record.",
    steps: [
      "Check the approval time, approved row count and source fingerprint.",
      "Add an optional publication note describing the handoff purpose or intended recipient context.",
      "Publish only when the approval is the exact version that should leave the review workflow.",
      "If the source data later changes, complete a new review and approval instead of republishing edited rows."
    ],
    notes: [
      "Members may inspect publications but owner/admin authority is required to create or withdraw one.",
      "Duplicate publication requests for the same approved review resolve to the existing canonical publication rather than creating competing snapshots."
    ]
  },
  "approved-data-export": {
    title: "JSON, CSV & handoff evidence",
    summary: "Exports are generated on demand from the immutable publication rows. The JSON package includes the complete handoff manifest; CSV preserves the publication field order and encodes nested values as JSON text.",
    steps: [
      "Use Download JSON for a self-describing package with provenance, fingerprints, publication metadata and rows.",
      "Use Download CSV when a spreadsheet/import workflow needs the approved rows in stable column order.",
      "Use Copy manifest when only the publication identity and provenance are needed.",
      "Verify the publication fingerprint when a receiving process records or acknowledges the handoff."
    ],
    notes: [
      "Exports are generated from the publication snapshot, never from a later mutable review or source dataset.",
      "Withdrawn publications remain visible as audit evidence but cannot create new JSON or CSV exports.",
      "Exporting does not upload the dataset to a third-party service."
    ]
  },
  "data-review-overview": {
    title: "Data Review, Cleanup & Approval Workbench",
    summary: "Build 048 creates a durable workspace-scoped review snapshot from an existing reviewed-dataset version. Original evidence is preserved, cleanup happens on a working copy, and owner/admin approval or rejection is recorded as a separate auditable decision.",
    steps: [
      "Choose the exact workspace dataset version you want to inspect and start a review snapshot.",
      "Compare every original row with the deterministic cleaned row; automatic cleanup only trims and collapses string whitespace.",
      "Exclude duplicate or unsuitable rows and edit the working JSON only when a factual correction is needed.",
      "Save cleanup drafts as often as needed while the batch remains in review.",
      "Have a workspace owner/admin record the final approval or rejection after reviewing the included rows and decision note.",
      "Download the terminal decision snapshot when a portable approved/rejected handoff is needed."
    ],
    notes: [
      "The source workspace_reviewed_datasets row is never overwritten by Build 048.",
      "Automatic duplicate detection defaults later identical cleaned rows to excluded but never deletes the original evidence.",
      "Approved/rejected review batches are terminal for that exact source version and fingerprint; changed source data creates a new review candidate.",
      "Build 048 records an approval handoff only and does not automatically write into Rosie Dazzlers, Devil n Dove or another business system."
    ],
    manual: [
      "No new external account, environment variable, secret or paid service is required.",
      "The normal deployment migration applies 0018_data_review_workbench.sql; no manual production data approval is performed during deployment."
    ]
  },
  "data-review-rows": {
    title: "Row cleanup, exclusions & decision evidence",
    summary: "Each review row keeps immutable original evidence beside an editable working copy. Exclusion and cleanup decisions remain in the review batch rather than mutating the source dataset.",
    steps: [
      "Treat duplicate-cleaned-row and blank-field indicators as review prompts, not automatic truth.",
      "Keep Include in approval selected only for rows that should remain in the approved snapshot.",
      "Edit Working cleaned row as valid JSON and keep the factual meaning tied to the original evidence.",
      "Save before leaving a long review session so the cleanup state and audit event are durable.",
      "Use Approve reviewed data only after the included rows are ready; only owner/admin roles may make the terminal decision."
    ],
    notes: [
      "At least one row must remain included in an approvable cleanup draft.",
      "The API rejects fabricated row IDs, oversized row payloads and edits to terminal review batches.",
      "The decision download contains the source dataset ID/version/fingerprint plus only the rows included in the review snapshot."
    ]
  },
  "collection-runs-overview": {
    title: "Collection Run Console & Live Evidence",
    summary: "Build 047 combines current Build 045 project/source readiness, synchronized local Chrome scheduled-job attempts, and existing Browserless remote-execution evidence into one operational console without creating another execution authority.",
    steps: [
      "Filter to the authorized workspace and active collection project.",
      "Use Local Chrome when an operator is present on the approved source page; run it from the existing extension Scheduled jobs panel and let intelligence sync return the attempt evidence.",
      "Use Browserless only when the current Source Policy pin, saved scraper, allowlist, workspace arm, provider flag, token and global kill-switch state all satisfy the existing remote-execution gate.",
      "Watch active Browserless work until terminal evidence appears, or request Stop / cancel when the run should end.",
      "Retry only a failed, timed-out or cancelled one-page Browserless attempt; a successful attempt is never offered as a failed-page retry.",
      "Download the JSON run report when you need the current project, source, policy, Chrome and Browserless evidence in one portable record."
    ],
    notes: [
      "Build 047 reuses the existing remote-execution job/result tables and synchronized scheduled-jobs intelligence; it does not create a duplicate evidence table.",
      "The Browserless adapter remains the existing one-page controlled boundary, so Browserless row counts remain zero until a future explicitly approved extraction boundary exists.",
      "Local Chrome extraction remains operator-present and extension-owned; this web page observes synchronized evidence rather than remotely controlling Chrome."
    ],
    manual: [
      "No new account, secret, database migration or paid service is required for Build 047.",
      "Browserless execution still depends on BROWSERLESS_API_TOKEN, REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED=true and the deliberate REMOTE_EXECUTION_KILL_SWITCH=false run window.",
      "If Browserless is fail-closed, use /remote-execution to review the existing workspace/allowlist controls rather than bypassing them."
    ]
  },
  "collection-runs-evidence": {
    title: "Run evidence, cancellation & retry",
    summary: "Live evidence is derived from durable remote jobs/results and synchronized Chrome attempts. Status, rows, errors, provider units and timestamps are reported only when those evidence paths recorded them.",
    steps: [
      "Prepared, queued, leased and running Browserless jobs count as active work.",
      "Stop / cancel writes the existing durable remote cancellation request; the active Browserless worker checks that request and aborts fail-closed.",
      "Succeeded, failed, cancelled and timed-out jobs remain visible as terminal evidence.",
      "Provider units come from recorded Browserless result evidence; missing cost evidence is never estimated as a fabricated value.",
      "Chrome rows come from synchronized local run attempts and stay distinct from Browserless one-page provider evidence."
    ],
    notes: [
      "The console polls only while remote work is active and can also be refreshed manually.",
      "Downloaded reports are generated in the browser from the evidence already visible to the signed-in account and do not create a new server record."
    ]
  },
  "recipe-builder-overview": {
    title: "Visual Extraction Recipe Builder",
    summary: "Build 046 adds a signed-in web authoring surface for the same version-1 extraction recipe contract used by the Chrome extension. Recipes save into the existing synchronized saved-scraper/template store rather than a new persistence model.",
    steps: [
      "Choose the authorized workspace where the recipe belongs.",
      "Load an existing synchronized recipe or start a new template/scraper.",
      "Optionally seed the source URL from an active Build 045 collection-project source.",
      "Define the record selector, then add, duplicate, reorder and configure field cards.",
      "Resolve validation errors, test against bounded sample HTML, then save a synchronized revision.",
      "Use the Chrome extension live-page picker when you need selectors derived directly from a real page."
    ],
    notes: [
      "Web-authored recipes use the same version-1 field/source/transform contract as the extension.",
      "Saving uses existing optimistic concurrency, so a stale edit conflicts instead of silently overwriting a newer recipe.",
      "A scraper requires a source URL; a reusable template may remain source-neutral."
    ],
    manual: [
      "No new account, environment variable, paid service or database migration is required.",
      "Install/use the existing Chrome extension only when live-page visual element picking is required."
    ]
  },
  "recipe-builder-preview": {
    title: "Recipe validation, preview & portable JSON",
    summary: "Build 046 preview operates only on HTML explicitly pasted into the browser. It never fetches a source, bypasses access controls or creates collection evidence.",
    steps: [
      "Fix duplicate field keys, missing selectors and missing attribute names before preview.",
      "Paste a bounded representative HTML sample into the preview lab.",
      "Run the preview and inspect matched records, extracted values and required-field warnings.",
      "Use portable JSON to copy a recipe between authoring contexts or import an existing version-1 recipe.",
      "Save only after the preview/validation evidence matches the intended source structure."
    ],
    notes: [
      "Preview considers at most 100 matched records and renders at most 20 rows.",
      "Remote collection remains behind Source Policy, scheduling and remote-execution controls.",
      "Preview success is not Source Policy approval and is not permission to collect."
    ]
  },
  "collection-projects-overview": {
    title: "Source & Collection Project Manager",
    summary: "Build 045 groups real source-collection work into durable workspace projects. Projects and sources are PostgreSQL/RLS-scoped; only workspace owners/admins can mutate them.",
    steps: [
      "Create a project in the intended authorized workspace and record its factual purpose, cadence and responsible person.",
      "Add each real source URL with the collection method that will actually be used.",
      "Link the current Source Policy ID when governance review exists.",
      "Optionally link an active saved scraper/template when the source uses one.",
      "Use readiness and blocker details to resolve governance/configuration gaps before running collection in the originating workflow."
    ],
    notes: [
      "This manager does not approve Source Policy, enable remote execution or launch collection.",
      "Projects are archived and sources are retired instead of destructively deleted.",
      "Workspace RLS remains authoritative for both reads and writes."
    ],
    manual: [
      "No new external account, secret, paid service or environment variable is required.",
      "The Build 045 database migration is applied by the normal deployment migration workflow."
    ]
  },
  "collection-projects-readiness": {
    title: "Collection readiness & blockers",
    summary: "Readiness is recomputed from the source's current linked governance and scraper/template evidence. It is not stored as an approval flag.",
    steps: [
      "READY means a current approved Source Policy matches the source origin and collection method, and any explicitly linked scraper/template is active and origin-matched.",
      "BLOCKED means required linked governance or explicitly requested scraper evidence is missing, expired, unapproved or mismatched.",
      "INCOMPLETE means the project has no sources yet or the source has been retired.",
      "Fix Source Policy or scraper evidence in its originating workflow; the manager will reflect the new evidence on refresh."
    ],
    notes: [
      "Project readiness is blocked if any non-retired source is blocked.",
      "Build 045 never turns a readiness label into collection authorization."
    ]
  },
  "data-library-overview": {
    title: "Unified Data Library",
    summary: "Build 044 provides one read-only explorer over existing RLS-scoped saved scrapers/templates, reviewed datasets, intelligence modules and barcode captures. It does not copy records into a new library table.",
    steps: [
      "Open the Data Library from the Command Center.",
      "Choose one authorized workspace or keep all authorized workspaces visible.",
      "Filter by record type or search title, source and bounded JSON values.",
      "Use the record explorer to compare normalized/summary data with the raw durable payload and provenance.",
      "Treat tombstone, duplicate and review flags as evidence from the originating record rather than inferred quality scores."
    ],
    notes: [
      "The library query runs under the same PostgreSQL row-level-security identity as the rest of the web application.",
      "Build 044 is read-only and never edits a scraper, dataset, intelligence module or barcode review.",
      "External source links are clickable only for http/https URLs; other source references are displayed as text."
    ],
    manual: [
      "No new database migration, environment variable, account or paid service is required.",
      "If a record is missing, use its originating workflow to create or synchronize genuine data rather than adding a duplicate through the library."
    ]
  },
  "data-library-filters": {
    title: "Library filters, sorting & saved views",
    summary: "Workspace, type, search, sort and page-size filters are server-side. Named saved views are stored only in this browser and are links back to the same read-only query.",
    steps: [
      "Narrow to a workspace when reviewing one business or personal context.",
      "Use record type to isolate recipes/templates, reviewed datasets, intelligence modules or barcode captures.",
      "Search terms are bounded and matched against record labels, source references and stored JSON text.",
      "Choose a deterministic sort and page size, then save the current view if you expect to reuse it.",
      "Remove saved views when they are no longer useful."
    ],
    notes: [
      "Saved views never write to PostgreSQL and do not travel to another browser.",
      "Pagination is capped and out-of-range pages clamp to the final available page."
    ]
  },
  "data-library-records": {
    title: "Record explorer, provenance & quality flags",
    summary: "Each result exposes workspace identity, originating type, record/version status, observed/updated timestamps, source provenance, normalized summary data and the raw durable payload.",
    steps: [
      "Verify the workspace and record type before interpreting the payload.",
      "Check tombstoned, duplicate or review-pending/rejected flags before reuse.",
      "Open Explore record detail to compare normalized/summary fields with the raw payload.",
      "Use Provenance to identify the source URL/origin, retrieval/capture time or module identity that produced the record.",
      "Return to the originating workflow for any edit, approval or remediation."
    ],
    notes: [
      "Build 044 does not invent confidence values. It displays only quality/review signals durably present in the source record.",
      "Raw payload display remains workspace-authorized and is intended for inspection, not downstream execution."
    ]
  },
  "platform-overview": {
    title: "AI Data Platform overview",
    summary: "This landing area shows who is signed in, the shared platform purpose and the main operational entry points.",
    steps: [
      "Sign in before working with private workspace data.",
      "Choose the task you need: barcode intake, intelligence review, remote execution, workspace profiles, connectors or production learning.",
      "Confirm the workspace shown by the destination page before changing data."
    ],
    notes: [
      "Workspace data remains separated by PostgreSQL row-level security.",
      "The Chrome extension and website use the same authorized workspace memberships."
    ]
  },
  "workspaces": {
    title: "Authorized workspaces",
    summary: "Each card is a workspace the signed-in account is allowed to access. The profile label defines reusable domain behavior while the role controls management rights.",
    steps: [
      "Check the workspace name and profile before entering or approving data.",
      "Owners and admins can manage profile/workspace settings from Workspace Profiles.",
      "Members can read or use only the functions permitted by their workspace and feature."
    ],
    notes: ["Archived workspaces are removed from normal active listings but retained data stays protected."]
  },
  "ai-fields": {
    title: "AI suggested fields",
    summary: "This tool proposes field semantics from a bounded sample. It does not automatically choose unverified selectors or write data downstream.",
    steps: [
      "Describe the extraction intent.",
      "Provide only the bounded page context needed for the suggestion.",
      "Review every suggested field, confidence value and warning.",
      "Use deterministic selector tools to verify the final extraction."
    ],
    notes: ["Do not place passwords, tokens or unnecessary sensitive personal data in the context JSON."]
  },
  "guardrails": {
    title: "Platform guardrails",
    summary: "These are system-wide design rules: workspace isolation, source evidence, explicit review and deterministic repeatable processing.",
    steps: [
      "Keep source evidence attached to external observations.",
      "Review material changes before business-system writes.",
      "Use the narrowest workspace and capability needed for the job."
    ],
    notes: ["Higher-risk automation is intentionally fail-closed until its specific gates are satisfied."]
  },
  "sign-in": {
    title: "Secure workspace access",
    summary: "Authentication establishes the user identity that PostgreSQL RLS uses to determine which workspaces can be read or changed.",
    steps: [
      "Use the account that should own or access the workspaces.",
      "After sign-in, verify that only expected workspaces appear.",
      "Sign out when using a shared computer."
    ],
    notes: ["A callback URL is accepted only when it resolves back to this AI Data Platform origin."]
  },
  "barcode-overview": {
    title: "Mobile barcode intake",
    summary: "Barcode intake stages UPC/EAN/GTIN identifiers for explicit review in supported Personal Media or Maker Commerce workspaces.",
    steps: [
      "Choose the correct destination workspace.",
      "Scan with the camera or type the identifier.",
      "Review exact, unmatched or duplicate status.",
      "Approve or reject the staged handoff explicitly."
    ],
    notes: ["Camera access starts only when requested. Location is never requested by this workflow."]
  },
  "barcode-capture": {
    title: "Barcode capture controls",
    summary: "Use these controls to choose a target, enter or scan a barcode and manage the device-local offline queue.",
    steps: [
      "Select the target workspace first.",
      "Use manual entry when BarcodeDetector is unavailable.",
      "If offline, allow the capture to queue locally.",
      "When online, send the queue and verify each resulting review item."
    ],
    notes: ["Only 8, 12, 13 or 14 digit identifiers are accepted."]
  },
  "barcode-review": {
    title: "Barcode review queue",
    summary: "The review queue shows server-side match suggestions but requires a human decision before handoff.",
    steps: [
      "Read the match summary and capture source.",
      "Reject duplicate captures.",
      "Approve only when the identifier and proposed destination are correct."
    ],
    notes: ["Approval does not bypass later downstream validation."]
  },
  "intelligence-overview": {
    title: "Persistent intelligence",
    summary: "This area shows durable workspace intelligence synchronized from the extension and append-only evidence from controlled integrations.",
    steps: [
      "Select the relevant workspace section.",
      "Review module versions and synchronization timestamps.",
      "Investigate pending or unexpected summaries before relying on them."
    ],
    notes: ["These views are primarily evidence/review surfaces, not silent mutation paths."]
  },
  "intelligence-workspace": {
    title: "Workspace intelligence modules",
    summary: "Each module card is isolated to the current workspace and reports the most recent synchronized server version and summary.",
    steps: [
      "Check the module name and synchronization time.",
      "Compare summary counts with the workflow that produced them.",
      "Reconnect/synchronize the extension if expected evidence is missing."
    ],
    notes: ["A module from one workspace is never substituted into another workspace."]
  },
  "intelligence-audit": {
    title: "Append-only integration audit",
    summary: "Audit events preserve integration decisions and handoff evidence. Runtime code can append but cannot update or delete these records.",
    steps: [
      "Use timestamps and action names to reconstruct what happened.",
      "Investigate failed or unexpected handoffs from their source evidence.",
      "Treat audit history as evidence rather than editable notes."
    ],
    notes: ["Database acceptance tests verify runtime audit immutability."]
  },
  "remote-overview": {
    title: "Controlled remote browser pilot",
    summary: "The Browserless pilot is intentionally narrow: approved public pages, direct egress, one page, one concurrent browser and strict unit/runtime limits.",
    steps: [
      "Keep the global kill switch active until Browserless authentication and token setup are complete.",
      "Approve the exact public source in Source Policy.",
      "Allowlist only that approved source for the intended workspace.",
      "Run one bounded pilot and review cost/reliability evidence.",
      "Kill remote execution immediately if behavior is unexpected."
    ],
    notes: [
      "Proxy, stealth, CAPTCHA solving and authenticated-profile bypass are excluded.",
      "Until the production token and execution gates are deliberately configured, leave this workflow fail-closed."
    ],
    manual: [
      "Sign in to Browserless and obtain the API token. If you already have the token, continue without pasting it into ChatGPT, GitHub or screenshots.",
      "Copy the Browserless API token into the production host's encrypted secret store as BROWSERLESS_API_TOKEN. Do not put the token in ChatGPT or GitHub.",
      "Set REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED=true in the production environment.",
      "Keep REMOTE_EXECUTION_KILL_SWITCH=true until the workspace/source controls are ready.",
      "After allowlisting the approved source, set REMOTE_EXECUTION_KILL_SWITCH=false only for the controlled pilot.",
      "After the pilot, restore the kill switch unless continued live testing is deliberately approved."
    ]
  },
  "remote-readiness": {
    title: "Remote execution production readiness",
    summary: "This section shows whether the provider token, execution flag and global kill switch permit any live Browserless request.",
    steps: [
      "Token must report configured.",
      "Execution flag must report on.",
      "Global kill switch must report off only during an approved pilot.",
      "Do not proceed unless the page says live pilot ready."
    ],
    notes: ["A missing variable or active kill switch is a deliberate fail-closed state."]
  },
  "remote-controls": {
    title: "Workspace remote controls",
    summary: "Workspace controls add another authorization layer below the global gate and pin the run to an exact approved Source Policy record.",
    steps: [
      "Arm only the intended workspace.",
      "Allowlist an approved public-source candidate.",
      "Run the one-page pilot only after global readiness is satisfied.",
      "Use Kill remote execution to stop that workspace immediately."
    ],
    notes: ["Owners/admins manage controls; other members do not receive management actions."]
  },
  "remote-evidence": {
    title: "Remote provider evidence",
    summary: "Cost, success/failure counts and provider events make the pilot measurable before broader remote execution is considered.",
    steps: [
      "Review provider units and success rate after every pilot.",
      "Inspect recent events for blocked, cancelled or failed work.",
      "Keep the pilot disabled if evidence is incomplete or unexpected."
    ],
    notes: ["Build 032 retains the latest terminal Browserless evidence and reports provider units, duration, response code, result hash and the bounded go/no-go decision."]
  },
  "profiles-overview": {
    title: "Workspace profiles",
    summary: "Profiles separate reusable domain behavior from workspace identity. They define normalization, review, provenance/history policy, templates and feature capabilities.",
    steps: [
      "Use a built-in profile when its domain matches.",
      "Create a custom profile only when the domain needs different fields/review dimensions.",
      "Keep unnecessary capabilities disabled."
    ],
    notes: ["Existing workspace IDs and slugs remain stable."]
  },
  "profiles-existing": {
    title: "Profile catalog",
    summary: "Built-in profiles document established domain behavior; custom profiles can be edited or archived by authorized managers.",
    steps: [
      "Read normalization and review dimensions before using a profile.",
      "Do not try to edit built-in definitions.",
      "Archive custom profiles that should no longer be selectable for new workspaces."
    ],
    notes: ["Archiving a profile does not rewrite historical workspace data."]
  },
  "profiles-custom": {
    title: "Create a custom profile",
    summary: "A custom profile starts conservatively and can define stable normalization fields and review dimensions without modifying extractor core code.",
    steps: [
      "Give the profile a clear domain name and description.",
      "Choose Business or Personal; this class becomes immutable.",
      "Enter stable normalization field keys and review dimensions.",
      "Enable higher-risk capabilities only after their use is understood."
    ],
    notes: ["History and Source Policy are safe defaults; remote execution and downstream writes default off."]
  },
  "workspace-create": {
    title: "Create workspace from profile",
    summary: "New workspaces inherit reusable behavior from the selected active profile while receiving their own isolated workspace ID and owner membership.",
    steps: [
      "Enter a recognizable workspace name.",
      "Describe its purpose.",
      "Choose the correct active profile.",
      "After creation, confirm the profile and owner role on the active workspace card."
    ],
    notes: ["Workspace creation is atomic and re-checks owner/admin eligibility in the database."]
  },
  "workspace-manage": {
    title: "Manage active workspaces",
    summary: "Owners/admins can update workspace display metadata or archive a workspace without deleting its retained evidence.",
    steps: [
      "Confirm the workspace before editing.",
      "Keep purpose text current so operators know what belongs there.",
      "Archive only when the workspace should leave normal active use."
    ],
    notes: ["Members without management rights see read-only status."]
  },
  "connectors-overview": {
    title: "Plugin & Connector SDK",
    summary: "Build 029 adds a versioned extension boundary for imports, enrichment and approved exports without changing extractor core logic.",
    steps: [
      "Review the registered connector manifest.",
      "Configure it separately for each workspace.",
      "Grant only the capabilities needed.",
      "Enable it only after configuration validation.",
      "Run a bounded test and inspect the append-only audit."
    ],
    notes: [
      "Connector code is statically registered server-side; arbitrary uploaded JavaScript is not executed.",
      "The included example connector requires no external account or secret."
    ]
  },
  "connector-registry": {
    title: "Connector manifest registry",
    summary: "A manifest declares SDK/connector version, capabilities, config schema, exact secret references and execution limits.",
    steps: [
      "Confirm the connector key/version.",
      "Check whether import, enrichment or export is supported.",
      "Review any required secret environment-variable names before configuration."
    ],
    notes: ["Incompatible SDK/manifest versions fail closed before registration or execution."]
  },
  "connector-workspace": {
    title: "Workspace connector grants",
    summary: "Connector configuration is workspace-scoped. The granted capability set can be narrower than the connector's manifest capabilities.",
    steps: [
      "Configure the connector for the intended workspace.",
      "Grant the minimum capabilities required.",
      "Keep the connector disabled until configuration is reviewed.",
      "Enable it, run a bounded test, then disable it when not needed."
    ],
    notes: [
      "Secret values are never stored in connector configuration; only manifest-approved references are stored.",
      "Owners/admins manage connector state."
    ],
    manual: [
      "The Build 029 example connector requires no manual service or variable setup.",
      "For a future connector with credentials, open its manifest on this page and note the exact environment-variable name shown.",
      "Create that variable in the production hosting provider's encrypted secret/environment settings.",
      "Paste the third-party credential there, never into ChatGPT, source code, client storage or connector JSON.",
      "Return to this page, configure the connector's secret reference, keep it disabled, run validation, then enable and test it.",
      "If the third-party connector requires an account or application registration, follow the provider link documented with that connector before creating the environment variable."
    ]
  },
  "connector-audit": {
    title: "Connector execution audit",
    summary: "Every attempted enabled connector execution records bounded status evidence without copying raw secret values into the audit ledger.",
    steps: [
      "Review succeeded, failed and blocked results.",
      "Use error codes to identify grant/configuration issues.",
      "Disable the connector when unexpected failures appear."
    ],
    notes: ["Runtime code can append connector audit events but cannot update or delete them."]
  },
  "learning-overview": {
    title: "Production learning & cost review",
    summary: "Build 031 extends the RLS-scoped production-learning review with bounded append-only sync and recipe-repair outcomes plus persisted changed-evidence snapshots.",
    steps: [
      "Review the current evidence cards before relying on any trend.",
      "Treat provider units and measured payload bytes as cost proxies, not hard-coded currency billing.",
      "Read GAP findings as missing telemetry, not as a zero result.",
      "Use the renewed roadmap only in the displayed priority order unless business priorities deliberately override it."
    ],
    notes: [
      "The page never displays Browserless API-token values.",
      "Sync-conflict frequency, recipe-repair approvals/rejections/rollbacks and post-repair compatibility are now measured from bounded append-only telemetry."
    ]
  },
  "learning-evidence": {
    title: "Operational evidence baseline",
    summary: "These values are calculated at request time from the authenticated account's authorized PostgreSQL workspaces.",
    steps: [
      "Use barcode, integration, remote and connector counts as durable activity evidence.",
      "Use source-policy summary counts to find expired or review-required governance.",
      "Use payload bytes as a storage-growth signal rather than an invoice.",
      "Compare workspace cards to ensure the evidence belongs to the expected profile and role."
    ],
    notes: ["RLS means a user never receives another account's workspace evidence through this review."]
  },
  "learning-browserless": {
    title: "Browserless production evidence gate",
    summary: "Build 032 reports the encrypted-token readiness state, approved source-policy prerequisites, allowlist/workspace gates and durable provider baseline without exposing the Browserless token.",
    steps: [
      "Confirm BROWSERLESS_API_TOKEN exists only in the production host's encrypted server environment.",
      "Keep REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED=true while REMOTE_EXECUTION_KILL_SWITCH remains true.",
      "Approve one public-facts/public-webpage Source Policy with robots allowed and a future review expiry.",
      "Allowlist that exact policy revision/fingerprint and arm only the intended workspace.",
      "Set REMOTE_EXECUTION_KILL_SWITCH=false only for the approved one-page pilot window.",
      "After exactly one run, restore REMOTE_EXECUTION_KILL_SWITCH=true and review provider units, duration, response evidence and the Build 032 go/no-go result."
    ],
    notes: [
      "A token existing in your Browserless account is not the same as being configured in the deployed application.",
      "This page reports configured/not configured only; it never exposes the secret."
    ],
    manual: [
      "In the Chrome extension, connect/select the intended workspace and open Source policy registry & crawl governance.",
      "Open the intended public source in Chrome, use Active tab/origin, then set Collection method = public webpage, Data sensitivity = public facts, and Status = approved only after reviewing the source terms and robots/crawl directives.",
      "Confirm robots/crawl decision = allowed, no access-control bypass is required, and the review expiry is in the future.",
      "Synchronize the Source Policy into the intended workspace.",
      "Open /remote-execution, allowlist the exact approved policy and arm only that workspace.",
      "Temporarily set REMOTE_EXECUTION_KILL_SWITCH=false in the production Vercel environment, redeploy if required, run one page, then immediately restore the value to true.",
      "Review /production-learning for the terminal provider event and bounded go/no-go result."
    ]
  },
  "integration-delivery": {
    title: "Integration consumer acceptance & delivery",
    summary: "Build 033 proves package validation and replay rejection locally, records every delivery outcome append-only, and keeps external business-app delivery fail-closed until a documented receiver URL and dedicated bearer credential are configured.",
    steps: [
      "Start with an approved or exported business-integration batch.",
      "Run conformance to prove valid acceptance plus duplicate, stale, wrong-contract and wrong-target rejection without contacting a business application.",
      "Configure a business receiver only after that application has implemented the exact Build 022 v1 contract.",
      "Use Test handshake to verify bearer authentication, target/schema identity, dry-run support and live-mutation state.",
      "Use Send dry-run for one package only; Build 033 never authorizes an automatic downstream operational write.",
      "Review the append-only acknowledgement evidence here and in Production learning before considering any broader transport."
    ],
    notes: [
      "Conformance acceptance and live business-consumer acceptance are deliberately separate evidence classes.",
      "Receiver secrets are presence-only server configuration and are never returned to the browser."
    ],
    manual: [
      "Choose one target only after its application exposes the documented v1 receiver: Rosie Dazzlers or Devil n Dove.",
      "In that target application's production settings, create a dedicated receiver credential and keep live mutation disabled.",
      "Copy the receiver HTTPS URL into the matching AI Data Platform Vercel variable: INTEGRATION_CONSUMER_ROSIE_DAZZLERS_URL or INTEGRATION_CONSUMER_DEVIL_N_DOVE_URL.",
      "Store the dedicated bearer secret in the matching encrypted Vercel secret: INTEGRATION_CONSUMER_ROSIE_DAZZLERS_TOKEN or INTEGRATION_CONSUMER_DEVIL_N_DOVE_TOKEN. Never paste the token into chat, GitHub or browser fields.",
      "Redeploy the AI Data Platform production environment if Vercel requires a new deployment for the variable change.",
      "Open /integration-delivery, run conformance, then Test handshake, then Send dry-run for exactly one approved package.",
      "Confirm the consumer returns an accepted dry-run acknowledgement and records the same packageId/replayKey before any separate live-mutation approval."
    ]
  },
  "retention-overview": {
    title: "Retention, storage budgets & cleanup",
    summary: "Build 034 assigns explicit storage budgets to each durable evidence class, previews archive/delete eligibility and keeps destructive cleanup fail-closed until an owner/admin explicitly approves it.",
    steps: [
      "Review each workspace's measured bytes against its class budget.",
      "Treat manual-archive candidates as review-only; Build 034 never auto-deletes synchronized tombstones.",
      "Protected append-only/security-critical evidence is excluded from Build 034 destructive cleanup.",
      "Only reviewed barcode captures older than 90 days and terminal remote jobs older than 30 days can enter bounded-delete eligibility.",
      "An owner/admin must explicitly approve cleanup before the Run cleanup control can operate.",
      "Each cleanup run is capped, records before/after rows and storage bytes, and writes append-only completion/failure evidence.",
      "Revoke approval whenever cleanup should return to fail-closed mode."
    ],
    notes: [
      "No destructive production cleanup is run merely by deploying Build 034.",
      "Existing database retention on operational outcomes, production-learning snapshots and integration delivery evidence remains independent and protected."
    ],
    manual: [
      "There is no external account or paid service requirement.",
      "The first destructive production cleanup requires an owner/admin to open /retention, review the eligibility preview, click Approve bounded cleanup, then separately confirm Run one cleanup batch.",
      "Do not approve cleanup merely to test the button; CI verifies deletion behavior against disposable fixtures."
    ]
  },
  "adoption-overview": {
    title: "Workspace, profile & connector adoption / permissions",
    summary: "Build 035 compares enabled profile capabilities with durable usage, connector grants with real execution evidence, and workspace roles with least-privilege review rules. It records bounded adoption snapshots but never changes permissions automatically.",
    steps: [
      "Compare active workspaces with workspaces that still have no durable operational activity.",
      "Review enabled capability slots against observed history, source-policy, scheduled-job, remote, barcode and integration activity.",
      "Treat observed use of a disabled profile capability as a configuration mismatch that requires investigation.",
      "Review connector grants against successful/failed execution evidence; blocked attempts do not count as grant use.",
      "Review unused connector grants, including grants unused for 30 days or longer, before adding credentials or broader capabilities.",
      "Compare owner/admin/member counts and keep elevated privileges proportionate to measured operational need.",
      "Use the profile cards to prioritize future investment where durable activity exists; do not manufacture usage to close a metric.",
      "Build 035 recommendations are advisory only and never edit roles, profiles, connector grants or capability flags."
    ],
    notes: [
      "Adoption snapshots are fingerprint-deduplicated, RLS-scoped and bounded to 365 days / 60 snapshots per workspace.",
      "A zero is measured inactivity; it is not automatically a defect."
    ],
    manual: [
      "No external account, paid service or environment variable is required.",
      "After reviewing /adoption, you may choose which business domains/connectors deserve further investment. No recommendation is applied automatically."
    ]
  },
  "first-evidence-overview": {
    title: "Guided production adoption & first-evidence runbook",
    summary: "Build 037 turns measured zero-adoption workspaces into a profile-aware operator sequence. It links to existing safe workflows and never creates synthetic activity or bypasses earlier approval gates.",
    steps: [
      "Choose one workspace with FIRST EVIDENCE NEEDED and perform only a step that matches real work you actually need.",
      "Start with synchronized workspace data, a reviewed source policy, or barcode intake when the profile supports that workflow.",
      "Create a scheduled job only after its current source-policy prerequisite is satisfied and only for a genuine recurring need.",
      "Treat Browserless remote execution as Build 032-gated; do not run a provider call just to improve an adoption metric.",
      "Treat business delivery as Build 033-gated; do not create a fake receiver or enable downstream mutation for metric closure.",
      "Run installed connectors only within their existing grants and only when real work requires the capability.",
      "After genuine activity is recorded, reopen Adoption and Production Learning so their fingerprinted snapshots capture the changed evidence."
    ],
    notes: [
      "The runbook itself writes no operational evidence. Real sync, policy, barcode, scheduled, remote, integration or connector workflows create their own normal durable evidence.",
      "A profile-disabled workflow is marked not applicable rather than being enabled automatically."
    ],
    manual: [
      "No new external account, paid service or environment variable is required for Build 037.",
      "The Chrome extension is used for saved-scraper synchronization, Source Policy Registry and local scheduled workflows; the website links to the corresponding review surfaces."
    ]
  },
  "learning-renewal": {
    title: "Production Learning II & Build 030 comparison",
    summary: "Build 036 repeats the production evidence review after Builds 031–035, preserves the difference between an old evidence gap and a numeric baseline, and creates a finite next queue only from current durable evidence.",
    steps: [
      "Read the six before/after cards for sync, repair, Browserless, delivery, retention and adoption.",
      "For sync/repair, use the earliest durable post-Build-030 snapshot when available; Build 036 never invents a numeric Build 030 value that was not recorded.",
      "For Browserless, integration delivery, retention and adoption, treat Build 030 as a qualitative evidence gap where no equivalent durable metric existed.",
      "Review the unresolved evidence-gap list separately from measured zero values.",
      "Keep unresolved Build 032/033 gates visible until a real provider run or live dry-run consumer acknowledgement exists.",
      "If no workspace has durable operational adoption, prioritize the guided first-evidence runbook before adding more platform surface area.",
      "Use Build 038 as the next review checkpoint after real operating activity or a material gate change."
    ],
    notes: [
      "Build 036 cycle snapshots are append-only, RLS-scoped, fingerprint-deduplicated and bounded to 365 days / 30 snapshots per workspace.",
      "The renewed roadmap is intentionally finite and may retain earlier unresolved builds."
    ],
    manual: [
      "No infrastructure setup is required.",
      "After reviewing the report, you may change business priorities, but the default queue remains evidence-driven."
    ]
  },
  "learning-trend-validation": {
    title: "Production Learning III & trend validation",
    summary: "Build 038 compares current production outcomes with an eligible historical Build 036 cycle only when that historical snapshot genuinely predates Build 038. Missing historical baselines remain unavailable rather than being recreated from current values.",
    steps: [
      "Review the Build 036 → Build 038 cards for synchronization, repair, Browserless, integration delivery, retention and adoption.",
      "Treat a historical baseline unavailable badge as an evidence limit, not as a zero.",
      "Use only legacy Build 036 cycle snapshots that existed before the Build 038 runtime as numeric trend baselines.",
      "Keep Build 032 active until a real Browserless terminal provider run exists.",
      "Keep Build 033 active until a supported business consumer returns a live dry-run acknowledgement.",
      "Keep the Build 037 runbook available for any workspace that still has measured zero operational adoption.",
      "After Build 038 records its current checkpoint, remove Build 038 itself from the active queue and add no speculative feature build without observed evidence."
    ],
    notes: [
      "Build 038 cycle snapshots reuse the append-only RLS-scoped cycle table and remain bounded by its 365-day / 30-row-per-workspace retention.",
      "Build 038 marks new same-runtime Build 036 continuity rows separately so they cannot masquerade as historical trend baselines."
    ],
    manual: [
      "No external account, paid service or new environment variable is required.",
      "Normal real operating activity is the only supported way to create future trend movement."
    ]
  },
  "learning-outcome-reconciliation": {
    title: "Intervention outcome reconciliation & closure verification",
    summary: "Build 042 reconciles the Build 032, 033 and 037 intervention outcomes as VERIFIED, INCONCLUSIVE or NOT COMPLETE using only durable originating evidence and relevant restored safety state.",
    steps: [
      "Read VERIFIED only when the originating durable completion evidence exists and required post-action safety state is clean.",
      "Read INCONCLUSIVE when evidence exists but a safety-state mismatch or durable failure signal still requires review.",
      "Read NOT COMPLETE when the originating closure evidence has not yet been recorded.",
      "Use the listed follow-up for the specific intervention; do not convert a checklist, page view or operator assertion into closure evidence.",
      "When all three outcomes are VERIFIED, continue normal evidence-driven operation rather than creating synthetic proof."
    ],
    notes: [
      "Browserless reconciliation also checks that the global kill switch is restored fail-closed after terminal evidence.",
      "Operational adoption remains inconclusive if disabled profile capabilities were observed in use.",
      "Consumer delivery requires a durable accepted live dry-run acknowledgement; rejection or transport errors without acceptance remain inconclusive."
    ],
    manual: [
      "No new account, variable or service is introduced by Build 042.",
      "Build 042 does not retry a provider or receiver action and does not mutate permissions, profiles or evidence."
    ]
  },
  "learning-intervention-preflight": {
    title: "Operator intervention preflight & completion evidence",
    summary: "Build 041 packages the next Build 040 safe intervention into read-only preflight checks, explicit stop conditions and the exact durable evidence required to prove completion.",
    steps: [
      "Confirm every preflight item is PASS before starting the originating build's manual procedure.",
      "Treat any BLOCKED item as a stop; resolve that prerequisite instead of bypassing it.",
      "Read all stop conditions before performing the consequential action.",
      "Perform the action only through the existing originating Build 032, 033 or 037 workflow.",
      "Return to Production Learning afterward and confirm the listed durable completion evidence exists.",
      "If all tracked gates are complete, Build 041 issues no new intervention packet."
    ],
    notes: [
      "Build 041 is read-only and performs no provider run, receiver delivery, environment-variable change, permission change or synthetic adoption event.",
      "A preflight packet is guidance, not authorization to ignore an originating build's approval boundary."
    ],
    manual: [
      "No new account, paid service or variable is introduced by Build 041.",
      "The actual consequential action remains in the original controlled workflow and is never executed by the preflight view."
    ]
  },
  "learning-intervention-sequencing": {
    title: "Gate closure progress & safe intervention sequencing",
    summary: "Build 040 classifies each remaining production evidence gate as COMPLETE, ACTIONABLE or BLOCKED, then recommends only the highest-priority intervention whose prerequisites are already satisfied.",
    steps: [
      "Read COMPLETE as durable evidence already satisfying the originating gate.",
      "Read ACTIONABLE as an operator step whose existing prerequisites are currently satisfied.",
      "Read BLOCKED as a requirement to resolve only the listed prerequisite before attempting that gate.",
      "Follow the P0/P1/P2 ordering only among ACTIONABLE gates; a blocked P0 gate never authorizes bypassing its controls.",
      "For Browserless, never open the global kill-switch window until token, provider flag, Source Policy, allowlist and intended workspace arm are all ready.",
      "For adoption, perform genuine profile-appropriate work only.",
      "For consumer delivery, require an approved/exported package and conformance before contacting a supported receiver."
    ],
    notes: [
      "Build 040 makes no external calls and changes no operational state.",
      "The sequencing view cannot approve Source Policies, arm workspaces, change environment variables, fabricate adoption or enable downstream mutation."
    ],
    manual: [
      "No new account, paid service or environment variable is introduced by Build 040.",
      "Use only the manual procedure already documented by the originating gate when a stage becomes ACTIONABLE."
    ]
  },
  "learning-gate-closure": {
    title: "Production evidence gate closure & operator readiness",
    summary: "Build 039 consolidates the remaining Build 032 Browserless baseline, Build 033 live dry-run consumer acknowledgement and Build 037 real-adoption gates into one operator view. It does not bypass or auto-close any gate.",
    steps: [
      "Read each gate card as OPEN or CLOSED from durable production evidence only.",
      "For Browserless, keep the existing Source Policy, allowlist, workspace arm and global kill-switch sequence authoritative.",
      "For consumer delivery, keep conformance distinct from a real supported business application's authenticated dry-run acknowledgement.",
      "For adoption, count only genuine durable work; never create synthetic activity to improve readiness.",
      "When all three gates are closed, return to normal evidence-driven operations instead of automatically creating another feature queue."
    ],
    notes: [
      "Build 039 is a coordination/readiness layer over existing evidence; it creates no synthetic provider, delivery or adoption events.",
      "Earlier Build 032/033/037 safety decisions remain authoritative."
    ],
    manual: [
      "No new account, paid service or environment variable is introduced by Build 039.",
      "Any manual action shown by an open gate is the same controlled action already documented by its original build."
    ]
  },
  "learning-gaps": {
    title: "Measured findings and evidence gaps",
    summary: "A GAP means the platform cannot yet make a production trend claim from durable data; it is intentionally different from a measured zero.",
    steps: [
      "Address ACTION findings before expanding automation.",
      "Use WATCH findings as adoption/readiness checks.",
      "Keep HEALTHY findings under observation instead of assuming they remain healthy.",
      "Prioritize GAP closure when future decisions depend on that missing measurement."
    ],
    notes: ["Build 030 does not invent conflict, repair-success or cost numbers that are not durably recorded."]
  },
  "learning-workspaces": {
    title: "Workspace operational footprint",
    summary: "Each workspace card summarizes synchronized assets, barcode activity, remote evidence, connector state and membership accountability.",
    steps: [
      "Confirm the workspace/profile identity.",
      "Check sync version-change volume against actual operational use.",
      "Review pending barcode decisions and remote/provider activity.",
      "Confirm there is an accountable owner before increasing automation."
    ],
    notes: ["Counts are scoped by normal workspace RLS."]
  },
  "learning-roadmap": {
    title: "Evidence-driven roadmap renewal",
    summary: "Build 039 consolidates the remaining Browserless, consumer-delivery and zero-adoption evidence gates into one operator readiness view while preserving the finite evidence-driven roadmap.",
    steps: [
      "Build 031 completed append-only outcome telemetry and review snapshot continuity.",
      "Build 032 establishes a real Browserless cost/reliability baseline and remains active until the first terminal provider event.",
      "Build 033 proves consumer-side integration acceptance.",
      "Build 034 adds retention/storage enforcement.",
      "Build 035 records adoption and permission outcomes without changing permissions automatically.",
      "Build 036 established the renewal checkpoint; Build 038 validates later trends and then removes itself from the active queue."
    ],
    notes: ["Business priorities can deliberately change this order, but the default queue follows current evidence."]
  },
  "shell-overview": {
    title: "Application shell & primary navigation",
    summary: "Build 117 replaces flat workflow launching with a persistent task-oriented application shell. The shell groups current work into modules while preserving historical routes behind dedicated history screens.",
    steps: [
      "Use the left navigation to choose the business area you are working in rather than searching for a build-generation screen.",
      "Expand only the module you need; the active module remains highlighted while you work.",
      "Use Workflow Directory when you know the task but not the exact screen.",
      "Use the circled information control beside a module, workflow or card whenever you need context without leaving the current page.",
      "Use History & Legacy Workflows only for historical evidence, diagnostics or a specifically required legacy operation."
    ],
    notes: [
      "Build 117 changes navigation and presentation only; existing workflow authorization, RLS and execution controls remain authoritative.",
      "Historical screens are not deleted or rewritten."
    ]
  },
  "workflow-directory": {
    title: "Workflow directory",
    summary: "The Workflow Directory is the task-oriented index for current operator work. It groups related workflows into modules and keeps historical corrective generations separate from the normal path.",
    steps: [
      "Choose the module that matches the outcome you need: data, collection, corrective operations, integrations or workspace administration.",
      "Read the short description under each workflow before opening it.",
      "Use the circled information control on every module and workflow row for operating guidance.",
      "For corrective cases, start from Operations Console unless a current planning, delivery, verification or monitoring screen is explicitly required.",
      "Open History & Legacy Workflows only when reviewing or operating historical generation-specific evidence."
    ],
    notes: [
      "The directory is navigation only and performs no business mutation.",
      "A workflow appearing in the directory does not bypass its own permissions or prerequisites."
    ]
  },
  "module-hubs": {
    title: "Module hubs & sub-screen navigation",
    summary: "Build 120 adds a dedicated landing hub for each major operator module so related work can be understood before entering a specific workflow.",
    steps: [
      "Open a module from Operator Home, Workflow Directory or the persistent left navigation.",
      "Read the module purpose and choose the sub-screen that matches the task in front of us.",
      "Use the numbered sub-screen cards as an orientation path rather than a forced business sequence.",
      "After entering a sub-screen, use the breadcrumb or Module hub action to return to the module context.",
      "Use the circled information control on the hub and every sub-screen card for focused operating guidance."
    ],
    notes: [
      "Module hubs perform navigation only; they do not mutate data, advance state or grant permission.",
      "Historical corrective workflows remain behind their dedicated history screen."
    ]
  },
  "progressive-navigation": {
    title: "Progressive workflow navigation",
    summary: "Progressive navigation exposes one module context and its related sub-screens at a time, reducing a long flat menu without hiding authoritative workflows.",
    steps: [
      "Start from Operator Home when we need priority guidance or from Workflow Directory when we know the business area.",
      "Enter the module hub before choosing a detailed sub-screen when context is useful.",
      "Follow the breadcrumb to confirm the current module and screen.",
      "Return to the module hub when switching tasks inside the same business area.",
      "Use direct workflow links when we already know the destination."
    ],
    notes: [
      "The displayed order is a navigation aid, not a workflow state machine.",
      "Destination permissions, prerequisites, approvals and RLS remain authoritative."
    ]
  },
  "shell-data": {
    title: "Data & Review module",
    summary: "Data & Review groups record exploration, review and approved-data publishing so operators can move from evidence to governed data without searching the entire application.",
    steps: [
      "Use Unified Data Library to find and inspect records and provenance.",
      "Use Data Review when extracted data still needs review.",
      "Use Approved Data only after review requirements are satisfied.",
      "Follow each destination screen's own help and approval controls before publishing."
    ],
    notes: ["Build 117 does not change approval or publication authority."]
  },
  "shell-collection": {
    title: "Collection & Intelligence module",
    summary: "Collection & Intelligence groups barcode intake, source projects, extraction recipes, collection runs and derived intelligence.",
    steps: [
      "Start with Collection Projects when defining or reviewing a collection source.",
      "Use Recipe Builder to define structured extraction behavior.",
      "Use Collection Runs to inspect execution evidence.",
      "Use Intelligence Library for evidence-backed derived information.",
      "Use Barcode Intake for identifier-driven intake when that workflow is appropriate."
    ],
    notes: ["Remote execution and provider safety controls remain separate and authoritative."]
  },
  "shell-corrective": {
    title: "Corrective Operations module",
    summary: "Corrective Operations presents the current unified corrective lifecycle as operator tasks instead of exposing dozens of historical generation names in normal navigation.",
    steps: [
      "Start in Operations Console to see active case standing, timeline events and invariant findings.",
      "Use Planning only when a case is ready for governed re-triage and plan creation.",
      "Use Delivery only for an approved plan that satisfies its activation prerequisites.",
      "Use Verification & Closure only after accepted delivery evidence exists.",
      "Use Regression Monitoring after re-closure to determine stable state or recurrence.",
      "Use History & Legacy Workflows only for older generation-specific evidence or diagnostics."
    ],
    notes: [
      "The Build 115 state machine remains the lifecycle authority.",
      "Build 117 changes navigation only and never infers or advances corrective state."
    ]
  },
  "corrective-operations-console": {
    title: "Corrective-generation operations console",
    summary: "The Build 116 console is the preferred starting point for current corrective work. It combines state-machine standing, evidence timeline, invariant findings and deterministic audit exports.",
    steps: [
      "Filter by workspace, case, target, generation or phase to isolate the work you need.",
      "Review Current cycle standing before opening a consequential workflow.",
      "Treat invariant findings as evidence that requires review rather than as an automatic repair instruction.",
      "Use the timeline to understand how the current generation reached its present state.",
      "Export JSON or CSV when a durable operator-readable audit package is needed."
    ],
    notes: ["The console is read-only and does not bypass planning, activation, delivery or closure controls."]
  },
  "corrective-state-machine": {
    title: "Corrective-generation state machine",
    summary: "The Build 115 state machine derives one canonical phase for each generic corrective-generation cycle and audits cross-generation identity continuity.",
    steps: [
      "Use the displayed phase to understand the next eligible workflow.",
      "Review critical invariant findings before attempting a later lifecycle stage.",
      "Use the Operations Console for broader timeline and audit-export work.",
      "Do not manually reinterpret a generation when the state-machine evidence disagrees."
    ],
    notes: ["Database transition and lineage guards remain authoritative even if a screen is opened directly."]
  },
  "corrective-history": {
    title: "Corrective history & legacy workflows",
    summary: "This screen preserves older generation-specific corrective workflows for traceability, diagnostics and exceptional historical operations without forcing normal operators to navigate them every day.",
    steps: [
      "Use current unified corrective workflows first for active cases.",
      "Choose a historical group only when you know the evidence belongs to that earlier generation or cycle.",
      "Read the destination screen's own help before taking any action.",
      "Return to the current Operations Console when historical review is complete."
    ],
    notes: [
      "No historical route is deleted by Build 117.",
      "The history screen is an organizational boundary, not a new authorization boundary."
    ]
  },
  "shell-integrations": {
    title: "Integrations & Execution module",
    summary: "Integrations & Execution groups connectors, remote-provider execution and downstream publication/delivery workflows.",
    steps: [
      "Use Connectors for installed capability and workspace grant review.",
      "Use Remote Execution for controlled provider-side work.",
      "Use Integration Delivery to review downstream readiness and evidence.",
      "Use Publication Delivery and Controlled Live Delivery only when their existing prerequisites and approvals are satisfied."
    ],
    notes: ["Build 117 does not enable a connector, provider or downstream mutation by navigation alone."]
  },
  "shell-workspace": {
    title: "Workspace & Administration module",
    summary: "Workspace & Administration groups profiles, permissions, adoption, evidence runbooks, retention and production-learning views.",
    steps: [
      "Use Workspace Profiles to understand operating capabilities.",
      "Use Adoption & Permissions to review measured use and access state.",
      "Use First-Evidence Runbook for genuine evidence-creation guidance.",
      "Use Retention & Cleanup to review storage lifecycle controls.",
      "Use Production Learning for evidence-based operational follow-up."
    ],
    notes: ["Workspace RLS and existing role checks remain authoritative."]
  },
  "help-system-standard": {
    title: "Build 117 contextual help standard",
    summary: "Every new major card, panel, navigation module and workflow surface must expose a visible circled information control tied to a centralized help topic.",
    steps: [
      "Select the circled i on a card, panel or navigation item to open contextual guidance.",
      "Read the summary first, then follow How to use this section in order.",
      "Read Important before taking any consequential action.",
      "Use Open full help topic to jump directly to the deep-linked Help Center entry.",
      "When building a new interface card, create or reuse a centralized help topic before considering the card complete."
    ],
    notes: [
      "Help text must explain purpose, normal operating sequence, important safety/authority boundaries and manual intervention when applicable.",
      "Help controls are guidance only and never replace permissions, confirmations, RLS or database enforcement."
    ]
  },
  "command-center-v2": {
    title: "Command Center V2 operator home",
    summary: "Build 119 turns Home into a read-only operational dashboard that prioritizes measured conditions and routes operators into the existing governed workflows.",
    steps: [
      "Start with Needs Attention and address critical items before lower-severity review items.",
      "Use Quick Actions to enter a known workflow without browsing the full application.",
      "Use Operational Health to inspect the measured state of governance, collection, remote execution, delivery, corrective invariants and retention.",
      "Use Recent Work to continue collection, remote or delivery activity from the most recent evidence.",
      "Use Workspaces and Application Modules for broader context after priority work is understood."
    ],
    notes: [
      "The dashboard does not mutate business state or bypass workflow permissions.",
      "All health and attention states are derived from existing governed evidence."
    ]
  },
  "dashboard-attention": {
    title: "Needs Attention queue",
    summary: "The priority queue converts measured operational conditions into a sorted list of operator follow-up actions.",
    steps: [
      "Review Critical items first, then Review items.",
      "Read the workspace/context label and condition description.",
      "Use the action button to open the authoritative workflow for investigation or correction.",
      "Resolve the condition in the destination workflow; the dashboard itself performs no mutation."
    ],
    notes: ["Severity is derived from measured evidence, not decorative card color."]
  },
  "dashboard-quick-actions": {
    title: "Dashboard quick actions",
    summary: "Quick Actions are navigation shortcuts to commonly used governed workflows.",
    steps: [
      "Choose the task you intend to perform.",
      "Open the workflow and follow its own contextual help, prerequisites and permission rules.",
      "Return to Operator Home to reassess measured attention and health."
    ],
    notes: ["A shortcut never grants permission or skips workflow prerequisites."]
  },
  "dashboard-health": {
    title: "Operational health board",
    summary: "The health board summarizes measured conditions across workspace governance, collection readiness, remote execution, integration delivery, corrective invariants and retention.",
    steps: [
      "Treat Critical as a blocking or failure condition requiring review.",
      "Treat Attention as measured follow-up that is not necessarily a failure.",
      "Treat Healthy as the absence of the dashboard's measured condition, not a guarantee that every external system is perfect.",
      "Select Inspect to open the authoritative evidence screen."
    ],
    notes: ["Health is evidence-based and fail-closed; the dashboard does not invent external status."]
  },
  "dashboard-recent-work": {
    title: "Recent work",
    summary: "Recent Work merges the newest collection-project updates with recent remote execution and integration-delivery evidence.",
    steps: [
      "Use the newest entries to continue active work.",
      "Check the kind, workspace and timestamp before opening the destination.",
      "Use the destination workflow for complete evidence and any consequential action."
    ],
    notes: ["Recent Work is a convenience index and does not replace source audit history."]
  },
  "dashboard-workspaces": {
    title: "Workspace operating context",
    summary: "Workspace cards summarize durable activity, role/profile context, attention conditions and the latest remote or delivery evidence.",
    steps: [
      "Confirm the workspace name, profile and role.",
      "Review any attention labels before starting new work.",
      "Use the higher-priority Needs Attention queue for direct follow-up routes."
    ],
    notes: ["Workspace RLS and destination workflow role checks remain authoritative."]
  },
  "module-task-panels": {
    title: "In-module task panels",
    summary: "Build 121 groups each module's existing sub-screens into explicit operator outcomes so the hub explains what kind of work each screen supports.",
    steps: [
      "Choose the task panel that matches the outcome in front of us.",
      "Read the panel description before selecting a sub-screen.",
      "Open the sub-screen and follow its own prerequisites, permissions and contextual help.",
      "Return to the module hub when switching to another task inside the same business area."
    ],
    notes: [
      "Task panels do not create new workflow state or reorder authoritative business prerequisites.",
      "Every current module sub-screen remains reachable and is covered by at least one task panel."
    ]
  },
  "module-search": {
    title: "Module-local search",
    summary: "Build 121 adds a client-side search field on each module hub that filters only the module's known task panels and registered sub-screens.",
    steps: [
      "Enter a task, screen name or descriptive term.",
      "Review the matching panel and sub-screen count.",
      "Open the matching governed screen or clear the search to restore the full module.",
      "Use Workflow Directory when the needed work belongs to a different module."
    ],
    notes: [
      "Search is local navigation only; it sends no query to the database or an external service.",
      "Filtering never changes permissions, evidence or workflow state."
    ]
  },
  "operator-shortcuts": {
    title: "Operator shortcuts",
    summary: "Build 121 exposes a small curated set of common destinations inside every module hub without turning navigation into an execution shortcut.",
    steps: [
      "Choose a common destination only when it matches the task you intend to perform.",
      "Treat the shortcut as a link into the existing workflow, not an authorization or state transition.",
      "Follow the destination screen's help, prerequisites and confirmations before taking consequential action."
    ],
    notes: [
      "Shortcuts never bypass RLS, role checks, approvals, confirmation or source-evidence requirements.",
      "No shortcut performs a mutation from the module hub."
    ]
  },
  "command-palette": {
    title: "Cross-module operator command palette",
    summary: "Build 122 adds a global keyboard-first navigation palette that searches registered module hubs and operator screens without becoming an execution surface.",
    steps: [
      "Open the palette from the top bar or press Ctrl+K / Command+K.",
      "Type a module name, workflow name or operator task.",
      "Use the arrow keys or pointer to choose a registered destination.",
      "Press Enter or select the result to open the existing governed screen.",
      "Follow the destination screen's own contextual help, prerequisites and permission controls."
    ],
    notes: [
      "Palette search is performed against the in-memory navigation registry and does not query PostgreSQL, an API or an external service.",
      "Opening a result is navigation only; it never grants permission, creates evidence or changes workflow state."
    ]
  },
  "recent-operator-destinations": {
    title: "Recent operator destinations",
    summary: "Build 122 keeps a short convenience list of recently visited registered operator destinations in this browser so common work can be resumed quickly.",
    steps: [
      "Open the command palette with an empty search to review recent destinations.",
      "Choose a recent entry to return to that registered module or workflow.",
      "Use Clear recent when the local convenience history is no longer useful.",
      "Search normally when the desired destination is not in the recent list."
    ],
    notes: [
      "Recent destinations are stored only in browser localStorage; they are not synchronized to the account, workspace or database.",
      "Only registered navigation destinations are retained, duplicates are removed and unknown stored values are discarded.",
      "Recent history does not record business data, search terms, approvals or workflow outcomes."
    ]
  },
  "operator-favorites": {
    title: "Pinned operator favorites",
    summary: "Build 123 lets operators pin registered command-palette destinations for faster browser-local navigation without creating account-level preferences or changing workflow authority.",
    steps: [
      "Open the command palette and search or browse to a registered destination.",
      "Select the star control to pin or unpin that destination.",
      "Open Favorites to review the current pinned list.",
      "Select a favorite to navigate to its existing governed screen."
    ],
    notes: [
      "Favorites are stored only in this browser and are bounded to eight registered destinations.",
      "Pinning a favorite does not grant access, imply eligibility or create operational evidence."
    ]
  },
  "saved-navigation-sets": {
    title: "Saved navigation sets",
    summary: "Build 123 can snapshot the current pinned favorites into a small named browser-local set for recurring navigation patterns.",
    steps: [
      "Pin the destinations that belong together.",
      "Enter a short set name in the command palette.",
      "Choose Save set to capture the current favorites.",
      "Use the named set tab later to reopen those registered destinations.",
      "Remove the saved set when the collection is no longer useful."
    ],
    notes: [
      "Saved sets are browser-local convenience data, not workspace configuration or shared team state.",
      "Unknown routes are discarded during loading, names are bounded and each set is limited to registered destinations."
    ]
  },
  "workspace-shortcuts": {
    title: "Workspace navigation shortcuts",
    summary: "Build 123 derives a dedicated shortcut collection from the existing Workspace & Administration navigation registry.",
    steps: [
      "Open the command palette and select Workspace.",
      "Choose the Workspace module hub or one of its registered administrative screens.",
      "Follow the destination screen's own permissions, help and confirmation rules.",
      "Pin frequently used workspace destinations when they should also appear in Favorites."
    ],
    notes: [
      "Workspace shortcuts are derived from the registered navigation model rather than a separate hard-coded route list.",
      "A workspace shortcut is navigation only and cannot change roles, profiles, connector grants, retention state or evidence."
    ]
  },
  "keyboard-action-map": {
    title: "Keyboard action map",
    summary: "Build 124 adds an explicit keyboard guide for navigation-only shortcuts so operators do not have to memorize or discover key combinations by trial and error.",
    steps: [
      "Press Shift+? outside editable fields or select Keyboard in the top bar.",
      "Review the supported navigation shortcuts and their scope.",
      "Use Tab or Shift+Tab to move through the guide.",
      "Press Escape to close the guide and return focus to the control that opened it."
    ],
    notes: [
      "The action map includes navigation and guidance shortcuts only; it does not expose mutation or workflow-execution hotkeys.",
      "Global shortcuts are suppressed while typing in inputs, textareas, selects or content-editable controls."
    ]
  },
  "context-jump-suggestions": {
    title: "Context-aware jump suggestions",
    summary: "Build 124 derives a small set of nearby registered destinations from the current route and navigation group.",
    steps: [
      "Open the keyboard action map from the current screen.",
      "Review Suggested jumps for the current module or navigation context.",
      "Open a suggestion to navigate to that existing registered destination.",
      "Use the command palette when the desired destination is outside the nearby context."
    ],
    notes: [
      "Suggestions are deterministic and registry-derived; they do not inspect business data, operator history or external services.",
      "A suggestion is navigation only and never implies permission, eligibility or workflow readiness."
    ]
  },
  "navigation-accessibility-audit": {
    title: "Navigation accessibility audit",
    summary: "Build 124 audits and enforces the shell-level keyboard baseline: skip navigation, semantic main content, visible focus, modal focus containment, focus restoration and editable-control shortcut guards.",
    steps: [
      "Use the Skip to main content link as the first keyboard focus target when bypassing repeated navigation.",
      "Confirm the main page region receives focus when the skip link is activated.",
      "Use visible focus indicators to track the active interactive control.",
      "When the keyboard guide is open, Tab stays within the dialog until it is closed.",
      "Close the guide with Escape and confirm focus returns to the opening control."
    ],
    notes: [
      "The audit concerns navigation behavior and does not replace page-specific accessibility review.",
      "Reduced-motion preferences and existing semantic status text remain authoritative presentation requirements."
    ]
  },
  "navigation-usage-insights": {
    title: "Navigation usage insights",
    summary: "Build 125 keeps bounded aggregate counts of registered destination visits and navigation-shortcut opens in this browser so interface guidance can adapt without server-side profiling.",
    steps: [
      "Open Insights from the application top bar.",
      "Review registered visits, distinct registered destinations and navigation-shortcut opens.",
      "Use the shortcut and recommendation sections to identify navigation features that may save time.",
      "Choose Reset local insights at any time to clear the browser-local aggregate counts."
    ],
    notes: [
      "Build 125 stores no timestamps, search terms, business records, approval outcomes or workflow evidence.",
      "Insights are not synchronized to the account, workspace, database, analytics service or another device."
    ]
  },
  "shortcut-discoverability-metrics": {
    title: "Shortcut discoverability metrics",
    summary: "Build 125 counts opens of the command palette and keyboard action map to show whether those navigation aids are unused, being explored or established in this browser.",
    steps: [
      "Open Insights and review Shortcut metrics.",
      "Use Ctrl/Command+K to open the command palette when cross-module navigation is useful.",
      "Use Shift+? to open the keyboard action map when shortcut or accessibility guidance is useful.",
      "Reopen Insights to see the bounded local usage counts update."
    ],
    notes: [
      "The metrics count only shortcut-guide opens, not search text, selected results or workflow actions.",
      "Discoverability levels are descriptive interface guidance and never affect permissions or application state."
    ]
  },
  "personalized-interface-recommendations": {
    title: "Personalized interface recommendations",
    summary: "Build 125 ranks previously visited registered destinations and underused navigation shortcuts locally to produce small, explainable interface recommendations.",
    steps: [
      "Open Insights and review Suggested for you.",
      "Use destination recommendations to return to registered screens used in this browser.",
      "Use shortcut recommendations when a navigation aid has not yet been tried locally.",
      "Reset local insights when you want recommendations to start from an empty browser-local baseline."
    ],
    notes: [
      "Recommendations are derived only from bounded aggregate visit and shortcut counts plus the current registered route.",
      "A recommendation is navigation guidance only; it never predicts business outcomes, changes workflow eligibility or bypasses RLS."
    ]
  },
  "adaptive-navigation-density": {
    title: "Adaptive navigation density",
    summary: "Build 126 lets this browser use Adaptive, Comfortable or Compact navigation spacing without changing permissions, workflow state or the underlying route registry.",
    steps: [
      "Open Insights and find Interface preferences.",
      "Choose Adaptive to let viewport width select comfortable or compact spacing.",
      "Choose Comfortable for roomier navigation or Compact for denser navigation.",
      "Use Reset interface preferences to return to Adaptive."
    ],
    notes: [
      "Adaptive density responds only to viewport width.",
      "Density never reads roles, permissions, usage scores or business state."
    ]
  },
  "workspace-layout-preferences": {
    title: "Role-neutral workspace layout preferences",
    summary: "Build 126 provides Balanced, Wide and Focused shell layouts as browser-local presentation choices that are deliberately independent of user role or job function.",
    steps: [
      "Open Insights and find Workspace layout.",
      "Choose Balanced to keep the standard shell proportions.",
      "Choose Wide to reduce sidebar width and give more room to application content.",
      "Choose Focused to center the application page within a bounded reading width.",
      "Reset interface preferences to return to Balanced."
    ],
    notes: [
      "Layout choices are presentation-only and are not stored on the account or workspace.",
      "No role, permission, profile or employee classification is used to choose or suggest a layout."
    ]
  },
  "recommendation-controls": {
    title: "Interface recommendation controls",
    summary: "Build 126 lets operators decide whether Suggested for you shows all local recommendations, destinations only, shortcuts only or none.",
    steps: [
      "Open Insights and find Recommendations.",
      "Choose All, Destinations, Shortcuts or Off.",
      "The recommendation panel updates immediately using the existing browser-local Build 125 data.",
      "Reset interface preferences to restore All recommendations."
    ],
    notes: [
      "Turning recommendations off hides recommendations; it does not change workflow authority or registered navigation.",
      "Recommendation controls are stored only in this browser and never alter RLS or permission checks."
    ]
  },
  "interface-preference-presets": {
    title: "Interface preference presets",
    summary: "Build 127 provides named browser-local presets that apply known combinations of density, layout and recommendation visibility without changing workflow permissions or saved business state.",
    steps: [
      "Open Insights and find Preference presets.",
      "Choose Standard, Focus, Wide Canvas or Compact Workspace.",
      "Fine-tune any individual preference after applying a preset.",
      "A preset is highlighted only while the current preferences still match that preset exactly."
    ],
    notes: [
      "Presets write only the existing browser-local interface preference object.",
      "Accessibility reconciliation may temporarily adjust the effective shell without rewriting the selected preset values."
    ]
  },
  "accessibility-preference-reconciliation": {
    title: "Accessibility-safe preference reconciliation",
    summary: "Build 127 separates stored preferences from effective shell preferences so accessibility safeguards can temporarily reconcile presentation choices without deleting the operator's saved values.",
    steps: [
      "Choose any interface preset or individual preference.",
      "The shared shell evaluates viewport width, forced colors, increased contrast and reduced-motion preferences.",
      "When a safeguard is needed, Insights lists the effective adjustment.",
      "When the environment no longer requires the safeguard, the stored browser preference becomes effective again automatically."
    ],
    notes: [
      "High-contrast display preferences prevent Compact density and Wide layout from remaining effective.",
      "Narrow viewports reconcile non-Balanced layouts to Balanced.",
      "Reduced-motion preference suppresses preference-interface transitions without modifying stored density, layout or recommendation choices."
    ]
  },
  "operator-reset-governance": {
    title: "Operator reset governance",
    summary: "Build 127 makes local reset scope explicit so interface preferences and navigation insights can be cleared independently, while the full local reset requires a second deliberate activation.",
    steps: [
      "Use Interface only to restore Adaptive, Balanced and All while keeping navigation insights.",
      "Use Insights only to clear local navigation counts while keeping interface preferences.",
      "Choose All local navigation data once to arm the full reset.",
      "Activate Confirm full local reset to clear both local preference and insight storage."
    ],
    notes: [
      "All reset actions affect only this browser.",
      "A reset never changes account data, workspace data, permissions, RLS, workflow state or server-side evidence."
    ]
  },
  "named-profile-favorites": {
    title: "Named profile favorites",
    summary: "Build 132 lets operators mark selected browser-local named profiles as favorites without changing the explicit saved order.",
    steps: [
      "Choose a saved profile in Quick switcher.",
      "Choose Favorite to mark it, or Unfavorite to remove the marker.",
      "Favorite profiles display a star in the quick switcher and profile list.",
      "Use Move up or Move down separately when you want to change the explicit profile order."
    ],
    notes: [
      "Favorite state stays browser-local and is preserved by the local recovery snapshot.",
      "Portable bundle export does not include favorite state, so favorites do not silently transfer between browsers."
    ]
  },
  "recovery-diff-preview": {
    title: "Recovery diff preview",
    summary: "Build 132 compares the current browser state with the saved recovery snapshot before Restore snapshot replaces anything.",
    steps: [
      "Save or automatically capture a local recovery snapshot.",
      "Review the Recovery diff preview before choosing Restore snapshot.",
      "Check interface-setting changes, current-only profiles, profiles that would return, profile-detail changes, favorite changes and ordering differences.",
      "Choose Restore snapshot only when the preview matches the recovery you intend."
    ],
    notes: [
      "The preview is read-only and does not change current preferences or named profiles.",
      "A matching snapshot reports no differences rather than manufacturing a restore action."
    ]
  },
  "bundle-import-capacity-planning": {
    title: "Bundle import capacity planning",
    summary: "Build 132 forecasts how the selected bundle subset and current conflict strategy will use the eight browser-local named-profile slots.",
    steps: [
      "Stage a named preference bundle and select the incoming profiles you want.",
      "Choose Skip, Replace or Keep both for same-name conflicts.",
      "Review requested new slots, projected additions, replacements, conflict skips, capacity skips and projected final count.",
      "Adjust the selected subset or conflict strategy before importing when capacity skips are forecast."
    ],
    notes: [
      "Capacity planning is a read-only forecast over the selected incoming subset.",
      "The import resolver remains authoritative and still refuses to evict existing local profiles automatically."
    ]
  },
  "named-profile-ordering": {
    title: "Named profile ordering",
    summary: "Build 131 preserves the named-profile array order in browser storage and lets operators move the selected profile up or down without changing its ID, values or provenance.",
    steps: [
      "Choose a saved named profile in Quick switcher.",
      "Use Move up or Move down to change where it appears.",
      "The quick switcher and exported named bundle follow the saved local order.",
      "Use the recovery snapshot before larger experiments if you want a one-click local rollback."
    ],
    notes: [
      "Ordering is browser-local presentation state only.",
      "Moving a profile never changes its preference values, provenance, permissions or workflow authority."
    ]
  },
  "selective-bundle-import": {
    title: "Selective named bundle import",
    summary: "Build 131 lets operators choose a subset of incoming bundle profiles before conflict analysis and import.",
    steps: [
      "Import a valid named preference bundle.",
      "Use the checkboxes to select only the incoming profiles you want.",
      "Use Select all or Clear selection for faster review.",
      "Review the selected conflict count and conflict strategy.",
      "Choose Import selected profiles only after the intended subset is selected."
    ],
    notes: [
      "Unselected incoming profiles are ignored and never consume local profile capacity.",
      "The existing Skip, Replace and Keep both rules apply only to selected incoming profiles."
    ]
  },
  "local-preference-recovery-snapshot": {
    title: "Local preference recovery snapshot",
    summary: "Build 131 keeps one browser-local recovery point containing current interface preferences plus the complete ordered named-profile list.",
    steps: [
      "Choose Save snapshot to capture the current interface preferences and named-profile order.",
      "Build 131 also refreshes the snapshot automatically before destructive named-profile deletion or bundle import.",
      "Choose Restore snapshot to recover both current preferences and ordered named profiles.",
      "Choose Clear snapshot when the recovery point is no longer needed."
    ],
    notes: [
      "Only one recovery snapshot is retained; saving again replaces the previous one.",
      "The snapshot stays in this browser and is cleared by All local navigation data reset.",
      "Navigation insights, account data and business records are not included."
    ]
  },
  "named-profile-rename-duplicate": {
    title: "Rename & duplicate named profiles",
    summary: "Build 130 lets operators rename a selected local profile or duplicate it into a new local profile without changing the underlying workflow authority.",
    steps: [
      "Choose a saved profile in Quick switcher.",
      "For Rename, enter the new name in Profile name and choose Rename.",
      "For Duplicate, enter an optional new name or leave Profile name blank to generate a copy name automatically.",
      "Review the profile list to confirm the renamed or duplicated local profile."
    ],
    notes: [
      "Names remain limited to 40 characters and duplicate names are rejected case-insensitively.",
      "Duplicating preserves the source profile preferences and provenance but creates a new browser-local ID."
    ]
  },
  "portable-preference-bundles": {
    title: "Portable named preference bundles",
    summary: "Build 130 can export all saved named profiles as one versioned JSON bundle and import compatible bundles into another browser.",
    steps: [
      "Save one or more named local profiles.",
      "Choose Export named bundle to create a JSON file containing profile names and preference values.",
      "On another browser, choose Import named bundle and select that file.",
      "Review the staged conflict preview before importing."
    ],
    notes: [
      "Bundles exclude local profile IDs, navigation insights, account information, business data and workflow evidence.",
      "Bundle imports remain local to the current browser and do not create server-side synchronization."
    ]
  },
  "preference-bundle-conflict-resolution": {
    title: "Preference bundle conflict resolution",
    summary: "Build 130 requires an explicit strategy when an incoming bundle profile has the same name as a local profile.",
    steps: [
      "Review the conflict count and incoming profile list.",
      "Choose Skip to leave same-name local profiles unchanged.",
      "Choose Replace to keep the local ID but replace that profile's preference values with the incoming profile.",
      "Choose Keep both to preserve the local profile and import the incoming profile under an Imported suffix.",
      "Choose Import bundle only after reviewing the strategy and available local profile slots."
    ],
    notes: [
      "The eight-profile browser limit still applies; profiles beyond available capacity are skipped rather than evicting existing data.",
      "No conflict strategy changes roles, permissions, RLS, business state or server-side records."
    ]
  },
  "named-local-preference-profiles": {
    title: "Named local preference profiles",
    summary: "Build 129 lets operators save up to eight reusable interface preference combinations in the current browser without creating account or workspace profiles.",
    steps: [
      "Set density, workspace layout and recommendation visibility to the combination you want.",
      "Enter a short profile name and choose Save current.",
      "Saving again with the same name updates that local profile instead of creating a duplicate.",
      "Use the profile list to see its exact preference combination and provenance."
    ],
    notes: [
      "Named profiles use browser localStorage only and never synchronize to an account, workspace or server.",
      "The broad All local navigation data reset also clears named local profiles."
    ]
  },
  "preference-quick-switcher": {
    title: "Named profile quick switcher",
    summary: "The Build 129 quick switcher applies one saved local preference combination without changing roles, permissions, workflow state or business data.",
    steps: [
      "Open Insights and find Quick switcher.",
      "Choose a saved profile.",
      "Choose Apply to make its stored preferences active.",
      "Use Delete only when you want to remove that named profile from this browser."
    ],
    notes: [
      "Applying a profile still passes through the existing accessibility reconciliation layer.",
      "A current-match message appears only when all stored preference values exactly match a saved profile."
    ]
  },
  "preference-import-provenance": {
    title: "Preference import provenance",
    summary: "Build 129 records where a saved imported profile came from by retaining only the local source file name and supported preference-profile format/version.",
    steps: [
      "Import a Build 128-compatible preference JSON file.",
      "Review the source file name and format/version in the staged import preview.",
      "Enter a local profile name if you want to preserve that imported profile for quick switching.",
      "Choose Save imported as named profile before leaving the preview."
    ],
    notes: [
      "Provenance contains no file contents beyond the validated preference values and no filesystem path.",
      "No import timestamp, account identity, analytics identifier or business record is stored."
    ]
  },
  "preference-profile-portability": {
    title: "Preference profile portability",
    summary: "Build 128 exports and imports a small versioned JSON profile containing only interface density, layout and recommendation preferences.",
    steps: [
      "Open Insights and find Preference profile portability.",
      "Choose Export profile to download the current interface preference profile as JSON.",
      "On another browser, choose Import profile and select that JSON file.",
      "Review the reconciliation preview before applying the imported profile."
    ],
    notes: [
      "Navigation usage insights, account information, workspace records and business data are never included.",
      "Import is local to the current browser and does not create server-side profiles or synchronization."
    ]
  },
  "preference-import-preview": {
    title: "Preference import reconciliation preview",
    summary: "Build 128 stages a valid imported profile without applying it, then shows the stored values beside the effective values after current accessibility safeguards are considered.",
    steps: [
      "Select a valid exported preference profile.",
      "Compare stored and effective density, layout and recommendation values.",
      "Review any high-contrast, narrow-viewport or reduced-motion reconciliation messages.",
      "Choose Apply imported profile only when the preview matches your intent, or Cancel to leave current preferences unchanged."
    ],
    notes: [
      "Invalid format, unsupported versions and invalid preference values are rejected before preview.",
      "Accessibility reconciliation never rewrites the imported stored values."
    ]
  },
  "appearance-design-system": {
    title: "Marble Standard appearance & design system",
    summary: "Build 118 establishes Marble Standard as the active visual foundation: deep charcoal stone, restrained pale veining, translucent depth and teal operational accents backed by reusable theme tokens.",
    steps: [
      "Use the Appearance & Design System screen to inspect the active theme and reusable surface variants.",
      "Treat Marble Standard as presentation only; business state, permissions and evidence remain authoritative.",
      "Use the shared SurfaceCard framework for new major cards instead of inventing page-specific card styling.",
      "Keep the circled help control visible on every major card according to the Build 117 help standard.",
      "Add future themes through the theme registry and token contract rather than rewriting individual screens."
    ],
    notes: [
      "Build 118 stores no per-user appearance preference yet; Marble Standard is the single active theme.",
      "The marble treatment is CSS-generated and introduces no image asset dependency.",
      "Status semantics and accessibility take priority over decorative styling."
    ]
  },
  "appearance-card-framework": {
    title: "Reusable marble card framework",
    summary: "SurfaceCard is the Build 118 reusable presentation primitive for default, raised, metric, interactive and inset surfaces while preserving contextual help and status semantics.",
    steps: [
      "Choose the lowest-emphasis card variant that still communicates the content hierarchy.",
      "Use raised for module or summary cards, metric for compact quantitative cards and inset for nested secondary evidence.",
      "Use interactive only when the surface is meaningfully selectable or action-oriented.",
      "Attach the correct centralized help topic when the card is a major interface surface.",
      "Keep card content readable without depending on the marble pattern for meaning."
    ],
    notes: [
      "Surface variants are visual hierarchy only and never imply permission or workflow state.",
      "New cards should reuse this framework before adding one-off CSS."
    ]
  },
  "appearance-status-system": {
    title: "Operational status treatments",
    summary: "Build 118 standardizes neutral, healthy, attention, critical and informational treatments so operational meaning remains consistent across marble surfaces.",
    steps: [
      "Use neutral for ordinary content with no status meaning.",
      "Use healthy only for verified successful or normal state.",
      "Use attention for pending review, caution or operator follow-up.",
      "Use critical for failures, blockers or serious invariant conditions.",
      "Use information for explanatory or evidence-only context."
    ],
    notes: [
      "Never choose a status color for decoration.",
      "Text labels must continue to communicate status even if color is unavailable."
    ]
  },
  "appearance-accessibility": {
    title: "Theme accessibility & interaction rules",
    summary: "The Marble Standard theme keeps decoration subordinate to readable text, visible keyboard focus, semantic status labels and accessible contextual help.",
    steps: [
      "Keep text contrast readable over every marble surface.",
      "Preserve visible focus indicators on links, buttons and the circled help controls.",
      "Pair status color with text or icon meaning rather than color alone.",
      "Reduce decorative intensity on compact or data-dense surfaces.",
      "Keep responsive layouts usable without hiding required actions or help."
    ],
    notes: [
      "Accessibility requirements override decorative theme choices.",
      "The marble surface is generated with CSS gradients so it does not add alt-text or loading requirements."
    ]
  },
  "help-index": {
    title: "Help center",
    summary: "The help center collects the same contextual guidance available from every circled information control across the site.",
    steps: [
      "Open the topic matching the page or section you are using.",
      "Follow the numbered operating steps.",
      "Use Manual intervention only when that section explicitly says external setup is required."
    ],
    notes: ["If a section has no Manual intervention block, no external account/variable setup is required for that function."]
  }
} as const;

export type HelpTopicKey = keyof typeof HELP_TOPICS;

export const HELP_GROUPS: Array<{
  title: string;
  topics: HelpTopicKey[];
}> = [
  {
    title: "Platform & access",
    topics: ["command-center", "platform-overview", "workspaces", "sign-in", "guardrails", "ai-fields"]
  },
  {
    title: "Build 117 application shell & contextual help",
    topics: ["shell-overview", "workflow-directory", "shell-data", "shell-collection", "shell-corrective", "corrective-operations-console", "corrective-state-machine", "corrective-history", "shell-integrations", "shell-workspace", "help-system-standard"]
  },
  {
    title: "Build 132 profile favorites, recovery diff preview & bundle capacity planning",
    topics: ["named-profile-favorites", "recovery-diff-preview", "bundle-import-capacity-planning"]
  },
  {
    title: "Build 131 named profile ordering, selective bundle import & local recovery",
    topics: ["named-profile-ordering", "selective-bundle-import", "local-preference-recovery-snapshot"]
  },
  {
    title: "Build 130 profile rename/duplicate, portable bundles & conflict resolution",
    topics: ["named-profile-rename-duplicate", "portable-preference-bundles", "preference-bundle-conflict-resolution"]
  },
  {
    title: "Build 129 named local profiles, quick switcher & import provenance",
    topics: ["named-local-preference-profiles", "preference-quick-switcher", "preference-import-provenance"]
  },
  {
    title: "Build 128 preference profile portability & reconciliation preview",
    topics: ["preference-profile-portability", "preference-import-preview"]
  },
  {
    title: "Build 127 preference presets, accessibility reconciliation & reset governance",
    topics: ["interface-preference-presets", "accessibility-preference-reconciliation", "operator-reset-governance"]
  },
  {
    title: "Build 126 adaptive density, role-neutral layout & recommendation controls",
    topics: ["adaptive-navigation-density", "workspace-layout-preferences", "recommendation-controls"]
  },
  {
    title: "Build 125 navigation insights, shortcut metrics & interface recommendations",
    topics: ["navigation-usage-insights", "shortcut-discoverability-metrics", "personalized-interface-recommendations"]
  },
  {
    title: "Build 124 keyboard action map, context jumps & navigation accessibility",
    topics: ["keyboard-action-map", "context-jump-suggestions", "navigation-accessibility-audit"]
  },
  {
    title: "Build 123 pinned favorites, saved navigation sets & workspace shortcuts",
    topics: ["operator-favorites", "saved-navigation-sets", "workspace-shortcuts"]
  },
  {
    title: "Build 122 cross-module command palette & recent operator destinations",
    topics: ["command-palette", "recent-operator-destinations"]
  },
  {
    title: "Build 121 in-module task panels, search & operator shortcuts",
    topics: ["module-task-panels", "module-search", "operator-shortcuts"]
  },
  {
    title: "Build 120 module hubs & progressive navigation",
    topics: ["module-hubs", "progressive-navigation"]
  },
  {
    title: "Build 119 Command Center V2",
    topics: ["command-center-v2", "dashboard-attention", "dashboard-quick-actions", "dashboard-health", "dashboard-recent-work", "dashboard-workspaces"]
  },
  {
    title: "Build 118 Marble Standard design system",
    topics: ["appearance-design-system", "appearance-card-framework", "appearance-status-system", "appearance-accessibility"]
  },
  {
    title: "Collection & extraction",
    topics: ["collection-projects-overview", "collection-projects-readiness", "recipe-builder-overview", "recipe-builder-preview"]
  },
  {
    title: "Unified data library",
    topics: ["data-library-overview", "data-library-filters", "data-library-records"]
  },
  {
    title: "Barcode & intelligence",
    topics: ["barcode-overview", "barcode-capture", "barcode-review", "intelligence-overview", "intelligence-workspace", "intelligence-audit"]
  },
  {
    title: "Remote execution",
    topics: ["remote-overview", "remote-readiness", "remote-controls", "remote-evidence"]
  },
  {
    title: "Workspace profiles",
    topics: ["profiles-overview", "profiles-existing", "profiles-custom", "workspace-create", "workspace-manage"]
  },
  {
    title: "Connectors",
    topics: ["connectors-overview", "connector-registry", "connector-workspace", "connector-audit"]
  },
  {
    title: "Approved data & integration delivery",
    topics: ["corrective-closure-overview", "corrective-closure-verify", "corrective-closure-evidence", "corrective-delivery-overview", "corrective-delivery-activation", "corrective-delivery-idempotency", "reconciliation-triage-overview", "reconciliation-triage-case", "reconciliation-triage-planning", "reconciliation-triage-review", "post-delivery-reconciliation-overview", "post-delivery-reconciliation-verify", "post-delivery-reconciliation-evidence", "controlled-live-delivery-overview", "controlled-live-delivery-activation", "controlled-live-delivery-idempotency", "publication-delivery-overview", "publication-delivery-mapping", "publication-delivery-consumer", "publication-delivery-receipts", "integration-delivery"]
  },
  {
    title: "Retention & cleanup",
    topics: ["retention-overview"]
  },
  {
    title: "Adoption & permissions",
    topics: ["adoption-overview", "first-evidence-overview"]
  },
  {
    title: "Production learning",
    topics: ["learning-overview", "learning-evidence", "learning-browserless", "learning-renewal", "learning-trend-validation", "learning-gate-closure", "learning-intervention-sequencing", "learning-intervention-preflight", "learning-outcome-reconciliation", "learning-gaps", "learning-workspaces", "learning-roadmap"]
  }
];
