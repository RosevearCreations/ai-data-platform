import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { composeAdaptiveMasterControl } from "@/lib/adaptive-master-control";
import { composeAnomalyBehaviourPredictiveRisk } from "@/lib/anomaly-behaviour-predictive-risk";
import { auth } from "@/lib/auth";
import { composeBasicAlerts } from "@/lib/basic-alerts";
import { buildCapacityPlanningModel } from "@/lib/capacity-planning";
import { composeCapacityWorkloadForecast } from "@/lib/capacity-workload-forecasting";
import { composeCrossApplicationControlCenter } from "@/lib/cross-application-control-center";
import { composeIncidentRunbookRecoveryOrchestration } from "@/lib/incident-runbook-recovery-orchestration";
import { composeMasterControlReadinessCertification } from "@/lib/master-control-readiness-certification";
import { listPerformanceBaselineForUser } from "@/lib/performance-baseline-database";
import { listPerformanceObservatoryForUser } from "@/lib/performance-observatory-database";
import { buildProductionLearningReview } from "@/lib/production-learning-database";

export const dynamic = "force-dynamic";

function statusClass(value: string) {
  return value.toLowerCase().replaceAll("_", "-");
}

export default async function MasterControlReadinessCertificationPage({
  searchParams
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fmaster-control-readiness-certification"
    );
  }

  const params = await searchParams;
  const [baseline, observatory, review] = await Promise.all([
    listPerformanceBaselineForUser(session.user.id),
    listPerformanceObservatoryForUser(session.user.id),
    buildProductionLearningReview(session.user.id)
  ]);

  const capacity = composeCapacityWorkloadForecast({
    capacity: buildCapacityPlanningModel(review.evidence, params.scenario),
    observatory
  });
  const incidents = composeIncidentRunbookRecoveryOrchestration({
    alerts: composeBasicAlerts(),
    controlCenter: composeCrossApplicationControlCenter()
  });
  const risk = composeAnomalyBehaviourPredictiveRisk({
    baseline,
    observatory,
    capacity,
    incidents
  });
  const adaptive = composeAdaptiveMasterControl({
    risk,
    runtimeSamples: []
  });
  const model = composeMasterControlReadinessCertification({
    adaptive
  });

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 360 · Master Control Boundary Certification
        </p>
        <h1>
          Advanced Control Readiness, Supervised Self-Healing &amp;
          Autonomous-Control Boundary Certification
        </h1>
        <p className="lead">
          Certify what the Master Shell may automate safely, what must remain
          supervised, and what is explicitly denied before the larger source
          applications are onboarded.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/adaptive-master-control">
            Adaptive Master Control
          </Link>
          <Link className="secondaryButton" href="/incident-runbook-recovery">
            Incident Runbooks
          </Link>
          <Link className="secondaryButton" href="/anomaly-predictive-risk">
            Predictive Risk
          </Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Master certification summary">
        <div className="commandMetrics">
          <article>
            <strong>{model.certification.readOnlyAutonomyCertified}</strong>
            <span>read-only controls certified</span>
          </article>
          <article>
            <strong>{model.certification.supervisedOnly}</strong>
            <span>supervised controls</span>
          </article>
          <article>
            <strong>{model.certification.blockedUntilMasterActivation}</strong>
            <span>blocked until Master activation</span>
          </article>
          <article>
            <strong>{model.certification.deniedAutonomy}</strong>
            <span>autonomy boundaries denied</span>
          </article>
          <article>
            <strong>
              {model.certification.slaveApplicationsMayBegin ? "YES" : "NO"}
            </strong>
            <span>larger source onboarding may begin</span>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Three Masters first. Larger applications remain gated.</strong>
        <p>
          Build 360 requires AI Data Platform, Rosevear Comms Hub and
          Rosevear AI Hub to complete their protected monitoring/incident
          activation before Yard Workers, iCamp, Rosie Dazzlers or Devil n
          Dove move into the next integration stage.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Activation handoff</p>
            <h2>Two commands for the remaining Master planes</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.activationTargets.map((target) => (
            <article className="reviewBatchSummary" key={target.planeId}>
              <span className="reviewStatus">
                {target.observedBuild} · {target.mode}
              </span>
              <h3>{target.planeId}</h3>
              <p>
                <strong>Activation token:</strong>{" "}
                <code>{target.commandToken}</code>
              </p>
              <p>
                <strong>Next build:</strong> {target.nextBuild}
              </p>
              <p>
                <strong>Observed production baseline:</strong>{" "}
                <code>{target.observedProductionBaseline}</code>
              </p>
              <ul>
                {target.requirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Autonomous-control certification</p>
            <h2>What may run automatically and what may not</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.controls.map((control) => (
            <article className="reviewBatchSummary" key={control.id}>
              <span
                className={
                  "reviewStatus reviewStatus--" +
                  statusClass(control.certification)
                }
              >
                {control.certification}
              </span>
              <h3>{control.label}</h3>
              <p><strong>Owner:</strong> {control.ownerPlane}</p>
              <p>
                <strong>Automatic execution:</strong>{" "}
                {control.automaticExecutionAllowed ? "allowed" : "not allowed"}
                {" · "}
                <strong>approval:</strong>{" "}
                {control.approvalRequired ? "required" : "not required"}
              </p>
              <p>{control.rationale}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Fail-closed boundary</p>
            <h2>Autonomous actions explicitly denied</h2>
          </div>
        </div>
        <ul>
          {model.deniedAutonomousActions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Current Master state: activation evidence still pending.</strong>
        {model.certification.pendingMasterPrerequisites.map((item) => (
          <p key={item}>{item}</p>
        ))}
        <p>
          AI Data is ready to consume protected read-only telemetry. Comms and
          AI Hub must activate their next numbered builds before this screen can
          certify the Masters as synchronized.
        </p>
      </section>
    </main>
  );
}
