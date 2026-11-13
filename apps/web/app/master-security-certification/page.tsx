import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { MASTER_SHELL_SOURCE_IDS } from "@/lib/master-shell-contract-v1";
import {
  listMasterSecurityCertificationForUser
} from "@/lib/master-security-certification-database";

import { MasterSecurityCertificationRecorder } from "./MasterSecurityCertificationRecorder";

export const dynamic = "force-dynamic";

export default async function MasterSecurityCertificationPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fmaster-security-certification");
  }

  const model = await listMasterSecurityCertificationForUser(session.user.id);

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 347 · Rosevear Suite Master Shell</p>
        <h1>Master Security, Authorization, Consent & Evidence Certification</h1>
        <p className="lead">
          Reconcile source signing and trust, role authorization, consent,
          sensitive-data handling, audit evidence and fail-closed controls
          without replacing source-specific authority.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/relationship-certification">
            Relationship certification
          </Link>
          <Link className="secondaryButton" href="/security-access-review">
            Security & access review
          </Link>
          <Link className="secondaryButton" href="/master-shell-command-center">
            Master Command Center
          </Link>
          <a className="secondaryButton" href="/api/master-security-certification">
            Certification JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Security certification requires independent evidence.</strong>
        <p>
          Signing software does not prove trusted signer custody. Membership
          does not imply consent. Role/device acceptance does not grant source
          authority. Missing evidence remains UNKNOWN, and expired evidence
          becomes STALE.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Suite security posture</p>
            <h2>Six source security certifications</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.sources.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <h3>{source.sourceId}</h3>
              <p>
                Effective state <strong>{source.effectiveState}</strong>
                {source.certificationVersion
                  ? " · version " + source.certificationVersion
                  : ""}
              </p>
              {source.run ? (
                <>
                  <p>
                    Reviewer {source.run.reviewer} · observed {source.run.observedAt}
                    {" · "}expires {source.run.expiresAt}
                  </p>
                  <div className="reviewBatchList">
                    {source.run.assertions.map((assertion) => (
                      <div className="reviewBatchSummary" key={assertion.dimension}>
                        <h4>{assertion.dimension}</h4>
                        <p>
                          <strong>{assertion.outcome.toUpperCase()}</strong>
                          {" · "}{assertion.detail}
                        </p>
                        <small>{assertion.evidenceURI}</small>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p>No certification evidence recorded for this source.</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <MasterSecurityCertificationRecorder
        sourceIds={[...MASTER_SHELL_SOURCE_IDS]}
      />

      <section className="dataQualityPolicyNote">
        <strong>Build 347 authority boundary</strong>
        <p>
          This certification records evidence only. It performs no source
          mutation, peer write, external probe, consent grant, signer
          enrollment, role grant, HOLD release, connection activation or
          production acceptance.
        </p>
      </section>
    </main>
  );
}
