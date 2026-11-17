import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { readBuild416OriginalHostContinuity } from "@/lib/build416-original-host-database";
import {
  BUILD_416_SERVICE_POLICIES,
  BUILD_416_SOURCE_REVIEW,
  build416SourceContractSummary
} from "@/lib/master-original-host-continuity";

export const dynamic="force-dynamic";

function badge(value:string) {
  return value.replaceAll("_"," ");
}

export default async function OriginalHostContinuityPage() {
  const session=await auth.api.getSession({headers:await headers()});
  if(!session) redirect("/sign-in?callbackUrl=%2Foriginal-host-continuity");

  const model=await readBuild416OriginalHostContinuity(session.user.id,new Date().toISOString());
  const summary=build416SourceContractSummary();

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 416 · Original-Host Continuity</p>
        <h1>Windows Boot Witness, Runtime Custody & Independent Peer ACK</h1>
        <p className="lead">
          This surface separates source CODE GREEN from physical Windows acceptance.
          It does not install or start workers, enable module intents, rotate secrets,
          activate a receiver or control an actuator.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/evidence-freshness">Build 415 Freshness</Link>
          <Link className="secondaryButton" href="/acceleration-closure">Build 414 Closure</Link>
          <Link className="secondaryButton" href="/master-suite">Server Shell</Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>{badge(model.governanceState)}</strong>
        <p>
          Operational acceptance remains HOLD / NOT VERIFIED until the exact original-host
          service/boot witness and independently signed peer ACK evidence exist.
        </p>
      </section>

      <section className="reviewSummary" aria-label="Build 416 evidence summary">
        <div className="commandMetrics">
          <article><strong>{model.counts.services}</strong><span>Windows worker identities</span></article>
          <article><strong>{model.counts.hostReceiptsPresent}</strong><span>host witness receipts</span></article>
          <article><strong>{model.counts.peerAcksPresent}/{model.counts.requiredPeerAcks}</strong><span>peer ACK receipts</span></article>
          <article><strong>{model.counts.rotationReceiptsPresent}</strong><span>rotation receipts</span></article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading"><div>
          <p className="eyebrow">Current source contract review</p>
          <h2>Exact reviewed revisions — no old-document inference</h2>
        </div></div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Rosevear AI Hub</h3>
            <p>Reviewed main: <code>{BUILD_416_SOURCE_REVIEW.hubMainSha}</code></p>
            <p>Outbound read-only event client: <strong>{BUILD_416_SOURCE_REVIEW.hubOutboundClientContract}</strong></p>
            <p>SCM worker installer: <strong>{BUILD_416_SOURCE_REVIEW.hubWorkerScmInstaller}</strong></p>
            <p>Build 356 unattended installer: <strong>{BUILD_416_SOURCE_REVIEW.hubUnattendedTaskInstaller}</strong></p>
          </article>
          <article className="reviewBatchSummary">
            <h3>AI Data Platform</h3>
            <p>Reviewed main: <code>{BUILD_416_SOURCE_REVIEW.aiDataMainSha}</code></p>
            <p>Exact read-only sink route: <strong>{BUILD_416_SOURCE_REVIEW.aiDataSinkRoute}</strong></p>
            <p>Windows worker installer: <strong>{BUILD_416_SOURCE_REVIEW.aiDataWorkerScmInstaller}</strong></p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Rosevear Comms Hub</h3>
            <p>Reviewed main: <code>{BUILD_416_SOURCE_REVIEW.commsMainSha}</code></p>
            <p>Exact read-only sink route: <strong>{BUILD_416_SOURCE_REVIEW.commsSinkRoute}</strong></p>
            <p>Windows worker installer: <strong>{BUILD_416_SOURCE_REVIEW.commsWorkerScmInstaller}</strong></p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading"><div>
          <p className="eyebrow">Owner startup policy target</p>
          <h2>Fixed SCM identities · Automatic startup required</h2>
        </div></div>
        <div className="masterGovernanceGrid">
          {Object.entries(BUILD_416_SERVICE_POLICIES).map(([serviceId,policy])=>(
            <article className="reviewBatchSummary" key={serviceId}>
              <h3>{policy.scmServiceName}</h3>
              <p>{serviceId}</p>
              <p>Required mode: <strong>{policy.requiredStartupMode}</strong></p>
              <p>Observed physical state: <strong>NOT VERIFIED</strong></p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading"><div>
          <p className="eyebrow">Acceptance specification</p>
          <h2>Boot witness + peer ACK are separate mandatory evidence</h2>
        </div></div>
        <div className="masterGovernanceGrid">
          <article className="reviewBatchSummary">
            <h3>Original-host boot witness</h3>
            <p>{summary.originalHost} · exact service identity · AUTOMATIC · pre/post boot digests · pre-login start · recovery policy · no manual intervention · 10-minute and 24-hour continuity.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Independent peer ACK</h3>
            <p><code>{summary.readOnlySinkPath}</code> · route implemented · mTLS enrolled and verified · pinned peer leaf · signed RECEIVED ACK · replay protection · receipt-only/no-command semantics.</p>
          </article>
          <article className="reviewBatchSummary">
            <h3>Rotation & rollback</h3>
            <p>Maximum 24-hour overlap · candidate handshake · peer re-enrollment · fresh ACK under candidate · retain prior credential during overlap · retire old only after acceptance · rollback ready.</p>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Secrets are deliberately excluded.</strong>
        <p>
          Evidence uses SHA-256 digests and fixed public identities only. No password,
          private key, certificate value, private absolute path or raw service credential
          is required by this dashboard.
        </p>
      </section>
    </main>
  );
}
