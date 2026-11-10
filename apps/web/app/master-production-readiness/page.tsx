import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { MASTER_SHELL_SOURCE_IDS } from "@/lib/master-shell-contract-v1";
import {
  listMasterProductionReadinessForUser
} from "@/lib/master-production-readiness-database";

import { MasterProductionReadinessRecorder } from "./MasterProductionReadinessRecorder";

export const dynamic = "force-dynamic";

export default async function MasterProductionReadinessPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fmaster-production-readiness");
  }

  const model = await listMasterProductionReadinessForUser(session.user.id);

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--management">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 349 · Rosevear Suite Master Shell</p>
        <h1>Master Shell Production Readiness, Recovery, Owner Acceptance & Rollback</h1>
        <p className="lead">
          Consolidate current source-onboarding, operational recovery,
          accessibility, production safeguard and rollback evidence, then
          require an explicit owner decision before a source can be marked
          accepted.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/source-onboarding-pilot">
            Build 348 Onboarding
          </Link>
          <Link className="secondaryButton" href="/integration-recovery">
            Recovery Evidence
          </Link>
          <Link className="secondaryButton" href="/master-shell-command-center">
            Master Command Center
          </Link>
          <a className="secondaryButton" href="/api/master-production-readiness">
            Readiness JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Owner acceptance is explicit and separate from deployment.</strong>
        <p>
          Deployment GREEN, Build 348 ONBOARDED, recovery automation, historical
          owner-acceptance screens or a prepared rollback do not independently
          establish current production acceptance. Missing evidence remains HOLD.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Exact six-source final readiness</p>
            <h2>Production readiness and owner acceptance</h2>
          </div>
        </div>

        <div className="reviewBatchList">
          {model.sources.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <h3>{source.sourceId}</h3>
              <p>
                Readiness <strong>{source.effectiveState}</strong> · Build 348{" "}
                <strong>{source.onboardingState}</strong>
              </p>
              {source.run ? (
                <>
                  <p>
                    Version {source.run.readinessVersion} · reviewer{" "}
                    {source.run.reviewer} · owner decision{" "}
                    <strong>{source.run.ownerDecision.toUpperCase()}</strong>
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
                  {source.run.ownerDecisionEvidenceURI ? (
                    <p>
                      Owner evidence: {source.run.ownerDecisionEvidenceURI}
                      {" · "}{source.run.ownerDecisionDetail}
                    </p>
                  ) : null}
                </>
              ) : (
                <p>
                  No Build 349 readiness record exists. This source remains HOLD
                  pending fresh evidence and owner review.
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <MasterProductionReadinessRecorder sourceIds={[...MASTER_SHELL_SOURCE_IDS]} />

      <section className="dataQualityPolicyNote">
        <strong>Build 349 authority boundary</strong>
        <p>
          Build 349 records evidence and explicit owner decisions only. It does
          not activate a source connection, execute rollback, mutate peer state,
          release source-specific HOLDs, change consent or authorization, or
          replace any application-specific production gate.
        </p>
      </section>
    </main>
  );
}
