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
      "The live-delivery idempotency key is the existing package replayKey and cannot be edited by the runtime role.",
      "The consumer must promise that duplicate replay keys return the original acknowledgement rather than applying the mutation again.",
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
    topics: ["controlled-live-delivery-overview", "controlled-live-delivery-activation", "controlled-live-delivery-idempotency", "publication-delivery-overview", "publication-delivery-mapping", "publication-delivery-consumer", "publication-delivery-receipts", "integration-delivery"]
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
