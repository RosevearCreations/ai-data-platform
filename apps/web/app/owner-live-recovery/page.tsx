import Link from "next/link";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild447OwnerOperations} from "@/lib/build447-live-operations-database";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fowner-live-recovery");
 const s=await readBuild447OwnerOperations(session.user.id,session.session.createdAt);
 return <main className="shell authShell"><section className="authIntro"><p className="eyebrow">Build 447 · Live Original Owner Recovery</p><h1>Original owner recovery and seven-app evidence</h1>
 <p className="lead">Signed in as {s.accountLabel} · {s.maskedLoginEmail}. This live view separates the completed password-reset/login ceremony from mailbox verification, actual Resend delivery and independent field certification.</p>
 <p><strong>Original owner access:</strong> {s.ownerRecovery.replaceAll("_"," ")}</p>
 <p><strong>Mailbox verified:</strong> {s.emailVerification.replaceAll("_"," ")}</p>
 <p><strong>Resend delivery:</strong> {s.deliveryException.state.replaceAll("_"," ")}</p>
 <p><strong>Mailbox and transport closure:</strong> {s.mailboxDeliveryClosure.replaceAll("_"," ")}</p>
 <p><strong>Delivery guidance:</strong> {s.deliveryException.action}</p>
 <p><strong>Independent app witnesses:</strong> {s.witnessCount} of {s.witnessExpected} certified</p>
 <p><strong>Seven-application acceptance:</strong> {s.sevenApplicationClosure.replaceAll("_"," ")}</p>
 <p><strong>Readback availability:</strong> {s.witnessReadback.replaceAll("_"," ")}</p>
 <p><Link href="/owner-recovery-closure">Verify original mailbox</Link> · <Link href="/owner-account-inventory">Review reset receipts</Link> · <Link href="/field-witness-certification">View independent witness dashboard</Link></p>
 <h2>Application-by-application witness review</h2>
 {s.applications.map(app=><p key={app.appId}><strong>{app.appId}:</strong> {app.state} — {app.reason.replaceAll("_"," ")}</p>)}
 <p>No automatic resends, password changes, peer deployments or synthetic witness certifications have occurred.</p>
 </section></main>;
}
