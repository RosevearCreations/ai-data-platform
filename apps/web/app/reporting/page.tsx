import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { buildReportingStudio } from "@/lib/reporting-studio";
import type { ReportingKpiKey } from "@/lib/reporting-studio-contract";

export const dynamic="force-dynamic";

function bytes(value:number){
 if(value<1024)return value+" B";
 if(value<1024*1024)return (value/1024).toFixed(1)+" KB";
 return (value/(1024*1024)).toFixed(2)+" MB";
}
function valueLabel(value:number,unit:string){return unit==="percent"?value.toFixed(1)+"%":unit==="bytes"?bytes(value):String(value);}
function query(input:{workspace?:string;preset?:string}){const p=new URLSearchParams();if(input.workspace)p.set("workspace",input.workspace);if(input.preset)p.set("preset",input.preset);return p.toString();}
export default async function ReportingStudioPage({searchParams}:{searchParams:Promise<{workspace?:string;preset?:string}>}){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Freporting");
 const params=await searchParams;
 const model=await buildReportingStudio(session.user.id);
 const preset=model.presets.find(item=>item.id===params.preset)??model.presets[0];
 const allowed=new Set<ReportingKpiKey>(preset.kpis);
 const selected=model.workspaces.filter(item=>!params.workspace||item.workspaceId===params.workspace);
 const exportParams=new URLSearchParams();
 exportParams.set("format","csv");exportParams.set("preset",preset.id);if(params.workspace)exportParams.set("workspace",params.workspace);
 const jsonParams=new URLSearchParams(exportParams);jsonParams.set("format","json");
 return <main className="shell reviewShell opsDeepScreen opsDeepScreen--management">
  <section className="hero reviewHero">
   <p className="eyebrow">Build 269</p>
   <h1>Reporting Studio, KPI Dashboards & Evidence-Based Exports</h1>
   <p className="lead">Build configurable workspace reporting from the same governed evidence used by collection, review, quality, delivery, adoption, retention and provider operations.</p>
   <div className="heroActions"><a className="secondaryButton" href={"/api/reporting?"+exportParams.toString()}>Export CSV</a><a className="secondaryButton" href={"/api/reporting?"+jsonParams.toString()}>Export JSON</a><Link className="secondaryButton" href="/audit-evidence">Audit & Evidence</Link></div>
  </section>

  <section className="reviewSummary"><div className="commandMetrics">
   <article><strong>{model.totals.collectionSuccesses}/{model.totals.collectionAttempts}</strong><span>collection successes / attempts</span></article>
   <article><strong>{model.totals.approvedCandidates}</strong><span>approved candidates</span></article>
   <article><strong>{model.totals.deliveryAccepted}</strong><span>accepted deliveries</span></article>
   <article><strong>{bytes(model.totals.retentionBytes)}</strong><span>measured retention footprint</span></article>
  </div></section>

  <section className="dataQualityPolicyNote"><strong>Evidence-based reporting</strong><p>Every KPI is derived from authorized platform evidence. Percentage KPIs expose their numerator and denominator. Provider units and retention bytes are operational measurements/proxies, not billing statements. Exports contain the same scoped report data shown here.</p></section>

  <section className="reviewQueue">
   <div className="sectionHeading"><div><p className="eyebrow">Report configuration</p><h2>Preset and workspace scope</h2></div></div>
   <div className="heroActions">
    {model.presets.map(item=><Link key={item.id} className={item.id===preset.id?"primaryLink":"secondaryButton"} href={"/reporting?"+query({workspace:params.workspace,preset:item.id})}>{item.label}</Link>)}
   </div>
   <div className="heroActions">
    <Link className={!params.workspace?"primaryLink":"secondaryButton"} href={"/reporting?"+query({preset:preset.id})}>All workspaces</Link>
    {model.workspaces.map(item=><Link key={item.workspaceId} className={params.workspace===item.workspaceId?"primaryLink":"secondaryButton"} href={"/reporting?"+query({workspace:item.workspaceId,preset:preset.id})}>{item.workspaceName}</Link>)}
   </div>
  </section>

  {selected.map(workspace=><section className="reviewQueue" key={workspace.workspaceId}>
   <div className="sectionHeading"><div><p className="eyebrow">{workspace.role} workspace · {preset.label}</p><h2>{workspace.workspaceName}</h2></div></div>
   <div className="reviewBatchList">
    {workspace.kpis.filter(item=>allowed.has(item.key)).map(item=><article className="reviewBatchSummary" key={item.key}><div>
      <span className="reviewStatus reviewStatus-approved">{item.unit}</span>
      <h3>{item.label}</h3><p className="lead">{valueLabel(item.value,item.unit)}</p><p>{item.detail}</p>
      {item.numerator!==null&&item.denominator!==null?<p><strong>Evidence ratio:</strong> {item.numerator} / {item.denominator}</p>:null}
      <Link className="secondaryButton" href={item.href}>Open source evidence</Link>
    </div></article>)}
   </div>
  </section>)}
 </main>;
}
