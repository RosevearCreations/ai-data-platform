"use client";

import { useState } from "react";

const applications = [
  ["ai-data-platform","AI Data Platform"],
  ["rosevear-ai-hub","Rosevear AI Hub"],
  ["rosevear-comms-hub","Rosevear Comms Hub"],
  ["icamp","iCamp"],
  ["yw","Yard Workers"],
  ["devilndove","Devil n Dove"],
  ["rosiedazzlers","Rosie Dazzlers"]
] as const;

export function SecurityIncidentFusionPanel({
  activePlans,
  critical,
  blocked,
  ywState,
  icampState
}: {
  activePlans: number;
  critical: number;
  blocked: number;
  ywState: string;
  icampState: string;
}) {
  const [appId,setAppId] = useState("yw");
  const [action,setAction] = useState("CONTAIN");
  const [correlationId,setCorrelationId] = useState("");
  const [reason,setReason] = useState("");
  const [custodianReceipt,setCustodianReceipt] = useState("");
  const [status,setStatus] = useState(
    "All remediation actions require owner authority plus a current independent-custodian receipt. The source application executes the action."
  );
  const [pending,setPending] = useState(false);

  async function submit() {
    setPending(true);
    try {
      const response = await fetch("/api/security-incident-fusion/action", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          appId,action,reason,incidentCorrelationId:correlationId,
          independentCustodianReceiptId:custodianReceipt
        })
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: string;
        remediation?: { intentId:string; state:string };
      };
      if (!response.ok || !payload.remediation) {
        setStatus("Held: " + (payload.error ?? "request rejected"));
      } else {
        setStatus(
          "Queued " + payload.remediation.intentId +
          ". No peer recovery is claimed until the source returns execution and fresh post-action telemetry receipts."
        );
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="reviewQueue">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Build 412 · Security incident fusion</p>
          <h2>Containment, recovery, rollback & shared telemetry assurance</h2>
        </div>
      </div>
      <div className="commandMetrics">
        <article><strong>{activePlans}</strong><span>active runbook plans</span></article>
        <article><strong>{critical}</strong><span>critical</span></article>
        <article><strong>{blocked}</strong><span>blocked</span></article>
        <article><strong>12</strong><span>telemetry dimensions/app</span></article>
      </div>
      <div className="masterGovernanceGrid">
        <article className="reviewBatchSummary">
          <h3>Yard Workers slave shell</h3>
          <p>Alert/runbook state: <strong>{ywState}</strong></p>
          <p>Deployment/runtime/source/signer/receiver/queue/DLQ/latency/error/migration/security/quota remain evidence-driven; missing dimensions stay UNKNOWN.</p>
        </article>
        <article className="reviewBatchSummary">
          <h3>iCamp slave shell</h3>
          <p>Alert/runbook state: <strong>{icampState}</strong></p>
          <p>Production GREEN never substitutes for current source, signer, receiver, queue or security telemetry.</p>
        </article>
      </div>
      <div className="reviewBatchSummary">
        <h3>Supervised remediation handoff</h3>
        <label>Application
          <select value={appId} onChange={(e)=>setAppId(e.target.value)}>
            {applications.map(([id,label])=><option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label>Action
          <select value={action} onChange={(e)=>setAction(e.target.value)}>
            {["CONTAIN","RECOVER","ROLLBACK","RESTART"].map((value)=>
              <option key={value} value={value}>{value}</option>
            )}
          </select>
        </label>
        <label>Incident correlation ID
          <input value={correlationId} onChange={(e)=>setCorrelationId(e.target.value)} placeholder="At least 8 characters" />
        </label>
        <label>Reason
          <input value={reason} onChange={(e)=>setReason(e.target.value)} minLength={10} maxLength={500} placeholder="At least 10 characters" />
        </label>
        <label>Independent custodian receipt
          <input value={custodianReceipt} onChange={(e)=>setCustodianReceipt(e.target.value)} placeholder="Current verified Build 411 custody receipt" />
        </label>
        <button className="secondaryButton" disabled={pending} onClick={()=>void submit()} type="button">
          {pending ? "Submitting…" : "Queue supervised action"}
        </button>
        <p aria-live="polite">{status}</p>
      </div>
    </section>
  );
}
