import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { browserlessPilotReadiness } from "@/lib/browserless-provider";
import { listIntelligenceOverviewForUser } from "@/lib/database";
import { listRemotePilotOverviewForUser } from "@/lib/remote-pilot-database";
import { buildProviderPilotBaselineForUser } from "@/lib/provider-pilot-baseline-database";

import { RemotePilotAdminPanel } from "./RemotePilotAdminPanel";
import { HelpInfo } from "../help/HelpInfo";
import { OperationsActionDrawer, OperationsEvidenceTimeline, OperationsExceptionQueue, OpsDrawerLink } from "../OperationsCommandPanels";

export const dynamic = "force-dynamic";

type Candidate = {
  id: string;
  origin: string;
  revision: number;
  fingerprint: string;
  displayName: string;
  maxRecordsPerRun: number;
};

function candidates(payload: Record<string, unknown> | undefined): Candidate[] {
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const item = entry as Record<string, unknown>;
    if (
      item.status !== "approved" ||
      item.dataSensitivity !== "public-facts" ||
      item.collectionMethod !== "public-webpage" ||
      item.robotsDecision !== "allowed" ||
      item.publicOrAuthorized !== true ||
      item.termsReviewed !== true ||
      item.noAccessControlBypass !== true ||
      typeof item.reviewExpiresAt !== "string" ||
      !Number.isFinite(Date.parse(item.reviewExpiresAt)) ||
      Date.parse(item.reviewExpiresAt) <= Date.now() ||
      typeof item.id !== "string" ||
      typeof item.origin !== "string" ||
      typeof item.revision !== "number" ||
      typeof item.fingerprint !== "string"
    ) {
      return [];
    }
    return [{
      id: item.id,
      origin: item.origin,
      revision: item.revision,
      fingerprint: item.fingerprint,
      displayName:
        typeof item.displayName === "string" ? item.displayName : item.origin,
      maxRecordsPerRun:
        typeof item.maxRecordsPerRun === "number" ? item.maxRecordsPerRun : 100
    }];
  });
}

export default async function RemoteExecutionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="remote-overview" />
          <p className="eyebrow">Build 275</p>
          <h1>Provider Pilot Baseline, Cost, Latency &amp; Failure Evidence</h1>
          <p className="lead">Sign in to review the bounded provider baseline and its live-pilot authorization blockers.</p>
          <Link className="primaryLink" href="/sign-in?callbackUrl=/remote-execution">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const [pilot, intelligence, baseline] = await Promise.all([
    listRemotePilotOverviewForUser(session.user.id),
    listIntelligenceOverviewForUser(session.user.id),
    buildProviderPilotBaselineForUser(session.user.id)
  ]);
  const readiness = browserlessPilotReadiness();

  const models = pilot.map((entry) => {
    const intelligenceWorkspace = intelligence.find(
      (item) => item.workspace.id === entry.workspace.id
    );
    const sourcePolicy = intelligenceWorkspace?.modules.find(
      (module) => module.moduleKey === "source-policy"
    );
    return {
      id: entry.workspace.id,
      name: entry.workspace.name,
      role: entry.workspace.role,
      control: entry.control
        ? {
            enabled: entry.control.enabled,
            killSwitch: entry.control.killSwitch,
            region: entry.control.region
          }
        : null,
      allowlist: entry.allowlist.map((item) => ({
        sourceOrigin: item.sourceOrigin,
        policyId: item.policyId,
        policyRevision: item.policyRevision,
        policyFingerprint: item.policyFingerprint,
        enabled: item.enabled,
        maxRecords: item.maxRecords,
        maxRuntimeSeconds: item.maxRuntimeSeconds,
        maxUnitsPerRun: item.maxUnitsPerRun
      })),
      candidates: candidates(sourcePolicy?.payload)
    };
  });

  return (
    <main className="shell opsDeepScreen opsDeepScreen--it">
      <section className="hero">
        <HelpInfo topic="remote-overview" />
        <p className="eyebrow">Build 275 · Build 032 controls retained</p>
        <h1>Provider Pilot Baseline, Cost, Latency &amp; Failure Evidence</h1>
        <p className="lead">
          Read the existing controlled Browserless terminal-run evidence as a measured production baseline.
          Real units, duration, response status, content hashes and failure reasons are preserved; when live
          execution is not authorized, the baseline records the blocker instead of simulating a successful run.
        </p>
        <div className="heroActions">
          <Link className="primaryLink" href="/">Back to workspaces</Link>
          <Link className="secondaryButton" href="/intelligence">
            Source-policy evidence
          </Link>
          <Link className="secondaryButton" href="/evidence-baseline">
            Build 273 baseline
          </Link>
          <a className="secondaryButton" href="/api/remote-execution/baseline">
            Baseline JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 275 exit criterion: {baseline.exitCriterion.met ? "MET" : "OPEN"} · {baseline.state.toUpperCase()}</strong>
        <p>{baseline.exitCriterion.label}</p>
        <p><strong>Current evidence:</strong> {baseline.exitCriterion.evidence}</p>
        <p>A blocked baseline is evidence of the real authorization state; it is not a successful live-provider result.</p>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Measured provider baseline</p>
            <h2>Cost, latency, outcomes &amp; authorization</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article><strong>{baseline.totals.terminalRuns}</strong><span>terminal provider runs</span></article>
          <article><strong>{baseline.totals.successes}/{baseline.totals.failures}</strong><span>successes / failures</span></article>
          <article><strong>{baseline.totals.providerUnits}</strong><span>estimated provider units</span></article>
          <article><strong>{baseline.totals.averageDurationMs ?? "—"}</strong><span>average duration ms</span></article>
          <article><strong>{baseline.totals.approvedPublicSources}</strong><span>approved public sources</span></article>
        </div>
      </section>

      <section className="reviewQueue" aria-labelledby="provider-baseline-workspaces">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Workspace evidence</p>
            <h2 id="provider-baseline-workspaces">Terminal-run baseline and blockers</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {baseline.workspaces.map((workspace) => (
            <article className="reviewBatchSummary" key={workspace.workspaceId}>
              <div>
                <span className="reviewStatus">{workspace.state}</span>
                <h3>{workspace.workspaceName}</h3>
                <p>
                  Runs {workspace.terminalRuns} · success {workspace.successes} · failures {workspace.failures} ·
                  units {workspace.providerUnits} · average duration {workspace.averageDurationMs ?? "—"} ms
                </p>
                <p>
                  Approved public sources {workspace.approvedPublicSources} · enabled allowlist sources {workspace.enabledAllowlistSources} ·
                  workspace kill switch {workspace.workspaceKillSwitch ? "ON" : "off"}
                </p>
                {workspace.latestTerminalEvidence ? (
                  <p>
                    <strong>Latest terminal evidence:</strong> {workspace.latestTerminalEvidence.eventType} ·
                    response {workspace.latestTerminalEvidence.responseCode ?? "—"} ·
                    content SHA-256 {workspace.latestTerminalEvidence.contentSha256 ?? "not available"} ·
                    failure {workspace.latestTerminalEvidence.failureReason ?? "none"}
                  </p>
                ) : (
                  <p><strong>Latest terminal evidence:</strong> none recorded.</p>
                )}
                {workspace.blockers.length ? (
                  <ul>
                    {workspace.blockers.map((blocker) => (
                      <li key={blocker.scope + ":" + blocker.code}>{blocker.label}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No current provider/source-policy blocker is recorded; a real approved pilot may be run only when genuinely needed.</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="principles">
        <div>
          <p className="eyebrow">Fail-closed stop conditions</p>
          <h2>Stop rather than manufacture evidence</h2>
        </div>
        <ul>
          {baseline.stopConditions.map((condition) => <li key={condition}>{condition}</li>)}
        </ul>
      </section>

      <section className="opsDrilldownPanel"><span>Operations Command · I.T. drill-down</span><strong>Remote Execution & Provider Status</strong><p>Inspect live-pilot readiness, fail-closed controls, provider cost evidence and recent execution events.</p><div><Link href="/connectors">Connectors</Link><Link href="/integration-delivery">System Status</Link></div></section>

      <OperationsActionDrawer title="I.T. execution actions" description="Use the existing governed workflows to inspect policy, connector state and delivery status. No drawer action bypasses live-pilot gates.">
        <OpsDrawerLink href="/connectors">Connector Controls</OpsDrawerLink>
        <OpsDrawerLink href="/intelligence">Source Policy Evidence</OpsDrawerLink>
        <OpsDrawerLink href="/integration-delivery">Delivery Status</OpsDrawerLink>
      </OperationsActionDrawer>

      <div className="opsTemplateGrid">
        <OperationsExceptionQueue
          title="Live-pilot readiness"
          items={[
            ...(!readiness.tokenConfigured ? [{ id: "token", label: "Provider token not configured", detail: "Browserless execution remains fail-closed until the provider credential is configured server-side.", tone: "critical" as const }] : []),
            ...(!readiness.executionEnabled ? [{ id: "flag", label: "Execution flag is off", detail: "Remote execution is disabled by the current environment gate.", tone: "attention" as const }] : []),
            ...(readiness.globalKillSwitchActive ? [{ id: "kill", label: "Global kill switch is active", detail: "No live pilot can run while the global kill switch remains active.", tone: "critical" as const }] : []),
            ...(readiness.readyForLivePilot ? [] : [{ id: "ready", label: "Pilot not ready", detail: "At least one required readiness condition is not satisfied.", tone: "attention" as const }])
          ]}
          emptyLabel="All current Browserless readiness checks are satisfied."
        />
        <OperationsEvidenceTimeline
          title="Recent provider evidence"
          entries={pilot.flatMap((entry) => entry.events.slice(0, 4).map((event) => ({
            id: entry.workspace.id + ":" + event.eventType + ":" + event.createdAt.toISOString(),
            title: event.eventType,
            detail: entry.workspace.name + " provider event",
            timestamp: event.createdAt.toLocaleString(),
            tone: "info" as const
          }))).slice(0, 10)}
        />
      </div>

      <section>
        <div className="sectionHeading">
          <p className="eyebrow">Global gate</p>
          <h2>Production readiness</h2>
          <HelpInfo topic="remote-readiness" />
        </div>
        <div className="grid">
          <article className="card">
            <h3>Browserless</h3>
            <p>
              Token {readiness.tokenConfigured ? "configured" : "not configured"}
              {" · "}execution flag {readiness.executionEnabled ? "on" : "off"}
              {" · "}global kill switch {readiness.globalKillSwitchActive ? "ON" : "off"}
            </p>
            <span className="badge">
              {readiness.readyForLivePilot ? "live pilot ready" : "fail-closed"}
            </span>
          </article>
          <article className="card">
            <h3>Pilot envelope</h3>
            <p>
              Direct egress · 1 concurrent browser · 1 page · ≤60 seconds ·
              ≤2 provider units per run.
            </p>
            <span className="badge">no proxy · no CAPTCHA · no stealth</span>
          </article>
        </div>
      </section>

      <RemotePilotAdminPanel workspaces={models} />

      {pilot.map((entry) => (
        <section key={entry.workspace.id}>
          <div className="sectionHeading">
            <p className="eyebrow">Evidence</p>
            <h2>{entry.workspace.name}</h2>
            <HelpInfo topic="remote-evidence" />
          </div>
          <div className="grid">
            <article className="card">
              <h3>Cost & reliability</h3>
              <p>
                Runs {entry.report.runs} · success {entry.report.successes} ·
                failures {entry.report.failures} · provider units{" "}
                {entry.report.providerUnits}
              </p>
              <span className="badge">
                {entry.report.successRate === null
                  ? "No pilot evidence yet"
                  : Math.round(entry.report.successRate * 100) + "% success"}
              </span>
            </article>
            <article className="card">
              <h3>Recent provider events</h3>
              <p>
                {entry.events.slice(0, 5).map((event) =>
                  event.eventType + " · " + event.createdAt.toLocaleString()
                ).join(" | ") || "No provider events yet."}
              </p>
            </article>
          </div>
        </section>
      ))}
    </main>
  );
}
