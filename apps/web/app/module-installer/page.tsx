import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listModuleHostEnrollmentsForUser } from "@/lib/module-host-installer-database";

import { ModuleInstallerConsole } from "./ModuleInstallerConsole";

export const dynamic = "force-dynamic";

export default async function ModuleInstallerPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fmodule-installer");
  }

  const model = await listModuleHostEnrollmentsForUser(
    session.user.id
  );

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 327 · Zero-touch preparation · owner approval
        </p>
        <h1>
          Module Installer &amp; Guided Host Enrollment
        </h1>
        <p className="lead">
          Discover an explicit host manifest, select the supported adapter,
          bind the exact tenant/workspace, preview capabilities, validate
          reference-only credential requirements and transport configuration,
          run a fail-closed install dry run, then require an owner decision
          before generating the host integration package.
        </p>
        <div className="heroActions">
          <Link
            className="secondaryButton"
            href="/autonomous-operations"
          >
            Autonomous Operations
          </Link>
          <Link
            className="secondaryButton"
            href="/credential-vault"
          >
            Credential Vault
          </Link>
          <Link
            className="secondaryButton"
            href="/app-connections"
          >
            App Connection Registry
          </Link>
          <a
            className="secondaryButton"
            href="/api/module-installer"
          >
            Enrollment JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>
          Zero-touch means automated preparation, not automatic trust.
        </strong>
        <p>
          Build 327 does not scan the network or filesystem, read raw secrets,
          grant capabilities, activate a connection, authorize trust, invent
          transport health, write files into the host, or create a Build 326
          autonomy policy automatically. Owner approval permits package
          generation only.
        </p>
      </section>

      <ModuleInstallerConsole initialModel={model} />
    </main>
  );
}
