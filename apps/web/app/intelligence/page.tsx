import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listIntelligenceOverviewForUser } from "@/lib/database";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = {
  history: "Historical change tracking",
  "rosie-competitive": "Rosie Dazzlers competitive intelligence",
  "devil-supplier": "Devil n Dove supplier intelligence",
  "movie-metadata": "Personal movie metadata",
  "scheduled-jobs": "Scheduled jobs & run history",
  "source-policy": "Source policy registry & crawl governance",
  "business-integrations": "Business integration approvals"
};

function valueText(value: unknown) {
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value ?? "—");
}

export default async function IntelligencePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <p className="eyebrow">Build 021</p>
          <h1>Persistent intelligence</h1>
          <p className="lead">
            Sign in to review workspace history, pending review and audit evidence.
          </p>
          <Link className="primaryLink" href="/sign-in?callbackUrl=/intelligence">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const overviews = await listIntelligenceOverviewForUser(session.user.id);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Build 021</p>
        <h1>Persistent intelligence & audit</h1>
        <p className="lead">
          Durable workspace summaries synchronized from the extension. These
          views are read-only; approval and reconciliation actions remain explicit.
        </p>
        <div className="heroActions">
          <Link className="primaryLink" href="/">Back to workspaces</Link>
        </div>
      </section>

      {overviews.map(({ workspace, modules, audit }) => (
        <section key={workspace.id} aria-labelledby={"workspace-" + workspace.id}>
          <div className="sectionHeading">
            <p className="eyebrow">{workspace.type} workspace</p>
            <h2 id={"workspace-" + workspace.id}>{workspace.name}</h2>
          </div>

          {modules.length ? (
            <div className="grid">
              {modules.map((module) => (
                <article className="card" key={module.moduleKey}>
                  <h3>{labels[module.moduleKey] ?? module.moduleKey}</h3>
                  <p>
                    Server version {module.serverVersion} · synchronized{" "}
                    {module.updatedAt.toLocaleString()}
                  </p>
                  <dl>
                    {Object.entries(module.summary).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key.replaceAll("-", " ")}</dt>
                        <dd>{valueText(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <div className="emptyState">
              <h3>No persisted intelligence yet</h3>
              <p>
                Connect the extension and run Build 021 intelligence sync to
                populate this workspace.
              </p>
            </div>
          )}

          <div className="sectionHeading">
            <p className="eyebrow">Append-only audit</p>
            <h2>Recent integration evidence</h2>
          </div>

          {audit.length ? (
            <div className="grid">
              {audit.slice(0, 12).map((entry) => (
                <article className="card" key={entry.auditId}>
                  <h3>{entry.action}</h3>
                  <p>{entry.details}</p>
                  <span className="badge">
                    {entry.target} · {entry.occurredAt.toLocaleString()}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="emptyState">
              <p>No integration audit events have been persisted for this workspace.</p>
            </div>
          )}
        </section>
      ))}
    </main>
  );
}
