# Build 443 — original owner access and independent witness custody

## Diagnostic facts
The deployed Better Auth system accepts email/password credentials, not the display name or Windows username. A 403 POST /api/auth/sign-in/email can result from rejected origin, credential/account policy, or request protections; it does not establish which one. Browser "message channel closed" errors may come from extensions and are separate.

### Our step-by-step recovery check
1. In a standard Chrome or Firefox window without privacy extensions, open https://ai-data-platform-johns-projects-8f256ece.vercel.app/account-access.
2. Verify that the diagnostic says the email sender is configured before requesting a reset. Open https://ai-data-platform-johns-projects-8f256ece.vercel.app/api/auth-diagnostics for privacy-safe flags. A GET may show loginOriginAllowed=null because a navigation normally has no Origin header.
3. Navigate to /sign-in on exactly that domain. Enter the original account email, not the username. Avoid repeated password guesses.
4. If the sign-in POST still returns 403, open browser Developer Tools (F12) → Network → the sign-in/email request → Response. Capture the error *code* and HTTP status, but redact email, passwords, cookies, authorization headers and tokens. The error code helps distinguish invalid origin from invalid credentials. Do not send full request payloads.
5. If the account email is known and that mailbox is accessible, add production Resend credentials before attempting the /forgot-password flow: Vercel → ai-data-platform → Settings → Environment Variables → add RESEND_API_KEY (sensitive) and AUTH_RECOVERY_FROM_EMAIL (verified sender). Redeploy main. Then request the reset and follow the 15-minute link.
6. If the original account email is unknown or cannot be accessed, do not create a replacement owner blindly. The authorized database administrator must verify original ownership and inspect the auth.user and app sysop role records, then carry out an audited change to a controlled email. Never paste private database credentials or passwords in chat.

## Witness key enrollment
Original signer enrollment requires both BUILD442_INDEPENDENT_WITNESS_PUBLIC_KEYS_JSON and BUILD443_INDEPENDENT_WITNESS_BINDINGS_JSON in Production settings. The second JSON maps a pinned keyId to a reviewed {appIds,originalDeviceId,witnessId,witnessRole,independentOfSource:true,active:true} record. A signed envelope with an unknown key/device/app binding fails before database writes. Configure only independently verified original-device signers and protect the private key outside the application.

Software deployment can be GREEN while owner login recovery and seven-application field acceptance remain HOLD. Do not assert independent field witness attendance solely from self-signed metadata or synthetic test fixtures.
