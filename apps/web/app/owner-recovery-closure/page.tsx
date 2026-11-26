import Link from "next/link";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild446OwnerClosure} from "@/lib/build446-mailbox-closure-database";
import {VerifyMailboxButton} from "./verification-button";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fowner-recovery-closure");
 const s=await readBuild446OwnerClosure(session.user.id,session.session.createdAt);
 return <main className="shell authShell"><section className="authIntro"><p className="eyebrow">Build 446 · Verified Original Owner Recovery</p><h1>Mailbox, delivery and owner-session certification</h1><p className="lead">This report uses real Better Auth account state, protected recovery receipts and live Resend message status. No test data is treated as production acceptance.</p>
 <p><strong>Existing account:</strong> {s.accountName} · {s.maskedLoginEmail}</p>
 <p><strong>Owner:</strong> {s.originalOwner.replaceAll("_"," ")}</p>
 <p><strong>Mailbox verified:</strong> {s.mailbox.replaceAll("_"," ")}</p>
 <p><strong>Recovery mail delivery:</strong> {s.recoveryDelivery.replaceAll("_"," ")}</p>
 <p><strong>Password reset token:</strong> {s.resetLink.replaceAll("_"," ")}</p>
 <p><strong>New owner sign-in:</strong> {s.newOwnerSession.replaceAll("_"," ")}</p>
 <p><strong>Recovery closure:</strong> {s.closure.replaceAll("_"," ")}</p>
 <p><strong>Independent field acceptance:</strong> Separate original-device evidence required</p>
 {s.mailbox==="HOLD_UNVERIFIED_ORIGINAL_EMAIL"?<VerifyMailboxButton/>:null}
 <p><Link href="/forgot-password">Request original-owner password reset</Link> · <Link href="/owner-account-inventory">Recovery receipt history</Link> · <Link href="/owner-field-enrollment">Original mailbox and witness enrollment</Link> · <Link href="/owner-live-recovery">Build 447 original owner and seven-app acceptance</Link></p>
 <p>Use the account's registered mailbox for the password reset and email verification. The Resend sender address is not a substitute for the account login.</p>
 </section></main>;
}
