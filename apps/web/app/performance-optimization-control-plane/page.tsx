import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPerformanceBaselineForUser } from "@/lib/performance-baseline-database";
import { listRoutePerformanceDiagnosticsForUser } from "@/lib/experience-telemetry-database";
import { listPerformanceObservatoryForUser } from "@/lib/performance-observatory-database";
import { composePerformanceOptimizationControlPlane } from "@/lib/performance-optimization-control-plane";

export const dynamic = "force-dynamic";

function stateClass(value: string) {
  return value.toLowerCase().replaceAll("_", "-");
}

export default async function PerformanceOptimizationControlPlanePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fperformance-optimization-control-plane"
    );
  }

  const [baseline, routes, observatory] = await Promise.all([
    listPerformanceBaselineForUser(session.user.id),
    listRoutePerformanceDiagnosticsForUser(session.user.id),
    listPerformanceObservatoryForUser(session.user.id)
  ]);

  const model = composePerformanceOptimizationControlPlane({
    baseline,
    routes,
    observatory
  });

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 355 · Moderate Controls</p>
        <h1>Performance Optimization Control Plane</h1>
        <p className="lead">
          Turn measured performance evidence into reversible cache, query,
          rendering and dependency optimization candidates without silently
          changing production behavior.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/performance-baseline">
            Performance Baseline
          </Link>
          <Link className="secondaryButton" href="/experience-telemetry">
            Experience Telemetry
          </Link>
          <Link className="secondaryButton" href="/route-performance">
            Route Performance
          </Link>
          <Link className="secondaryButton" href="/performance-observatory">
            Performance Observatory
          </Link>
          <Link className="secondaryButton" href="/cross-application-control-center">
            Cross-Application Control
          </Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Optimization summary">
        <div className="commandMetrics">
          <article><strong>{model.summary.total}</strong><span>candidates</span></article>
          <article><strong>{model.summary.critical}</strong><span>critical</span></article>
          <article><strong>{model.summary.cache}</strong><span>cache</span></article>
          <article><strong>{model.summary.query}</strong><span>query</span></article>
          <article><strong>{model.summary.render}</strong><span>render</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Measure → propose → approve → validate → rollback if needed.</strong>
        <p>
          Recommendations are not production changes. Authenticated/private
          responses default to NO_STORE, query/index/pool changes are never
          automatic, and rendering changes must preserve authorization and
          tenant boundaries.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Optimization candidates</p>
            <h2>Measured, reversible change plans</h2>
          </div>
        </div>

        {model.candidates.length ? (
          <div className="reviewBatchList">
            {model.candidates.map((candidate) => (
              <article className="reviewBatchSummary" key={candidate.id}>
                <span
                  className={
                    "reviewStatus reviewStatus--" +
                    stateClass(candidate.severity)
                  }
                >
                  {candidate.area} · {candidate.severity} · {candidate.state}
                </span>
                <h3>{candidate.target}</h3>
                <p><strong>Evidence:</strong> {candidate.evidence}</p>
                <p><strong>Recommendation:</strong> {candidate.recommendation}</p>
                <p><strong>Validation:</strong> {candidate.validation}</p>
                <p><strong>Rollback:</strong> {candidate.rollback}</p>
                <p><strong>Automatic apply:</strong> no · <strong>approval required:</strong> yes</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            No measured optimization candidate currently exceeds the bounded
            thresholds. Missing evidence is not converted into a healthy claim.
          </div>
        )}
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Control boundaries</p>
            <h2>Caching, query, rendering and dependency rules</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          <article className="reviewBatchSummary">
            <span className="reviewStatus">CACHE</span>
            <h3>Authorization-safe caching</h3>
            <p>Authenticated response default: <strong>{model.controls.cache.defaultAuthenticatedResponse}</strong></p>
            <p>Identity/tenant key required: <strong>yes</strong> · explicit invalidation required: <strong>yes</strong> · secret caching: <strong>no</strong></p>
          </article>

          <article className="reviewBatchSummary">
            <span className="reviewStatus">QUERY</span>
            <h3>Measured database optimization</h3>
            <p>Automatic index creation: <strong>no</strong> · automatic pool resize: <strong>no</strong> · before/after evidence: <strong>required</strong></p>
          </article>

          <article className="reviewBatchSummary">
            <span className="reviewStatus">RENDER</span>
            <h3>Rendering and hydration</h3>
            <p>Automatic static conversion: <strong>no</strong> · authorization boundary preserved: <strong>yes</strong> · real-user validation: <strong>required</strong></p>
          </article>

          <article className="reviewBatchSummary">
            <span className="reviewStatus">DEPENDENCY</span>
            <h3>External dependency tuning</h3>
            <p>Automatic retry/timeout changes: <strong>no</strong> · source authority preserved: <strong>yes</strong> · duplicate side effects excluded: <strong>required</strong></p>
          </article>
        </div>
      </section>
    </main>
  );
}
