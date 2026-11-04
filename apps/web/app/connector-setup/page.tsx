import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { buildConnectorSetupWizardModel } from "@/lib/connector-setup-wizard";

import { ConnectorSetupWizard } from "./ConnectorSetupWizard";

export const dynamic = "force-dynamic";

export default async function ConnectorSetupPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fconnector-setup");

  const model = buildConnectorSetupWizardModel();

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 283 · Guided connection preparation</p>
        <h1>Connector Setup Wizard &amp; Guided Connection Assistant</h1>
        <p className="lead">
          Select a peer application, canonical environment and supported connection
          path, review derived tenant/workspace configuration, then save a
          non-secret browser-local draft for a later controlled test gate.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/app-connections">
            App Connection Registry
          </Link>
          <Link className="secondaryButton" href="/credential-vault">
            Credential Vault
          </Link>
          <Link className="secondaryButton" href="/connection-validation">
            Automatic Validation
          </Link>
          <Link className="secondaryButton" href="/connectors">
            Connector Manager
          </Link>
          <Link className="secondaryButton" href="/connector-diagnostics">
            Connector Diagnostics
          </Link>
          <a className="secondaryButton" href="/api/app-connections/setup">
            Setup Model JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Preparation is not authorization.</strong>
        <p>
          Build 283 never accepts raw secret values, installs or enables a connector,
          executes an external connection test, creates a tenant/workspace, or changes
          the DISCONNECTED state. QL-266 remains UNDER_REVIEW / REVIEW_DEFERRED /
          DISCONNECTED.
        </p>
      </section>

      <ConnectorSetupWizard model={model} />
    </main>
  );
}
