"use client";

import { useState } from "react";

import type {
  AutomaticConnectionTestBatch,
  ConnectionValidationModel
} from "@/lib/connection-validation-contract";

export function AutomaticConnectionValidation({
  initialModel
}: {
  initialModel: ConnectionValidationModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [batch, setBatch] = useState<AutomaticConnectionTestBatch | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  async function runAutomaticTests() {
    setRunning(true);
    setMessage("");
    try {
      const response = await fetch("/api/connection-validation", {
        method: "POST"
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Automatic connection testing failed.");
      }
      setBatch(payload.batch);
      setModel(payload.validation);
      setMessage(
        "Automatic bounded tests completed. " +
          payload.batch.succeeded +
          " succeeded, " +
          payload.batch.failed +
          " failed."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Automatic connection testing failed."
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <section className="reviewSummary" aria-label="Connection validation summary">
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.connectors}</strong>
            <span>configured connectors</span>
          </article>
          <article>
            <strong>{model.summary.eligible}</strong>
            <span>automatic-test eligible</span>
          </article>
          <article>
            <strong>{model.summary.blocked}</strong>
            <span>blocked</span>
          </article>
          <article>
            <strong>{model.summary.manualReview}</strong>
            <span>manual review</span>
          </article>
        </div>
      </section>

      <section className="reviewEditor" aria-labelledby="automatic-test-runner">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Safe automatic execution</p>
            <h2 id="automatic-test-runner">Run all eligible bounded tests</h2>
          </div>
        </div>
        <p>
          Only enabled, registered connectors with valid configuration, supported
          grants, acceptable destination policy and a non-export capability are
          eligible. Automatic testing never performs generic URL probing.
        </p>
        <div className="heroActions">
          <button
            type="button"
            className="primary"
            disabled={running || model.summary.eligible === 0}
            onClick={() => void runAutomaticTests()}
          >
            {running ? "Running automatic tests…" : "Run automatic safe tests"}
          </button>
        </div>
        <small>
          Maximum 12 connector executions per batch. Export-only connectors stay in
          manual provider-safe review.
        </small>
      </section>

      {message ? (
        <p className="dataQualityPolicyNote" role="status">
          {message}
        </p>
      ) : null}

      {batch ? (
        <section className="reviewQueue" aria-labelledby="latest-batch">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Latest automatic batch</p>
              <h2 id="latest-batch">
                {batch.succeeded} succeeded · {batch.failed} failed
              </h2>
            </div>
          </div>
          <p>
            Attempted {batch.attempted} · safety-cap skipped{" "}
            {batch.skippedBySafetyCap} · limit {batch.maxAutomaticTests}
          </p>
          <div className="reviewBatchList">
            {batch.results.map((result) => (
              <article
                className="reviewBatchSummary"
                key={
                  result.workspaceId +
                  ":" +
                  result.connectorKey +
                  ":" +
                  result.capability
                }
              >
                <div>
                  <span className="reviewStatus">{result.status}</span>
                  <h3>{result.connectorKey}</h3>
                  <p>
                    Capability {result.capability} · duration{" "}
                    {result.durationMs ?? 0} ms
                  </p>
                  {result.errorCode ? (
                    <p>
                      <strong>Error:</strong> {result.errorCode}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="reviewQueue" aria-labelledby="validation-inventory">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 285 validation inventory</p>
            <h2 id="validation-inventory">
              Configuration, credentials, destinations &amp; permissions
            </h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.items.map((item) => (
            <article
              className="reviewBatchSummary"
              key={item.workspaceId + ":" + item.connectorKey}
            >
              <div>
                <span className="reviewStatus">
                  {item.automaticTestEligibility}
                </span>
                <h3>{item.displayName}</h3>
                <p>
                  {item.workspaceName} · {item.connectorKey} · {item.environment}
                </p>
                <p>
                  <strong>Application:</strong>{" "}
                  {item.applicationId ?? "workspace not mapped to peer app"} ·{" "}
                  <strong>Enabled:</strong> {item.enabled ? "yes" : "no"}
                </p>
                <p>
                  <strong>Test capability:</strong>{" "}
                  {item.testCapability ?? "none"}
                </p>
                <div className="reviewBatchList">
                  {item.checks.map((check) => (
                    <div className="dataQualityPolicyNote" key={check.id}>
                      <strong>
                        {check.label} — {check.state}
                      </strong>
                      <p>{check.detail}</p>
                      <p>
                        <strong>Recovery:</strong> {check.recovery}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
          {!model.items.length ? (
            <div className="emptyState">
              No workspace connectors are configured yet. Build 285 will validate
              connectors automatically once they are registered and configured.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
