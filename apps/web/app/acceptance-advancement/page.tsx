import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ServerShellThemeAcceptancePanel } from "@/components/server-shell-theme-acceptance-panel";
import { auth } from "@/lib/auth";
import { build413AcceptanceSummary } from "@/lib/master-acceptance-advancement";

export const dynamic = "force-dynamic";

export default async function AcceptanceAdvancementPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Facceptance-advancement");

  const summary = build413AcceptanceSummary();

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 413 · Seven-Application Acceptance</p>
        <h1>Role, Device, Accessibility, Performance &amp; UX Advancement</h1>
        <p className="lead">
          Advance all seven applications only where current evidence proves the
          locked target. Missing, stale or deployment-only evidence stays UNKNOWN
          and never becomes completion progress.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/role-device-acceptance">Role / Device Evidence</Link>
          <Link className="secondaryButton" href="/performance-baseline">Performance Evidence</Link>
          <Link className="secondaryButton" href="/experience-telemetry">Experience Telemetry</Link>
          <Link className="secondaryButton" href="/master-completion">Completion Evidence</Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Build 413 evidence summary">
        <div className="commandMetrics">
          <article><strong>{summary.applications.length}</strong><span>applications</span></article>
          <article><strong>{summary.requiredAcceptanceEvidence}</strong><span>acceptance evidence cells</span></article>
          <article><strong>{summary.requiredCompletionEvidence}</strong><span>completion axis targets</span></article>
          <article><strong>+10</strong><span>minimum advancement points</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Evidence advancement is not simulated.</strong>
        <p>
          Each of the seven completion axes keeps its locked denominator. A target
          is baseline +10 percentage points, capped at 100, and is counted only when
          fresh independent evidence reaches the target with the same denominator.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Acceptance dimensions</p>
            <h2>Five current evidence gates per application</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          {summary.acceptanceDimensions.map((dimension) => (
            <article className="reviewBatchSummary" key={dimension}>
              <h3>{dimension.replaceAll("_"," ")}</h3>
              <p>
                PASS requires fresh evidence, at least 90% measured acceptance,
                zero critical failures, owner review and independent verification.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Seven completion axes</p>
            <h2>Locked denominator + evidence-backed advancement</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          {summary.completionAxes.map((axis) => (
            <article className="reviewBatchSummary" key={axis}>
              <h3>{axis}</h3>
              <p>Baseline → target → observed evidence must retain the same denominator hash.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Slave-shell overview</p>
            <h2>Yard Workers and iCamp futuristic acceptance panels</h2>
          </div>
        </div>
        <div className="masterChildShellGrid">
          <article className="reviewBatchSummary">
            <span className="reviewStatus">SLAVE APPLICATION SHELL</span>
            <h3>Yard Workers</h3>
            <p>Role/device, accessibility, performance, UX, loading and degraded-state evidence remain source-owned and evidence-backed.</p>
          </article>
          <article className="reviewBatchSummary">
            <span className="reviewStatus">SLAVE APPLICATION SHELL</span>
            <h3>iCamp</h3>
            <p>Tenant campground data remains outside the Server Shell acceptance authority; the shell consumes only governed evidence.</p>
          </article>
        </div>
      </section>

      <ServerShellThemeAcceptancePanel />
    </main>
  );
}
