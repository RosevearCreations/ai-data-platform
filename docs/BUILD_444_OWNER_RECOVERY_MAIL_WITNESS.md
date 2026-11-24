# AI Data Platform Build 444 — Owner Recovery & Independent Field Acceptance

## What is implemented
- Read-only public recovery status at `/owner-recovery-ceremony` with no account identity exposure.
- Authenticated `/api/owner-recovery-ceremony` requires an actual Better Auth session and the database `owner` sysop role. Authentication by username is **not** supported.
- Fail-closed readiness checks keep mail configuration, successful email delivery, owner identity proof, original witness key custody, and genuine field acceptance distinct.
- The independent field-witness enrollment route from Builds 442/443 continues to require an approved Ed25519 key/device/app binding and replay protection. Synthetic witnesses do not satisfy production acceptance.

## Required steps to activate password-recovery email delivery
1. Sign in to the Vercel owner account at https://vercel.com, not the AI Data Platform account.
2. Open **johns-projects-8f256ece → ai-data-platform → Settings → Environment Variables**.
3. Sign in to https://resend.com. Add and verify a domain we control. Complete required DNS records with the domain's DNS provider and wait until Resend reports the domain verified.
4. Create a **sending** API key at Resend → API Keys. Store it **only** in Vercel as the sensitive Production variable `RESEND_API_KEY`. Never paste it in chat, GitHub, screenshots, or the browser developer console.
5. In the same Vercel project add Production `AUTH_RECOVERY_FROM_EMAIL` equal to a valid sender address at that verified domain, e.g. `recovery@<our-verified-domain>`.
6. Open Vercel Deployments; redeploy the latest successful `main` production deployment to apply variables. Verify state READY.
7. Open `/owner-recovery-ceremony` to confirm it reports **CONFIGURED NOT DELIVERY VERIFIED**. This means configuration is present, not that delivery succeeded.
8. If the existing account email is known and mailbox accessible, open `/forgot-password`, enter **that original email**, check the inbox and junk folder for a reset email, and follow the tokenized link within 15 minutes. Complete password reset and sign in. Avoid repeatedly guessing passwords.
9. Open authenticated `/api/owner-recovery-ceremony` to check current session + owner role. Record separate delivery and owner acceptance evidence without sharing secrets.

## If we have no account email or cannot access the registered mailbox
Do not change `AUTH_ALLOW_SIGN_UP` or create a new unrelated owner account. An authorized database administrator must verify original account ownership using out-of-band evidence, inspect the matching `auth.user`, `auth.account`, and existing sysop role mapping, and apply a logged, reviewed account-recovery transaction. No database account mutation or unverified password reset is performed by this release. A generic 403 response alone is not proof of account ownership.

## Independently enrolling witnesses
1. Verify the original device, its signer key custody, observer independence, and owner authorization outside the app.
2. Add only the verified **public** Ed25519 key to `BUILD442_INDEPENDENT_WITNESS_PUBLIC_KEYS_JSON` (Production) and its approved key/app/device/witness policy to `BUILD443_INDEPENDENT_WITNESS_BINDINGS_JSON` (Production); keep private keys exclusively on the trusted original device.
3. Redeploy. Supervise a source-bound witness envelope and genuine receiver ACK. The API verifies signature, timestamp, nonce, device/app binding and replay.
4. Independently inspect the authenticated field-witness dashboard; a missing/expired/ambiguous attestation is a HOLD, not certification. Seven-application closure requires seven genuine accepted witnesses and interface/owner approval.

**Deployment GREEN means code deployed successfully, not that a live mailbox, owner credential or physical field witness has been verified.**
