import Link from "next/link";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild449Dashboard} from "@/lib/build449-automatic-owner-dashboard";
import {OriginalEvidenceAutoRefresh} from "./auto-refresh";
import "./build449.css";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fowner-field-enrollment");
 const s=await readBuild449Dashboard(session.user.id,session.session.createdAt);
 const recovered=s.originalOwnerRecoveryClosure==="RECOVERY_EVIDENCE_COMPLETE";
 return <main className="shell b449-wrapper">
 <p className="eyebrow">Build 449 · Original owner and authentic source evidence</p>
 <h1 className="b449-heading">Owner recovery and seven-app continuity</h1>
 <p className="b449-lead">Signed in as <strong>{s.accountName}</strong> · {s.maskedOriginalLogin}.
 This is an automatic evidence view, not a form. Our real password reset and post-reset sign-in are assessed separately from independent device certification.</p>
 <OriginalEvidenceAutoRefresh/>
 <div className="b449-grid">
  <section className="b449-card">
   <h2>Original owner access</h2>
   <span className="b449-status">{recovered?"RECOVERED":"REVIEW REQUIRED"}</span>
   <span className="b449-value">{s.originalOwnerSession.replaceAll("_"," ")}</span>
   <p className="b449-muted">The real reset-link redemption and new owner login have already been recorded. No additional reset is needed.</p>
  </section>
  <section className="b449-card">
   <h2>Original Gmail recovery</h2>
   <span className="b449-status">{s.originalGmailRecoveryEvidence==="ORIGINAL_MAILBOX_RECOVERY_LINK_REDEEMED"?"RECOVERY LINK CONFIRMED":"HOLD"}</span>
   <span className="b449-value">{s.providerDelivery.replaceAll("_"," ")}</span>
   <p className="b449-muted">The recovered account used an email reset link. The separate Better Auth emailVerified flag is {s.additionalEmailVerificationFlag==="VERIFIED_BY_BETTER_AUTH_EMAIL_LINK"?"verified":"not yet set"}; this does not undo the successful password recovery.</p>
  </section>
  <section className="b449-card">
   <h2>Independent source keys</h2>
   <span className="b449-value">{s.sevenAppKeyReadiness} / {s.appsExpected}</span>
   <p className="b449-muted">Authentic original-device signing keys configured. Keys cannot be created on another host and represented as original-device signatures.</p>
  </section>
  <section className="b449-card">
   <h2>Fresh field witnesses</h2>
   <span className="b449-value">{s.sevenAppGenuineWitnessCount} / {s.appsExpected}</span>
   <p className="b449-muted">{s.sevenAppFieldCertification.replaceAll("_"," ")}. Only independently signed and source-verified records count.</p>
  </section>
 </div>
 <section className="b449-section">
  <h2>Seven applications · automatic source check</h2>
  <p className="b449-muted">No JSON entry is requested. Source agents can submit genuine signed evidence through the existing protected witness endpoint once their independent key custody is established.</p><p><strong>First genuine original-device pilot:</strong> {s.firstGenuineWitnessPilot.replaceAll("_"," ")}{s.pilotAppId?" — "+s.pilotAppId:""}</p>
  <div className="b449-apps">
  {s.applications.map(a=><article className="b449-app" key={a.appId}>
   <strong>{a.appId}</strong>
   <span className="b449-status">{a.state==="CERTIFIED"?"CERTIFIED":"NOT YET CERTIFIED"}</span>
   <p className="b449-muted">{a.reason.replaceAll("_"," ")}</p>
  </article>)}
  </div>
 </section>
 <section className="b449-card b449-section">
  <h2>What the system can and cannot do automatically</h2>
  <p>Owner recovery evidence is read from the actual authentication and Resend records. This page refreshes itself while open. GitHub, Vercel and Neon access cannot impersonate a separate original Windows/device witness or sign for an absent independent custodian.</p>
  <p className="b449-muted">No password changes, re-sent recovery emails, forged signatures or cross-application deployments were performed by this readback.</p>
 </section>
 <nav className="b449-links" aria-label="Owner evidence navigation">
  <Link href="/owner-signer-authority">Build 451 signer and relay continuity</Link>
  <Link href="/owner-connection-validation">Build 450 genuine connection validation</Link>
  <Link href="/owner-live-recovery">Recovery event details</Link>
  <Link href="/field-witness-certification">Original-device source evidence</Link>
  <Link href="https://github.com/RosevearCreations/ai-data-platform/blob/main/docs/BUILD_449_AUTOMATIC_ORIGINAL_OWNER_GMAIL_AND_WITNESS_CONTINUITY.md">Build 449 technical audit</Link>
 </nav>
 </main>;
}
