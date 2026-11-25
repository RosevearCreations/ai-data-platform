# AI Data Platform Build 445 — Original owner account inventory, verified reset and mail evidence

## Confirmed production inventory at implementation
One Better Auth user exists with display name Rosevear, registered Gmail address masked as `jf***@gmail.com`, active owner sysop role and a credential account. The registered email was not `ree@devilndove.com`; that address may legitimately be the Resend sender and does not become the login identity automatically. Email verification was false when inspected. No original user record or password has been changed.

## Production system behavior
- The authenticated original owner can review a masked inventory and the audit of recovery events at `/owner-account-inventory`.
- Password reset requests still use Better Auth's time-limited token. Resetting a password revokes previous sessions and records a `RESET_COMPLETED` receipt.
- When Resend accepts a reset email, the provider message ID is stored in a protected append-only audit table (never the reset link, token, password or full email).
- An authenticated owner inventory readback calls Resend's official sent-email retrieval endpoint for that ID to classify `last_event`. Even Resend's `delivered` event is **not** proof the owner opened or controls the mailbox.
- No unattended owner email migration, guessed password, account replacement or independent field certification is performed.

## We can complete the genuine recovery now
1. Open the original owner's Gmail account whose address starts `jf`. If we no longer have access or cannot recognize the account, **do not request a reset**; use a separately verified owner identity recovery ceremony before any admin changes.
2. Confirm Vercel **ai-data-platform → Settings → Environment Variables → Production** has `RESEND_API_KEY` and `AUTH_RECOVERY_FROM_EMAIL` (for example `ree@devilndove.com` if the `devilndove.com` domain is verified in Resend).
3. Confirm the latest `main` Vercel deployment reports READY. If the sender variables were changed after the latest deployment, redeploy that deployment to apply them.
4. Open `https://ai-data-platform-johns-projects-8f256ece.vercel.app/forgot-password` and enter the **existing account's Gmail address**, not the Resend sender. Avoid repeated requests.
5. Check the original Gmail inbox and junk folder. In Resend → Emails inspect the corresponding message status; `sent` means accepted, `delivered` is provider transport success.
6. Open the reset link within **15 minutes**, set a new password of at least 12 characters, and sign in using the original Gmail email. Never paste the password or reset link into chat.
7. Visit `/owner-account-inventory` while signed in. Confirm the original owner role, a `PROVIDER_ACCEPTED` receipt, provider delivery status, `RESET_COMPLETED` receipt and signed-in owner state. This is the final recovery transaction acceptance.
8. Original-device field certification still requires seven genuine independent signed device/source receipts, as shown in `/field-witness-certification`. Do not mark it complete based only on software tests.

## If the Gmail account cannot be accessed
Stop. Do not change `auth.user.email` or `auth.account.password` in Neon using this build. An administrative email migration requires a separately verified identity and explicit authorization, an auditable transaction plan, and tested rollback. The current build deliberately preserves the original account and does not bypass the credential system.
