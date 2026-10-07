import { useEffect, useMemo, useState } from "react";

import { loadSupplierInventoryStaging } from "./devil-supplier-store";
import {
  clearBusinessIntegrationSimulationRegistry,
  simulateBusinessIntegrationConsumer
} from "./integration-contract-validator";
import { downloadBlob } from "./export-engine";
import {
  buildApprovedIntegrationPackage,
  buildIntegrationDryRun,
  devilIntegrationCandidates,
  integrationPackageBlob,
  integrationPackageFilename,
  parseBusinessSystemSnapshot,
  rosieIntegrationCandidates
} from "./integration-adapter-engine";
import {
  approveBusinessIntegrationBatch,
  cancelBusinessIntegrationBatch,
  latestBatchForTarget,
  loadBusinessIntegrationState,
  markBusinessIntegrationExported,
  saveBusinessIntegrationDryRun
} from "./integration-adapter-store";
import { loadOntarioDetailerDataset } from "./rosie-competitive-store";
import type {
  BusinessIntegrationBatch,
  BusinessIntegrationState,
  BusinessIntegrationValidationResult,
  BusinessIntegrationTarget,
  BusinessSystemSnapshot,
  OntarioDetailerDataset,
  SupplierInventoryStagingDataset
} from "./types";

function targetLabel(target: BusinessIntegrationTarget) {
  return target === "rosie-dazzlers" ? "Rosie Dazzlers" : "Devil n Dove";
}

export function BusinessIntegrationsPanel() {
  const [target, setTarget] =
    useState<BusinessIntegrationTarget>("rosie-dazzlers");
  const [rosie, setRosie] = useState<OntarioDetailerDataset | null>(null);
  const [devil, setDevil] =
    useState<SupplierInventoryStagingDataset | null>(null);
  const [state, setState] = useState<BusinessIntegrationState | null>(null);
  const [snapshot, setSnapshot] = useState<BusinessSystemSnapshot | null>(null);
  const [snapshotName, setSnapshotName] = useState("");
  const [approvalChecked, setApprovalChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [verification, setVerification] =
    useState<BusinessIntegrationValidationResult | null>(null);
  const [verificationFile, setVerificationFile] = useState("");

  async function refresh() {
    const [nextRosie, nextDevil, nextState] = await Promise.all([
      loadOntarioDetailerDataset(),
      loadSupplierInventoryStaging(),
      loadBusinessIntegrationState()
    ]);
    setRosie(nextRosie);
    setDevil(nextDevil);
    setState(nextState);
  }

  useEffect(() => {
    void refresh().catch((reason) => {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Business integration state is unavailable."
      );
    });
  }, []);

  const candidates = useMemo(
    () =>
      target === "rosie-dazzlers"
        ? rosie
          ? rosieIntegrationCandidates(rosie)
          : []
        : devil
          ? devilIntegrationCandidates(devil)
          : [],
    [devil, rosie, target]
  );

  const latestBatch = useMemo(
    () => latestBatchForTarget(state, target),
    [state, target]
  );

  const targetAudit = useMemo(
    () =>
      (state?.audit ?? [])
        .filter((entry) => entry.target === target)
        .slice(0, 12),
    [state, target]
  );

  function changeTarget(nextTarget: BusinessIntegrationTarget) {
    setTarget(nextTarget);
    setSnapshot(null);
    setSnapshotName("");
    setApprovalChecked(false);
    setMessage(null);
  }

  async function loadSnapshotFile(file: File | undefined) {
    if (!file) return;

    setPending(true);
    setMessage(null);
    try {
      const parsed = parseBusinessSystemSnapshot(target, await file.text());
      setSnapshot(parsed);
      setSnapshotName(file.name);
      setMessage(
        "Loaded " +
          parsed.records.length +
          " current " +
          targetLabel(target) +
          " snapshot records for dry-run comparison."
      );
    } catch (reason) {
      setSnapshot(null);
      setSnapshotName("");
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to read the business-system snapshot."
      );
    } finally {
      setPending(false);
    }
  }

  async function createDryRun() {
    setPending(true);
    setApprovalChecked(false);
    setMessage(null);

    try {
      await refresh();
      const [freshRosie, freshDevil] = await Promise.all([
        loadOntarioDetailerDataset(),
        loadSupplierInventoryStaging()
      ]);
      setRosie(freshRosie);
      setDevil(freshDevil);

      const freshCandidates =
        target === "rosie-dazzlers"
          ? rosieIntegrationCandidates(freshRosie)
          : devilIntegrationCandidates(freshDevil);
      const sourceDatasetUpdatedAt =
        target === "rosie-dazzlers"
          ? freshRosie.updatedAt
          : freshDevil.updatedAt;
      const batch = buildIntegrationDryRun({
        target,
        candidates: freshCandidates,
        snapshot,
        sourceDatasetUpdatedAt
      });
      const nextState = await saveBusinessIntegrationDryRun(batch);
      setState(nextState);
      setMessage(
        "Dry run created · " +
          batch.summary.create +
          " create · " +
          batch.summary.update +
          " update · " +
          batch.summary.unchanged +
          " unchanged · " +
          batch.summary.blocked +
          " blocked by user-owned-field protection."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to create the business integration dry run."
      );
    } finally {
      setPending(false);
    }
  }

  async function approveBatch(batch: BusinessIntegrationBatch) {
    setPending(true);
    setMessage(null);

    try {
      const [freshRosie, freshDevil] = await Promise.all([
        loadOntarioDetailerDataset(),
        loadSupplierInventoryStaging()
      ]);
      setRosie(freshRosie);
      setDevil(freshDevil);
      const sourceUpdatedAt =
        batch.target === "rosie-dazzlers"
          ? freshRosie.updatedAt
          : freshDevil.updatedAt;
      const nextState = await approveBusinessIntegrationBatch({
        batchId: batch.id,
        expectedSourceDatasetUpdatedAt: sourceUpdatedAt
      });
      setState(nextState);
      setApprovalChecked(false);
      setMessage(
        "Explicit approval recorded for the dry-run fingerprint. The batch is approved for controlled package export; no production system has been written."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to approve the integration batch."
      );
    } finally {
      setPending(false);
    }
  }

  async function exportBatch(batch: BusinessIntegrationBatch) {
    setPending(true);
    setMessage(null);

    try {
      const integrationPackage = buildApprovedIntegrationPackage(batch);
      downloadBlob(
        integrationPackageBlob(integrationPackage),
        integrationPackageFilename(integrationPackage)
      );
      const nextState = await markBusinessIntegrationExported(batch.id);
      setState(nextState);
      setMessage(
        "Approved " +
          targetLabel(batch.target) +
          " integration package exported. The audit trail records the controlled handoff."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to export the approved integration package."
      );
    } finally {
      setPending(false);
    }
  }

  async function verifyPackageFile(file: File | undefined) {
    if (!file) return;

    setPending(true);
    setVerification(null);
    setVerificationFile(file.name);
    setMessage(null);

    try {
      const result = await simulateBusinessIntegrationConsumer(
        await file.text()
      );
      setVerification(result);
      setMessage(
        result.valid
          ? "Non-production consumer simulation accepted this package. Uploading the same package again will prove replay/duplicate rejection."
          : "Consumer simulation rejected the package: " +
              result.code +
              (result.errors.length ? " — " + result.errors.join(" ") : "")
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to run package verification."
      );
    } finally {
      setPending(false);
    }
  }

  async function resetSimulationRegistry() {
    setPending(true);
    setMessage(null);
    try {
      await clearBusinessIntegrationSimulationRegistry();
      setVerification(null);
      setVerificationFile("");
      setMessage(
        "Non-production replay registry cleared. No business application data was changed."
      );
    } finally {
      setPending(false);
    }
  }

  async function cancelBatch(batchId: string) {
    setPending(true);
    setMessage(null);

    try {
      const nextState = await cancelBusinessIntegrationBatch(batchId);
      setState(nextState);
      setApprovalChecked(false);
      setMessage("Integration batch cancelled before handoff.");
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to cancel the integration batch."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="businessIntegrations">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Build 018 → 022</p>
          <h2>Business-system integrations</h2>
        </div>
        <span className="integrationBadge">Approval gate</span>
      </div>

      <p className="integrationIntro">
        Explicit adapters prepare controlled business handoffs without shared
        database tables. Every batch is dry-run first, protects user-owned
        fields, requires explicit approval, and records an audit trail before an
        approved JSON package can be exported.
      </p>

      <label className="integrationTarget">
        Business adapter
        <select
          disabled={pending}
          onChange={(event) =>
            changeTarget(event.target.value as BusinessIntegrationTarget)
          }
          value={target}
        >
          <option value="rosie-dazzlers">
            Rosie Dazzlers · competitive intelligence
          </option>
          <option value="devil-n-dove">
            Devil n Dove · approved supplier inventory
          </option>
        </select>
      </label>

      <div className="integrationSourceStats">
        <div>
          <strong>{candidates.length}</strong>
          <span>
            {target === "rosie-dazzlers"
              ? "latest competitor offerings"
              : "approved supplier records"}
          </span>
        </div>
        <div>
          <strong>
            {target === "rosie-dazzlers"
              ? rosie?.series.length ?? 0
              : devil?.items.length ?? 0}
          </strong>
          <span>
            {target === "rosie-dazzlers"
              ? "competitor source series"
              : "total supplier staging"}
          </span>
        </div>
        <div>
          <strong>{snapshot?.records.length ?? 0}</strong>
          <span>current-system snapshot</span>
        </div>
        <div>
          <strong>{targetAudit.length}</strong>
          <span>recent audit entries</span>
        </div>
      </div>

      <div className="integrationSnapshot">
        <div className="integrationSubheader">
          <strong>Optional current-system snapshot</strong>
          <span>{snapshotName || "none loaded"}</span>
        </div>
        <p>
          Load exported current state to classify updates and protect fields
          your business system marks as user-owned. Without a snapshot, adapter
          candidates appear as creates.
        </p>
        <input
          accept=".json,application/json"
          disabled={pending}
          onChange={(event) =>
            void loadSnapshotFile(event.target.files?.[0])
          }
          type="file"
        />
        {snapshot ? (
          <button
            disabled={pending}
            onClick={() => {
              setSnapshot(null);
              setSnapshotName("");
              setMessage("Current-system snapshot cleared.");
            }}
            type="button"
          >
            Clear snapshot
          </button>
        ) : null}

        <details>
          <summary>Snapshot contract example</summary>
          <pre>{JSON.stringify(
            {
              version: 1,
              target,
              capturedAt: new Date().toISOString(),
              records: [
                {
                  integrationKey:
                    target === "rosie-dazzlers"
                      ? "rosie-competitor::example"
                      : "devil-supplier::example",
                  values: {
                    exampleExternalField: "current business value"
                  },
                  userOwnedKeys: ["exampleInternalField"]
                }
              ]
            },
            null,
            2
          )}</pre>
        </details>
      </div>

      <button
        className="integrationDryRunButton"
        disabled={pending || !candidates.length}
        onClick={createDryRun}
        type="button"
      >
        {pending ? "Processing adapter…" : "Generate dry-run diff"}
      </button>

      {latestBatch ? (
        <div className="integrationBatch">
          <div className="integrationBatchTop">
            <div>
              <span
                className={
                  "integrationStatus integrationStatus-" + latestBatch.status
                }
              >
                {latestBatch.status}
              </span>
              <strong>{latestBatch.adapterContract}</strong>
            </div>
            <small>fingerprint {latestBatch.dryRunFingerprint}</small>
          </div>

          <div className="integrationSummary">
            <div>
              <strong>{latestBatch.summary.create}</strong>
              <span>create</span>
            </div>
            <div>
              <strong>{latestBatch.summary.update}</strong>
              <span>update</span>
            </div>
            <div>
              <strong>{latestBatch.summary.unchanged}</strong>
              <span>unchanged</span>
            </div>
            <div>
              <strong>{latestBatch.summary.blocked}</strong>
              <span>blocked</span>
            </div>
          </div>

          <small>
            Source dataset:{" "}
            {new Date(latestBatch.sourceDatasetUpdatedAt).toLocaleString()}
            {latestBatch.snapshotCapturedAt
              ? " · snapshot " +
                new Date(latestBatch.snapshotCapturedAt).toLocaleString()
              : " · no current-system snapshot"}
          </small>

          <div className="integrationDiffs">
            {latestBatch.diffs.slice(0, 12).map((diff) => (
              <article key={diff.id}>
                <div>
                  <span
                    className={
                      "integrationAction integrationAction-" + diff.action
                    }
                  >
                    {diff.action}
                  </span>
                  <strong>{diff.integrationKey}</strong>
                </div>
                <small>
                  {diff.changedFields.length} changed field
                  {diff.changedFields.length === 1 ? "" : "s"}
                  {diff.blockedFields.length
                    ? " · protected: " + diff.blockedFields.join(", ")
                    : ""}
                </small>
                {diff.changedFields.length ? (
                  <ul>
                    {diff.changedFields.slice(0, 5).map((field) => (
                      <li key={field.key}>
                        {field.key}:{" "}
                        {field.before === null ? "∅" : String(field.before)}
                        {" → "}
                        {field.after === null ? "∅" : String(field.after)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>

          {latestBatch.diffs.length > 12 ? (
            <small>
              Showing 12 of {latestBatch.diffs.length} dry-run records.
            </small>
          ) : null}

          {latestBatch.status === "draft" ? (
            <>
              <label className="integrationApprovalCheck">
                <input
                  checked={approvalChecked}
                  disabled={pending}
                  onChange={(event) =>
                    setApprovalChecked(event.target.checked)
                  }
                  type="checkbox"
                />
                <span>
                  I reviewed this exact dry-run fingerprint and approve its
                  create/update operations for controlled business-system
                  handoff. Blocked user-owned fields remain excluded.
                </span>
              </label>
              <div className="integrationBatchActions">
                <button
                  disabled={
                    pending ||
                    !approvalChecked ||
                    !latestBatch.summary.exportableOperations
                  }
                  onClick={() => approveBatch(latestBatch)}
                  type="button"
                >
                  Approve exact dry run
                </button>
                <button
                  disabled={pending}
                  onClick={() => cancelBatch(latestBatch.id)}
                  type="button"
                >
                  Cancel batch
                </button>
              </div>
            </>
          ) : null}

          {latestBatch.status === "approved" ||
          latestBatch.status === "exported" ? (
            <button
              className="integrationExportButton"
              disabled={pending}
              onClick={() => exportBatch(latestBatch)}
              type="button"
            >
              {latestBatch.status === "exported"
                ? "Export approved package again"
                : "Export approved integration package"}
            </button>
          ) : null}
        </div>
      ) : (
        <p className="integrationEmpty">
          No dry run exists for this adapter yet.
        </p>
      )}

      <div className="integrationSubheader">
        <strong>Audit trail</strong>
        <span>most recent 12</span>
      </div>

      {targetAudit.length ? (
        <div className="integrationAudit">
          {targetAudit.map((entry) => (
            <article key={entry.id}>
              <div>
                <strong>{entry.action}</strong>
                <span>{entry.fingerprint}</span>
              </div>
              <small>{new Date(entry.occurredAt).toLocaleString()}</small>
              <p>{entry.details}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="integrationEmpty">
          No adapter audit entries have been recorded for this business yet.
        </p>
      )}

      <div className="integrationSnapshot integrationVerifier">
        <div className="integrationSubheader">
          <strong>Build 022 consumer simulation</strong>
          <span>{verificationFile || "no package loaded"}</span>
        </div>
        <p>
          Upload an approved integration package to run the same v1 contract,
          schema, fingerprint, freshness, expiry and replay checks expected of a
          future Rosie Dazzlers or Devil n Dove receiver. This simulation never
          writes either business application.
        </p>
        <input
          accept=".json,application/json"
          disabled={pending}
          onChange={(event) =>
            void verifyPackageFile(event.target.files?.[0])
          }
          type="file"
        />
        <button
          disabled={pending}
          onClick={() => void resetSimulationRegistry()}
          type="button"
        >
          Clear simulation replay registry
        </button>

        {verification ? (
          <div
            className={
              "integrationVerificationResult " +
              (verification.valid
                ? "integrationVerificationValid"
                : "integrationVerificationInvalid")
            }
          >
            <strong>
              {verification.valid ? "ACCEPTED" : "REJECTED"} ·{" "}
              {verification.code}
            </strong>
            <small>
              {verification.packageId || "no package ID"}
              {verification.fingerprint
                ? " · fingerprint " + verification.fingerprint
                : ""}
            </small>
            {verification.errors.length ? (
              <ul>
                {verification.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            {verification.warnings.length ? (
              <ul>
                {verification.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="integrationBoundary">
        <strong>Transport boundary</strong>
        <p>
          Build 022 exports and independently verifies an approved v1 package,
          including stable package/replay identity and freshness metadata. It
          still does not invent a production endpoint, store business
          credentials, or write directly into Rosie Dazzlers or Devil n Dove
          databases.
        </p>
      </div>

      {message ? (
        <p className="integrationMessage" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
