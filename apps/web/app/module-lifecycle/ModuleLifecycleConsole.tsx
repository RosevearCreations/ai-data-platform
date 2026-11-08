"use client";

import { useMemo, useState } from "react";

type EligibleEnrollment = {
  enrollmentId: string;
  workspaceId: string;
  hostApplicationId: string;
  hostInstanceId: string;
  environment: string;
  moduleVersion: string;
  packageSha256: string | null;
  packageGeneratedAt: string | null;
};

type HostInstance = {
  moduleHostInstanceId: string;
  enrollmentId: string;
  workspaceId: string;
  hostApplicationId: string;
  hostInstanceId: string;
  environment: string;
  currentVersion: string;
  lastKnownGoodVersion: string;
  lifecycleState: string;
  installationEvidence: string;
  observedAt: string;
  updatedAt: string;
};

type UpgradeRun = {
  runId: string;
  moduleHostInstanceId: string;
  fromVersion: string;
  targetVersion: string;
  lastKnownGoodVersion: string;
  canary: boolean;
  breakingBoundary: boolean;
  compatibilityState: string;
  migrationPlanSha256: string;
  state: string;
  plan: {
    checks?: Array<{
      id: string;
      state: "pass" | "held";
      detail: string;
    }>;
    rollback?: {
      targetVersion?: string;
      manualRestoreRequired?: boolean;
      reverseMigrationIds?: string[];
      blockedByIrreversibleMigrationIds?: string[];
    };
  };
  ownerDecisionReason: string | null;
  outcomeEvidence: Record<string, unknown> | null;
  updatedAt: string;
};

type LifecycleModel = {
  descriptor: {
    version: string;
    safeguards: Record<string, boolean>;
  };
  eligibleEnrollments: EligibleEnrollment[];
  instances: HostInstance[];
  runs: UpgradeRun[];
  events: Array<{
    eventId: string;
    runId: string;
    eventType: string;
    occurredAt: string;
  }>;
};

export function ModuleLifecycleConsole({
  initialModel
}: {
  initialModel: LifecycleModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const registerable = useMemo(
    () =>
      model.eligibleEnrollments.filter(
        (enrollment) =>
          enrollment.packageSha256 &&
          !model.instances.some(
            (instance) =>
              instance.enrollmentId === enrollment.enrollmentId
          )
      ),
    [model.eligibleEnrollments, model.instances]
  );

  const [enrollmentId, setEnrollmentId] = useState(
    registerable[0]?.enrollmentId ?? ""
  );
  const [installationEvidence, setInstallationEvidence] =
    useState("");

  const [instanceId, setInstanceId] = useState(
    model.instances[0]?.moduleHostInstanceId ?? ""
  );
  const [targetVersion, setTargetVersion] = useState("1.0.1");
  const [canary, setCanary] = useState(true);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [schemaReady, setSchemaReady] = useState(false);
  const [backupVerified, setBackupVerified] = useState(false);
  const [minimumHostContractVersion, setMinimumHostContractVersion] =
    useState(1);
  const [minimumProtocolVersion, setMinimumProtocolVersion] =
    useState(1);
  const [allowBreaking, setAllowBreaking] = useState(false);
  const [requireCanaryForBreaking, setRequireCanaryForBreaking] =
    useState(true);
  const [migrationsJson, setMigrationsJson] = useState("[]");

  const [decisionReason, setDecisionReason] = useState("");
  const [outcomeEvidence, setOutcomeEvidence] = useState("");

  async function refresh() {
    const response = await fetch("/api/module-lifecycle", {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error("Unable to refresh module lifecycle state.");
    }
    setModel(await response.json());
  }

  async function post(
    payload: Record<string, unknown>,
    key: string
  ) {
    setBusy(key);
    setMessage("");
    try {
      const response = await fetch("/api/module-lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const value = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof value.error === "string"
            ? value.error
            : "Lifecycle operation failed."
        );
      }
      await refresh();
      return value;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Lifecycle operation failed."
      );
      return null;
    } finally {
      setBusy("");
    }
  }

  async function registerInstalled() {
    const enrollment = registerable.find(
      (item) => item.enrollmentId === enrollmentId
    );
    if (!enrollment) {
      setMessage("Choose an approved enrollment with a generated package.");
      return;
    }
    const value = await post(
      {
        action: "register-installed",
        enrollmentId,
        observedVersion: enrollment.moduleVersion,
        installationEvidence
      },
      "register"
    );
    if (value) {
      setInstallationEvidence("");
      setMessage(
        "Installed version inventory recorded from owner-observed evidence. No upgrade was started."
      );
    }
  }

  async function prepareUpgrade() {
    let migrations: unknown;
    try {
      migrations = JSON.parse(migrationsJson);
    } catch {
      setMessage("Migration plan must be valid JSON.");
      return;
    }
    if (!Array.isArray(migrations)) {
      setMessage("Migration plan JSON must be an array.");
      return;
    }

    const value = await post(
      {
        action: "prepare-upgrade",
        moduleHostInstanceId: instanceId,
        targetVersion,
        canary,
        prerequisites: {
          databaseReady,
          schemaReady,
          backupVerified,
          hostContractVersion: 0,
          protocolVersion: 0,
          minimumHostContractVersion,
          minimumProtocolVersion
        },
        policy: {
          allowBreakingCompatibilityBoundary: allowBreaking,
          requireCanaryForBreakingUpgrade: requireCanaryForBreaking
        },
        migrations
      },
      "prepare"
    );
    if (value) {
      setMessage(
        value.state === "ready-for-owner-approval"
          ? "Upgrade plan passed prerequisites and is waiting for owner approval. Nothing was executed."
          : "Upgrade plan is held. Review the held checks before approval."
      );
    }
  }

  async function decide(
    runId: string,
    decision: "approve" | "reject"
  ) {
    const value = await post(
      {
        action: "owner-decision",
        runId,
        decision,
        reason: decisionReason
      },
      "decision:" + runId
    );
    if (value) {
      setMessage(
        decision === "approve"
          ? "Owner approved the staged plan. The platform still does not execute the host upgrade automatically."
          : "Upgrade plan rejected."
      );
    }
  }

  async function recordOutcome(
    runId: string,
    outcome: "applied" | "failed"
  ) {
    const value = await post(
      {
        action: "record-outcome",
        runId,
        outcome,
        evidence: outcomeEvidence
      },
      "outcome:" + runId
    );
    if (value) {
      setMessage(
        outcome === "applied"
          ? "Host-reported upgrade evidence recorded. The previous stable version remains the rollback target until stability is confirmed."
          : "Failure evidence recorded and the host is marked rollback-ready."
      );
    }
  }

  async function simpleAction(
    runId: string,
    action: "prepare-rollback" | "record-rollback" | "confirm-stable"
  ) {
    const payload: Record<string, unknown> = { action, runId };
    if (action !== "prepare-rollback") {
      payload.evidence = outcomeEvidence;
    }
    const value = await post(payload, action + ":" + runId);
    if (value) {
      setMessage(
        action === "prepare-rollback"
          ? "Rollback plan prepared. It is not executed automatically."
          : action === "record-rollback"
            ? "Rollback completion evidence recorded."
            : "Current version confirmed as the new last-known-good version."
      );
    }
  }

  return (
    <div className="reviewGrid">
      {message ? (
        <section className="dataQualityPolicyNote">
          <strong>Lifecycle status</strong>
          <p>{message}</p>
        </section>
      ) : null}

      <section className="reviewCard">
        <p className="eyebrow">Installed-version inventory</p>
        <h2>Register observed installation</h2>
        <p>
          Only approved Build 327 enrollments with generated packages are
          eligible. Registration requires owner-observed evidence and does not
          infer installation from package generation.
        </p>
        <label>
          Approved enrollment
          <select
            value={enrollmentId}
            onChange={(event) => setEnrollmentId(event.target.value)}
          >
            <option value="">Choose enrollment</option>
            {registerable.map((item) => (
              <option key={item.enrollmentId} value={item.enrollmentId}>
                {item.hostApplicationId} · {item.hostInstanceId} ·{" "}
                {item.moduleVersion}
              </option>
            ))}
          </select>
        </label>
        <label>
          Owner-observed installation evidence
          <textarea
            value={installationEvidence}
            onChange={(event) =>
              setInstallationEvidence(event.target.value)
            }
            placeholder="Record what was actually observed on the host. Do not paste secrets."
          />
        </label>
        <button
          type="button"
          onClick={registerInstalled}
          disabled={
            busy !== "" ||
            !enrollmentId ||
            installationEvidence.trim().length < 8
          }
        >
          {busy === "register"
            ? "Recording…"
            : "Record installed version"}
        </button>
      </section>

      <section className="reviewCard">
        <p className="eyebrow">Safe staged upgrade</p>
        <h2>Prepare upgrade plan</h2>
        <p>
          Preparation validates the enrolled host contract, target minimums,
          database/schema/backup prerequisites, migration ordering, canary
          policy and breaking-version policy. It never executes the upgrade.
        </p>
        <label>
          Installed host
          <select
            value={instanceId}
            onChange={(event) => setInstanceId(event.target.value)}
          >
            <option value="">Choose installed host</option>
            {model.instances.map((item) => (
              <option
                key={item.moduleHostInstanceId}
                value={item.moduleHostInstanceId}
              >
                {item.hostApplicationId} · {item.hostInstanceId} ·{" "}
                {item.currentVersion}
              </option>
            ))}
          </select>
        </label>
        <label>
          Target version
          <input
            value={targetVersion}
            onChange={(event) => setTargetVersion(event.target.value)}
          />
        </label>
        <div className="reviewGrid">
          <label>
            <input
              type="checkbox"
              checked={canary}
              onChange={(event) => setCanary(event.target.checked)}
            />
            Canary host
          </label>
          <label>
            <input
              type="checkbox"
              checked={databaseReady}
              onChange={(event) =>
                setDatabaseReady(event.target.checked)
              }
            />
            Database prerequisite verified
          </label>
          <label>
            <input
              type="checkbox"
              checked={schemaReady}
              onChange={(event) =>
                setSchemaReady(event.target.checked)
              }
            />
            Schema prerequisite verified
          </label>
          <label>
            <input
              type="checkbox"
              checked={backupVerified}
              onChange={(event) =>
                setBackupVerified(event.target.checked)
              }
            />
            Rollback backup verified
          </label>
          <label>
            <input
              type="checkbox"
              checked={allowBreaking}
              onChange={(event) =>
                setAllowBreaking(event.target.checked)
              }
            />
            Owner policy allows breaking boundary
          </label>
          <label>
            <input
              type="checkbox"
              checked={requireCanaryForBreaking}
              onChange={(event) =>
                setRequireCanaryForBreaking(event.target.checked)
              }
            />
            Require canary for breaking boundary
          </label>
        </div>
        <label>
          Target minimum host contract
          <input
            type="number"
            min={1}
            value={minimumHostContractVersion}
            onChange={(event) =>
              setMinimumHostContractVersion(
                Number(event.target.value) || 1
              )
            }
          />
        </label>
        <label>
          Target minimum protocol
          <input
            type="number"
            min={1}
            value={minimumProtocolVersion}
            onChange={(event) =>
              setMinimumProtocolVersion(
                Number(event.target.value) || 1
              )
            }
          />
        </label>
        <label>
          Ordered migrations JSON
          <textarea
            value={migrationsJson}
            onChange={(event) =>
              setMigrationsJson(event.target.value)
            }
            rows={8}
          />
        </label>
        <button
          type="button"
          onClick={prepareUpgrade}
          disabled={busy !== "" || !instanceId}
        >
          {busy === "prepare"
            ? "Checking…"
            : "Prepare staged upgrade"}
        </button>
      </section>

      <section className="reviewCard">
        <p className="eyebrow">Owner decision & evidence</p>
        <h2>Upgrade runs</h2>
        <label>
          Owner decision reason
          <textarea
            value={decisionReason}
            onChange={(event) =>
              setDecisionReason(event.target.value)
            }
            placeholder="Reason for approving or rejecting this exact plan."
          />
        </label>
        <label>
          Host outcome / rollback / stability evidence
          <textarea
            value={outcomeEvidence}
            onChange={(event) =>
              setOutcomeEvidence(event.target.value)
            }
            placeholder="Record observed host evidence. Do not paste secrets."
          />
        </label>

        {model.runs.length === 0 ? (
          <p>No upgrade runs recorded yet.</p>
        ) : (
          model.runs.map((run) => (
            <article className="reviewCard" key={run.runId}>
              <h3>
                {run.fromVersion} → {run.targetVersion}
                {run.canary ? " · canary" : ""}
              </h3>
              <p>
                State: <strong>{run.state}</strong> · compatibility:{" "}
                <strong>{run.compatibilityState}</strong>
              </p>
              <p>
                Last known good: {run.lastKnownGoodVersion} · plan hash:{" "}
                <code>{run.migrationPlanSha256.slice(0, 16)}…</code>
              </p>
              {run.plan.checks?.map((check) => (
                <p key={check.id}>
                  {check.state === "pass" ? "PASS" : "HOLD"} ·{" "}
                  {check.id} — {check.detail}
                </p>
              ))}
              <div className="heroActions">
                {run.state === "ready-for-owner-approval" ? (
                  <button
                    type="button"
                    onClick={() => decide(run.runId, "approve")}
                    disabled={
                      busy !== "" ||
                      decisionReason.trim().length < 3
                    }
                  >
                    Approve plan
                  </button>
                ) : null}
                {["ready-for-owner-approval", "held"].includes(
                  run.state
                ) ? (
                  <button
                    type="button"
                    onClick={() => decide(run.runId, "reject")}
                    disabled={
                      busy !== "" ||
                      decisionReason.trim().length < 3
                    }
                  >
                    Reject plan
                  </button>
                ) : null}
                {run.state === "approved" ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        recordOutcome(run.runId, "applied")
                      }
                      disabled={
                        busy !== "" ||
                        outcomeEvidence.trim().length < 8
                      }
                    >
                      Record applied
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        recordOutcome(run.runId, "failed")
                      }
                      disabled={
                        busy !== "" ||
                        outcomeEvidence.trim().length < 8
                      }
                    >
                      Record failure
                    </button>
                  </>
                ) : null}
                {["applied", "failed"].includes(run.state) ? (
                  <button
                    type="button"
                    onClick={() =>
                      simpleAction(run.runId, "prepare-rollback")
                    }
                    disabled={busy !== ""}
                  >
                    Prepare rollback
                  </button>
                ) : null}
                {run.state === "rollback-prepared" ? (
                  <button
                    type="button"
                    onClick={() =>
                      simpleAction(run.runId, "record-rollback")
                    }
                    disabled={
                      busy !== "" ||
                      outcomeEvidence.trim().length < 8
                    }
                  >
                    Record rollback completed
                  </button>
                ) : null}
                {run.state === "applied" ? (
                  <button
                    type="button"
                    onClick={() =>
                      simpleAction(run.runId, "confirm-stable")
                    }
                    disabled={
                      busy !== "" ||
                      outcomeEvidence.trim().length < 8
                    }
                  >
                    Confirm stable version
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </section>

      <section className="reviewCard">
        <p className="eyebrow">Current installed hosts</p>
        <h2>Version inventory</h2>
        {model.instances.length === 0 ? (
          <p>No owner-observed installed module instances yet.</p>
        ) : (
          model.instances.map((instance) => (
            <article className="reviewCard" key={instance.moduleHostInstanceId}>
              <h3>
                {instance.hostApplicationId} · {instance.hostInstanceId}
              </h3>
              <p>
                Current: <strong>{instance.currentVersion}</strong> · last
                known good:{" "}
                <strong>{instance.lastKnownGoodVersion}</strong>
              </p>
              <p>
                {instance.environment} · {instance.lifecycleState}
              </p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
