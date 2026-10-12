import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPublicationDeliveryBridgeForUser } from "@/lib/publication-delivery-bridge";

import { HelpInfo } from "../../help/HelpInfo";
import { PublicationDeliveryWorkbench } from "./PublicationDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function PublicationDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fapproved-data%2Fdelivery");

  const model = await listPublicationDeliveryBridgeForUser(session.user.id);

  return (
    <main className="shell bridgeShell">
      <section className="hero bridgeHero">
        <HelpInfo topic="publication-delivery-overview" />
        <p className="eyebrow">Build 050</p>
        <h1>Approved Publication Delivery Mapping & Consumer Receipt Bridge</h1>
        <p className="lead">
          Map immutable Build 049 publication fields into an existing consumer contract,
          prove the package through conformance, and retain a receipt chain from publication
          fingerprint to consumer acknowledgement. External transport remains authenticated
          and dry-run only.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data">Approved data publishing</Link>
          <Link className="secondaryButton" href="/approved-data/live-delivery">Controlled live delivery</Link>
          <Link className="secondaryButton" href="/integration-delivery">Build 033 delivery evidence</Link>
        </div>
      </section>

      <PublicationDeliveryWorkbench initialModel={model} />
    </main>
  );
}
