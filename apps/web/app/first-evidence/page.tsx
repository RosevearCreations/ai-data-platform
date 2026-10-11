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
          <p className="eyebrow">Build 037</p>
          <h1>Guided production adoption</h1>
          <p className="lead">
            Sign in to see the first-evidence runbook for your authorized workspaces.
          </p>
          <Link className="primaryLink" href="/sign-in?callbackUrl=/first-evidence">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const review = await buildFirstEvidenceReviewForUser(session.user.id);

  return (
    <main className="shell">
      <section className="hero">
        <HelpInfo topic="first-evidence-overview" />
        <p className="eyebrow">Build 037</p>
        <h1>Guided Production Adoption & First-Evidence Runbook</h1>
        <p className="lead">
          Use existing safe workflows for real work, one workspace at a time.
          This page never creates synthetic activity and never bypasses Source
          Policy, Browserless, integration, permission or review gates.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/adoption">
            Adoption outcomes
          </Link>
          <Link className="secondaryButton" href="/production-learning">
            Production learning
          </Link>
          <a className="secondaryButton" href="/api/first-evidence">
            Evidence JSON
          </a>
          <Link className="secondaryButton" href="/">
            Back to platform
          </Link>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Current adoption</p>
            <h2>First-evidence status</h2>
          </div>
          <HelpInfo topic="first-evidence-overview" />
        </div>
        <div className="grid">
          <article className="card">
            <h3>{review.totals.evidenceEstablished}/{review.totals.workspaces} workspaces have durable activity</h3>
            <p>{review.totals.needingFirstEvidence} still need their first real operational evidence.</p>
            <span className="badge">durable evidence only</span>
          </article>
          <article className="card">
            <h3>{review.totals.readySteps} safe next steps</h3>
            <p>These steps can be performed now when they match genuine work.</p>
            <span className="badge">no synthetic fixtures</span>
          </article>
          <article className="card">
            <h3>{review.totals.gatedSteps} explicitly gated steps</h3>
            <p>Remote/browser and business-delivery gates remain intact.</p>
            <span className="badge">operator approval required</span>
          </article>
        </div>
      </section>

      {review.workspaces.map((workspace) => (
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
            {workspace.activityEvents} measured activity event(s) ·{" "}
            {workspace.completeSteps}/{workspace.applicableSteps} applicable
            runbook steps currently evidenced.
          </p>
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
                  <Link className="secondaryButton" href={step.href}>
                    Open related workflow
                  </Link>
                </article>
              ))}
          </div>
        </section>
      ))}

      <section className="principles">
        <div>
          <p className="eyebrow">Completion rule</p>
          <h2>Evidence must come from real work</h2>
        </div>
        <ul>
          <li>Do not create throwaway records, fake sources or fake receivers to close a metric.</li>
          <li>Do not run Browserless unless the existing Build 032 production gate is deliberately authorized.</li>
          <li>Do not enable downstream business writes through Build 033 merely to create adoption evidence.</li>
          <li>Once real activity appears, re-open Adoption and Production Learning to capture the changed durable evidence.</li>
        </ul>
      </section>
    </main>
  );
}
