import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { composeBasicAlerts } from "@/lib/basic-alerts";
import { listMasterProductionReadinessForUser } from "@/lib/master-production-readiness-database";

export const dynamic = "force-dynamic";

export default async function BasicAlertsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fbasic-alerts");
  }

  const readiness = await listMasterProductionReadinessForUser(session.user.id);
  const model = composeBasicAlerts({ readiness });

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--management">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 353 · Basic Alerts</p>
        <h1>Alerts, Ownership, Escalation & Resolution</h1>
        <p className="lead">
          Turn current Master Shell truth into simple operator attention states
          without allowing an alert, acknowledgement or escalation to rewrite
          source-owned operational truth.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/basic-controls">Basic Controls</Link>
          <Link className="secondaryButton" href="/basic-operator-actions">Operator Actions</Link>
          <Link className="secondaryButton" href="/master-shell-command-center">Master Command Center</Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Basic alert summary">
        <div className="commandMetrics">
          <article><strong>{model.summary.critical}</strong><span>critical</span></article>
          <article><strong>{model.summary.warning}</strong><span>warning</span></article>
          <article><strong>{model.summary.info}</strong><span>informational</span></article>
          <article><strong>{model.summary.open}</strong><span>open</span></article>
          <article><strong>{model.summary.resolved}</strong><span>resolved</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Threshold rule</strong>
        <p>
          FAIL/STALE are critical; HOLD/READY_FOR_OWNER are warnings.
          These labels guide attention only. Source applications still own
          operational resolution and Comms Hub still owns incident workflow.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Current alert queue</p>
            <h2>Ownership and escalation</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.alerts.map((alert) => (
            <article className="reviewBatchSummary" key={alert.id}>
              <span className="reviewStatus">
                {alert.level} · {alert.resolutionState}
              </span>
              <h3>{alert.title}</h3>
              <p>{alert.reason}</p>
              <p><strong>Owner:</strong> {alert.owner}</p>
              <p><strong>Escalation:</strong> {alert.escalation}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Connection handoffs</p>
            <h2>Source-side acknowledgement queue</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.handoffs.map((handoff) => (
            <article className="reviewBatchSummary" key={handoff.targetId}>
              <span className="reviewStatus">{handoff.status}</span>
              <h3>{handoff.label}</h3>
              <p><strong>Repository:</strong> {handoff.repository}</p>
              <p><strong>Handshake token:</strong> {handoff.token}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
