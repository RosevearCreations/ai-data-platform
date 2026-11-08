import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listCrossHostCertificationForUser } from "@/lib/cross-host-certification-database";

import { CrossHostCertificationConsole } from "./CrossHostCertificationConsole";

export const dynamic = "force-dynamic";

export default async function ModuleCertificationPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fmodule-certification"
    );
  }

  const model = await listCrossHostCertificationForUser(
    session.user.id
  );

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 329 · cross-host observability · universal certification
        </p>
        <h1>
          Cross-Host Compatibility &amp; Certification Control Plane
        </h1>
        <p className="lead">
          Compare installed host/module contracts, record synthetic or genuine
          live evidence, certify authentication, tenant, capability, event,
          workflow, data, search, recovery and offline behavior, track
          latency/error/retry telemetry, and surface regressions per host.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/module-lifecycle">
            Module Lifecycle
          </Link>
          <Link className="secondaryButton" href="/module-installer">
            Module Installer
          </Link>
          <Link
            className="secondaryButton"
            href="/integration-certification"
          >
            Six-App Certification
          </Link>
          <a
            className="secondaryButton"
            href="/api/module-certification"
          >
            Certification JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>
          Synthetic fixtures never prove a live host.
        </strong>
        <p>
          Fixture evidence can certify the reusable harness only. A host is
          marked live-certified only when every certification dimension passes
          with concrete live evidence references, compatibility matches the
          registered Build 328 host record, telemetry contains real samples,
          and no required evidence is blocked or failed. Certification does not
          activate connections, grant capabilities, execute workflows or mutate
          a host.
        </p>
      </section>

      <CrossHostCertificationConsole initialModel={model} />
    </main>
  );
}
