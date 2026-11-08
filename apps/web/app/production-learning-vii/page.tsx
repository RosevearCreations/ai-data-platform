import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listProductionLearningVIIForUser } from "@/lib/production-learning-vii-database";

import { ProductionLearningVIIConsole } from "./ProductionLearningVIIConsole";

export const dynamic = "force-dynamic";

export default async function ProductionLearningVIIPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fproduction-learning-vii"
    );
  }

  const model = await listProductionLearningVIIForUser(
    session.user.id
  );

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--management">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 330 · Autonomous Operations V2 · Production Learning VII
        </p>
        <h1>Evidence-Driven Module Batch Closeout</h1>
        <p className="lead">
          Reconcile the real operating evidence accumulated across Builds
          306–330, preserve an append-only renewal snapshot and produce only a
          finite set of unnumbered, evidence-backed candidates for owner review.
        </p>
        <div className="heroActions">
          <Link
            className="secondaryButton"
            href="/autonomous-operations"
          >
            Autonomous Operations V2
          </Link>
          <Link
            className="secondaryButton"
            href="/module-certification"
          >
            Module Certification
          </Link>
          <Link
            className="secondaryButton"
            href="/module-lifecycle"
          >
            Module Lifecycle
          </Link>
          <a
            className="secondaryButton"
            href="/api/production-learning-vii"
          >
            Learning VII JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>
          Build 330 closes the 306–330 batch; it does not auto-create the next one.
        </strong>
        <p>
          Candidates are unnumbered recommendations derived only from measured
          evidence. Refreshing this review records evidence; it does not approve,
          schedule or execute future work. Autonomous Operations V2 keeps the
          same bounded automatic action envelope: connector-health GET/HEAD only
          under the existing policy, budget, grant and kill-switch controls.
        </p>
      </section>

      <ProductionLearningVIIConsole initialModel={model} />
    </main>
  );
}
