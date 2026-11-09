import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { MASTER_SHELL_SOURCE_IDS } from "@/lib/master-shell-contract-v1";
import { listSourceOnboardingForUser } from "@/lib/source-onboarding-pilot-database";

import { SourceOnboardingPilotRecorder } from "./SourceOnboardingPilotRecorder";

export const dynamic = "force-dynamic";

export default async function SourceOnboardingPilotPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fsource-onboarding-pilot");
  }

  const model = await listSourceOnboardingForUser(session.user.id);

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 348 · Rosevear Suite Master Shell</p>
        <h1>Six-Application Source Onboarding & Supervised Production Pilot</h1>
        <p className="lead">
          Onboard one source shell at a time using original source-owned
          evidence, current registry/security evidence, recovery and rollback
          readiness, explicit owner pilot authorization and a non-overlapping
          supervised pilot window.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/master-shell-registry">
            Source Registry
          </Link>
          <Link className="secondaryButton" href="/master-security-certification">
            Security Certification
          </Link>
          <Link className="secondaryButton" href="/master-shell-command-center">
            Master Command Center
          </Link>
          <a className="secondaryButton" href="/api/source-onboarding-pilot">
            Onboarding JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Incomplete independent evidence keeps the source on HOLD.</strong>
        <p>
          Deployment GREEN is not onboarding. A source cannot claim registry
          readiness PASS unless its current registry state is TEST_VERIFIED or
          CONNECTED, and it cannot claim security PASS unless Build 347 is
          currently PASS for that exact source.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Six source shells</p>
            <h2>Supervised onboarding queue</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.sources.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <h3>{source.sourceId}</h3>
              <p>
                Onboarding <strong>{source.effectiveState}</strong> · registry{" "}
                <strong>{source.registryState}</strong> · security{" "}
                <strong>{source.securityState}</strong>
              </p>
              {source.run ? (
                <>
                  <p>
                    Version {source.run.onboardingVersion} · reviewer{" "}
                    {source.run.reviewer} · expires {source.run.expiresAt}
                  </p>
                  <p>
                    Pilot: <strong>{source.run.pilotOutcome.toUpperCase()}</strong>
                  </p>
                  <div className="reviewBatchList">
                    {source.run.assertions.map((assertion) => (
                      <div className="reviewBatchSummary" key={assertion.prerequisite}>
                        <h4>{assertion.prerequisite}</h4>
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
                <p>
                  No onboarding record exists. This source remains HOLD until
                  independent evidence is recorded.
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <SourceOnboardingPilotRecorder sourceIds={[...MASTER_SHELL_SOURCE_IDS]} />

      <section className="dataQualityPolicyNote">
        <strong>Build 348 authority boundary</strong>
        <p>
          This surface records onboarding and pilot evidence only. It does not
          create credentials, call source endpoints, activate connections,
          release source HOLDs, mutate a peer, send communications or infer
          production acceptance.
        </p>
      </section>
    </main>
  );
}
