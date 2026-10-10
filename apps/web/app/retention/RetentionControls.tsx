"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/retention", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : "Retention request failed."
    );
  }
  return payload;
}

export function RetentionControls({
  workspaceId,
  canAdminister,
  cleanupApproved,
  deleteEligibleRows,
  maxRowsPerRun
}: {
  workspaceId: string;
  canAdminister: boolean;
  cleanupApproved: boolean;
  deleteEligibleRows: number;
  maxRowsPerRun: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function changeApproval(approved: boolean) {
    if (!canAdminister) return;
    const wording = approved
      ? "Approve bounded cleanup for this workspace? Protected append-only/security evidence is excluded."
      : "Revoke cleanup approval for this workspace?";
    if (!window.confirm(wording)) return;

    setBusy(approved ? "approve" : "revoke");
    setMessage("");
    try {
      await post({
        workspaceId,
        action: approved ? "approve" : "revoke",
        confirmation: approved ? "APPROVE CLEANUP" : "REVOKE CLEANUP"
      });
      setMessage(approved ? "Cleanup approval recorded." : "Cleanup approval revoked.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Approval update failed.");
    } finally {
      setBusy("");
    }
  }

  async function runCleanup() {
    if (!canAdminister || !cleanupApproved || deleteEligibleRows === 0) return;
    if (
      !window.confirm(
        "Run one bounded cleanup batch now? Eligible reviewed barcode rows older than 90 days and terminal remote jobs older than 30 days may be deleted."
      )
    ) {
      return;
    }

    setBusy("run");
    setMessage("");
    try {
      await post({
        workspaceId,
        action: "run",
        confirmation: "RUN CLEANUP",
        maxRows: maxRowsPerRun
      });
      setMessage("Bounded cleanup completed and before/after evidence was recorded.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cleanup failed.");
    } finally {
      setBusy("");
    }
  }

  if (!canAdminister) {
    return <p>Owner/admin approval is required to change cleanup controls.</p>;
  }

  return (
    <div>
      {message ? <div className="notice">{message}</div> : null}
      <div className="heroActions">
        {cleanupApproved ? (
          <button
            className="secondaryButton"
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void changeApproval(false)}
          >
            {busy === "revoke" ? "Revoking…" : "Revoke cleanup approval"}
          </button>
        ) : (
          <button
            className="secondaryButton"
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void changeApproval(true)}
          >
            {busy === "approve" ? "Approving…" : "Approve bounded cleanup"}
          </button>
        )}
        <button
          className="primaryLink"
          type="button"
          disabled={Boolean(busy) || !cleanupApproved || deleteEligibleRows === 0}
          onClick={() => void runCleanup()}
        >
          {busy === "run"
            ? "Cleaning…"
            : deleteEligibleRows === 0
              ? "No delete-eligible rows"
              : "Run one cleanup batch"}
        </button>
      </div>
    </div>
  );
}
