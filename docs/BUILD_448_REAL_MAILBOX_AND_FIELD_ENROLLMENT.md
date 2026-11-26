# Build 448 — Genuine owner mailbox, Resend provider and seven-application original-device enrollment

## What has been verified
The Rosevear original account has a successful password reset and new owner sign-in. At the Build 448 starting check, the registered email's Better Auth verified flag remained **false**; no owner-triggered verification email request had been recorded. One Resend recovery message was accepted by the provider, but independent delivery-status readback was not yet proven. **Zero** fresh independent original-device field witnesses existed. The production environment contained Resend configuration but no `BUILD442_INDEPENDENT_WITNESS_PUBLIC_KEYS_JSON` or `BUILD443_INDEPENDENT_WITNESS_BINDINGS_JSON` variables.

## Part A — Close the original owner's mailbox verification
1. Sign into the canonical site `https://ai-data-platform-johns-projects-8f256ece.vercel.app/sign-in` using the existing registered Gmail account and the recovered password. Do **not** substitute the Resend sending address `ree@devilndove.com`.
2. Open `https://ai-data-platform-johns-projects-8f256ece.vercel.app/owner-recovery-closure`.
3. If the email is still unverified, press **Send original-mailbox verification link** once. This authenticated, owner-only action is rate-limited to one request per 30 minutes.
4. Open the **original Gmail mailbox** used for login. Check Inbox, Spam and Promotions. Open the Better Auth email-verification link.
5. Reload `/owner-field-enrollment`. The **Mailbox verification** flag changes only when Better Auth confirms the valid verification token. Never edit `auth.user.emailVerified` directly.
6. Check **Recovery mail delivery**. If `DELIVERED`, the Resend event records transport delivery. `FAILED` means investigate a bounce, complaint or suppression. `DELAYED` means awaiting deliverability. `UNKNOWN` means the provider lookup could not verify an event. Do not automatically re-send, alter the original email or claim mailbox ownership from transport delivery alone.

## Part B — Enroll genuine independently held device keys
The application must know the public signing key for each independently approved original-device witness. The private key stays on its actual witness device; it must never be pasted into ChatGPT, GitHub, Vercel, browser text fields or support logs. A public key and signed envelope do **not** by themselves prove the field observations were genuine; independently review original host/source revision, interface, ACK and owner acceptance.

1. On **each original witnessing device**, have the independent custodian create a unique Ed25519 keypair using their secure local key tool. Store the private key with restricted local filesystem permissions and backups under their custody; export only the PEM-encoded **public** key.
2. Record the key ID, app ID, original device ID, witness ID, witness role, approved source revision and independent reviewer approval. Key IDs must be exact and unique.
3. Open Vercel → **johns-projects-8f256ece** → **ai-data-platform** → **Settings → Environment Variables → Production**.
4. Add `BUILD442_INDEPENDENT_WITNESS_PUBLIC_KEYS_JSON`, a JSON object mapping each key ID to its Ed25519 public SPKI PEM, **never private keys**.
5. Add `BUILD443_INDEPENDENT_WITNESS_BINDINGS_JSON`, a JSON object mapping those same IDs to approved policies. Each entry must contain `appIds`, `originalDeviceId`, `witnessId`, `witnessRole`, `independentOfSource: true` and `active: true`.
6. Review each app's device/source/key custody independently. Redeploy the latest `main` Vercel production deployment to apply the variables. Verify its deployment state **READY**.
7. Open `/owner-field-enrollment` and confirm the seven apps report a valid independent public key. This is **enrollment readiness**, not field acceptance.
8. On the authentic original witness device, prepare a local reviewed evidence JSON file with values for `appId`, `sourceCommit`, `originalDeviceId`, `interfaceCertified`, `receiverAckVerified`, `ownerAcceptanceVerified`, `independentWitnessApproved`. These booleans must be true only when the independent actual evidence has been inspected.
9. Run the included signing utility on that original device:

   `node apps/web/scripts/build448-sign-original-witness.mjs --app-id=yw --source-commit=<EXACT_40_CHAR_SHA> --key-id=<APPROVED_KEY_ID> --witness-id=<INDEPENDENT_OBSERVER> --witness-role=independent-observer --original-device-id=<ACTUAL_DEVICE_ID> --private-key-file=<LOCAL_PRIVATE_KEY_PATH> --review-evidence-file=<LOCAL_REVIEW_EVIDENCE_JSON>`

10. The utility prints a signed public **envelope JSON**, not the private key. Paste the entire envelope into `/owner-field-enrollment` → **Verify and submit signed envelope** while its observation is fresh (within 5 minutes). Never paste the private key. The signed envelope is verified against the configured exact public key, approved app/device/observer role, source identity and replay ledger before acceptance.
11. Refresh the dashboard. Each app is certified only if its **independent signed witness** is still fresh, its observed source revision matches the independently verified source, and interface/ACK/owner acceptance checks all pass. Missing, duplicate, stale, invalid or unsupported evidence remains HOLD.
12. Repeat for **all seven** applications: `ai-data-platform`, `rosevear-comms-hub`, `rosevear-ai-hub`, `icamp`, `yw`, `devilndove`, `rosiedazzlers`.

Example of a public-key binding entry (placeholders only, **not an enrolled or valid key**):

```json
{
  "independent-yw-original-01": {
    "appIds": ["yw"],
    "originalDeviceId": "YW-ORIGINAL-DEVICE-ID",
    "witnessId": "independent-reviewer-id",
    "witnessRole": "independent-observer",
    "independentOfSource": true,
    "active": true
  }
}
```

For real approval, both JSON environment variables and genuine signer evidence must exist; an example, mock signature, or deployment test is not approval.

## Diagnostic safeguards
- `GET /api/owner-field-enrollment` requires a genuine authenticated owner session and returns no raw public-key PEM, private keys, provider message IDs, email account details or reset links.
- The existing `POST /api/witness-intake` accepts cryptographically signed original-device envelopes only. It is fail-closed when keys/bindings are absent. Database evidence writes and replay claims are atomic.
- Build 448 never generates operator approval, auto-sends emails, changes passwords, creates identities, or promotes peer application deployments.
- If the original Gmail mailbox is inaccessible, do not change the owner's account email or verified flag without separately verified owner authorization and an audited recovery process.
