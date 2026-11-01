"use client";
import { useMemo, useState } from "react";
import type { AuditEvidenceModel } from "@/lib/unified-audit-evidence-contract";

function matches(value:string,query:string){return !query || value.toLowerCase().includes(query.toLowerCase());}
export function UnifiedAuditEvidenceExplorer({initialModel}:{initialModel:AuditEvidenceModel}){
 const [workspace,setWorkspace]=useState(""); const [actor,setActor]=useState(""); const [module,setModule]=useState("");
 const [operation,setOperation]=useState(""); const [result,setResult]=useState(""); const [source,setSource]=useState("");
 const [consumer,setConsumer]=useState(""); const [run,setRun]=useState(""); const [record,setRecord]=useState("");
 const [from,setFrom]=useState(""); const [to,setTo]=useState(""); const [search,setSearch]=useState("");
 const visible=useMemo(()=>initialModel.items.filter((item)=>{
   if(workspace&&item.workspaceId!==workspace)return false;
   if(actor&&item.actorUserId!==actor)return false;
   if(module&&item.module!==module)return false;
   if(operation&&item.operation!==operation)return false;
   if(result&&item.result!==result)return false;
   if(source&&!matches(item.source,source))return false;
   if(consumer&&!matches(item.consumer,consumer))return false;
   if(run&&!matches(item.collectionRunId,run))return false;
   if(record&&!matches(item.recordId,record))return false;
   const when=new Date(item.occurredAt).getTime();
   if(from&&when<new Date(from+"T00:00:00").getTime())return false;
   if(to&&when>new Date(to+"T23:59:59.999").getTime())return false;
   if(search){
     const hay=[item.workspaceName,item.module,item.operation,item.result,item.actorUserId,item.source,item.consumer,item.collectionRunId,item.recordId,item.summary,JSON.stringify(item.details)].join(" ");
     if(!matches(hay,search))return false;
   }
   return true;
 }),[initialModel.items,workspace,actor,module,operation,result,source,consumer,run,record,from,to,search]);
 function reset(){setWorkspace("");setActor("");setModule("");setOperation("");setResult("");setSource("");setConsumer("");setRun("");setRecord("");setFrom("");setTo("");setSearch("");}
 return <>
  <section className="reviewSummary"><div className="commandMetrics">
   <article><strong>{visible.length}</strong><span>visible evidence events</span></article>
   <article><strong>{initialModel.totals.events}</strong><span>loaded events</span></article>
   <article><strong>{initialModel.totals.modules}</strong><span>evidence modules</span></article>
   <article><strong>{initialModel.totals.workspaces}</strong><span>authorized workspaces</span></article>
  </div></section>
  <section className="reviewFilters" aria-label="Unified audit evidence filters">
   <label>Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search evidence, details or IDs"/></label>
   <label>Workspace<select value={workspace} onChange={e=>setWorkspace(e.target.value)}><option value="">All authorized workspaces</option>{initialModel.workspaces.map(w=><option value={w.id} key={w.id}>{w.name} · {w.role}</option>)}</select></label>
   <label>User<select value={actor} onChange={e=>setActor(e.target.value)}><option value="">All actors</option>{initialModel.filters.actors.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
   <label>Module<select value={module} onChange={e=>setModule(e.target.value)}><option value="">All modules</option>{initialModel.filters.modules.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
   <label>Operation<select value={operation} onChange={e=>setOperation(e.target.value)}><option value="">All operations</option>{initialModel.filters.operations.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
   <label>Result<select value={result} onChange={e=>setResult(e.target.value)}><option value="">All results</option>{initialModel.filters.results.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
   <label>Source<input value={source} onChange={e=>setSource(e.target.value)} placeholder="URL or source"/></label>
   <label>Consumer<input value={consumer} onChange={e=>setConsumer(e.target.value)} placeholder="Consumer or provider"/></label>
   <label>Collection run<input value={run} onChange={e=>setRun(e.target.value)} placeholder="Run or job ID"/></label>
   <label>Record<input value={record} onChange={e=>setRecord(e.target.value)} placeholder="Record, dataset, publication"/></label>
   <label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
   <label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
  </section>
  <div className="heroActions"><button className="secondaryButton" type="button" onClick={reset}>Clear filters</button></div>
  <section className="reviewQueue"><div className="sectionHeading"><p className="eyebrow">Append-only evidence</p><h2>Unified audit timeline</h2></div>
   <div className="reviewBatchList">
    {visible.map(item=><article className="reviewBatchSummary" key={item.id}>
      <div><span className={"reviewStatus reviewStatus-"+(item.result==="success"?"approved":"in-review")}>{item.result}</span>
       <h3>{item.summary}</h3>
       <p>{item.workspaceName} · {item.module} · {item.operation} · {new Date(item.occurredAt).toLocaleString()}</p>
       <small>{item.actorUserId?("actor "+item.actorUserId+" · "):""}{item.recordId?("record "+item.recordId+" · "):""}{item.collectionRunId?("run "+item.collectionRunId):""}</small>
       {(item.source||item.consumer)?<p>{item.source?("Source: "+item.source):""}{item.source&&item.consumer?" · ":""}{item.consumer?("Consumer: "+item.consumer):""}</p>:null}
       <details><summary>Evidence details</summary><pre>{JSON.stringify(item.details,null,2)}</pre></details>
      </div>
    </article>)}
    {!visible.length?<div className="emptyState">No evidence matches the current filters.</div>:null}
   </div>
  </section>
 </>;
}