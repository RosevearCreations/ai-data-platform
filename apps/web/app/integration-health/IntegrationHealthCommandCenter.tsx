"use client";

import { useMemo, useState } from "react";

import type {
  IntegrationHealthCommandCenterModel,
  IntegrationHealthState
} from "@/lib/integration-health-command-center";

const labels:Record<IntegrationHealthState,string>={
  healthy:"Healthy",
  attention:"Attention",
  critical:"Critical",
  inactive:"Inactive"
};

export function IntegrationHealthCommandCenter({
  model
}:{model:IntegrationHealthCommandCenterModel}) {
  const [state,setState]=useState("");
  const [query,setQuery]=useState("");

  const degraded=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return model.degradedServices.filter((item)=>{
      if(state && item.state!==state) return false;
      if(!q) return true;
      return [item.label,item.value,item.detail].some(value=>value.toLowerCase().includes(q));
    });
  },[model.degradedServices,state,query]);

  return <>
    <section>
      <div className="sectionHeading">
        <div><p className="eyebrow">Unified integration health</p><h2>Build 300 standing</h2></div>
        <span className="statusPill">{labels[model.summary.state]}</span>
      </div>
      <div className="commandMetrics">
        <article><strong>{model.summary.registeredPeers}</strong><span>registered peer apps</span></article>
        <article><strong>{model.summary.unmeasuredPeers}</strong><span>peer states awaiting current evidence</span></article>
        <article><strong>{model.summary.staleCredentials}</strong><span>credential references needing attention</span></article>
        <article><strong>{model.summary.queuedEvents}</strong><span>held/pending event routes</span></article>
        <article><strong>{model.summary.deliveryFailures24h}</strong><span>delivery failures / 24h</span></article>
        <article><strong>{model.summary.webhookDenied24h}</strong><span>webhook denials / 24h</span></article>
        <article><strong>{model.summary.databaseLatencyMs} ms</strong><span>dashboard DB evidence latency</span></article>
        <article><strong>{model.summary.connectorAverageLatencyMs===null?"—":model.summary.connectorAverageLatencyMs+" ms"}</strong><span>latest connector average latency</span></article>
      </div>
    </section>

    <section>
      <div className="sectionHeading"><div><p className="eyebrow">Health signals</p><h2>Integration layers</h2></div></div>
      <div className="cardStack">
        {model.signals.map(item=><article className="card" key={item.id}>
          <div className="sectionHeading">
            <div><p className="eyebrow">{labels[item.state]}</p><h3>{item.label}</h3></div>
            <strong>{item.value}</strong>
          </div>
          <p>{item.detail}</p>
          <a className="secondaryButton" href={item.href}>Open evidence</a>
        </article>)}
      </div>
    </section>

    <section>
      <div className="sectionHeading"><div><p className="eyebrow">Peer applications</p><h2>Registered connection state</h2></div></div>
      <div className="cardStack">
        {model.peers.map(item=><article className="card" key={item.applicationId}>
          <h3>{item.displayName}</h3>
          <p><strong>{item.connectionState}</strong> · {item.discoveryState}</p>
          <p>Automatic activation: {String(item.automaticActivationAllowed)} · mutating capability discovered: {String(item.mutatingCapabilityDiscovered)}</p>
        </article>)}
      </div>
    </section>

    <section>
      <div className="sectionHeading"><div><p className="eyebrow">Connector latency</p><h2>Latest measured connector evidence</h2></div></div>
      <div className="cardStack">
        {model.connectorLatency.length?model.connectorLatency.map(item=><article className="card" key={item.workspaceId+":"+item.connectorKey}>
          <div className="sectionHeading"><div><p className="eyebrow">{item.status}</p><h3>{item.connectorKey}</h3></div><strong>{item.durationMs} ms</strong></div>
          <p>{item.errorCode??"No latest error code."}</p>
          <p>Observed {item.observedAt}</p>
        </article>):<article className="card"><p>No connector audit latency is available yet.</p></article>}
      </div>
    </section>

    <section>
      <div className="sectionHeading"><div><p className="eyebrow">Credential references</p><h2>Rotation and expiry risk</h2></div></div>
      <div className="cardStack">
        {model.credentials.length?model.credentials.map(item=><article className="card" key={item.workspaceId+":"+item.applicationId+":"+item.label}>
          <div className="sectionHeading"><div><p className="eyebrow">{item.environment}</p><h3>{item.label}</h3></div><strong>{item.riskState}</strong></div>
          <p>{item.applicationId}</p>
          <p>Rotation due: {item.rotationDueAt??"not set"} · expires: {item.expiresAt??"not set"}</p>
        </article>):<article className="card"><p>No credential-reference records are available in the current RLS scope.</p></article>}
      </div>
    </section>

    <section>
      <div className="sectionHeading"><div><p className="eyebrow">Webhook intake</p><h2>Endpoints and recent outcomes</h2></div></div>
      <div className="cardStack">
        {model.webhooks.length?model.webhooks.map(item=><article className="card" key={item.endpointId}>
          <div className="sectionHeading"><div><p className="eyebrow">{item.environment} · {item.enabled?"enabled":"disabled"}</p><h3>{item.displayName}</h3></div></div>
          <p>{item.sourceApplicationId}</p>
          <p>{item.accepted24h} accepted · {item.denied24h} denied in 24h</p>
          <p>Last receipt: {item.lastReceiptAt??"none observed"}</p>
        </article>):<article className="card"><p>No webhook endpoints are available in the current RLS scope.</p></article>}
      </div>
    </section>

    <section>
      <div className="sectionHeading"><div><p className="eyebrow">Event bus</p><h2>Queues, failures and recovery evidence</h2></div></div>
      <div className="commandMetrics">
        <article><strong>{model.queues.heldRoutes}</strong><span>held routes</span></article>
        <article><strong>{model.queues.pendingRoutes}</strong><span>pending routes</span></article>
        <article><strong>{model.queues.deliveryFailures24h}</strong><span>failures / 24h</span></article>
        <article><strong>{model.queues.deadLetters}</strong><span>dead letters</span></article>
        <article><strong>{model.queues.replayRequests}</strong><span>replay requests</span></article>
      </div>
    </section>

    <section>
      <div className="sectionHeading">
        <div><p className="eyebrow">Degraded services</p><h2>Unified attention list</h2></div>
      </div>
      <div className="formGrid">
        <label>State<select value={state} onChange={e=>setState(e.target.value)}><option value="">All</option><option value="critical">Critical</option><option value="attention">Attention</option></select></label>
        <label>Search<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="service, failure or detail" /></label>
      </div>
      <div className="cardStack">
        {degraded.length?degraded.map(item=><article className="card" key={item.id}>
          <div className="sectionHeading"><div><p className="eyebrow">{labels[item.state]}</p><h3>{item.label}</h3></div><strong>{item.value}</strong></div>
          <p>{item.detail}</p>
          <a className="secondaryButton" href={item.href}>Review source evidence</a>
        </article>):<article className="card"><p>No degraded service matches the current filter.</p></article>}
      </div>
    </section>

    <section className="dataQualityPolicyNote">
      <strong>Build 300 evidence boundary</strong>
      <p>Read-only dashboard: <code>{String(model.policy.readOnlyDashboard)}</code>. External health probes: <code>{String(model.policy.externalHealthProbePerformed)}</code>. Credential values read: <code>{String(model.policy.credentialValuesRead)}</code>. Automatic recovery: <code>{String(model.policy.automaticRecoveryTriggered)}</code>. Automatic connection activation: <code>{String(model.policy.automaticConnectionActivation)}</code>. Legacy QL-266 prerequisite retired: <code>{String(model.policy.legacyQl266PrerequisiteRetired)}</code>.</p>
    </section>
  </>;
}
