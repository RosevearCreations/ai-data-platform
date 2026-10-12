import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listCollectionProjectsForUser } from "@/lib/collection-project-database";
import { listVisualRecipesForUser } from "@/lib/recipe-builder-database";

import { HelpInfo } from "../help/HelpInfo";
import { VisualRecipeBuilder } from "./VisualRecipeBuilder";

export const dynamic = "force-dynamic";

export default async function RecipeBuilderPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Frecipe-builder");

  const [library, projects] = await Promise.all([
    listVisualRecipesForUser(session.user.id),
    listCollectionProjectsForUser(session.user.id)
  ]);

  const projectSources = projects.flatMap((project) =>
    project.sources
      .filter((source) => source.status !== "retired")
      .map((source) => ({
        workspaceId: project.workspaceId,
        projectName: project.name,
        sourceId: source.sourceId,
        displayName: source.displayName,
        sourceUrl: source.sourceUrl,
        collectionMethod: source.collectionMethod,
        readiness: source.readiness,
        savedScraperId: source.savedScraperId
      }))
  );

  return (
    <main className="shell recipeBuilderShell">
      <section className="hero recipeBuilderHero">
        <HelpInfo topic="recipe-builder-overview" />
        <p className="eyebrow">Build 046</p>
        <h1>Visual Extraction Recipe Builder</h1>
        <p className="lead">
          Build and revise version-1 extraction recipes with visual field cards,
          deterministic validation, project-source presets and a bounded sample-HTML
          preview before the recipe enters the collection workflow.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/collection-projects">Collection projects</Link>
          <Link className="secondaryButton" href="/data-library">Unified Data Library</Link>
        </div>
      </section>

      <section className="recipeBuilderContext">
        <div className="sectionHeading">
          <p className="eyebrow">Shared recipe contract</p>
          <h2>Web authoring + extension live-page picking</h2>
          <HelpInfo topic="recipe-builder-preview" />
        </div>
        <p>
          The web builder saves into the same synchronized recipe records used by the
          Chrome extension. Use the extension when you need to pick real elements on
          a live page; use this surface to author, review, revise, import/export and
          preview recipes without fetching a remote source.
        </p>
      </section>

      <VisualRecipeBuilder
        workspaces={library.workspaces.map((workspace) => ({
          id: workspace.id,
          name: workspace.name,
          role: workspace.role
        }))}
        records={library.recipes}
        projectSources={projectSources}
      />
    </main>
  );
}
