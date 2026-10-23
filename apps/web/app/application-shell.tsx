"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import {
  APPLICATION_NAVIGATION,
  activeNavigationGroup
} from "@/lib/application-navigation";

function HelpCircle({
  topic,
  label
}: {
  topic: string;
  label: string;
}) {
  return (
    <Link
      className="shellHelpCircle"
      href={"/help#" + topic}
      aria-label={"Help for " + label}
      title={"Help for " + label}
    >
      i
    </Link>
  );
}

export function ApplicationShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/api/")
  ) {
    return children;
  }

  const activeGroup = activeNavigationGroup(pathname);

  return (
    <div className="applicationFrame">
      <aside className="applicationSidebar" aria-label="Primary application navigation">
        <div className="applicationBrand">
          <Link href="/">
            <span className="applicationBrandMark" aria-hidden="true">AI</span>
            <span>
              <strong>AI Data Platform</strong>
              <small>Operator workspace</small>
            </span>
          </Link>
          <HelpCircle topic="shell-overview" label="Application navigation" />
        </div>

        <nav className="applicationNavigation">
          {APPLICATION_NAVIGATION.map((group) => (
            <details
              className="applicationNavGroup"
              key={group.id}
              open={group.id === activeGroup.id}
            >
              <summary>
                <span>{group.shortLabel}</span>
                <HelpCircle topic={group.helpTopic} label={group.label} />
              </summary>
              <div className="applicationNavItems">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <div className="applicationNavItemRow" key={item.href}>
                      <Link
                        className={isActive ? "applicationNavLink active" : "applicationNavLink"}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <strong>{item.label}</strong>
                        <span>{item.description}</span>
                      </Link>
                      <HelpCircle topic={item.helpTopic} label={item.label} />
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </nav>

        <div className="applicationSidebarFooter">
          <span>Build 117 shell</span>
          <Link href="/help#help-system-standard">Help standard</Link>
        </div>
      </aside>

      <div className="applicationContent">
        <header className="applicationTopbar">
          <div>
            <span className="applicationTopbarEyebrow">Current module</span>
            <strong>{activeGroup.label}</strong>
          </div>
          <div className="applicationTopbarActions">
            <Link href="/workflows">Workflow directory</Link>
            <Link href="/help">Help</Link>
            <HelpCircle topic={activeGroup.helpTopic} label={activeGroup.label} />
          </div>
        </header>
        <div className="applicationPage">{children}</div>
      </div>
    </div>
  );
}
