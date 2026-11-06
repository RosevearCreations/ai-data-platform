"use client";

import { useMemo, useState } from "react";

type Workspace={
  id:string;
  name:string;
  role:string;
};

type Rule={
  ruleId:string;
  workspaceId:string;
  name:string;
  sourceApplicationId:string|null;
  destinationApplicationId:string;
  environment:"nonproduction"|"production";
  tenantId:string|null;
  eventTypes:string[];
  actionKind:string;
  actionConfig:Record<string,unknown>;
  supersedesRuleId:string|null;
  createdAt:string;
  state:"draft"|"approved"|"rejected"|"disabled"|"superseded";
  latestReview:null|{
    reviewId:string;
    decision:"approve"|"reject"|"disable";
    reason:string;
    reviewedAt:string;
  };
};

type Intent={
  intentId:string;
  ruleId:string;
  publicationId:string;
  sourceApplicationId:string;
  destinationApplicationId:string;
  eventId:string;
  eventType:string;
  actionKind:string;
  actionConfig:Record<string,unknown>;
  targetHref:string;
  state:"held";
  holdReason:"workflow-action-not-authorized";
  createdAt:string;
};

type Model={
  workspaces:Workspace[];
  applications:string[];
  actionKinds:string[];
  rules:Rule[];
  intents:Intent[];
  summary:{
    rules:number;
    approvedRules:number;
    draftRules:number;
    disabledRules:number;
    heldActionIntents:number;
  };
  policy:{
    reviewedRulesOnly:boolean;
    exactEventTypeMatching:boolean;
    futureEventsOnlyAfterApproval:boolean;
    actionIntentsHeld:boolean;
    automaticDestinationExecution:boolean;
    outboundNetworkDelivery:boolean;
    credentialMutation:boolean;
    connectionActivation:boolean;
    trustMutation:boolean;
    ql266Resumed:boolean;
  };
};

async function api(body:Record<string,unknown>){
  const response=await fetch("/api/workflow-automation",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){
    throw new Error(
      typeof payload.error==="string"
        ?payload.error
        :"Workflow automation request failed."
    );
  }
  return payload;
}

export function WorkflowAutomationBuilder({model}:{model:Model}){
  const adminWorkspaces=useMemo(
    ()=>model.workspaces.filter(item=>item.role==="owner"||item.role==="admin"),
    [model.workspaces]
  );

  const [workspaceId,setWorkspaceId]=useState(adminWorkspaces[0]?.id??"");
  const [name,setName]=useState("");
  const [sourceApplicationId,setSourceApplicationId]=useState("");
  const [destinationApplicationId,setDestinationApplicationId]=useState(
    model.applications[0]??""
  );
  const [environment,setEnvironment]=useState<"nonproduction"|"production">("nonproduction");
  const [tenantId,setTenantId]=useState("");
  const [eventTypes,setEventTypes]=useState("");
  const [actionKind,setActionKind]=useState(model.actionKinds[0]??"prepare-shared-task");
  const [actionLabel,setActionLabel]=useState("");
  const [actionOption,setActionOption]=useState("normal");
  const [supersedesRuleId,setSupersedesRuleId]=useState("");
  const [reviewReasons,setReviewReasons]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState("");
  const [message,setMessage]=useState("");

  const sameApp=
    Boolean(sourceApplicationId) &&
    sourceApplicationId===destinationApplicationId;

  function actionConfig(){
    if(actionKind==="prepare-shared-task"){
      return {title:actionLabel,priority:actionOption||"normal"};
    }
    if(actionKind==="prepare-notification"){
      return {subject:actionLabel,channel:actionOption||"email"};
    }
    if(actionKind==="prepare-schedule"){
      return {title:actionLabel,itemType:actionOption||"event"};
    }
    return {reason:actionLabel||(
      actionKind==="review-event-recovery"
        ?"Review event recovery evidence"
        :"Review integration recovery evidence"
    )};
  }

  function optionChoices(){
    if(actionKind==="prepare-shared-task") return ["low","normal","high","urgent"];
    if(actionKind==="prepare-notification") return ["email","sms","in-app"];
    if(actionKind==="prepare-schedule"){
      return ["appointment","booking","job","maintenance","event","hold"];
    }
    return [];
  }

  function actionLabelCaption(){
    if(actionKind==="prepare-notification") return "Held notification subject";
    if(actionKind==="review-event-recovery"||actionKind==="review-integration-recovery"){
      return "Review reason";
    }
    return "Held action title";
  }

  async function run(key:string,body:Record<string,unknown>,success:string){
    setBusy(key);
    setMessage("");
    try{
      await api(body);
      setMessage(success+" Reloading.");
      window.location.reload();
    }catch(error){
      setMessage(
        error instanceof Error
          ?error.message
          :"Workflow automation request failed."
      );
    }finally{
      setBusy("");
    }
  }

  async function createRule(){
    await run(
      "create",
      {
        action:"create-rule",
        workspaceId,
        name,
        sourceApplicationId:sourceApplicationId||null,
        destinationApplicationId,
        environment,
        tenantId:tenantId||null,
        eventTypes:eventTypes.split(",").map(item=>item.trim()).filter(Boolean),
        actionKind,
        actionConfig:actionConfig(),
        supersedesRuleId:supersedesRuleId||null
      },
      "Draft workflow rule created."
    );
  }

  async function reviewRule(
    rule:Rule,
    decision:"approve"|"reject"|"disable"
  ){
    await run(
      rule.ruleId+":"+decision,
      {
        action:"review-rule",
        ruleId:rule.ruleId,
        decision,
        reason:reviewReasons[rule.ruleId]??""
      },
      decision==="approve"
        ?"Rule approved for future matching publications."
        :decision==="disable"
          ?"Rule disabled."
          :"Rule rejected."
    );
  }

  return <>
    {message?<p className="barcodeMessage" role="status">{message}</p>:null}

    <section>
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Workflow automation standing</p>
          <h2>Reviewed event-to-action rules</h2>
        </div>
      </div>
      <div className="commandMetrics">
        <article><strong>{model.summary.rules}</strong><span>rule definitions</span></article>
        <article><strong>{model.summary.approvedRules}</strong><span>approved rules</span></article>
        <article><strong>{model.summary.draftRules}</strong><span>draft rules</span></article>
        <article><strong>{model.summary.disabledRules}</strong><span>disabled rules</span></article>
        <article><strong>{model.summary.heldActionIntents}</strong><span>held action intents</span></article>
      </div>
      <div className="heroActions">
        <button
          className="secondaryButton"
          disabled={busy==="evaluate"}
          onClick={()=>run(
            "evaluate",
            {action:"evaluate-recent"},
            "Recent post-approval publications evaluated."
          )}
        >
          {busy==="evaluate"?"Evaluating…":"Evaluate recent publications"}
        </button>
      </div>
    </section>

    <section>
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Rule builder</p>
          <h2>Create immutable draft rule</h2>
        </div>
      </div>
      {adminWorkspaces.length?<div className="card">
        <div className="formGrid">
          <label>
            Workspace
            <select value={workspaceId} onChange={event=>setWorkspaceId(event.target.value)}>
              {adminWorkspaces.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            Rule name
            <input value={name} onChange={event=>setName(event.target.value)} placeholder="Booking created → prepare follow-up task"/>
          </label>
          <label>
            Source application
            <select value={sourceApplicationId} onChange={event=>setSourceApplicationId(event.target.value)}>
              <option value="">Any source application</option>
              {model.applications.map(item=><option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Destination application
            <select value={destinationApplicationId} onChange={event=>setDestinationApplicationId(event.target.value)}>
              {model.applications.map(item=><option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Environment
            <select
              value={environment}
              onChange={event=>setEnvironment(event.target.value as "nonproduction"|"production")}
            >
              <option value="nonproduction">nonproduction</option>
              <option value="production">production</option>
            </select>
          </label>
          <label>
            Tenant filter (optional)
            <input value={tenantId} onChange={event=>setTenantId(event.target.value)}/>
          </label>
          <label>
            Exact event types
            <input
              value={eventTypes}
              onChange={event=>setEventTypes(event.target.value)}
              placeholder="booking.created, booking.updated"
            />
          </label>
          <label>
            Governed destination action
            <select
              value={actionKind}
              onChange={event=>{
                const next=event.target.value;
                setActionKind(next);
                setActionLabel("");
                setActionOption(
                  next==="prepare-shared-task"
                    ?"normal"
                    :next==="prepare-notification"
                      ?"email"
                      :next==="prepare-schedule"
                        ?"event"
                        :""
                );
              }}
            >
              {model.actionKinds.map(item=><option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            {actionLabelCaption()}
            <input
              value={actionLabel}
              onChange={event=>setActionLabel(event.target.value)}
              placeholder={
                actionKind.includes("recovery")
                  ?"Review recovery evidence before action"
                  :"Prepared action label"
              }
            />
          </label>
          {optionChoices().length?<label>
            Action option
            <select value={actionOption} onChange={event=>setActionOption(event.target.value)}>
              {optionChoices().map(item=><option key={item} value={item}>{item}</option>)}
            </select>
          </label>:null}
          <label>
            Supersedes approved rule (optional)
            <select value={supersedesRuleId} onChange={event=>setSupersedesRuleId(event.target.value)}>
              <option value="">No predecessor</option>
              {model.rules.filter(item=>item.workspaceId===workspaceId).map(item=>
                <option key={item.ruleId} value={item.ruleId}>
                  {item.name} · {item.state}
                </option>
              )}
            </select>
          </label>
        </div>
        {sameApp?<p className="barcodeMessage">Source and destination applications must differ for a cross-app rule.</p>:null}
        <div className="heroActions">
          <button
            className="primaryButton"
            disabled={
              busy==="create" ||
              sameApp ||
              !workspaceId ||
              !name.trim() ||
              !eventTypes.trim() ||
              !destinationApplicationId
            }
            onClick={createRule}
          >
            {busy==="create"?"Creating…":"Create draft rule"}
          </button>
        </div>
      </div>:<div className="emptyState">
        <p>Owner/admin membership is required to author or review workflow automation rules.</p>
      </div>}
    </section>

    <section>
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Rule review</p>
          <h2>Approve, reject or disable</h2>
        </div>
      </div>
      <div className="grid">
        {model.rules.length?model.rules.map(rule=>{
          const canManage=adminWorkspaces.some(item=>item.id===rule.workspaceId);
          return <article className="card" key={rule.ruleId}>
            <div className="sectionHeading">
              <div><p className="eyebrow">{rule.state}</p><h3>{rule.name}</h3></div>
            </div>
            <p>{rule.sourceApplicationId??"any source"} → {rule.destinationApplicationId}</p>
            <p>{rule.environment}{rule.tenantId?" · tenant "+rule.tenantId:" · any tenant"}</p>
            <p>Events: {rule.eventTypes.join(", ")}</p>
            <p>Action: <strong>{rule.actionKind}</strong></p>
            <p>Action config: <code>{JSON.stringify(rule.actionConfig)}</code></p>
            {rule.latestReview?<p>
              Latest review: <strong>{rule.latestReview.decision}</strong> · {rule.latestReview.reason}
            </p>:<p>No review decision recorded.</p>}
            {canManage&&rule.state!=="superseded"?<>
              <label>
                Review reason
                <textarea
                  value={reviewReasons[rule.ruleId]??""}
                  onChange={event=>setReviewReasons(current=>({
                    ...current,[rule.ruleId]:event.target.value
                  }))}
                  placeholder="Explain the owner/admin decision."
                />
              </label>
              <div className="heroActions">
                {rule.state!=="approved"?<button
                  className="primaryButton"
                  disabled={busy===rule.ruleId+":approve"}
                  onClick={()=>reviewRule(rule,"approve")}
                >Approve future matches</button>:null}
                {rule.state==="approved"?<button
                  className="secondaryButton"
                  disabled={busy===rule.ruleId+":disable"}
                  onClick={()=>reviewRule(rule,"disable")}
                >Disable rule</button>:null}
                {rule.state!=="rejected"&&rule.state!=="approved"?<button
                  className="secondaryButton"
                  disabled={busy===rule.ruleId+":reject"}
                  onClick={()=>reviewRule(rule,"reject")}
                >Reject rule</button>:null}
              </div>
            </>:null}
          </article>;
        }):<article className="card"><p>No workflow automation rules exist yet.</p></article>}
      </div>
    </section>

    <section>
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Held action queue</p>
          <h2>Matched governed action intents</h2>
        </div>
      </div>
      <div className="grid">
        {model.intents.length?model.intents.map(intent=><article className="card" key={intent.intentId}>
          <div className="sectionHeading">
            <div><p className="eyebrow">{intent.state}</p><h3>{intent.actionKind}</h3></div>
          </div>
          <p>{intent.sourceApplicationId} → {intent.destinationApplicationId}</p>
          <p>{intent.eventType} · event {intent.eventId}</p>
          <p>{intent.holdReason}</p>
          <p><code>{JSON.stringify(intent.actionConfig)}</code></p>
          <a className="secondaryButton" href={intent.targetHref}>Open governed destination workbench</a>
        </article>):<article className="card">
          <p>No matched action intents exist yet. Approved rules only match publications created after their approval time.</p>
        </article>}
      </div>
    </section>

    <section className="dataQualityPolicyNote">
      <strong>Build 302 automation boundary</strong>
      <p>
        Reviewed rules only: <code>{String(model.policy.reviewedRulesOnly)}</code>.
        Future events only after approval: <code>{String(model.policy.futureEventsOnlyAfterApproval)}</code>.
        Held intents: <code>{String(model.policy.actionIntentsHeld)}</code>.
        Automatic destination execution: <code>{String(model.policy.automaticDestinationExecution)}</code>.
        Outbound network delivery: <code>{String(model.policy.outboundNetworkDelivery)}</code>.
        Credential mutation: <code>{String(model.policy.credentialMutation)}</code>.
        Connection activation: <code>{String(model.policy.connectionActivation)}</code>.
        Trust mutation: <code>{String(model.policy.trustMutation)}</code>.
        QL-266 resumed: <code>{String(model.policy.ql266Resumed)}</code>.
      </p>
    </section>
  </>;
}
