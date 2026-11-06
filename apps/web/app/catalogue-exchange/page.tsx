import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listCatalogueExchangeForUser } from "@/lib/catalogue-exchange-database";

import { HelpInfo } from "../help/HelpInfo";
import { CatalogueExchangeConsole } from "./CatalogueExchangeConsole";

export const dynamic = "force-dynamic";

export default async function CatalogueExchangePage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="integration-delivery" />
          <p className="eyebrow">Build 295</p>
          <h1>
            Shared Product, Service &amp; Catalogue Exchange
          </h1>
          <p className="lead">
            Sign in to normalize maker, service and campground
            catalogue records and review held exchange packages.
          </p>
          <Link
            className="primaryLink"
            href="/sign-in?callbackUrl=/catalogue-exchange"
          >
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const model = await listCatalogueExchangeForUser(
    session.user.id
  );

  return (
    <main className="shell opsCommandScreen opsCommandScreen--it">
      <section className="hero">
        <HelpInfo topic="integration-delivery" />
        <p className="eyebrow">
          Build 295 · normalized internal catalogue exchange
        </p>
        <h1>
          Shared Product, Service &amp; Catalogue Exchange
        </h1>
        <p className="lead">
          Standardize source products, services, packages, add-ons,
          campsites, amenities and rentals into reviewed Rosevear
          product/service contracts before any future transport.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/data-contracts">
            Shared contracts
          </Link>
          <Link className="secondaryButton" href="/customer-identities">
            Customer identities
          </Link>
          <Link className="secondaryButton" href="/delivery-guarantees">
            Delivery guarantees
          </Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 295 authorization boundary</strong>
        <p>
          Catalogue items are normalized into the existing Build 286
          product/service contracts. Exchange packages are immutable
          and remain <code>held</code> even after owner/admin approval.
          Build 295 performs no peer-app write, no outbound request and
          does not resume QL-266.
        </p>
      </section>

      <CatalogueExchangeConsole
        model={{
          workspaces: model.workspaces.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            role: workspace.role
          })),
          items: model.items.map((item) => ({
            itemId: item.itemId,
            workspaceId: item.workspaceId,
            sourceApplicationId: item.sourceApplicationId,
            canonicalTenantKey: item.canonicalTenantKey,
            sourceRecordId: item.sourceRecordId,
            sourceRecordVersion: item.sourceRecordVersion,
            itemKind: item.itemKind,
            contractId: item.contractId,
            contractVersion: item.contractVersion,
            portableRecord: item.portableRecord,
            contentSha256: item.contentSha256,
            recordedAt: item.recordedAt.toISOString()
          })),
          packages: model.packages.map((item) => ({
            ...item,
            reviewedAt: item.reviewedAt?.toISOString() ?? null,
            createdAt: item.createdAt.toISOString()
          })),
          summary: model.summary,
          policy: model.policy
        }}
      />
    </main>
  );
}
