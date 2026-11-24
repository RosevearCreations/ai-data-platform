# Build 442 — field witness and account recovery owner instructions

## Account login
The current Better Auth configuration uses an **email address and password**. A display name or Windows username is not an email credential. Account creation is controlled by `AUTH_ALLOW_SIGN_UP`; do not enable public sign-up to recover an unknown owner account.

## Configure password recovery delivery (Vercel production)
1. Sign into Vercel using the Vercel owner account (not the AI Data Platform account).
2. Open the project **ai-data-platform** → **Settings** → **Environment Variables**.
3. In Resend (https://resend.com), verify a sender domain that we control and create an API key authorized only to send mail from that domain.
4. Add `RESEND_API_KEY` as a Sensitive environment variable targeted to **Production**, using the key directly in Vercel. Never put it in GitHub or a chat.
5. Add `AUTH_RECOVERY_FROM_EMAIL` targeting **Production**, e.g., a valid address on the verified sending domain.
6. Redeploy the latest main commit in Vercel (Deployments → current production → Redeploy).
7. Open `/forgot-password`, enter the email address that **actually belongs to the existing AI Data Platform account**, and request a reset.
8. Check that mailbox and spam folder. Follow the time-limited reset link, set a new password (12+ characters), then return to `/sign-in`.

If the original account email is unknown or inaccessible, the email reset path cannot prove ownership. Perform an identity-verified owner-account recovery using audited database administration rather than guessing or silently changing the email. Do not paste passwords, tokens or private keys in chat.

## Independent witness enrollment
`BUILD442_INDEPENDENT_WITNESS_PUBLIC_KEYS_JSON` must hold an approved mapping of independently enrolled witness key IDs to PEM public keys, bound to independent verifier custody. Until configured, `POST /api/witness-intake` returns HTTP 503. Verifiers must sign the exact JSON payload (excluding `signature`) using Ed25519; submit the Base64 signature with a fresh nonce and source commit. A signed claim is not by itself proof of field attendance. Keep the verifier identity, original-device evidence, receiver ACK and owner acceptance independent and auditable.

No original-device signer has been enrolled by this code change. The seven-app operational certification must remain HOLD until genuine evidence is admitted and independently checked.
