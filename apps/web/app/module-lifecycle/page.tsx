import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listModuleLifecycleForUser } from "@/lib/module-lifecycle-database";

import { ModuleLifecycleConsole } from "./ModuleLifecycleConsole";

export const dynamic = "force-dynamic";

export default async function ModuleLifecyclePage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fmodule-lifecycle");
  }

  const model = await listModuleLifecycleForUser(session.user.id);

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 328 · version inventory · staged upgrade · rollback
        </p>
        <h1>Module Lifecycle &amp; Upgrade Orchestration</h1>
        <p className="lead">
          Record owner-observed installed versions, prepare compatibility and
          prerequisite checks, stage canary upgrades, require owner approval,
          preserve last-known-good versions, record failures and prepare
          evidence-backed rollback plans without automatically changing a host.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/module-installer">
            Module Installer
          </Link>
          <Link className="secondaryButton" href="/autonomous-operations">
            Autonomous Operations
          </Link>
          <a className="secondaryButton" href="/api/module-lifecycle">
            Lifecycle JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Breaking upgrades remain fail closed.</strong>
        <p>
          A plan that crosses a major compatibility boundary cannot become
          approval-ready unless explicit owner policy allows it. Database,
          schema and rollback-backup prerequisites must be verified, migration
          dependencies must be ordered, and any configured canary requirement
          must be satisfied. Planning and approval never execute an upgrade.
        </p>
      </section>

      <ModuleLifecycleConsole initialModel={model} />
    </main>
  );
}
