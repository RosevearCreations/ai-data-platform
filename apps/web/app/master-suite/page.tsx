import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { buildMasterShellCommandCenter } from "@/lib/master-shell-command-center";
import {
  MASTER_INSTRUMENT_CHILD_SHELLS,
  MASTER_INSTRUMENT_MODULES,
  MASTER_INSTRUMENT_THEME_VERSION
} from "@/lib/master-instrument-navigation";

export const dynamic = "force-dynamic";

function stateClass(value: string) {
  return value.toLowerCase().replaceAll("_", "-");
}

export default async function MasterSuitePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fmaster-suite");
  }

  const model = await buildMasterShellCommandCenter(session.user.id);
  const aiData = model.views.applications.find(
    (item) => item.sourceId === "ai-data-platform"
  );
  const aiHub = model.views.applications.find(
    (item) => item.sourceId === "rosevear-ai-hub"
  );

  const runtimeState = (id: string) => {
    if (id === "ai-data-platform") {
      return aiData?.effectiveStatus ?? "UNMEASURED";
    }
    if (id === "rosevear-comms-hub") {
      return model.views.comms.projectionState;
    }
    if (id === "rosevear-ai-hub") {
      return aiHub?.effectiveStatus ?? "UNMEASURED";
    }
    return "UNMEASURED";
  };

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 388 · Rosevear Unified Master Instrument</p>
        <h1>One Master Console, Three Authority-Preserving Modules</h1>
        <p className="lead">
          AI Data Platform, Rosevear Comms Hub and Rosevear AI Hub now share one
          instrument navigation and fusion layout. Their visual shell is unified;
          their authentication, source identity and operational authority remain
          independent and fail-closed.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/master-shell-command-center">
            Intelligence
          </Link>
          <Link className="secondaryButton" href="/comms-complementary-plane">
            Communications
          </Link>
          <Link className="secondaryButton" href="/master-application-inventory">
            Runtime
          </Link>
          <Link className="secondaryButton" href="/master-sysop">
            Sysop
          </Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Master module fusion summary">
        <div className="commandMetrics">
          <article>
            <strong>3</strong>
            <span>Master modules</span>
          </article>
          <article>
            <strong>{MASTER_INSTRUMENT_THEME_VERSION}</strong>
            <span>shared instrument contract</span>
          </article>
          <article>
            <strong>{model.views.management.connectedApplications}</strong>
            <span>connected source applications</span>
          </article>
          <article>
            <strong>{model.attentionQueue.length}</strong>
            <span>evidence-backed attention items</span>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Fusion is navigation, not authority transfer.</strong>
        <p>
          The three modules remain independently authoritative. A shared visual
          surface cannot turn discovery, deployment, catalogue presence or another
          module&apos;s status into acceptance.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Master module fusion</p>
            <h2>Three peer planes in one operating console</h2>
          </div>
        </div>
        <div className="masterFusionGrid">
          {MASTER_INSTRUMENT_MODULES.map((module) => {
            const state = runtimeState(module.id);
            return (
              <article className="reviewBatchSummary masterFusionCard" key={module.id}>
                <span className={"reviewStatus reviewStatus--" + stateClass(state)}>
                  {state}
                </span>
                <p className="masterFusionLabel">{module.label}</p>
                <h3>{module.displayName}</h3>
                <p>{module.role}</p>
                <div className="masterAuthorityBoundary">
                  <strong>Authority boundary</strong>
                  <span>{module.authorityBoundary}</span>
                </div>
                <Link className="secondaryButton" href={module.href}>
                  Open {module.label}
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Product shells</p>
            <h2>Yard Workers and iCamp oversight</h2>
          </div>
        </div>
        <div className="masterChildShellGrid">
          {MASTER_INSTRUMENT_CHILD_SHELLS.map((shell) => (
            <article className="reviewBatchSummary" key={shell.id}>
              <span className="reviewStatus">PRODUCT SHELL</span>
              <h3>{shell.displayName}</h3>
              <p>{shell.tenancyNote}</p>
              <Link className="secondaryButton" href={shell.href}>
                Open shell oversight
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 391 visual governance</p>
            <h2>Theme drift and responsive-parity monitoring</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Five-shell drift watch</h3>
            <p>Current evidence must keep every governed shell on the certified instrument contract.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Responsive regression</h3>
            <p>YW and iCamp retain desktop, tablet and mobile parity as an evidence-backed requirement.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Three-Master closure</h3>
            <p>Intelligence, Communications and Runtime acknowledgement is required before visual-governance closure.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Fail-closed acceptance</h3>
            <p>Deployment GREEN cannot manufacture theme acceptance or close missing visual evidence.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 392 remediation governance</p>
            <h2>Exception routing, SLA tracking and re-certification</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Owner-routed exceptions</h3>
            <p>Every Build 391 drift or responsive regression requires a distinct owner-assigned remediation route.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Remediation SLA</h3>
            <p>Open visual exceptions remain measurable against their due time and surface an explicit breach when overdue.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Re-certification gate</h3>
            <p>Resolved work requires current-theme, responsive-parity, owner-accepted and independently verified evidence.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Fail-closed restoration</h3>
            <p>Production GREEN alone cannot resolve visual drift, close an SLA exception or manufacture re-certification.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 393 stability governance</p>
            <h2>Post-re-certification stability and recurrence prevention</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Five-shell stability watch</h3>
            <p>Every governed shell requires current independent evidence that the certified visual contract remains stable.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Remediation effectiveness</h3>
            <p>Previously remediated shells must prove a stable observation window with no recurrent drift.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Recurrence prevention</h3>
            <p>Cross-shell preventive controls require owner acceptance and independent verification after the newest samples.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Fail-closed continuity</h3>
            <p>Production GREEN cannot prove visual stability, erase recurrence or substitute for post-recertification evidence.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 394 long-horizon governance</p>
            <h2>Trend correlation, control degradation and recurrence risk</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Long-horizon trend correlation</h3>
            <p>Every governed shell must retain independently observed stability across 24-hour-or-longer evidence windows.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Preventive-control degradation</h3>
            <p>Expected controls remain measurable; missing health, degradation signals or failed review prevents visual-governance closure.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Recurrence risk forecasting</h3>
            <p>Evidence-backed forecasts cover every shell and surface high or critical recurrence risk before it becomes another drift event.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Fail-closed long horizon</h3>
            <p>Production GREEN cannot erase a degrading trend, unhealthy preventive control or elevated visual recurrence risk.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Theme governance</p>
            <h2>Cross-shell visual contract</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Navigation language</h3>
            <p>Persistent Master strip plus contextual module rail.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Instrument language</h3>
            <p>Compact KPI cards, semantic status colors and dense dark panels.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Responsive parity</h3>
            <p>Desktop, tablet and mobile retain equivalent operational meaning.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Authority preservation</h3>
            <p>Theme compliance cannot grant trust, acceptance or source authority.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
