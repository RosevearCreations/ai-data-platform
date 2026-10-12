"use client";

import { useMemo, useState } from "react";

import type {
  DataReviewBatch,
  DataReviewRow,
  DataReviewWorkbenchModel
} from "@/lib/data-review-workbench";

import { HelpInfo } from "../help/HelpInfo";

type DraftRow = {
  id: string;
  included: boolean;
  cleanedText: string;
};

async function requestJson(
  url: string,
  method: "POST" | "PATCH",
  body: Record<string, unknown>
) {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : "Data review request failed."
    );
  }
  return payload;
}

function buildDraftRows(batch: DataReviewBatch): DraftRow[] {
  return batch.rows.map((row) => ({
    id: row.id,
    included: row.included,
    cleanedText: JSON.stringify(row.cleaned, null, 2)
  }));
}

function parseDraftRows(batch: DataReviewBatch, drafts: DraftRow[]) {
  const current = new Map(batch.rows.map((row) => [row.id, row]));
  return drafts.map((draft) => {
    const source = current.get(draft.id);
    if (!source) throw new Error("A review row changed unexpectedly. Refresh the workbench.");
    const cleaned = JSON.parse(draft.cleanedText) as unknown;
    if (!cleaned || typeof cleaned !== "object" || Array.isArray(cleaned)) {
      throw new Error("Each cleaned row must be a JSON object.");
    }
    return {
      id: draft.id,
      included: draft.included,
      cleaned
    };
  });
}

function downloadApproval(batch: DataReviewBatch) {
  const included = batch.rows
    .filter((row) => row.included)
    .map((row) => row.cleaned);
  const artifact = {
    schema: "ai-data-platform.data-review-approval.v1",
    reviewId: batch.reviewId,
    workspace: {
      id: batch.workspaceId,
      name: batch.workspaceName
    },
    source: {
      datasetId: batch.sourceDatasetId,
      serverVersion: batch.sourceServerVersion,
      fingerprint: batch.sourceFingerprint,
      title: batch.title,
      url: batch.sourceUrl
    },
    decision: {
      status: batch.status,
      approvedBy: batch.approvedBy,
      approvedAt: batch.approvedAt,
      rejectedBy: batch.rejectedBy,
      rejectedAt: batch.rejectedAt,
      note: batch.reviewNote
    },
    cleanupSummary: batch.cleanupSummary,
    rows: included
  };
  const blob = new Blob([JSON.stringify(artifact, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    "data-review-" +
    batch.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
    ".json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function issueLabel(issue: string) {
  return issue.replaceAll("-", " ").replace(":", " ");
}

export function DataReviewWorkbench({
  initialModel
}: {
  initialModel: DataReviewWorkbenchModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [workspaceFilter, setWorkspaceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeReviewId, setActiveReviewId] = useState(
    initialModel.batches.find((batch) => batch.status === "in-review")?.reviewId ?? ""
  );
  const [draftRows, setDraftRows] = useState<DraftRow[]>(() => {
    const batch = initialModel.batches.find(
      (item) => item.reviewId === activeReviewId
    );
    return batch ? buildDraftRows(batch) : [];
  });
  const [reviewNote, setReviewNote] = useState(() => {
    const batch = initialModel.batches.find(
      (item) => item.reviewId === activeReviewId
    );
    return batch?.reviewNote ?? "";
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const activeBatch =
    model.batches.find((batch) => batch.reviewId === activeReviewId) ?? null;

  const visibleCandidates = useMemo(
    () =>
      model.candidates.filter(
        (candidate) =>
          !workspaceFilter || candidate.workspaceId === workspaceFilter
      ),
    [model.candidates, workspaceFilter]
  );

  const visibleBatches = useMemo(
    () =>
      model.batches.filter(
        (batch) =>
          (!workspaceFilter || batch.workspaceId === workspaceFilter) &&
          (!statusFilter || batch.status === statusFilter)
      ),
    [model.batches, workspaceFilter, statusFilter]
  );

  function openBatch(batch: DataReviewBatch) {
    setActiveReviewId(batch.reviewId);
    setDraftRows(buildDraftRows(batch));
    setReviewNote(batch.reviewNote);
    setMessage("");
  }

  async function startReview(
    workspaceId: string,
    datasetId: string
  ) {
    setBusy("create:" + datasetId);
    setMessage("");
    try {
      const payload = await requestJson("/api/data-review", "POST", {
        action: "create",
        workspaceId,
        datasetId
      }) as { reviewId: string; model: DataReviewWorkbenchModel };
      setModel(payload.model);
      const batch = payload.model.batches.find(
        (item) => item.reviewId === payload.reviewId
      );
      if (batch) openBatch(batch);
      setMessage("Review batch created from the current durable dataset version.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start review.");
    } finally {
      setBusy("");
    }
  }

  async function saveActive() {
    if (!activeBatch || activeBatch.status !== "in-review") return;
    setBusy("save");
    setMessage("");
    try {
      const rows = parseDraftRows(activeBatch, draftRows);
      const next = await requestJson("/api/data-review", "PATCH", {
        action: "save",
        workspaceId: activeBatch.workspaceId,
        reviewId: activeBatch.reviewId,
        rows,
        reviewNote
      }) as DataReviewWorkbenchModel;
      setModel(next);
      const refreshed = next.batches.find(
        (item) => item.reviewId === activeBatch.reviewId
      );
      if (refreshed) openBatch(refreshed);
      setMessage("Cleanup draft saved with a new audit event.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save review.");
    } finally {
      setBusy("");
    }
  }

  async function decide(action: "approve" | "reject") {
    if (!activeBatch || activeBatch.status !== "in-review") return;
    setBusy(action);
    setMessage("");
    try {
      if (action === "approve") {
        const rows = parseDraftRows(activeBatch, draftRows);
        const saved = await requestJson("/api/data-review", "PATCH", {
          action: "save",
          workspaceId: activeBatch.workspaceId,
          reviewId: activeBatch.reviewId,
          rows,
          reviewNote
        }) as DataReviewWorkbenchModel;
        setModel(saved);
      }
      const next = await requestJson("/api/data-review", "PATCH", {
        action,
        workspaceId: activeBatch.workspaceId,
        reviewId: activeBatch.reviewId,
        reviewNote
      }) as DataReviewWorkbenchModel;
      setModel(next);
      const refreshed = next.batches.find(
        (item) => item.reviewId === activeBatch.reviewId
      );
      if (refreshed) openBatch(refreshed);
      setMessage(
        action === "approve"
          ? "Review approved. The approved snapshot is now durable and auditable."
          : "Review rejected. The source evidence remains unchanged."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review decision failed.");
    } finally {
      setBusy("");
    }
  }

  function updateDraft(
    id: string,
    patch: Partial<Pick<DraftRow, "included" | "cleanedText">>
  ) {
    setDraftRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  return (
    <>
      <section className="reviewSummary" aria-labelledby="review-summary-heading">
        <div className="sectionHeading">
          <p className="eyebrow">Durable review queue</p>
          <h2 id="review-summary-heading">Review status</h2>
          <HelpInfo topic="data-review-overview" />
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.candidates}</strong><span>dataset candidates</span></article>
          <article><strong>{model.totals.inReview}</strong><span>in review</span></article>
          <article><strong>{model.totals.approved}</strong><span>approved</span></article>
          <article><strong>{model.totals.rejected}</strong><span>rejected</span></article>
          <article><strong>{model.totals.rowsInReview}</strong><span>included rows waiting</span></article>
        </div>
      </section>

      <section className="reviewFilters" aria-label="Review workbench filters">
        <label>
          Workspace
          <select value={workspaceFilter} onChange={(event) => setWorkspaceFilter(event.target.value)}>
            <option value="">All authorized workspaces</option>
            {model.workspaces.map((workspace) => (
              <option value={workspace.id} key={workspace.id}>
                {workspace.name} · {workspace.role}
              </option>
            ))}
          </select>
        </label>
        <label>
          Review status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All review states</option>
            <option value="in-review">In review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
      </section>

      {message ? <p className="reviewMessage">{message}</p> : null}

      <section className="reviewQueue" aria-labelledby="review-candidates-heading">
        <div className="sectionHeading">
          <p className="eyebrow">Source snapshots</p>
          <h2 id="review-candidates-heading">Available dataset versions</h2>
          <HelpInfo topic="data-review-rows" />
        </div>
        <div className="reviewCandidateGrid">
          {visibleCandidates.map((candidate) => (
            <article className="reviewCandidate" key={candidate.workspaceId + ":" + candidate.datasetId + ":" + candidate.serverVersion}>
              <div>
                <span className="badge">{candidate.workspaceName} · v{candidate.serverVersion}</span>
                <h3>{candidate.recipeName}</h3>
                <p>{candidate.rowCount} source row(s) · {new Date(candidate.retrievedAt).toLocaleString()}</p>
                {candidate.sourceUrl ? <small>{candidate.sourceUrl}</small> : null}
              </div>
              <div className="heroActions">
                {candidate.reviewId ? (
                  <button
                    className="secondaryButton"
                    type="button"
                    onClick={() => {
                      const batch = model.batches.find((item) => item.reviewId === candidate.reviewId);
                      if (batch) openBatch(batch);
                    }}
                  >
                    Open {candidate.reviewStatus}
                  </button>
                ) : (
                  <button
                    className="primary"
                    type="button"
                    disabled={Boolean(busy) || candidate.rowCount < 1}
                    onClick={() => void startReview(candidate.workspaceId, candidate.datasetId)}
                  >
                    {busy === "create:" + candidate.datasetId ? "Starting…" : "Start review"}
                  </button>
                )}
              </div>
            </article>
          ))}
          {!visibleCandidates.length ? (
            <div className="emptyState">No current reviewed-dataset versions match this workspace filter.</div>
          ) : null}
        </div>
      </section>

      <section className="reviewQueue" aria-labelledby="review-batches-heading">
        <div className="sectionHeading">
          <p className="eyebrow">Audit trail</p>
          <h2 id="review-batches-heading">Review batches</h2>
        </div>
        <div className="reviewBatchList">
          {visibleBatches.map((batch) => (
            <article className={"reviewBatchSummary " + (batch.reviewId === activeReviewId ? "reviewBatchActive" : "")} key={batch.reviewId}>
              <div>
                <span className={"reviewStatus reviewStatus-" + batch.status}>{batch.status}</span>
                <h3>{batch.title}</h3>
                <p>{batch.includedCount}/{batch.rowCount} included · {batch.eventCount} audit event(s)</p>
              </div>
              <div className="heroActions">
                <button className="secondaryButton" type="button" onClick={() => openBatch(batch)}>
                  Inspect
                </button>
                {batch.status !== "in-review" ? (
                  <button className="secondaryButton" type="button" onClick={() => downloadApproval(batch)}>
                    Download decision
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {activeBatch ? (
        <section className="reviewEditor" aria-labelledby="review-editor-heading">
          <div className="sectionHeading">
            <p className="eyebrow">{activeBatch.workspaceName} · {activeBatch.status}</p>
            <h2 id="review-editor-heading">{activeBatch.title}</h2>
            <HelpInfo topic="data-review-rows" />
          </div>
          <p className="reviewProvenance">
            Source dataset {activeBatch.sourceDatasetId} · version {activeBatch.sourceServerVersion} · fingerprint {activeBatch.sourceFingerprint}
          </p>

          {activeBatch.status === "in-review" ? (
            <>
              <label className="reviewNote">
                Review note
                <textarea
                  value={reviewNote}
                  maxLength={4000}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Why rows were changed, excluded, approved or rejected…"
                />
              </label>

              <div className="reviewRows">
                {activeBatch.rows.map((row: DataReviewRow) => {
                  const draft = draftRows.find((item) => item.id === row.id);
                  if (!draft) return null;
                  return (
                    <article className="reviewRow" key={row.id}>
                      <header>
                        <div>
                          <strong>{row.id}</strong>
                          <span>{row.changedFields} deterministic cleanup change(s)</span>
                        </div>
                        <label className="reviewInclude">
                          <input
                            type="checkbox"
                            checked={draft.included}
                            onChange={(event) => updateDraft(row.id, { included: event.target.checked })}
                          />
                          Include in approval
                        </label>
                      </header>
                      <div className="reviewIssues">
                        {row.issues.length
                          ? row.issues.map((issue) => <span key={issue}>{issueLabel(issue)}</span>)
                          : <span className="reviewClean">no automatic issue</span>}
                      </div>
                      <div className="reviewCompare">
                        <section>
                          <h4>Original evidence</h4>
                          <pre>{JSON.stringify(row.original, null, 2)}</pre>
                        </section>
                        <section>
                          <h4>Working cleaned row</h4>
                          <textarea
                            value={draft.cleanedText}
                            spellCheck={false}
                            onChange={(event) => updateDraft(row.id, { cleanedText: event.target.value })}
                          />
                        </section>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="reviewDecisionBar">
                <button className="secondaryButton" type="button" disabled={Boolean(busy)} onClick={() => void saveActive()}>
                  {busy === "save" ? "Saving…" : "Save cleanup draft"}
                </button>
                <button
                  className="primary"
                  type="button"
                  disabled={Boolean(busy) || !activeBatch.canApprove}
                  onClick={() => void decide("approve")}
                >
                  {busy === "approve" ? "Approving…" : "Approve reviewed data"}
                </button>
                <button
                  className="secondaryButton"
                  type="button"
                  disabled={Boolean(busy) || !activeBatch.canApprove}
                  onClick={() => void decide("reject")}
                >
                  {busy === "reject" ? "Rejecting…" : "Reject batch"}
                </button>
                {!activeBatch.canApprove ? <span>Owner/admin approval required.</span> : null}
              </div>
            </>
          ) : (
            <div className="reviewTerminal">
              <p>
                This decision is terminal for this exact source version and fingerprint.
                A changed source dataset version creates a new review candidate.
              </p>
              {activeBatch.reviewNote ? <p>Decision note: {activeBatch.reviewNote}</p> : null}
              <button className="secondaryButton" type="button" onClick={() => downloadApproval(activeBatch)}>
                Download decision snapshot
              </button>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
