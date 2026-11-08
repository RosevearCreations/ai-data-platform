import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listFieldMappingStudioForUser } from "@/lib/field-mapping-database";

import { FieldMappingStudio } from "./FieldMappingStudio";

export const dynamic = "force-dynamic";

export default async function FieldMappingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Ffield-mappings");

  const model = await listFieldMappingStudioForUser(session.user.id);

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 287 · Reviewed canonical mapping profiles</p>
        <h1>Visual Field Mapping Studio</h1>
        <p className="lead">
          Visually map field paths from each Rosevear application into the
          canonical Build 286 contracts, review required-field coverage and
          persist versioned mapping profiles with append-only evidence.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/data-contracts">
            Cross-App Data Contracts
          </Link>
          <Link className="secondaryButton" href="/app-connections">
            App Connection Registry
          </Link>
          <Link className="secondaryButton" href="/schema-drift">
            Schema Drift &amp; Repair
          </Link>
          <Link className="secondaryButton" href="/connection-validation">
            Automatic Validation
          </Link>
          <a className="secondaryButton" href="/api/field-mappings">
            Mapping Studio JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Reviewed mapping is configuration evidence, not a live connection.</strong>
        <p>
          Build 287 persists source field paths, transforms, contract fingerprints,
          review state and audit evidence only. Build 288 now verifies source/canonical
          schema drift separately before later delivery. Neither surface copies source
          records, activates connectors, authorizes writes or resumes QL-266. The retired QL-266 review hold is historical only and no longer defines current connection readiness.
        </p>
      </section>

      <FieldMappingStudio model={model} />
    </main>
  );
}
