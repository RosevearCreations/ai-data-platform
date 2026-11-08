import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listCredentialVaultForUser } from "@/lib/credential-vault-database";

import { CredentialVaultManager } from "./CredentialVaultManager";

export const dynamic = "force-dynamic";

export default async function CredentialVaultPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fcredential-vault");

  const model = await listCredentialVaultForUser(session.user.id);

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 284 · Credential reference governance</p>
        <h1>Connection Credential Vault &amp; Rotation Readiness</h1>
        <p className="lead">
          Centralize credential-reference metadata, rotation due dates, expiry
          evidence and owner-controlled replacement status without storing or
          exposing the credential value itself.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/connector-setup">
            Connector Setup Wizard
          </Link>
          <Link className="secondaryButton" href="/connection-validation">
            Automatic Validation
          </Link>
          <Link className="secondaryButton" href="/connector-diagnostics">
            Connector Diagnostics
          </Link>
          <Link className="secondaryButton" href="/app-connections">
            App Connection Registry
          </Link>
          <a className="secondaryButton" href="/api/credential-vault">
            Vault JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Reference metadata only — never secret material.</strong>
        <p>
          Build 284 stores reference locators, scope, dates and append-only rotation
          evidence. Passwords, tokens, API keys, HMAC keys and credential values
          remain in their external environment, provider or vault. Rotation is never
          automatic and The retired QL-266 review hold is historical only and is not a current prerequisite.
        </p>
      </section>

      <CredentialVaultManager model={model} />
    </main>
  );
}
