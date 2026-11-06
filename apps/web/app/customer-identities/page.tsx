import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listCustomerIdentityForUser } from "@/lib/customer-identity-database";

import { HelpInfo } from "../help/HelpInfo";
import { CustomerIdentityConsole } from "./CustomerIdentityConsole";

export const dynamic = "force-dynamic";

export default async function CustomerIdentityPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="integration-delivery" />
          <p className="eyebrow">Build 294</p>
          <h1>
            Shared Customer &amp; Contact Identity Resolution
          </h1>
          <p className="lead">
            Sign in to review evidence-backed customer identity
            candidates across authorized Rosevear applications.
          </p>
          <Link
            className="primaryLink"
            href="/sign-in?callbackUrl=/customer-identities"
          >
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const model = await listCustomerIdentityForUser(
    session.user.id
  );

  return (
    <main className="shell opsCommandScreen opsCommandScreen--it">
      <section className="hero">
        <HelpInfo topic="integration-delivery" />
        <p className="eyebrow">
          Build 294 · evidence-backed identity review
        </p>
        <h1>
          Shared Customer &amp; Contact Identity Resolution
        </h1>
        <p className="lead">
          Fingerprint authorized source contact evidence, propose
          exact cross-application matches and require owner/admin
          review before records are linked into a shared identity.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/data-contracts">
            Customer contract
          </Link>
          <Link className="secondaryButton" href="/app-connections">
            Application identity
          </Link>
          <Link className="secondaryButton" href="/delivery-guarantees">
            Delivery guarantees
          </Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 294 privacy and authorization boundary</strong>
        <p>
          Raw email, phone, name and postal values are normalized
          only long enough to produce SHA-256 evidence fingerprints;
          the raw values are not persisted. Matching is exact,
          tenant scoped and cross-application only. No candidate is
          merged automatically, no external records are changed and
          QL-266 remains disconnected.
        </p>
      </section>

      <CustomerIdentityConsole
        model={{
          workspaces: model.workspaces.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            role: workspace.role
          })),
          observations: model.observations.map((item) => ({
            observationId: item.observationId,
            workspaceId: item.workspaceId,
            sourceApplicationId: item.sourceApplicationId,
            canonicalTenantKey: item.canonicalTenantKey,
            sourceRecordId: item.sourceRecordId,
            sourceRecordVersion: item.sourceRecordVersion,
            evidenceSha256: item.evidenceSha256,
            evidenceFields: [
              item.emailSha256 ? "email" : null,
              item.phoneSha256 ? "phone" : null,
              item.nameSha256 ? "name" : null,
              item.postalSha256 ? "postal" : null
            ].filter((value): value is string => Boolean(value)),
            observedAt: item.observedAt.toISOString()
          })),
          candidates: model.candidates.map((item) => ({
            ...item,
            decidedAt: item.decidedAt?.toISOString() ?? null,
            createdAt: item.createdAt.toISOString()
          })),
          groups: model.groups.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString()
          })),
          summary: model.summary,
          policy: model.policy
        }}
      />
    </main>
  );
}
