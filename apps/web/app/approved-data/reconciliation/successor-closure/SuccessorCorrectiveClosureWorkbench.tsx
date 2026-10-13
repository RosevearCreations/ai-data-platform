"use client";

import { useMemo, useState } from "react";

import type {
  ReconciliationExceptionReclosure,
  SuccessorCorrectiveClosureModel,
  SuccessorCorrectiveDeliveryReconciliation
} from "@/lib/successor-corrective-delivery-reconciliation";
import type { SuccessorCorrectiveLiveDelivery } from "@/lib/successor-corrective-delivery-execution";

function confirmationPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "RE-CLOSE VERIFIED " + target.toUpperCase() + " EXCEPTION";
}

async function callApi(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
) {
  const response = await fetch(
    "/api/approved-data/reconciliation/successor-closure",
    {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : "Successor reconciliation request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestByDelivery(
  reconciliations: SuccessorCorrectiveDeliveryReconciliation[]
) {
  const map = new Map<string, SuccessorCorrectiveDeliveryReconciliation>();
  for (const reconciliation of reconciliations) {
    const key =
      reconciliation.workspaceId + ":" + reconciliation.successorDeliveryId;
    if (!map.has(key)) map.set(key, reconciliation);
  }
  return map;
}

function reclosureByDelivery(reclosures: ReconciliationExceptionReclosure[]) {
  return new Map(
    reclosures.map((item) => [
      item.workspaceId + ":" + item.successorDeliveryId,
      item
    ])
  );
}

export function SuccessorCorrectiveClosureWorkbench({
  initialModel
}: {
  initialModel: SuccessorCorrectiveClosureModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirmations, setConfirmations] = useState<Record<string, string>>({});

  const accepted = useMemo(
    () =>
      model.successor.deliveries.filter(
        (delivery) => delivery.status === "accepted"
      ),
    [model.successor.deliveries]
  );
  const latest = useMemo(
    () => latestByDelivery(model.reconciliations),
    [model.reconciliations]
  );
  const closed = useMemo(
    () => reclosureByDelivery(model.reclosures),
    [model.reclosures]
  );

  function applyModel(payload: Record<string, unknown>) {
    if (payload.model) {
      setModel(payload.model as unknown as SuccessorCorrectiveClosureModel);
    } else if (payload.successor) {
      setModel(payload as unknown as SuccessorCorrectiveClosureModel);
    }
  }

  async function verify(delivery: SuccessorCorrectiveLiveDelivery) {
    const key = "verify:" + delivery.deliveryId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", {
        action: "verify-successor-state",
        workspaceId: delivery.workspaceId,
        successorDeliveryId: delivery.deliveryId
      });
      applyModel(payload);
      setMessage(
        payload.result === "matched"
          ? "Successor consumer state matches the exact delivered package."
          : "Successor read-back recorded without closing the exception."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Successor state verification failed."
      );
      const response = await fetch(
        "/api/approved-data/reconciliation/successor-closure",
        { cache: "no-store" }
      );
      if (response.ok) {
        setModel((await response.json()) as SuccessorCorrectiveClosureModel);
      }
    } finally {
      setBusy("");
    }
  }

  async function reclose(
    delivery: SuccessorCorrectiveLiveDelivery,
    reconciliation: SuccessorCorrectiveDeliveryReconciliation
  ) {
    const key = "reclose:" + delivery.deliveryId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("PATCH", {
        action: "reclose-verified-exception",
        workspaceId: delivery.workspaceId,
        caseId: reconciliation.caseId,
        successorDeliveryId: delivery.deliveryId,
        successorReconciliationId: reconciliation.successorReconciliationId,
        reclosureNote: notes[delivery.deliveryId] ?? "",
        confirmation: confirmations[delivery.deliveryId] ?? ""
      });
      applyModel(payload);
      setMessage(
        "Verified successor re-closure recorded. The original closure and reopen evidence remain immutable."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Successor re-closure failed."
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <section className="correctiveSummary">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Successor verification</p>
            <h2>Re-closure readiness</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.acceptedSuccessorDeliveries}</strong><span>accepted successor deliveries</span></article>
          <article><strong>{model.totals.neverVerified}</strong><span>await independent read-back</span></article>
          <article><strong>{model.totals.matchedLatest}</strong><span>latest matches</span></article>
          <article><strong>{model.totals.driftLatest}</strong><span>still drifted</span></article>
          <article><strong>{model.totals.verifiedReclosures}</strong><span>verified re-closures</span></article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>Delivery acceptance does not close a reopened exception</strong>
        <p>
          Build 059 performs a fresh consumer state read-back against the exact
          Build 058 successor package. Only the latest matched verification can
          authorize a new re-closure record. The original Build 055 closure,
          Build 056 reopen and Build 057/058 evidence remain unchanged.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Accepted Build 058 deliveries</p>
            <h2>Verify & re-close</h2>
          </div>
        </div>
        <div className="publicationList">
          {accepted.map((delivery) => {
            const key = delivery.workspaceId + ":" + delivery.deliveryId;
            const reconciliation = latest.get(key);
            const reclosure = closed.get(key);
            const plan = model.successor.planning.plans.find(
              (item) =>
                item.workspaceId === delivery.workspaceId &&
                item.successorPlanId === delivery.successorPlanId
            );
            const caseRecord =
              model.successor.planning.regression.closure.corrective.triage.cases.find(
                (item) =>
                  item.workspaceId === delivery.workspaceId &&
                  item.caseId === plan?.caseId
              );
            const canReclose =
              reconciliation?.status === "matched" &&
              caseRecord?.status === "open" &&
              !reclosure;
            const phrase = confirmationPhrase(delivery.target);
            return (
              <article
                className="publicationCard correctiveCard"
                key={delivery.deliveryId}
              >
                <header>
                  <div>
                    <span
                      className={
                        "publishState publishState-" +
                        (reclosure
                          ? "published"
                          : reconciliation?.status === "matched"
                            ? "published"
                            : "withdrawn")
                      }
                    >
                      {reclosure
                        ? "re-closed"
                        : reconciliation?.status ?? "awaiting verification"}
                    </span>
                    <h3>{delivery.target} · successor read-back</h3>
                    <p>{delivery.workspaceName}</p>
                  </div>
                  <span className="badge">
                    {reclosure
                      ? "verified successor closure"
                      : "case " + (caseRecord?.status ?? "unknown")}
                  </span>
                </header>

                <dl className="publicationEvidence">
                  <div><dt>Successor delivery</dt><dd>{delivery.deliveryId}</dd></div>
                  <div><dt>Successor plan</dt><dd>{delivery.successorPlanId}</dd></div>
                  <div><dt>Successor package</dt><dd>{delivery.successorPackageId}</dd></div>
                  <div><dt>Package fingerprint</dt><dd>{delivery.successorPackageFingerprint}</dd></div>
                  {reconciliation ? (
                    <>
                      <div><dt>Latest verification</dt><dd>{reconciliation.successorReconciliationId}</dd></div>
                      <div><dt>Verification fingerprint</dt><dd>{reconciliation.verificationFingerprint}</dd></div>
                      <div><dt>Counts</dt><dd>{reconciliation.matchedCount} matched · {reconciliation.mismatchedCount} mismatched · {reconciliation.missingCount} missing</dd></div>
                    </>
                  ) : null}
                  {reclosure ? (
                    <>
                      <div><dt>Re-closure</dt><dd>{reclosure.reclosureId}</dd></div>
                      <div><dt>Re-closure fingerprint</dt><dd>{reclosure.reclosureFingerprint}</dd></div>
                      <div><dt>Closed</dt><dd>{new Date(reclosure.closedAt).toLocaleString()}</dd></div>
                    </>
                  ) : null}
                </dl>

                {!reclosure && caseRecord?.status === "open" ? (
                  <div className="correctiveAction">
                    <button
                      className="primary"
                      type="button"
                      disabled={Boolean(busy) || !delivery.canManage}
                      onClick={() => void verify(delivery)}
                    >
                      {busy === "verify:" + delivery.deliveryId
                        ? "Checking consumer state…"
                        : reconciliation
                          ? "Run fresh successor verification"
                          : "Verify successor consumer state"}
                    </button>
                  </div>
                ) : null}

                {canReclose && reconciliation ? (
                  <div className="correctiveAction">
                    <label>
                      Re-closure note
                      <textarea
                        value={notes[delivery.deliveryId] ?? ""}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [delivery.deliveryId]: event.target.value
                          }))
                        }
                        placeholder="Why does the latest independent read-back justify re-closing this exception?"
                      />
                    </label>
                    <label>
                      Type <code>{phrase}</code>
                      <input
                        value={confirmations[delivery.deliveryId] ?? ""}
                        onChange={(event) =>
                          setConfirmations((current) => ({
                            ...current,
                            [delivery.deliveryId]: event.target.value
                          }))
                        }
                      />
                    </label>
                    <button
                      className="primary"
                      type="button"
                      disabled={Boolean(busy) || !delivery.canManage}
                      onClick={() => void reclose(delivery, reconciliation)}
                    >
                      {busy === "reclose:" + delivery.deliveryId
                        ? "Recording verified re-closure…"
                        : "Re-close verified exception"}
                    </button>
                  </div>
                ) : null}

                {reconciliation && reconciliation.status !== "matched" ? (
                  <p className="bridgeHint">
                    Re-closure remains blocked because the latest read-back is{" "}
                    {reconciliation.status}. Record a newer matched verification
                    before trying to close the case.
                  </p>
                ) : null}
              </article>
            );
          })}
          {!accepted.length ? (
            <div className="emptyState">
              No accepted Build 058 successor delivery is available for verification.
            </div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Immutable evidence</p>
            <h2>Successor reconciliation & re-closure ledger</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.reconciliations.map((item) => (
            <article
              className="publicationCard correctiveCard"
              key={item.successorReconciliationId}
            >
              <header>
                <div>
                  <span className={"publishState publishState-" + (item.status === "matched" ? "published" : "withdrawn")}>
                    {item.status}
                  </span>
                  <h3>{item.target} · {item.successorPackageId}</h3>
                  <p>{item.workspaceName}</p>
                </div>
                <span className="badge">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </header>
              <dl className="publicationEvidence">
                <div><dt>Successor delivery</dt><dd>{item.successorDeliveryId}</dd></div>
                <div><dt>Reopen</dt><dd>{item.reopenId}</dd></div>
                <div><dt>Plan fingerprint</dt><dd>{item.successorPlanFingerprint}</dd></div>
                <div><dt>Verification fingerprint</dt><dd>{item.verificationFingerprint}</dd></div>
              </dl>
            </article>
          ))}
          {!model.reconciliations.length ? (
            <div className="emptyState">
              No Build 059 successor verification evidence exists yet.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
