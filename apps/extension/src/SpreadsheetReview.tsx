import { useMemo, useState } from "react";

import { DevilSupplierPanel } from "./DevilSupplierPanel";
import { requireActiveWorkspaceId } from "./workspace-session";
import { ExportPanel } from "./ExportPanel";
import { HistoricalChangePanel } from "./HistoricalChangePanel";
import { MovieMetadataPanel } from "./MovieMetadataPanel";
import { RosieCompetitivePanel } from "./RosieCompetitivePanel";
import type {
  ExtractionFieldRecipe,
  ExtractionRunResult,
  ReviewColumn,
  ReviewedDataset,
  ReviewRow
} from "./types";

interface SpreadsheetReviewProps {
  recipeName: string;
  fields: ExtractionFieldRecipe[];
  run: ExtractionRunResult;
}

type ReviewFilter = "all" | "included" | "warnings";

const STORAGE_KEY = "ai-data-platform:reviewed-datasets:v1";
const MAX_SAVED_DATASETS = 20;

function createDatasetId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `review-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function initialColumns(fields: ExtractionFieldRecipe[]): ReviewColumn[] {
  return fields.map((field, index) => ({
    id: field.id,
    key: field.key,
    label: field.label,
    position: index,
    dropped: false
  }));
}

function initialRows(run: ExtractionRunResult): ReviewRow[] {
  return run.records.map((record) => ({
    id: `row-${record.index}`,
    sourceIndex: record.index,
    included: true,
    values: { ...record.values },
    warnings: [...record.warnings],
    editedKeys: []
  }));
}

function saveDatasetLocally(dataset: ReviewedDataset) {
  const raw = localStorage.getItem(STORAGE_KEY);
  let existing: ReviewedDataset[] = [];

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        existing = parsed;
      }
    } catch {
      existing = [];
    }
  }

  const withoutCurrent = existing.filter((item) => item.id !== dataset.id);
  const next = [dataset, ...withoutCurrent].slice(0, MAX_SAVED_DATASETS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

  return next.length;
}

export function SpreadsheetReview({
  recipeName,
  fields,
  run
}: SpreadsheetReviewProps) {
  const [datasetId] = useState(createDatasetId);
  const [createdAt] = useState(() => new Date().toISOString());
  const [columns, setColumns] = useState<ReviewColumn[]>(() =>
    initialColumns(fields)
  );
  const [rows, setRows] = useState<ReviewRow[]>(() => initialRows(run));
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const orderedColumns = useMemo(
    () => [...columns].sort((left, right) => left.position - right.position),
    [columns]
  );

  const visibleColumns = orderedColumns.filter((column) => !column.dropped);
  const droppedColumns = orderedColumns.filter((column) => column.dropped);

  const currentWarnings = (row: ReviewRow) => {
    const baseWarnings = row.warnings.filter(
      (warning) => !warning.endsWith(": required value is missing.")
    );
    const requiredWarnings = fields
      .filter((field) => field.required)
      .filter((field) => {
        const value = row.values[field.key];
        return value === null || value === undefined || String(value).trim() === "";
      })
      .map((field) => `${field.label}: required value is missing.`);

    return [...baseWarnings, ...requiredWarnings];
  };

  const visibleRows = useMemo(() => {
    if (filter === "included") {
      return rows.filter((row) => row.included);
    }

    if (filter === "warnings") {
      return rows.filter((row) => currentWarnings(row).length > 0);
    }

    return rows;
  }, [filter, rows]);

  const stats = useMemo(() => {
    const includedRows = rows.filter((row) => row.included).length;
    const editedCells = rows.reduce(
      (total, row) => total + row.editedKeys.length,
      0
    );
    const warningRows = rows.filter(
      (row) => currentWarnings(row).length > 0
    ).length;

    return {
      totalRows: rows.length,
      includedRows,
      excludedRows: rows.length - includedRows,
      visibleColumns: visibleColumns.length,
      droppedColumns: droppedColumns.length,
      editedCells,
      warningRows
    };
  }, [droppedColumns.length, rows, visibleColumns.length]);

  function updateCell(rowId: string, key: string, value: string) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        const editedKeys = row.editedKeys.includes(key)
          ? row.editedKeys
          : [...row.editedKeys, key];

        return {
          ...row,
          values: {
            ...row.values,
            [key]: value === "" ? null : value
          },
          editedKeys
        };
      })
    );
    setSaveMessage(null);
  }

  function toggleRow(rowId: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, included: !row.included } : row
      )
    );
    setSaveMessage(null);
  }

  function setAllRows(included: boolean) {
    setRows((current) => current.map((row) => ({ ...row, included })));
    setSaveMessage(null);
  }

  function dropColumn(id: string) {
    setColumns((current) =>
      current.map((column) =>
        column.id === id ? { ...column, dropped: true } : column
      )
    );
    setSaveMessage(null);
  }

  function restoreColumn(id: string) {
    setColumns((current) =>
      current.map((column) =>
        column.id === id ? { ...column, dropped: false } : column
      )
    );
    setSaveMessage(null);
  }

  function restoreAllColumns() {
    setColumns((current) =>
      current.map((column) => ({ ...column, dropped: false }))
    );
    setSaveMessage(null);
  }

  function moveColumn(id: string, direction: -1 | 1) {
    const active = orderedColumns.filter((column) => !column.dropped);
    const index = active.findIndex((column) => column.id === id);
    const targetIndex = index + direction;

    if (index < 0 || targetIndex < 0 || targetIndex >= active.length) {
      return;
    }

    const currentId = active[index].id;
    const targetId = active[targetIndex].id;
    const currentPosition = active[index].position;
    const targetPosition = active[targetIndex].position;

    setColumns((current) =>
      current.map((column) => {
        if (column.id === currentId) {
          return { ...column, position: targetPosition };
        }

        if (column.id === targetId) {
          return { ...column, position: currentPosition };
        }

        return column;
      })
    );
    setSaveMessage(null);
  }

  function resetReview() {
    setColumns(initialColumns(fields));
    setRows(initialRows(run));
    setFilter("all");
    setSaveMessage(null);
  }

  async function saveReviewedDataset() {
    const updatedAt = new Date().toISOString();

    try {
      const workspaceId = await requireActiveWorkspaceId();
      const dataset: ReviewedDataset = {
      version: 1,
      id: datasetId,
      workspaceId,
      recipeName,
      sourceUrl: run.sourceUrl,
      createdAt,
      updatedAt,
      columns: orderedColumns,
      rows: rows.map((row) => ({
        ...row,
        warnings: currentWarnings(row)
      })),
      stats
      };

      const savedCount = saveDatasetLocally(dataset);
      setSaveMessage(
        `Saved locally · ${stats.includedRows} included rows · ${savedCount} reviewed dataset${savedCount === 1 ? "" : "s"} retained`
      );
    } catch (reason) {
      setSaveMessage(
        reason instanceof Error
          ? `Save failed: ${reason.message}`
          : "Save failed: extension storage is unavailable."
      );
    }
  }

  return (
    <section className="spreadsheetReview">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Build 007</p>
          <h2>Spreadsheet preview & review</h2>
        </div>
        <span className="reviewBadge">
          {stats.includedRows}/{stats.totalRows}
        </span>
      </div>

      <div className="reviewStats">
        <div>
          <strong>{stats.includedRows}</strong>
          <span>included rows</span>
        </div>
        <div>
          <strong>{stats.excludedRows}</strong>
          <span>excluded</span>
        </div>
        <div>
          <strong>{stats.editedCells}</strong>
          <span>edited cells</span>
        </div>
        <div>
          <strong>{stats.warningRows}</strong>
          <span>warning rows</span>
        </div>
      </div>

      <div className="reviewToolbar">
        <div className="reviewFilters" role="group" aria-label="Row filter">
          {([
            ["all", "All"],
            ["included", "Included"],
            ["warnings", "Warnings"]
          ] as const).map(([value, label]) => (
            <button
              className={filter === value ? "active" : ""}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="reviewBulkActions">
          <button onClick={() => setAllRows(true)} type="button">
            Include all
          </button>
          <button onClick={() => setAllRows(false)} type="button">
            Exclude all
          </button>
          <button onClick={resetReview} type="button">
            Reset
          </button>
        </div>
      </div>

      <div className="reviewColumns">
        <div className="reviewColumnsHeader">
          <strong>Columns</strong>
          <span>
            {stats.visibleColumns} shown · {stats.droppedColumns} dropped
          </span>
        </div>

        <div className="reviewColumnList">
          {visibleColumns.map((column, index) => (
            <div className="reviewColumnChip" key={column.id}>
              <span>{column.label}</span>
              <div>
                <button
                  aria-label={`Move ${column.label} left`}
                  disabled={index === 0}
                  onClick={() => moveColumn(column.id, -1)}
                  type="button"
                >
                  ←
                </button>
                <button
                  aria-label={`Move ${column.label} right`}
                  disabled={index === visibleColumns.length - 1}
                  onClick={() => moveColumn(column.id, 1)}
                  type="button"
                >
                  →
                </button>
                <button onClick={() => dropColumn(column.id)} type="button">
                  Drop
                </button>
              </div>
            </div>
          ))}
        </div>

        {droppedColumns.length ? (
          <details className="droppedColumns">
            <summary>
              Restore dropped columns ({droppedColumns.length})
            </summary>
            <div>
              {droppedColumns.map((column) => (
                <button
                  key={column.id}
                  onClick={() => restoreColumn(column.id)}
                  type="button"
                >
                  {column.label}
                </button>
              ))}
              <button onClick={restoreAllColumns} type="button">
                Restore all
              </button>
            </div>
          </details>
        ) : null}
      </div>

      <div className="reviewGridWrap">
        <table className="reviewGrid">
          <thead>
            <tr>
              <th className="reviewIncludeHead">Use</th>
              <th className="reviewRowHead">Row</th>
              {visibleColumns.map((column) => (
                <th key={column.id}>{column.label}</th>
              ))}
              <th className="reviewWarningHead">Warnings</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                className={row.included ? "" : "excludedRow"}
                key={row.id}
              >
                <td className="reviewIncludeCell">
                  <input
                    aria-label={`Include row ${row.sourceIndex + 1}`}
                    checked={row.included}
                    onChange={() => toggleRow(row.id)}
                    type="checkbox"
                  />
                </td>
                <td className="reviewRowNumber">{row.sourceIndex + 1}</td>
                {visibleColumns.map((column) => {
                  const edited = row.editedKeys.includes(column.key);
                  const value = row.values[column.key];

                  return (
                    <td
                      className={edited ? "editedCell" : ""}
                      key={column.id}
                    >
                      <textarea
                        aria-label={`Row ${row.sourceIndex + 1} ${column.label}`}
                        onChange={(event) =>
                          updateCell(row.id, column.key, event.target.value)
                        }
                        rows={2}
                        value={value === null || value === undefined ? "" : String(value)}
                      />
                    </td>
                  );
                })}
                <td className="reviewWarnings">
                  {currentWarnings(row).length ? (
                    <ul>
                      {currentWarnings(row).map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : (
                    <span>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!visibleRows.length ? (
        <p className="reviewEmpty">No rows match the current review filter.</p>
      ) : null}

      <HistoricalChangePanel
        columns={orderedColumns}
        recipeName={recipeName}
        rows={rows.map((row) => ({
          ...row,
          warnings: currentWarnings(row)
        }))}
        sourceUrl={run.sourceUrl}
      />

      <RosieCompetitivePanel
        columns={orderedColumns}
        rows={rows.map((row) => ({
          ...row,
          warnings: currentWarnings(row)
        }))}
        sourceUrl={run.sourceUrl}
      />

      <DevilSupplierPanel
        columns={orderedColumns}
        rows={rows.map((row) => ({
          ...row,
          warnings: currentWarnings(row)
        }))}
        sourceUrl={run.sourceUrl}
      />

      <MovieMetadataPanel
        columns={orderedColumns}
        rows={rows.map((row) => ({
          ...row,
          warnings: currentWarnings(row)
        }))}
        sourceUrl={run.sourceUrl}
      />

      <ExportPanel
        columns={orderedColumns}
        originalRecords={run.records}
        recipeName={recipeName}
        rows={rows.map((row) => ({
          ...row,
          warnings: currentWarnings(row)
        }))}
        sourceUrl={run.sourceUrl}
      />

      <div className="reviewSave">
        <button onClick={saveReviewedDataset} type="button">
          Save reviewed dataset locally
        </button>
        <p>
          Saves the review snapshot in the extension only. No business system is
          updated.
        </p>
        {saveMessage ? <strong role="status">{saveMessage}</strong> : null}
      </div>
    </section>
  );
}
