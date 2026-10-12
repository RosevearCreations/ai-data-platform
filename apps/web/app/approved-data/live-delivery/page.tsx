import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listControlledLiveDeliveryForUser } from "@/lib/controlled-live-delivery";

import { HelpInfo } from "../../help/HelpInfo";
import { ControlledLiveDeliveryWorkbench } from "./ControlledLiveDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function ControlledLiveDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fapproved-data%2Flive-delivery");
  }

  const model = await listControlledLiveDeliveryForUser(session.user.id);

  return (
    <main className="shell liveDeliveryShell">
      <section className="hero liveDeliveryHero">
        <HelpInfo topic="controlled-live-delivery-overview" />
        <p className="eyebrow">Build 051</p>
        <h1>Controlled Consumer Activation & Idempotent Live Delivery</h1>
        <p className="lead">
          Activate live mutation only after a recent accepted external dry-run and a
          consumer handshake that proves live support plus replay-key idempotency.
          Every live send is explicitly confirmed, uses the same replay key on retry,
          and retains a durable delivery outcome.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/delivery">
            Build 050 delivery bridge
          </Link>
          <Link className="secondaryButton" href="/approved-data">
            Approved publications
          </Link>
        </div>
      </section>

      <ControlledLiveDeliveryWorkbench initialModel={model} />
    </main>
  );
}
