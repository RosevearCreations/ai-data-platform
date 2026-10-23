"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { HelpInfo } from "@/app/help/HelpInfo";
import type { HelpTopicKey } from "@/app/help/help-content";
import type { ApplicationNavigationGroup } from "@/lib/application-navigation";
import type { ModuleOperatorTools } from "@/lib/module-operator-tools";

export function ModuleHubTools({
  group,
  tools
}: {
  group: ApplicationNavigationGroup;
  tools: ModuleOperatorTools;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const visiblePanels = useMemo(() => {
    return tools.taskPanels
      .map((panel) => {
        const items = panel.itemHrefs
          .map((href) => group.items.find((item) => item.href === href))
          .filter((item): item is ApplicationNavigationGroup["items"][number] => Boolean(item))
          .filter((item) => {
            if (!normalizedQuery) return true;
            return (
              item.label.toLowerCase().includes(normalizedQuery) ||
              item.description.toLowerCase().includes(normalizedQuery) ||
              panel.label.toLowerCase().includes(normalizedQuery) ||
              panel.description.toLowerCase().includes(normalizedQuery)
            );
          });
        return { ...panel, items };
      })
      .filter((panel) => panel.items.length > 0);
  }, [group.items, normalizedQuery, tools.taskPanels]);

  const resultCount = visiblePanels.reduce((total, panel) => total + panel.items.length, 0);

  return (
    <>
      <section className="moduleHubSection" aria-labelledby="module-tools-heading">
        <div className="sectionHeading">
          <p className="eyebrow">Operator tools</p>
          <h2 id="module-tools-heading">Find the task, then open the governed screen</h2>
          <HelpInfo topic="module-search" />
        </div>

        <div className="moduleOperatorToolbar">
          <article className="uiSurfaceCard uiSurfaceCard--inset uiSurfaceCard--neutral moduleSearchCard cardHelpSurface">
            <HelpInfo topic="module-search" inline />
            <label htmlFor="module-task-search">
              <strong>Search this module</strong>
              <span>Filter by task, screen name or description.</span>
            </label>
            <div className="moduleSearchControl">
              <input
                id="module-task-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={"Search " + group.shortLabel.toLowerCase() + " tasks"}
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")}>Clear</button>
              ) : null}
            </div>
            <small aria-live="polite">
              {normalizedQuery
                ? resultCount + " matching sub-screen" + (resultCount === 1 ? "" : "s")
                : group.items.length + " sub-screens available"}
            </small>
          </article>

          <article className="uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--info moduleShortcutCard cardHelpSurface">
            <HelpInfo topic="operator-shortcuts" inline />
            <div>
              <p className="eyebrow">Operator shortcuts</p>
              <h3>Common destinations</h3>
              <p>Shortcuts navigate only. Destination permissions and prerequisites still apply.</p>
            </div>
            <div className="moduleShortcutLinks">
              {tools.shortcuts.map((shortcut) => (
                <Link href={shortcut.href} key={shortcut.href}>
                  <strong>{shortcut.label}</strong>
                  <span>{shortcut.description}</span>
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="moduleHubSection" aria-labelledby="module-flow-heading">
        <div className="sectionHeading">
          <p className="eyebrow">Task panels</p>
          <h2 id="module-flow-heading">Choose the next sub-screen</h2>
          <HelpInfo topic="module-task-panels" />
        </div>
        <p className="moduleHubGuidance">
          Task panels organize related screens around operator outcomes. They are navigation
          aids only and do not replace workflow state, approval, permission or evidence checks.
        </p>

        {visiblePanels.length ? (
          <div className="moduleTaskPanelGrid">
            {visiblePanels.map((panel) => (
              <article
                className="uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--neutral moduleTaskPanel cardHelpSurface"
                key={panel.id}
              >
                <HelpInfo topic="module-task-panels" inline />
                <div className="moduleTaskPanelHeader">
                  <div>
                    <span className="badge">{panel.items.length} screen{panel.items.length === 1 ? "" : "s"}</span>
                    <h3>{panel.label}</h3>
                  </div>
                  <p>{panel.description}</p>
                </div>
                <div className="moduleTaskPanelItems">
                  {panel.items.map((item, index) => (
                    <div className="uiSurfaceCard uiSurfaceCard--inset uiSurfaceCard--neutral moduleTaskItem cardHelpSurface" key={item.href}>
                      <HelpInfo topic={item.helpTopic as HelpTopicKey} inline />
                      <span className="moduleHubStepNumber">{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{item.label}</strong>
                        <p>{item.description}</p>
                      </div>
                      <Link className="primaryLink" href={item.href}>Open sub-screen →</Link>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <article className="uiSurfaceCard uiSurfaceCard--inset uiSurfaceCard--neutral moduleSearchEmpty cardHelpSurface">
            <HelpInfo topic="module-search" inline />
            <h3>No matching sub-screens</h3>
            <p>Try a broader term or clear the module search.</p>
            <button type="button" onClick={() => setQuery("")}>Clear search</button>
          </article>
        )}
      </section>
    </>
  );
}
