import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSchemaDriftAssistantForUser } from "@/lib/schema-drift-database";

import { SchemaDriftRepairAssistant } from "./SchemaDriftRepairAssistant";

export const dynamic = "force-dynamic";

export default async function SchemaDriftPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fschema-drift");

  const model = await listSchemaDriftAssistantForUser(session.user.id);

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 288 · Pre-delivery mapping integrity</p>
        <h1>Schema Drift Detection &amp; Mapping Repair Assistant</h1>
        <p className="lead">
          Compare reviewed mappings against current source schema descriptors and
          canonical contract fingerprints, identify affected mappings, and prepare
          bounded repair drafts before any later cross-app delivery.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/field-mappings">
            Visual Field Mapping Studio
          </Link>
          <Link className="secondaryButton" href="/data-contracts">
            Canonical Contracts
          </Link>
          <Link className="secondaryButton" href="/connection-validation">
            Connection Validation
          </Link>
          <a className="secondaryButton" href="/api/schema-drift">
            Drift Assistant JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Drift repair never auto-approves a mapping.</strong>
        <p>
          Build 288 stores schema descriptors, fingerprints, drift evidence and
          repair proposals only. Deterministic suggestions may be applied to a
          mapping draft, but the mapping must be reviewed again in Build 287.
          QL-266 remains UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED and no live
          exchange is activated.
        </p>
      </section>

      <SchemaDriftRepairAssistant model={model} />
    </main>
  );
}
