"use client";

import { useEffect, useMemo, useState } from "react";

const DIMENSIONS = [
  "authentication",
  "tenant",
  "capability",
  "event",
  "workflow",
  "data",
  "search",
  "recovery",
  "offline"
] as const;

type Dimension = (typeof DIMENSIONS)[number];
type Outcome = "pass" | "fail" | "blocked";
type EvidenceKind = "synthetic-fixture" | "live-evidence";

type Host = {
  moduleHostInstanceId: string;
  workspaceId: string;
  hostApplicationId: string;
  hostInstanceId: string;
  environment: string;
  currentVersion: string;
  lastKnownGoodVersion: string;
  lifecycleState: string;
  hostContractVersion: number;
  protocolVersion: number;
  adapterKind: "react" | "nextjs" | "vite" | "vanilla" | "electron";
  updatedAt: string;
};

type MatrixRow = {
  moduleHostInstanceId: string;
  hostApplicationId: string;
  hostInstanceId: string;
  environment: string;
  adapterKind: string;
  expectedModuleVersion: string;
  hostContractVersion: number;
  protocolVersion: number;
  compatibilityState: string;
  observedModuleVersion: string | null;
  versionMatch: boolean | null;
  hostContractMatch: boolean | null;
  protocolMatch: boolean | null;
  adapterMatch: boolean | null;
  healthState: string;
  certificationClass: string;
  regressionCount: number;
  generatedAt: string | null;
};

type Run = {
  runId: string;
  observationId: string;
  moduleHostInstanceId: string;
  workspaceId: string;
  evidenceKind: string;
  compatibilityState: string;
  healthState: string;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  overallOutcome: string;
  certificationClass: string;
  liveCertified: boolean;
  fixtureCertified: boolean;
  regressionCount: number;
  regressions: Array<{
    dimension?: string;
    previous?: string;
    current?: string;
    detail?: string;
  }>;
  certification: {
    telemetry?: {
      sampleCount?: number;
      latencyMsP95?: number | null;
      errorCount?: number;
      retryCount?: number;
    };
  };
  generatedAt: string;
};

type Model = {
  descriptor: {
    version: string;
    dimensions: string[];
    supportedAdapters: string[];
    policy: Record<string, boolean>;
  };
  hosts: Host[];
  compatibilityMatrix: MatrixRow[];
  runs: Run[];
  observations: unknown[];
  assertions: unknown[];
  summary: {
    hosts: number;
    liveCertified: number;
    fixtureCertified: number;
    hostsWithRegressions: number;
  };
};

type CheckDraft = {
  state: Outcome;
  evidenceRefs: string;
  detail: string;
};

function defaultChecks(): Record<Dimension, CheckDraft> {
  return {
    authentication: {
      state: "pass",
      evidenceRefs: "",
      detail: "Authentication behavior matched the expected host contract."
    },
    tenant: {
      state: "pass",
      evidenceRefs: "",
      detail: "Tenant and workspace isolation matched the registered host context."
    },
    capability: {
      state: "pass",
      evidenceRefs: "",
      detail: "Capability negotiation remained least privilege and owner scoped."
    },
    event: {
      state: "pass",
      evidenceRefs: "",
      detail: "Event publication and receipt correlation matched the expected contract."
    },
    workflow: {
      state: "pass",
      evidenceRefs: "",
      detail: "Workflow actions remained governed and independently authorized."
    },
    data: {
      state: "pass",
      evidenceRefs: "",
      detail: "Data contract and mapped exchange behavior matched the expected contract."
    },
    search: {
      state: "pass",
      evidenceRefs: "",
      detail: "Search remained read only, tenant scoped and source attributable."
    },
    recovery: {
      state: "pass",
      evidenceRefs: "",
      detail: "Safe recovery preserved hold, authorization and rollback boundaries."
    },
    offline: {
      state: "pass",
      evidenceRefs: "",
      detail: "Offline synchronization preserved idempotency and did not claim unverified success."
    }
  };
}

function refs(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function statusLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function CrossHostCertificationConsole({
  initialModel
}: {
  initialModel: Model;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [hostId, setHostId] = useState(
    initialModel.hosts[0]?.moduleHostInstanceId ?? ""
  );
  const selectedHost = useMemo(
    () =>
      model.hosts.find(
        (item) => item.moduleHostInstanceId === hostId
      ) ?? null,
    [model.hosts, hostId]
  );

  const [sourceKind, setSourceKind] =
    useState<EvidenceKind>("synthetic-fixture");
  const [observedModuleVersion, setObservedModuleVersion] =
    useState(selectedHost?.currentVersion ?? "1.0.0");
  const [hostContractVersion, setHostContractVersion] = useState(
    selectedHost?.hostContractVersion ?? 1
  );
  const [protocolVersion, setProtocolVersion] = useState(
    selectedHost?.protocolVersion ?? 1
  );
  const [adapterKind, setAdapterKind] = useState<
    Host["adapterKind"]
  >(selectedHost?.adapterKind ?? "nextjs");
  const [compatibilityRefs, setCompatibilityRefs] = useState("");
  const [checks, setChecks] =
    useState<Record<Dimension, CheckDraft>>(defaultChecks());
  const [sampleCount, setSampleCount] = useState(0);
  const [latencyMsP95, setLatencyMsP95] = useState("");
  const [errorCount, setErrorCount] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!selectedHost) return;
    setObservedModuleVersion(selectedHost.currentVersion);
    setHostContractVersion(selectedHost.hostContractVersion);
    setProtocolVersion(selectedHost.protocolVersion);
    setAdapterKind(selectedHost.adapterKind);
  }, [selectedHost]);

  async function refresh() {
    const response = await fetch("/api/module-certification", {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(
        "Unable to refresh cross-host certification state."
      );
    }
    setModel(await response.json());
  }

  function updateCheck(
    dimension: Dimension,
    patch: Partial<CheckDraft>
  ) {
    setChecks((current) => ({
      ...current,
      [dimension]: {
        ...current[dimension],
        ...patch
      }
    }));
  }

  async function certify() {
    if (!selectedHost) {
      setMessage("Choose an installed host first.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const checkPayload = Object.fromEntries(
        DIMENSIONS.map((dimension) => [
          dimension,
          {
            state: checks[dimension].state,
            evidenceRefs: refs(
              checks[dimension].evidenceRefs
            ),
            detail: checks[dimension].detail.trim()
          }
        ])
      );

      const response = await fetch("/api/module-certification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "certify-host",
          moduleHostInstanceId:
            selectedHost.moduleHostInstanceId,
          evidence: {
            sourceKind,
            observedModuleVersion:
              observedModuleVersion.trim(),
            hostContractVersion,
            protocolVersion,
            adapterKind,
            compatibilityEvidenceRefs: refs(
              compatibilityRefs
            ),
            checks: checkPayload,
            telemetry: {
              sampleCount,
              latencyMsP95:
                latencyMsP95.trim() === ""
                  ? null
                  : Number(latencyMsP95),
              errorCount,
              retryCount
            },
            observedAt: new Date().toISOString()
          }
        })
      });

      const value = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof value.error === "string"
            ? value.error
            : "Certification failed."
        );
      }

      await refresh();
      setMessage(
        value.liveCertified
          ? "Host is live-certified from complete live evidence. Certification did not activate or mutate the host."
          : value.fixtureCertified
            ? "Synthetic fixture passed the reusable harness. The host is fixture-certified only and is not live-certified."
            : "Certification evidence recorded. Review blocked/failed dimensions, telemetry, compatibility and regression details."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Certification failed."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="reviewGrid">
      <section className="reviewCard">
        <p className="eyebrow">Estate summary</p>
        <h2>Cross-host certification status</h2>
        <p>
          Installed hosts: <strong>{model.summary.hosts}</strong> ·
          live-certified:{" "}
          <strong>{model.summary.liveCertified}</strong> ·
          fixture-certified:{" "}
          <strong>{model.summary.fixtureCertified}</strong> · hosts
          with regressions:{" "}
          <strong>{model.summary.hostsWithRegressions}</strong>
        </p>
        <p>
          Suite {model.descriptor.version} ·{" "}
          {model.descriptor.dimensions.length} certification dimensions ·
          supported adapters:{" "}
          {model.descriptor.supportedAdapters.join(", ")}
        </p>
      </section>

      {message ? (
        <section className="dataQualityPolicyNote">
          <strong>Certification status</strong>
          <p>{message}</p>
        </section>
      ) : null}

      <section className="reviewCard">
        <p className="eyebrow">Compatibility matrix</p>
        <h2>Installed host/module matrix</h2>
        {model.compatibilityMatrix.length === 0 ? (
          <p>
            No Build 328 installed-host inventory exists yet. Record an
            installed host in Module Lifecycle before certifying it.
          </p>
        ) : (
          model.compatibilityMatrix.map((row) => (
            <article
              className="reviewCard"
              key={row.moduleHostInstanceId}
            >
              <h3>
                {row.hostApplicationId} · {row.hostInstanceId}
              </h3>
              <p>
                {row.environment} · {row.adapterKind} · module{" "}
                {row.expectedModuleVersion} · host contract{" "}
                {row.hostContractVersion} · protocol{" "}
                {row.protocolVersion}
              </p>
              <p>
                Compatibility:{" "}
                <strong>
                  {statusLabel(row.compatibilityState)}
                </strong>{" "}
                · health:{" "}
                <strong>{statusLabel(row.healthState)}</strong> ·
                certification:{" "}
                <strong>
                  {statusLabel(row.certificationClass)}
                </strong>
              </p>
              <p>
                Observed module:{" "}
                {row.observedModuleVersion ?? "No evidence"} ·
                regressions: {row.regressionCount}
              </p>
            </article>
          ))
        )}
      </section>

      <section className="reviewCard">
        <p className="eyebrow">Reusable host certification harness</p>
        <h2>Record and certify host evidence</h2>
        <p>
          Synthetic is the safe default. Choose live evidence only when the
          references below point to genuine host/runtime evidence. A live PASS
          without a concrete reference is converted to BLOCKED.
        </p>

        <label>
          Installed host
          <select
            value={hostId}
            onChange={(event) =>
              setHostId(event.target.value)
            }
          >
            <option value="">Choose installed host</option>
            {model.hosts.map((host) => (
              <option
                key={host.moduleHostInstanceId}
                value={host.moduleHostInstanceId}
              >
                {host.hostApplicationId} · {host.hostInstanceId} ·{" "}
                {host.currentVersion}
              </option>
            ))}
          </select>
        </label>

        <label>
          Evidence class
          <select
            value={sourceKind}
            onChange={(event) =>
              setSourceKind(
                event.target.value as EvidenceKind
              )
            }
          >
            <option value="synthetic-fixture">
              Synthetic fixture
            </option>
            <option value="live-evidence">
              Genuine live evidence
            </option>
          </select>
        </label>

        <div className="reviewGrid">
          <label>
            Observed module version
            <input
              value={observedModuleVersion}
              onChange={(event) =>
                setObservedModuleVersion(event.target.value)
              }
            />
          </label>
          <label>
            Host contract version
            <input
              type="number"
              min={1}
              value={hostContractVersion}
              onChange={(event) =>
                setHostContractVersion(
                  Number(event.target.value) || 1
                )
              }
            />
          </label>
          <label>
            Protocol version
            <input
              type="number"
              min={1}
              value={protocolVersion}
              onChange={(event) =>
                setProtocolVersion(
                  Number(event.target.value) || 1
                )
              }
            />
          </label>
          <label>
            Adapter
            <select
              value={adapterKind}
              onChange={(event) =>
                setAdapterKind(
                  event.target.value as Host["adapterKind"]
                )
              }
            >
              <option value="react">React</option>
              <option value="nextjs">Next.js</option>
              <option value="vite">Vite</option>
              <option value="vanilla">Vanilla</option>
              <option value="electron">Electron</option>
            </select>
          </label>
        </div>

        <label>
          Compatibility evidence references
          <textarea
            value={compatibilityRefs}
            onChange={(event) =>
              setCompatibilityRefs(event.target.value)
            }
            placeholder="One evidence ID per line or comma-separated."
          />
        </label>

        {DIMENSIONS.map((dimension) => (
          <article className="reviewCard" key={dimension}>
            <h3>{statusLabel(dimension)}</h3>
            <label>
              Outcome
              <select
                value={checks[dimension].state}
                onChange={(event) =>
                  updateCheck(dimension, {
                    state: event.target.value as Outcome
                  })
                }
              >
                <option value="pass">Pass</option>
                <option value="blocked">Blocked</option>
                <option value="fail">Fail</option>
              </select>
            </label>
            <label>
              Evidence references
              <textarea
                value={checks[dimension].evidenceRefs}
                onChange={(event) =>
                  updateCheck(dimension, {
                    evidenceRefs: event.target.value
                  })
                }
                placeholder="Required for a live PASS."
              />
            </label>
            <label>
              Evidence detail
              <textarea
                value={checks[dimension].detail}
                onChange={(event) =>
                  updateCheck(dimension, {
                    detail: event.target.value
                  })
                }
              />
            </label>
          </article>
        ))}

        <article className="reviewCard">
          <h3>Latency / error / retry telemetry</h3>
          <div className="reviewGrid">
            <label>
              Sample count
              <input
                type="number"
                min={0}
                value={sampleCount}
                onChange={(event) =>
                  setSampleCount(
                    Math.max(0, Number(event.target.value) || 0)
                  )
                }
              />
            </label>
            <label>
              P95 latency (ms)
              <input
                type="number"
                min={0}
                value={latencyMsP95}
                onChange={(event) =>
                  setLatencyMsP95(event.target.value)
                }
                placeholder="Blank when no samples"
              />
            </label>
            <label>
              Error count
              <input
                type="number"
                min={0}
                value={errorCount}
                onChange={(event) =>
                  setErrorCount(
                    Math.max(0, Number(event.target.value) || 0)
                  )
                }
              />
            </label>
            <label>
              Retry count
              <input
                type="number"
                min={0}
                value={retryCount}
                onChange={(event) =>
                  setRetryCount(
                    Math.max(0, Number(event.target.value) || 0)
                  )
                }
              />
            </label>
          </div>
        </article>

        <button
          type="button"
          onClick={certify}
          disabled={busy || !selectedHost}
        >
          {busy
            ? "Certifying…"
            : sourceKind === "live-evidence"
              ? "Record live evidence & certify"
              : "Run synthetic fixture certification"}
        </button>
      </section>

      <section className="reviewCard">
        <p className="eyebrow">Regression history</p>
        <h2>Recent certification runs</h2>
        {model.runs.length === 0 ? (
          <p>No cross-host certification runs recorded yet.</p>
        ) : (
          model.runs.slice(0, 40).map((run) => {
            const host = model.hosts.find(
              (item) =>
                item.moduleHostInstanceId ===
                run.moduleHostInstanceId
            );
            const telemetry = run.certification.telemetry;
            return (
              <article className="reviewCard" key={run.runId}>
                <h3>
                  {host?.hostApplicationId ?? "Host"} ·{" "}
                  {statusLabel(run.certificationClass)}
                </h3>
                <p>
                  {statusLabel(run.evidenceKind)} · outcome{" "}
                  <strong>
                    {statusLabel(run.overallOutcome)}
                  </strong>{" "}
                  · compatibility{" "}
                  <strong>
                    {statusLabel(run.compatibilityState)}
                  </strong>{" "}
                  · health{" "}
                  <strong>
                    {statusLabel(run.healthState)}
                  </strong>
                </p>
                <p>
                  PASS {run.passedCount} · FAIL {run.failedCount} ·
                  BLOCKED {run.blockedCount} · regressions{" "}
                  {run.regressionCount}
                </p>
                <p>
                  Telemetry: samples{" "}
                  {telemetry?.sampleCount ?? 0} · P95{" "}
                  {telemetry?.latencyMsP95 ?? "n/a"} ms · errors{" "}
                  {telemetry?.errorCount ?? 0} · retries{" "}
                  {telemetry?.retryCount ?? 0}
                </p>
                {run.regressions.map((regression, index) => (
                  <p key={index}>
                    Regression · {regression.dimension ?? "unknown"} —{" "}
                    {regression.detail ?? "Evidence regressed."}
                  </p>
                ))}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
