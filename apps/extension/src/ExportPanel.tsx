import { useMemo, useState } from "react";

import {
  buildCsv,
  buildJson,
  buildXlsx,
  downloadBlob,
  exportFilenameBase
} from "./export-engine";
import type {
  ExportColumn,
  ExportColumnScope,
  ExportFormat,
  ExportRecord,
  ExportRowScope,
  ExportValueView,
  ExtractionRecordResult,
  PreparedExport,
  ReviewColumn,
  ReviewRow
} from "./types";

interface ExportPanelProps {
  recipeName: string;
  sourceUrl: string;
  columns: ReviewColumn[];
  rows: ReviewRow[];
  originalRecords: ExtractionRecordResult[];
}

interface RecordEvidence {
  sourceUrl: string;
  page: number | null;
  detailUrl: string;
  detailPageIndex: number | null;
  detailStatus: number | null;
  detailReused: boolean | null;
  detailError: string;
}

function evidenceFor(
  record: ExtractionRecordResult | undefined,
  fallbackSourceUrl: string
): RecordEvidence {
  if (!record) {
    return {
      sourceUrl: fallbackSourceUrl,
      page: null,
      detailUrl: "",
      detailPageIndex: null,
      detailStatus: null,
      detailReused: null,
      detailError: ""
    };
  }

  const raw = record as unknown as Record<string, unknown>;
  const detailEvidence =
    raw.evidence && typeof raw.evidence === "object"
      ? (raw.evidence as Record<string, unknown>)
      : null;

  return {
    sourceUrl:
      typeof raw.sourceUrl === "string" ? raw.sourceUrl : fallbackSourceUrl,
    page: typeof raw.page === "number" ? raw.page : null,
    detailUrl: typeof raw.detailUrl === "string" ? raw.detailUrl : "",
    detailPageIndex:
      typeof raw.detailPageIndex === "number" ? raw.detailPageIndex : null,
    detailStatus:
      detailEvidence && typeof detailEvidence.status === "number"
        ? detailEvidence.status
        : null,
    detailReused:
      detailEvidence && typeof detailEvidence.reused === "boolean"
        ? detailEvidence.reused
        : null,
    detailError:
      detailEvidence && typeof detailEvidence.error === "string"
        ? detailEvidence.error
        : ""
  };
}

function metadataColumns(records: ExportRecord[]) {
  const columns: ExportColumn[] = [
    { key: "__source_url", label: "Source URL" }
  ];

  if (records.some((record) => record.page !== null)) {
    columns.push({ key: "__page", label: "Source Page / Step" });
  }

  if (records.some((record) => record.detailUrl)) {
    columns.push({ key: "__detail_url", label: "Detail URL" });
  }

  if (records.some((record) => record.detailPageIndex !== null)) {
    columns.push({
      key: "__detail_page_index",
      label: "Detail Fetch Index"
    });
  }

  if (records.some((record) => record.detailStatus !== null)) {
    columns.push({
      key: "__detail_status",
      label: "Detail HTTP Status"
    });
  }

  if (records.some((record) => record.detailReused !== null)) {
    columns.push({
      key: "__detail_reused",
      label: "Detail Fetch Reused"
    });
  }

  if (records.some((record) => record.detailError)) {
    columns.push({
      key: "__detail_error",
      label: "Detail Fetch Error"
    });
  }

  return columns;
}

function withMetadataValues(record: ExportRecord) {
  return {
    ...record.values,
    __source_url: record.sourceUrl,
    __page: record.page,
    __detail_url: record.detailUrl || null,
    __detail_page_index: record.detailPageIndex,
    __detail_status: record.detailStatus,
    __detail_reused:
      record.detailReused === null
        ? null
        : record.detailReused
          ? "yes"
          : "no",
    __detail_error: record.detailError || null
  };
}

export function ExportPanel({
  recipeName,
  sourceUrl,
  columns,
  rows,
  originalRecords
}: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [valueView, setValueView] = useState<ExportValueView>("reviewed");
  const [rowScope, setRowScope] = useState<ExportRowScope>("included");
  const [columnScope, setColumnScope] =
    useState<ExportColumnScope>("visible");
  const [includeWarnings, setIncludeWarnings] = useState(true);
  const [includeSourceEvidence, setIncludeSourceEvidence] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const orderedColumns = useMemo(
    () => [...columns].sort((left, right) => left.position - right.position),
    [columns]
  );

  const selectedDataColumns = useMemo(
    () =>
      orderedColumns
        .filter((column) => columnScope === "all" || !column.dropped)
        .map((column) => ({
          key: column.key,
          label: column.label
        })),
    [columnScope, orderedColumns]
  );

  const selectedRows = useMemo(
    () => rows.filter((row) => rowScope === "all" || row.included),
    [rowScope, rows]
  );

  const prepared = useMemo<PreparedExport>(() => {
    const rawByIndex = new Map(
      originalRecords.map((record) => [record.index, record])
    );
    const records: ExportRecord[] = selectedRows.map((row) => {
      const original = rawByIndex.get(row.sourceIndex);
      const evidence = evidenceFor(original, sourceUrl);
      const selectedValues =
        valueView === "raw" && original
          ? original.values
          : row.values;

      const values: Record<string, string | number | null> = {};

      for (const column of selectedDataColumns) {
        values[column.key] = selectedValues[column.key] ?? null;
      }

      return {
        sourceIndex: row.sourceIndex,
        values,
        warnings: [...row.warnings],
        included: row.included,
        ...evidence
      };
    });

    let exportColumns: ExportColumn[] = [...selectedDataColumns];
    let exportRecords = records;

    if (includeWarnings) {
      exportColumns = [
        ...exportColumns,
        { key: "__warnings", label: "Warnings" }
      ];
      exportRecords = exportRecords.map((record) => ({
        ...record,
        values: {
          ...record.values,
          __warnings: record.warnings.join(" | ") || null
        }
      }));
    }

    if (includeSourceEvidence) {
      const evidenceColumns = metadataColumns(records);
      exportColumns = [...exportColumns, ...evidenceColumns];
      exportRecords = exportRecords.map((record) => ({
        ...record,
        values: withMetadataValues(record)
      }));
    }

    const generatedAt = new Date().toISOString();

    return {
      filenameBase: exportFilenameBase(recipeName, generatedAt),
      generatedAt,
      recipeName,
      sourceUrl,
      valueView,
      includeWarnings,
      includeSourceEvidence,
      columns: exportColumns,
      records: exportRecords
    };
  }, [
    includeSourceEvidence,
    includeWarnings,
    originalRecords,
    recipeName,
    selectedDataColumns,
    selectedRows,
    sourceUrl,
    valueView
  ]);

  function exportDataset() {
    setStatus(null);

    if (!prepared.columns.length) {
      setStatus("Export needs at least one selected column.");
      return;
    }

    if (!prepared.records.length) {
      setStatus("Export needs at least one selected row.");
      return;
    }

    try {
      const extension = format;
      const filename = `${prepared.filenameBase}.${extension}`;
      const blob =
        format === "csv"
          ? buildCsv(prepared)
          : format === "json"
            ? buildJson(prepared)
            : buildXlsx(prepared);

      downloadBlob(blob, filename);
      setStatus(
        `Exported ${prepared.records.length} rows × ${prepared.columns.length} columns as ${format.toUpperCase()}.`
      );
    } catch (reason) {
      setStatus(
        reason instanceof Error
          ? `Export failed: ${reason.message}`
          : "Export failed."
      );
    }
  }

  return (
    <section className="exportPanel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Build 011</p>
          <h2>CSV / XLSX / JSON export</h2>
        </div>
        <span className="exportBadge">
          {prepared.records.length} rows
        </span>
      </div>

      <p className="exportIntro">
        Export the reviewed working copy or the original extracted values.
        Files are generated locally in the extension and are not uploaded.
      </p>

      <div className="exportGrid">
        <label>
          Format
          <select
            onChange={(event) =>
              setFormat(event.target.value as ExportFormat)
            }
            value={format}
          >
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
            <option value="json">JSON (.json)</option>
          </select>
        </label>

        <label>
          Values
          <select
            onChange={(event) =>
              setValueView(event.target.value as ExportValueView)
            }
            value={valueView}
          >
            <option value="reviewed">Reviewed / edited values</option>
            <option value="raw">Original extracted values</option>
          </select>
        </label>

        <label>
          Rows
          <select
            onChange={(event) =>
              setRowScope(event.target.value as ExportRowScope)
            }
            value={rowScope}
          >
            <option value="included">Included rows only</option>
            <option value="all">All rows</option>
          </select>
        </label>

        <label>
          Columns
          <select
            onChange={(event) =>
              setColumnScope(event.target.value as ExportColumnScope)
            }
            value={columnScope}
          >
            <option value="visible">Visible columns only</option>
            <option value="all">All columns including dropped</option>
          </select>
        </label>
      </div>

      <div className="exportOptions">
        <label>
          <input
            checked={includeWarnings}
            onChange={(event) => setIncludeWarnings(event.target.checked)}
            type="checkbox"
          />
          Include row warnings
        </label>
        <label>
          <input
            checked={includeSourceEvidence}
            onChange={(event) =>
              setIncludeSourceEvidence(event.target.checked)
            }
            type="checkbox"
          />
          Include source/detail evidence
        </label>
      </div>

      <div className="exportPreview">
        <strong>
          {prepared.records.length} rows × {prepared.columns.length} columns
        </strong>
        <span>
          {valueView === "reviewed" ? "reviewed" : "raw"} ·{" "}
          {rowScope === "included" ? "included rows" : "all rows"} ·{" "}
          {columnScope === "visible" ? "visible columns" : "all columns"}
        </span>
      </div>

      <button className="exportButton" onClick={exportDataset} type="button">
        Export {format.toUpperCase()}
      </button>

      {status ? <p className="exportStatus" role="status">{status}</p> : null}
    </section>
  );
}
