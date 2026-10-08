# Build 027 — Controlled Remote Browser Pilot & Egress Policy

## Provider decision

Browserless Cloud is selected for the first provider-specific pilot.

Current review factors:

- REST /content runs a fully rendered real browser and needs no local browser SDK;
- free entry plan exists for controlled testing;
- regional endpoints include US East/West and Europe;
- billing uses provider units based on browser time;
- proxy, stealth and CAPTCHA capabilities are optional and are deliberately excluded here.

## Pilot envelope

- provider: Browserless;
- region default: US East;
- egress: direct only;
- concurrency: 1;
- pages: 1;
- runtime: <=60 seconds;
- provider units: <=2;
- source: HTTPS, Build 025 approved public-webpage/public-facts, robots allowed;
- no proxy, stealth, CAPTCHA solving, authenticated profile or access-control bypass.

## Kill hierarchy

1. REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED must be true.
2. REMOTE_EXECUTION_KILL_SWITCH must be explicitly false.
3. Workspace remote control must be enabled with kill_switch false.

Any failed gate blocks new runs. Workspace/global kill changes abort an in-flight provider request through the pilot route polling controller.

## Secrets

BROWSERLESS_API_TOKEN is a server-only hosting secret. It is never written to PostgreSQL or returned by the API. Browserless Cloud REST authentication requires the token at request time; the adapter constructs that URL in memory and never logs it.

## Evidence

Only bounded metadata is persisted: provider region, direct egress, estimated units, duration, target response code, final URL, rendered byte count, title and SHA-256 hash. Raw rendered HTML is discarded.

## Acceptance

CI proves the provider adapter with an injected Browserless response; PostgreSQL acceptance proves exact policy allowlisting, admin mutation gates, RLS, one-slot concurrency, kill switch and append-only telemetry. The real production provider call remains intentionally fail-closed until the encrypted token and execution flags are configured.
