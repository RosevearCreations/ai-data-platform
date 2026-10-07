# Scraping Policy

## Purpose

This policy governs collection of public or user-authorized data by the AI Data Platform.

## Source preference order

1. official API;
2. official downloadable dataset/feed;
3. user-provided export/file;
4. public webpage extraction where permitted and appropriate.

## Allowed use

Examples include:

- public business service/pricing research;
- supplier product and pricing information;
- public website structure and SEO evidence;
- permitted movie metadata sources;
- the user's own authenticated data where explicit authorization and supported integration methods exist.

## Prohibited behavior

The platform must not:

- bypass authentication, paywalls, CAPTCHAs or access controls;
- evade bans or technical restrictions;
- impersonate users or create deceptive accounts;
- collect private customer/account data without authorization;
- scrape personal profiles for targeting;
- ignore a known contractual or legal restriction merely because the page is technically accessible;
- overwhelm a site with excessive automated requests;
- copy substantial protected editorial content when structured factual extraction will serve the purpose.

## Site rules

Before a reusable or scheduled scraper is activated, the source should be reviewed for:

- terms of service;
- robots/crawl directives where applicable;
- available API/data alternatives;
- authentication requirements;
- reasonable request frequency;
- data sensitivity.

The platform should retain a source-policy note for recurring scrapers.

## Rate limiting

Scrapers must use conservative concurrency and delay defaults. Scheduled runs should avoid re-fetching unchanged pages unnecessarily.

## Competitive intelligence

For Rosie Dazzlers, collection should focus on legitimate public business facts such as:

- services;
- public prices;
- package inclusions;
- service areas;
- public policies;
- promotions;
- public business contact information;
- observable website/SEO structure.

Do not collect competitor customer identities, reviews for republishing, private employee information or hidden account data.

## Supplier intelligence

For Devil n Dove, store factual product information and source links. Images/content may have separate rights; storing a source image URL is different from obtaining redistribution rights.

## Movie data

Prefer licensed/permitted APIs and datasets. Do not build site-specific scrapers where the source explicitly prohibits scraping and provides a permitted alternative.

## Source attribution

Every stored external observation should include:

- source URL or dataset identifier;
- retrieval timestamp;
- run identifier;
- enough evidence to trace why the normalized value exists.

## Change monitoring

Monitoring must compare newly observed public facts with prior observations. A change alert is evidence of a difference, not proof of intent or motive.

## Review

New source classes and high-volume recurring jobs require a policy review before activation.


## Build 025 registry enforcement

Reusable and scheduled sources must now have a workspace-scoped Source Policy Registry entry before activation.

The registry records the source origin, collection method, factual purpose, authorization state, terms/policy review, robots/crawl decision where applicable, access-control boundary, sensitivity, conservative delay/page/record budgets, review expiry, status and review notes/evidence.

For public webpage extraction, a robots/crawl decision of unknown or disallowed is not runnable. Restricted/private data is not an approved crawler sensitivity. Login, paywall, CAPTCHA, ban or other technical access-control bypass remains prohibited regardless of registry status.

Approval is revisioned. A material edit, block or expiry invalidates scheduled jobs pinned to the prior policy fingerprint and requires explicit re-review. Future remote execution must copy and enforce the exact approved registry policy rather than inventing or loosening its own source rules.
