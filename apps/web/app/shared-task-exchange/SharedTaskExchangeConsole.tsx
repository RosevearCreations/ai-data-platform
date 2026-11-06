"use client";

import { useMemo, useState } from "react";

const applications=["devilndove","rosiedazzlers","yard-workers","icamp","rosevear-comms-hub","rosevear-ai-hub"] as const;
const taskKinds=["exception","follow-up","review","maintenance","customer-action","internal-action"] as const;
const priorities=["low","normal","high","urgent"] as const;

type Model={
 workspaces:Array<{id:string;name:string;role:string}>;
 tasks:Array<{taskId:string;workspaceId:string;sourceApplicationId:string;destinationApplicationId:string;canonicalTenantKey:string;sourceRecordType:string;sourceRecordId:string;taskKind:string;priority:string;title:string;summary:string;dueAt:string|null;assigneeHint:string|null;state:"held";holdReason:string;createdAt:string}>;
 links:Array<{linkId:string;workspaceId:string;parentTaskId:string;childTaskId:string;relationship:string;reason:string;createdAt:string}>;
 packages:Array<{packageId:string;workspaceId:string;taskId:string;title:string;taskKind:string;priority:string;sourceApplicationId:string;destinationApplicationId:string;destinationTenantKey:string;state:"held";holdReason:string;reviewDecision:"approve"|"reject"|null;reviewReason:string|null;reviewedAt:string|null;createdAt:string}>;
 summary:{heldTasks:number;linkedTasks:number;heldPackages:number;pendingReviews:number;approvedForFutureHandoff:number;urgentTasks:number};
 policy:{appendOnlyTasks:boolean;packageState:string;peerApplicationWrites:boolean;outboundNetworkRequests:boolean;automaticTaskCreation:boolean;ownerAdminReviewRequired:boolean;ql266Resumed:boolean};
};

export function SharedTaskExchangeConsole({model}:{model:Model}) {
 const admins=useMemo(()=>model.workspaces.filter(w=>w.role==="owner"||w.role==="admin"),[model.workspaces]);
 const [workspaceId,setWorkspaceId]=useState(admins[0]?.id??"");
 const [sourceApplicationId,setSourceApplicationId]=useState<(typeof applications)[number]>("rosiedazzlers");
 const [destinationApplicationId,setDestinationApplicationId]=useState<(typeof applications)[number]>("rosevear-comms-hub");
 const [tenant,setTenant]=useState("");
 const [sourceRecordType,setSourceRecordType]=useState("exception");
 const [sourceRecordId,setSourceRecordId]=useState("");
 const [taskKind,setTaskKind]=useState<(typeof taskKinds)[number]>("follow-up");
 const [priority,setPriority]=useState<(typeof priorities)[number]>("normal");
 const [title,setTitle]=useState("");
 const [summary,setSummary]=useState("");
 const [dueAt,setDueAt]=useState("");
 const [assigneeHint,setAssigneeHint]=useState("");
 const [destinationTenantKey,setDestinationTenantKey]=useState("");
 const [reviewReasons,setReviewReasons]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState("");
 const [message,setMessage]=useState("");

 async function run(key:string,body:Record<string,unknown>,success:string){
   setBusy(key);setMessage("");
   try{
     const response=await fetch("/api/shared-task-exchange",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
     const payload=await response.json().catch(()=>({}));
     if(!response.ok) throw new Error(typeof payload.error==="string"?payload.error:"Task exchange request failed.");
     setMessage(success+" Reloading.");
     window.location.reload();
   }catch(error){setMessage(error instanceof Error?error.message:"Request failed.");}
   finally{setBusy("");}
 }

 return <>
   {message?<p className="barcodeMessage" role="status">{message}</p>:null}

   <section>
    <div className="sectionHeading"><div><p className="eyebrow">Shared work queue</p><h2>Build 298 standing</h2></div></div>
    <div className="commandMetrics">
      <article><strong>{model.summary.heldTasks}</strong><span>held shared tasks</span></article>
      <article><strong>{model.summary.linkedTasks}</strong><span>task links</span></article>
      <article><strong>{model.summary.pendingReviews}</strong><span>packages awaiting review</span></article>
      <article><strong>{model.summary.urgentTasks}</strong><span>urgent tasks</span></article>
    </div>
   </section>

   <section>
    <div className="sectionHeading"><div><p className="eyebrow">Create task</p><h2>Turn a governed exception or follow-up into a linked work item</h2></div></div>
    <div className="card">
      <div className="formGrid">
        <label>Workspace<select value={workspaceId} onChange={e=>setWorkspaceId(e.target.value)}>{admins.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
        <label>Source application<select value={sourceApplicationId} onChange={e=>setSourceApplicationId(e.target.value as (typeof applications)[number])}>{applications.map(a=><option key={a}>{a}</option>)}</select></label>
        <label>Destination application<select value={destinationApplicationId} onChange={e=>setDestinationApplicationId(e.target.value as (typeof applications)[number])}>{applications.map(a=><option key={a}>{a}</option>)}</select></label>
        <label>Tenant key<input value={tenant} onChange={e=>setTenant(e.target.value)} /></label>
        <label>Source record type<input value={sourceRecordType} onChange={e=>setSourceRecordType(e.target.value)} /></label>
        <label>Source record ID<input value={sourceRecordId} onChange={e=>setSourceRecordId(e.target.value)} /></label>
        <label>Task kind<select value={taskKind} onChange={e=>setTaskKind(e.target.value as (typeof taskKinds)[number])}>{taskKinds.map(k=><option key={k}>{k}</option>)}</select></label>
        <label>Priority<select value={priority} onChange={e=>setPriority(e.target.value as (typeof priorities)[number])}>{priorities.map(p=><option key={p}>{p}</option>)}</select></label>
        <label>Title<input value={title} onChange={e=>setTitle(e.target.value)} /></label>
        <label>Due at<input value={dueAt} onChange={e=>setDueAt(e.target.value)} placeholder="optional ISO timestamp" /></label>
        <label>Assignee hint<input value={assigneeHint} onChange={e=>setAssigneeHint(e.target.value)} placeholder="optional role/team hint" /></label>
        <label>Summary<textarea value={summary} onChange={e=>setSummary(e.target.value)} /></label>
      </div>
      <button className="primaryButton" disabled={!workspaceId||busy==="create"} onClick={()=>run("create",{
        action:"create-task",workspaceId,sourceApplicationId,destinationApplicationId,canonicalTenantKey:tenant,
        sourceRecordType,sourceRecordId,taskKind,priority,title,summary,dueAt,assigneeHint
      },"Shared task created in HELD state.")}>{busy==="create"?"Creating…":"Create held shared task"}</button>
    </div>
   </section>

   <section>
    <div className="sectionHeading"><div><p className="eyebrow">Task queue</p><h2>Prepare destination packages</h2></div></div>
    <div className="cardStack">
      {model.tasks.length?model.tasks.map(task=><article className="card" key={task.taskId}>
        <div className="sectionHeading"><div><p className="eyebrow">{task.priority} · {task.taskKind}</p><h3>{task.title}</h3></div><span className="statusPill">HELD</span></div>
        <p>{task.summary}</p>
        <dl className="detailGrid">
          <div><dt>Route</dt><dd>{task.sourceApplicationId} → {task.destinationApplicationId}</dd></div>
          <div><dt>Source</dt><dd>{task.sourceRecordType}:{task.sourceRecordId}</dd></div>
          <div><dt>Due</dt><dd>{task.dueAt??"Not set"}</dd></div>
          <div><dt>Assignee hint</dt><dd>{task.assigneeHint??"Not set"}</dd></div>
        </dl>
        <label>Destination tenant<input value={destinationTenantKey} onChange={e=>setDestinationTenantKey(e.target.value)} placeholder="destination tenant key" /></label>
        <button className="secondaryButton" disabled={busy===task.taskId} onClick={()=>run(task.taskId,{
          action:"prepare-package",taskId:task.taskId,destinationTenantKey
        },"Task exchange package prepared and held.")}>Prepare held package</button>
      </article>):<article className="card"><p>No shared tasks yet.</p></article>}
    </div>
   </section>

   <section>
    <div className="sectionHeading"><div><p className="eyebrow">Review queue</p><h2>Approve future handoff or reject</h2></div></div>
    <div className="cardStack">
      {model.packages.length?model.packages.map(item=><article className="card" key={item.packageId}>
        <div className="sectionHeading"><div><p className="eyebrow">{item.priority} · {item.taskKind}</p><h3>{item.title}</h3></div><span className="statusPill">HELD</span></div>
        <p>{item.sourceApplicationId} → {item.destinationApplicationId} · tenant {item.destinationTenantKey}</p>
        <p>Review: {item.reviewDecision??"pending"} · hold: {item.holdReason}</p>
        {item.reviewDecision===null?<>
          <label>Review reason<textarea value={reviewReasons[item.packageId]??""} onChange={e=>setReviewReasons(v=>({...v,[item.packageId]:e.target.value}))}/></label>
          <div className="heroActions">
            <button className="primaryButton" onClick={()=>run(item.packageId+":approve",{action:"review-package",packageId:item.packageId,decision:"approve",reason:reviewReasons[item.packageId]??""},"Approved for future governed handoff; package remains HELD.")}>Approve future handoff</button>
            <button className="secondaryButton" onClick={()=>run(item.packageId+":reject",{action:"review-package",packageId:item.packageId,decision:"reject",reason:reviewReasons[item.packageId]??""},"Package rejected.")}>Reject</button>
          </div>
        </>:null}
      </article>):<article className="card"><p>No task packages yet.</p></article>}
    </div>
   </section>

   <section className="dataQualityPolicyNote">
    <strong>Build 298 execution boundary</strong>
    <p>Peer writes: <code>{String(model.policy.peerApplicationWrites)}</code>. Automatic task creation: <code>{String(model.policy.automaticTaskCreation)}</code>. Outbound network requests: <code>{String(model.policy.outboundNetworkRequests)}</code>. QL-266 resumed: <code>{String(model.policy.ql266Resumed)}</code>.</p>
   </section>
 </>;
}
