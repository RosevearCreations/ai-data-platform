import Link from "next/link";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild448OwnerEnrollment} from "@/lib/build448-live-owner-enrollment";
import {SignedEnvelopeForm} from "./signed-envelope-form";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fowner-field-enrollment");
 const s=await readBuild448OwnerEnrollment(session.user.id,session.session.createdAt);
 return <main className="shell authShell"><section className="authIntro">
 <p className="eyebrow">Build 448 · Original owner and genuine witness enrollment</p>
 <h1>Mailbox, Resend delivery and seven-application witnesses</h1>
 <p className="lead">Authenticated original owner: {s.accountName} · {s.maskedOriginalLogin}. Only original-device cryptographic witnesses with independent enrolled public keys can count toward certification.</p>
 <p><strong>Recovered original owner:</strong> {s.originalOwnerRecovered?"Verified":"HOLD"}</p>
 <p><strong>Mailbox verification:</strong> {s.mailboxAndProvider.mailbox.replaceAll("_"," ")}</p>
 <p><strong>Recovery mail delivery:</strong> {s.mailboxAndProvider.resetTransport.state} — {s.mailboxAndProvider.resetTransport.reason.replaceAll("_"," ")}</p>
 <p><strong>Mailbox and delivery closure:</strong> {s.mailboxAndProvider.closure.replaceAll("_"," ")}</p>
 <p><strong>Original-device key enrollment:</strong> {s.originalWitnessKeys.appsReady} / 7 apps configured</p>
 <p><strong>Fresh source-certified witnesses:</strong> {s.sevenApplicationAccepted} / 7 apps</p>
 <p><strong>Seven-application certification:</strong> {s.sevenApplicationState.replaceAll("_"," ")}</p>
 <p><Link href="/owner-recovery-closure">Send genuine mailbox verification link</Link> · <Link href="/owner-live-recovery">Owner recovery overview</Link></p>
 <h2>Seven independent application checks</h2>
 {s.apps.map(x=><p key={x.appId}><strong>{x.appId}:</strong> key {x.keyStatus.replaceAll("_"," ")}; receipt {x.fieldStatus.replaceAll("_"," ")} — {x.reason.replaceAll("_"," ")}</p>)}
 <h2>Submit real original-device evidence</h2>
 <p>First enroll the independently approved Ed25519 **public** keys and exact app/device bindings in Vercel Production. Generate and retain each **private** key on its actual original device, never in ChatGPT or Vercel. The independently observed original device must sign the canonical Build 442 envelope and source/ACK/owner evidence. Invalid, stale or replayed envelopes are rejected.</p>
 <SignedEnvelopeForm/>
 <p><Link href="https://github.com/RosevearCreations/ai-data-platform/blob/main/docs/BUILD_448_REAL_MAILBOX_AND_FIELD_ENROLLMENT.md">Step-by-step source and independent witness enrollment</Link></p>
 </section></main>;
}
