"use client";

import { useMemo, useState } from "react";

import type {
  CorrectiveClosureModel,
  CorrectiveDeliveryReconciliation
} from "@/lib/corrective-delivery-reconciliation";
import type { CorrectiveLiveDelivery } from "@/lib/corrective-delivery-execution";

import { HelpInfo } from "../../../help/HelpInfo";

function closureConfirmation(
  target: "rosie-dazzlers" | "devil-n-dove"
) {
  return "CLOSE VERIFIED " + target.toUpperCase() + " EXCEPTION";
}

async function callApi(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
) {
  const response = await fetch(
    "/api/approved-data/reconciliation/corrective-closure",
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
        : "Corrective reconciliation request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestByDelivery(
  reconciliations: CorrectiveDeliveryReconciliation[]
) {
  const map = new Map<string, CorrectiveDeliveryReconciliation>();
  for (const item of reconciliations) {
    const key = item.workspaceId + ":" + item.correctiveDeliveryId;
    if (!map.has(key)) map.set(key, item);
  }
  return map;
}

export function CorrectiveClosureWorkbench({
  initialModel
}: {
  initialModel: CorrectiveClosureModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirmations, setConfirmations] = useState<Record<string, string>>({});

  const accepted = useMemo(
    () => model.corrective.deliveries.filter((item) => item.status === "accepted"),
    [model.corrective.deliveries]
  );
  const latest = useMemo(
    () => latestByDelivery(model.reconciliations),
    [model.reconciliations]
  );
  const closedCases = useMemo(
    () => new Set(model.closures.map((item) => item.workspaceId + ":" + item.caseId)),
    [model.closures]
  );

  function applyModel(payload: Record<string, unknown>) {
    if (payload.model) {
      setModel(payload.model as unknown as CorrectiveClosureModel);
    }
  }

  async function verify(delivery: CorrectiveLiveDelivery) {
    const key = "verify:" + delivery.deliveryId;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", {
        action: "verify-corrective-state",
        workspaceId: delivery.workspaceId,
        correctiveDeliveryId: delivery.deliveryId
      });
      applyModel(payload);
      setMessage(
        payload.result === "matched"
          ? "Corrective read-back matched the frozen corrective package. Verified closure is now available."
          : "Corrective read-back recorded new non-matching evidence. The exception remains open."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Corrective read-back failed."
      );
      const response = await fetch(
        "/api/approved-data/reconciliation/corrective-closure",
        { cache: "no-store" }
      );
      if (response.ok) {
        setModel((await response.json()) as CorrectiveClosureModel);
      }
    } finally {
      setBusy("");
    }
  }

  async function close(
    delivery: CorrectiveLiveDelivery,
    reconciliation: CorrectiveDeliveryReconciliation
  ) {
    const key = "close:" + reconciliation.caseId;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("PATCH", {
        action: "close-verified-exception",
        workspaceId: delivery.workspaceId,
        caseId: reconciliation.caseId,
        correctiveDeliveryId: delivery.deliveryId,
        correctiveReconciliationId:
          reconciliation.correctiveReconciliationId,
        confirmation: confirmations[key] ?? "",
        closureNote: notes[key] ?? ""
      });
      applyModel(payload);
      setMessage(
        "Exception closed with immutable Build 055 verification evidence."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Verified closure failed."
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
            <p className="eyebrow">Independent read-back</p>
            <h2>Closure readiness</h2>
          </div>
          <HelpInfo topic="corrective-closure-overview" />
        </div>
        <div className="commandMetrics">
          <article>
            <strong>{model.totals.acceptedCorrectiveDeliveries}</strong>
            <span>accepted corrective deliveries</span>
          </article>
          <article>
            <strong>{model.totals.neverVerified}</strong>
            <span>never read back</span>
          </article>
          <article>
            <strong>{model.totals.matchedLatest}</strong>
            <span>latest matched</span>
          </article>
          <article>
            <strong>{model.totals.driftLatest}</strong>
            <span>latest still drifted</span>
          </article>
          <article>
            <strong>{model.totals.verifiedClosures}</strong>
            <span>verified closures</span>
          </article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>Accepted transport is not closure</strong>
        <p>
          Build 055 sends no corrective mutation. It asks the current configured
          consumer to independently return current values for the fields in the
          frozen corrective package. Only the latest matched result can support
          closure.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Accepted Build 054 corrections</p>
            <h2>Verify current consumer state</h2>
          </div>
          <HelpInfo topic="corrective-closure-verify" />
        </div>

        <div className="publicationList">
          {accepted.map((delivery) => {
            const key = delivery.workspaceId + ":" + delivery.deliveryId;
            const current = latest.get(key);
            const plan = model.corrective.triage.plans.find(
              (item) =>
                item.workspaceId === delivery.workspaceId &&
                item.planId === delivery.planId
            );
            const contract =
              model.corrective.triage.reconciliation.live.bridge.contracts.find(
                (item) => item.target === delivery.target
              );
            const consumerMatches =
              Boolean(contract?.configured) &&
              contract?.endpointOrigin === delivery.consumerId;
            const caseClosed = plan
              ? closedCases.has(delivery.workspaceId + ":" + plan.caseId)
              : false;
            const closeKey = current ? "close:" + current.caseId : "";
            const phrase = closureConfirmation(delivery.target);

            return (
              <article className="publicationCard correctiveCard" key={key}>
                <header>
                  <div>
                    <span
                      className={
                        "publishState publishState-" +
                        (caseClosed
                          ? "published"
                          : current?.status === "matched"
                            ? "published"
                            : "withdrawn")
                      }
                    >
                      {caseClosed
                        ? "closed"
                        : current?.status ?? "verification needed"}
                    </span>
                    <h3>{delivery.target} · corrective read-back</h3>
                    <p>{delivery.workspaceName}</p>
                  </div>
                  <span className="badge">
                    {consumerMatches
                      ? "consumer identity current"
                      : "consumer blocked"}
                  </span>
                </header>

                <dl className="publicationEvidence">
                  <div>
                    <dt>Corrective delivery</dt>
                    <dd>{delivery.deliveryId}</dd>
                  </div>
                  <div>
                    <dt>Corrective package</dt>
                    <dd>{delivery.correctivePackageId}</dd>
                  </div>
                  <div>
                    <dt>Plan fingerprint</dt>
                    <dd>{delivery.planFingerprint}</dd>
                  </div>
                  <div>
                    <dt>Latest verification</dt>
                    <dd>
                      {current
                        ? new Date(current.createdAt).toLocaleString()
                        : "never"}
                    </dd>
                  </div>
                  {current ? (
                    <div>
                      <dt>Counts</dt>
                      <dd>
                        {current.matchedCount} matched ·{" "}
                        {current.mismatchedCount} mismatched ·{" "}
                        {current.missingCount} missing
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {!caseClosed ? (
                  <button
                    className="primary"
                    type="button"
                    disabled={
                      Boolean(busy) ||
                      !delivery.canManage ||
                      !consumerMatches
                    }
                    onClick={() => void verify(delivery)}
                  >
                    {busy === "verify:" + delivery.deliveryId
                      ? "Verifying current state…"
                      : "Verify corrective state"}
                  </button>
                ) : null}

                {current?.status === "matched" &&
                !caseClosed &&
                plan ? (
                  <div className="correctiveAction">
                    <label>
                      Closure note
                      <textarea
                        value={notes[closeKey] ?? ""}
                        onChange={(event) =>
                          setNotes((values) => ({
                            ...values,
                            [closeKey]: event.target.value
                          }))
                        }
                        placeholder="Why does this matched read-back warrant closure?"
                      />
                    </label>
                    <label>
                      Type <code>{phrase}</code>
                      <input
                        value={confirmations[closeKey] ?? ""}
                        onChange={(event) =>
                          setConfirmations((values) => ({
                            ...values,
                            [closeKey]: event.target.value
                          }))
                        }
                      />
                    </label>
                    <button
                      className="primary"
                      type="button"
                      disabled={Boolean(busy) || !delivery.canManage}
                      onClick={() => void close(delivery, current)}
                    >
                      {busy === closeKey
                        ? "Closing with evidence…"
                        : "Close verified exception"}
                    </button>
                  </div>
                ) : null}

                {current && current.status !== "matched" ? (
                  <p className="bridgeHint">
                    Closure remains blocked. Latest evidence is {current.status}
                    {current.status === "drift"
                      ? "; another corrective plan is required for any remaining mismatch."
                      : "; resolve verification capability/transport and verify again."}
                  </p>
                ) : null}
              </article>
            );
          })}

          {!accepted.length ? (
            <div className="emptyState">
              No accepted Build 054 corrective delivery is available for read-back.
            </div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Append-only evidence</p>
            <h2>Corrective reconciliation history</h2>
          </div>
          <HelpInfo topic="corrective-closure-evidence" />
        </div>
        <div className="publicationList">
          {model.reconciliations.map((item) => (
            <article
              className="publicationCard correctiveCard"
              key={item.correctiveReconciliationId}
            >
              <header>
                <div>
                  <span
                    className={
                      "publishState publishState-" +
                      (item.status === "matched"
                        ? "published"
                        : "withdrawn")
                    }
                  >
                    {item.status}
                  </span>
                  <h3>{item.target} · {item.correctivePackageId}</h3>
                  <p>{item.workspaceName}</p>
                </div>
                <span className="badge">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </header>
              <dl className="publicationEvidence">
                <div>
                  <dt>Verification fingerprint</dt>
                  <dd>{item.verificationFingerprint}</dd>
                </div>
                <div>
                  <dt>Matched</dt>
                  <dd>{item.matchedCount}</dd>
                </div>
                <div>
                  <dt>Mismatched</dt>
                  <dd>{item.mismatchedCount}</dd>
                </div>
                <div>
                  <dt>Missing</dt>
                  <dd>{item.missingCount}</dd>
                </div>
              </dl>
              {item.recordResults.map((record) => (
                <p className="bridgeHint" key={record.integrationKey}>
                  {record.integrationKey} · {record.status}
                  {record.differingFields.length
                    ? " · " + record.differingFields.join(", ")
                    : ""}
                </p>
              ))}
            </article>
          ))}
          {!model.reconciliations.length ? (
            <div className="emptyState">
              No corrective reconciliation evidence exists yet.
            </div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Terminal verified evidence</p>
            <h2>Exception closure ledger</h2>
          </div>
          <HelpInfo topic="corrective-closure-evidence" />
        </div>
        <div className="publicationList">
          {model.closures.map((item) => (
            <article className="publicationCard correctiveCard" key={item.closureId}>
              <header>
                <div>
                  <span className="publishState publishState-published">
                    verified closed
                  </span>
                  <h3>{item.target} · {item.caseId}</h3>
                  <p>{item.closureNote}</p>
                </div>
                <span className="badge">
                  {new Date(item.closedAt).toLocaleString()}
                </span>
              </header>
              <dl className="publicationEvidence">
                <div>
                  <dt>Corrective reconciliation</dt>
                  <dd>{item.correctiveReconciliationId}</dd>
                </div>
                <div>
                  <dt>Verification fingerprint</dt>
                  <dd>{item.verificationFingerprint}</dd>
                </div>
                <div>
                  <dt>Closure fingerprint</dt>
                  <dd>{item.closureFingerprint}</dd>
                </div>
              </dl>
            </article>
          ))}
          {!model.closures.length ? (
            <div className="emptyState">No verified exception closure exists yet.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
