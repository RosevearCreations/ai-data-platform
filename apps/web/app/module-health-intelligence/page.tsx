import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  listModuleHealthIntelligenceForUser
} from "@/lib/module-health-intelligence-database";

export const dynamic = "force-dynamic";

function stateClass(value: string) {
  return value.toLowerCase().replaceAll("_", "-");
}

export default async function ModuleHealthIntelligencePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fmodule-health-intelligence");
  }

  const model = await listModuleHealthIntelligenceForUser(session.user.id);

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 344 · Rosevear Suite Master Shell</p>
        <h1>Module Health &amp; Blocker Intelligence</h1>
        <p className="lead">
          Review module health, stale evidence, source HOLDs, explicit blockers
          and evidence-backed stuck-state candidates without changing source
          state or automatically releasing work.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/master-application-inventory">
            Application Inventory
          </Link>
          <Link className="secondaryButton" href="/master-shell-command-center">
            Master Command Center
          </Link>
          <a className="secondaryButton" href="/api/module-health-intelligence">
            Health JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Stuck is a review candidate, not source truth.</strong>
        <p>
          A fresh module that remains IN_PROGRESS for at least{" "}
          <strong>{model.stuckAfterHours} hours</strong> is surfaced as a
          STUCK_CANDIDATE. AI Data Platform does not write that state back,
          release HOLDs, restart work, or perform automatic recovery.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Suite summary</p>
            <h2>Current module evidence</h2>
          </div>
        </div>
        <article className="reviewBatchSummary">
          <p>
            Modules <strong>{model.summary.modules}</strong> · HOLD{" "}
            <strong>{model.summary.hold}</strong> · blocked{" "}
            <strong>{model.summary.blocked}</strong> · stale{" "}
            <strong>{model.summary.stale}</strong> · stuck candidates{" "}
            <strong>{model.summary.stuckCandidates}</strong> · in progress{" "}
            <strong>{model.summary.inProgress}</strong>
          </p>
          <p>
            Healthy signals <strong>{model.summary.healthySignals}</strong> ·
            unmeasured <strong>{model.summary.unmeasured}</strong> · hard
            blockers <strong>{model.summary.hardBlockers}</strong> · evidence
            blockers <strong>{model.summary.evidenceBlockers}</strong> ·
            evidence gaps <strong>{model.summary.evidenceGaps}</strong>
          </p>
        </article>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Priority queue</p>
            <h2>Modules needing review</h2>
          </div>
        </div>
        {model.moduleQueue.length ? (
          <div className="reviewBatchList">
            {model.moduleQueue.map((module) => (
              <article
                className="reviewBatchSummary"
                key={module.sourceId + "::" + module.moduleId}
              >
                <span
                  className={
                    "reviewStatus reviewStatus--" +
                    stateClass(module.healthState)
                  }
                >
                  {module.healthState}
                </span>
                <h3>
                  {module.displayName} · {module.moduleId}
                </h3>
                <p>
                  Source <strong>{module.sourceEffectiveStatus}</strong> /{" "}
                  <strong>{module.sourceFreshness}</strong> · readiness{" "}
                  <strong>{module.readinessState}</strong> /{" "}
                  <strong>{module.readinessFreshness}</strong>
                </p>
                <p>
                  Readiness age{" "}
                  <strong>
                    {module.readinessAgeHours === null
                      ? "UNMEASURED"
                      : module.readinessAgeHours.toFixed(2) + " h"}
                  </strong>{" "}
                  · source completion{" "}
                  <strong>
                    {module.readinessCompletionPercent === null
                      ? "UNMEASURED"
                      : module.readinessCompletionPercent.toFixed(2) + "%"}
                  </strong>
                </p>
                <p>
                  Hard blockers <strong>{module.hardBlockerCount}</strong> ·
                  evidence blockers{" "}
                  <strong>{module.evidenceBlockerCount}</strong> · evidence gaps{" "}
                  <strong>{module.evidenceGapCount}</strong>
                </p>
                {module.blockers.length ? (
                  <ul>
                    {module.blockers.map((blocker) => (
                      <li key={blocker.code + ":" + blocker.detail}>
                        <strong>{blocker.code}</strong> · {blocker.kind} ·{" "}
                        {blocker.detail}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p>
                  Stuck state written to source <strong>no</strong> ·
                  production acceptance inferred <strong>no</strong>
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            No module currently requires evidence-backed review. Missing evidence
            is never converted into healthy.
          </div>
        )}
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Applications</p>
            <h2>Per-source module health</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.applications.map((application) => (
            <article
              className="reviewBatchSummary"
              key={application.sourceId}
            >
              <h3>{application.displayName}</h3>
              <p>
                Source <strong>{application.sourceEffectiveStatus}</strong> ·
                freshness <strong>{application.sourceFreshness}</strong>
              </p>
              <p>
                Modules <strong>{application.summary.modules}</strong> · HOLD{" "}
                <strong>{application.summary.hold}</strong> · blocked{" "}
                <strong>{application.summary.blocked}</strong> · stale{" "}
                <strong>{application.summary.stale}</strong> · stuck{" "}
                <strong>{application.summary.stuckCandidates}</strong> · healthy{" "}
                <strong>{application.summary.healthySignals}</strong>
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Read-only intelligence.</strong>
        <p>
          Build 344 performs no source mutation, peer write, external probe,
          automatic retry, automatic recovery, HOLD release, owner acceptance,
          module acceptance or production acceptance.
        </p>
      </section>
    </main>
  );
}
