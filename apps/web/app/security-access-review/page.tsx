import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buildSecurityAccessReview } from "@/lib/security-access-review";
import { SecurityAccessReview } from "./SecurityAccessReview";
export const dynamic="force-dynamic";
export default async function SecurityAccessReviewPage(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fsecurity-access-review");
 const model=await buildSecurityAccessReview(session.user.id);
 return <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
  <section className="hero reviewHero"><p className="eyebrow">Build 266</p><h1>Security, Workspace Access & Least-Privilege Review</h1>
   <p className="lead">Review membership, effective permissions, profile capability inheritance, connector grants and privileged-operation evidence without changing access automatically.</p>
   <div className="heroActions"><Link className="secondaryButton" href="/adoption">Adoption & Permissions</Link><Link className="secondaryButton" href="/connector-diagnostics">Connector Diagnostics</Link><Link className="secondaryButton" href="/audit-evidence">Audit & Evidence</Link></div>
  </section>
  <section className="dataQualityPolicyNote"><strong>Advisory only.</strong><p>Build 266 does not remove members, change roles, disable capabilities or revoke connector grants. Any access change remains an explicit owner/admin decision.</p></section>
  <SecurityAccessReview model={model}/>
 </main>;
}