"use client";

import { useState } from "react";

export function AccelerationClosureActions() {
  const [reason,setReason] = useState(
    "Build 414 supervised authority-preserving communications production pilot"
  );
  const [pilotStatus,setPilotStatus] = useState(
    "No pilot is claimed until Rosevear Comms Hub and independent evidence receipts prove delivery and acknowledgement."
  );
  const [roadmapStatus,setRoadmapStatus] = useState(
    "The Builds 415-424 roadmap remains owner-gated until explicitly approved."
  );
  const [pending,setPending] = useState<"pilot"|"roadmap"|null>(null);

  async function requestPilot() {
    setPending("pilot");
    try {
      const response = await fetch("/api/acceleration-closure/pilot",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({reason})
      });
      const payload = await response.json().catch(()=>({})) as {
        error?:string; request?:{requestId:string;note:string}
      };
      setPilotStatus(
        response.ok && payload.request
          ? "Pilot request recorded: " + payload.request.requestId + ". " + payload.request.note
          : "Held: " + (payload.error ?? "pilot request rejected")
      );
    } finally {
      setPending(null);
    }
  }

  async function approveRoadmap() {
    setPending("roadmap");
    try {
      const response = await fetch("/api/acceleration-closure/roadmap",{method:"POST"});
      const payload = await response.json().catch(()=>({})) as {
        error?:string; approval?:{approvalId:string}
      };
      setRoadmapStatus(
        response.ok && payload.approval
          ? "Roadmap owner approval recorded: " + payload.approval.approvalId
          : "Held: " + (payload.error ?? "roadmap approval rejected")
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="reviewQueue">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Owner-gated Build 414 actions</p>
          <h2>Pilot request & roadmap renewal</h2>
        </div>
      </div>
      <div className="masterGovernanceGrid">
        <article className="reviewBatchSummary">
          <h3>Communications production pilot</h3>
          <label>Pilot reason
            <textarea
              value={reason}
              maxLength={500}
              onChange={(e)=>setReason(e.target.value)}
            />
          </label>
          <button
            className="secondaryButton"
            type="button"
            disabled={pending !== null}
            onClick={()=>void requestPilot()}
          >
            {pending === "pilot" ? "Requesting…" : "Request supervised pilot"}
          </button>
          <p aria-live="polite">{pilotStatus}</p>
        </article>
        <article className="reviewBatchSummary">
          <h3>Builds 415–424 roadmap</h3>
          <p>
            Approval records the owner decision only. It does not automatically
            execute any future build or transfer application authority.
          </p>
          <button
            className="secondaryButton"
            type="button"
            disabled={pending !== null}
            onClick={()=>void approveRoadmap()}
          >
            {pending === "roadmap" ? "Approving…" : "Approve renewed roadmap"}
          </button>
          <p aria-live="polite">{roadmapStatus}</p>
        </article>
      </div>
    </section>
  );
}
