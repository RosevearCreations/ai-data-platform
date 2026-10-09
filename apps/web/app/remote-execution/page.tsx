import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { browserlessPilotReadiness } from "@/lib/browserless-provider";
import { listIntelligenceOverviewForUser } from "@/lib/database";
import { listRemotePilotOverviewForUser } from "@/lib/remote-pilot-database";

import { RemotePilotAdminPanel } from "./RemotePilotAdminPanel";
import { HelpInfo } from "../help/HelpInfo";

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
          <p className="eyebrow">Build 032</p>
          <h1>Browserless live pilot & provider cost baseline</h1>
          <p className="lead">Sign in to review the Browserless pilot controls.</p>
          <Link className="primaryLink" href="/sign-in?callbackUrl=/remote-execution">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const [pilot, intelligence] = await Promise.all([
    listRemotePilotOverviewForUser(session.user.id),
    listIntelligenceOverviewForUser(session.user.id)
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
    <main className="shell">
      <section className="hero">
        <HelpInfo topic="remote-overview" />
        <p className="eyebrow">Build 032</p>
        <h1>Browserless live pilot & provider cost baseline</h1>
        <p className="lead">
          Build 032 uses the existing one-page Browserless boundary to establish
          a real production reliability and provider-unit baseline. The global
          kill switch remains fail-closed outside an explicitly approved run window.
        </p>
        <div className="heroActions">
          <Link className="primaryLink" href="/">Back to workspaces</Link>
          <Link className="secondaryButton" href="/intelligence">
            Source-policy evidence
          </Link>
        </div>
      </section>

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
