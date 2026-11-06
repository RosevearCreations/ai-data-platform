"use client";

import { useMemo, useState } from "react";

import type { RecoveryPlanRecord } from "@/lib/integration-recovery-database";

type Model={
  plans:RecoveryPlanRecord[];
  summary:{
    total:number;
    readySafeRetries:number;
    recovered:number;
    approvalRequired:number;
    approved:number;
    rejected:number;
    exhausted:number;
    notRetryable:number;
  };
  policy:{
    safeAutoAction:string;
    maxRecoveryCycles:number;
    cooldownSeconds:number;
    consequentialChangesRequireOwnerAdminApproval:boolean;
    credentialMutationAutomatic:boolean;
    eventReplayAutomatic:boolean;
    connectionActivationAutomatic:boolean;
    outboundMutationAutomatic:boolean;
    ql266Resumed:boolean;
  };
};

export function IntegrationRecoveryConsole({model}:{model:Model}){
  const [busy,setBusy]=useState("");
  const [message,setMessage]=useState("");
  const [reasons,setReasons]=useState<Record<string,string>>({});

  const safePlans=useMemo(
    ()=>model.plans.filter(item=>item.classification==="safe-bounded-retry"),
    [model.plans]
  );
  const approvalPlans=useMemo(
    ()=>model.plans.filter(item=>item.classification==="owner-approval-required"),
    [model.plans]
  );
  const blockedPlans=useMemo(
    ()=>model.plans.filter(item=>item.classification==="not-retryable"),
    [model.plans]
  );

  async function run(key:string,body:Record<string,unknown>,success:string){
    setBusy(key);setMessage("");
    try{
      const response=await fetch("/api/integration-recovery",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body)
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(typeof payload.error==="string"?payload.error:"Recovery request failed.");
      setMessage(success+" Reloading.");
      window.location.reload();
    }catch(error){
      setMessage(error instanceof Error?error.message:"Recovery request failed.");
    }finally{
      setBusy("");
    }
  }

  return <>
    {message?<p className="barcodeMessage" role="status">{message}</p>:null}

    <section>
      <div className="sectionHeading">
        <div><p className="eyebrow">Self-healing recovery</p><h2>Build 301 standing</h2></div>
      </div>
      <div className="commandMetrics">
        <article><strong>{model.summary.readySafeRetries}</strong><span>safe retries ready</span></article>
        <article><strong>{model.summary.recovered}</strong><span>recovered plans</span></article>
        <article><strong>{model.summary.approvalRequired}</strong><span>owner approvals required</span></article>
        <article><strong>{model.summary.exhausted}</strong><span>retry budgets exhausted</span></article>
        <article><strong>{model.summary.notRetryable}</strong><span>non-retryable findings</span></article>
      </div>
      <div className="heroActions">
        <button className="secondaryButton" disabled={busy==="scan"} onClick={()=>run(
          "scan",{action:"scan"},"Recovery evidence scan completed."
        )}>{busy==="scan"?"Scanning…":"Scan recovery evidence"}</button>
        <button className="primaryButton" disabled={busy==="cycle"||model.summary.readySafeRetries===0} onClick={()=>run(
          "cycle",{action:"run-safe-cycle"},"Bounded safe recovery cycle completed."
        )}>{busy==="cycle"?"Running…":"Run bounded safe retries"}</button>
      </div>
    </section>

    <section>
      <div className="sectionHeading">
        <div><p className="eyebrow">Automatic-safe lane</p><h2>GET/HEAD connector health retries only</h2></div>
      </div>
      <div className="cardStack">
        {safePlans.length?safePlans.map(plan=><article className="card" key={plan.planId}>
          <div className="sectionHeading">
            <div><p className="eyebrow">{plan.state}</p><h3>{String(plan.sourcePayload.connectorKey??"Connector recovery")}</h3></div>
            <span className="statusPill">{plan.attempts.length}/{plan.maxAttempts} attempts</span>
          </div>
          <p>{plan.reasonCode}</p>
          <p>Source error: {String(plan.sourcePayload.errorCode??"unknown")} · cooldown {plan.cooldownSeconds}s</p>
          <p>Health retry expires: {plan.expiresAt??"not set"}</p>
          <button
            className="secondaryButton"
            disabled={busy===plan.planId||plan.state!=="ready"}
            onClick={()=>run(
              plan.planId,
              {action:"execute-safe-plan",planId:plan.planId},
              "Safe connector health retry completed."
            )}
          >
            {busy===plan.planId?"Retrying…":"Run this safe health retry"}
          </button>
          {plan.attempts.length?<div className="cardStack">
            {plan.attempts.map(item=><div key={item.attemptId}>
              <strong>Attempt {item.attemptNumber}: {item.outcome}</strong>
              <p>{item.durationMs} ms · {item.errorCode??"no error"}</p>
            </div>)}
          </div>:null}
        </article>):<article className="card"><p>No safe connector health retries are currently prepared.</p></article>}
      </div>
    </section>

    <section>
      <div className="sectionHeading">
        <div><p className="eyebrow">Owner-controlled lane</p><h2>Consequential recovery decisions</h2></div>
      </div>
      <div className="cardStack">
        {approvalPlans.length?approvalPlans.map(plan=><article className="card" key={plan.planId}>
          <div className="sectionHeading">
            <div><p className="eyebrow">{plan.sourceKind} · {plan.state}</p><h3>{plan.reasonCode}</h3></div>
          </div>
          <p>
            {plan.sourceKind==="event-dead-letter"
              ?"Event replay remains held in the existing Event Recovery workbench."
              :plan.sourceKind==="credential-reference"
                ?"Credential replacement/rotation remains in the Credential Vault."
                :"Connector remediation remains in the owner-controlled connector workbench."}
          </p>
          {plan.decision?<p><strong>{plan.decision.decision}</strong> · {plan.decision.consequence} · {plan.decision.reason}</p>:<>
            <label>
              Decision reason
              <textarea
                value={reasons[plan.planId]??""}
                onChange={e=>setReasons(current=>({...current,[plan.planId]:e.target.value}))}
                placeholder="Explain why this recovery action is approved or rejected."
              />
            </label>
            <div className="heroActions">
              <button className="primaryButton" disabled={busy===plan.planId+":approve"} onClick={()=>run(
                plan.planId+":approve",
                {action:"decision",planId:plan.planId,decision:"approve",reason:reasons[plan.planId]??""},
                "Owner/admin recovery approval recorded; no consequential action was auto-executed."
              )}>Approve for owner workbench</button>
              <button className="secondaryButton" disabled={busy===plan.planId+":reject"} onClick={()=>run(
                plan.planId+":reject",
                {action:"decision",planId:plan.planId,decision:"reject",reason:reasons[plan.planId]??""},
                "Recovery action rejected."
              )}>Reject</button>
            </div>
          </>}
        </article>):<article className="card"><p>No consequential recovery decisions currently require approval.</p></article>}
      </div>
    </section>

    <section>
      <div className="sectionHeading">
        <div><p className="eyebrow">Disposition lane</p><h2>Non-retryable findings</h2></div>
      </div>
      <div className="cardStack">
        {blockedPlans.length?blockedPlans.map(plan=><article className="card" key={plan.planId}>
          <h3>{plan.reasonCode}</h3>
          <p>{plan.sourceKind} · no automatic retry is permitted.</p>
        </article>):<article className="card"><p>No non-retryable findings are currently recorded.</p></article>}
      </div>
    </section>

    <section className="dataQualityPolicyNote">
      <strong>Build 301 safety boundary</strong>
      <p>
        Safe automatic action: <code>{model.policy.safeAutoAction}</code>.
        Maximum recovery cycles: <code>{model.policy.maxRecoveryCycles}</code>.
        Credential mutation automatic: <code>{String(model.policy.credentialMutationAutomatic)}</code>.
        Event replay automatic: <code>{String(model.policy.eventReplayAutomatic)}</code>.
        Connection activation automatic: <code>{String(model.policy.connectionActivationAutomatic)}</code>.
        Outbound mutation automatic: <code>{String(model.policy.outboundMutationAutomatic)}</code>.
        QL-266 resumed: <code>{String(model.policy.ql266Resumed)}</code>.
      </p>
    </section>
  </>;
}
