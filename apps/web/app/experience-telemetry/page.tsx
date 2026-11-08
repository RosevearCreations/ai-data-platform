import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listExperienceTelemetryForUser } from "@/lib/experience-telemetry-database";

export const dynamic = "force-dynamic";

function metricLabel(key: string) {
  const labels: Record<string, string> = {
    navigation_load_ms: "Navigation load",
    fcp_ms: "First Contentful Paint",
    lcp_ms: "Largest Contentful Paint",
    cls_score: "Cumulative Layout Shift",
    inp_ms: "Interaction responsiveness",
    route_transition_ms: "Route transition",
    long_task_ms: "Long task duration"
  };
  return labels[key] ?? key;
}

function formatted(value: number | null, key: string) {
  if (value === null) return "not measured";
  return key === "cls_score" ? value.toFixed(3) : value.toFixed(0) + " ms";
}

export default async function ExperienceTelemetryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fexperience-telemetry");

  const model = await listExperienceTelemetryForUser(session.user.id);

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 332 · Real User Monitoring · Interaction Timing
        </p>
        <h1>Experience Telemetry</h1>
        <p className="lead">
          Measure how the authenticated application actually loads and responds
          in the browser, using privacy-minimized route families and performance
          timings rather than synthetic success claims.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/performance-baseline">
            Build 331 Performance Baseline
          </Link>
          <Link className="secondaryButton" href="/integration-health">
            Integration Health
          </Link>
          <Link className="secondaryButton" href="/system-reliability">
            System Reliability
          </Link>
          <a className="secondaryButton" href="/api/experience-telemetry">
            Telemetry JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Privacy-minimized RUM only.</strong>
        <p>
          Query strings, raw URLs, DOM text, form values, customer data and exact
          viewport dimensions are not stored. Dynamic-looking route identifiers
          are collapsed before persistence. Telemetry never changes configuration,
          authorizes a connection, blocks a release or performs remediation.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Last 24 hours</p>
            <h2>Current browser experience percentiles</h2>
          </div>
        </div>
        {model.windows.last24h.length ? (
          <div className="reviewBatchList">
            {model.windows.last24h.map((metric) => (
              <article className="reviewBatchSummary" key={metric.metricKey}>
                <div>
                  <span className="reviewStatus">
                    {metric.samples} sample(s) · {metric.poorSamples} poor
                  </span>
                  <h3>{metricLabel(metric.metricKey)}</h3>
                  <p>
                    P50 <strong>{formatted(metric.p50, metric.metricKey)}</strong>
                    {" · "}P75 <strong>{formatted(metric.p75, metric.metricKey)}</strong>
                    {" · "}P95 <strong>{formatted(metric.p95, metric.metricKey)}</strong>
                  </p>
                  <p>
                    Average {formatted(metric.average, metric.metricKey)}
                    {metric.lastObservedAt
                      ? " · last observed " + new Date(metric.lastObservedAt).toLocaleString()
                      : ""}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            No authenticated real-user timing has been recorded yet. Use the
            application normally; supported browser metrics will appear here.
          </div>
        )}
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Seven-day route view</p>
            <h2>Where users experience delay</h2>
          </div>
        </div>
        {model.routes.length ? (
          <div className="reviewBatchList">
            {model.routes.map((route) => (
              <article className="reviewBatchSummary" key={route.routeFamily}>
                <div>
                  <span className="reviewStatus">
                    {route.samples} sample(s) · {route.poorSamples} poor
                  </span>
                  <h3><code>{route.routeFamily}</code></h3>
                  <p>
                    Combined interaction/navigation P75:{" "}
                    <strong>{route.p75Ms === null ? "not measured" : route.p75Ms.toFixed(0) + " ms"}</strong>
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">No route-family evidence is available yet.</div>
        )}
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Current I.T. truth model</strong>
        <p>
          Build 332 retires the old QL-266 review hold as a global prerequisite.
          Current operator truth comes from live database evidence, the connection
          registry, Integration Health, certification, credential-reference state,
          tenant/workspace authority and current transport evidence. Historical
          preflight records remain historical evidence, not active work.
        </p>
      </section>
    </main>
  );
}
