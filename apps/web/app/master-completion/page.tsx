import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listMasterCompletionForUser } from "@/lib/master-completion-database";

import { CompletionConsole } from "./CompletionConsole";

export const dynamic = "force-dynamic";

function percent(value: number | null) {
  return value === null ? "UNAVAILABLE" : value.toFixed(2) + "%";
}

export default async function MasterCompletionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fmaster-completion");
  }

  const model = await listMasterCompletionForUser(session.user.id);

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 338 · Master Shell · evidence-backed completion
        </p>
        <h1>Master Completion Requirements &amp; Evidence Axes</h1>
        <p className="lead">
          Define stable requirements, explicitly approve what belongs in each
          denominator, and score design, implementation, automated testing,
          integration verification, security, accessibility/device acceptance
          and production/user acceptance independently.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/master-shell-ingestion">
            Source Ingestion
          </Link>
          <Link className="secondaryButton" href="/master-shell-registry">
            Source Registry
          </Link>
          <a className="secondaryButton" href="/api/master-completion">
            Completion JSON
          </a>
          <Link
            className="secondaryButton"
            href="/master-application-inventory"
          >
            Application Inventory
          </Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Missing evidence is not 0%.</strong>
        <p>
          Completion remains unavailable while an approved denominator contains
          UNKNOWN or STALE required evidence. Evidence coverage is shown
          separately so we can see how much of the denominator is currently
          supported without pretending that missing evidence failed or passed.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Registry state</p>
            <h2>Master Completion foundation</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          <article className="reviewBatchSummary">
            <p>
              Requirements <strong>{model.summary.requirements}</strong> ·
              required <strong>{model.summary.required}</strong> ·
              not applicable <strong>{model.summary.notApplicable}</strong> ·
              unscoped <strong>{model.summary.unscoped}</strong> · approved
              scopes <strong>{model.summary.approvedScopes}</strong>
            </p>
            <p>
              Calculable completion scopes{" "}
              <strong>
                {model.summary.scopesWithCalculableCompletion}
              </strong>{" "}
              · blocked by UNKNOWN/STALE{" "}
              <strong>
                {model.summary.scopesBlockedByUnknownOrStale}
              </strong>
            </p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Approved scopes</p>
            <h2>Evidence-backed scoring</h2>
          </div>
        </div>
        {model.scores.length ? (
          <div className="reviewBatchList">
            {model.scores.map((score) => (
              <article
                className="reviewBatchSummary"
                key={score.approvalId}
              >
                <span className="reviewStatus">
                  {score.scopeKey} · denominator v{score.scopeVersion}
                </span>
                <h3>
                  Completion {percent(score.completion.percent)} · coverage{" "}
                  {percent(score.evidenceCoverage.percent)}
                </h3>
                <p>
                  Completion numerator{" "}
                  <strong>{score.completion.numerator}</strong> / denominator{" "}
                  <strong>{score.completion.denominator}</strong> · weighted{" "}
                  <strong>{percent(score.weightedCompletion.percent)}</strong>
                </p>
                <p>
                  SATISFIED <strong>{score.counts.satisfied}</strong> · PARTIAL{" "}
                  <strong>{score.counts.partial}</strong> · FAILED{" "}
                  <strong>{score.counts.failed}</strong> · UNKNOWN{" "}
                  <strong>{score.counts.unknown}</strong> · STALE{" "}
                  <strong>{score.counts.stale}</strong>
                </p>
                <p>
                  Scope date <strong>{score.scopeDate}</strong> · branch{" "}
                  <code>{score.branch}</code> · commit{" "}
                  <code>{score.commitSha}</code>
                </p>
                <p>
                  Evidence references{" "}
                  <strong>
                    {score.completion.evidenceReferences.length}
                  </strong>{" "}
                  · reviewers{" "}
                  <strong>{score.completion.reviewers.join(", ") || "none"}</strong>{" "}
                  · minimum confidence{" "}
                  <strong>
                    {score.completion.confidence.minimum ?? "UNMEASURED"}
                  </strong>{" "}
                  · average confidence{" "}
                  <strong>
                    {score.completion.confidence.average ?? "UNMEASURED"}
                  </strong>
                </p>
                <p>
                  Denominator hash <code>{score.denominatorHash}</code>
                </p>

                <div className="reviewBatchList">
                  {score.axes.map((axis) => (
                    <div className="reviewBatchSummary" key={axis.axis}>
                      <strong>{axis.axis}</strong>:{" "}
                      {percent(axis.score.percent)} ·{" "}
                      {axis.score.numerator}/{axis.score.denominator} satisfied ·
                      UNKNOWN {axis.states.unknown} · STALE {axis.states.stale}
                    </div>
                  ))}
                </div>

                <div className="reviewBatchList">
                  {score.requirements.map((requirement) => (
                    <div
                      className="reviewBatchSummary"
                      key={
                        requirement.requirementId +
                        ":" +
                        requirement.revisionNumber
                      }
                    >
                      <span className="reviewStatus">
                        {requirement.state} · rev{" "}
                        {requirement.revisionNumber}
                      </span>
                      <strong>{requirement.title}</strong>
                      <p>
                        <code>{requirement.requirementId}</code> · weight{" "}
                        {requirement.weight} · critical{" "}
                        {requirement.critical ? "yes" : "no"}
                      </p>
                      <p>
                        {requirement.axes
                          .map(
                            (axis) =>
                              axis.axis + "=" + axis.state
                          )
                          .join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            No approved denominator exists yet. Requirements can be registered
            without inventing a completion percentage.
          </div>
        )}
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Latest requirement revisions</p>
            <h2>Stable requirement registry</h2>
          </div>
        </div>
        {model.requirements.length ? (
          <div className="reviewBatchList">
            {model.requirements.map((requirement) => (
              <article
                className="reviewBatchSummary"
                key={requirement.requirementId}
              >
                <span className="reviewStatus">
                  {requirement.applicability} · revision{" "}
                  {requirement.revisionNumber}
                </span>
                <h3>{requirement.title}</h3>
                <p>
                  <code>{requirement.requirementId}</code> ·{" "}
                  <code>{requirement.sourceId}</code>
                  {requirement.moduleId
                    ? " · " + requirement.moduleId
                    : " · source-wide"}
                </p>
                <p>{requirement.description}</p>
                <p>
                  Required axes:{" "}
                  {requirement.requiredAxes.join(", ") || "none"}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            No Master Completion requirements have been registered yet.
          </div>
        )}
      </section>

      <CompletionConsole requirements={model.requirements} />
    </main>
  );
}
