import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listRoutePerformanceDiagnosticsForUser } from "@/lib/experience-telemetry-database";

export const dynamic = "force-dynamic";

function ms(value: number | null) {
  return value === null ? "not measured" : value.toFixed(0) + " ms";
}

function score(value: number | null) {
  return value === null ? "not measured" : value.toFixed(3);
}

function statusText(status: string) {
  if (status === "needs-attention") return "Needs attention";
  if (status === "unmeasured") return "Unmeasured";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function RoutePerformancePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Froute-performance");

  const model = await listRoutePerformanceDiagnosticsForUser(session.user.id);

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 333 · Route Performance · Core Web Vitals
        </p>
        <h1>Rendering Diagnostics</h1>
        <p className="lead">
          Compare real authenticated route-family experience using LCP, CLS and
          INP alongside route transition, hydration-ready and long-task signals.
          Missing telemetry remains unmeasured rather than being treated as success.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/experience-telemetry">
            Build 332 Experience Telemetry
          </Link>
          <Link className="secondaryButton" href="/performance-baseline">
            Performance Baseline
          </Link>
          <a className="secondaryButton" href="/api/route-performance">
            Route Diagnostics JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Measured diagnostics only.</strong>
        <p>
          LCP, CLS and INP are treated as Core Web Vitals. Hydration-ready timing
          is an application-specific first-client-effect diagnostic and is not
          presented as a Core Web Vital. Raw URLs, query strings, DOM text, form
          values, customer data and credentials are not stored. Build 333 does
          not automatically optimize production or block a release.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Seven-day route evidence</p>
            <h2>Route-family performance and rendering pressure</h2>
          </div>
        </div>

        {model.routes.length ? (
          <div className="reviewBatchList">
            {model.routes.map((route) => (
              <article className="reviewBatchSummary" key={route.routeFamily}>
                <div>
                  <span className="reviewStatus">
                    {statusText(route.status)} · {route.samples} sample(s) ·{" "}
                    {route.poorSamples} poor
                  </span>
                  <h3><code>{route.routeFamily}</code></h3>
                  <p>
                    Core Web Vitals · LCP P75 <strong>{ms(route.lcpP75)}</strong>
                    {" · "}CLS P75 <strong>{score(route.clsP75)}</strong>
                    {" · "}INP P75 <strong>{ms(route.inpP75)}</strong>
                  </p>
                  <p>
                    Rendering · route transition P75{" "}
                    <strong>{ms(route.routeTransitionP75)}</strong>
                    {" · "}hydration-ready P75{" "}
                    <strong>{ms(route.hydrationReadyP75)}</strong>
                    {" · "}long task P95 <strong>{ms(route.longTaskP95)}</strong>
                  </p>
                  <p>
                    {route.coreVitalSamples} Core Web Vital sample(s)
                    {route.lastObservedAt
                      ? " · last observed " +
                        new Date(route.lastObservedAt).toLocaleString()
                      : ""}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            No seven-day route-family telemetry is available yet. Use the
            authenticated application normally and Build 332/333 will populate
            supported browser evidence.
          </div>
        )}
      </section>
    </main>
  );
}
