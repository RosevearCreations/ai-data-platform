import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPerformanceObservatoryForUser } from "@/lib/performance-observatory-database";

export const dynamic = "force-dynamic";

function ms(value: number | null) {
  return value === null ? "not measured" : value.toFixed(0) + " ms";
}

function rate(value: number | null) {
  return value === null ? "not measured" : value.toFixed(2) + "%";
}

function label(value: string) {
  return value === "needs-attention"
    ? "Needs attention"
    : value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function PerformanceObservatoryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fperformance-observatory");

  const model = await listPerformanceObservatoryForUser(session.user.id);

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 334 · API · Database · Pool · Dependency Performance
        </p>
        <h1>Performance Observatory</h1>
        <p className="lead">
          Correlate measured server API timing, authorized database probes,
          connection-pool pressure and existing connector dependency evidence
          without logging private request content or inventing missing telemetry.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/performance-baseline">
            Performance Baseline
          </Link>
          <Link className="secondaryButton" href="/route-performance">
            Route Performance
          </Link>
          <Link className="secondaryButton" href="/integration-health">
            Integration Health
          </Link>
          <a className="secondaryButton" href="/api/performance-observatory">
            Observatory JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Measured server evidence only.</strong>
        <p>
          Operation keys are fixed and sanitized. Raw URLs, query strings, SQL
          text, request/response bodies, customer records and credential values
          are not stored. Connector dependency timing reuses existing authorized
          audit evidence. Missing evidence remains unmeasured, and Build 334 does
          not automatically optimize production or block a release.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Current pool state</p>
            <h2>Database connection pressure</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          <article className="reviewBatchSummary">
            <div>
              <span className="reviewStatus">Application pool</span>
              <h3>
                {model.pools.current.app.totalCount} total ·{" "}
                {model.pools.current.app.idleCount} idle ·{" "}
                {model.pools.current.app.waitingCount} waiting
              </h3>
              <p>
                Maximum observed application waiters in seven-day service
                samples: <strong>{model.pools.maxObservedAppWaiting}</strong>
              </p>
            </div>
          </article>
          <article className="reviewBatchSummary">
            <div>
              <span className="reviewStatus">Authentication pool</span>
              <h3>
                {model.pools.current.auth.totalCount} total ·{" "}
                {model.pools.current.auth.idleCount} idle ·{" "}
                {model.pools.current.auth.waitingCount} waiting
              </h3>
              <p>Counts only; connection strings and credentials are never exposed.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Seven-day server evidence</p>
            <h2>API operations</h2>
          </div>
        </div>
        {model.api.length ? (
          <div className="reviewBatchList">
            {model.api.map((item) => (
              <article className="reviewBatchSummary" key={item.operationKey}>
                <div>
                  <span className="reviewStatus">
                    {label(item.state)} · {item.samples} sample(s)
                  </span>
                  <h3><code>{item.operationKey}</code></h3>
                  <p>
                    P50 <strong>{ms(item.p50Ms)}</strong>
                    {" · "}P75 <strong>{ms(item.p75Ms)}</strong>
                    {" · "}P95 <strong>{ms(item.p95Ms)}</strong>
                    {" · "}failure rate <strong>{rate(item.failureRatePct)}</strong>
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            No instrumented authenticated API samples are available yet.
          </div>
        )}
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Authorized query evidence</p>
            <h2>Database operations</h2>
          </div>
        </div>
        {model.database.length ? (
          <div className="reviewBatchList">
            {model.database.map((item) => (
              <article className="reviewBatchSummary" key={item.operationKey}>
                <div>
                  <span className="reviewStatus">
                    {label(item.state)} · {item.samples} sample(s)
                  </span>
                  <h3><code>{item.operationKey}</code></h3>
                  <p>
                    P50 <strong>{ms(item.p50Ms)}</strong>
                    {" · "}P95 <strong>{ms(item.p95Ms)}</strong>
                    {" · "}failure rate <strong>{rate(item.failureRatePct)}</strong>
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">No database timing evidence is available yet.</div>
        )}
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Existing connector audit</p>
            <h2>Dependency performance</h2>
          </div>
        </div>
        {model.dependencies.length ? (
          <div className="reviewBatchList">
            {model.dependencies.map((item) => (
              <article
                className="reviewBatchSummary"
                key={item.workspaceId + ":" + item.connectorKey}
              >
                <div>
                  <span className="reviewStatus">
                    {label(item.state)} · {item.samples} sample(s)
                  </span>
                  <h3><code>{item.connectorKey}</code></h3>
                  <p>
                    Workspace <code>{item.workspaceId}</code>
                    {" · "}P50 <strong>{ms(item.p50Ms)}</strong>
                    {" · "}P95 <strong>{ms(item.p95Ms)}</strong>
                    {" · "}failure rate <strong>{rate(item.failureRatePct)}</strong>
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            No authorized connector dependency timing is available. This remains
            unmeasured rather than healthy.
          </div>
        )}
      </section>
    </main>
  );
}
