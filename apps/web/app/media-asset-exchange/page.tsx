import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listSharedMediaExchangeForUser } from "@/lib/media-asset-exchange-database";

import { HelpInfo } from "../help/HelpInfo";
import { MediaAssetExchangeConsole } from "./MediaAssetExchangeConsole";

export const dynamic = "force-dynamic";

export default async function MediaAssetExchangePage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="integration-delivery" />
          <p className="eyebrow">Build 296</p>
          <h1>Shared Media &amp; Asset Exchange</h1>
          <p className="lead">
            Sign in to register safe media references, deduplicate
            shared assets and review held exchange packages.
          </p>
          <Link
            className="primaryLink"
            href="/sign-in?callbackUrl=/media-asset-exchange"
          >
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const model = await listSharedMediaExchangeForUser(
    session.user.id
  );

  return (
    <main className="shell opsCommandScreen opsCommandScreen--it">
      <section className="hero">
        <HelpInfo topic="integration-delivery" />
        <p className="eyebrow">
          Build 296 · reference-first media exchange
        </p>
        <h1>Shared Media &amp; Asset Exchange</h1>
        <p className="lead">
          Standardize photos, documents, receipts, generated media,
          video and audio as Build 286 media references without
          unnecessary duplicate uploads.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/data-contracts">
            Shared contracts
          </Link>
          <Link className="secondaryButton" href="/catalogue-exchange">
            Catalogue exchange
          </Link>
          <Link className="secondaryButton" href="/delivery-guarantees">
            Delivery guarantees
          </Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 296 authorization boundary</strong>
        <p>
          Build 296 stores metadata and stable HTTPS references only.
          It does not fetch or upload binary files. Exchange packages
          remain <code>held</code> after owner/admin review, perform no
          peer-application write and do not resume QL-266.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 320 media host bridge</strong>
        <p>
          Build 296 references can now be exposed to host applications with
          checksum/deduplication evidence, ownership metadata, MIME/size policy,
          reference-only previews, controlled upload/download handoffs and
          retention/deletion evidence. The bridge never copies binary content itself.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/api/module-media-assets">
            View media host bridge descriptor
          </Link>
        </div>
      </section>

      <MediaAssetExchangeConsole
        model={{
          workspaces: model.workspaces.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            role: workspace.role
          })),
          assets: model.assets.map((asset) => ({
            ...asset,
            firstRecordedAt: asset.firstRecordedAt.toISOString()
          })),
          references: model.references.map((reference) => ({
            ...reference,
            recordedAt: reference.recordedAt.toISOString()
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
