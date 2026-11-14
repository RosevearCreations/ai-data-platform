# AI Data Platform — Variables, Secrets and Environment Setup

**Audited:** 14 November 2026  
**Repository:** `RosevearCreations/ai-data-platform`  
**Runtime platform:** Vercel  
**Database:** Neon Postgres

> Never paste live passwords, tokens, private keys, connection strings, or secret values into GitHub, Markdown, chat, screenshots, issue comments, or browser fields. This guide intentionally contains names and instructions only.

## 1. Clean placement map

| System | What belongs there for AI Data Platform | Current requirement |
| --- | --- | --- |
| **Vercel → ai-data-platform → Settings → Environment Variables** | Runtime variables and runtime secrets | **Yes** |
| **Neon** | Source of the Postgres connection string used for `DATABASE_URL` | **Yes** |
| **GitHub → Actions secrets/variables** | Nothing custom in the current `.github/workflows/verify.yml` | **None currently** |
| **Cloudflare** | No core AI Data Platform runtime variable or secret | **None currently** |
| **Browserless** | Source of a Browserless API token if the controlled remote-browser pilot is used | Optional |
| **Vercel AI Gateway** | Source of `AI_GATEWAY_API_KEY` if AI-assisted field suggestions are enabled | Optional |

Do **not** copy Supabase, R2/D1, Stripe, PayPal, Meta, TikTok, Etsy, Cloudflare API tokens or other Rosie Dazzlers / Devil n Dove application credentials into AI Data Platform merely because they appear in old combined notes.

## 2. Required baseline variables

### `DATABASE_URL`
- **Type:** Secret.
- **Where stored:** Vercel, Production and Preview.
- **Where obtained:** Neon.
- **Purpose:** Runtime Postgres access and the committed production migration runner.
- **Recommended value:** Neon pooled Postgres connection string for the intended AI Data Platform database.
- **Current audit:** Configured in Vercel.

**Obtain it**
1. Sign in to Neon.
2. Open the AI Data Platform Neon project.
3. Open **Connect / Connection Details**.
4. Select the intended branch, database and database role.
5. Enable the **pooled connection** option when offered. A pooled Neon hostname contains `-pooler`.
6. Copy the connection string directly into Vercel as `DATABASE_URL`.
7. Do not save the string in a text note or GitHub.

**Put it in Vercel**
1. Vercel → project **ai-data-platform**.
2. **Settings → Environment Variables**.
3. Add/edit `DATABASE_URL`.
4. Choose **Secret**.
5. Select **Production** and **Preview** as required.
6. Save, then redeploy the affected environment.
7. Verify `/api/readiness/runtime` and the normal production migration gate.

### `BETTER_AUTH_SECRET`
- **Type:** Secret.
- **Where stored:** Vercel, Production and Preview.
- **Where obtained:** Generate locally; it is not supplied by GitHub, Cloudflare or Neon.
- **Purpose:** Better Auth cryptographic secret.
- **Requirement:** At least 32 high-entropy characters.
- **Current audit:** Configured in Vercel.

**Generate it**
- Use a trusted local terminal or password manager to generate a cryptographically random secret. Better Auth documents `openssl rand -base64 32` as a suitable method.
- Put the generated value directly into Vercel. Do not paste it into chat or a document.

**Rotation warning:** A Better Auth secret found in an old plaintext note must be treated as exposed if it is still current. Plan rotation deliberately because changing an authentication secret can invalidate existing authentication/session material.

### `BETTER_AUTH_URL`
- **Type:** Configuration value; not intrinsically secret.
- **Where stored:** Vercel.
- **Purpose:** Canonical base URL used by Better Auth.
- **Production value:** The canonical HTTPS origin serving AI Data Platform.
- **Current audit:** Configured; currently stored with secret visibility. That is safe, although it can be simplified to Config in a controlled cleanup.

**Obtain it**
1. Vercel → **ai-data-platform → Settings → Domains**.
2. Identify the canonical production domain.
3. Enter the full HTTPS origin only, with no extra path, as `BETTER_AUTH_URL`.

### `BETTER_AUTH_TRUSTED_ORIGINS`
- **Type:** Configuration allowlist.
- **Where stored:** Vercel.
- **Purpose:** Exact browser origins Better Auth is allowed to trust.
- **Format:** Comma-separated exact origins.
- **Current audit:** Configured; stored as secret visibility, although the origin list itself is not a credential.

**Obtain it**
1. Start with the canonical AI Data Platform production HTTPS origin.
2. Add only genuinely required preview or host origins.
3. Do not use broad wildcards simply to make an error disappear.
4. Store the comma-separated allowlist in Vercel.

### `AUTH_ALLOW_SIGN_UP`
- **Type:** Boolean configuration.
- **Where stored:** Vercel.
- **Recommended Production value:** `false` after the initial owner account exists.
- **Current audit:** Production is configured `false`.

### `NEXT_PUBLIC_AUTH_SIGN_UP_ENABLED`
- **Type:** Public boolean configuration.
- **Where stored:** Vercel Config.
- **Recommended Production value:** `false`.
- **Important:** Anything beginning with `NEXT_PUBLIC_` is browser-visible by design and must never contain a secret.
- **Current audit:** Production is configured `false`.

Keep the two signup flags aligned so the server authority and the visible UI agree.

## 3. Optional feature-gated variables

### Browserless controlled pilot

#### `BROWSERLESS_API_TOKEN`
- **Type:** Secret.
- **Where stored:** Vercel.
- **Required only when:** The approved Browserless controlled remote-browser pilot is actually used.
- **Current audit:** Configured in Production and Preview.

**Obtain it**
1. Sign in to Browserless.
2. Open the Browserless account/API Keys page.
3. Create a newly named API key for AI Data Platform.
4. Copy it once directly into the Vercel Secret field.
5. After confirming the replacement works, revoke any older token that appeared in plaintext notes.

#### `REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED`
- **Type:** Boolean configuration, not a credential.
- **Recommended normal value:** `false`.
- Set `true` only for a specifically approved controlled pilot.

#### `REMOTE_EXECUTION_KILL_SWITCH`
- **Type:** Boolean configuration, not a credential.
- **Recommended normal value:** `true`.
- The code is fail-closed: unset also behaves as an active kill switch. Setting this to `false` removes the global safety block.

A live Browserless pilot requires all three conditions: provider execution enabled, kill switch disabled, and a valid Browserless token.

### Vercel AI Gateway suggestions

#### `AI_GATEWAY_API_KEY`
- **Type:** Secret.
- **Where stored:** Vercel.
- **Required only when:** AI-assisted field suggestions should call Vercel AI Gateway.
- **Current audit:** Not configured. The application therefore uses deterministic suggestions.

**Obtain it**
1. Open the Vercel dashboard.
2. Open **AI Gateway → API Keys**.
3. Choose **Create Key**.
4. Use a dedicated key for AI Data Platform and set an appropriate spend limit where available.
5. Copy the key directly into Vercel as the Secret `AI_GATEWAY_API_KEY`.

#### `AI_SUGGESTION_MODEL`
- **Type:** Configuration value.
- **Where stored:** Vercel.
- **Current audit:** Configured.
- It matters only when `AI_GATEWAY_API_KEY` is configured; otherwise the route uses its deterministic fallback.

### Direct delivery to Rosie Dazzlers or Devil n Dove

These are **not** generic Cloudflare tokens. Each receiving application must expose the documented receiver and issue a dedicated receiver credential.

- `INTEGRATION_CONSUMER_ROSIE_DAZZLERS_URL` — Config.
- `INTEGRATION_CONSUMER_ROSIE_DAZZLERS_TOKEN` — Secret.
- `INTEGRATION_CONSUMER_DEVIL_N_DOVE_URL` — Config.
- `INTEGRATION_CONSUMER_DEVIL_N_DOVE_TOKEN` — Secret.

Configure only the deliberately selected receiver when its endpoint exists. Run conformance, handshake and dry-run before any separately approved live mutation.

### Embeddable module configuration

- `AI_DATA_EMBED_ALLOWED_HOST_ORIGINS` — Config; exact allowed host origins for CSP/frame ancestors.
- `NEXT_PUBLIC_AI_DATA_MODULE_ORIGIN` — Public Config used by browser/Next.js host adapters.
- `AI_DATA_MODULE_ORIGIN` — Config used by server/desktop host contexts.

Only add these when an external host actually embeds the module. Never put secrets into a `NEXT_PUBLIC_` value.

### Build 379–381 protected public verification keys

Feature-specific public-key variables include:
- `BUILD379_PROTECTED_INGEST_PUBLIC_KEY_PEM`
- `BUILD380_EXTERNAL_ACTIVATION_PUBLIC_KEY_PEM`
- `BUILD380_AI_HUB_RUNTIME_PUBLIC_KEY_PEM`
- `BUILD380_COMMS_RUNTIME_PUBLIC_KEY_PEM`
- `BUILD380_CONTROLLER_RUNTIME_PUBLIC_KEY_PEM`
- `BUILD381_CONTINUITY_AUTHORITY_PUBLIC_KEY_PEM`
- `BUILD381_AI_HUB_RUNTIME_PUBLIC_KEY_PEM`
- `BUILD381_COMMS_RUNTIME_PUBLIC_KEY_PEM`
- `BUILD381_CONTROLLER_RUNTIME_PUBLIC_KEY_PEM`
- `BUILD381_RECEIVER_OFF_PUBLIC_KEY_PEM`
- `BUILD381_ROLLBACK_AUTHORITY_PUBLIC_KEY_PEM`

These are **public verification keys**, not private signing keys. Obtain them from the exact independent authority/custodian for that protected workflow. Do not manufacture replacement values just to satisfy configuration checks.

### Integration v1 nonproduction signer

The following are nonproduction/Preview-only when that integration profile is explicitly in use:
- `ROSEVEAR_INTEGRATION_V1_NONPROD_ENABLED`
- `ROSEVEAR_INTEGRATION_V1_ED25519_PRIVATE_KEY_PEM` — Secret/private key.
- `ROSEVEAR_INTEGRATION_V1_SIGNER_KEY_ID` — Config.
- `ROSEVEAR_INTEGRATION_V1_SOURCE_REVISION` — Config.

Do not copy the private key into Production merely because the code references the name.

## 4. Existing QL-256 Preview-only settings

The current Vercel project contains a QL-256 Preview-only proof set, including signer, key-id, source-revision/CI evidence, scope and connection-state variables.

**Rule:** keep QL-256 values in Preview/nonproduction unless a later independently authorized build explicitly promotes them. A configured Preview proof is not permission to copy its signer/private key into Production.

## 5. GitHub Actions — clean result

The current repository has one workflow, `.github/workflows/verify.yml`.

It does **not** reference GitHub repository `secrets.*` or `vars.*`, so the current AI Data Platform verification pipeline requires **no custom GitHub Actions secrets or repository variables**.

The workflow supplies its own isolated CI-local Postgres/auth test settings and GitHub automatically supplies variables such as:
- `GITHUB_BASE_REF`
- `GITHUB_EVENT_NAME`
- `GITHUB_SHA`
- `GITHUB_STEP_SUMMARY`

Do not duplicate Vercel, Neon or Browserless production credentials into GitHub “just in case.”

If a future workflow really needs a GitHub secret:
1. GitHub repository → **Settings**.
2. **Secrets and variables → Actions**.
3. Choose **Secrets → New repository secret** for credentials, or **Variables → New repository variable** for non-secret configuration.
4. Add only a variable actually referenced by reviewed workflow code.
5. Prefer a protected GitHub Environment for production-only credentials.

## 6. Cloudflare — clean result

AI Data Platform currently runs on Vercel and the current GitHub workflow does not require a Cloudflare API token.

Therefore:
- Do **not** put Devil n Dove Cloudflare API tokens into AI Data Platform.
- Do **not** put Rosie R2/D1/Supabase/Stripe/social variables into AI Data Platform.
- Do **not** create a Cloudflare token for AI Data Platform without a reviewed feature that actually uses Cloudflare.

If a future reviewed workflow needs Cloudflare:
1. Cloudflare Dashboard → user profile or account API Tokens.
2. Choose **Create Token**.
3. Grant only the minimum resource permissions and account scope.
4. Copy the token once into the actual consuming secret store.
5. Never reuse a token copied from another Rosevear application.

## 7. Platform-provided variables — never create manually

Vercel supplies:
- `VERCEL_ENV`
- `VERCEL_GIT_COMMIT_SHA`
- `NODE_ENV` / runtime environment context

GitHub Actions supplies:
- `GITHUB_BASE_REF`
- `GITHUB_EVENT_NAME`
- `GITHUB_SHA`
- `GITHUB_STEP_SUMMARY`

Do not create duplicate user-managed values with these names.

## 8. Credentials found in old mixed notes — rotate, do not copy

The reviewed mixed notes contain plaintext credential material associated with several applications. Values are deliberately omitted here.

Treat any still-live exposed credential as compromised:
1. **Neon database password / connection string:** rotate the role password or credential in Neon, replace `DATABASE_URL` in Vercel Production/Preview, redeploy and verify readiness/migrations, then invalidate the old credential.
2. **Better Auth secret:** if the exposed value is the current secret, plan a controlled auth-secret rotation and session impact; do not change it casually during an unrelated release.
3. **Browserless token:** issue a replacement, update the Vercel Secret, verify, then revoke the old token.
4. **Cloudflare tokens in Devil n Dove notes:** revoke/rotate in Cloudflare and update only the application/workflow that actually consumes them.
5. **AI Hub/JWT-style credentials:** rotate at their issuing application. They do not belong in AI Data Platform Vercel settings.

After rotation, delete plaintext credential notes from any storage location where they are no longer required. Do not use this guide as a credential vault.

## 9. Recommended final AI Data Platform configuration

### Keep in Vercel now
Required:
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_TRUSTED_ORIGINS`
- `AUTH_ALLOW_SIGN_UP=false`
- `NEXT_PUBLIC_AUTH_SIGN_UP_ENABLED=false`

Safety/feature controls:
- `REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED=false`
- `REMOTE_EXECUTION_KILL_SWITCH=true`
- `BROWSERLESS_API_TOKEN` only if we retain the Browserless pilot capability
- `AI_SUGGESTION_MODEL` only as a model override
- `AI_GATEWAY_API_KEY` only if we deliberately enable AI Gateway suggestions

### Keep out unless a feature explicitly requires them
- Consumer receiver URLs/tokens
- Embed host origins/module origins
- Build 379–381 public verification keys
- Integration-v1 nonproduction signer values
- QL-256 Preview proof values from Production

### Do not add
- Rosie Dazzlers Supabase/R2/payment/social variables
- Devil n Dove D1/R2/payment/social/Cloudflare variables
- Cloudflare API tokens
- Unreferenced GitHub Actions secrets

## 10. Verification after any change

1. Save the change in the correct Vercel environment.
2. Redeploy the exact reviewed commit.
3. Confirm Vercel deployment = **READY**.
4. Confirm `/api/readiness/runtime` returns healthy database/auth configuration without revealing secret values.
5. Run the repository Verify workflow when the change is coupled to source.
6. Check production error/fatal runtime logs.
7. Confirm the Master Suite still returns HTTP 200.
8. Never validate a secret by printing it into logs.
