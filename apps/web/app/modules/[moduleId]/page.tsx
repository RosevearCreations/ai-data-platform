import Link from "next/link";
import { notFound } from "next/navigation";

import { HelpInfo } from "@/app/help/HelpInfo";
import { moduleNavigationGroupById } from "@/lib/application-navigation";
import { moduleOperatorToolsById } from "@/lib/module-operator-tools";

import { ModuleHubTools } from "./ModuleHubTools";

export default async function ModuleHubPage({
  params
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const group = moduleNavigationGroupById(moduleId);
  const operatorTools = moduleOperatorToolsById(moduleId);

  if (!group || !operatorTools) notFound();

  return (
    <main className="shell shellWide moduleHubShell">
      <section className="hero compactHero moduleHubHero">
        <HelpInfo topic="module-hubs" />
        <p className="eyebrow">Build 121 · {group.shortLabel}</p>
        <h1>{group.label}</h1>
        <p className="lead">{group.description}</p>
        <div className="moduleHubHeroActions">
          <Link className="secondaryButton" href="/workflows">Workflow directory</Link>
          <Link className="secondaryButton" href="/">Operator home</Link>
        </div>
      </section>

      <div aria-label="Open sub-screen task panels">
        <ModuleHubTools group={group} tools={operatorTools} />
      </div>

      <section className="moduleHubSection">
        <article className="uiSurfaceCard uiSurfaceCard--inset uiSurfaceCard--info moduleHubReminder cardHelpSurface">
          <HelpInfo topic="module-hubs" inline />
          <div>
            <p className="eyebrow">Navigation contract</p>
            <h2>Hub first, governed workflow second</h2>
          </div>
          <p>
            Module hubs are navigation and orientation surfaces only. All consequential
            actions remain inside the destination workflow where its existing evidence,
            authorization and confirmation controls continue to apply.
          </p>
        </article>
      </section>
    </main>
  );
}
