import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPerformanceBaselineForUser } from "@/lib/performance-baseline-database";

import { PerformanceBaselineConsole } from "./PerformanceBaselineConsole";

export const dynamic = "force-dynamic";

export default async function PerformanceBaselinePage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fperformance-baseline");
  }

  const model = await listPerformanceBaselineForUser(
    session.user.id
  );

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--management">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 331 · Performance · SLOs · Regression Budgets
        </p>
        <h1>Production Performance Baseline</h1>
        <p className="lead">
          Establish a measured production baseline from evidence that already
          exists, apply explicit SLO thresholds and compare later captures
          against bounded regression budgets without inventing missing telemetry.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/system-health">
            System Health
          </Link>
          <Link className="secondaryButton" href="/integration-health">
            Integration Health
          </Link>
          <a className="secondaryButton" href="/api/performance-baseline">
            Baseline JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Measured evidence only.</strong>
        <p>
          Build 331 measures database probe latency, connector P95 latency and
          failures, webhook denial rate and event-delivery failures. Browser
          page-load, interaction, full API percentile and host CPU/memory
          telemetry remain explicitly unmeasured until a supported production
          source exists. Missing telemetry is never converted into a PASS.
        </p>
      </section>

      <PerformanceBaselineConsole initialModel={model} />
    </main>
  );
}
