"use client";

import { useMemo, useState } from "react";

type Assertion = {
  assertionId: string;
  runId: string;
  applicationId: string;
  dimension:
    | "authentication"
    | "approved-exchange"
    | "event-handling"
    | "failure-recovery"
    | "tenant-isolation";
  outcome: "pass" | "fail" | "blocked";
  evidenceCode: string;
  evidenceRefs: string[];
  detail: string;
  checkedAt: string;
};

type Application = {
  applicationId: string;
  displayName: string;
  repository: string;
  canonicalTenantKey: string | null;
  workspaceBindingState: string;
  assertions: Assertion[];
};

type Run = {
  runId: string;
  suiteVersion: string;
  applicationsExpected: number;
  checksExpected: number;
  evidenceWindowDays: number;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  overallOutcome: "passed" | "failed" | "blocked";
  generatedAt: string;
};

type Model = {
  evidenceWindowDays: number;
  applications: Application[];
  runs: Run[];
  latestRun: Run | null;
  latestAssertions: Assertion[];
  policy: Record<string, boolean>;
};

const DIMENSIONS = [
  ["authentication", "Authentication"],
  ["approved-exchange", "Approved exchange"],
  ["event-handling", "Event handling"],
  ["failure-recovery", "Failure recovery"],
  ["tenant-isolation", "Tenant isolation"]
] as const;

export function IntegrationCertificationConsole({ model }: { model: Model }) {
  const [current, setCurrent] = useState(model);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const latestByApp = useMemo(() => {
    const map = new Map<string, Assertion[]>();
    for (const assertion of current.latestAssertions) {
      const rows = map.get(assertion.applicationId) ?? [];
      rows.push(assertion);
      map.set(assertion.applicationId, rows);
    }
    return map;
  }, [current.latestAssertions]);

  async function refresh() {
    const response = await fetch("/api/integration-certification", {
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Unable to refresh certification state.");
    setCurrent(await response.json());
  }

  async function runCertification() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/integration-certification", {
        method: "POST"
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Certification run failed."
        );
      }
      setMessage(
        `Certification recorded: ${payload.passed} PASS, ${payload.failed} FAIL, ${payload.blocked} BLOCKED.`
      );
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Certification run failed."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {message ? (
        <p className="barcodeMessage" role="status">
          {message}
        </p>
      ) : null}

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Latest certification standing</p>
            <h2>Six applications · thirty evidence checks</h2>
          </div>
          <button
            className="primaryButton"
            disabled={busy}
            onClick={runCertification}
          >
            {busy ? "Certifying…" : "Run certification suite"}
          </button>
        </div>

        <div className="commandMetrics">
          <article>
            <strong>{current.latestRun?.passedCount ?? 0}</strong>
            <span>PASS</span>
          </article>
          <article>
            <strong>{current.latestRun?.failedCount ?? 0}</strong>
            <span>FAIL</span>
          </article>
          <article>
            <strong>{current.latestRun?.blockedCount ?? 30}</strong>
            <span>BLOCKED / not proven</span>
          </article>
          <article>
            <strong>{current.latestRun?.overallOutcome ?? "not-run"}</strong>
            <span>overall outcome</span>
          </article>
        </div>

        <p>
          Evidence window: <strong>{current.evidenceWindowDays} days</strong>.
          Missing evidence is BLOCKED, not silently treated as PASS.
        </p>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Per-application matrix</p>
            <h2>Authentication → isolation</h2>
          </div>
        </div>

        <div className="grid">
          {current.applications.map(application => {
            const assertions =
              latestByApp.get(application.applicationId) ??
              application.assertions ??
              [];
            return (
              <article className="card" key={application.applicationId}>
                <p className="eyebrow">{application.applicationId}</p>
                <h3>{application.displayName}</h3>
                <p>
                  Workspace binding:{" "}
                  <strong>{application.workspaceBindingState}</strong>
                </p>
                <p>
                  Canonical tenant:{" "}
                  <code>{application.canonicalTenantKey ?? "not registered"}</code>
                </p>
                <div className="reviewBatchList">
                  {DIMENSIONS.map(([dimension, label]) => {
                    const assertion = assertions.find(
                      item => item.dimension === dimension
                    );
                    return (
                      <div className="reviewBatchRow" key={dimension}>
                        <strong>{label}</strong>
                        <span>
                          {assertion?.outcome.toUpperCase() ?? "NOT RUN"}
                        </span>
                        <p>
                          {assertion?.detail ??
                            "Run the certification suite to evaluate current evidence."}
                        </p>
                        {assertion?.evidenceRefs.length ? (
                          <small>
                            Evidence IDs:{" "}
                            {assertion.evidenceRefs.slice(0, 5).join(", ")}
                          </small>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 304 certification boundary</strong>
        <p>
          A PASS records observed evidence only. It does not mean a production
          connection was activated. This suite never changes credentials,
          enables connectors, releases held workflow actions, replays a dead
          letter, writes to a peer application, or resumes QL-266.
        </p>
      </section>
    </>
  );
}
