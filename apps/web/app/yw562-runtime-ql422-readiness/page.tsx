import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listBuild378RuntimeQl422ReadinessForUser } from "@/lib/yw562-runtime-ql422-protected-readiness-database";

export const dynamic = "force-dynamic";

export default async function Yw562RuntimeQl422ReadinessPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fyw562-runtime-ql422-readiness");
  }

  const data = await listBuild378RuntimeQl422ReadinessForUser(session.user.id);
  const model = data.model;

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 378 · YW562 runtime prerequisites &amp; QL-422 readiness
        </p>
        <h1>
          YW562 Runtime Prerequisite Evidence Intake, Fresh Source-Bound Receipt
          Admission, QL-422 Original-Host Witness/Three-Master Ledger
          Correlation &amp; Protected Activation Readiness
        </h1>
        <p className="lead">
          This controller stage admits only source-signed YW562 runtime
          prerequisite evidence, binds the exact fresh YW562 receipt to that
          evidence, correlates QL-422 protected original-host/three-Master
          evidence, and reports activation readiness without activating a
          receiver or changing connection state.
        </p>
        <div className="heroActions">
          <Link
            className="secondaryButton"
            href="/yw562-live-connection-continuity"
          >
            Build 377 continuity
          </Link>
          <Link className="secondaryButton" href="/source-signer-enrollment">
            Source signer
          </Link>
          <Link className="secondaryButton" href="/source-owner-review">
            Owner acceptance
          </Link>
          <a
            className="secondaryButton"
            href="/api/yw562-runtime-ql422-readiness"
          >
            Build 378 JSON
          </a>
        </div>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article>
            <strong>{model.runtimePrerequisiteState}</strong>
            <span>YW562 runtime prerequisites</span>
          </article>
          <article>
            <strong>{model.sourceReceiptState}</strong>
            <span>fresh exact source receipt</span>
          </article>
          <article>
            <strong>{model.freshSourceBoundReceiptAdmissionState}</strong>
            <span>Build 378 receipt admission</span>
          </article>
          <article>
            <strong>{model.exactOwnerAcceptanceState}</strong>
            <span>Master owner acceptance</span>
          </article>
          <article>
            <strong>{model.ql422CorrelationState}</strong>
            <span>QL-422 protected correlation</span>
          </article>
          <article>
            <strong>{model.protectedActivationReadinessState}</strong>
            <span>activation readiness</span>
          </article>
          <article>
            <strong>{model.connectionState}</strong>
            <span>connection remains fail-closed</span>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <article className="reviewBatchSummary">
          <span className="reviewStatus">
            {model.protectedActivationReadinessState}
          </span>
          <h2>Current Build 378 controller truth</h2>
          <p>
            <strong>Controller Build 377 main:</strong>{" "}
            <code>{model.controllerBaseRevision}</code>
          </p>
          <p>
            <strong>YW562 main:</strong>{" "}
            <code>{model.runtime.yw.main}</code>
          </p>
          <p>
            <strong>AI Hub Build 312 main:</strong>{" "}
            <code>{model.runtime.aiHub.main}</code>
          </p>
          <p>
            <strong>Comms QL-422 main:</strong>{" "}
            <code>{model.runtime.comms.main}</code>
          </p>
          <p>
            <strong>Original host:</strong>{" "}
            <code>{model.runtime.aiHub.originalHost}</code>
          </p>
          <p>
            <strong>Exact YW562 receipt:</strong>{" "}
            <code>{model.exactCurrentReceiptId ?? "NONE"}</code>
          </p>
          <p>
            <strong>Source-signed prerequisite evidence:</strong>{" "}
            <code>
              {model.latestRuntimePrerequisiteEvidence?.evidenceId ?? "NONE"}
            </code>
          </p>
          <p>
            <strong>Protected QL-422 correlation:</strong>{" "}
            <code>
              {model.latestProtectedQl422Correlation?.correlationEventId ??
                "NONE"}
            </code>
          </p>
          <p>
            <strong>Connection:</strong> {model.connectionState}
          </p>
          <p>
            <strong>Masters synced:</strong>{" "}
            {model.mastersSynced ? "YES" : "NO"}
          </p>
          {model.blockers.length > 0 && (
            <ul>
              {model.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>YW562 prerequisites must be source-signed.</strong>
        <p>
          Build 378 verifies the current enrolled YW Ed25519 signer, exact
          YW562 production revision, exact prerequisite tables, ordered schema
          chain, RLS, owner helper, protected summary, freshness and nonce
          before admitting runtime-prerequisite evidence.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>A fresh receipt is admitted only after runtime proof.</strong>
        <p>
          The exact current YW562 HEALTHY receipt must already be signer-bound,
          controller-admitted and replay-correlated. Build 378 then creates a
          separate append-only admission binding it to the current verified
          runtime-prerequisite evidence.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Owner references cannot become QL-422 proof.</strong>
        <p>
          Owners may record sanitized QL-422 reference metadata for review, but
          those rows are permanently CANDIDATE_HOLD. VERIFIED_CORRELATED
          requires a separate protected-runtime authority and cannot be written
          by the normal browser/runtime role.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>READY is not CONNECTED.</strong>
        <p>
          Even a complete Build 378 evidence set only yields
          READY_FOR_PROTECTED_ACTIVATION. Build 378 never switches the receiver
          on, never sets CONNECTED, and never marks the three Masters synced.
        </p>
      </section>
    </main>
  );
}
