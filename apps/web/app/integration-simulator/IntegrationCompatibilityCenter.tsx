"use client";
import { useMemo, useState } from "react";
import type { IntegrationCompatibilityModel } from "@/lib/integration-simulator-contract";

export function IntegrationCompatibilityCenter({model}:{model:IntegrationCompatibilityModel}){
 const [target,setTarget]=useState("");
 const [status,setStatus]=useState("");
 const visible=useMemo(()=>model.results.filter(item=>(!target||item.target===target)&&(!status||item.status===status)),[model.results,target,status]);
 return <>
  <section className="reviewSummary"><div className="commandMetrics">
   <article><strong>{model.totals.batches}</strong><span>previewable batches</span></article>
   <article><strong>{model.totals.compatible}</strong><span>contract compatible</span></article>
   <article><strong>{model.totals.invalid}</strong><span>invalid previews</span></article>
   <article><strong>{model.totals.configuredTargets}/2</strong><span>configured targets</span></article>
  </div></section>
  <section className="reviewFilters" aria-label="Integration simulator filters">
   <label>Target<select value={target} onChange={e=>setTarget(e.target.value)}><option value="">All targets</option><option value="rosie-dazzlers">Rosie Dazzlers</option><option value="devil-n-dove">Devil n Dove</option></select></label>
   <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All results</option><option value="compatible">Compatible</option><option value="invalid">Invalid</option><option value="unavailable">Unavailable</option></select></label>
  </section>
  <section className="reviewQueue"><div className="sectionHeading"><p className="eyebrow">Build 265 simulator</p><h2>Package compatibility previews</h2></div>
   <div className="reviewBatchList">
    {visible.map(item=><article className="reviewBatchSummary" key={item.workspaceId+":"+item.batchId}><div>
      <span className={"reviewStatus reviewStatus-"+(item.status==="compatible"?"approved":"in-review")}>{item.status}</span>
      <h3>{item.workspaceName} · {item.target}</h3>
      <p>Batch {item.batchId}</p>
      <p><strong>Schema:</strong> {item.schemaId}</p>
      <p><strong>Adapter:</strong> {item.adapterContract} · contract v{item.contractVersion}</p>
      <p><strong>Package:</strong> {item.packageId||"not generated"}</p>
      <p><strong>Operations:</strong> {item.operationCount} · {item.actions.length?item.actions.join(", "):"none"}</p>
      <p><strong>Validation:</strong> {item.validationCode}</p>
      {item.validationErrors.length?<ul>{item.validationErrors.map(error=><li key={error}>{error}</li>)}</ul>:null}
      <div className="dataQualityPolicyNote"><strong>Dry-run result</strong><p>{item.dryRunResult}</p></div>
      <div className="dataQualityPolicyNote"><strong>Expected acknowledgement</strong><p>{item.expectedAcknowledgement.join(", ")}</p></div>
      <details><summary>Target capabilities</summary><p>Allowed fields: {item.allowedFields.join(", ")}</p><p>Endpoint configured: {item.configured?"Yes":"No"}{item.endpointOrigin?" · "+item.endpointOrigin:""}</p></details>
    </div></article>)}
    {!visible.length?<div className="emptyState">No approved integration batches match the current filters.</div>:null}
   </div>
  </section>
 </>;
}