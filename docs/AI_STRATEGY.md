# AI Strategy

## Objective

Use AI where semantic interpretation creates value while keeping bulk extraction deterministic, testable and affordable.

## AI responsibilities

AI may:

- interpret page structure and field meaning;
- suggest useful columns;
- convert a natural-language extraction request into a draft schema;
- help identify likely repeating records;
- normalize ambiguous text;
- classify services/products;
- propose record matches;
- summarize change evidence;
- repair a broken recipe by comparing old intent with current DOM evidence.

## Non-AI responsibilities

Ordinary code should:

- execute CSS/XPath/DOM extraction rules;
- extract repeated rows;
- calculate arithmetic values;
- normalize well-defined currency/number/unit formats;
- paginate using known controls;
- store and query data;
- compare hashes and exact values;
- export CSV/XLSX/JSON;
- enforce workspace authorization.

## Provider abstraction

Business logic must not depend directly on a single AI vendor. The `packages/ai` layer will expose internal tasks such as:

- suggestSchema
- interpretField
- normalizeRecord
- proposeMatch
- repairRecipe

Provider/model selection is configuration.

## Cost controls

- never call AI per row when one schema-level call can define deterministic extraction;
- cache stable interpretation results where appropriate;
- batch semantically similar transformations;
- record token/cost metadata when available;
- establish per-run and per-workspace limits before scheduled cloud automation;
- prefer deterministic fallbacks for common data types.

## Confidence

AI output that can alter stored business data must include or be wrapped in a confidence/review process.

Initial policy:

- exact identifiers and deterministic matches may qualify for automatic approval rules;
- ambiguous semantic matches go to review;
- low-confidence matches are not written to canonical records.

Numeric thresholds will be calibrated from real acceptance tests rather than assumed permanently in Build 000.

## Evidence first

AI must not be treated as the source. The source is the webpage/API/file evidence. AI-derived conclusions should point back to evidence records.

## Prompt safety

Page content is untrusted input. Instructions embedded in a scraped page must not override application policy, system prompts, secrets handling or integration permissions.

## Model changes

Model/provider changes require regression testing against saved extraction fixtures before production promotion.
