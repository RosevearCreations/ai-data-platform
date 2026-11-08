"use client";

import { useMemo, useState } from "react";

type Workspace = {
  id: string;
  name: string;
  role: string;
};

type Model = {
  canManage: boolean;
  globalControl: {
    emergencyStopEngaged: boolean;
    revision: number;
    reason: string | null;
    updatedAt: string | null;
  };
  policies: Array<{
    policyId: string;
    policy: {
      host: {
        hostApplicationId: string;
        hostInstanceId: string;
        environment: "development" | "test" | "staging" | "production";
        workspaceId: string;
        tenantId: string;
      };
      enabled: boolean;
      killSwitchEngaged: boolean;
      safeActions: string[];
      maxCyclesPerHour: number;
      maxSafeHealthActionsPerCycle: number;
      maxSafeHealthActionsPerHour: number;
      maxSafeHealthActionsPerDay: number;
      maintenanceWindow: {
        daysOfWeekUtc: number[];
        startMinuteUtc: number;
        endMinuteUtc: number;
      } | null;
      policyRevision: number;
      updatedAt: string;
    };
  }>;
  reservations: Array<{
    reservationId: string;
    policyId: string;
    safeHealthQuantity: number;
    decisionReason: string;
    reservedAt: string;
  }>;
  workspaces: Workspace[];
};

type Draft = {
  workspaceId: string;
  hostApplicationId: string;
  hostInstanceId: string;
  environment: "development" | "test" | "staging" | "production";
  tenantId: string;
  enabled: boolean;
  killSwitchEngaged: boolean;
  safeHealthAllowed: boolean;
  maxCyclesPerHour: number;
  maxSafeHealthActionsPerCycle: number;
  maxSafeHealthActionsPerHour: number;
  maxSafeHealthActionsPerDay: number;
  maintenanceEnabled: boolean;
  maintenanceDays: number[];
  maintenanceStartMinuteUtc: number;
  maintenanceEndMinuteUtc: number;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function emptyDraft(workspaces: Workspace[]): Draft {
  return {
    workspaceId: workspaces[0]?.id ?? "",
    hostApplicationId: "",
    hostInstanceId: "",
    environment: "production",
    tenantId: "",
    enabled: false,
    killSwitchEngaged: true,
    safeHealthAllowed: false,
    maxCyclesPerHour: 1,
    maxSafeHealthActionsPerCycle: 0,
    maxSafeHealthActionsPerHour: 0,
    maxSafeHealthActionsPerDay: 0,
    maintenanceEnabled: false,
    maintenanceDays: [0, 1, 2, 3, 4, 5, 6],
    maintenanceStartMinuteUtc: 0,
    maintenanceEndMinuteUtc: 60
  };
}

export function ModuleSupervisorPolicyConsole({
  model
}: {
  model: Model;
}) {
  const [current, setCurrent] = useState(model);
  const [draft, setDraft] = useState(() => emptyDraft(model.workspaces));
  const [globalReason, setGlobalReason] = useState(
    model.globalControl.reason ?? ""
  );
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const globalStop = current.globalControl.emergencyStopEngaged;

  const selectedWorkspace = useMemo(
    () =>
      current.workspaces.find(
        (workspace) => workspace.id === draft.workspaceId
      ) ?? null,
    [current.workspaces, draft.workspaceId]
  );

  async function refresh() {
    const response = await fetch("/api/module-supervisor/policy", {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error("Unable to refresh per-host autonomy policies.");
    }
    const next = await response.json();
    setCurrent(next);
    setGlobalReason(next.globalControl?.reason ?? "");
  }

  async function post(
    payload: Record<string, unknown>,
    busyKey: string
  ) {
    setBusy(busyKey);
    setMessage("");
    try {
      const response = await fetch("/api/module-supervisor/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const value = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof value.error === "string"
            ? value.error
            : "Policy operation failed."
        );
      }
      await refresh();
      return value;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Policy operation failed."
      );
      return null;
    } finally {
      setBusy("");
    }
  }

  async function setGlobalStop(engaged: boolean) {
    const result = await post(
      {
        action: "set-global-stop",
        emergencyStopEngaged: engaged,
        reason: globalReason.trim() || null
      },
      "global"
    );
    if (result) {
      setMessage(
        engaged
          ? "Emergency global stop engaged. Every host policy is blocked."
          : "Emergency global stop released. Each host still must pass its own policy, kill switch, maintenance window and budgets."
      );
    }
  }

  function loadPolicy(entry: Model["policies"][number]) {
    const policy = entry.policy;
    setDraft({
      workspaceId: policy.host.workspaceId,
      hostApplicationId: policy.host.hostApplicationId,
      hostInstanceId: policy.host.hostInstanceId,
      environment: policy.host.environment,
      tenantId: policy.host.tenantId,
      enabled: policy.enabled,
      killSwitchEngaged: policy.killSwitchEngaged,
      safeHealthAllowed: policy.safeActions.includes(
        "connector-health-retry"
      ),
      maxCyclesPerHour: policy.maxCyclesPerHour,
      maxSafeHealthActionsPerCycle:
        policy.maxSafeHealthActionsPerCycle,
      maxSafeHealthActionsPerHour:
        policy.maxSafeHealthActionsPerHour,
      maxSafeHealthActionsPerDay:
        policy.maxSafeHealthActionsPerDay,
      maintenanceEnabled: Boolean(policy.maintenanceWindow),
      maintenanceDays:
        policy.maintenanceWindow?.daysOfWeekUtc ??
        [0, 1, 2, 3, 4, 5, 6],
      maintenanceStartMinuteUtc:
        policy.maintenanceWindow?.startMinuteUtc ?? 0,
      maintenanceEndMinuteUtc:
        policy.maintenanceWindow?.endMinuteUtc ?? 60
    });
    setMessage(
      "Loaded host policy revision " +
        String(policy.policyRevision) +
        " for editing."
    );
  }

  async function saveHostPolicy() {
    const safeHealthAllowed = draft.safeHealthAllowed;
    const result = await post(
      {
        action: "upsert-host-policy",
        workspaceId: draft.workspaceId,
        hostApplicationId: draft.hostApplicationId.trim(),
        hostInstanceId: draft.hostInstanceId.trim(),
        environment: draft.environment,
        tenantId: draft.tenantId.trim(),
        enabled: draft.enabled,
        killSwitchEngaged: draft.killSwitchEngaged,
        safeActions: safeHealthAllowed
          ? ["connector-health-retry"]
          : [],
        maxCyclesPerHour: draft.maxCyclesPerHour,
        maxSafeHealthActionsPerCycle: safeHealthAllowed
          ? draft.maxSafeHealthActionsPerCycle
          : 0,
        maxSafeHealthActionsPerHour: safeHealthAllowed
          ? draft.maxSafeHealthActionsPerHour
          : 0,
        maxSafeHealthActionsPerDay: safeHealthAllowed
          ? draft.maxSafeHealthActionsPerDay
          : 0,
        maintenanceWindow: draft.maintenanceEnabled
          ? {
              daysOfWeekUtc: draft.maintenanceDays,
              startMinuteUtc: draft.maintenanceStartMinuteUtc,
              endMinuteUtc: draft.maintenanceEndMinuteUtc
            }
          : null
      },
      "policy"
    );
    if (result) {
      setMessage(
        "Host policy saved. Saving policy does not authorize a cycle; the runtime must re-evaluate and reserve budget before execution."
      );
    }
  }

  function toggleDay(day: number) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      maintenanceDays: currentDraft.maintenanceDays.includes(day)
        ? currentDraft.maintenanceDays.filter(
            (value) => value !== day
          )
        : [...currentDraft.maintenanceDays, day].sort()
    }));
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
            <p className="eyebrow">Build 326 · emergency control</p>
            <h2>Global stop</h2>
          </div>
        </div>
        <div className="grid">
          <article className="card">
            <h3>
              {globalStop ? "ENGAGED" : "Released"} · revision{" "}
              {current.globalControl.revision}
            </h3>
            <p>
              This owner-wide control overrides every per-host policy. Missing
              global-control state also fails closed as engaged.
            </p>
            <label>
              Reason
              <input
                value={globalReason}
                maxLength={240}
                disabled={!current.canManage || Boolean(busy)}
                onChange={(event) =>
                  setGlobalReason(event.target.value)
                }
              />
            </label>
            <div className="heroActions">
              <button
                className="primaryButton"
                disabled={
                  !current.canManage || Boolean(busy) || globalStop
                }
                onClick={() => setGlobalStop(true)}
              >
                Engage emergency stop
              </button>
              <button
                className="secondaryButton"
                disabled={
                  !current.canManage || Boolean(busy) || !globalStop
                }
                onClick={() => setGlobalStop(false)}
              >
                Release global stop
              </button>
            </div>
          </article>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Per-host autonomy</p>
            <h2>Host policy editor</h2>
          </div>
        </div>

        <div className="grid">
          <article className="card">
            <h3>Exact host scope</h3>
            <label>
              Workspace
              <select
                value={draft.workspaceId}
                disabled={!current.canManage || Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    workspaceId: event.target.value
                  })
                }
              >
                {current.workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name} · {workspace.role}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Host application ID
              <input
                value={draft.hostApplicationId}
                placeholder="rosevear.icamp"
                disabled={!current.canManage || Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    hostApplicationId: event.target.value
                  })
                }
              />
            </label>
            <label>
              Host instance ID
              <input
                value={draft.hostInstanceId}
                placeholder="host-production-primary"
                disabled={!current.canManage || Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    hostInstanceId: event.target.value
                  })
                }
              />
            </label>
            <label>
              Tenant ID
              <input
                value={draft.tenantId}
                placeholder="tenant-production"
                disabled={!current.canManage || Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    tenantId: event.target.value
                  })
                }
              />
            </label>
            <label>
              Environment
              <select
                value={draft.environment}
                disabled={!current.canManage || Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    environment: event.target.value as Draft["environment"]
                  })
                }
              >
                <option value="development">development</option>
                <option value="test">test</option>
                <option value="staging">staging</option>
                <option value="production">production</option>
              </select>
            </label>
            <p>
              Workspace:{" "}
              <strong>{selectedWorkspace?.name ?? "not selected"}</strong>
            </p>
          </article>

          <article className="card">
            <h3>Enablement & kill switch</h3>
            <label>
              <input
                type="checkbox"
                checked={draft.enabled}
                disabled={!current.canManage || Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    enabled: event.target.checked
                  })
                }
              />{" "}
              Enable autonomous cycles for this exact host
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.killSwitchEngaged}
                disabled={!current.canManage || Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    killSwitchEngaged: event.target.checked
                  })
                }
              />{" "}
              Host kill switch engaged
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.safeHealthAllowed}
                disabled={!current.canManage || Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    safeHealthAllowed: event.target.checked,
                    maxSafeHealthActionsPerCycle: event.target.checked
                      ? Math.max(
                          1,
                          draft.maxSafeHealthActionsPerCycle
                        )
                      : 0,
                    maxSafeHealthActionsPerHour: event.target.checked
                      ? Math.max(
                          1,
                          draft.maxSafeHealthActionsPerHour
                        )
                      : 0,
                    maxSafeHealthActionsPerDay: event.target.checked
                      ? Math.max(
                          1,
                          draft.maxSafeHealthActionsPerDay
                        )
                      : 0
                  })
                }
              />{" "}
              Allow connector-health GET/HEAD recovery
            </label>
          </article>

          <article className="card">
            <h3>Budgets</h3>
            <label>
              Cycles per hour
              <input
                type="number"
                min={1}
                max={12}
                value={draft.maxCyclesPerHour}
                disabled={!current.canManage || Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    maxCyclesPerHour: Number(event.target.value)
                  })
                }
              />
            </label>
            <label>
              Safe health actions per cycle
              <input
                type="number"
                min={0}
                max={3}
                value={draft.maxSafeHealthActionsPerCycle}
                disabled={
                  !current.canManage ||
                  Boolean(busy) ||
                  !draft.safeHealthAllowed
                }
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    maxSafeHealthActionsPerCycle: Number(
                      event.target.value
                    )
                  })
                }
              />
            </label>
            <label>
              Safe health actions per hour
              <input
                type="number"
                min={0}
                max={20}
                value={draft.maxSafeHealthActionsPerHour}
                disabled={
                  !current.canManage ||
                  Boolean(busy) ||
                  !draft.safeHealthAllowed
                }
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    maxSafeHealthActionsPerHour: Number(
                      event.target.value
                    )
                  })
                }
              />
            </label>
            <label>
              Safe health actions per day
              <input
                type="number"
                min={0}
                max={50}
                value={draft.maxSafeHealthActionsPerDay}
                disabled={
                  !current.canManage ||
                  Boolean(busy) ||
                  !draft.safeHealthAllowed
                }
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    maxSafeHealthActionsPerDay: Number(
                      event.target.value
                    )
                  })
                }
              />
            </label>
          </article>

          <article className="card">
            <h3>UTC maintenance window</h3>
            <label>
              <input
                type="checkbox"
                checked={draft.maintenanceEnabled}
                disabled={!current.canManage || Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    maintenanceEnabled: event.target.checked
                  })
                }
              />{" "}
              Restrict autonomous cycles to a maintenance window
            </label>
            <div>
              {DAYS.map((label, day) => (
                <label key={label}>
                  <input
                    type="checkbox"
                    checked={draft.maintenanceDays.includes(day)}
                    disabled={
                      !current.canManage ||
                      Boolean(busy) ||
                      !draft.maintenanceEnabled
                    }
                    onChange={() => toggleDay(day)}
                  />{" "}
                  {label}
                </label>
              ))}
            </div>
            <label>
              Start minute UTC (0–1439)
              <input
                type="number"
                min={0}
                max={1439}
                value={draft.maintenanceStartMinuteUtc}
                disabled={
                  !current.canManage ||
                  Boolean(busy) ||
                  !draft.maintenanceEnabled
                }
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    maintenanceStartMinuteUtc: Number(
                      event.target.value
                    )
                  })
                }
              />
            </label>
            <label>
              End minute UTC (0–1439)
              <input
                type="number"
                min={0}
                max={1439}
                value={draft.maintenanceEndMinuteUtc}
                disabled={
                  !current.canManage ||
                  Boolean(busy) ||
                  !draft.maintenanceEnabled
                }
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    maintenanceEndMinuteUtc: Number(
                      event.target.value
                    )
                  })
                }
              />
            </label>
          </article>
        </div>

        <div className="heroActions">
          <button
            className="primaryButton"
            disabled={
              !current.canManage ||
              Boolean(busy) ||
              !draft.workspaceId
            }
            onClick={saveHostPolicy}
          >
            {busy === "policy" ? "Saving…" : "Save host policy"}
          </button>
          <button
            className="secondaryButton"
            disabled={Boolean(busy)}
            onClick={() => setDraft(emptyDraft(current.workspaces))}
          >
            New policy
          </button>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Policy inventory</p>
            <h2>Configured hosts</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {current.policies.map((entry) => (
            <button
              className="reviewBatchRow"
              key={entry.policyId}
              onClick={() => loadPolicy(entry)}
              disabled={Boolean(busy)}
            >
              <strong>
                {entry.policy.host.hostApplicationId} ·{" "}
                {entry.policy.host.environment}
              </strong>
              <span>
                revision {entry.policy.policyRevision} ·{" "}
                {entry.policy.enabled ? "enabled" : "disabled"} ·{" "}
                {entry.policy.killSwitchEngaged
                  ? "kill switch engaged"
                  : "kill switch released"}
              </span>
              <p>
                {entry.policy.host.hostInstanceId} · workspace{" "}
                {entry.policy.host.workspaceId} · tenant{" "}
                {entry.policy.host.tenantId}
              </p>
            </button>
          ))}
          {!current.policies.length ? (
            <div className="emptyState">
              No per-host policies are configured. Missing host policy blocks
              autonomous cycles.
            </div>
          ) : null}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Fail-closed precedence</strong>
        <p>
          Global emergency stop → host policy present → host enabled → host kill
          switch → maintenance window → cycle budget → safe-action allowlist →
          recovery budgets. A later control can only narrow authority; it cannot
          override an earlier block.
        </p>
      </section>
    </>
  );
}
