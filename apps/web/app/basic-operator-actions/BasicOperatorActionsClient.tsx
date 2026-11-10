"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BasicOperatorActionsClient() {
  const router = useRouter();
  const [status, setStatus] = useState(
    "No operator action has been run in this browser session."
  );

  function refresh(label: string) {
    setStatus(label + " requested. Reloading authorized read models only.");
    router.refresh();
  }

  function prepare(label: string) {
    setStatus(
      label +
        " prepared as an operator request only. Source-side approval/execution is still required."
    );
  }

  return (
    <section className="reviewQueue" aria-label="Basic operator action controls">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Safe controls</p>
          <h2>Run a bounded operator action</h2>
        </div>
      </div>
      <div className="heroActions">
        <button className="secondaryButton" type="button" onClick={() => refresh("Refresh")}>
          Refresh read models
        </button>
        <button className="secondaryButton" type="button" onClick={() => refresh("Recheck")}>
          Recheck evidence
        </button>
        <button className="secondaryButton" type="button" onClick={() => prepare("Retry")}>
          Prepare retry request
        </button>
        <button className="secondaryButton" type="button" onClick={() => prepare("Recovery")}>
          Prepare recovery handoff
        </button>
      </div>
      <p role="status" aria-live="polite">{status}</p>
      <p>
        Refresh and recheck do not write to peer applications. Retry and recovery
        do not execute automatically; they prepare the operator handoff boundary.
      </p>
    </section>
  );
}
