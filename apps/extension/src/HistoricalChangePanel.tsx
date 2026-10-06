import { useEffect, useMemo, useState } from "react";

import {
  deleteHistoricalSeries,
  findHistoricalSeries,
  saveHistoricalCapture,
  updateHistoricalReviewStatus
} from "./history-store";
import type {
  HistoricalChangeItem,
  HistoricalSeries,
  HistoryReviewStatus,
  ReviewColumn,
  ReviewRow
} from "./types";

interface HistoricalChangePanelProps {
  recipeName: string;
  sourceUrl: string;
  columns: ReviewColumn[];
  rows: ReviewRow[];
}

type QueueFilter = "pending" | "all";

function formatValue(value: string | number | null) {
  if (value === null) {
    return "∅";
  }

  const text = String(value);
  return text.length > 90 ? text.slice(0, 87) + "…" : text;
}

function changeLabel(change: HistoricalChangeItem) {
  if (change.kind === "added") return "Added";
  if (change.kind === "removed") return "Removed";
  return "Changed";
}

export function HistoricalChangePanel({
  recipeName,
  sourceUrl,
  columns,
  rows
}: HistoricalChangePanelProps) {
  const visibleColumns = useMemo(
    () =>
      [...columns]
        .sort((left, right) => left.position - right.position)
        .filter((column) => !column.dropped),
    [columns]
  );
  const includedRows = useMemo(
    () => rows.filter((row) => row.included),
    [rows]
  );
  const [identityKey, setIdentityKey] = useState(
    () => visibleColumns[0]?.key ?? ""
  );
  const [series, setSeries] = useState<HistoricalSeries | null>(null);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("pending");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visibleColumns.some((column) => column.key === identityKey)) {
      setIdentityKey(visibleColumns[0]?.key ?? "");
    }
  }, [identityKey, visibleColumns]);

  useEffect(() => {
    let cancelled = false;

    if (!identityKey) {
      setSeries(null);
      return;
    }

    void findHistoricalSeries(recipeName, sourceUrl, identityKey)
      .then((result) => {
        if (!cancelled) {
          setSeries(result);
          setMessage(null);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setSeries(null);
          setMessage(
            reason instanceof Error
              ? reason.message
              : "Historical storage is unavailable."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [identityKey, recipeName, sourceUrl]);

  const queue = useMemo(() => {
    const changes = series ? [...series.changes].reverse() : [];
    return changes
      .filter(
        (change) =>
          queueFilter === "all" || change.reviewStatus === "pending"
      )
      .slice(0, 60);
  }, [queueFilter, series]);

  async function capture() {
    if (!identityKey) {
      setMessage("Choose an identity field before capturing history.");
      return;
    }

    setPending(true);
    setMessage(null);

    try {
      const result = await saveHistoricalCapture({
        recipeName,
        sourceUrl,
        identityKey,
        fields: visibleColumns.map((column) => ({
          key: column.key,
          label: column.label
        })),
        rows: includedRows.map((row) => ({
          sourceIndex: row.sourceIndex,
          values: { ...row.values }
        }))
      });

      setSeries(result.series);

      if (result.summary.baseline) {
        setMessage(
          "Baseline v" +
            result.summary.snapshotVersion +
            " saved with " +
            includedRows.length +
            " reviewed records."
        );
      } else {
        setMessage(
          "Captured v" +
            result.summary.snapshotVersion +
            ": " +
            result.summary.added +
            " added, " +
            result.summary.removed +
            " removed, " +
            result.summary.changed +
            " changed, " +
            result.summary.unchanged +
            " unchanged."
        );
      }
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to capture historical snapshot."
      );
    } finally {
      setPending(false);
    }
  }

  async function setReviewStatus(
    changeId: string,
    reviewStatus: HistoryReviewStatus
  ) {
    if (!series) {
      return;
    }

    setPending(true);
    setMessage(null);

    try {
      const updated = await updateHistoricalReviewStatus(
        series.id,
        changeId,
        reviewStatus
      );
      setSeries(updated);
      setMessage(
        reviewStatus === "pending"
          ? "Change returned to the pending review queue."
          : reviewStatus === "reviewed"
            ? "Change marked reviewed."
            : "Change dismissed."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to update the review queue."
      );
    } finally {
      setPending(false);
    }
  }

  async function clearHistory() {
    if (!series) {
      return;
    }

    setPending(true);
    setMessage(null);

    try {
      await deleteHistoricalSeries(series.id);
      setSeries(null);
      setMessage("Historical series cleared for this identity field.");
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to clear historical series."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="historyPanel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Build 013</p>
          <h2>Historical change detection</h2>
        </div>
        <span className="historyBadge">
          {series ? "v" + series.latestVersion : "new"}
        </span>
      </div>

      <p className="historyIntro">
        Capture reviewed rows as explicit local versions. Changes are matched by
        one identity field and placed into a review queue instead of being
        accepted automatically.
      </p>

      <label className="historyIdentity">
        Record identity field
        <select
          disabled={pending || !visibleColumns.length}
          onChange={(event) => {
            setIdentityKey(event.target.value);
            setMessage(null);
          }}
          value={identityKey}
        >
          {visibleColumns.map((column) => (
            <option key={column.id} value={column.key}>
              {column.label}
            </option>
          ))}
        </select>
        <small>
          Choose a visible field that is unique and stable for every included
          record, such as an ID, SKU, URL, or unique name.
        </small>
      </label>

      <div className="historyCaptureInfo">
        <span>{includedRows.length} included rows</span>
        <span>{visibleColumns.length} visible fields</span>
        <span>
          {series ? series.snapshots.length + " retained snapshots" : "no baseline yet"}
        </span>
      </div>

      <button
        className="historyCaptureButton"
        disabled={
          pending ||
          !identityKey ||
          !visibleColumns.length ||
          !includedRows.length
        }
        onClick={capture}
        type="button"
      >
        {pending ? "Working…" : series ? "Capture next version" : "Capture baseline"}
      </button>

      {series ? (
        <>
          <div className="historySummary">
            <div>
              <strong>{series.lastSummary.added}</strong>
              <span>added</span>
            </div>
            <div>
              <strong>{series.lastSummary.removed}</strong>
              <span>removed</span>
            </div>
            <div>
              <strong>{series.lastSummary.changed}</strong>
              <span>changed</span>
            </div>
            <div>
              <strong>{series.lastSummary.unchanged}</strong>
              <span>unchanged</span>
            </div>
          </div>

          <div className="historyVersions">
            <div className="historyVersionsHeader">
              <strong>Record versions</strong>
              <span>{series.snapshots.length} retained</span>
            </div>
            {[...series.snapshots]
              .reverse()
              .slice(0, 5)
              .map((snapshot) => (
                <div key={snapshot.id}>
                  <strong>v{snapshot.snapshotVersion}</strong>
                  <span>{snapshot.records.length} records</span>
                  <small>{new Date(snapshot.capturedAt).toLocaleString()}</small>
                </div>
              ))}
          </div>

          <div className="historyQueueHeader">
            <div>
              <strong>Change review queue</strong>
              <span>
                {series.lastSummary.pendingQueue} pending · {series.changes.length} total
              </span>
            </div>
            <div>
              <button
                className={queueFilter === "pending" ? "active" : ""}
                onClick={() => setQueueFilter("pending")}
                type="button"
              >
                Pending
              </button>
              <button
                className={queueFilter === "all" ? "active" : ""}
                onClick={() => setQueueFilter("all")}
                type="button"
              >
                All
              </button>
            </div>
          </div>

          {queue.length ? (
            <div className="historyQueue">
              {queue.map((change) => (
                <article key={change.id}>
                  <div className="historyChangeTop">
                    <div>
                      <span className={"historyKind historyKind-" + change.kind}>
                        {changeLabel(change)}
                      </span>
                      <strong>{change.identity}</strong>
                    </div>
                    <small>
                      v{change.fromVersion ?? "—"} → v{change.toVersion} ·{" "}
                      {change.reviewStatus}
                    </small>
                  </div>

                  <div className="historyFieldChanges">
                    {change.fields.slice(0, 8).map((field) => (
                      <div key={field.key}>
                        <strong>{field.label}</strong>
                        <span>{formatValue(field.before)}</span>
                        <b>→</b>
                        <span>{formatValue(field.after)}</span>
                      </div>
                    ))}
                    {change.fields.length > 8 ? (
                      <small>
                        +{change.fields.length - 8} more changed fields
                      </small>
                    ) : null}
                  </div>

                  <div className="historyReviewActions">
                    {change.reviewStatus !== "reviewed" ? (
                      <button
                        disabled={pending}
                        onClick={() => setReviewStatus(change.id, "reviewed")}
                        type="button"
                      >
                        Mark reviewed
                      </button>
                    ) : null}
                    {change.reviewStatus !== "dismissed" ? (
                      <button
                        disabled={pending}
                        onClick={() => setReviewStatus(change.id, "dismissed")}
                        type="button"
                      >
                        Dismiss
                      </button>
                    ) : null}
                    {change.reviewStatus !== "pending" ? (
                      <button
                        disabled={pending}
                        onClick={() => setReviewStatus(change.id, "pending")}
                        type="button"
                      >
                        Reopen
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="historyEmpty">
              {queueFilter === "pending"
                ? "No pending historical changes."
                : "No historical changes have been detected yet."}
            </p>
          )}

          <button
            className="historyClear"
            disabled={pending}
            onClick={clearHistory}
            type="button"
          >
            Clear history for this identity field
          </button>
        </>
      ) : (
        <p className="historyEmpty">
          Capture a baseline after reviewing the rows. The next capture will
          compare records and individual field observations against it.
        </p>
      )}

      {message ? (
        <p className="historyStatus" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
