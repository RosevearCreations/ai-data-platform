import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { buildAutomaticConnectionValidation } from "@/lib/connection-validation";

import { AutomaticConnectionValidation } from "./AutomaticConnectionValidation";

export const dynamic = "force-dynamic";

export default async function ConnectionValidationPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fconnection-validation");

  const model = await buildAutomaticConnectionValidation(session.user.id);

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 285 · Automated integration readiness</p>
        <h1>Automatic Connection Testing &amp; Configuration Validation</h1>
        <p className="lead">
          Validate connector schemas, authentication-reference metadata,
          permissions, HTTPS endpoints, webhook destinations and safe execution
          eligibility, then automatically run bounded non-export tests where every
          safety gate passes.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/data-contracts">
            Cross-App Data Contracts
          </Link>
          <Link className="secondaryButton" href="/connector-setup">
            Connector Setup Wizard
          </Link>
          <Link className="secondaryButton" href="/credential-vault">
            Credential Vault
          </Link>
          <Link className="secondaryButton" href="/connector-diagnostics">
            Connector Diagnostics
          </Link>
          <a className="secondaryButton" href="/api/connection-validation">
            Validation JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Automatic does not mean unrestricted.</strong>
        <p>
          Build 285 executes only registered Connector SDK definitions, only when
          enabled, only with owner/admin authority, only with a supported non-export
          capability and only after configuration/vault/destination checks pass.
          Arbitrary URL probing, automatic connector activation and secret-value
          return/persistence are prohibited. The retired QL-266 review hold is historical only and is not a current prerequisite.
        </p>
      </section>

      <AutomaticConnectionValidation initialModel={model} />
    </main>
  );
}
