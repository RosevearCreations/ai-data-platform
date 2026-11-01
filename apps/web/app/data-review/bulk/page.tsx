import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listBulkReviewWorkbenchForUser } from "@/lib/bulk-data-review";
import { BulkReviewWorkbench } from "./BulkReviewWorkbench";
export const dynamic="force-dynamic";
export default async function BulkReviewPage(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fdata-review%2Fbulk");
 const model=await listBulkReviewWorkbenchForUser(session.user.id);
 return <main className="shell reviewShell opsDeepScreen opsDeepScreen--frontEnd"><section className="hero reviewHero"><p className="eyebrow">Build 261</p><h1>Bulk Review, Batch Decisions & Exception Routing</h1><p className="lead">Select multiple in-review batches from one workspace, preview the exact governed action, then approve, reject or route them to a durable exception queue with explicit reason codes.</p><div className="heroActions"><Link className="secondaryButton" href="/data-review">Single-batch review</Link><Link className="secondaryButton" href="/data-quality">Data Quality</Link><Link className="secondaryButton" href="/provenance-lineage">Provenance</Link></div></section><section className="dataQualityPolicyNote"><strong>Preview-before-commit is mandatory.</strong><p>Bulk actions never alter source snapshots. Approval/rejection uses the existing terminal review state; hold creates an exception and leaves the review in-review.</p></section><BulkReviewWorkbench initialModel={model}/></main>;
}