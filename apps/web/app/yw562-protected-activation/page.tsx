import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import Build379ActivationDecisionControls from "@/components/Build379ActivationDecisionControls";
import { auth } from "@/lib/auth";
import { listBuild379ProtectedActivationForUser } from "@/lib/yw562-protected-runtime-activation-decision-database";

export const dynamic = "force-dynamic";

export default async function Yw562ProtectedActivationPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fyw562-protected-activation");
  }

  const data = await listBuild379ProtectedActivationForUser(session.user.id);
  const model = data.model;
  const protectedAuthorityConfigured =
    Boolean(process.env.BUILD379_PROTECTED_INGEST_PUBLIC_KEY_PEM?.trim());

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 379 · protected runtime evidence &amp; activation decision
        </p>
        <h1>
          YW562 Protected Runtime Evidence Admission, Exact Receipt/Owner
          Continuity, QL-422 Protected Correlation Closure &amp; Supervised
          Activation Decision Execution
        </h1>
        <p className="lead">
          Build 379 separates protected machine evidence from the owner
          decision. A protected Ed25519 authority must admit the exact runtime
          package first. The owner can then approve or reject that exact package
          without turning on a receiver or manufacturing CONNECTED state.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/yw562-runtime-ql422-readiness">
            Build 378 readiness
          </Link>
          <Link className="secondaryButton" href="/source-owner-review">
            Source owner acceptance
          </Link>
          <a className="secondaryButton" href="/api/yw562-protected-activation">
            Build 379 JSON
          </a>
        </div>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article>
            <strong>{model.protectedRuntimeEvidenceState}</strong>
            <span>protected runtime admission</span>
          </article>
          <article>
            <strong>{model.exactReceiptOwnerContinuityState}</strong>
            <span>exact receipt / owner continuity</span>
          </article>
          <article>
            <strong>{model.ql422ProtectedCorrelationClosureState}</strong>
            <span>QL-422 protected closure</span>
          </article>
          <article>
            <strong>{model.supervisedActivationDecisionState}</strong>
            <span>supervised activation decision</span>
          </article>
          <article>
            <strong>{model.receiverState}</strong>
            <span>receiver</span>
          </article>
          <article>
            <strong>{model.connectionState}</strong>
            <span>connection</span>
          </article>
          <article>
            <strong>{model.mastersSynced ? "YES" : "NO"}</strong>
            <span>Masters synchronized</span>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <article className="reviewBatchSummary">
          <span className="reviewStatus">
            {model.supervisedActivationDecisionState}
          </span>
          <h2>Exact controller and runtime binding</h2>
          <p>
            <strong>AI Data Build 378 main:</strong>{" "}
            <code>{model.controllerBaseRevision}</code>
          </p>
          <p>
            <strong>YW562 main:</strong>{" "}
            <code>{model.runtime.yw.main}</code>
          </p>
          <p>
            <strong>AI Hub Build {model.runtime.aiHub.build} main:</strong>{" "}
            <code>{model.runtime.aiHub.main}</code>
          </p>
          <p>
            <strong>Comms {model.runtime.comms.build} main:</strong>{" "}
            <code>{model.runtime.comms.main}</code>
          </p>
          <p>
            <strong>Original host:</strong>{" "}
            <code>{model.runtime.aiHub.originalHost}</code>
          </p>
          <p>
            <strong>Protected authority configured:</strong>{" "}
            {protectedAuthorityConfigured ? "YES" : "NO — protected intake remains unavailable"}
          </p>
          <p>
            <strong>Protected admission:</strong>{" "}
            <code>{model.latestProtectedAdmission?.admissionEventId ?? "NONE"}</code>
          </p>
          <p>
            <strong>Exact receipt:</strong>{" "}
            <code>{model.build378.exactCurrentReceiptId ?? "NONE"}</code>
          </p>
          <p>
            <strong>Exact owner decision:</strong>{" "}
            <code>{model.build378.exactOwnerDecisionId ?? "NONE"}</code>
          </p>
          <p>
            <strong>QL-422 protected correlation:</strong>{" "}
            <code>
              {model.build378.latestProtectedQl422Correlation?.correlationEventId ??
                "NONE"}
            </code>
          </p>
          {model.blockers.length > 0 && (
            <ul>
              {model.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          )}
        </article>

        <Build379ActivationDecisionControls
          canDecide={data.canDecide}
          state={model.supervisedActivationDecisionState}
        />
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Protected evidence is machine-authenticated.</strong>
        <p>
          The protected intake accepts POST only, verifies an Ed25519 signature
          against the server-pinned public key, enforces five-minute freshness,
          rejects replayed nonces, and writes through a database role that the
          normal browser runtime cannot assume.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Exact receipt and owner continuity cannot drift.</strong>
        <p>
          Approval is blocked if the current YW562 receipt, Build 378 receipt
          admission, Master owner ACCEPT, or QL-422 protected correlation no
          longer matches the protected admission.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Decision execution is not runtime activation.</strong>
        <p>
          An approval produces
          ACTIVATION_AUTHORIZED_PENDING_EXTERNAL_RUNTIME and a durable execution
          receipt. Build 379 still records receiver OFF, connection
          DISCONNECTED_HOLD and Masters synchronized = false.
        </p>
      </section>
    </main>
  );
}
