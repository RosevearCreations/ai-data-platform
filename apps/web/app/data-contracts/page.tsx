import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { buildCrossAppDataContractRegistry } from "@/lib/cross-app-data-contract-registry";

import { DataContractCompatibilityChecker } from "./DataContractCompatibilityChecker";

export const dynamic = "force-dynamic";

export default async function DataContractsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fdata-contracts");

  const registry = buildCrossAppDataContractRegistry();

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 286 · Shared cross-app schemas</p>
        <h1>Cross-App Data Contract Registry</h1>
        <p className="lead">
          Define one reusable, versioned vocabulary for customers, products,
          services, bookings, jobs, staff, equipment, invoices, media, inventory
          and notifications before applications exchange records.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/app-connections">
            App Connection Registry
          </Link>
          <Link className="secondaryButton" href="/field-mappings">
            Visual Field Mapping Studio
          </Link>
          <Link className="secondaryButton" href="/connection-validation">
            Automatic Connection Validation
          </Link>
          <Link className="secondaryButton" href="/integration-simulator">
            Integration Simulator
          </Link>
          <a className="secondaryButton" href="/api/data-contracts">
            Registry JSON
          </a>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Cross-app data contract summary">
        <div className="commandMetrics">
          <article>
            <strong>{registry.summary.sharedContracts}</strong>
            <span>shared contract kinds</span>
          </article>
          <article>
            <strong>{registry.summary.peerApplications}</strong>
            <span>registered peer applications</span>
          </article>
          <article>
            <strong>{registry.summary.activeVersions}</strong>
            <span>active contract versions</span>
          </article>
          <article>
            <strong>{registry.summary.existingBusinessContractsPreserved}</strong>
            <span>existing delivery contracts preserved</span>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Registry availability is not implementation evidence.</strong>
        <p>
          All six peer apps may reference these shared schemas, but Build 286 does
          not claim that an app has implemented a contract, does not map fields,
          does not activate a connection and does not authorize live exchange.
          Unknown contracts and unknown fields fail closed. Build 287 can persist
          reviewed mapping profiles against these fingerprints, but no mapping
          activates a connection. QL-266 remains UNDER_REVIEW / REVIEW_DEFERRED /
          DISCONNECTED.
        </p>
      </section>

      <DataContractCompatibilityChecker
        contracts={registry.contracts.map((contract) => ({
          contractId: contract.contractId,
          title: contract.title,
          version: contract.version,
          schemaId: contract.schemaId,
          schemaFingerprint: contract.schemaFingerprint
        }))}
        applications={registry.peerApplications.map((application) => ({
          applicationId: application.applicationId,
          displayName: application.displayName
        }))}
      />

      <section className="reviewQueue" aria-labelledby="shared-contracts-title">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Canonical v1 contracts</p>
            <h2 id="shared-contracts-title">Reusable record vocabulary</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {registry.contracts.map((contract) => {
            const required = contract.fields.filter((field) => field.required);
            return (
              <article className="reviewBatchSummary" key={contract.contractId}>
                <div>
                  <span className="reviewStatus">v{contract.version}</span>
                  <h3>{contract.title}</h3>
                  <p>{contract.description}</p>
                  <p>
                    <strong>Contract:</strong> {contract.contractId}
                  </p>
                  <p>
                    <strong>Schema:</strong> {contract.schemaId}
                  </p>
                  <p>
                    <strong>Fingerprint:</strong>{" "}
                    <code>{contract.schemaFingerprint}</code>
                  </p>
                  <p>
                    <strong>Compatibility:</strong>{" "}
                    {contract.compatibilityPolicy} · additional fields fail closed
                  </p>
                  <p>
                    <strong>Required:</strong>{" "}
                    {required.map((field) => field.key).join(", ")}
                  </p>
                  <details>
                    <summary>
                      {contract.fields.length} field definitions
                    </summary>
                    <div className="reviewBatchList">
                      {contract.fields.map((field) => (
                        <div className="dataQualityPolicyNote" key={field.key}>
                          <strong>
                            {field.key} · {field.type}
                            {field.required ? " · required" : ""}
                          </strong>
                          <p>{field.description}</p>
                          {field.enumValues ? (
                            <p>Allowed: {field.enumValues.join(", ")}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </details>
                  <div className="heroActions">
                    <a
                      className="secondaryButton"
                      href={
                        "/api/data-contracts?contractId=" +
                        encodeURIComponent(contract.contractId)
                      }
                    >
                      JSON Schema
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="reviewQueue" aria-labelledby="existing-contracts-title">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Existing delivery contracts</p>
            <h2 id="existing-contracts-title">Preserved separately</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {registry.existingBusinessContracts.map((contract) => (
            <article className="reviewBatchSummary" key={contract.adapterContract}>
              <div>
                <span className="reviewStatus">{contract.relationship}</span>
                <h3>{contract.adapterContract}</h3>
                <p>
                  Target: {contract.targetApplicationId} · source: {contract.source}
                </p>
                <p>{contract.schemaId}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
