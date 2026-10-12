"use client";

import { useMemo, useState } from "react";

import type {
  ApprovedDatasetPublishingModel,
  DatasetPublication,
  PublicationManifest
} from "@/lib/approved-dataset-publishing";

import { HelpInfo } from "../help/HelpInfo";

async function requestJson(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
) {
  const response = await fetch("/api/approved-data", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : "Approved-data request failed."
    );
  }
  return payload;
}

function manifestFor(publication: DatasetPublication): PublicationManifest {
  return {
    schema: "ai-data-platform.approved-dataset-publication.v1",
    publicationId: publication.publicationId,
    workspace: {
      id: publication.workspaceId,
      name: publication.workspaceName
    },
    review: {
      reviewId: publication.reviewId,
      approvedBy: publication.reviewApprovedBy,
      approvedAt: publication.reviewApprovedAt,
      approvalNote: publication.approvalNote
    },
    source: {
      datasetId: publication.sourceDatasetId,
      serverVersion: publication.sourceServerVersion,
      fingerprint: publication.sourceFingerprint,
      title: publication.title,
      url: publication.sourceUrl
    },
    publication: {
      status: publication.status,
      fingerprint: publication.publicationFingerprint,
      rowCount: publication.rowCount,
      fields: publication.fieldOrder,
      publishedBy: publication.publishedBy,
      publishedAt: publication.publishedAt,
      note: publication.publicationNote,
      withdrawnBy: publication.withdrawnBy,
      withdrawnAt: publication.withdrawnAt,
      withdrawalNote: publication.withdrawalNote
    },
    exportFormats: ["json", "csv"]
  };
}

export function ApprovedDatasetPublishing({
  initialModel
}: {
  initialModel: ApprovedDatasetPublishingModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [workspaceFilter, setWorkspaceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [publicationNotes, setPublicationNotes] = useState<Record<string, string>>({});
  const [withdrawalNotes, setWithdrawalNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const candidates = useMemo(
    () =>
      model.candidates.filter(
        (candidate) =>
          !workspaceFilter || candidate.workspaceId === workspaceFilter
      ),
    [model.candidates, workspaceFilter]
  );

  const publications = useMemo(
    () =>
      model.publications.filter(
        (publication) =>
          (!workspaceFilter || publication.workspaceId === workspaceFilter) &&
          (!statusFilter || publication.status === statusFilter)
      ),
    [model.publications, workspaceFilter, statusFilter]
  );

  async function refreshModel() {
    const response = await fetch("/api/approved-data", { cache: "no-store" });
    if (!response.ok) return;
    setModel((await response.json()) as ApprovedDatasetPublishingModel);
  }

  async function publish(workspaceId: string, reviewId: string) {
    setBusy("publish:" + reviewId);
    setMessage("");
    try {
      const payload = (await requestJson("POST", {
        action: "publish",
        workspaceId,
        reviewId,
        publicationNote: publicationNotes[reviewId] ?? ""
      })) as {
        publicationId: string;
        model: ApprovedDatasetPublishingModel;
      };
      setModel(payload.model);
      setMessage(
        "Approved review published as an immutable export handoff. JSON and CSV are now available."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to publish.");
    } finally {
      setBusy("");
    }
  }

  async function withdraw(publication: DatasetPublication) {
    setBusy("withdraw:" + publication.publicationId);
    setMessage("");
    try {
      const next = (await requestJson("PATCH", {
        action: "withdraw",
        workspaceId: publication.workspaceId,
        publicationId: publication.publicationId,
        withdrawalNote: withdrawalNotes[publication.publicationId] ?? ""
      })) as ApprovedDatasetPublishingModel;
      setModel(next);
      setMessage(
        "Publication withdrawn. New platform exports are blocked; previously downloaded copies cannot be recalled."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to withdraw publication.");
    } finally {
      setBusy("");
    }
  }

  async function exportPublication(
    publication: DatasetPublication,
    format: "json" | "csv"
  ) {
    setBusy("export:" + publication.publicationId + ":" + format);
    setMessage("");
    try {
      const response = await fetch("/api/approved-data/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: publication.workspaceId,
          publicationId: publication.publicationId,
          format
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload && typeof payload.error === "string"
            ? payload.error
            : "Export failed."
        );
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename =
        disposition.match(/filename="([^"]+)"/)?.[1] ??
        "approved-dataset." + format;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      await refreshModel();
      setMessage(
        format.toUpperCase() +
          " export created from the immutable publication snapshot and recorded in the audit trail."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to export.");
    } finally {
      setBusy("");
    }
  }

  async function copyManifest(publication: DatasetPublication) {
    setBusy("copy:" + publication.publicationId);
    setMessage("");
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(manifestFor(publication), null, 2)
      );
      setMessage("Publication handoff manifest copied.");
    } catch {
      setMessage("Clipboard access was unavailable. Use JSON export for the full handoff package.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <section className="publishSummary" aria-labelledby="publish-summary-heading">
        <div className="sectionHeading">
          <p className="eyebrow">Approved data handoff</p>
          <h2 id="publish-summary-heading">Publication status</h2>
          <HelpInfo topic="approved-data-overview" />
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.approvedCandidates}</strong><span>approved reviews</span></article>
          <article><strong>{model.totals.unpublished}</strong><span>waiting to publish</span></article>
          <article><strong>{model.totals.published}</strong><span>active publications</span></article>
          <article><strong>{model.totals.withdrawn}</strong><span>withdrawn</span></article>
          <article><strong>{model.totals.publishedRows}</strong><span>active published rows</span></article>
        </div>
      </section>

      <section className="publishFilters" aria-label="Approved data filters">
        <label>
          Workspace
          <select value={workspaceFilter} onChange={(event) => setWorkspaceFilter(event.target.value)}>
            <option value="">All authorized workspaces</option>
            {model.workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name} · {workspace.role}
              </option>
            ))}
          </select>
        </label>
        <label>
          Publication status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All publication states</option>
            <option value="published">Published</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </label>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="publishQueue" aria-labelledby="approved-candidates-heading">
        <div className="sectionHeading">
          <p className="eyebrow">Build 048 approvals</p>
          <h2 id="approved-candidates-heading">Approved review candidates</h2>
          <HelpInfo topic="approved-data-publish" />
        </div>
        <div className="publishCandidateGrid">
          {candidates.map((candidate) => (
            <article className="publishCandidate" key={candidate.reviewId}>
              <div>
                <span className="badge">{candidate.workspaceName} · v{candidate.sourceServerVersion}</span>
                <h3>{candidate.title}</h3>
                <p>{candidate.rowCount} approved row(s)</p>
                <small>
                  Approved {new Date(candidate.approvedAt).toLocaleString()}
                  {candidate.approvedBy ? " · " + candidate.approvedBy : ""}
                </small>
                <code>{candidate.sourceFingerprint}</code>
              </div>
              {candidate.publicationId ? (
                <span className={"publishState publishState-" + candidate.publicationStatus}>
                  {candidate.publicationStatus}
                </span>
              ) : (
                <div className="publishAction">
                  <label>
                    Publication note
                    <textarea
                      maxLength={4000}
                      value={publicationNotes[candidate.reviewId] ?? ""}
                      onChange={(event) =>
                        setPublicationNotes((notes) => ({
                          ...notes,
                          [candidate.reviewId]: event.target.value
                        }))
                      }
                      placeholder="Optional handoff purpose or recipient context…"
                    />
                  </label>
                  <button
                    className="primary"
                    type="button"
                    disabled={Boolean(busy) || !candidate.canPublish}
                    onClick={() => void publish(candidate.workspaceId, candidate.reviewId)}
                  >
                    {busy === "publish:" + candidate.reviewId
                      ? "Publishing…"
                      : "Publish approved snapshot"}
                  </button>
                  {!candidate.canPublish ? <small>Owner/admin publishing required.</small> : null}
                </div>
              )}
            </article>
          ))}
          {!candidates.length ? (
            <div className="emptyState">
              No approved Build 048 review batches match this workspace filter.
            </div>
          ) : null}
        </div>
      </section>

      <section className="publishQueue" aria-labelledby="publication-ledger-heading">
        <div className="sectionHeading">
          <p className="eyebrow">Immutable snapshots</p>
          <h2 id="publication-ledger-heading">Publication & export ledger</h2>
          <HelpInfo topic="approved-data-export" />
        </div>
        <div className="publicationList">
          {publications.map((publication) => (
            <article className="publicationCard" key={publication.publicationId}>
              <header>
                <div>
                  <span className={"publishState publishState-" + publication.status}>
                    {publication.status}
                  </span>
                  <h3>{publication.title}</h3>
                  <p>
                    {publication.rowCount} row(s) · {publication.fieldOrder.length} field(s) ·{" "}
                    {publication.eventCount} audit event(s)
                  </p>
                </div>
                <span className="badge">{publication.workspaceName}</span>
              </header>

              <dl className="publicationEvidence">
                <div><dt>Publication</dt><dd>{publication.publicationId}</dd></div>
                <div><dt>Fingerprint</dt><dd>{publication.publicationFingerprint}</dd></div>
                <div><dt>Review</dt><dd>{publication.reviewId}</dd></div>
                <div><dt>Source</dt><dd>{publication.sourceDatasetId} · v{publication.sourceServerVersion}</dd></div>
                <div><dt>Published</dt><dd>{new Date(publication.publishedAt).toLocaleString()}</dd></div>
              </dl>

              <div className="publicationFields">
                {publication.fieldOrder.map((field) => <span key={field}>{field}</span>)}
              </div>

              {publication.publicationNote ? (
                <p className="publicationNote">Publication note: {publication.publicationNote}</p>
              ) : null}
              {publication.status === "withdrawn" ? (
                <p className="publicationWithdrawal">
                  Withdrawn
                  {publication.withdrawnAt
                    ? " " + new Date(publication.withdrawnAt).toLocaleString()
                    : ""}
                  {publication.withdrawalNote ? " · " + publication.withdrawalNote : ""}
                </p>
              ) : null}

              <div className="heroActions">
                <button
                  className="secondaryButton"
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void copyManifest(publication)}
                >
                  Copy manifest
                </button>
                {publication.status === "published" ? (
                  <>
                    <button
                      className="secondaryButton"
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => void exportPublication(publication, "json")}
                    >
                      {busy === "export:" + publication.publicationId + ":json"
                        ? "Exporting…"
                        : "Download JSON"}
                    </button>
                    <button
                      className="secondaryButton"
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => void exportPublication(publication, "csv")}
                    >
                      {busy === "export:" + publication.publicationId + ":csv"
                        ? "Exporting…"
                        : "Download CSV"}
                    </button>
                  </>
                ) : null}
              </div>

              {publication.status === "published" && publication.canManage ? (
                <div className="withdrawPanel">
                  <label>
                    Withdrawal note
                    <input
                      maxLength={4000}
                      value={withdrawalNotes[publication.publicationId] ?? ""}
                      onChange={(event) =>
                        setWithdrawalNotes((notes) => ({
                          ...notes,
                          [publication.publicationId]: event.target.value
                        }))
                      }
                      placeholder="Why future exports should stop…"
                    />
                  </label>
                  <button
                    className="secondaryButton"
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void withdraw(publication)}
                  >
                    {busy === "withdraw:" + publication.publicationId
                      ? "Withdrawing…"
                      : "Withdraw publication"}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
          {!publications.length ? (
            <div className="emptyState">No publication snapshots exist for this filter yet.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
