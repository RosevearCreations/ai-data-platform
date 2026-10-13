# Data Model

## Principles

- every business-facing record belongs to a workspace;
- external facts retain source provenance and retrieval timestamps;
- recipes and runs are versioned;
- normalized data is separated from raw evidence;
- approval state is explicit;
- production integration writes are auditable and reversible where the target system supports it.

## Core entities

### profiles

Application profile associated with an authenticated user.

Key fields:

- id
- display_name
- created_at
- updated_at

### workspaces

Logical isolation boundary.

Key fields:

- id
- slug
- name
- type: business | personal
- created_at
- updated_at

Initial slugs:

- rosiedazzlers
- devilndove
- personal

### workspace_members

Membership and role mapping.

Key fields:

- workspace_id
- user_id
- role
- created_at

### data_sources

A website, API, file or manual source definition.

Key fields:

- id
- workspace_id
- name
- source_type: website | api | csv | xlsx | json | manual
- base_url
- status
- notes
- created_at
- updated_at

### scraper_recipes

Portable extraction definition.

Key fields:

- id
- workspace_id
- data_source_id
- name
- target_pattern
- recipe_json
- version
- status: draft | active | paused | retired
- created_by
- created_at
- updated_at

### scraper_fields

Human-readable field definitions tied to a recipe.

Key fields:

- id
- recipe_id
- field_key
- label
- data_type
- selector_or_strategy
- attribute
- instruction
- transform
- required
- sort_order

### scraper_runs

One execution of a recipe.

Key fields:

- id
- workspace_id
- recipe_id
- started_at
- completed_at
- status
- source_url
- page_count
- record_count
- warning_count
- error_count
- execution_context
- recipe_version

### datasets

Named logical collections of records.

Examples:

- Ontario Detailers
- Devil n Dove Suppliers
- Movie Collection Enrichment

Key fields:

- id
- workspace_id
- name
- dataset_type
- schema_json
- created_at
- updated_at

### records

Current normalized entity record.

Key fields:

- id
- workspace_id
- dataset_id
- external_key
- canonical_name
- normalized_json
- confidence
- review_status: unreviewed | approved | rejected | needs_review
- first_seen_at
- last_seen_at
- last_changed_at
- created_at
- updated_at

### record_versions

Immutable or append-only history of material record states.

Key fields:

- id
- record_id
- run_id
- normalized_json
- change_summary
- observed_at

### source_evidence

Provenance for extracted facts.

Key fields:

- id
- workspace_id
- record_id
- run_id
- source_url
- source_type
- page_title
- retrieved_at
- raw_fragment_or_reference
- content_hash
- evidence_json

### field_observations

Optional field-level provenance and history.

Key fields:

- id
- record_id
- field_key
- observed_value
- normalized_value
- source_evidence_id
- confidence
- observed_at

### review_items

Queue for ambiguous or consequential updates.

Key fields:

- id
- workspace_id
- record_id
- reason
- proposed_changes
- confidence
- status
- reviewed_by
- reviewed_at

### integration_targets

Configuration metadata for approved downstream systems.

Examples:

- Rosie Dazzlers inventory
- Devil n Dove inventory

Secrets are never stored as plaintext configuration fields.

### integration_jobs

Auditable write/export job.

Key fields:

- id
- workspace_id
- integration_target_id
- dataset_id
- status
- requested_by
- approved_by
- payload_summary
- started_at
- completed_at

## Domain-specific extension tables

The generic record model may be extended with typed tables where strong relational queries are valuable.

### detailing_businesses

Candidate fields:

- record_id
- business_name
- website_url
- city
- province
- service_area
- mobile_service
- fixed_location
- public_phone
- public_email

### detailing_offers

Candidate fields:

- business_record_id
- offer_name
- normalized_category
- vehicle_class
- price_amount
- price_type: exact | starting_at | range | quote
- currency
- included_services
- observed_at

### supplier_products

Candidate fields:

- record_id
- supplier_name
- product_name
- sku
- package_quantity
- stock_unit
- usage_unit
- usage_units_per_stock_unit
- current_price
- currency
- cost_per_usage_unit
- image_url

### movie_matches

Candidate fields:

- record_id
- title
- release_year
- upc
- tmdb_id
- imdb_id
- match_confidence
- match_status

## RLS requirement

Every exposed table containing workspace data must enforce row-level authorization based on workspace membership. Authorization must not rely on user-editable metadata.

## Migration rule

Schema changes are migration-driven and reviewed as part of a numbered build. No undocumented production-only schema changes.


## Build 020 concrete sync tables

### workspace_saved_scrapers

Durable workspace-scoped copy of extension saved scrapers and saved templates.

Key fields:

- workspace_id
- scraper_id
- kind: scraper | template
- name
- source_url
- source_origin
- client_updated_at
- server_version
- payload
- deleted_at
- created_at
- updated_at

The primary key is `(workspace_id, scraper_id)`. `server_version` is used for optimistic concurrency. `deleted_at` is a synchronization tombstone.

### workspace_reviewed_datasets

Durable bounded workspace-scoped reviewed dataset snapshot.

Key fields:

- workspace_id
- dataset_id
- recipe_name
- source_url
- retrieved_at
- client_updated_at
- row_count
- server_version
- payload
- deleted_at
- created_at
- updated_at

The primary key is `(workspace_id, dataset_id)`. The synchronized payload is limited to 500 rows in Build 020; this bound does not truncate the extension's full local reviewed dataset.

### Build 020 RLS rule

Both concrete synchronization tables enable PostgreSQL row-level security and grant the runtime role only membership-scoped read/write access. Selection, creation, update and deletion all require a matching `app.workspace_members` row for the transaction's `app.user_id`.


## Build 021 concrete intelligence continuity tables

### workspace_intelligence_modules

One bounded versioned snapshot per workspace/module.

Key fields:

- workspace_id
- module_key: history | rosie-competitive | devil-supplier | movie-metadata | scheduled-jobs | business-integrations
- client_updated_at
- server_version
- summary
- payload
- created_at
- updated_at

The primary key is (workspace_id, module_key). Server-side API validation mirrors local retention limits: history 30 series/20 snapshots/1000 changes, Rosie 75 series, supplier staging 500 items/24 price observations, movie collection 7500 plus 1000 match-queue entries, scheduled jobs 50 with 30 attempts and 100 notifications, integration state 30 batches/250 local audit entries.

### workspace_intelligence_audit

Append-only integration evidence.

Key fields:

- workspace_id
- audit_id
- batch_id
- target
- action
- occurred_at
- fingerprint
- details
- payload
- created_at

The runtime role can SELECT and INSERT only. Approval/export/cancellation evidence cannot be rewritten or deleted through the normal application runtime.


## Build 024 mobile barcode intake

### workspace_barcode_captures

Workspace-scoped reviewed identifier handoffs.

Key fields:

- workspace_id
- capture_id
- target: personal-movie | devil-supplier
- raw_code
- normalized_code
- barcode_format
- capture_method: camera | manual
- captured_at
- provenance
- match_status: exact | unmatched | duplicate
- match_payload
- review_status: pending | approved | rejected
- reviewed_at
- created_at
- updated_at

The canonical normalized code left-pads UPC-A/EAN-13/EAN-8/GTIN-14 digits to GTIN-14 for equality comparison. UPC-E is retained with an explicit upce: prefix rather than being incorrectly expanded without a verified conversion.

Match payloads are intentionally bounded. Personal movie exact matches expose only record ID/title/year, not ownership notes or shelf data. Devil n Dove exact matches expose staging item ID, supplier/product name, supplier SKU and staging review status, not internal inventory/location/business fields.

The normal application runtime role has SELECT/INSERT/UPDATE but no DELETE grant on barcode captures. RLS requires workspace membership.


## Build 025 source policy registry

Source-policy state is persisted as the source-policy entry in app.workspace_intelligence_modules, preserving the existing one-versioned-snapshot-per-workspace/module model and RLS boundary.

Each registry payload is version 1 and contains at most 150 entries. Each SourcePolicyEntry includes:

- id and workspaceId;
- normalized origin;
- displayName and collection purpose;
- collectionMethod;
- publicOrAuthorized;
- termsReviewed and optional termsUrl;
- robotsDecision and optional robotsUrl;
- noAccessControlBypass;
- dataSensitivity;
- minimumDelayMs;
- maxPagesPerRun and maxRecordsPerRun;
- reviewExpiresAt;
- status;
- notes;
- monotonic revision;
- stable fingerprint;
- createdAt and updatedAt.

Scheduled jobs retain a policy pin containing the registry policy ID, revision, fingerprint, expiry and relevant budgets. A later policy revision does not silently mutate that historical approval; the job must pass explicit Refresh + re-review.


## Build 027 controlled remote pilot

### remote_execution_controls

One row per workspace. Stores the selected Browserless provider, region, enable state, workspace kill switch, direct-only egress mode, one-run concurrency limit, two-unit ceiling and the currently reserved pilot slot. New rows default disabled/killed.

### remote_execution_source_allowlist

Exact workspace + normalized source-origin allowlist. Each row pins the Build 025 policy ID, revision and fingerprint and carries stricter pilot limits: one page, at most 500 records of downstream capacity, at most 60 seconds and at most two provider units.

### remote_execution_provider_events

Append-only provider/audit evidence. Stores event type, optional job ID, Browserless region, direct egress, estimated billing units, duration, target response code and bounded JSON details. The runtime role can SELECT/INSERT only.


## Build 028 workspace profiles

### workspace_profiles

Reusable domain definitions keyed by profile_key. Each profile stores name/description, compatibility workspace_type, normalization_fields, review_dimensions, provenance_policy, history_policy, review_policy, profile-scoped templates, capability flags, built-in/custom status, creator and archive timestamps.

Built-ins are immutable. Custom profiles are archive-only and RLS-scoped.

### workspaces additions

- profile_key — required reference to workspace_profiles;
- purpose — operator-readable workspace purpose;
- archived_at — soft-archive lifecycle;
- created_by — creator evidence for newly profiled workspaces.

The original type column remains business/personal for compatibility. Profile identity is authoritative for specialized domain behavior.


## Build 029 connector SDK data

### workspace_connector_installations

Workspace-scoped connector installation state keyed by workspace_id + connector_key:

- manifest_version / connector_version;
- enabled;
- config JSON (non-secret configuration only);
- granted_capabilities JSON array;
- secret_refs JSON object containing references only;
- installed_by and timestamps.

RLS permits workspace members to read, while owner/admin context is required to insert/update.

### workspace_connector_audit

Append-only connector execution evidence:

- workspace_id + audit_id;
- connector_key and requested capability;
- succeeded/failed/blocked status;
- actor and start/completion/duration;
- bounded input/output summaries;
- sanitized error_code.

The runtime role has no UPDATE/DELETE grant on this table.


## Build 030 production-learning view

Build 030 adds no new PostgreSQL table. It derives an authenticated read model from existing workspace-scoped evidence:

- workspace_saved_scrapers / workspace_reviewed_datasets — active/tombstoned assets, row counts, server-version changes and payload bytes;
- workspace_intelligence_modules — module adoption plus scheduled/source-policy summaries;
- workspace_intelligence_audit — dry-run/approved/exported/cancelled business-integration evidence;
- workspace_barcode_captures — capture/review/match/method counts and bounded payload bytes;
- remote_execution_jobs / remote_execution_results — lifecycle counts and payload bytes;
- remote_execution_controls / remote_execution_source_allowlist / remote_execution_provider_events — readiness, allowlist count, provider run outcomes, estimated units, average duration and evidence bytes;
- workspace_connector_installations / workspace_connector_audit — installations, enabled state, execution outcomes and evidence bytes;
- workspace_members / workspace_profiles — accountability and profile adoption.

The payload-byte total is an application storage proxy, not the provider's billed database size. Build 031 adds bounded durable operational outcome rows, so sync-conflict and recipe-repair rates are now measured directly instead of inferred from asset versions.

## Build 031 operational outcome telemetry

### workspace_operational_outcomes

Append-only, workspace-scoped bounded events for synchronization and recipe-repair outcomes. Sync events record applied/conflict/noop/deleted/error status. Repair events record proposed/approved/rejected/rolled-back and post-repair compatibility status. Event details are capped at 4 KiB and exclude raw page DOM and selector payloads.

Runtime permissions are SELECT/INSERT only. RLS requires workspace membership and binds inserted actor identity to `app.user_id`. Retention keeps at most 180 days and 2,000 events per workspace/event family.

### production_learning_review_snapshots

Changed-evidence snapshots preserve the counts required for before/after sync-conflict and repair-health comparisons. A SHA-256 evidence fingerprint prevents repeated page reads from creating duplicate unchanged snapshots. Retention keeps at most 365 days and 60 snapshots per workspace.

Runtime permissions are SELECT/INSERT only and RLS remains workspace-scoped.

### integration_delivery_events

Append-only Build 033 evidence for consumer handshake and package delivery.

Key fields:

- workspace_id;
- event_id;
- consumer_id;
- target: rosie-dazzlers | devil-n-dove;
- transport_mode: conformance | live;
- event_type: handshake-accepted | handshake-rejected | delivery-attempted | delivery-accepted | delivery-rejected | transport-error;
- batch_id / package_id / replay_key / fingerprint;
- validation_code / optional HTTP status;
- bounded details JSON;
- actor_user_id;
- occurred_at / created_at.

Runtime access is SELECT + INSERT only under workspace RLS. Details are capped at 4 KiB and retention is bounded to 365 days / 2,000 events per workspace.

### integration_consumer_receipts

Append-only replay registry used by the Build 033 conformance receiver.

Key fields:

- workspace_id;
- consumer_id;
- target;
- package_id;
- replay_key;
- fingerprint;
- actor_user_id;
- received_at / created_at.

The composite primary key prevents the same package ID being accepted twice by the same scoped consumer.

## Build 034 retention and cleanup

### workspace_retention_policies

Workspace-scoped policy state for Build 034. The default policy is fail-closed (`cleanup_approved=false`) with a maximum 100 rows per cleanup run and explicit per-class byte budgets. Only owners/admins may approve or revoke cleanup. The budget map is bounded JSON and Build 034 does not expose arbitrary budget editing.

### workspace_retention_policy_events

Append-only approval/revocation evidence. Runtime access is SELECT/INSERT only under workspace RLS; updates/deletes are not granted.

### workspace_retention_cleanup_runs

Append-only before/after cleanup evidence recording measured rows/bytes, eligible rows/bytes, deleted reviewed-barcode rows, deleted terminal remote jobs and bounded failure codes. Runtime access is SELECT only; the security-definer cleanup function is the only writer.

### workspace_retention_metrics

RLS-invoker view that reports row and storage proxies for synchronized payloads, intelligence modules, barcode intake, remote jobs/results, intelligence audit, provider audit, connectors, operational outcomes, production-learning snapshots, integration delivery evidence and retention-control evidence. It also reports manual-archive and bounded-delete candidate counts.

### execute_workspace_retention_cleanup

Security-definer function callable only after normal session/workspace admin validation and a durable `cleanup_approved=true` policy. Each call is capped to the policy maximum (100 by default; hard ceiling 250). Build 034 can delete only:

- reviewed barcode captures older than 90 days; and
- terminal remote jobs older than 30 days (with their result rows through the existing FK cascade).

Pending barcode captures, active remote jobs, synchronized tombstones, and all protected append-only/security evidence are excluded.

## Build 035 adoption and permission outcomes

### workspace_adoption_review_snapshots

Workspace-scoped, append-only adoption snapshots capture the smallest durable comparison surface needed for trend and least-privilege review:

- profile key;
- enabled / used / unused-enabled capability keys;
- high-risk unused capability keys;
- observed activity that conflicts with disabled capability flags;
- connector installation, enabled, grant, used-grant, unused-grant, stale-grant and blocked-attempt counts;
- synchronized/source-policy/scheduled/remote/barcode/integration activity counts;
- owner/admin/member counts;
- aggregate activity count and used-capability count.

A SHA-256 evidence fingerprint prevents repeated reads from creating duplicate unchanged snapshots. Runtime permissions are SELECT/INSERT only under workspace RLS. Retention is bounded to 365 days and 60 snapshots per workspace.

Build 035 never stores connector secret values, raw extracted datasets or membership credentials in adoption snapshots.

## Build 036 production-learning cycle snapshots

### production_learning_cycle_snapshots

Workspace-scoped append-only renewal evidence for the Build 036 review. Each row stores compact counts only:

- sync events/conflicts/errors;
- repair checks/healthy/rollbacks;
- provider runs/successes/units;
- integration attempts/live accepts/rejections/transport errors;
- retention budget breaches/delete-eligible rows/cleanup failures;
- adoption activity/used capabilities/high-risk unused capabilities;
- connector unused-grant count;
- whether permission review is required.

Rows are SHA-256 fingerprint-deduplicated per workspace/cycle, RLS scoped, runtime SELECT/INSERT only, and bounded to 365 days / 30 snapshots per workspace.

## Build 038 trend-validation continuity

Migration `0016_production_learning_trend_validation.sql` extends `app.production_learning_cycle_snapshots` without creating another analytics table.

Changes:

- `cycle_key` accepts `build-036` and `build-038`;
- `observation_context` distinguishes legacy historical cycle rows from rows generated by the Build 038 runtime;
- existing pre-Build-038 rows default to `legacy`;
- new Build 036 continuity rows emitted by the Build 038 runtime are marked `build-038-runtime` and are not eligible as historical trend baselines;
- Build 038 snapshots are also marked `build-038-runtime`;
- existing RLS, append-only runtime grants, fingerprint deduplication and 365-day / 30-row-per-workspace retention remain in force.

No raw business payloads, secrets or credentials are added to the cycle snapshot.


## Build 044 unified library read model

Build 044 does **not** add a database table. The authenticated `/data-library` explorer creates a read-only union at query time over:

- `app.workspace_saved_scrapers` (saved scraper/template records);
- `app.workspace_reviewed_datasets`;
- `app.workspace_intelligence_modules`;
- `app.workspace_barcode_captures`.

The union preserves each originating record ID, workspace identity, timestamps, source/provenance fields, explicit server version where applicable, normalized/summary data and raw durable payload. PostgreSQL RLS on the originating tables remains authoritative. Tombstones, duplicate state and review state are exposed as source facts; no confidence or verification state is inferred by the read model.


## Build 045 collection projects

### workspace_collection_projects

Durable workspace-scoped collection intent:

- workspace_id + project_id primary key;
- name, purpose, lifecycle status, cadence, owner_label and notes;
- created_by, created_at and updated_at;
- member SELECT policy;
- owner/admin INSERT/UPDATE policies;
- no runtime DELETE grant.

### workspace_collection_project_sources

Durable project source bindings:

- workspace_id + project_id + source_id primary key;
- display_name, normalized http/https source_url and source_origin;
- collection_method aligned with Source Policy methods;
- optional source_policy_id and saved_scraper_id references by stable application ID;
- cadence, lifecycle status and notes;
- member SELECT policy;
- owner/admin INSERT/UPDATE policies;
- no runtime DELETE grant.

Source Policy and scraper IDs are intentionally not database foreign keys because those originating records live in versioned intelligence/synchronization models. Build 045 resolves them dynamically under the same workspace RLS and marks missing, expired, mismatched or tombstoned evidence as blockers.


## Build 046 visual recipe persistence

Build 046 adds no database table. Web-authored recipes use existing `app.workspace_saved_scrapers` records with `kind = scraper|template`.

The payload remains compatible with the extension's saved scraper shape and includes:

- version/id/workspaceId/kind/name;
- sourceUrl/sourceOrigin;
- createdAt/updatedAt;
- monotonic recipe revision and retained prior revisions;
- version-1 extraction recipe;
- existing compatibility/check-history slots.

Writes use the Build 020 optimistic-concurrency sync boundary, so web and extension authorship share server versions and stale updates return conflicts instead of replacing newer state.

## Build 047 collection-run read model

Build 047 adds no PostgreSQL table.

The authenticated run console joins existing workspace-scoped evidence at read time:

- `workspace_collection_projects` / `workspace_collection_project_sources` for project/source intent;
- `workspace_intelligence_modules(module_key='source-policy')` for the current exact Source Policy pin and collection restrictions;
- `workspace_intelligence_modules(module_key='scheduled-jobs')` for synchronized local Chrome run attempts;
- `remote_execution_jobs` for Browserless lifecycle, cancellation and failures;
- `remote_execution_results` for append-only successful result payloads and recorded provider/page evidence;
- `remote_execution_controls` / `remote_execution_source_allowlist` for existing Browserless authorization state.

PostgreSQL RLS on every originating source remains authoritative. Downloaded run reports are generated client-side from the already-authorized read model and are not persisted as another server-side record.


## Build 048 data review workbench

### workspace_data_review_batches

A workspace-scoped review snapshot for one exact `workspace_reviewed_datasets` version.

Key fields:

- workspace_id / review_id;
- source_dataset_id;
- source_server_version;
- source_fingerprint;
- title / source_url;
- status: in-review | approved | rejected;
- original_payload — immutable source snapshot held for comparison;
- working_rows — bounded review rows containing original, cleaned and inclusion state;
- row_count / included_count;
- cleanup_summary;
- review_note;
- created_by / updated_by;
- approved_by / approved_at;
- rejected_by / rejected_at;
- created_at / updated_at.

The normal application may update a batch only while it remains `in-review`. Application logic rejects terminal cleanup mutations and requires owner/admin membership for approval/rejection. The source reviewed dataset is not modified by this workflow.

### workspace_data_review_events

Append-only review audit evidence.

Key fields:

- workspace_id / event_id / review_id;
- action: created | saved | approved | rejected;
- actor_user_id;
- bounded JSON details;
- created_at.

The runtime role receives SELECT/INSERT only and no UPDATE/DELETE grant on review events. Both review tables use workspace-membership RLS. A review approval records a handoff decision and does not by itself mutate a downstream business system.


## Build 049 approved dataset publishing

### workspace_dataset_publications

One canonical immutable export snapshot per terminal approved Build 048 review.

Key fields:

- workspace_id / publication_id;
- review_id;
- source_dataset_id / source_server_version / source_fingerprint;
- title / source_url;
- status: published | withdrawn;
- publication_fingerprint;
- row_count;
- field_order;
- published_rows;
- approval_note;
- publication_note;
- review_approved_by / review_approved_at;
- published_by / published_at;
- withdrawn_by / withdrawn_at / withdrawal_note.

A unique `(workspace_id, review_id)` constraint prevents competing publication snapshots for one approval. `published_rows` contains only rows included in the approved review and freezes the cleaned values at publication time. Runtime SELECT is available to authorized workspace members; INSERT/UPDATE RLS is restricted to workspace owner/admin roles. Application updates are limited to non-destructive withdrawal state.

### workspace_dataset_publication_events

Append-only publication/export evidence with actions:

- published;
- exported-json;
- exported-csv;
- withdrawn.

The runtime role receives SELECT/INSERT and no UPDATE/DELETE grant. Export events identify the publication fingerprint and row count without copying the full exported payload into the event ledger.


## Build 050 publication delivery bridge

### workspace_publication_delivery_mappings

Immutable mapping evidence that connects one Build 049 publication to one supported consumer contract.

Key fields:

- workspace_id / mapping_id / publication_id;
- target: rosie-dazzlers | devil-n-dove;
- status: active | retired;
- integration_key_field;
- operation_action: create | update;
- evidence_url_field (optional; otherwise publication source URL);
- evidence_timestamp_field;
- field_map;
- mapping_fingerprint;
- created_by / created_at;
- retired_by / retired_at / retirement_note.

The mapping fingerprint binds the publication fingerprint, target, action and mapping configuration. The runtime role receives INSERT plus UPDATE only on retirement-state columns; mapping content cannot be edited in place. A corrected mapping is a new mapping.

### workspace_publication_delivery_receipts

Append-only evidence linking publication and mapping identity to the exact Build 033 package and consumer outcome.

Key fields:

- workspace_id / receipt_id;
- mapping_id / publication_id;
- publication_fingerprint / mapping_fingerprint;
- target / transport_mode;
- consumer_id;
- package_id / replay_key / package_fingerprint;
- receipt_status: accepted | rejected | transport-error;
- validation_code;
- dry_run;
- consumer_received_at;
- actor_user_id;
- bounded details;
- created_at.

Runtime access is SELECT/INSERT only under workspace RLS. Receipt rows never contain bearer credentials or full package bodies.


## Build 051 controlled live delivery

### workspace_consumer_live_activations

Temporary live-mutation authority for one exact Build 050 mapping and configured consumer.

Key fields:

- workspace_id / activation_id;
- mapping_id / publication_id / target;
- status: active | revoked;
- consumer_id;
- publication_fingerprint / mapping_fingerprint;
- package_id / replay_key / package_fingerprint;
- dry_run_receipt_id;
- idempotency_key_source = replayKey;
- duplicate_behavior = return-original-ack;
- activation_fingerprint;
- activated_by / activated_at / expires_at;
- revoked_by / revoked_at / revocation_note.

Only one active activation may exist per mapping. Runtime UPDATE is limited to revocation-state columns. Activation identity and all pinned evidence are immutable.

### workspace_publication_live_deliveries

Canonical sender-side live-delivery identity and terminal/retry state.

Key fields:

- workspace_id / delivery_id;
- activation_id / mapping_id / publication_id;
- target / consumer_id;
- publication_fingerprint / mapping_fingerprint / activation_fingerprint;
- package_id / replay_key / package_fingerprint;
- idempotency_key;
- status: reserved | accepted | rejected | transport-error;
- attempt_count;
- validation_code / http_status / consumer_received_at;
- bounded acknowledgement metadata;
- created_by / created_at / last_attempt_at / updated_at.

A unique `(workspace_id, consumer_id, package_id)` constraint creates one canonical sender-side delivery identity. Runtime UPDATE is limited to attempt/outcome fields; identity and idempotency columns cannot change.


## Build 052 post-delivery reconciliation

### workspace_live_delivery_reconciliations

Append-only evidence for a read-only consumer-state verification of one accepted Build 051 live delivery.

Key fields:

- workspace_id / reconciliation_id;
- delivery_id / activation_id / mapping_id / publication_id;
- target / consumer_id;
- package_id / replay_key / package_fingerprint;
- status: matched | drift | rejected | transport-error;
- expected_record_count;
- matched_count / mismatched_count / missing_count;
- validation_code / http_status / consumer_verified_at;
- verification_fingerprint;
- bounded record_results;
- actor_user_id / created_at.

For matched/drift outcomes the three result counts must sum to the expected record count. Rejected/transport-error outcomes retain zero comparison counts because no trustworthy state comparison completed. `record_results` stores integration key, matched/mismatched/missing status, expected/observed fingerprints and differing governed field names rather than full consumer values.

Runtime access is SELECT/INSERT only under workspace RLS. There is no runtime UPDATE or DELETE grant.


## Build 053 reconciliation exception triage

### workspace_reconciliation_exception_cases

One canonical triage case per Build 052 drift reconciliation. Mutable runtime fields are limited to status, classification, severity, resolution intent, summary, investigation notes and closure/update audit fields. Reconciliation fingerprint, package identity, affected integration keys/fields and source linkage are immutable.

### workspace_corrective_delivery_plans

Frozen planning artifact for one triage case. It pins reconciliation fingerprint, package ID, replay key, package fingerprint, rationale and correction scope. Correction scope contains integration key, mismatch/missing status, proposed planning action, governed fields, desired values and expected/observed fingerprints.

Runtime UPDATE is restricted to review status and review audit fields. Plan identity and correction scope cannot be changed after creation.


## Build 054 corrective delivery execution

### workspace_corrective_delivery_activations

Temporary authority for one exact approved Build 053 plan and one exact corrective package. The row pins the source package, corrective package, consumer origin, plan fingerprint, accepted dry-run evidence and activation fingerprint. Runtime UPDATE is restricted to revocation fields only.

### workspace_corrective_live_deliveries

Canonical sender-side delivery identity for one corrective package and consumer origin. The row pins plan fingerprint, activation fingerprint, corrective package ID/replay/fingerprint and `idempotency_key`. Runtime UPDATE is restricted to attempt/outcome evidence; identity fields are immutable. Accepted/rejected outcomes are terminal while transport-error may return to reserved with the same identity up to five attempts.


## Build 055 corrective reconciliation and closure

### workspace_corrective_delivery_reconciliations

Append-only read-back evidence for an accepted Build 054 corrective delivery. Each row pins the corrective delivery, original source delivery, approved plan/case, consumer identity, plan fingerprint, corrective package/replay/fingerprint, terminal verification status, per-key result fingerprints and actor/time. Runtime access is SELECT/INSERT only.

### workspace_reconciliation_exception_closures

One immutable verified closure row per Build 053 exception case. The row pins the approved plan, accepted corrective delivery, latest matched corrective reconciliation, plan/corrective-package/verification fingerprints, operator closure note and deterministic closure fingerprint. Runtime access is SELECT/INSERT only.

A database trigger on `workspace_reconciliation_exception_cases.status` requires an existing Build 055 closure row before a transition to `closed`.

## Build 056 post-closure regression monitoring and reopen governance

### workspace_post_closure_regression_checks

Append-only current-state evidence for a verified Build 055 closure. Each row pins the closure/case/plan/corrective-delivery identity, consumer origin, closure fingerprint, corrective package/replay/fingerprint, terminal check status, compact per-key comparison evidence and actor/time. Status is `stable | regressed | rejected | transport-error`. Runtime access is SELECT/INSERT only.

### workspace_reconciliation_exception_reopens

One immutable governed reopen row per Build 055 closure. The row pins the closure, newest regressed check, case/target, closure fingerprint, regression fingerprint, operator reason and deterministic reopen fingerprint. Runtime access is SELECT/INSERT only.

A database trigger requires a matching reopen row before a case may leave `closed`. The Build 055 verified-close guard also excludes closures that already have a reopen row, preventing stale closure evidence from silently re-closing a reopened case.



## Build 057 reopened exception re-triage

### workspace_reopened_exception_triage_cycles

One re-triage generation per Build 056 reopen. Identity fields bind the reopen, historical closure, regression check, original case and regression fingerprint. Mutable runtime fields are limited to the re-triage status and operator classification/severity/intent/notes. The original case and historical evidence are not rewritten.

### workspace_successor_corrective_delivery_plans

Immutable successor-plan identity and correction scope for a reopened exception. The row pins the re-triage generation, Build 056 regression fingerprint, predecessor Build 053 plan, accepted Build 054 corrective delivery and its package/replay/fingerprint identity. Runtime updates are limited to review status and review audit fields. Runtime DELETE is not granted.

## Build 058 successor execution evidence

- `app.workspace_successor_corrective_delivery_activations` binds one active execution window to the approved Build 057 successor plan, its re-triage/reopen/regression evidence, the accepted predecessor corrective delivery, the newly derived successor package identity, and the accepted dry-run acknowledgement.
- `app.workspace_successor_corrective_live_deliveries` stores the idempotent live reservation/result ledger. Identity columns are immutable to the runtime role; only delivery status/attempt/result fields have narrow UPDATE grants.
- The predecessor Build 054 activation/delivery rows remain historical evidence and are not rewritten or reused as successor execution rows.
- Migration: `0028_successor_corrective_delivery_execution.sql`.

## Build 059 successor reconciliation evidence

- `app.workspace_successor_corrective_delivery_reconciliations` records independent read-back evidence for an accepted Build 058 successor delivery, including exact plan/regression/package identities, status, record-level results and verification fingerprint.
- `app.workspace_reconciliation_exception_reclosures` records one immutable verified re-closure for the current reopen generation. It binds the original closure and reopen fingerprints to the Build 057 plan, Build 058 delivery and newest matched Build 059 reconciliation.
- Runtime access is SELECT/INSERT only for both tables. UPDATE and DELETE are not granted.
- Migration: `0029_successor_corrective_reconciliation_reclosure.sql`.

## Build 060 recurrence evidence

- `app.workspace_post_reclosure_regression_checks` stores immutable post-re-closure state-verification evidence against the exact accepted successor package.
- `app.workspace_reconciliation_exception_recurrences` stores one governed recurrence per Build 059 re-closure and binds the newest recurrent check, case, target and re-closure fingerprint.
- Runtime access to both tables is SELECT/INSERT only; UPDATE and DELETE are not granted.
- Migration: `0030_post_reclosure_recurrence_governance.sql`.
