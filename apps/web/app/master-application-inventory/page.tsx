import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  listMasterApplicationInventoryForUser
} from "@/lib/master-application-inventory-database";

export const dynamic = "force-dynamic";

function percent(value: number | null | undefined) {
  return value === null || value === undefined
    ? "UNAVAILABLE"
    : value.toFixed(2) + "%";
}

export default async function MasterApplicationInventoryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fmaster-application-inventory"
    );
  }

  const model =
    await listMasterApplicationInventoryForUser(session.user.id);

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 339 · Master Shell · read-only application inventory
        </p>
        <h1>Applications, Modules, Capabilities &amp; Readiness</h1>
        <p className="lead">
          Compose the exact six Rosevear source applications from existing
          registry, signed source-update, Master Completion and installed-module
          evidence. Catalogue presence, discovery capability, installed version
          and source-reported acceptance remain separate from suite acceptance.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/master-shell-registry">
            Source Registry
          </Link>
          <Link className="secondaryButton" href="/master-shell-ingestion">
            Source Ingestion
          </Link>
          <Link className="secondaryButton" href="/master-completion">
            Master Completion
          </Link>
          <a
            className="secondaryButton"
            href="/api/master-application-inventory"
          >
            Inventory JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Inventory is not acceptance.</strong>
        <p>
          A module can appear because it was source-reported, referenced by a
          completion requirement, given an approved completion scope or observed
          as an installed AI Data module. None of those facts by themselves
          prove functional, security, device or production/user acceptance.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Suite inventory summary</p>
            <h2>{model.summary.applications} exact source applications</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          <article className="reviewBatchSummary">
            <p>
              Modules <strong>{model.summary.modules}</strong> · registry fresh{" "}
              <strong>
                {model.summary.applicationsWithFreshRegistryEvidence}
              </strong>{" "}
              · registry stale{" "}
              <strong>
                {model.summary.applicationsWithStaleRegistryEvidence}
              </strong>{" "}
              · registry unmeasured{" "}
              <strong>
                {model.summary.applicationsWithUnmeasuredRegistryEvidence}
              </strong>
            </p>
            <p>
              Module readiness fresh{" "}
              <strong>{model.summary.modulesWithFreshSourceReadiness}</strong>{" "}
              · stale{" "}
              <strong>{model.summary.modulesWithStaleSourceReadiness}</strong>{" "}
              · unmeasured{" "}
              <strong>
                {model.summary.modulesWithUnmeasuredSourceReadiness}
              </strong>
            </p>
            <p>
              Approved completion scopes{" "}
              <strong>
                {model.summary.modulesWithApprovedCompletionScope}
              </strong>{" "}
              · calculable completion{" "}
              <strong>{model.summary.modulesWithCalculableCompletion}</strong>{" "}
              · unmapped host instances{" "}
              <strong>{model.summary.unmappedHostInstances}</strong>
            </p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Application inventory</p>
            <h2>Source identity and readiness evidence</h2>
          </div>
        </div>

        <div className="reviewBatchList">
          {model.applications.map((app) => (
            <article className="reviewBatchSummary" key={app.sourceId}>
              <span className="reviewStatus">
                {app.applicationState.effectiveStatus} ·{" "}
                {app.applicationState.freshness}
              </span>
              <h3>{app.displayName}</h3>
              <p>
                <code>{app.sourceId}</code> · shell{" "}
                <code>{app.shellId}</code> · repository{" "}
                <code>{app.repository}</code>
              </p>
              <p>
                Boundary: {app.shellBoundary} · tenancy{" "}
                <code>{app.tenancyModel}</code>
              </p>
              <p>
                Registry revision{" "}
                <code>
                  {app.versionEvidence.immutableRevision ?? "UNMEASURED"}
                </code>{" "}
                · capability version{" "}
                <code>
                  {app.versionEvidence.capabilityVersion ?? "UNMEASURED"}
                </code>
              </p>
              <p>
                Latest release{" "}
                <strong>
                  {app.versionEvidence.latestRelease
                    ? app.versionEvidence.latestRelease.releaseId +
                      " / " +
                      app.versionEvidence.latestRelease.deploymentStatus +
                      " / " +
                      app.versionEvidence.latestRelease.freshness
                    : "UNMEASURED"}
                </strong>
              </p>
              <p>
                Ownership roles{" "}
                <strong>
                  {app.ownership.rolesAllowed.join(", ") || "UNMEASURED"}
                </strong>{" "}
                · product owner{" "}
                <strong>{app.ownership.productOwner ?? "UNMEASURED"}</strong>
              </p>
              <p>
                Source-declared capabilities{" "}
                <strong>
                  {app.capabilities.sourceDeclaredCapabilities.length}
                </strong>{" "}
                · discovery-only capabilities{" "}
                <strong>{app.capabilities.discoveryCapabilities.length}</strong>
              </p>
              <p>
                Discovery state{" "}
                <strong>{app.capabilities.discoveryState}</strong> · discovery
                implies acceptance <strong>no</strong>
              </p>
              <p>
                Source-wide Master Completion{" "}
                <strong>
                  {app.masterCompletion
                    ? percent(app.masterCompletion.completion.percent)
                    : "UNSCOPED"}
                </strong>
              </p>
              <p>
                Modules <strong>{app.moduleSummary.modules}</strong> · fresh
                source readiness{" "}
                <strong>{app.moduleSummary.freshSourceReadiness}</strong> ·
                stale{" "}
                <strong>{app.moduleSummary.staleSourceReadiness}</strong> ·
                unmeasured{" "}
                <strong>{app.moduleSummary.unmeasuredSourceReadiness}</strong>
              </p>

              {app.modules.length ? (
                <div className="reviewBatchList">
                  {app.modules.map((module) => (
                    <div
                      className="reviewBatchSummary"
                      key={module.moduleId}
                    >
                      <span className="reviewStatus">
                        source{" "}
                        {module.sourceReportedReadiness.readinessState} ·{" "}
                        {module.sourceReportedReadiness.freshness} · completion
                        evidence {module.masterCompletion.evidenceState}
                      </span>
                      <strong>
                        <code>{module.moduleId}</code>
                      </strong>
                      <p>
                        Origins: {module.inventoryOrigins.join(", ")}
                      </p>
                      <p>
                        Source-reported completion{" "}
                        <strong>
                          {module.sourceReportedReadiness.completionPercent ??
                            "UNMEASURED"}
                        </strong>
                        % · suite completion{" "}
                        <strong>
                          {module.masterCompletion.completion
                            ? percent(
                                module.masterCompletion.completion.percent
                              )
                            : "UNSCOPED"}
                        </strong>
                      </p>
                      <p>
                        Requirement inventory{" "}
                        <strong>
                          {module.requirementInventory.requirements}
                        </strong>{" "}
                        · required{" "}
                        <strong>
                          {module.requirementInventory.required}
                        </strong>{" "}
                        · not applicable{" "}
                        <strong>
                          {module.requirementInventory.notApplicable}
                        </strong>{" "}
                        · unscoped{" "}
                        <strong>
                          {module.requirementInventory.unscoped}
                        </strong>
                      </p>
                      <p>
                        Source module version{" "}
                        <strong>
                          {module.versionEvidence.sourceModuleVersion ??
                            "UNMEASURED"}
                        </strong>{" "}
                        · installed AI Data module versions{" "}
                        <strong>
                          {module.versionEvidence
                            .installedAiDataModuleVersion.join(", ") ||
                            "none"}
                        </strong>
                      </p>
                      <p>
                        Module owner{" "}
                        <strong>
                          {module.ownership.productOwner ?? "UNMEASURED"}
                        </strong>{" "}
                        · catalogue presence implies acceptance{" "}
                        <strong>no</strong>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="emptyState">
                  No source-owned module, Master Completion module or installed
                  AI Data module evidence exists for this application yet.
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
