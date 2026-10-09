# Build 029 — Plugin & Connector SDK Foundation + Contextual Help

## Delivered

- @rosevear/ai-data-connector-sdk v0.29.0;
- v1 manifest and compatibility model;
- import, enrichment and approved-export capabilities;
- bounded typed connector configuration;
- exact environment-variable secret references;
- workspace capability grants;
- statically registered server connector registry;
- capability-limited bounded execution boundary;
- no-secret example connector;
- connector configure/enable/disable/test UI and API;
- append-only connector execution audit;
- migration 0010_connector_sdk_foundation.sql;
- RLS/owner-admin acceptance tests;
- starter template and credentialed-connector procedure;
- circled ⓘ help on every major current website section;
- /help consolidated help center;
- CI help coverage and manual-intervention verification.

## No manual intervention for Build 029

The shipped example connector is intentionally no-secret and requires no account, API token, application registration or environment variable.

## Browserless side dependency

Browserless remains a Build 027 dependency only. While provider authentication is looping, the remote execution pilot stays fail-closed. When Browserless login works, the Remote Execution ⓘ help provides the exact ordered setup:

1. Obtain the Browserless API token.
2. Store it in the production host encrypted secret named BROWSERLESS_API_TOKEN.
3. Set REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED=true.
4. Keep REMOTE_EXECUTION_KILL_SWITCH=true while workspace/source gates are prepared.
5. Allowlist the exact approved Source Policy source.
6. Set REMOTE_EXECUTION_KILL_SWITCH=false only for the controlled pilot.
7. Review evidence and restore the kill switch if continued live testing is not deliberately approved.

Do not place the Browserless token in ChatGPT, GitHub or client-visible configuration.
