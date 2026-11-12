import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listBuild380ExternalRuntimeActivationForUser } from "@/lib/yw562-external-runtime-activation-closure-database";

export const dynamic = "force-dynamic";

export default async function Yw562RuntimeActivationClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fyw562-runtime-activation-closure");
  }

  const data = await listBuild380ExternalRuntimeActivationForUser(
    session.user.id
  );
  const model = data.model;
  const protectedAuthorityConfigured =
    Boolean(process.env.BUILD380_EXTERNAL_ACTIVATION_PUBLIC_KEY_PEM?.trim()) &&
    Boolean(process.env.BUILD380_AI_HUB_RUNTIME_PUBLIC_KEY_PEM?.trim()) &&
    Boolean(process.env.BUILD380_COMMS_RUNTIME_PUBLIC_KEY_PEM?.trim()) &&
    Boolean(process.env.BUILD380_CONTROLLER_RUNTIME_PUBLIC_KEY_PEM?.trim());

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 380 · protected external runtime activation
        </p>
        <h1>
          YW562 Protected External Runtime Activation Ceremony, Receiver-State
          Proof, Verified CONNECTED Transition &amp; Three-Master
          Synchronization Closure
        </h1>
        <p className="lead">
          Build 380 accepts only a fresh Ed25519-signed external runtime
          ceremony. A successful ceremony must prove receiver ON, preserve the
          exact Build 379 owner authorization and current YW562 receipt, append
          an independent CONNECTED registry record, and close three distinct
          Master runtime receipts in one transaction.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/yw562-protected-activation">
            Build 379 authorization
          </Link>
          <Link className="secondaryButton" href="/master-shell-registry">
            Source registry
          </Link>
          <a
            className="secondaryButton"
            href="/api/yw562-runtime-activation-closure"
          >
            Build 380 JSON
          </a>
        </div>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article>
            <strong>{model.build379AuthorizationState}</strong>
            <span>Build 379 authorization</span>
          </article>
          <article>
            <strong>{model.registryState}</strong>
            <span>YW562 registry</span>
          </article>
          <article>
            <strong>{model.externalRuntimeActivationCeremonyState}</strong>
            <span>activation ceremony</span>
          </article>
          <article>
            <strong>{model.receiverStateProof}</strong>
            <span>receiver state proof</span>
          </article>
          <article>
            <strong>{model.verifiedConnectedTransitionState}</strong>
            <span>CONNECTED transition</span>
          </article>
          <article>
            <strong>{model.threeMasterSynchronizationClosureState}</strong>
            <span>three-Master closure</span>
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
          <span className="reviewStatus">{model.connectionState}</span>
          <h2>Exact runtime binding</h2>
          <p>
            <strong>AI Data Build 379 main:</strong>{" "}
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
            <strong>Protected activation authorities configured:</strong>{" "}
            {protectedAuthorityConfigured
              ? "YES — activation + all three Master pins"
              : "NO — one or more protected signer pins are unavailable"}
          </p>
          <p>
            <strong>Current YW registry evidence:</strong>{" "}
            <code>{model.latestRegistryEvidence?.evidenceId ?? "NONE"}</code>
          </p>
          <p>
            <strong>Activation ceremony:</strong>{" "}
            <code>{model.latestCeremony?.ceremonyEventId ?? "NONE"}</code>
          </p>
          <p>
            <strong>CONNECTED transition:</strong>{" "}
            <code>
              {model.latestConnectedTransition?.transitionEventId ?? "NONE"}
            </code>
          </p>
          <p>
            <strong>Three-Master closure:</strong>{" "}
            <code>{model.latestThreeMasterClosure?.closureEventId ?? "NONE"}</code>
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
        <strong>The browser cannot perform the ceremony.</strong>
        <p>
          The protected endpoint is POST-only, verifies a server-pinned Ed25519
          activation authority and writes through the separate protected
          database role. The normal application runtime has no INSERT privilege
          on Build 380 evidence.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>CONNECTED is a protected transition, not a UI choice.</strong>
        <p>
          The transaction requires current independent YW562 TEST evidence,
          exact Build 379 authorization, a live receiver probe, and all three
          Master runtime receipts. If any check fails, the registry transition
          and synchronization closure are rolled back together.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Freshness remains fail-closed.</strong>
        <p>
          Even after a successful ceremony, the displayed connection remains
          CONNECTED only while the receiver proof and independent CONNECTED
          registry evidence are current. Stale evidence returns the controller
          to DISCONNECTED_HOLD rather than assuming uptime.
        </p>
      </section>
    </main>
  );
}
