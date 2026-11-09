import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  listMasterSysopShellForUser
} from "@/lib/master-sysop-database";

import { MasterSysopControls } from "./MasterSysopControls";

export const dynamic = "force-dynamic";

export default async function MasterSysopPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fmaster-sysop");
  }

  const model = await listMasterSysopShellForUser(
    session.user.id,
    {
      name: session.user.name,
      email: session.user.email
    }
  );

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--management">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 341 · Rosevear Suite Outer Sysop Shell
        </p>
        <h1>Sysop Navigation, Context Handoff &amp; Tenant Isolation</h1>
        <p className="lead">
          Each Sysop uses a separate authenticated account. The outer shell
          may carry a bounded tenant/workspace hint, but it never transfers
          login authority, elevates a tenant role or authorizes the
          destination application.
        </p>
        <div className="heroActions">
          <Link
            className="secondaryButton"
            href="/master-shell-command-center"
          >
            Master Command Center
          </Link>
          <Link
            className="secondaryButton"
            href="/master-application-inventory"
          >
            Application Inventory
          </Link>
          <a className="secondaryButton" href="/api/master-sysop">
            Sysop JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Navigation is not authorization.</strong>
        <p>
          Handoff context contains no user ID, password, email, session cookie
          or destination permission. External destinations must authenticate
          the person again and enforce their own roles and tenant boundaries.
          Unmapped or unauthorized tenant context remains unavailable.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Authenticated session</p>
            <h2>{model.principal.name}</h2>
          </div>
        </div>
        <article className="reviewBatchSummary">
          <p>
            Account <strong>{model.principal.email}</strong> · Master
            Sysop role{" "}
            <strong>{model.principal.sysopRole ?? "NONE"}</strong> · active{" "}
            <strong>
              {model.principal.activeSysop ? "yes" : "no"}
            </strong>
          </p>
          <p>
            Separate authenticated session required <strong>yes</strong> ·
            user identity transferred in handoff <strong>no</strong>.
          </p>
        </article>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">RLS-visible tenant/workspace context</p>
            <h2>Current account memberships</h2>
          </div>
        </div>
        {model.workspaces.length ? (
          <div className="reviewBatchList">
            {model.workspaces.map((workspace) => (
              <article
                className="reviewBatchSummary"
                key={workspace.id}
              >
                <span className="reviewStatus">{workspace.role}</span>
                <h3>{workspace.name}</h3>
                <p>
                  <code>{workspace.slug}</code> · {workspace.type}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            This authenticated account has no RLS-visible workspace
            memberships.
          </div>
        )}
      </section>

      <MasterSysopControls
        activeSysop={model.principal.activeSysop}
        claimEligible={model.claimEligible}
        sysopRole={model.principal.sysopRole}
        destinations={model.destinations}
        members={model.members}
      />
    </main>
  );
}
