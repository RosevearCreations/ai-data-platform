import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  collectionProjectOptionsForUser,
  listCollectionProjectsForUser
} from "@/lib/collection-project-database";

import { HelpInfo } from "../help/HelpInfo";
import { CollectionProjectManager } from "./CollectionProjectManager";

export const dynamic = "force-dynamic";

export default async function CollectionProjectsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fcollection-projects");

  const [projects, options] = await Promise.all([
    listCollectionProjectsForUser(session.user.id),
    collectionProjectOptionsForUser(session.user.id)
  ]);

  return (
    <main className="shell collectionShell">
      <section className="hero collectionHero">
        <HelpInfo topic="collection-projects-overview" />
        <p className="eyebrow">Build 045</p>
        <h1>Source & Collection Project Manager</h1>
        <p className="lead">
          Organize real collection work by workspace and project, link every source
          to its current governance and scraper evidence, and see what is ready or
          blocked before collection runs.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/data-library">Unified Data Library</Link>
          <Link className="secondaryButton" href="/intelligence">Source Policy & intelligence</Link>
        </div>
      </section>

      <section className="collectionSummary">
        <div className="sectionHeading">
          <p className="eyebrow">Project control</p>
          <h2>{projects.length} collection project(s)</h2>
          <HelpInfo topic="collection-projects-readiness" />
        </div>
        <p>
          This manager never approves Source Policy, enables remote execution or
          runs a collection. It only organizes durable project/source intent and
          evaluates the current linked evidence.
        </p>
      </section>

      <CollectionProjectManager
        projects={projects.map((project) => ({
          workspaceId: project.workspaceId,
          workspaceName: project.workspaceName,
          workspaceProfile: project.workspaceProfile,
          role: project.role,
          canManage: project.canManage,
          projectId: project.projectId,
          name: project.name,
          purpose: project.purpose,
          status: project.status,
          cadence: project.cadence,
          ownerLabel: project.ownerLabel,
          notes: project.notes,
          readiness: project.readiness,
          sources: project.sources.map((source) => ({
            sourceId: source.sourceId,
            displayName: source.displayName,
            sourceUrl: source.sourceUrl,
            sourceOrigin: source.sourceOrigin,
            collectionMethod: source.collectionMethod,
            sourcePolicyId: source.sourcePolicyId,
            savedScraperId: source.savedScraperId,
            cadence: source.cadence,
            status: source.status,
            notes: source.notes,
            readiness: source.readiness,
            blockers: source.blockers
          }))
        }))}
        options={options}
      />
    </main>
  );
}
