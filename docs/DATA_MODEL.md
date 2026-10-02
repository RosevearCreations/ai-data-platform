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
