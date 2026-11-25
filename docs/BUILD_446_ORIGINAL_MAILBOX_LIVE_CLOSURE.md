# AI Data Platform Build 446 — Original mailbox verification and live recovery closure

## Verified starting point
The original owner record and credential account were still present at the Build 446 baseline. The production recovery ledger had no accepted reset requests or completed resets. Production contained both `RESEND_API_KEY` and `AUTH_RECOVERY_FROM_EMAIL`; this proves configuration presence, **not** accepted transport or an accessible mailbox.

The existing account login is the registered original Gmail address (previously displayed only as `jf***@gmail.com`). The configured Resend sender can be `ree@devilndove.com`, which is a **different role** from the account's login identity.

## Precisely how to complete owner recovery
1. In our browser, open `https://ai-data-platform-johns-projects-8f256ece.vercel.app/forgot-password`.
2. Enter the **full existing Gmail login** belonging to the original Rosevear owner account, not the Resend sender. Never share the full email, passwords, reset links, tokens or cookies in chat.
3. Check that Gmail Inbox, Promotions and Spam. In Resend → Emails, independently verify the message was accepted and subsequently delivered. The site stores only the Resend provider message ID and status, not the email or reset link.
4. Open the reset email's one-time link within **15 minutes**, set a fresh password of at least **12 characters** and complete the reset.
5. Open `/sign-in`, sign in with that same original Gmail address and the new password, and verify our account reaches the owner workspace. Resetting the password revokes prior sessions.
6. Once signed in as the original owner, open `https://ai-data-platform-johns-projects-8f256ece.vercel.app/owner-recovery-closure`.
7. If it shows **HOLD UNVERIFIED ORIGINAL EMAIL**, select **Send original-mailbox verification link** once. That authenticated, same-origin, owner-only action is limited to one request every 30 minutes. Check the original Gmail mailbox and click the Better Auth verification link. Do not confuse Resend's delivered status with the actual Better Auth email-verified flag.
8. Return to `/owner-recovery-closure` after verifying. A complete acceptance requires: original owner role and credential; Better Auth emailVerified=true resulting from the genuine verification link; a real Resend-delivered reset message; a password reset after its accepted provider receipt; and a **new authenticated owner session created after the reset**.
9. Open `/owner-account-inventory` to see the protected recovery receipt history, or `/api/owner-recovery-closure` for an owner-only non-secret JSON readback. All displays mask the account email.
10. If any step is HOLD, do not label owner recovery accepted. Check Resend provider delivery evidence and whether the original mailbox is accessible.

## Security and independent scope
- Build 446 does not create users, reset a password, or change `auth.user.email` unattended. It never sends mail until a person initiates the existing reset or authenticated verification request.
- A password reset proves redemption of a time-limited Better Auth reset token, but is not identical to a verified-email flag or a newly authenticated owner session.
- Provider acceptance is not delivery; Resend's `delivered` event is not proof of mailbox ownership. Verification requires a genuine Better Auth verification link.
- No physical witness is self-certified. The seven-application field certification remains a distinct HOLD until genuine independent device/source evidence and operator acceptance exist.
- If we cannot access the registered original Gmail mailbox, stop and use a separately verified administrative identity-recovery transaction. Do not guess credentials or substitute `ree@devilndove.com` as the login.
