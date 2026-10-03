# Decisions

This file records durable architectural/product decisions. New decisions should be appended rather than silently changing history.

## D0001 — Dedicated repository

Decision: The shared platform lives in `RosevearCreations/ai-data-platform`, not inside Rosie Dazzlers, Devil n Dove or YW.

Reason: no business application should own infrastructure shared by the others.

## D0002 — One platform, multiple workspaces

Decision: Rosie Dazzlers, Devil n Dove and Personal are separate workspaces in one platform.

Reason: extraction, provenance, matching and review logic should be built once while data access remains isolated.

## D0003 — Local-first extraction

Decision: interactive extraction initially runs in the Chrome extension.

Reason: it provides a useful product before building costly remote browser infrastructure.

## D0004 — AI interprets; deterministic code repeats

Decision: AI is used for semantic work and recipe assistance. Normal code performs bulk extraction and arithmetic whenever possible.

Reason: lower cost, higher predictability, easier testing.

## D0005 — Evidence is canonical provenance

Decision: every external fact should be traceable to a URL/dataset and retrieval time.

Reason: comparisons and updates must be auditable.

## D0006 — Review before production writes

Decision: scraped/enriched data does not automatically overwrite Rosie Dazzlers or Devil n Dove production data by default.

Reason: prevent incorrect extraction or AI interpretation from corrupting business records.

## D0007 — Provider-neutral AI

Decision: core application logic calls internal AI tasks rather than vendor-specific APIs directly.

Reason: providers, models and pricing change.

## D0008 — Supabase persistence baseline — SUPERSEDED

Decision: use Supabase Postgres/Auth/Storage initially, with RLS-based workspace isolation.

Reason: strong relational model, auth and existing project familiarity.

Status: Superseded by D0011 after storage-capacity constraints were identified.

## D0009 — Prefer APIs/datasets over scraping

Decision: where a suitable official API or dataset exists, prefer it over page scraping.

Reason: reliability, policy compliance and lower maintenance.

## D0010 — Shared platform does not share business databases directly

Decision: integrations occur through explicit adapters and approved jobs.

Reason: preserve application boundaries and reduce blast radius.


## D0011 — Portable PostgreSQL + Better Auth

Decision: use provider-portable PostgreSQL for persistence and Better Auth for authentication. Neon is the initial managed PostgreSQL host.

Reason: the platform needs more independent storage capacity without coupling authentication, authorization or migrations to a single hosted database product.

## D0012 — Runtime-role RLS boundary

Decision: user-scoped application queries switch transaction-locally to the non-owner `ai_data_runtime` role and set the Better Auth user ID only for that transaction.

Reason: PostgreSQL table owners normally bypass RLS. Using a restricted runtime role preserves database-level workspace isolation while allowing migrations and owner bootstrap tasks to use the administrative connection deliberately.

## D0013 — Temporary active-tab DOM inspection

Decision: Build 003 inspects pages with Chrome's `activeTab` and `scripting` permissions after a user invokes the extension. The extension does not request persistent broad host permissions.

Reason: the Page DOM Inspector only needs temporary access to the page the user explicitly chooses. This reduces permission scope and avoids continuous background access to browsing content.

The inspector captures bounded structural/text/attribute summaries and does not collect form values, passwords, cookies, local/session storage, or page JavaScript state.

## D0014 — Exact and generalized selector capture

Decision: the visual picker returns both an exact selector for the chosen element and a generalized selector intended to reveal repeated peer fields.

Reason: exact selectors support verification and one-off targets, while generalized selectors support later multi-record extraction. Build 004 reports match counts and previews selector matches before later recipe-building features consume them.

Selector generation prefers stable IDs and semantic attributes, then stable class combinations, and falls back to structural position only when uniqueness requires it.

## D0015 — Repeating-record detection is deterministic and confidence-scored

Decision: Build 005 detects repeated record boundaries with deterministic DOM heuristics before any AI involvement.

The detector scores candidates using repeat ratio, structural consistency, record count, text richness, descendant richness, link/image coverage and semantic structures such as tables, lists and articles. Navigation/header/footer structures are penalized.

A selected field can also guide boundary inference by finding repeated sibling ancestors around all matching field elements.

Reason: record boundaries are foundational extraction logic. Deterministic evidence is cheaper, testable and explainable, while AI can later assist only when these signals are ambiguous.

## D0016 — Versioned portable extraction recipes

Decision: Build 006 introduces extraction recipe schema version 1. A recipe contains one repeated-record selector plus ordered field rules with a relative selector, extraction source, optional attribute, required flag and deterministic transforms.

Supported extraction sources are text, link URL, image URL and safe attributes. Supported transforms are trim, whitespace collapse, lowercase, uppercase, number and currency.

Reason: recipes must be portable, inspectable and executable without AI. Versioning gives future builds a stable compatibility boundary as recipe capabilities grow.

Build 006 only drafts and tests recipes locally in the active tab. Persistent recipe storage is intentionally deferred to the Saved Scrapers and Templates milestone.
