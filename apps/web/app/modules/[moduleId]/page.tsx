import Link from "next/link";
import { notFound } from "next/navigation";

import { HelpInfo } from "@/app/help/HelpInfo";
import type { HelpTopicKey } from "@/app/help/help-content";
import { moduleNavigationGroupById } from "@/lib/application-navigation";

export default async function ModuleHubPage({
  params
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const group = moduleNavigationGroupById(moduleId);

  if (!group) notFound();

  return (
    <main className="shell shellWide moduleHubShell">
      <section className="hero compactHero moduleHubHero">
        <HelpInfo topic="module-hubs" />
        <p className="eyebrow">Build 120 · {group.shortLabel}</p>
        <h1>{group.label}</h1>
        <p className="lead">{group.description}</p>
        <div className="moduleHubHeroActions">
          <Link className="secondaryButton" href="/workflows">Workflow directory</Link>
          <Link className="secondaryButton" href="/">Operator home</Link>
        </div>
      </section>

      <section className="moduleHubSection" aria-labelledby="module-flow-heading">
        <div className="sectionHeading">
          <p className="eyebrow">Progressive navigation</p>
          <h2 id="module-flow-heading">Choose the next sub-screen</h2>
          <HelpInfo topic="progressive-navigation" />
        </div>
        <p className="moduleHubGuidance">
          Work from the first relevant screen for the task in front of us. The numbered
          order reduces hunting; it does not override workflow prerequisites, permissions,
          approvals or state transitions.
        </p>

        <div className="moduleHubGrid">
          {group.items.map((item, index) => (
            <article
              className="uiSurfaceCard uiSurfaceCard--interactive uiSurfaceCard--neutral moduleHubStepCard cardHelpSurface"
              key={item.href}
            >
              <HelpInfo topic={item.helpTopic as HelpTopicKey} inline />
              <div className="moduleHubStepHeader">
                <span className="moduleHubStepNumber">{String(index + 1).padStart(2, "0")}</span>
                <span className="badge">Sub-screen</span>
              </div>
              <h3>{item.label}</h3>
              <p>{item.description}</p>
              <Link className="primaryLink" href={item.href}>Open sub-screen →</Link>
            </article>
          ))}
        </div>
      </section>

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
