"use client";

import { useState } from "react";

type PendingReceipt = {
  receiptId: string;
  sourceApplicationId: string;
  sourceId: string;
  tenantId: string | null;
  eventId: string;
  receivedAt: string;
};

export function IngestionConsole({
  pendingReceipts
}: {
  pendingReceipts: PendingReceipt[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function ingest(
    receiptId: string,
    acceptRegistryState: boolean
  ) {
    setBusy(receiptId + ":" + String(acceptRegistryState));
    setMessage(null);
    try {
      const response = await fetch("/api/master-shell-ingestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ingest-webhook-receipt",
          receiptId,
          acceptRegistryState
        })
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body.error ?? "master_shell_ingestion_failed"
        );
      }

      const registry = body.registryAdvance;
      setMessage(
        acceptRegistryState
          ? registry?.advanced
            ? "Receipt normalized and qualifying registry state accepted."
            : "Receipt normalized. Registry state was not advanced: " +
              String(registry?.reason ?? "not eligible")
          : "Receipt normalized read-only. No registry state acceptance was requested."
      );
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "master_shell_ingestion_failed"
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="reviewQueue">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Signed receipt intake</p>
          <h2>Pending Master Shell source updates</h2>
        </div>
      </div>

      <div className="dataQualityPolicyNote">
        <strong>Normalization and state acceptance are separate actions.</strong>
        <p>
          Normalize stores a read-only provenance record only. “Normalize +
          accept qualifying state” additionally permits a fresh,
          independently-verified source.health.reported event to attempt the
          next legal Build 336 registry transition. It does not call the source,
          send a command or perform a peer write.
        </p>
      </div>

      {pendingReceipts.length ? (
        <div className="reviewBatchList">
          {pendingReceipts.map((receipt) => (
            <article
              className="reviewBatchSummary"
              key={receipt.receiptId}
            >
              <div>
                <span className="reviewStatus">
                  <code>{receipt.sourceId}</code> · signed webhook receipt
                </span>
                <h3><code>{receipt.eventId}</code></h3>
                <p>
                  Transport <code>{receipt.sourceApplicationId}</code>
                  {" · "}tenant{" "}
                  <code>{receipt.tenantId ?? "none"}</code>
                  {" · "}received {receipt.receivedAt}
                </p>
              </div>
              <div className="heroActions">
                <button
                  className="secondaryButton"
                  type="button"
                  disabled={busy !== null}
                  onClick={() => ingest(receipt.receiptId, false)}
                >
                  {busy === receipt.receiptId + ":false"
                    ? "Normalizing…"
                    : "Normalize only"}
                </button>
                <button
                  className="primaryButton"
                  type="button"
                  disabled={busy !== null}
                  onClick={() => ingest(receipt.receiptId, true)}
                >
                  {busy === receipt.receiptId + ":true"
                    ? "Verifying…"
                    : "Normalize + accept qualifying state"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="emptyState">
          No unprocessed signed Master Shell source-update receipts are
          available.
        </div>
      )}

      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
