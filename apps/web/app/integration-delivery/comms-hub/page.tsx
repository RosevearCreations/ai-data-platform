import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { LocalCheck } from "./LocalCheck";

export const dynamic = "force-dynamic";

export default async function CommsHubConnectionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <main className="shell"><section className="hero"><h1>Comms Hub connection</h1><p>Sign in to inspect the nonproduction connection gate.</p><Link href="/sign-in?callbackUrl=/integration-delivery/comms-hub">Sign in</Link></section></main>;
  return <main className="shell"><section className="hero"><p className="eyebrow">I.T. · QL-265</p><h1>Comms Hub connection</h1><p>Source-side checks stay local until independently verified private approval and TEST-only authorization.</p></section><LocalCheck /></main>;
}
