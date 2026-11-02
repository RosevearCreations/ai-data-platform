import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { buildFirstEvidenceReviewForUser } from "@/lib/first-evidence-database";

import { HelpInfo } from "../help/HelpInfo";

export const dynamic = "force-dynamic";

function label(status: string) {
  return status.replace("-", " ").toUpperCase();
}

export default async function FirstEvidencePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="first-evidence-overview" />
          <p className="eyebrow">Build 274</p>
          <h1>Guided Adoption Runbook &amp; First-Evidence Completion</h1>
          <p className="lead">
            Sign in to review the bounded first-evidence completion path for your authorized workspaces.
          </p>
          <Link className="primaryLink" href="/sign-in?callbackUrl=/first-evidence">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const review = await buildFirstEvidenceReviewForUser(session.user.id);
  const completionByWorkspace = new Map(
    review.completion.workspaces.map((workspace) => [workspace.workspaceId, workspace])
  );

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--management">
      <section className="hero reviewHero">
        <HelpInfo topic="first-evidence-overview" />
        <p className="eyebrow">Build 274 · Build 037 foundation retained</p>
        <h1>Guided Adoption Runbook &amp; First-Evidence Completion</h1>
        <p className="lead">
          Guide genuine work through the existing Collect → Review → Approve → Publish → Deliver path while keeping
          every source, review, provider and integration gate intact. This surface reads durable evidence; it does not
          create activity merely to satisfy an adoption metric.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/evidence-baseline">Build 273 baseline</Link>
          <Link className="secondaryButton" href="/runbooks">Guided runbooks</Link>
          <Link className="secondaryButton" href="/adoption">Adoption outcomes</Link>
          <Link className="secondaryButton" href="/production-learning">Production learning</Link>
          <a className="secondaryButton" href="/api/first-evidence">Evidence JSON</a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 274 exit criterion: {review.completion.exitCriterion.met ? "MET" : "OPEN"}</strong>
        <p>{review.completion.exitCriterion.label}</p>
        <p><strong>Current evidence:</strong> {review.completion.exitCriterion.evidence}</p>
        <p>
          A full live delivery is not required to close first-evidence adoption. Provider and supported-consumer
          evidence remain separately governed by Builds 275 and 276.
        </p>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Current adoption</p>
            <h2>Bounded first-evidence status</h2>
          </div>
          <HelpInfo topic="first-evidence-overview" />
        </div>
        <div className="commandMetrics">
          <article>
            <strong>{review.completion.totals.evidenceEstablished}/{review.completion.totals.workspaces}</strong>
            <span>workspaces with durable activity</span>
          </article>
          <article>
            <strong>{review.completion.totals.needingFirstEvidence}</strong>
            <span>still needing first evidence</span>
          </article>
          <article>
            <strong>{review.completion.totals.zeroActivityWithExplicitNextAction}</strong>
            <span>zero-activity workspaces with next action</span>
          </article>
          <article>
            <strong>{review.completion.totals.journeysComplete}</strong>
            <span>full governed journeys complete</span>
          </article>
          <article>
            <strong>{review.totals.gatedSteps}</strong>
            <span>explicitly gated capability steps</span>
          </article>
        </div>
      </section>

      {review.workspaces.map((workspace) => {
        const completion = completionByWorkspace.get(workspace.workspaceId);
        return (
          <section key={workspace.workspaceId}>
            <div className="sectionHeading">
              <div>
                <p className="eyebrow">{workspace.profileName}</p>
                <h2>{workspace.workspaceName}</h2>
              </div>
              <span className="badge">
                {workspace.hasDurableEvidence ? "EVIDENCE ESTABLISHED" : "FIRST EVIDENCE NEEDED"}
              </span>
            </div>

            <p>
              {workspace.activityEvents} measured activity event(s) · {workspace.completeSteps}/{workspace.applicableSteps}
              {" "}profile-aware steps evidenced.
            </p>

            {completion ? (
              <>
                <div className="dataQualityPolicyNote">
                  <strong>Next bounded action: {completion.nextAction.label}</strong>
                  <p>
                    Source: {completion.nextAction.kind.replace("-", " ")}
                    {completion.nextAction.gated ? " · current gate must remain closed until explicitly authorized." : "."}
                  </p>
                  <Link className="textLink" href={completion.nextAction.href}>Open next action →</Link>
                </div>

                <div className="sectionHeading">
                  <div>
                    <p className="eyebrow">Governed journey</p>
                    <h3>{completion.journey.completeStages}/{completion.journey.totalStages} stages complete</h3>
                  </div>
                </div>
                <div className="grid">
                  {completion.journey.stages.map((stage) => (
                    <article className="card" key={stage.id}>
                      <span className="badge">{label(stage.status)}</span>
                      <h3>{stage.label}</h3>
                      {stage.evidence.map((evidence) => <p key={evidence}>{evidence}</p>)}
                      <p><strong>Gate:</strong> {stage.gate}</p>
                      <Link className="secondaryButton" href={stage.href}>{stage.actionLabel}</Link>
                    </article>
                  ))}
                </div>
              </>
            ) : null}

            <div className="sectionHeading">
              <div>
                <p className="eyebrow">Profile-aware evidence steps</p>
                <h3>Only use steps that match genuine work</h3>
              </div>
            </div>
            <div className="grid">
              {workspace.steps
                .filter((step) => step.status !== "not-applicable")
                .map((step) => (
                  <article className="card" key={step.key}>
                    <span className="badge">{label(step.status)}</span>
                    <h3>{step.title}</h3>
                    <p>{step.evidence}</p>
                    <p><strong>Operator sequence:</strong> {step.instruction}</p>
                    {step.operatorGate ? (
                      <p><strong>Gate:</strong> Explicit operator approval remains required.</p>
                    ) : null}
                    <Link className="secondaryButton" href={step.href}>Open related workflow</Link>
                  </article>
                ))}
            </div>
          </section>
        );
      })}

      <section className="principles">
        <div>
          <p className="eyebrow">Completion rule</p>
          <h2>Evidence must come from real work</h2>
        </div>
        <ul>
          <li>Do not create throwaway records, fake sources, fake barcodes or fake receivers to close a metric.</li>
          <li>Review and approval decisions remain explicit and use the existing governed controls.</li>
          <li>Do not run Browserless unless the existing production gate is deliberately authorized for a real approved need.</li>
          <li>Do not enable downstream business writes merely to create first-evidence adoption.</li>
          <li>Once real activity appears, re-open Adoption, the Build 273 baseline and Production Learning to capture the changed durable evidence.</li>
        </ul>
      </section>
    </main>
  );
}
