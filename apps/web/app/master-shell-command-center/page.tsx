import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  buildMasterShellCommandCenter
} from "@/lib/master-shell-command-center";

export const dynamic = "force-dynamic";

function pct(value: number | null | undefined) {
  return value === null || value === undefined
    ? "UNAVAILABLE"
    : value.toFixed(2) + "%";
}

function stateClass(value: string) {
  return value.toLowerCase().replaceAll("_", "-");
}

export default async function MasterShellCommandCenterPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fmaster-shell-command-center"
    );
  }

  const model = await buildMasterShellCommandCenter(
    session.user.id
  );

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 340 · Rosevear Suite Master Shell
        </p>
        <h1>Master Shell Command Center V1</h1>
        <p className="lead">
          One read-only operational view for Applications, I.T./Security,
          Management and Statistics. Every status remains tied to current
          evidence; discovery, deployment and catalogue presence do not become
          acceptance.
        </p>
        <div className="heroActions">
          <Link
            className="secondaryButton"
            href="/master-application-inventory"
          >
            Applications
          </Link>
          <Link className="secondaryButton" href="/integration-health">
            I.T. / Security
          </Link>
          <Link className="secondaryButton" href="/master-completion">
            Management
          </Link>
          <Link
            className="secondaryButton"
            href="/comms-complementary-plane"
          >
            Comms Plane
          </Link>
          <Link
            className="secondaryButton"
            href="/cross-application-interaction-trace"
          >
            Interaction Trace
          </Link>
          <Link
            className="secondaryButton"
            href="/module-health-intelligence"
          >
            Module Health
          </Link>
          <Link
            className="secondaryButton"
            href="/role-device-acceptance"
          >
            Role / Device Acceptance
          </Link>
          <a
            className="secondaryButton"
            href="/api/master-shell-command-center"
          >
            Command Center JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Evidence first.</strong>
        <p>
          Suite-wide completion remains unavailable until all six applications
          have approved, calculable source-wide Master Completion scopes.
          UNKNOWN, STALE, HOLD and unmeasured evidence remain visible rather
          than being converted into artificial success or failure.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Attention</p>
            <h2>What needs attention now?</h2>
          </div>
        </div>
        {model.attentionQueue.length ? (
          <div className="reviewBatchList">
            {model.attentionQueue.map((item) => (
              <article className="reviewBatchSummary" key={item.id}>
                <span
                  className={
                    "reviewStatus reviewStatus--" +
                    stateClass(item.state)
                  }
                >
                  {item.area} · {item.state}
                </span>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
                <Link className="secondaryButton" href={item.href}>
                  Review evidence
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            No current evidence-backed attention item is present.
          </div>
        )}
      </section>

      <section className="reviewQueue" id="applications">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Applications</p>
            <h2>Six-source suite overview</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.views.applications.map((app) => (
            <article className="reviewBatchSummary" key={app.sourceId}>
              <span
                className={
                  "reviewStatus reviewStatus--" +
                  stateClass(app.attentionState)
                }
              >
                {app.effectiveStatus} · {app.freshness}
              </span>
              <h3>{app.displayName}</h3>
              <p>
                <code>{app.sourceId}</code> ·{" "}
                <code>{app.repository}</code>
              </p>
              <p>
                Modules <strong>{app.modules}</strong> · fresh{" "}
                <strong>{app.modulesFresh}</strong> · stale{" "}
                <strong>{app.modulesStale}</strong> · unmeasured{" "}
                <strong>{app.modulesUnmeasured}</strong>
              </p>
              <p>
                Source-wide completion{" "}
                <strong>
                  {app.completion
                    ? pct(app.completion.percent)
                    : "UNSCOPED"}
                </strong>{" "}
                · evidence coverage{" "}
                <strong>
                  {app.evidenceCoverage
                    ? pct(app.evidenceCoverage.percent)
                    : "UNSCOPED"}
                </strong>
              </p>
              <p>
                Latest release{" "}
                <strong>
                  {app.latestRelease
                    ? app.latestRelease.releaseId +
                      " / " +
                      app.latestRelease.deploymentStatus +
                      " / " +
                      app.latestRelease.freshness
                    : "UNMEASURED"}
                </strong>
              </p>
              <Link
                className="secondaryButton"
                href="/master-application-inventory"
              >
                Open application evidence
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue" id="comms">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Comms complementary plane</p>
            <h2>Incident and follow-up read model</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          <article className="reviewBatchSummary">
            <span
              className={
                "reviewStatus reviewStatus--" +
                stateClass(model.views.comms.projectionState)
              }
            >
              {model.views.comms.projectionState}
            </span>
            <h3>Rosevear Comms Hub</h3>
            <p>
              Relationship <strong>complementary control plane</strong> ·
              application-count contribution <strong>0</strong> ·
              source-count contribution <strong>0</strong>
            </p>
            <p>
              Current real incident count known{" "}
              <strong>
                {model.views.comms.realIncidentCountKnown ? "yes" : "no"}
              </strong>{" "}
              · current real follow-up count known{" "}
              <strong>
                {model.views.comms.realFollowUpCountKnown ? "yes" : "no"}
              </strong>
            </p>
            <p>
              Read-only groups{" "}
              <strong>
                {model.views.comms.summary.displayedCorrelationGroups}
              </strong>{" "}
              · evidence-aware follow-up suggestions{" "}
              <strong>
                {model.views.comms.summary.displayedFollowUpSuggestions}
              </strong>
            </p>
            <Link
              className="secondaryButton"
              href="/comms-complementary-plane"
            >
              Open Comms evidence
            </Link>
          </article>
        </div>
      </section>

      <section className="reviewQueue" id="it-security">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">I.T. / Security</p>
            <h2>Measured integration and security evidence</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          <article className="reviewBatchSummary">
            <span className="reviewStatus">
              I.T. state · {model.views.it.state}
            </span>
            <h3>Integration health</h3>
            <p>
              Database{" "}
              <strong>{model.views.it.databaseLatencyMs} ms</strong> ·
              connector average{" "}
              <strong>
                {model.views.it.connectorAverageLatencyMs ??
                  "UNMEASURED"}
              </strong>{" "}
              ms · connector max{" "}
              <strong>
                {model.views.it.connectorMaxLatencyMs ??
                  "UNMEASURED"}
              </strong>{" "}
              ms
            </p>
            <p>
              Queued events <strong>{model.views.it.queuedEvents}</strong> ·
              degraded services{" "}
              <strong>{model.views.it.degradedServices}</strong> ·
              unmeasured peers{" "}
              <strong>{model.views.it.unmeasuredPeers}</strong>
            </p>
            <Link className="secondaryButton" href="/integration-health">
              Open integration health
            </Link>
          </article>

          <article className="reviewBatchSummary">
            <span className="reviewStatus">
              Security evidence · {model.views.it.security.state}
            </span>
            <h3>Security &amp; controlled-delivery indicators</h3>
            <p>
              Credential references needing attention{" "}
              <strong>
                {
                  model.views.it.security
                    .credentialReferencesNeedingAttention
                }
              </strong>{" "}
              · critical credential references{" "}
              <strong>
                {model.views.it.security.criticalCredentialReferences}
              </strong>
            </p>
            <p>
              Webhook denials / 24h{" "}
              <strong>{model.views.it.security.webhookDenied24h}</strong> ·
              delivery failures / 24h{" "}
              <strong>
                {model.views.it.security.deliveryFailures24h}
              </strong>{" "}
              · dead letters{" "}
              <strong>{model.views.it.security.deadLetters}</strong>
            </p>
            <p>
              Credential values read <strong>no</strong> · remote
              availability inferred <strong>no</strong>
            </p>
          </article>

          {model.views.it.signals.map((signal) => (
            <article className="reviewBatchSummary" key={signal.id}>
              <span className="reviewStatus">
                {signal.state}
              </span>
              <h3>{signal.label}</h3>
              <p>
                <strong>{signal.value}</strong>
              </p>
              <p>{signal.detail}</p>
              <Link className="secondaryButton" href={signal.href}>
                Review source evidence
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue" id="management">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Management</p>
            <h2>Portfolio readiness without invented percentages</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          <article className="reviewBatchSummary">
            <h3>Application readiness</h3>
            <p>
              Connected applications{" "}
              <strong>
                {model.views.management.connectedApplications}/
                {model.views.management.applications}
              </strong>{" "}
              · applications requiring attention{" "}
              <strong>
                {model.views.management.applicationsRequiringAttention}
              </strong>
            </p>
            <p>
              Approved source-wide completion scopes{" "}
              <strong>
                {model.views.management.sourceWideCompletionScopes}/
                {model.views.management.applications}
              </strong>{" "}
              · calculable{" "}
              <strong>
                {model.views.management.sourceWideCompletionCalculable}/
                {model.views.management.applications}
              </strong>
            </p>
            <p>
              Scope coverage{" "}
              <strong>
                {pct(
                  model.views.management
                    .sourceWideCompletionCoveragePercent
                )}
              </strong>{" "}
              · calculable coverage{" "}
              <strong>
                {pct(
                  model.views.management
                    .sourceWideCalculableCoveragePercent
                )}
              </strong>
            </p>
          </article>

          <article className="reviewBatchSummary">
            <h3>Suite completion</h3>
            <p>
              Portfolio completion{" "}
              <strong>
                {pct(
                  model.views.management.portfolioCompletionPercent
                )}
              </strong>
            </p>
            {model.views.management.portfolioCompletionBlocked ? (
              <p>
                {
                  model.views.management
                    .portfolioCompletionBlockReason
                }
              </p>
            ) : (
              <p>
                Numerator{" "}
                <strong>
                  {
                    model.views.management
                      .portfolioCompletionNumerator
                  }
                </strong>{" "}
                / denominator{" "}
                <strong>
                  {
                    model.views.management
                      .portfolioCompletionDenominator
                  }
                </strong>
              </p>
            )}
            <Link className="secondaryButton" href="/master-completion">
              Open Master Completion
            </Link>
          </article>
        </div>
      </section>

      <section className="reviewQueue" id="statistics">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Statistics</p>
            <h2>Evidence-backed suite totals</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          <article className="reviewBatchSummary">
            <h3>Source freshness</h3>
            <p>
              Fresh{" "}
              <strong>
                {model.views.statistics.sourceFreshness.fresh} ·{" "}
                {pct(
                  model.views.statistics.sourceFreshness
                    .freshPercent
                )}
              </strong>{" "}
              · stale{" "}
              <strong>
                {model.views.statistics.sourceFreshness.stale} ·{" "}
                {pct(
                  model.views.statistics.sourceFreshness
                    .stalePercent
                )}
              </strong>{" "}
              · unmeasured{" "}
              <strong>
                {
                  model.views.statistics.sourceFreshness
                    .unmeasured
                }{" "}
                ·{" "}
                {pct(
                  model.views.statistics.sourceFreshness
                    .unmeasuredPercent
                )}
              </strong>
            </p>
          </article>

          <article className="reviewBatchSummary">
            <h3>Module evidence</h3>
            <p>
              Total <strong>{model.views.statistics.modules.total}</strong> ·
              fresh readiness{" "}
              <strong>
                {model.views.statistics.modules.freshReadiness}
              </strong>{" "}
              · stale{" "}
              <strong>
                {model.views.statistics.modules.staleReadiness}
              </strong>{" "}
              · unmeasured{" "}
              <strong>
                {model.views.statistics.modules.unmeasuredReadiness}
              </strong>
            </p>
            <p>
              Approved completion scopes{" "}
              <strong>
                {
                  model.views.statistics.modules
                    .approvedCompletionScopes
                }{" "}
                ·{" "}
                {pct(
                  model.views.statistics.modules
                    .approvedCompletionScopePercent
                )}
              </strong>{" "}
              · calculable completion{" "}
              <strong>
                {model.views.statistics.modules.calculableCompletion} ·{" "}
                {pct(
                  model.views.statistics.modules
                    .calculableCompletionPercent
                )}
              </strong>
            </p>
          </article>

          <article className="reviewBatchSummary">
            <h3>I.T. operational totals</h3>
            <p>
              Degraded services{" "}
              <strong>
                {model.views.statistics.it.degradedServices}
              </strong>{" "}
              · queued events{" "}
              <strong>{model.views.statistics.it.queuedEvents}</strong> ·
              delivery failures / 24h{" "}
              <strong>
                {model.views.statistics.it.deliveryFailures24h}
              </strong>{" "}
              · webhook denials / 24h{" "}
              <strong>
                {model.views.statistics.it.webhookDenied24h}
              </strong>{" "}
              · credential references needing attention{" "}
              <strong>
                {model.views.statistics.it.staleCredentials}
              </strong>
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
