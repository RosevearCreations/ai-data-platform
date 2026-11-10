import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { composeBasicAlerts } from "@/lib/basic-alerts";
import { composeCrossApplicationControlCenter } from "@/lib/cross-application-control-center";
import { composeIncidentRunbookRecoveryOrchestration } from "@/lib/incident-runbook-recovery-orchestration";

export const dynamic = "force-dynamic";

function stateClass(value: string) {
  return value.toLowerCase().replaceAll("_", "-");
}

export default async function IncidentRunbookRecoveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fincident-runbook-recovery");
  }

  const alerts = composeBasicAlerts();
  const controlCenter = composeCrossApplicationControlCenter();
  const model = composeIncidentRunbookRecoveryOrchestration({
    alerts,
    controlCenter
  });

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 357 · Moderate Controls</p>
        <h1>Incident Automation, Runbooks &amp; Supervised Recovery</h1>
        <p className="lead">
          Convert current Master Shell alerts and dependency truth into
          evidence-aware incident plans, deterministic runbooks and supervised
          recovery handoffs without silently executing peer actions.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/basic-alerts">
            Basic Alerts
          </Link>
          <Link className="secondaryButton" href="/cross-application-control-center">
            Cross-Application Control
          </Link>
          <Link className="secondaryButton" href="/basic-operator-actions">
            Operator Actions
          </Link>
          <Link className="secondaryButton" href="/comms-complementary-plane">
            Comms Plane
          </Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Incident summary">
        <div className="commandMetrics">
          <article><strong>{model.summary.total}</strong><span>incident plans</span></article>
          <article><strong>{model.summary.critical}</strong><span>critical</span></article>
          <article><strong>{model.summary.warning}</strong><span>warning</span></article>
          <article><strong>{model.summary.blocked}</strong><span>blocked</span></article>
          <article><strong>{model.summary.supervisedRecoveryReady}</strong><span>recovery-ready</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Automation prepares; authority executes.</strong>
        <p>
          AI Data Platform can classify incidents, select runbooks and prepare
          escalation/recovery packets. Rosevear Comms Hub still owns incident
          workflow and messaging. Each source application still owns
          operational recovery, consequential writes and acceptance.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Runbook queue</p>
            <h2>Evidence-aware incident plans</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.plans.map((plan) => (
            <article className="reviewBatchSummary" key={plan.id}>
              <span
                className={
                  "reviewStatus reviewStatus--" + stateClass(plan.severity)
                }
              >
                {plan.severity} · {plan.state}
              </span>
              <h3>{plan.sourceId}</h3>
              <p><strong>Trigger:</strong> {plan.trigger}</p>
              <p><strong>Owner:</strong> {plan.owner}</p>
              <p>
                <strong>Dependency:</strong> {plan.dependencyState} ·{" "}
                <strong>connection:</strong> {plan.connectionState}
              </p>
              <p><strong>Runbook:</strong> <code>{plan.runbookId}</code></p>
              <ol>
                {plan.steps.map((step) => (
                  <li key={step.id}>
                    <strong>{step.title}</strong> — {step.mode} / {step.authority}
                    {step.explicitApprovalRequired ? " / approval required" : ""}
                  </li>
                ))}
              </ol>
              <p>
                <strong>Automatic execution:</strong> no
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Fail closed on missing or held evidence.</strong>
        <p>
          HOLD, stale, review or missing evidence cannot authorize recovery.
          Deployment GREEN does not prove recovery. A supervised recovery must
          return fresh post-recovery evidence before the displayed operational
          truth can change.
        </p>
      </section>
    </main>
  );
}
