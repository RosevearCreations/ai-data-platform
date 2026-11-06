"use client";

import { useMemo, useState } from "react";

const channels = ["email","sms","push","in-app","voice"] as const;
const consentStates = ["granted","denied","revoked","unknown"] as const;
const applications = [
  "devilndove","rosiedazzlers","yard-workers","icamp","rosevear-comms-hub","rosevear-ai-hub"
] as const;

type Model = {
  workspaces: Array<{ id:string; name:string; role:string }>;
  consents: Array<{
    consentId:string; workspaceId:string; canonicalTenantKey:string; customerRecordId:string;
    channel:string; state:string; basis:string; sourceApplicationId:string; sourceRecordId:string;
    observedAt:string; expiresAt:string|null; recordedAt:string;
  }>;
  requests: Array<{
    requestId:string; workspaceId:string; canonicalTenantKey:string; sourceApplicationId:string;
    sourceRecordId:string; customerRecordId:string; channel:string; templateKey:string;
    consentBasis:string; requestedAt:string; scheduledAt:string|null; contentSummary:string;
    operatorApplicationId:"rosevear-comms-hub"; consentId:string|null; consentCheck:string;
    state:"held"; holdReason:"notification-dispatch-not-authorized";
    reviewDecision:"approve"|"reject"|null; reviewReason:string|null; reviewedAt:string|null; createdAt:string;
  }>;
  summary: {
    consentEvidence:number; grantedConsents:number; heldRequests:number; consentBlockedRequests:number;
    approvedForFutureOperatorHandoff:number; deliveryEvidence:number;
  };
  policy: {
    build286NotificationContractReused:boolean; contractId:string;
    preferredOperatorApplicationId:string; consentRequiredBeforeApproval:boolean;
    requestsRemainHeld:boolean; outboundNetworkRequests:boolean; automaticDispatch:boolean;
    providerApiCalls:boolean; peerApplicationWrites:boolean; ql266Resumed:boolean;
  };
};

export function NotificationConsentConsole({ model }:{ model:Model }) {
  const adminWorkspaces = useMemo(() =>
    model.workspaces.filter((workspace) => workspace.role === "owner" || workspace.role === "admin"),
    [model.workspaces]
  );
  const [workspaceId,setWorkspaceId] = useState(adminWorkspaces[0]?.id ?? "");
  const [tenant,setTenant] = useState("");
  const [customerRecordId,setCustomerRecordId] = useState("");
  const [channel,setChannel] = useState<(typeof channels)[number]>("email");
  const [state,setState] = useState<(typeof consentStates)[number]>("granted");
  const [basis,setBasis] = useState("");
  const [sourceApplicationId,setSourceApplicationId] = useState<(typeof applications)[number]>("devilndove");
  const [sourceRecordId,setSourceRecordId] = useState("");
  const [observedAt,setObservedAt] = useState(new Date().toISOString());
  const [expiresAt,setExpiresAt] = useState("");

  const [templateKey,setTemplateKey] = useState("");
  const [contentSummary,setContentSummary] = useState("");
  const [requestedAt,setRequestedAt] = useState(new Date().toISOString());
  const [scheduledAt,setScheduledAt] = useState("");
  const [subject,setSubject] = useState("");
  const [reviewReasons,setReviewReasons] = useState<Record<string,string>>({});
  const [busy,setBusy] = useState("");
  const [message,setMessage] = useState("");

  async function post(body:Record<string,unknown>) {
    const response = await fetch("/api/notification-consent",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Notification request failed.");
    return payload;
  }

  async function run(key:string, body:Record<string,unknown>, success:string) {
    setBusy(key); setMessage("");
    try {
      await post(body);
      setMessage(success + " Reloading.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      {message ? <p className="barcodeMessage" role="status">{message}</p> : null}

      <section>
        <div className="sectionHeading"><div>
          <p className="eyebrow">Consent-aware communications</p>
          <h2>Build 297 standing</h2>
        </div></div>
        <div className="commandMetrics">
          <article><strong>{model.summary.consentEvidence}</strong><span>consent evidence records</span></article>
          <article><strong>{model.summary.grantedConsents}</strong><span>granted consent records</span></article>
          <article><strong>{model.summary.heldRequests}</strong><span>held notification requests</span></article>
          <article><strong>{model.summary.consentBlockedRequests}</strong><span>consent-blocked requests</span></article>
        </div>
      </section>

      <section>
        <div className="sectionHeading"><div>
          <p className="eyebrow">Consent evidence</p>
          <h2>Record the latest permission state</h2>
        </div></div>
        <div className="card">
          <p>Consent evidence is append-only. A later denied or revoked record supersedes older granted evidence during request preparation.</p>
          <div className="formGrid">
            <label>Workspace<select value={workspaceId} onChange={(e)=>setWorkspaceId(e.target.value)}>
              {adminWorkspaces.map((w)=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select></label>
            <label>Tenant key<input value={tenant} onChange={(e)=>setTenant(e.target.value)} placeholder="rosevear-main" /></label>
            <label>Customer record ID<input value={customerRecordId} onChange={(e)=>setCustomerRecordId(e.target.value)} /></label>
            <label>Channel<select value={channel} onChange={(e)=>setChannel(e.target.value as (typeof channels)[number])}>
              {channels.map((item)=><option key={item}>{item}</option>)}
            </select></label>
            <label>Consent state<select value={state} onChange={(e)=>setState(e.target.value as (typeof consentStates)[number])}>
              {consentStates.map((item)=><option key={item}>{item}</option>)}
            </select></label>
            <label>Consent basis<input value={basis} onChange={(e)=>setBasis(e.target.value)} placeholder="customer opt-in / service notice / other reviewed basis" /></label>
            <label>Source application<select value={sourceApplicationId} onChange={(e)=>setSourceApplicationId(e.target.value as (typeof applications)[number])}>
              {applications.map((item)=><option key={item}>{item}</option>)}
            </select></label>
            <label>Source consent record ID<input value={sourceRecordId} onChange={(e)=>setSourceRecordId(e.target.value)} /></label>
            <label>Observed at<input value={observedAt} onChange={(e)=>setObservedAt(e.target.value)} /></label>
            <label>Expires at<input value={expiresAt} onChange={(e)=>setExpiresAt(e.target.value)} placeholder="optional ISO timestamp" /></label>
          </div>
          <button className="primaryButton" disabled={!workspaceId || busy === "consent"} onClick={()=>run("consent",{
            action:"record-consent",workspaceId,canonicalTenantKey:tenant,customerRecordId,channel,state,basis,
            sourceApplicationId,sourceRecordId,observedAt,expiresAt
          },"Consent evidence recorded.")}>
            {busy === "consent" ? "Recording…" : "Record consent evidence"}
          </button>
        </div>
      </section>

      <section>
        <div className="sectionHeading"><div>
          <p className="eyebrow">Notification request</p>
          <h2>Prepare a consent-checked request for Comms Hub</h2>
        </div></div>
        <div className="card">
          <p>Requests are validated against <code>rosevear.shared.notification.v1</code>. Rosevear Comms Hub is the preferred operator, but Build 297 does not call it or any provider.</p>
          <div className="formGrid">
            <label>Workspace<select value={workspaceId} onChange={(e)=>setWorkspaceId(e.target.value)}>
              {adminWorkspaces.map((w)=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select></label>
            <label>Tenant key<input value={tenant} onChange={(e)=>setTenant(e.target.value)} /></label>
            <label>Customer record ID<input value={customerRecordId} onChange={(e)=>setCustomerRecordId(e.target.value)} /></label>
            <label>Channel<select value={channel} onChange={(e)=>setChannel(e.target.value as (typeof channels)[number])}>
              {channels.map((item)=><option key={item}>{item}</option>)}
            </select></label>
            <label>Source application<select value={sourceApplicationId} onChange={(e)=>setSourceApplicationId(e.target.value as (typeof applications)[number])}>
              {applications.map((item)=><option key={item}>{item}</option>)}
            </select></label>
            <label>Source request record ID<input value={sourceRecordId} onChange={(e)=>setSourceRecordId(e.target.value)} /></label>
            <label>Template key<input value={templateKey} onChange={(e)=>setTemplateKey(e.target.value)} /></label>
            <label>Consent basis<input value={basis} onChange={(e)=>setBasis(e.target.value)} /></label>
            <label>Requested at<input value={requestedAt} onChange={(e)=>setRequestedAt(e.target.value)} /></label>
            <label>Scheduled at<input value={scheduledAt} onChange={(e)=>setScheduledAt(e.target.value)} placeholder="optional" /></label>
            <label>Subject<input value={subject} onChange={(e)=>setSubject(e.target.value)} placeholder="optional" /></label>
            <label>Content summary<textarea value={contentSummary} onChange={(e)=>setContentSummary(e.target.value)} placeholder="Summary only; no provider dispatch occurs." /></label>
          </div>
          <button className="primaryButton" disabled={!workspaceId || busy === "request"} onClick={()=>run("request",{
            action:"prepare-request",workspaceId,canonicalTenantKey:tenant,sourceApplicationId,sourceRecordId,
            customerRecordId,channel,templateKey,consentBasis:basis,requestedAt,scheduledAt,subject,contentSummary
          },"Notification request prepared in HELD state.")}>
            {busy === "request" ? "Preparing…" : "Prepare held notification request"}
          </button>
        </div>
      </section>

      <section>
        <div className="sectionHeading"><div>
          <p className="eyebrow">Review queue</p>
          <h2>Approve for future operator handoff or reject</h2>
        </div></div>
        <div className="cardStack">
          {model.requests.length ? model.requests.map((item)=>(
            <article className="card" key={item.requestId}>
              <div className="sectionHeading"><div>
                <p className="eyebrow">{item.channel} · {item.sourceApplicationId}</p>
                <h3>{item.templateKey}</h3>
              </div><span className="statusPill">{item.state.toUpperCase()}</span></div>
              <p>{item.contentSummary}</p>
              <dl className="detailGrid">
                <div><dt>Consent check</dt><dd>{item.consentCheck}</dd></div>
                <div><dt>Operator</dt><dd>{item.operatorApplicationId}</dd></div>
                <div><dt>Review</dt><dd>{item.reviewDecision ?? "pending"}</dd></div>
                <div><dt>Hold reason</dt><dd>{item.holdReason}</dd></div>
              </dl>
              {item.reviewDecision === null ? <>
                <label>Review reason<textarea value={reviewReasons[item.requestId] ?? ""} onChange={(e)=>setReviewReasons((current)=>({...current,[item.requestId]:e.target.value}))} /></label>
                <div className="heroActions">
                  <button className="primaryButton" disabled={busy.startsWith(item.requestId)} onClick={()=>run(item.requestId+":approve",{
                    action:"review-request",requestId:item.requestId,decision:"approve",reason:reviewReasons[item.requestId] ?? ""
                  },"Request approved for possible future Comms Hub handoff; it remains HELD.")}>Approve future handoff</button>
                  <button className="secondaryButton" disabled={busy.startsWith(item.requestId)} onClick={()=>run(item.requestId+":reject",{
                    action:"review-request",requestId:item.requestId,decision:"reject",reason:reviewReasons[item.requestId] ?? ""
                  },"Request rejected.")}>Reject</button>
                </div>
              </> : null}
            </article>
          )) : <article className="card"><p>No notification requests yet.</p></article>}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Dispatch boundary</strong>
        <p>
          Preferred operator: <code>{model.policy.preferredOperatorApplicationId}</code>. Outbound requests: <code>{String(model.policy.outboundNetworkRequests)}</code>.
          Automatic dispatch: <code>{String(model.policy.automaticDispatch)}</code>. Provider API calls: <code>{String(model.policy.providerApiCalls)}</code>.
          QL-266 resumed: <code>{String(model.policy.ql266Resumed)}</code>.
        </p>
      </section>
    </>
  );
}
