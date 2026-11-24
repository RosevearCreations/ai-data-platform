import Link from "next/link";
import {publicBuild444Readiness} from "@/lib/build444-readiness-database";
export const dynamic="force-dynamic";
export default function Page(){
 const s=publicBuild444Readiness();
 return <main className="shell authShell"><section className="authIntro"><p className="eyebrow">Build 444 · Identity and witness recovery</p><h1>Original owner account recovery ceremony</h1><p className="lead">The application authenticates by email, not username. Never share passwords or signing keys. Software deployment and real owner recovery are separate acceptance gates.</p>
 <p><strong>Mail delivery setup:</strong> {s.mailConfiguration.replaceAll("_"," ")}</p>
 <p><strong>Owner verification:</strong> {s.recoveryCeremony.replaceAll("_"," ")}</p>
 <p><strong>Witness enrollment:</strong> {s.originalDeviceEnrollment.replaceAll("_"," ")}</p>
 <p><strong>Independent acceptance:</strong> {s.fieldAcceptance.replaceAll("_"," ")}</p>
 <p>If the original account mailbox is accessible, configure a verified sender in Vercel, then <Link href="/forgot-password">request a reset email</Link>. If the account email is unknown or inaccessible, an authorized operator must verify ownership before any credential or email change.</p>
 <p><Link href="/sign-in">Sign in</Link> · <Link href="/account-access">Sign-in diagnostics</Link> · <Link href="/field-witness-certification">Field acceptance dashboard</Link></p>
 <p>Authenticated owner-role proof can be checked via <Link href="/api/owner-recovery-ceremony">owner-only ceremony readback</Link>. It never discloses account identities.</p>
 </section></main>;
}
