# QL-256 AI Data Platform — Variables, secrets and bindings

## Existing Vercel project variables observed
- `AUTH_ALLOW_SIGN_UP`: production plain value `false`; preview also exists as a sensitive variable.
- `NEXT_PUBLIC_AUTH_SIGN_UP_ENABLED`: production plain value `false`; preview also exists as a sensitive variable.
- `DATABASE_URL`: sensitive; value intentionally not disclosed.
- `BETTER_AUTH_SECRET`: sensitive; value intentionally not disclosed.
- `BETTER_AUTH_URL`: sensitive; value intentionally not disclosed.
- `BETTER_AUTH_TRUSTED_ORIGINS`: sensitive; value intentionally not disclosed.
- `BROWSERLESS_API_TOKEN`: sensitive; value intentionally not disclosed.
- `REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED`: sensitive; value intentionally not disclosed.
- `REMOTE_EXECUTION_KILL_SWITCH`: sensitive; value intentionally not disclosed.
- `AI_SUGGESTION_MODEL`: sensitive; value intentionally not disclosed.
- Vercel project connector bindings: none currently connected.

## QL-256 nonproduction Preview variables provisioned
- `QL256_SIGNER_PRIVATE_KEY_PEM`: **sensitive**, present, value never returned or committed.
- `QL256_SIGNER_PUBLIC_KEY_PEM`: public Ed25519 key, present.
- `QL256_SIGNER_SPKI_SHA256`: `d16f21ab82c12760c88b1cdaa7d2fe7491148e9efd4a8762c4a0e9be137311c6`.
- `QL256_SIGNER_KEY_ID`: `ql256-ai-data-platform-d16f21ab82c12760`.
- `QL256_SIGNER_STATUS`: `SIGNER_EXISTS_CUSTODY_NOT_VERIFIED`.
- `QL256_SOURCE_A_SHA`: `76f73363a9a29a34ed8bf09b6b4ff58a0dc77482`.
- `QL256_SOURCE_A_CI_RUN_URL`: `https://github.com/RosevearCreations/ai-data-platform/actions/runs/40806025614`.
- `QL256_INTEGRATION_ENVIRONMENT`: `nonproduction`.
- `QL256_BUSINESS_ID`: `devilndove`.
- `QL256_ALLOWED_METHODS`: `GET`.
- `QL256_ALLOWED_PATHS`: `/api/integration/v1/health,/api/integration/v1/capabilities`.
- `QL256_OWNER_TEST_AUTHORIZATION`: `NOT_GIVEN`.
- `QL256_CONNECTION_STATE`: `DISCONNECTED`.

These QL-256 variables are Preview-only. They do not authorize a gateway call or production connection.

## Binding recommendation
No new direct database or companion-app binding is appropriate for QL-256. AI Data Platform remains a consumer/reviewer. Future private relay credentials should be separate per app and provisioned only after independent custody and owner TEST-only authorization.
