"use client";

import { useState } from "react";

const APPS = [
  "ai-data-platform","rosevear-ai-hub","rosevear-comms-hub",
  "icamp","yw","devilndove","rosiedazzlers"
] as const;
const DOMAINS = [
  "SOURCE_RUNTIME","COMPLETION","SECURITY","COMMUNICATIONS",
  "ACCESSIBILITY_DEVICE","PERFORMANCE_UX","PRIVILEGED_RECOVERY"
] as const;

export function EvidenceFreshnessRenewalActions() {
  const [appId,setAppId] = useState<(typeof APPS)[number]>("ai-data-platform");
  const [domain,setDomain] = useState<(typeof DOMAINS)[number]>("SOURCE_RUNTIME");
  const [reason,setReason] = useState("Refresh evidence before the current SLA window expires.");
  const [status,setStatus] = useState(
    "No renewal request changes evidence freshness until a new independently verified source receipt is admitted."
  );
  const [pending,setPending] = useState(false);

  async function submit() {
    setPending(true);
    try {
      const response = await fetch("/api/evidence-freshness/renewal",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({appId,evidenceDomain:domain,reason})
      });
      const payload = await response.json().catch(()=>({})) as {
        error?:string;
        renewal?:{requestId:string;state:string;note:string}
      };
      setStatus(
        response.ok && payload.renewal
          ? payload.renewal.state + ": " + payload.renewal.requestId + ". " + payload.renewal.note
          : "Held: " + (payload.error ?? "renewal request rejected")
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="reviewQueue">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Cross-application renewal control</p>
          <h2>Queue a governed evidence refresh</h2>
        </div>
      </div>
      <div className="reviewBatchSummary">
        <label>Application
          <select value={appId} onChange={(e)=>setAppId(e.target.value as (typeof APPS)[number])}>
            {APPS.map((app)=><option key={app} value={app}>{app}</option>)}
          </select>
        </label>
        <label>Evidence domain
          <select value={domain} onChange={(e)=>setDomain(e.target.value as (typeof DOMAINS)[number])}>
            {DOMAINS.map((item)=><option key={item} value={item}>{item.replaceAll("_"," ")}</option>)}
          </select>
        </label>
        <label>Renewal reason
          <textarea value={reason} maxLength={500} onChange={(e)=>setReason(e.target.value)} />
        </label>
        <button className="secondaryButton" type="button" disabled={pending} onClick={()=>void submit()}>
          {pending ? "Queueing…" : "Queue evidence renewal"}
        </button>
        <p aria-live="polite">{status}</p>
      </div>
    </section>
  );
}
