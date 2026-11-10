import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listProductionLearningVIIIForUser } from "@/lib/production-learning-viii-database";

import { ProductionLearningVIIIConsole } from "./ProductionLearningVIIIConsole";

export const dynamic = "force-dynamic";

export default async function ProductionLearningVIIIPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fproduction-learning-viii");
  }

  const model = await listProductionLearningVIIIForUser(session.user.id);

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--management">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 350 · Production Learning VIII · Master Shell closeout
        </p>
        <h1>Master Shell Acceptance & Next Roadmap Renewal</h1>
        <p className="lead">
          Measure the exact six-source Build 349 acceptance state, preserve
          unresolved gaps as evidence-backed renewal candidates and close the
          331–350 batch without automatically creating a Build 351+ roadmap.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/master-production-readiness">
            Build 349 Readiness
          </Link>
          <Link className="secondaryButton" href="/master-shell-command-center">
            Master Command Center
          </Link>
          <a className="secondaryButton" href="/api/production-learning-viii">
            Learning VIII JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 350 is a renewal checkpoint, not new roadmap authorization.</strong>
        <p>
          Master Shell acceptance is derived only from the six current Build 349
          source states. Deployment GREEN does not create acceptance. Refreshing
          this page captures an append-only evidence snapshot; it cannot accept a
          source, authorize work or assign Build 351.
        </p>
      </section>

      <ProductionLearningVIIIConsole initialModel={model} />

      <section className="dataQualityPolicyNote">
        <strong>Build 350 authority boundary</strong>
        <p>
          Build 350 does not mutate a source, activate a connection, execute
          rollback, release HOLD, change authorization, create owner acceptance
          or authorize a numbered Build 351+ roadmap.
        </p>
      </section>
    </main>
  );
}
