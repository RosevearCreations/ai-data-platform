import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listBuild370DecisionForUser } from "@/lib/manifest-custody-receipt-decision-database";

export const dynamic = "force-dynamic";

export default async function ManifestCustodyReceiptDecisionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fmanifest-custody-receipt-decision");
  }

  const data = await listBuild370DecisionForUser(session.user.id);
  const model = data.model;

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 370 · Independent production observation</p>
        <h1>
          Independent Deployed Manifest Observation, Source Signer Custody Evidence
          Correlation, Fresh Receipt Admission Closure &amp; Three-Master Runtime Decision Recheck
        </h1>
        <p className="lead">
          Compare live Vercel production deployment metadata and deployed manifests to exact Git
          production revisions, correlate signer custody only against controller-trusted enrollment
          evidence, close fresh receipt admission only when all source evidence agrees, and recheck
          the current AI Hub 309 / Comms QL-417 Master runtime decision gate.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/source-refresh-evidence">Build 369 Source Refresh</Link>
          <Link className="secondaryButton" href="/source-signer-enrollment">Signer Custody Intake</Link>
          <a className="secondaryButton" href="/api/manifest-custody-receipt-decision">Build 370 JSON</a>
        </div>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article><strong>{model.summary.exactManifestRevisionObserved}/2</strong><span>exact production revisions observed</span></article>
          <article><strong>{model.summary.fullyConfirmedManifestIdentity}/2</strong><span>full product-shell manifest identities confirmed</span></article>
          <article><strong>{model.summary.custodyCorrelated}/2</strong><span>source signer custody correlations</span></article>
          <article><strong>{model.summary.freshReceiptClosure}/2</strong><span>fresh receipt admission closures</span></article>
          <article><strong>{model.summary.threeMasterGate}</strong><span>three-Master runtime gate</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Independent manifest observation now confirms both production SHAs.</strong>
        <p>
          Yard Workers YW560 deployment <code>dpl_5GPLC36MjUc8KUsyNS2zqQu7Nc8d</code>
          served manifest revision <code>2c7234c975528a3a3ab76ca22829c8b4a541de97</code>.
          iCamp 244 deployment <code>dpl_48KWSeSdV6KhujxbUeSs8Ao7VMWM</code>
          served manifest revision <code>69d46513b45e340a4e295165abbd3d99b3a62274</code>.
          Both match their exact production Git revisions.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Yard Workers source-role discrepancy remains visible.</strong>
        <p>
          Its deployed manifest reports <code>source_role=business_shell</code> while the
          Master product-source contract requires <code>platform_shell</code>. The revision
          is exact, but the product-shell identity remains HOLD until Yard Workers corrects
          or explicitly reconciles that role. iCamp reports the expected platform-shell role.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Source closure</p>
            <h2>Manifest, custody, signed receipt and runtime decision</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.sources.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <span className="reviewStatus">{source.decisionState}</span>
              <h3>{source.label}</h3>
              <p><strong>Production main:</strong> <code>{source.productionMain}</code></p>
              <p><strong>Deployment:</strong> <code>{source.deploymentId}</code></p>
              <p><strong>Observed manifest revision:</strong> <code>{source.observedManifestRevision}</code></p>
              <p><strong>Observed source role:</strong> {source.observedSourceRole}</p>
              <p><strong>Manifest state:</strong> {source.manifestState}</p>
              <p><strong>Signer custody:</strong> {source.custodyState}</p>
              <p><strong>Fresh signed HEALTHY receipt:</strong> {source.receiptState}</p>
              <p><strong>Source closure:</strong> {source.sourceClosureState}</p>
              <p><strong>Three-Master runtime gate:</strong> {source.masterGateState}</p>
              <p><strong>Latest owner decision:</strong> {source.latestOwnerDecision}</p>
              {source.blockers.length > 0 && (
                <ul>{source.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Custody and receipt gates remain independent.</strong>
        <p>
          Neither source currently has a controller-correlated independently enrolled Ed25519
          signer/custody chain or a current admitted signed HEALTHY receipt. Exact deployed
          manifests therefore do not create source acceptance on their own.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Three-Master runtime decision remains HOLD.</strong>
        <p>
          AI Hub 309 still reports the original Ree installed-process witness, one-TEST,
          receiver-signed ACK, sampled uptime and AI Data owner decision as unresolved.
          Comms QL-417 is a protected discrepancy worklist and still requires real original-host
          telemetry, durable replay admission, signed Comms ACK and owner-decision continuity.
          Receiver and connection remain OFF/HOLD.
        </p>
      </section>
    </main>
  );
}
