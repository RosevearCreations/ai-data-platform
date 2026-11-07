"use client";

import { useMemo, useState } from "react";

type Workspace={id:string;name:string;role:string;canManage:boolean};

type MappingCandidate={
  candidateId:string;
  kind:"field-mapping";
  workspaceId:string;
  workspaceName:string;
  mappingProfileId:string;
  applicationId:string;
  contractId:string;
  targetKey:string;
  targetLabel:string;
  targetType:string;
  sourcePath:string;
  sourceType:string;
  transform:string;
  requiredTarget:boolean;
  confidence:number;
  basis:string;
};

type WorkflowCandidate={
  candidateId:string;
  kind:"workflow-rule";
  workspaceId:string;
  workspaceName:string;
  sourceApplicationId:string;
  destinationApplicationId:string;
  environment:"nonproduction"|"production";
  tenantId:string|null;
  eventType:string;
  observedCount:number;
  lastObservedAt:string;
  actionKind:string;
  actionConfig:Record<string,string>;
  confidence:number;
  basis:string;
};

type Candidate=MappingCandidate|WorkflowCandidate;

type Ranking={
  mode:"gateway"|"deterministic-fallback";
  model:string;
  summary:string;
  rankings:Array<{candidateId:string;confidence:number;reason:string}>;
  telemetry:{
    inputTokens:number;
    outputTokens:number;
    totalTokens:number;
    estimatedCostUsd:number|null;
    actualCostUsd:number|null;
  };
  warnings:string[];
};

type Model={
  workspaces:Workspace[];
  candidates:Candidate[];
  deterministicRanking:Ranking;
  summary:{
    workspaces:number;
    mappingProfilesWithSchemaEvidence:number;
    observedEventTypes:number;
    existingAutomationRules:number;
    mappingCandidates:number;
    workflowCandidates:number;
    totalCandidates:number;
  };
  policy:Record<string,boolean>;
};

export function IntegrationSuggestionsWorkbench({model}:{model:Model}){
  const [workspaceId,setWorkspaceId]=useState("");
  const [kind,setKind]=useState<"all"|"field-mapping"|"workflow-rule">("all");
  const [ranking,setRanking]=useState<Ranking>(model.deterministicRanking);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  const rankById=useMemo(
    ()=>new Map(ranking.rankings.map((item,index)=>[
      item.candidateId,{...item,position:index+1}
    ])),
    [ranking]
  );

  const visible=useMemo(
    ()=>model.candidates
      .filter(item=>!workspaceId||item.workspaceId===workspaceId)
      .filter(item=>kind==="all"||item.kind===kind)
      .sort((a,b)=>{
        const ar=rankById.get(a.candidateId)?.position??9999;
        const br=rankById.get(b.candidateId)?.position??9999;
        return ar-br||b.confidence-a.confidence;
      }),
    [model.candidates,workspaceId,kind,rankById]
  );

  async function askAi(){
    setBusy(true);
    setMessage("");
    try{
      const response=await fetch("/api/integration-suggestions",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({workspaceId:workspaceId||null})
      });
      const payload=await response.json();
      if(!response.ok){
        throw new Error(
          typeof payload.error==="string"
            ?payload.error
            :"Suggestion ranking failed."
        );
      }
      setRanking(payload as Ranking);
      setMessage(
        payload.mode==="gateway"
          ?"AI ranking completed using only bounded candidate IDs."
          :"Deterministic ranking shown; AI Gateway was unavailable or not configured."
      );
    }catch(error){
      setMessage(error instanceof Error?error.message:"Suggestion ranking failed.");
    }finally{
      setBusy(false);
    }
  }

  return <>
    {message?<p className="barcodeMessage" role="status">{message}</p>:null}

    <section>
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Suggestion standing</p>
          <h2>Schema and workflow candidates</h2>
        </div>
      </div>
      <div className="commandMetrics">
        <article><strong>{model.summary.mappingCandidates}</strong><span>mapping candidates</span></article>
        <article><strong>{model.summary.workflowCandidates}</strong><span>workflow candidates</span></article>
        <article><strong>{model.summary.mappingProfilesWithSchemaEvidence}</strong><span>profiles with schema evidence</span></article>
        <article><strong>{model.summary.observedEventTypes}</strong><span>observed event types</span></article>
        <article><strong>{model.summary.existingAutomationRules}</strong><span>existing rules considered</span></article>
      </div>
    </section>

    <section className="card">
      <div className="formGrid">
        <label>
          Workspace
          <select value={workspaceId} onChange={event=>setWorkspaceId(event.target.value)}>
            <option value="">All authorized workspaces</option>
            {model.workspaces.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>
          Suggestion type
          <select value={kind} onChange={event=>setKind(event.target.value as typeof kind)}>
            <option value="all">All suggestions</option>
            <option value="field-mapping">Field mappings</option>
            <option value="workflow-rule">Workflow rules</option>
          </select>
        </label>
      </div>
      <div className="heroActions">
        <button className="primaryButton" disabled={busy} onClick={askAi}>
          {busy?"Ranking…":"Ask AI to rank authorized suggestions"}
        </button>
        <a className="secondaryButton" href="/field-mappings">Open Mapping Studio</a>
        <a className="secondaryButton" href="/workflow-automation">Open Workflow Automation</a>
      </div>
      <p>
        Ranking mode: <strong>{ranking.mode}</strong>
        {ranking.mode==="gateway"?` · ${ranking.model}`:""}.
        AI can rank only the candidate IDs already built from authorized evidence.
      </p>
      <p>{ranking.summary}</p>
      {ranking.warnings.map((warning,index)=><p key={index} className="barcodeMessage">{warning}</p>)}
    </section>

    <section>
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Advisory queue</p>
          <h2>Review suggestions</h2>
        </div>
      </div>
      <div className="grid">
        {visible.length?visible.map(candidate=>{
          const ai=rankById.get(candidate.candidateId);
          return <article className="card" key={candidate.candidateId}>
            <p className="eyebrow">
              {candidate.kind==="field-mapping"?"Mapping suggestion":"Workflow suggestion"}
              {ai?` · ranked #${ai.position}`:""}
            </p>
            {candidate.kind==="field-mapping"?<>
              <h3>{candidate.targetLabel}</h3>
              <p>{candidate.applicationId} · {candidate.contractId}</p>
              <p><code>{candidate.sourcePath}</code> → <code>{candidate.targetKey}</code></p>
              <p>Transform: <strong>{candidate.transform}</strong></p>
              <p>Types: {candidate.sourceType} → {candidate.targetType}</p>
              <p>{candidate.requiredTarget?"Required canonical target.":"Optional canonical target."}</p>
              <a className="secondaryButton" href="/field-mappings">Review in Mapping Studio</a>
            </>:<>
              <h3>{candidate.eventType}</h3>
              <p>{candidate.sourceApplicationId} → {candidate.destinationApplicationId}</p>
              <p>{candidate.environment}{candidate.tenantId?" · tenant scoped":""}</p>
              <p>Suggested action: <strong>{candidate.actionKind}</strong></p>
              <p>Observed {candidate.observedCount} event(s) in the evidence window.</p>
              <p><code>{JSON.stringify(candidate.actionConfig)}</code></p>
              <a className="secondaryButton" href="/workflow-automation">Review in Workflow Automation</a>
            </>}
            <p>
              Deterministic confidence: <strong>{Math.round(candidate.confidence*100)}%</strong>
            </p>
            <p>{candidate.basis}</p>
            {ai?<p><strong>AI ranking note:</strong> {ai.reason} ({Math.round(ai.confidence*100)}%)</p>:null}
          </article>;
        }):<article className="card">
          <p>No suggestions match the current filters or authorized evidence.</p>
        </article>}
      </div>
    </section>

    <section className="dataQualityPolicyNote">
      <strong>Build 303 safety boundary</strong>
      <p>
        This surface is advisory only. It does not save field mappings, create workflow
        rules, approve anything, activate connections, release held actions, execute
        destination operations, read event bodies, read credential values or resume QL-266.
      </p>
    </section>
  </>;
}
