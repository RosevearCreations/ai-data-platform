"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { InterfacePreferenceController } from "@/app/InterfacePreferenceController";
import { NavigationAssist } from "@/app/NavigationAssist";
import { NavigationInsights } from "@/app/NavigationInsights";
import { OperatorCommandPalette } from "@/app/OperatorCommandPalette";
import {
  APPLICATION_NAVIGATION,
  MODULE_CARDS,
  activeNavigationGroup,
  activeNavigationItem,
  moduleHubHref
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
  const activeItem = activeNavigationItem(pathname);
  const moduleGroup = MODULE_CARDS.find((group) => group.id === activeGroup.id) ?? null;
  const activeModuleHub = moduleGroup ? moduleHubHref(moduleGroup.id) : null;

  return (
    <div className="applicationFrame">
      <InterfacePreferenceController />
      <a className="skipToContent" href="#application-main-content">Skip to main content</a>
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
          {APPLICATION_NAVIGATION.map((group) => {
            const groupModule = MODULE_CARDS.find((module) => module.id === group.id) ?? null;
            const hubHref = groupModule ? moduleHubHref(groupModule.id) : null;
            return (
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
                  {hubHref ? (
                    <Link
                      className={pathname === hubHref ? "applicationNavHubLink active" : "applicationNavHubLink"}
                      href={hubHref}
                      aria-current={pathname === hubHref ? "page" : undefined}
                    >
                      <strong>Module hub</strong>
                      <span>Overview and sub-screens</span>
                    </Link>
                  ) : null}

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
            );
          })}
        </nav>

        <div className="applicationSidebarFooter">
          <span>Build 197 · Marble Standard</span>
          <Link href="/help#help-system-standard">Help standard</Link>
        </div>
      </aside>

      <div className="applicationContent">
        <header className="applicationTopbar">
          <div className="applicationTopbarContext">
            <nav className="applicationBreadcrumbs" aria-label="Current application path">
              <Link href="/">Home</Link>
              {moduleGroup && activeModuleHub ? (
                <>
                  <span aria-hidden="true">›</span>
                  <Link href={activeModuleHub}>{moduleGroup.shortLabel}</Link>
                </>
              ) : null}
              {activeItem && activeItem.href !== "/" ? (
                <>
                  <span aria-hidden="true">›</span>
                  <span aria-current="page">{activeItem.label}</span>
                </>
              ) : moduleGroup && pathname === activeModuleHub ? (
                <>
                  <span aria-hidden="true">›</span>
                  <span aria-current="page">Module hub</span>
                </>
              ) : null}
            </nav>
            <span className="applicationTopbarEyebrow">Current module</span>
            <strong>{activeGroup.label}</strong>
          </div>
          <div className="applicationTopbarActions">
            {activeModuleHub ? <Link href={activeModuleHub}>Module hub</Link> : null}
            <OperatorCommandPalette />
            <NavigationAssist />
            <NavigationInsights />
            <Link href="/workflows">Workflow directory</Link>
            <Link href="/help">Help</Link>
            <HelpCircle topic={activeGroup.helpTopic} label={activeGroup.label} />
          </div>
        </header>
        <main id="application-main-content" className="applicationPage" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
