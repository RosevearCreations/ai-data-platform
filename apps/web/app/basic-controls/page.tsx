import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { buildBasicControlsCompletion } from "@/lib/basic-controls-completion";
import { listMasterProductionReadinessForUser } from "@/lib/master-production-readiness-database";

export const dynamic = "force-dynamic";

export default async function BasicControlsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fbasic-controls");
  }

  const readiness = await listMasterProductionReadinessForUser(session.user.id);
  const model = buildBasicControlsCompletion({ readiness });

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--management">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 351 · Basic Controls · Operational Truth</p>
        <h1>Master Basic Controls Completion</h1>
        <p className="lead">
          Reconcile foundational Master Shell controls against current evidence,
          separate implementation from acceptance and prevent retired preflight
          language from remaining an automatic production blocker.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/master-production-readiness">
            Production Readiness
          </Link>
          <Link className="secondaryButton" href="/production-learning-viii">
            Production Learning VIII
          </Link>
          <Link className="secondaryButton" href="/master-shell-command-center">
            Master Command Center
          </Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Basic control summary">
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.complete}/{model.summary.totalControls}</strong>
            <span>controls complete</span>
          </article>
          <article>
            <strong>{model.summary.partial}</strong>
            <span>partial</span>
          </article>
          <article>
            <strong>{model.summary.hold}</strong>
            <span>held</span>
          </article>
          <article>
            <strong>{model.summary.stale}</strong>
            <span>stale</span>
          </article>
          <article>
            <strong>{model.summary.failed}</strong>
            <span>failed</span>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Operational truth rule</strong>
        <p>
          Historical preflight or prelaunch wording is not an automatic blocker.
          A requirement blocks only when a current authoritative control still
          requires fresh evidence. Deployment GREEN remains deployment evidence,
          not source or owner acceptance.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Basic control matrix</p>
            <h2>Coverage, gaps and current truth</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.controls.map((control) => (
            <article className="reviewBatchSummary" key={control.id}>
              <span className="reviewStatus">
                {control.id} · {control.area} · {control.state}
              </span>
              <h3>{control.title}</h3>
              <p>{control.requirement}</p>
              <p><strong>Evidence:</strong> {control.evidence}</p>
              <p><strong>Truth:</strong> {control.truth}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Exact six sources</p>
            <h2>Current acceptance-dependent control state</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.sources.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <h3>{source.sourceId}</h3>
              <p>
                <strong>{source.controlState}</strong>
                {" · "}Build 349 {source.effectiveState}
                {" · "}owner decision {source.ownerDecision}
              </p>
              <p>
                Observed {source.observedAt ?? "not recorded"}
                {" · "}expires {source.expiresAt ?? "not recorded"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
