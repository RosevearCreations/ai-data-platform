import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BasicOperatorActionsClient } from "./BasicOperatorActionsClient";
import { auth } from "@/lib/auth";

import { composeBasicOperatorActions } from "@/lib/basic-operator-actions";

export const dynamic = "force-dynamic";

export default async function BasicOperatorActionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fbasic-operator-actions");
  }

  const model = composeBasicOperatorActions();

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--management">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 352 · Basic Operator Actions</p>
        <h1>Safe Refresh, Retry, Recheck & Recovery Controls</h1>
        <p className="lead">
          Give the Master Shell useful operator actions without turning monitoring
          into hidden peer writes or inventing source acceptance.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/basic-controls">Basic Controls</Link>
          <Link className="secondaryButton" href="/master-shell-command-center">Master Command Center</Link>
          <Link className="secondaryButton" href="/comms-complementary-plane">Comms Plane</Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Master / source authority</strong>
        <p>
          AI Data Platform is the Master Shell intelligence and monitoring
          coordinator. It is not a universal write-master. Each source application
          remains authoritative for its own operational state, while Rosevear
          Comms Hub remains the complementary communications/control plane.
        </p>
      </section>

      <BasicOperatorActionsClient />

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Operator controls</p>
            <h2>What each action may actually do</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.actions.map((action) => (
            <article className="reviewBatchSummary" key={action.action}>
              <span className="reviewStatus">
                {action.mode} · {action.authority}
              </span>
              <h3>{action.title}</h3>
              <p>{action.purpose}</p>
              <p>
                Peer mutation: <strong>{action.mutatesPeerApplication ? "yes" : "no"}</strong>
                {" · "}explicit approval: <strong>{action.requiresExplicitApproval ? "required" : "not required"}</strong>
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Application linkage</p>
            <h2>Exact six-source connection map</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.sourceLinks.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <span className="reviewStatus">{source.relationship}</span>
              <h3>{source.sourceId}</h3>
              <p>{source.shellBoundary}</p>
              <p><strong>Repository:</strong> {source.repository}</p>
              <p><strong>Inbound:</strong> {source.inboundToAiData.join(", ")}</p>
              <p><strong>Outbound:</strong> {source.outboundFromAiData.join(", ")}</p>
              <p><strong>Automatic peer mutation:</strong> no</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Connection process</p>
            <h2>How AI Data Platform joins the Master Shell</h2>
          </div>
        </div>
        <ol>
          {model.connectionProcess.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </section>
    </main>
  );
}
