import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listWorkspacesForUser } from "@/lib/database";

import { AiFieldSuggestions } from "./ai-field-suggestions";
import { SignOutButton } from "./sign-out-button";
import { HelpInfo } from "./help/HelpInfo";

const foundations = [
  "PostgreSQL row-level workspace isolation",
  "Source evidence on every external observation",
  "Review before downstream business writes",
  "AI for interpretation; deterministic code for repetition"
] as const;

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  const workspaces = session
    ? await listWorkspacesForUser(session.user.id)
    : [];

  return (
    <main className="shell">
      <section className="hero">
        <HelpInfo topic="platform-overview" />
        <p className="eyebrow">Build 030</p>
        <h1>AI Data Platform</h1>
        <p className="lead">
          Shared extraction and intelligence infrastructure with reusable domain
          profiles and live production-learning evidence across authorized workspaces.
        </p>

        {session ? (
          <div className="accountBar">
            <div>
              <strong>{session.user.name}</strong>
              <span>{session.user.email}</span>
            </div>
            <SignOutButton />
          </div>
        ) : (
          <div className="heroActions">
            <Link className="primaryLink" href="/sign-in">
              Sign in
            </Link>
            <span>Authentication and workspace isolation are enabled.</span>
          </div>
        )}
      </section>

      <section aria-labelledby="workspace-heading">
        <div className="sectionHeading">
          <p className="eyebrow">Workspaces</p>
          <h2 id="workspace-heading">
            {session ? "Your authorized workspaces" : "One engine, isolated contexts"}
          </h2>
          <HelpInfo topic="workspaces" />
        </div>

        {session ? (
          workspaces.length > 0 ? (
            <div className="grid">
              {workspaces.map((workspace) => (
                <article className="card" key={workspace.id}>
                  <h3>{workspace.name}</h3>
                  <p>{workspace.purpose || workspace.profileDescription}</p>
                  <span className="badge">
                    {workspace.profileName} · {workspace.role}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="emptyState">
              <h3>No workspace access</h3>
              <p>
                This account is authenticated but has not been granted access to
                a workspace.
              </p>
            </div>
          )
        ) : (
          <div className="grid">
            <article className="card">
              <h3>Rosie Dazzlers</h3>
              <p>Ontario detailing intelligence, pricing history and SEO evidence.</p>
            </article>
            <article className="card">
              <h3>Devil n Dove</h3>
              <p>Supplier, product, tool and inventory intelligence.</p>
            </article>
            <article className="card">
              <h3>Personal</h3>
              <p>Movie metadata enrichment and approved private datasets.</p>
            </article>
          </div>
        )}
      </section>

      {session ? (
        <div className="heroActions">
          <Link className="primaryLink" href="/capture">
            Scan / enter barcode
          </Link>
          <Link className="secondaryButton" href="/intelligence">
            Review persistent intelligence
          </Link>
          <Link className="secondaryButton" href="/remote-execution">
            Remote execution pilot
          </Link>
          <Link className="secondaryButton" href="/workspace-profiles">
            Workspace profiles
          </Link>
          <Link className="secondaryButton" href="/connectors">
            Connectors
          </Link>
          <Link className="secondaryButton" href="/production-learning">
            Production learning
          </Link>
          <Link className="secondaryButton" href="/help">
            Help center
          </Link>
          <span>Mobile barcode intake and durable intelligence are available across devices.</span>
        </div>
      ) : null}

      {session ? <AiFieldSuggestions /> : null}

      <section className="principles" aria-labelledby="principles-heading">
        <HelpInfo topic="guardrails" />
        <div>
          <p className="eyebrow">Guardrails</p>
          <h2 id="principles-heading">Designed for traceable data</h2>
        </div>
        <ul>
          {foundations.map((foundation) => (
            <li key={foundation}>{foundation}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
