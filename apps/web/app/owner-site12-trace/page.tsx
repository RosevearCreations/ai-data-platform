import Link from "next/link";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild452Site12Owner} from "@/lib/build452-site12-trace-database";
import "../owner-field-enrollment/build449.css";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fowner-site12-trace");
 const s=await readBuild452Site12Owner(session.user.id);
 return <main className="shell b449-wrapper">
 <p className="eyebrow">Build 452 · AI Data Platform / Camp Rosevear</p>
 <h1 className="b449-heading">Site 12 · request-to-folio evidence</h1>
 <p className="b449-lead">This Master observes existing authorized iCamp events. Camp Rosevear owns the guest, reservation, staff work order, payment and original folio. No payment is created or changed here.</p>
 <div className="b449-grid">
  <article className="b449-card"><h2>Observed Site 12 journeys</h2><strong className="b449-value">{s.journeyCount}</strong><p>Source window: {s.sourceWindowDays} days. Events received: {s.rawEventCount}; unique: {s.acceptedUniqueEventCount}.</p></article>
  <article className="b449-card"><h2>Missing stages</h2><strong className="b449-value">{s.partialJourneyCount}</strong><p>Journeys requiring staff or source action; no stages are synthesized.</p></article>
  <article className="b449-card"><h2>Stale journeys</h2><strong className="b449-value">{s.staleJourneyCount}</strong><p>Source observation age threshold: {s.windowMinutes} minutes.</p></article>
  <article className="b449-card"><h2>Duplicates / conflicts</h2><strong className="b449-value">{s.duplicatesSuppressed} / {s.conflictingEventIds}</strong><p>Redundant delivery suppressed; conflicting IDs held for review.</p></article>
 </div>
 <section className="b449-section"><h2>Production observation</h2>
  <p><strong>{s.observationStatus.replaceAll("_"," ")}</strong></p>
  <p className="b449-muted">{s.productionAcceptance.replaceAll("_"," ")}. Unknown cost means no margin is displayed. Reported payment and folio stages are not a substitute for an iCamp settlement readback.</p>
 </section>
 <section className="b449-section"><h2>Request timelines</h2>
  <div className="b449-apps">{s.journeys.length?s.journeys.map(j=><article key={j.journeyKey} className="b449-app">
   <strong>{j.operationId}</strong>
   <p>Repair: {j.maintenanceState.replaceAll("_"," ")}</p>
   <p>Add-on: {j.addonState.replaceAll("_"," ")}</p>
   <p>Source age: {j.sourceAgeMinutes} min {j.stale?"(STALE)":""}</p>
   <p>Missing: {j.missingStages.join(", ")||"none reported"}</p>
   <p>Folio reference: {j.folioReference??"not supplied"}</p>
   <p>Margin: unavailable without source costs</p>
  </article>):<article className="b449-app"><strong>No Site 12 events received</strong>
   <p>Master webhook receipts cannot prove the guest journey yet. Do not infer success from an empty trace.</p></article>}</div>
 </section>
 <nav className="b449-links"><Link href="/owner-signer-authority">Signer authority</Link>
 <Link href="/owner-connection-validation">Seven-app connections</Link>
 <Link href="https://github.com/RosevearCreations/ai-data-platform/blob/main/docs/BUILD_452_SITE12_SOURCE_OF_TRUTH_ACCEPTANCE.md">Complete Site 12 source acceptance guide</Link></nav>
 </main>;
}
