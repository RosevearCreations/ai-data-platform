"use client";
import { useState } from "react";
import type { ConnectorDiagnosticsModel } from "@/lib/connector-diagnostics-contract";

export function ConnectorDiagnosticsAssistant({initialModel}:{initialModel:ConnectorDiagnosticsModel}){
 const [model,setModel]=useState(initialModel);
 const [running,setRunning]=useState("");
 const [message,setMessage]=useState("");
 async function runTest(workspaceId:string,connectorKey:string){
  const key=workspaceId+":"+connectorKey;setRunning(key);setMessage("");
  try{
   const response=await fetch("/api/connectors/diagnostics",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspaceId,connectorKey})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error??"Connection test failed");
   setModel(data.diagnostics);
   setMessage("Connection test completed successfully.");
  }catch(error){setMessage(error instanceof Error?error.message:"Connection test failed.");}
  finally{setRunning("");}
 }
 return <>
  <section className="reviewSummary"><div className="commandMetrics">
   <article><strong>{model.totals.connectors}</strong><span>configured connectors</span></article>
   <article><strong>{model.totals.pass}</strong><span>passing</span></article>
   <article><strong>{model.totals.attention}</strong><span>attention</span></article>
   <article><strong>{model.totals.fail}</strong><span>failing</span></article>
  </div></section>
  {message?<p className="dataQualityPolicyNote">{message}</p>:null}
  <section className="reviewQueue"><div className="sectionHeading"><p className="eyebrow">Build 264 diagnostics</p><h2>Connector recovery assistant</h2></div>
   <div className="reviewBatchList">
    {model.items.map(item=>{
      const key=item.workspaceId+":"+item.connectorKey;
      return <article className="reviewBatchSummary" key={key}><div>
       <span className={"reviewStatus reviewStatus-"+(item.overall==="pass"?"approved":"in-review")}>{item.overall}</span>
       <h3>{item.displayName}</h3>
       <p>{item.workspaceName} · {item.connectorKey} · {item.enabled?"Enabled":"Disabled"}</p>
       <p>Installed version {item.connectorVersion} · manifest v{item.manifestVersion}</p>
       {item.referenceAgeDays!==null?<p>Credential reference age: {item.referenceAgeDays} day(s). Secret values are never displayed.</p>:null}
       <div className="reviewBatchList">
        {item.checks.map(check=><div key={check.id} className="dataQualityPolicyNote">
          <strong>{check.label} — {check.state}</strong>
          <p>{check.detail}</p>
          <p><strong>Recovery:</strong> {check.recovery}</p>
        </div>)}
       </div>
       <div className="heroActions">
        <button className="primaryButton" type="button"
          disabled={!item.canManage||!item.enabled||!item.testCapability||item.testCapability==="export"||running===key}
          onClick={()=>runTest(item.workspaceId,item.connectorKey)}>
          {running===key?"Testing…":"Run controlled connection test"}
        </button>
       </div>
       {!item.canManage?<small>Owner or admin role is required to run connector tests.</small>:null}
       {item.testCapability==="export"?<small>Export-only connector tests require manual provider-safe review and are not executed automatically.</small>:null}
      </div></article>;
    })}
    {!model.items.length?<div className="emptyState">No workspace connectors are configured yet.</div>:null}
   </div>
  </section>
 </>;
}