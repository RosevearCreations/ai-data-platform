import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { MASTER_SHELL_SOURCE_IDS } from "@/lib/master-shell-contract-v1";
import {
  listRelationshipCertificationForUser
} from "@/lib/relationship-certification-database";

import { RelationshipCertificationRecorder } from "./RelationshipCertificationRecorder";

export const dynamic = "force-dynamic";

export default async function RelationshipCertificationPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Frelationship-certification");
  }

  const model = await listRelationshipCertificationForUser(session.user.id);

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 346 · Rosevear Suite Master Shell</p>
        <h1>Relationship Integration Certification</h1>
        <p className="lead">
          Certify one-to-one, one-to-many, many-to-one and many-to-many
          relationships across contract, identity, replay, expiry, audience
          and tenant-isolation evidence.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/integration-certification">
            Build 304 certification
          </Link>
          <Link className="secondaryButton" href="/master-shell-command-center">
            Master Command Center
          </Link>
          <a className="secondaryButton" href="/api/relationship-certification">
            Certification JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Certification is evidence, not activation.</strong>
        <p>
          A relationship is certified only when all six required dimensions
          are present, fresh and PASS. Missing relationship-pattern evidence
          is UNKNOWN; expired runs are STALE. Deployment GREEN never converts
          either state into certification.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Pattern coverage</p>
            <h2>Four supported relationship patterns</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.patterns.map((pattern) => (
            <article className="reviewBatchSummary" key={pattern.pattern}>
              <h3>{pattern.pattern}</h3>
              <p>
                State <strong>{pattern.effectiveState}</strong> · relationships{" "}
                <strong>{pattern.relationships}</strong>
              </p>
              <p>
                PASS {pattern.passed} · FAIL {pattern.failed} · BLOCKED{" "}
                {pattern.blocked} · STALE {pattern.stale}
              </p>
            </article>
          ))}
        </div>
      </section>

      <RelationshipCertificationRecorder
        sourceIds={[...MASTER_SHELL_SOURCE_IDS]}
      />

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Latest evidence</p>
            <h2>Relationship certification runs</h2>
          </div>
        </div>

        <div className="reviewBatchList">
          {model.relationships.length === 0 ? (
            <article className="reviewBatchSummary">
              <h3>No relationship certification evidence recorded</h3>
              <p>
                No relationship is treated as certified until a complete
                six-dimension run is recorded.
              </p>
            </article>
          ) : null}

          {model.relationships.map((relationship) => (
            <article
              className="reviewBatchSummary"
              key={relationship.relationshipId}
            >
              <h3>{relationship.relationshipId}</h3>
              <p>
                <strong>{relationship.pattern}</strong> ·{" "}
                {relationship.effectiveState} · version{" "}
                {relationship.certificationVersion}
              </p>
              <p>
                Sources: {relationship.sourceIds.join(", ")} → destinations:{" "}
                {relationship.destinationIds.join(", ")}
              </p>
              <p>
                Reviewer {relationship.reviewer} · observed{" "}
                {relationship.observedAt} · expires {relationship.expiresAt}
              </p>

              <div className="reviewBatchList">
                {relationship.assertions.map((assertion) => (
                  <div className="reviewBatchSummary" key={assertion.dimension}>
                    <h4>{assertion.dimension}</h4>
                    <p>
                      <strong>{assertion.outcome.toUpperCase()}</strong> ·{" "}
                      {assertion.detail}
                    </p>
                    <small>{assertion.evidenceURI}</small>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 346 authority boundary</strong>
        <p>
          This surface records certification evidence only. It performs no
          source mutation, peer write, replay execution, connection
          activation, external probe or production acceptance.
        </p>
      </section>
    </main>
  );
}
