import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  listRoleDeviceAcceptanceForUser
} from "@/lib/role-device-acceptance-database";

import { RoleDeviceAcceptanceRecorder } from "./RoleDeviceAcceptanceRecorder";

export const dynamic = "force-dynamic";

function stateClass(value: string) {
  return value.toLowerCase().replaceAll("_", "-");
}

function pct(value: number | null) {
  return value === null ? "UNAVAILABLE" : value.toFixed(2) + "%";
}

export default async function RoleDeviceAcceptancePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Frole-device-acceptance");
  }

  const model = await listRoleDeviceAcceptanceForUser(session.user.id);
  const applications = model.scopes
    .filter((scope) => scope.moduleId === null)
    .map((scope) => ({
      sourceId: scope.sourceId,
      displayName: scope.displayName,
      modules: model.scopes
        .filter(
          (candidate) =>
            candidate.sourceId === scope.sourceId &&
            candidate.moduleId !== null
        )
        .map((candidate) => candidate.moduleId as string)
    }));

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 345 · Rosevear Suite Master Shell</p>
        <h1>Role / Device Acceptance Matrix</h1>
        <p className="lead">
          Track evidence-backed Customer, Worker and Admin acceptance across
          Mobile, Tablet and Desktop. Implementation, automated tests,
          deployment GREEN and source readiness remain separate evidence.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/master-completion">
            Master Completion
          </Link>
          <Link className="secondaryButton" href="/module-health-intelligence">
            Module Health
          </Link>
          <Link className="secondaryButton" href="/master-shell-command-center">
            Master Command Center
          </Link>
          <a className="secondaryButton" href="/api/role-device-acceptance">
            Acceptance JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Nine independent acceptance cells per scope.</strong>
        <p>
          Every application and discovered module has Customer/Worker/Admin ×
          Mobile/Tablet/Desktop cells. Missing evidence is UNKNOWN; expired
          evidence is STALE. Neither state is treated as acceptance.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Suite summary</p>
            <h2>Acceptance evidence coverage</h2>
          </div>
        </div>
        <article className="reviewBatchSummary">
          <p>
            Applications <strong>{model.summary.applications}</strong> · scopes{" "}
            <strong>{model.summary.scopes}</strong> · cells{" "}
            <strong>{model.summary.cells}</strong>
          </p>
          <p>
            ACCEPTED <strong>{model.summary.accepted}</strong> · PARTIAL{" "}
            <strong>{model.summary.partial}</strong> · FAILED{" "}
            <strong>{model.summary.failed}</strong> · STALE{" "}
            <strong>{model.summary.stale}</strong> · UNKNOWN{" "}
            <strong>{model.summary.unknown}</strong>
          </p>
        </article>
      </section>

      <RoleDeviceAcceptanceRecorder applications={applications} />

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Acceptance matrix</p>
            <h2>Application and module scopes</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.scopes.map((scope) => (
            <article className="reviewBatchSummary" key={scope.scopeKey}>
              <span
                className={
                  "reviewStatus reviewStatus--" +
                  stateClass(scope.overallState)
                }
              >
                {scope.overallState}
              </span>
              <h3>{scope.label}</h3>
              <p>
                Evidence coverage{" "}
                <strong>{pct(scope.summary.evidenceCoveragePercent)}</strong> ·
                accepted percent{" "}
                <strong>{pct(scope.summary.acceptedPercent)}</strong>
              </p>
              <p>
                ACCEPTED <strong>{scope.summary.accepted}</strong> · PARTIAL{" "}
                <strong>{scope.summary.partial}</strong> · FAILED{" "}
                <strong>{scope.summary.failed}</strong> · STALE{" "}
                <strong>{scope.summary.stale}</strong> · UNKNOWN{" "}
                <strong>{scope.summary.unknown}</strong>
              </p>
              <div className="reviewBatchList">
                {scope.rows.map((row) => (
                  <div className="reviewBatchSummary" key={row.role}>
                    <h4>{row.role.toUpperCase()}</h4>
                    {row.cells.map((cell) => (
                      <p key={cell.device}>
                        <strong>{cell.device.toUpperCase()}</strong> ·{" "}
                        {cell.effectiveState}
                        {cell.reviewer ? " · reviewer " + cell.reviewer : ""}
                        {cell.confidence !== null
                          ? " · confidence " + cell.confidence
                          : ""}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Acceptance remains independent evidence.</strong>
        <p>
          Build 345 does not infer acceptance from implementation, automated
          tests, source readiness, catalogue presence or deployment GREEN. It
          performs no source mutation, peer write or external device probe.
        </p>
      </section>
    </main>
  );
}
