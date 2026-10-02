# Product

## Product name

AI Data Platform

## Purpose

A shared data acquisition, extraction, normalization, comparison and intelligence platform for Rosie Dazzlers, Devil n Dove and approved personal datasets.

The product is not intended to be a clone of any one commercial scraper. It borrows the useful workflow of AI-assisted browser extraction while adding persistent datasets, source evidence, historical change tracking, review queues and direct integration with our own applications.

## Primary users

Initial users are the owners/operators of Rosevear Creations projects. Multi-user support may be added later, but workspace isolation is required from the first database schema.

## Initial workspaces

### Rosie Dazzlers

Primary use cases:

- discover and review public Ontario auto-detailing websites;
- extract service names, package contents, prices, vehicle-size rules, add-ons, service areas, mobile/fixed-location status, public policies and promotions;
- normalize similar services for comparison;
- retain historical price and service changes;
- retain page-level source evidence;
- support SEO and public-website comparison without copying competitors' protected written content.

### Devil n Dove

Primary use cases:

- extract supplier product data;
- track current and historical pricing;
- extract package quantity, stock unit, usage unit, SKU, image and source URL;
- calculate normalized cost per stock or usage unit;
- enrich internal inventory records only after review/approval.

### Personal movie library

Primary use cases:

- enrich an existing movie collection from permitted APIs/datasets;
- match by title, year, UPC and external IDs;
- preserve ownership-specific fields such as format, shelf location, condition and personal notes;
- require review for ambiguous matches.

## Product capabilities

The platform will provide:

1. Chrome MV3 side-panel extension.
2. Visual page inspection and element picking.
3. Repeating-record detection.
4. AI-assisted field suggestion and semantic interpretation.
5. Deterministic extraction recipes.
6. Pagination, infinite-scroll and detail-page support.
7. Spreadsheet-style preview and review.
8. CSV, XLSX and JSON export.
9. Saved scraper recipes and site templates.
10. Source provenance and retrieval timestamps.
11. Historical change detection.
12. Confidence scoring and review queues.
13. Workspace-specific integrations.

## Product rules

- Prefer an official API or downloadable dataset when available and suitable.
- Scraping must respect applicable law, access controls, site terms and robots/crawl directives where relevant.
- Never bypass authentication, paywalls, CAPTCHAs or technical access controls.
- Never collect personal customer information for competitive intelligence.
- Public business facts may be collected only for legitimate internal research and comparison.
- Every material external fact stored by the platform should retain its source URL and retrieval time.
- Scraped or AI-derived data never writes directly into Rosie Dazzlers or Devil n Dove production records without an explicit approval rule.
- User-owned/internal fields always take precedence over external enrichment data unless the user explicitly approves replacement.

## Build 000 acceptance

Build 000 is complete when the repository contains a coherent source of truth covering product scope, architecture, data model, AI use, scraping rules, security, roadmap, build log and architectural decisions.
