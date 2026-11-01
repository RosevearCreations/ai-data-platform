import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listUnifiedAuditEvidenceForUser } from "@/lib/unified-audit-evidence";
import { UnifiedAuditEvidenceExplorer } from "./UnifiedAuditEvidenceExplorer";
export const dynamic="force-dynamic";
export default async function AuditEvidencePage(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Faudit-evidence");
 const model=await listUnifiedAuditEvidenceForUser(session.user.id);
 return <main className="shell reviewShell opsDeepScreen opsDeepScreen--frontEnd">
  <section className="hero reviewHero"><p className="eyebrow">Build 262</p><h1>Unified Audit & Evidence Explorer</h1>
   <p className="lead">Search append-only review, publication, delivery, integration, operational and remote-execution evidence from one authorized, read-only timeline.</p>
   <div className="heroActions"><Link className="secondaryButton" href="/data-review">Data Review</Link><Link className="secondaryButton" href="/provenance-lineage">Provenance</Link><Link className="secondaryButton" href="/attention">Attention Center</Link></div>
  </section>
  <section className="dataQualityPolicyNote"><strong>Read-only evidence surface.</strong><p>This explorer does not rewrite, merge or manufacture audit evidence. Existing RLS remains authoritative and source tables remain unchanged.</p></section>
  <UnifiedAuditEvidenceExplorer initialModel={model}/>
 </main>;
}