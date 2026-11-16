"use client";

import { useState } from "react";

type ModuleControlView = {
  moduleId: "ai-data-platform" | "rosevear-ai-hub" | "rosevear-comms-hub";
  displayName: string;
  runtimeState: string;
};

export function ServerModuleControlPanel({
  modules
}: {
  modules: readonly ModuleControlView[];
}) {
  const [reason, setReason] = useState("");
  const [custodianReceiptId, setCustodianReceiptId] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState(
    "DISABLE requires the Master Sysop owner. ENABLE and RESTART also require a current independent-custodian receipt."
  );

  async function requestControl(
    moduleId: ModuleControlView["moduleId"],
    action: "ENABLE" | "DISABLE" | "RESTART"
  ) {
    setPending(moduleId + ":" + action);
    setMessage("Submitting owner-gated control intent…");
    try {
      const response = await fetch("/api/server-shell/module-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          action,
          reason,
          independentCustodianReceiptId: custodianReceiptId
        })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        control?: {
          intentId: string;
          controlState: string;
          physicalActionCompleted: boolean;
        };
      };
      if (!response.ok || !payload.control) {
        setMessage("Control held: " + (payload.error ?? "request rejected"));
        return;
      }
      setMessage(
        "Queued intent " +
          payload.control.intentId +
          ". No physical service change is claimed until the enrolled Windows host returns an immutable host receipt."
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <div className="masterGovernanceGrid">
        {modules.map((module) => (
          <article className="reviewBatchSummary" key={module.moduleId}>
            <h3>{module.displayName}</h3>
            <p>Observed runtime: {module.runtimeState}</p>
            <div className="heroActions">
              {(["ENABLE", "DISABLE", "RESTART"] as const).map((action) => (
                <button
                  className="secondaryButton"
                  disabled={pending !== null}
                  key={action}
                  onClick={() => void requestControl(module.moduleId, action)}
                  type="button"
                >
                  {pending === module.moduleId + ":" + action
                    ? "Submitting…"
                    : action}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="reviewBatchSummary">
        <h3>Owner approval evidence</h3>
        <p>
          The reason is SHA-256 hashed before persistence; the raw reason is not
          stored in the Build 411 control ledger.
        </p>
        <label>
          Reason for the control request
          <input
            maxLength={500}
            minLength={10}
            onChange={(event) => setReason(event.target.value)}
            placeholder="At least 10 characters"
            value={reason}
          />
        </label>
        <label>
          Independent custodian receipt ID (required for ENABLE / RESTART)
          <input
            onChange={(event) => setCustodianReceiptId(event.target.value)}
            placeholder="Verified custody receipt"
            value={custodianReceiptId}
          />
        </label>
        <p aria-live="polite">{message}</p>
      </div>
    </div>
  );
}
