import Link from "next/link";

import { HelpInfo } from "@/app/help/HelpInfo";
import type { HelpTopicKey } from "@/app/help/help-content";
import { MODULE_CARDS, moduleHubHref } from "@/lib/application-navigation";

export default function WorkflowDirectoryPage() {
  return (
    <main className="shell shellWide">
      <section className="hero compactHero">
        <HelpInfo topic="workflow-directory" />
        <p className="eyebrow">Build 120</p>
        <h1>Workflow Directory</h1>
        <p className="lead">
          Choose the business module first, then use its hub to move through the
          relevant sub-screens. Direct workflow links remain visible for experienced
          operators and troubleshooting.
        </p>
      </section>

      <section className="moduleDirectory" aria-label="Current application modules">
        {MODULE_CARDS.map((group) => (
          <article className="uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--neutral moduleDirectoryCard cardHelpSurface" key={group.id}>
            <HelpInfo topic={group.helpTopic as HelpTopicKey} inline />
            <div className="moduleDirectoryHeader">
              <div>
                <p className="eyebrow">{group.shortLabel}</p>
                <h2>{group.label}</h2>
              </div>
              <span>{group.items.length} sub-screen{group.items.length === 1 ? "" : "s"}</span>
            </div>
            <p>{group.description}</p>
            <div className="moduleDirectoryHubAction">
              <Link className="primaryLink" href={moduleHubHref(group.id)}>
                Open module hub →
              </Link>
              <HelpInfo topic="module-hubs" inline />
            </div>
            <div className="moduleDirectoryLinks">
              {group.items.map((item) => (
                <div className="uiSurfaceCard uiSurfaceCard--inset uiSurfaceCard--neutral moduleDirectoryLinkRow cardHelpSurface" key={item.href}>
                  <Link href={item.href}>
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </Link>
                  <HelpInfo topic={item.helpTopic as HelpTopicKey} inline />
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
