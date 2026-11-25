import Link from "next/link";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild445OwnerInventory} from "@/lib/build445-recovery-ledger";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fowner-account-inventory");
 const result=await readBuild445OwnerInventory(session.user.id);
 return <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
 <section className="hero reviewHero"><p className="eyebrow">Build 445 · Original Owner Recovery</p><h1>Account inventory and verified reset evidence</h1><p className="lead">Original account email and Resend sending address are different properties. Recovery must target the original account mailbox; no account email has been changed.</p>
 <div className="heroActions"><Link className="secondaryButton" href="/owner-recovery-ceremony">Recovery readiness</Link><Link className="secondaryButton" href="/forgot-password">Request password reset</Link><Link className="secondaryButton" href="/owner-recovery-closure">Build 446 live recovery closure</Link></div></section>
 <section className="reviewSummary"><div className="commandMetrics"><article><strong>{result.inventoryState.replaceAll("_"," ")}</strong><span>existing owner account</span></article><article><strong>{result.providerAcceptance.replaceAll("_"," ")}</strong><span>Resend API receipt</span></article><article><strong>{result.deliveryState.replaceAll("_"," ")}</strong><span>provider delivery status</span></article><article><strong>{result.recoveryTransaction.replaceAll("_"," ")}</strong><span>Better Auth password change</span></article></div></section>
 <section className="reviewQueue"><article className="reviewBatchSummary"><h3>Original owner — {result.account.name}</h3><p>Registered login email: {result.account.maskedEmail}</p><p>Credential login: {result.account.hasCredential?"present":"missing"} · Email verification: {result.account.emailVerified?"verified":"not verified"}</p><p>Owner session: {result.ownerSessionState.replaceAll("_"," ")}</p></article>
 <div className="masterGovernanceGrid">{result.receipts.map((r,i)=><article key={i} className="reviewBatchSummary"><h3>{r.stage.replaceAll("_"," ")}</h3><p>{r.occurredAt}</p><p>{r.deliveryState.replaceAll("_"," ")}</p></article>)}</div></section>
 <section className="dataQualityPolicyNote"><strong>Independent custody remains in force.</strong><p>{result.explanation}</p><p>Do not use Resend's sender address as the login email unless that account was independently verified and changed through an authorized recovery process.</p></section>
 </main>;
}
