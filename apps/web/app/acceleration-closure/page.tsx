import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccelerationClosureActions } from "@/components/acceleration-closure-actions";
import { auth } from "@/lib/auth";
import { build414ClosureSummary } from "@/lib/master-acceleration-closure";

export const dynamic = "force-dynamic";

export default async function AccelerationClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Facceleration-closure");

  const summary = build414ClosureSummary();

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 414 · Acceleration Cycle Closure</p>
        <h1>Completion Closure, Security Re-Certification & Communications Pilot</h1>
        <p className="lead">
          Close the seven-application acceleration cycle only where current
          evidence proves every target. Production deployment alone cannot close
          completion, security, communications or physical-host activation evidence.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/acceptance-advancement">
            Build 413 Evidence
          </Link>
          <Link className="secondaryButton" href="/master-security-certification">
            Security Certification
          </Link>
          <Link className="secondaryButton" href="/comms-complementary-plane">
            Communications Plane
          </Link>
          <Link className="secondaryButton" href="/master-suite">
            Server Shell
          </Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Build 414 closure summary">
        <div className="commandMetrics">
          <article><strong>{summary.requiredCompletionClosures}</strong><span>completion closures</span></article>
          <article><strong>{summary.requiredSecurityRecertifications}</strong><span>security tier re-certifications</span></article>
          <article><strong>{summary.communicationRelationships.length}</strong><span>communications pilot relationships</span></article>
          <article><strong>{summary.windowsServices.length}</strong><span>Windows service receipts</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Fail-closed final cycle gate.</strong>
        <p>
          All 49 completion-axis closure records must preserve the locked
          denominator and prove the +10-point target. All 35 security-tier
          re-certifications must include all six security dimensions. Missing,
          stale, HOLD or failed evidence remains unresolved.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Completion acceleration closure</p>
            <h2>Seven applications × seven independent axes</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          {summary.completionAxes.map((axis)=>(
            <article className="reviewBatchSummary" key={axis}>
              <h3>{axis}</h3>
              <p>Target evidence must be current, independently verified and bound to the original denominator.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Final security re-certification</p>
            <h2>T1–T5 across every application</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          {summary.securityTiers.map((tier)=>(
            <article className="reviewBatchSummary" key={tier}>
              <h3>{tier.replaceAll("_"," ")}</h3>
              <p>Requires all six Build 347 security dimensions, owner review and independent verification.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">24/7 Windows-host closure</p>
            <h2>Physical service activation remains independently evidenced</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          {summary.windowsServices.map((service)=>(
            <article className="reviewBatchSummary" key={service}>
              <span className="reviewStatus">PHYSICAL HOST RECEIPT REQUIRED</span>
              <h3>{service}</h3>
              <p>
                ACTIVE requires a signed host receipt proving startup mode,
                running state and preserved local authority. Production GREEN
                is never substituted for this receipt.
              </p>
            </article>
          ))}
        </div>
      </section>

      <AccelerationClosureActions />
    </main>
  );
}
