"use client";

import { useState } from "react";

type Metric = {
  key: string;
  label: string;
  value: number | null;
  unit: "ms" | "percent" | "count";
  sampleCount: number;
  measured: boolean;
};

type Budget = {
  metricKey: string;
  warningThreshold: number;
  criticalThreshold: number;
  status: "healthy" | "warning" | "critical" | "unmeasured";
};

type Regression = {
  metricKey: string;
  baselineValue: number | null;
  currentValue: number | null;
  allowedIncrease: number | null;
  regressed: boolean;
  comparable: boolean;
};

type Gap = {
  key: string;
  state: string;
  plannedBuild: number;
  note: string;
};

type LiveModel = {
  overallState: "healthy" | "attention" | "critical";
  baselineEstablished: boolean;
  metrics: Metric[];
  budgetResults: Budget[];
  regressions: Regression[];
  instrumentationGaps: Gap[];
  policy: {
    measuredEvidenceOnly: true;
    missingEvidenceIsHealthy: false;
    syntheticEvidenceCountsAsProduction: false;
    automaticOptimization: false;
    automaticBudgetChanges: false;
    automaticReleaseBlocking: false;
  };
};

type Snapshot = {
  snapshotId: string;
  overallState: "healthy" | "attention" | "critical";
  databaseProbeMs: number;
  connectorP95Ms: number | null;
  connectorErrorRatePct: number | null;
  webhookDeniedRatePct: number | null;
  deliveryFailures24h: number;
  generatedAt: string;
};

type Model = {
  canManage: boolean;
  live: LiveModel;
  snapshots: Snapshot[];
  latestSnapshot: Snapshot | null;
};

function valueText(metric: Metric) {
  if (metric.value === null) return "Not measured";
  if (metric.unit === "percent") return metric.value.toFixed(2) + "%";
  if (metric.unit === "ms") return metric.value.toFixed(1) + " ms";
  return String(metric.value);
}

export function PerformanceBaselineConsole({
  initialModel
}: {
  initialModel: Model;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function capture() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/performance-baseline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "capture-performance-baseline"
        })
      });
      const value = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof value.error === "string"
            ? value.error
            : "Unable to capture performance baseline."
        );
      }

      const next = await fetch("/api/performance-baseline", {
        cache: "no-store"
      });
      if (!next.ok) {
        throw new Error(
          "Evidence was captured but the refreshed baseline could not be loaded."
        );
      }
      setModel(await next.json());
      setMessage(
        "Production performance evidence captured. No optimization, budget change or release block was triggered automatically."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to capture performance baseline."
      );
    } finally {
      setBusy(false);
    }
  }

  const budgets = new Map(
    model.live.budgetResults.map(item => [item.metricKey, item])
  );
  const regressions = new Map(
    model.live.regressions.map(item => [item.metricKey, item])
  );

  return (
    <div className="reviewGrid">
      {message ? (
        <section className="dataQualityPolicyNote">
          <strong>Capture status</strong>
          <p>{message}</p>
        </section>
      ) : null}

      <section className="reviewCard">
        <p className="eyebrow">Production baseline</p>
        <h2>Current state: {model.live.overallState}</h2>
        <p>
          Prior baseline available:{" "}
          <strong>{model.live.baselineEstablished ? "Yes" : "No"}</strong>.
          The first capture establishes comparison evidence; it is not treated
          as proof that every performance area is healthy.
        </p>
        <button
          type="button"
          disabled={busy || !model.canManage}
          onClick={capture}
        >
          {busy ? "Capturing evidence…" : "Capture performance baseline"}
        </button>
        {!model.canManage ? (
          <p>Owner/admin access is required to record a snapshot.</p>
        ) : null}
      </section>

      {model.live.metrics.map(metric => {
        const budget = budgets.get(metric.key);
        const regression = regressions.get(metric.key);
        return (
          <section className="reviewCard" key={metric.key}>
            <p className="eyebrow">
              {budget?.status ?? "unmeasured"} · {metric.sampleCount} sample(s)
            </p>
            <h2>{metric.label}</h2>
            <p>
              Current: <strong>{valueText(metric)}</strong>
            </p>
            <p>
              SLO warning: {budget?.warningThreshold ?? "—"} · critical:{" "}
              {budget?.criticalThreshold ?? "—"}
              {metric.unit === "percent"
                ? "%"
                : metric.unit === "ms"
                  ? " ms"
                  : ""}
            </p>
            <p>
              Regression:{" "}
              <strong>
                {!regression?.comparable
                  ? "No comparable baseline yet"
                  : regression.regressed
                    ? "Budget exceeded"
                    : "Within budget"}
              </strong>
            </p>
          </section>
        );
      })}

      <section className="reviewCard">
        <p className="eyebrow">Instrumentation truth</p>
        <h2>Known measurement gaps</h2>
        {model.live.instrumentationGaps.map(gap => (
          <p key={gap.key}>
            <strong>{gap.key}</strong> · planned Build {gap.plannedBuild}
            <br />
            {gap.note}
          </p>
        ))}
      </section>

      <section className="reviewCard">
        <p className="eyebrow">Safety boundary</p>
        <h2>Observation does not equal automation</h2>
        <p>
          Build 331 does not change SLOs automatically, optimize production,
          block a release automatically, resume QL-266 or treat synthetic
          evidence as live production evidence.
        </p>
      </section>

      <section className="reviewCard">
        <p className="eyebrow">Append-only history</p>
        <h2>{model.snapshots.length} saved snapshot(s)</h2>
        {model.snapshots.slice(0, 10).map(snapshot => (
          <p key={snapshot.snapshotId}>
            <strong>{snapshot.overallState}</strong> · DB{" "}
            {snapshot.databaseProbeMs.toFixed(1)} ms · connector P95{" "}
            {snapshot.connectorP95Ms === null
              ? "not measured"
              : snapshot.connectorP95Ms.toFixed(1) + " ms"}{" "}
            · {new Date(snapshot.generatedAt).toLocaleString()}
          </p>
        ))}
      </section>
    </div>
  );
}
