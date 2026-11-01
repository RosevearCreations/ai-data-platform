"use client";
import { useMemo, useState } from "react";
import type { SecurityAccessReviewModel } from "@/lib/security-access-review-contract";

export function SecurityAccessReview({model}:{model:SecurityAccessReviewModel}){
 const [workspace,setWorkspace]=useState("");
 const [state,setState]=useState("");
 const visible=useMemo(()=>model.workspaces.filter(item=>!workspace||item.workspaceId===workspace),[model.workspaces,workspace]);
 return <>
  <section className="reviewSummary"><div className="commandMetrics">
   <article><strong>{model.totals.workspaces}</strong><span>workspaces reviewed</span></article>
   <article><strong>{model.totals.members}</strong><span>visible memberships</span></article>
   <article><strong>{model.totals.attentionMembers}</strong><span>membership reviews</span></article>
   <article><strong>{model.totals.unusedConnectorGrants}</strong><span>unused connector grants</span></article>
  </div></section>
  <section className="reviewFilters">
   <label>Workspace<select value={workspace} onChange={e=>setWorkspace(e.target.value)}><option value="">All</option>{model.workspaces.map(w=><option key={w.workspaceId} value={w.workspaceId}>{w.workspaceName}</option>)}</select></label>
   <label>Member state<select value={state} onChange={e=>setState(e.target.value)}><option value="">All</option><option value="healthy">Healthy</option><option value="review">Review</option><option value="attention">Attention</option></select></label>
  </section>
  {visible.map(review=><section className="reviewQueue" key={review.workspaceId}>
   <div className="sectionHeading"><p className="eyebrow">{review.currentRole} · {review.profileKey}</p><h2>{review.workspaceName}</h2></div>
   <div className="dataQualityPolicyNote"><strong>Effective capabilities</strong><p>{review.effectiveCapabilities.length?review.effectiveCapabilities.join(", "):"No enabled profile capabilities."}</p></div>
   <div className="reviewBatchList">
    {review.members.filter(m=>!state||m.state===state).map(member=><article className="reviewBatchSummary" key={member.userId}><div>
      <span className={"reviewStatus reviewStatus-"+(member.state==="healthy"?"approved":"in-review")}>{member.state}</span>
      <h3>{member.name}</h3><p>{member.role}</p>
      {member.memberSince?<p>Member since {new Date(member.memberSince).toLocaleDateString()}</p>:null}
      <p>Last reviewed privileged activity: {member.lastPrivilegedActivityAt?new Date(member.lastPrivilegedActivityAt).toLocaleString():"No matching evidence"}</p>
      {member.reasons.map(reason=><p key={reason}>{reason}</p>)}
      {member.recommendations.map(item=><p key={item}><strong>Recommendation:</strong> {item}</p>)}
    </div></article>)}
   </div>
   <div className="reviewBatchList">
    {review.connectors.map(connector=><article className="reviewBatchSummary" key={connector.connectorKey}><div>
      <span className={"reviewStatus reviewStatus-"+(connector.state==="healthy"?"approved":"in-review")}>{connector.state}</span>
      <h3>{connector.connectorKey}</h3><p>{connector.enabled?"Enabled":"Disabled"}</p>
      <p><strong>Granted:</strong> {connector.grants.join(", ")||"None"}</p>
      <p><strong>Used:</strong> {connector.usedGrants.join(", ")||"None recorded"}</p>
      <p><strong>Unused:</strong> {connector.unusedGrants.join(", ")||"None"}</p>
      {connector.recommendations.map(item=><p key={item}><strong>Recommendation:</strong> {item}</p>)}
    </div></article>)}
   </div>
   <div className="dataQualityPolicyNote"><strong>Privileged operations observed: {review.privilegedOperationCount}</strong>{review.reviewNotes.map(note=><p key={note}>{note}</p>)}</div>
  </section>)}
 </>;
}