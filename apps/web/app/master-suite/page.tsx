import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ServerModuleControlPanel } from "@/components/server-module-control-panel";
import { ServerShellThemeAcceptancePanel } from "@/components/server-shell-theme-acceptance-panel";
import { auth } from "@/lib/auth";
import { buildMasterShellCommandCenter } from "@/lib/master-shell-command-center";
import {
  MASTER_INSTRUMENT_CHILD_SHELLS,
  MASTER_INSTRUMENT_MODULES,
  SERVER_SHELL_ID,
  SERVER_SHELL_PRIMARY_AUTOMATION_HOST,
  SERVER_SHELL_THEME_PROFILES
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
        <p className="eyebrow">Build 424 · Rosevear Server Shell</p>
        <h1>Operational Maturity Closure, Security Renewal & Next Roadmap Ceremony</h1>
        <p className="lead">
          AI Data Platform is the outer Rosevear Server Shell. Data & Intelligence,
          AI/Home/Automation and Communications/Operations now present as three
          owner-gated modules in one system while preserving their security,
          source identity and operational authority boundaries. Module control intents
          are audited in the cloud and executed only by the protected Windows host.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/master-shell-command-center">
            Data & Intelligence
          </Link>
          <Link className="secondaryButton" href="/comms-complementary-plane">
            Communications & Operations
          </Link>
          <Link className="secondaryButton" href="/master-application-inventory">
            AI, Home & Automation
          </Link>
          <Link className="secondaryButton" href="/master-sysop">
            Sysop
          </Link>
          <Link className="secondaryButton" href="/acceptance-advancement">
            Acceptance & +10 Evidence
          </Link>
          <Link className="secondaryButton" href="/acceleration-closure">
            Build 414 Closure
          </Link>
          <Link className="secondaryButton" href="/evidence-freshness">
            Evidence Freshness
          </Link>
          <Link className="secondaryButton" href="/original-host-continuity">
            Original-Host Continuity
          </Link>
          <Link className="secondaryButton" href="/communications-delivery-operations">
            Communications SLA
          </Link>
          <Link className="secondaryButton" href="/recovery-rollback-certification">
            Recovery & Rollback
          </Link>
          <Link className="secondaryButton" href="/performance-capacity-guardrails">
            Performance & Usage Guardrails
          </Link>
          <Link className="secondaryButton" href="/accessibility-device-network-recertification">
            Accessibility & Network Re-Certification
          </Link>
          <Link className="secondaryButton" href="/tenant-consent-capability-renewal">
            Tenant, Consent & Capability Renewal
          </Link>
          <Link className="secondaryButton" href="/data-lifecycle-dlp-renewal">
            Data Lifecycle & DLP Renewal
          </Link>
          <Link className="secondaryButton" href="/operator-production-ceremony">
            Operator Acceptance & Production Ceremony
          </Link>
          <Link className="secondaryButton" href="/operational-maturity-closure">
            Operational Maturity Closure
          </Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Master module fusion summary">
        <div className="commandMetrics">
          <article>
            <strong>3</strong>
            <span>Server modules</span>
          </article>
          <article>
            <strong>{SERVER_SHELL_THEME_PROFILES.length}</strong>
            <span>selectable module themes</span>
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
        <strong>{SERVER_SHELL_ID}: convergence without authority transfer.</strong>
        <p>
          Each module is independently disableable through an owner-gated control
          path, and a disabled module must fail closed without taking down the outer
          Server Shell. The primary 24/7 automation host role is
          {" "}{SERVER_SHELL_PRIMARY_AUTOMATION_HOST}; Production GREEN never proves
          that the physical Windows server has been updated.
        </p>
      </section>

      <p className="dataQualityPolicyNote">
        Build 388 continuity: One Master Console, Three Authority-Preserving Modules.
        Fusion is navigation, not authority transfer.
      </p>

      <p className="dataQualityPolicyNote">
        Build 390 continuity: Yard Workers and iCamp oversight remains governed by the
        Cross-shell visual contract while the Server Shell adds richer read-only monitoring.
      </p>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Server module convergence</p>
            <h2>Three server modules in one operating shell</h2>
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
                <div className="masterAuthorityBoundary">
                  <strong>Server Shell controls</strong>
                  <span>
                    Owner switch · independently disableable · fail closed · themes:
                    {" "}{module.themeProfiles.join(" / ")}
                  </span>
                </div>
                <Link className="secondaryButton" href={module.href}>
                  Open {module.label}
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <ServerShellThemeAcceptancePanel />

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Slave-shell monitoring</p>
            <h2>Futuristic YW and iCamp status screens</h2>
          </div>
        </div>
        <div className="masterChildShellGrid">
          {MASTER_INSTRUMENT_CHILD_SHELLS.map((shell) => (
            <article className="reviewBatchSummary" key={shell.id}>
              <span className="reviewStatus">SLAVE APPLICATION SHELL</span>
              <h3>{shell.displayName}</h3>
              <p>{shell.tenancyNote}</p>
              <p>
                Read-only server monitoring: deployment · runtime health · source revision ·
                signer/receiver · queue/DLQ · latency/errors · migrations · security holds ·
                Vercel quota. Missing evidence displays UNKNOWN/HOLD.
              </p>
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
            <p className="eyebrow">Build 395 predictive governance</p>
            <h2>Threshold calibration, intervention readiness and risk escalation</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Predictive threshold calibration</h3>
            <p>Measured recurrence evidence calibrates warning and escalation thresholds for every governed shell, with owner approval and independent verification.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Intervention readiness</h3>
            <p>Preventive controls, rollback, runbooks and owner-on-call coverage must all be ready before elevated recurrence risk can close.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Cross-shell escalation</h3>
            <p>Every shell receives a current NORMAL, WATCH, ACTION or CRITICAL decision bound to the calibrated thresholds and verified risk evidence.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Fail-closed predictive governance</h3>
            <p>Production GREEN cannot invent threshold calibration, intervention readiness or compliant escalation evidence.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 396 feedback governance</p>
            <h2>Threshold drift, intervention outcomes and feedback recalibration</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Threshold drift monitoring</h3>
            <p>Every governed shell compares its calibrated warning and escalation thresholds against fresh evidence-backed recommendations.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Intervention outcome effectiveness</h3>
            <p>Invoked interventions must demonstrate lower recurrence risk, no recurrence and a verified observation window before they are considered effective.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Feedback recalibration</h3>
            <p>Stable thresholds may be retained explicitly; drifted thresholds must be recalibrated to independently observed recommendations with owner approval.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Fail-closed feedback loop</h3>
            <p>Production GREEN cannot replace threshold-drift, intervention-outcome or recalibration evidence.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 397 confidence governance</p>
            <h2>Recalibrated stability, persistent outcomes and escalation confidence</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Recalibrated threshold stability</h3>
            <p>Every governed shell must keep its recalibrated thresholds stable through a verified 24-hour evidence window with no recurrence or threshold breach.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Intervention outcome persistence</h3>
            <p>Previously effective interventions must keep recurrence risk at or below their verified post-intervention baseline across a longer persistence window.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Escalation confidence</h3>
            <p>Cross-shell escalation decisions require current threshold and intervention evidence plus independently verified confidence of at least 70%.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Fail-closed confidence loop</h3>
            <p>Production GREEN cannot substitute for threshold stability, outcome persistence or evidence-backed escalation confidence.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 398 assurance renewal</p>
            <h2>Confidence stability, persistence drift and escalation assurance renewal</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Confidence stability monitoring</h3>
            <p>Every governed shell must keep confidence above the verified floor and within a bounded post-recalibration drop budget across current evidence.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Persistence drift detection</h3>
            <p>Previously effective interventions are watched for renewed recurrence risk; drift beyond the allowed basis-point budget fails closed.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Escalation assurance renewal</h3>
            <p>Confidence, threshold and persistence evidence must all be current before owner renewal and independent verification can renew cross-shell assurance.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Fail-closed renewal</h3>
            <p>Production GREEN cannot extend expired or degraded assurance without fresh evidence-backed renewal.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 399 long-horizon governance</p>
            <h2>Assurance stability, drift recovery and confidence early warning</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Assurance renewal stability</h3>
            <p>Every governed shell must sustain a verified renewal cadence across a 72-hour horizon with no missed assurance renewals.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Drift recovery effectiveness</h3>
            <p>Detected persistence drift must recover through a measured window, reduce residual drift to 250 basis points or less and avoid recurrence.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Confidence degradation early warning</h3>
            <p>Projected confidence is classified CLEAR, WATCH or ACTION; managed WATCH signals require mitigation readiness before closure.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Fail-closed long horizon</h3>
            <p>Production GREEN cannot replace long-horizon assurance, recovery-effectiveness or confidence early-warning evidence.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 400 predictive renewal governance</p>
            <h2>Warning response, assurance recovery and predictive renewal</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Warning response effectiveness</h3>
            <p>Triggered confidence warnings must show measurable recovery through a verified observation window and restore confidence above the governed floor.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Assurance degradation recovery</h3>
            <p>Long-horizon degradation must prove sustained recovery, no missed renewals and no recurrence before assurance can close again.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Predictive renewal governance</h3>
            <p>Forecasted confidence deterioration requires advance renewal scheduling before the projected drop becomes an assurance failure.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Fail-closed predictive renewal</h3>
            <p>Production GREEN cannot substitute for response-effectiveness, degradation-recovery or predictive-renewal evidence.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 401 execution governance</p>
            <h2>Renewal execution, confidence restoration and forecast accuracy</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Predictive renewal execution</h3>
            <p>Advance renewals required by Build 400 must execute with verified lead time before the projected confidence breach.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Post-renewal confidence restoration</h3>
            <p>Executed renewals must restore confidence above the governed floor through a measured observation window with no recurrence.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Forecast accuracy governance</h3>
            <p>Predicted and observed confidence are reconciled across every governed shell; excessive forecast error forces recalibration.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Seven-application GitHub topology</h3>
            <p>AI Data Platform validates the three Masters, YW/iCamp governed shells, and direct Devil n Dove/Rosie Master linkages from one repository topology contract without transferring operational authority.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 402 continuity governance</p>
            <h2>Forecast recalibration, renewal timing and seven-application continuity</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Forecast recalibration effectiveness</h3>
            <p>Forecasts outside the 500-basis-point accuracy budget must return inside tolerance through a measured, independently verified recalibration window.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Renewal timing optimization</h3>
            <p>Required predictive renewals must execute inside the governed 6–24 hour lead window without allowing the projected threshold breach.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Seven-application linkage continuity</h3>
            <p>All three Masters, both governed shells and both direct applications require fresh production-main topology evidence with no authority transfer.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Fail-closed continuity</h3>
            <p>Production GREEN cannot replace current recalibration, optimized renewal timing or independently verified repository-linkage continuity.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 403 recurrence-prevention governance</p>
            <h2>Recalibration persistence, renewal drift recovery and linkage recurrence prevention</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Recalibration persistence validation</h3>
            <p>Forecast accuracy must remain inside the 500-basis-point budget across a 72-hour evidence horizon with at least seven independently verified samples.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Renewal timing drift recovery</h3>
            <p>Timing that leaves the governed 6–24 hour lead window must return inside it through a measured recovery window without threshold breach or recurrence.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Seven-application recurrence prevention</h3>
            <p>All three Masters, both governed shells and both direct applications require recurrence-free topology evidence with current hashes and no authority transfer.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Fail-closed recurrence prevention</h3>
            <p>Production GREEN cannot replace sustained recalibration accuracy, timing-drift recovery or independently verified recurrence-prevention evidence.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 407 zero-trust transport</p>
            <h2>Signed service identity, secretless routing and strict transport across all seven applications</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Ed25519 service identity</h3>
            <p>Every application uses an independently reviewed service principal with issuer, audience, body-digest and one-time nonce binding. Raw private keys never enter cross-application contracts.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>28 directional transport policies</h3>
            <p>Every canonical relationship is governed in both directions with verified TLS, replay defense, secret-reference-only routing, no T5 transport and no delegated authority.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Devil n Dove + Rosie → all three Masters</h3>
            <p>Both direct Master applications must retain authenticated routes to AI Data Platform, Rosevear AI Hub and Rosevear Comms Hub before the transport gate can close.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>dev / main only</h3>
            <p>Only dev and main are valid long-term branches. All feature, release, fix and historical branches are cleanup-only after their merged work is verified.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 408 fine-grained authorization</p>
            <h2>Capability-level authorization, consent boundaries and independent synchronization</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>42 capability-tier policies</h3>
            <p>Seven applications × six canonical access tiers are deny-by-default, exact-capability scoped and cross-tenant denied; T5 remains non-delegable.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Consent + tenant isolation</h3>
            <p>Personal-data access requires purpose-bound revocable consent while API, PostgreSQL RLS and storage boundaries preserve tenant and workspace isolation.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>28 bounded delegations</h3>
            <p>Every directional relationship preserves capability, audience, tenant, workspace and consent scope with 24-hour maximum lifetime, no subdelegation and no authority transfer.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Independent releases · protocol 1.1</h3>
            <p>Additive changes remain compatible with protocol 1.0 peers. Vercel limits on AI Data Platform, YW or iCamp do not force unrelated applications into a lockstep deployment.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 409 event/message V2</p>
            <h2>Version-negotiated envelopes, durable delivery and bounded replay across all directional routes</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>28 V2/V1-negotiated routes</h3>
            <p>Every directional relationship prefers event contract V2 while retaining V1 fallback through peer-version negotiation, so independent releases remain compatible.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Durable ACK + dedupe</h3>
            <p>At-least-once delivery requires acknowledgement, idempotency, duplicate suppression, bounded retries and dead-letter routing without repeating side effects.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Correlation continuity</h3>
            <p>Correlation, causation, trace, source identity, tenant, workspace, capability, consent and authority context remain preserved across message hops.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>DLQ + bounded replay</h3>
            <p>Replay is digest-bound, capped at 168 hours, denied after revocation or consent withdrawal, and owner-gated for consequential work without expanding authority.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 411 privileged module/service controls</p>
            <h2>Owner-gated enable, disable and restart intents with Windows-host custody</h2>
          </div>
        </div>
        <ServerModuleControlPanel
          modules={[
            {
              moduleId: "ai-data-platform",
              displayName: "Data & Intelligence",
              runtimeState: runtimeState("ai-data-platform")
            },
            {
              moduleId: "rosevear-ai-hub",
              displayName: "AI, Home & Automation",
              runtimeState: runtimeState("rosevear-ai-hub")
            },
            {
              moduleId: "rosevear-comms-hub",
              displayName: "Communications & Operations",
              runtimeState: runtimeState("rosevear-comms-hub")
            }
          ]}
        />
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 410 sensitive-data assurance</p>
            <h2>Classification, encryption, redaction, retention and DLP across the Server Shell</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>35 classification policies</h3>
            <p>Seven applications × five data classes define encryption, redaction, export inspection, retention and deletion-evidence boundaries.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Encryption + redaction</h3>
            <p>Sensitive data requires protected transport and storage; secrets require field-level protection and never enter logs, audit evidence or cross-app messages.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Retention + DLP</h3>
            <p>Purpose-bound retention, expiry/deletion evidence, export inspection, owner-gated restricted export and cross-tenant exfiltration prevention are mandatory.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>24/7 local automation boundary</h3>
            <p>Home Assistant, MQTT, cameras, Ollama and deterministic automations stay inside the AI Hub module on the Windows server; hazardous autonomous actions remain forbidden.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 406 unified security baseline</p>
            <h2>One access model, explicit trust, and locked completion denominators across all seven applications</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Six access tiers × five control domains</h3>
            <p>T0–T5 define authority scope while Build 405's five security domains apply across every tier, preventing the three Masters from drifting into incompatible security vocabularies.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Explicit 14-relationship trust matrix</h3>
            <p>Trust is source-bound, non-transitive and non-delegating. Raw secret sharing and direct peer database writes stay forbidden, with consequential operations owner-gated.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>91 locked completion denominators</h3>
            <p>Seven applications × thirteen functional, security and operational aspects receive evidence-backed denominators before any +10-point advancement can be claimed.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>T5 stays off ordinary transport</h3>
            <p>The original-host owner ceremony cannot be granted by T4 or transported through normal HTTP, queues, Vercel, Cloudflare or customer sessions.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 405 suite acceleration governance</p>
            <h2>Assurance renewal, five-tier security, communications re-certification and measurable completion acceleration</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Five-tier security re-certification</h3>
            <p>All seven applications must independently certify identity/provenance, transport/authentication, authorization/tenant/consent, data/audit/replay/fail-closed and privileged-operation/recovery tiers.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>14 cross-application relationships</h3>
            <p>Canonical Master-to-application relationships require authenticated transport, audience binding, tenant isolation, replay defense, classified payloads and zero secret sharing.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>49 completion acceleration targets</h3>
            <p>Seven applications × seven independent completion axes receive evidence-backed baselines and minimum +10 percentage-point targets, capped at 100%.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Authority-preserving communications</h3>
            <p>AI Data Platform keeps validation authority, Comms Hub keeps communications authority, applications keep operational authority, and consequential writes remain owner-gated.</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 404 long-horizon assurance governance</p>
            <h2>Recalibration stability, recovery effectiveness and seven-application prevention assurance</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Long-horizon recalibration stability</h3>
            <p>Forecast accuracy must remain inside the 500-basis-point budget across a seven-day evidence horizon with at least 14 independently verified samples.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Renewal drift recovery effectiveness</h3>
            <p>Every detected timing-drift event must remain recovered inside the governed 6–24 hour lead window without breach or recurrence through a 72-hour effectiveness horizon.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Seven-application prevention assurance</h3>
            <p>All seven application links require current hashes, canonical identity, seven-day assurance evidence and zero continuity, stale-evidence or authority-transfer recurrence.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Fail-closed long-horizon assurance</h3>
            <p>Production GREEN cannot replace long-horizon recalibration stability, recovery effectiveness or independently verified linkage prevention assurance.</p>
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
