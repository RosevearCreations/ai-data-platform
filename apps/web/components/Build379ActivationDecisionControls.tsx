"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function Build379ActivationDecisionControls(props: {
  canDecide: boolean;
  state: string;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<"APPROVE_ACTIVATION" | "REJECT_ACTIVATION">(
    "APPROVE_ACTIVATION"
  );
  const [ownerNote, setOwnerNote] = useState("");
  const [ownerAttested, setOwnerAttested] = useState(false);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const approvalReady =
    props.state === "READY_FOR_OWNER_DECISION";
  const rejectionAllowed =
    props.canDecide &&
    props.state !== "HOLD_NOT_READY_FOR_OWNER_DECISION";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!props.canDecide || submitting) return;

    setSubmitting(true);
    setStatus("");
    try {
      const response = await fetch("/api/yw562-protected-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute-supervised-activation-decision",
          decision,
          ownerNote,
          ownerAttested
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload?.error ?? "Build 379 decision failed.");
        return;
      }
      setStatus(
        decision === "APPROVE_ACTIVATION"
          ? "Activation authorization recorded. Runtime activation remains separate and is not executed by Build 379."
          : "Activation rejected and held."
      );
      router.refresh();
    } catch {
      setStatus("Build 379 decision request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!props.canDecide) {
    return (
      <section className="dataQualityPolicyNote">
        <strong>Owner decision required.</strong>
        <p>
          This signed-in account may review Build 379 evidence but cannot execute
          the owner activation decision.
        </p>
      </section>
    );
  }

  return (
    <section className="reviewBatchSummary">
      <span className="reviewStatus">{props.state}</span>
      <h2>Supervised activation decision</h2>
      <p>
        Approval records a bounded authorization only. It does not turn on the
        Comms receiver, start Windows recovery, set CONNECTED, or mark the three
        Masters synchronized.
      </p>
      <form onSubmit={submit}>
        <label>
          Decision
          <select
            value={decision}
            onChange={(event) =>
              setDecision(
                event.target.value as
                  | "APPROVE_ACTIVATION"
                  | "REJECT_ACTIVATION"
              )
            }
          >
            <option
              value="APPROVE_ACTIVATION"
              disabled={!approvalReady}
            >
              Approve supervised activation authorization
            </option>
            <option
              value="REJECT_ACTIVATION"
              disabled={!rejectionAllowed}
            >
              Reject / maintain HOLD
            </option>
          </select>
        </label>
        <label>
          Owner note
          <textarea
            value={ownerNote}
            onChange={(event) => setOwnerNote(event.target.value)}
            minLength={15}
            maxLength={500}
            required
            rows={4}
            placeholder="Record why this exact protected evidence set is approved or rejected."
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={ownerAttested}
            onChange={(event) => setOwnerAttested(event.target.checked)}
            required
          />
          I am making this explicit decision for the exact current evidence set.
        </label>
        <button
          className="primaryButton"
          type="submit"
          disabled={
            submitting ||
            !ownerAttested ||
            ownerNote.trim().length < 15 ||
            (decision === "APPROVE_ACTIVATION" && !approvalReady) ||
            (decision === "REJECT_ACTIVATION" && !rejectionAllowed)
          }
        >
          {submitting ? "Recording…" : "Execute supervised decision"}
        </button>
      </form>
      {status && <p role="status">{status}</p>}
    </section>
  );
}
