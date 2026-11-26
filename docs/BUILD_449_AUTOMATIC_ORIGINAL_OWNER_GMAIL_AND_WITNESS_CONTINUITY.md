# AI Data Platform Build 449 — Original Gmail recovery closure and automated witness continuity

## Why the old form was replaced
The previously displayed JSON textarea was intended for a device-generated, cryptographically signed Build 442 witness envelope. It asked owners to perform a task that ordinary browser interaction cannot satisfy. Entering arbitrary JSON, or generating signatures in ChatGPT, cannot establish an independently operated original device. Build 449 removes that textarea from the owner page and uses automatic protected server-side readback instead.

## Actual recovered owner evidence
- A Resend original-account recovery message was accepted (2026-11-25T14:17:04Z), and Build 448 displayed provider DELIVERED.
- The existing owner redeemed a Better Auth reset token (2026-11-25T14:18:19Z), then a new original owner session was created (2026-11-25T14:19:01Z).
- The correctly redeemed reset link delivered to the original registered mailbox is valid evidence of completing email-based account recovery. This is displayed as **ORIGINAL_MAILBOX_RECOVERY_LINK_REDEEMED**, **not** as the separate Better Auth `auth.user.emailVerified` flag.
- Build 449 never writes or fabricates `emailVerified` and does not request another reset or verification just to close already successful account recovery.
- If Better Auth email verification is independently completed later via its standard link, the same dashboard updates automatically.

## Seven-app genuine witness continuity
- `/owner-field-enrollment` automatically reads the configured original-device **public** key bindings and the latest signed field witness review for the seven known applications; it refreshes while open.
- The existing `POST /api/witness-intake` already supports machine-originated original-device Ed25519 envelopes. It remains available for a genuine independent source-side agent to submit signed field evidence. The owner UI no longer asks for manual JSON.
- The dashboard reports each application's actual evidence state. It does not generate or enroll cryptographic private keys on GitHub/Vercel, create independent Windows device observations, sign original-device events, or mark absent evidence certified.
- Production still requires separately approved public keys bound to their real original devices and signed fresh source-bound ACK/owner field receipts. Without those original-device agents and custody approvals, real witness enrollment stays HOLD.
- Operators can use `GET /api/owner-automatic-enrollment` while authenticated to receive a secretless, owner-only status payload.
- No extra manual steps are requested to view or refresh the owner recovery dashboard. Actual source-side witness execution cannot be delegated to an agent without authenticated access to those original machines and approved independent key custody.

## Code release acceptance
- Check GitHub Build449 PRs merged into `dev` and `main`.
- Verify Build449 tests, TypeScript/Next compilation, and exact `main` Git SHA Vercel READY.
- Code promotion GREEN does not imply seven authentic original-device witnesses. Distinguish *account recovery evidence complete* from *Better Auth emailVerified flag* and *independent field certification*.
