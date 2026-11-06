"use client";

import { useMemo, useState } from "react";

const applications=["devilndove","rosiedazzlers","yard-workers","icamp","rosevear-comms-hub","rosevear-ai-hub"] as const;
const itemTypes=["appointment","booking","job","maintenance","event","hold"] as const;
const statuses=["tentative","confirmed","cancelled","completed"] as const;

type Model={
  workspaces:Array<{id:string;name:string;role:string}>;
  items:Array<{scheduleId:string;workspaceId:string;canonicalTenantKey:string;sourceApplicationId:string;destinationApplicationId:string;sourceRecordId:string;itemType:string;title:string;status:string;startAt:string;endAt:string|null;timezone:string;locationText:string|null;customerRecordId:string|null;serviceRecordId:string|null;staffRecordIds:string[];equipmentRecordIds:string[];notes:string|null;state:"held";holdReason:string;createdAt:string}>;
  conflicts:Array<{conflictId:string;workspaceId:string;scheduleId:string;conflictingScheduleId:string;scheduleTitle:string;conflictingTitle:string;conflictScope:"local-held-items-only";reason:string;recordedAt:string}>;
  packages:Array<{packageId:string;workspaceId:string;scheduleId:string;title:string;itemType:string;status:string;startAt:string;endAt:string|null;sourceApplicationId:string;destinationApplicationId:string;destinationTenantKey:string;localConflictCount:number;state:"held";holdReason:string;reviewDecision:"approve"|"reject"|null;reviewReason:string|null;reviewedAt:string|null;createdAt:string}>;
  summary:{heldScheduleItems:number;localConflictFindings:number;heldPackages:number;pendingReviews:number;approvedForFutureHandoff:number};
  policy:{bookingContractId:string;appendOnlyScheduling:boolean;localConflictDetectionOnly:boolean;peerCalendarWrites:boolean;outboundNetworkRequests:boolean;automaticAppointmentCreation:boolean;ownerAdminReviewRequired:boolean;ql266Resumed:boolean};
};

function splitList(value:string) {
  return value.split(",").map(v=>v.trim()).filter(Boolean);
}

export function SharedSchedulingConsole({model}:{model:Model}) {
  const admins=useMemo(()=>model.workspaces.filter(w=>w.role==="owner"||w.role==="admin"),[model.workspaces]);
  const [workspaceId,setWorkspaceId]=useState(admins[0]?.id??"");
  const [sourceApplicationId,setSourceApplicationId]=useState<(typeof applications)[number]>("rosiedazzlers");
  const [destinationApplicationId,setDestinationApplicationId]=useState<(typeof applications)[number]>("rosevear-comms-hub");
  const [tenant,setTenant]=useState("");
  const [sourceRecordId,setSourceRecordId]=useState("");
  const [itemType,setItemType]=useState<(typeof itemTypes)[number]>("appointment");
  const [status,setStatus]=useState<(typeof statuses)[number]>("tentative");
  const [title,setTitle]=useState("");
  const [startAt,setStartAt]=useState("");
  const [endAt,setEndAt]=useState("");
  const [timezone,setTimezone]=useState("America/Toronto");
  const [locationText,setLocationText]=useState("");
  const [customerRecordId,setCustomerRecordId]=useState("");
  const [serviceRecordId,setServiceRecordId]=useState("");
  const [staffRecordIds,setStaffRecordIds]=useState("");
  const [equipmentRecordIds,setEquipmentRecordIds]=useState("");
  const [notes,setNotes]=useState("");
  const [destinationTenantKey,setDestinationTenantKey]=useState("");
  const [reviewReasons,setReviewReasons]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState("");
  const [message,setMessage]=useState("");

  async function run(key:string,body:Record<string,unknown>,success:string){
    setBusy(key);setMessage("");
    try{
      const response=await fetch("/api/shared-scheduling",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(typeof payload.error==="string"?payload.error:"Scheduling request failed.");
      setMessage(success+" Reloading.");
      window.location.reload();
    }catch(error){setMessage(error instanceof Error?error.message:"Request failed.");}
    finally{setBusy("");}
  }

  return <>
    {message?<p className="barcodeMessage" role="status">{message}</p>:null}

    <section>
      <div className="sectionHeading"><div><p className="eyebrow">Shared scheduling</p><h2>Build 299 standing</h2></div></div>
      <div className="commandMetrics">
        <article><strong>{model.summary.heldScheduleItems}</strong><span>held schedule items</span></article>
        <article><strong>{model.summary.localConflictFindings}</strong><span>local overlap findings</span></article>
        <article><strong>{model.summary.pendingReviews}</strong><span>packages awaiting review</span></article>
        <article><strong>{model.summary.approvedForFutureHandoff}</strong><span>approved future handoffs</span></article>
      </div>
    </section>

    <section>
      <div className="sectionHeading"><div><p className="eyebrow">New schedule item</p><h2>Prepare a governed appointment, booking or calendar event</h2></div></div>
      <div className="card">
        <div className="formGrid">
          <label>Workspace<select value={workspaceId} onChange={e=>setWorkspaceId(e.target.value)}>{admins.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
          <label>Source application<select value={sourceApplicationId} onChange={e=>setSourceApplicationId(e.target.value as (typeof applications)[number])}>{applications.map(a=><option key={a}>{a}</option>)}</select></label>
          <label>Destination application<select value={destinationApplicationId} onChange={e=>setDestinationApplicationId(e.target.value as (typeof applications)[number])}>{applications.map(a=><option key={a}>{a}</option>)}</select></label>
          <label>Tenant key<input value={tenant} onChange={e=>setTenant(e.target.value)} /></label>
          <label>Source record ID<input value={sourceRecordId} onChange={e=>setSourceRecordId(e.target.value)} /></label>
          <label>Item type<select value={itemType} onChange={e=>setItemType(e.target.value as (typeof itemTypes)[number])}>{itemTypes.map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Status<select value={status} onChange={e=>setStatus(e.target.value as (typeof statuses)[number])}>{statuses.map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Title<input value={title} onChange={e=>setTitle(e.target.value)} /></label>
          <label>Start time<input value={startAt} onChange={e=>setStartAt(e.target.value)} placeholder="2026-11-07T14:00:00-05:00" /></label>
          <label>End time<input value={endAt} onChange={e=>setEndAt(e.target.value)} placeholder="optional" /></label>
          <label>Timezone<input value={timezone} onChange={e=>setTimezone(e.target.value)} /></label>
          <label>Location<input value={locationText} onChange={e=>setLocationText(e.target.value)} /></label>
          <label>Customer record ID<input value={customerRecordId} onChange={e=>setCustomerRecordId(e.target.value)} /></label>
          <label>Service record ID<input value={serviceRecordId} onChange={e=>setServiceRecordId(e.target.value)} /></label>
          <label>Staff record IDs<input value={staffRecordIds} onChange={e=>setStaffRecordIds(e.target.value)} placeholder="comma-separated" /></label>
          <label>Equipment record IDs<input value={equipmentRecordIds} onChange={e=>setEquipmentRecordIds(e.target.value)} placeholder="comma-separated" /></label>
          <label>Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} /></label>
        </div>
        <button className="primaryButton" disabled={!workspaceId||busy==="create"} onClick={()=>run("create",{
          action:"create-schedule-item",workspaceId,canonicalTenantKey:tenant,sourceApplicationId,destinationApplicationId,
          sourceRecordId,itemType,title,status,startAt,endAt,timezone,locationText,customerRecordId,serviceRecordId,
          staffRecordIds:splitList(staffRecordIds),equipmentRecordIds:splitList(equipmentRecordIds),notes
        },"Schedule item created in HELD state.")}>{busy==="create"?"Creating…":"Create held schedule item"}</button>
      </div>
    </section>

    <section>
      <div className="sectionHeading"><div><p className="eyebrow">Schedule queue</p><h2>Held appointments and calendar items</h2></div></div>
      <div className="cardStack">
        {model.items.length?model.items.map(item=><article className="card" key={item.scheduleId}>
          <div className="sectionHeading"><div><p className="eyebrow">{item.itemType} · {item.status}</p><h3>{item.title}</h3></div><span className="statusPill">HELD</span></div>
          <p>{item.sourceApplicationId} → {item.destinationApplicationId}</p>
          <dl className="detailGrid">
            <div><dt>Start</dt><dd>{item.startAt}</dd></div>
            <div><dt>End</dt><dd>{item.endAt??"Not set"}</dd></div>
            <div><dt>Timezone</dt><dd>{item.timezone}</dd></div>
            <div><dt>Location</dt><dd>{item.locationText??"Not set"}</dd></div>
          </dl>
          <label>Destination tenant<input value={destinationTenantKey} onChange={e=>setDestinationTenantKey(e.target.value)} placeholder="destination tenant key" /></label>
          <button className="secondaryButton" disabled={busy===item.scheduleId} onClick={()=>run(item.scheduleId,{
            action:"prepare-package",scheduleId:item.scheduleId,destinationTenantKey
          },"Schedule exchange package prepared and held.")}>Prepare held calendar package</button>
        </article>):<article className="card"><p>No shared schedule items yet.</p></article>}
      </div>
    </section>

    <section>
      <div className="sectionHeading"><div><p className="eyebrow">Conflict evidence</p><h2>Local held-item overlaps</h2></div></div>
      <div className="cardStack">
        {model.conflicts.length?model.conflicts.map(item=><article className="card" key={item.conflictId}>
          <h3>{item.scheduleTitle} ↔ {item.conflictingTitle}</h3>
          <p>{item.reason}</p>
          <p><strong>Scope:</strong> {item.conflictScope}. Peer calendar availability was not queried.</p>
        </article>):<article className="card"><p>No local overlap evidence recorded.</p></article>}
      </div>
    </section>

    <section>
      <div className="sectionHeading"><div><p className="eyebrow">Review queue</p><h2>Future governed calendar handoff</h2></div></div>
      <div className="cardStack">
        {model.packages.length?model.packages.map(item=><article className="card" key={item.packageId}>
          <div className="sectionHeading"><div><p className="eyebrow">{item.itemType} · {item.status}</p><h3>{item.title}</h3></div><span className="statusPill">HELD</span></div>
          <p>{item.sourceApplicationId} → {item.destinationApplicationId} · tenant {item.destinationTenantKey}</p>
          <p>Local conflicts: <strong>{item.localConflictCount}</strong> · review: {item.reviewDecision??"pending"}</p>
          {item.reviewDecision===null?<>
            <label>Review reason<textarea value={reviewReasons[item.packageId]??""} onChange={e=>setReviewReasons(v=>({...v,[item.packageId]:e.target.value}))}/></label>
            <div className="heroActions">
              <button className="primaryButton" disabled={item.localConflictCount>0} onClick={()=>run(item.packageId+":approve",{action:"review-package",packageId:item.packageId,decision:"approve",reason:reviewReasons[item.packageId]??""},"Approved for future governed calendar handoff; package remains HELD.")}>Approve future handoff</button>
              <button className="secondaryButton" onClick={()=>run(item.packageId+":reject",{action:"review-package",packageId:item.packageId,decision:"reject",reason:reviewReasons[item.packageId]??""},"Schedule package rejected.")}>Reject</button>
            </div>
          </>:null}
        </article>):<article className="card"><p>No schedule packages yet.</p></article>}
      </div>
    </section>

    <section className="dataQualityPolicyNote">
      <strong>Build 299 execution boundary</strong>
      <p>Booking contract: <code>{model.policy.bookingContractId}</code>. Peer calendar writes: <code>{String(model.policy.peerCalendarWrites)}</code>. Automatic appointment creation: <code>{String(model.policy.automaticAppointmentCreation)}</code>. Outbound network requests: <code>{String(model.policy.outboundNetworkRequests)}</code>. QL-266 resumed: <code>{String(model.policy.ql266Resumed)}</code>.</p>
    </section>
  </>;
}
