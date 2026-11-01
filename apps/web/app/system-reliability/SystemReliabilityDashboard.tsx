"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReliabilityDashboardModel, ReliabilityState } from "@/lib/system-reliability-contract";

const labels:Record<ReliabilityState,string>={healthy:"Healthy",attention:"Attention",critical:"Critical",inactive:"Inactive"};
export function SystemReliabilityDashboard({model}:{model:ReliabilityDashboardModel}){
 const [workspace,setWorkspace]=useState(""); const [area,setArea]=useState(""); const [state,setState]=useState("");
 const workspaces=useMemo(()=>[...new Set(model.exceptions.map(item=>item.workspaceName))].sort(),[model.exceptions]);
 const areas=useMemo(()=>[...new Set(model.exceptions.map(item=>item.area))].sort(),[model.exceptions]);
 const visible=model.exceptions.filter(item=>(!workspace||item.workspaceName===workspace)&&(!area||item.area===area)&&(!state||item.state===state));
 return <>
  <section className="reviewSummary"><div className="commandMetrics">
   <article><strong>{model.totals.healthy}</strong><span>healthy systems</span></article>
   <article><strong>{model.totals.attention}</strong><span>attention</span></article>
   <article><strong>{model.totals.critical}</strong><span>critical</span></article>
   <article><strong>{model.totals.exceptions}</strong><span>recent exceptions</span></article>
  </div></section>
  <section className="reviewQueue"><div className="sectionHeading"><p className="eyebrow">Measured signals</p><h2>Platform reliability</h2></div>
   <div className="reviewBatchList">
    {model.signals.map(item=><article className="reviewBatchSummary" key={item.id}>
      <div><span className={"reviewStatus reviewStatus-"+(item.state==="healthy"?"approved":"in-review")}>{labels[item.state]}</span>
       <h3>{item.label}</h3><p><strong>{item.value}</strong> · {item.detail}</p>
       <Link className="secondaryButton" href={item.href}>Open source evidence</Link>
      </div>
    </article>)}
   </div>
  </section>
  <section className="reviewFilters" aria-label="Reliability exception filters">
   <label>Workspace<select value={workspace} onChange={e=>setWorkspace(e.target.value)}><option value="">All workspaces</option>{workspaces.map(v=><option key={v}>{v}</option>)}</select></label>
   <label>Area<select value={area} onChange={e=>setArea(e.target.value)}><option value="">All areas</option>{areas.map(v=><option key={v}>{v}</option>)}</select></label>
   <label>State<select value={state} onChange={e=>setState(e.target.value)}><option value="">All states</option><option value="critical">Critical</option><option value="attention">Attention</option></select></label>
  </section>
  <section className="reviewQueue"><div className="sectionHeading"><p className="eyebrow">Exception evidence</p><h2>Recent reliability exceptions</h2></div>
   <div className="reviewBatchList">
    {visible.map(item=><article className="reviewBatchSummary" key={item.id}><div>
      <span className="reviewStatus reviewStatus-in-review">{labels[item.state]}</span>
      <h3>{item.title}</h3><p>{item.workspaceName} · {item.area}</p><p>{item.detail}</p>
      <small>{item.observedAt?new Date(item.observedAt).toLocaleString():"Current measured condition"}</small>
      <div className="heroActions"><Link className="secondaryButton" href={item.href}>Inspect evidence</Link></div>
    </div></article>)}
    {!visible.length?<div className="emptyState">No reliability exceptions match the current filters.</div>:null}
   </div>
  </section>
 </>;
}