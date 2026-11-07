import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listIntegrationCertificationForUser } from "@/lib/integration-certification-database";

import { HelpInfo } from "../help/HelpInfo";
import { IntegrationCertificationConsole } from "./IntegrationCertificationConsole";

export const dynamic = "force-dynamic";

export default async function IntegrationCertificationPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="integration-delivery" />
          <p className="eyebrow">Build 304</p>
          <h1>Six-App End-to-End Integration Certification Suite</h1>
          <p className="lead">
            Sign in to certify current integration evidence across all six
            registered Rosevear applications.
          </p>
          <Link
            className="primaryLink"
            href="/sign-in?callbackUrl=/integration-certification"
          >
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const model = await listIntegrationCertificationForUser(session.user.id);

  return (
    <main className="shell opsCommandScreen opsCommandScreen--it">
      <section className="hero">
        <HelpInfo topic="integration-delivery" />
        <p className="eyebrow">
          Build 304 · evidence-based six-app certification
        </p>
        <h1>Six-App End-to-End Integration Certification Suite</h1>
        <p className="lead">
          Evaluate authentication, approved exchange, event handling, failure
          recovery and tenant isolation for Devil n Dove, Rosie Dazzlers, Yard
          Workers, iCamp, Rosevear Comms Hub and Rosevear AI Hub.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/app-connections">
            App Connection Registry
          </Link>
          <Link className="secondaryButton" href="/connection-validation">
            Connection Validation
          </Link>
          <Link className="secondaryButton" href="/event-bus">
            Event Bus
          </Link>
          <Link className="secondaryButton" href="/integration-recovery">
            Integration Recovery
          </Link>
          <Link className="secondaryButton" href="/workflow-automation">
            Workflow Automation
          </Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Certification is evidence, not activation.</strong>
        <p>
          PASS requires positive evidence. Missing evidence is BLOCKED.
          Contradictory evidence is FAIL. The suite cannot manufacture trust,
          infer a live peer connection, or bypass an owner, tenant, credential,
          hold, replay or destination-action gate.
        </p>
      </section>

      <IntegrationCertificationConsole
        model={{
          evidenceWindowDays: model.evidenceWindowDays,
          applications: model.applications,
          runs: model.runs,
          latestRun: model.latestRun,
          latestAssertions: model.latestAssertions,
          policy: model.policy
        }}
      />
    </main>
  );
}
