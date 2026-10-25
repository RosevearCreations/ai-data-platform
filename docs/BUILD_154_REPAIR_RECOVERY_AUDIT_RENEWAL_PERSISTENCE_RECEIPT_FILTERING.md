# Build 154 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Persistence & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Filtering

## Objective

Extend Build 153 by retaining a bounded audit trail whenever the persisted repair-preset recovery audit search preset is recovered, persisting the selected renewal preset-recovery audit search preset, and adding age filtering to the receipt preset-repair search-preset recovery audit.

## Functional scope

- create a dedicated browser-local repair-preset recovery audit search preset recovery audit;
- record requested preset, recovered preset, reason and time whenever an unsupported repair preset is recovered;
- retain at most ten newest repair search-preset recovery events;
- export and clear that repair recovery audit independently;
- keep repair search-preset recovery audit visible independently from the parent repair-preset recovery ledger;
- persist the selected renewal preset-recovery audit search preset ID;
- restore the known renewal preset on application load;
- persist only known sanitized renewal preset IDs;
- changing renewal recovery age or search manually clears the persisted preset and enters temporary custom mode;
- clearing the renewal preset-recovery audit clears the persisted preset;
- full local reset clears the renewal preset storage key;
- add All, Last 24 hours and Last 7 days filtering to receipt preset-repair search-preset recovery audit evidence;
- preserve complete receipt search-preset recovery evidence while filtering the visible ledger;
- reset receipt search-preset recovery filtering when that ledger is cleared;
- keep full export based on the complete retained receipt recovery ledger;
- include new repair audit and renewal persistence keys in full local reset coverage;
- add contextual help and responsive/forced-colors-safe styling.

## Recovery audit recovery search preset recovery audit search preset recovery audit

Build 153 made the persisted repair-preset recovery audit search preset recovery-aware.

Build 154 records those automatic repairs in a dedicated bounded browser-local audit ledger.

Each entry contains:

- audit ID;
- recovery timestamp;
- requested unsupported preset ID;
- recovered safe preset ID;
- recovery reason.

The ledger is newest-first, deduplicated by audit ID, capped at ten entries, exportable, independently clearable, and remains available even when the parent repair-preset recovery evidence list is empty.

## Renewal recovery audit search preset recovery audit search preset persistence

Build 153 added deterministic search presets to the renewal preset-recovery audit.

Build 154 persists only the selected known preset ID in a dedicated browser-local namespace.

Persistence rules:

- known preset IDs are restored on application load;
- unsupported stored values sanitize to All preset recoveries;
- manual age or search changes clear the persisted preset;
- arbitrary manual search text is never persisted;
- clearing the renewal preset-recovery audit clears the persisted preset;
- full local reset removes the preset key.

## Receipt recovery audit search preset recovery audit search preset recovery audit filtering

Build 153 created a dedicated bounded audit ledger for receipt preset-repair search-preset recoveries.

Build 154 adds age filtering:

- **All search preset recoveries**;
- **Last 24 hours**;
- **Last 7 days**.

Filtering preserves event order, timestamps, reasons, retention and complete export.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side synchronization;
- no server-side recovery audit, preset persistence or recovery-audit filtering;
- no account/workspace synchronization;
- no arbitrary manual search persistence;
- no business-data import/export;
- no role, permission or connector-grant changes;
- no automatic workflow transition.

All Build 154 changes are browser-local bounded recovery evidence, preset persistence or filtering. Destination workflows retain existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 154 verifier requires:

- repair search-preset recovery audit construction and newest-first retention;
- startup recording, export and clear wiring for repair search-preset recovery evidence;
- independent repair recovery-audit visibility;
- dedicated renewal preset storage namespace and sanitizer behavior;
- renewal preset restore/apply/clear persistence wiring;
- manual renewal age/search changes clearing persisted preset mode;
- receipt search-preset recovery audit all/24h/7d filtering;
- receipt recovery filter reset on ledger clear;
- full export remaining independent from the selected receipt age filter;
- full local reset coverage for the new repair audit and renewal preset keys;
- help coverage;
- responsive and forced-colors-compatible styling;
- Build 153 verifier forward compatibility;
- Build 154 registration in the application test chain.

## Next roadmap item

**Build 155 — Recovery Audit Recovery Search Preset Recovery Audit Search Preset Recovery Audit Filtering, Renewal Recovery Audit Search Preset Recovery Audit Search Preset Recovery & Receipt Recovery Audit Search Preset Recovery Audit Search Preset Recovery Audit Search.**
