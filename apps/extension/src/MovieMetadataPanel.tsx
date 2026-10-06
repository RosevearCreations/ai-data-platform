import { useEffect, useMemo, useState } from "react";

import {
  metadataCandidatesFromRows,
  parseMovieCollectionFile
} from "./movie-metadata-engine";
import {
  assignMovieMatch,
  importMovieCollection,
  loadMovieMetadataModule,
  queueMovieMetadataMatches,
  removeMovieMatch,
  reviewMovieMatch,
  summarizeMovieQueue
} from "./movie-metadata-store";
import type {
  MovieCollectionImportMapping,
  MovieMatchReviewStatus,
  MovieMetadataMapping,
  MovieMetadataModuleDataset,
  MovieMetadataSource,
  ReviewColumn,
  ReviewRow
} from "./types";
import type { TabularRow } from "./movie-metadata-engine";

interface MovieMetadataPanelProps {
  columns: ReviewColumn[];
  rows: ReviewRow[];
  sourceUrl: string;
}

type CollectionMappingKey = keyof MovieCollectionImportMapping;
type MetadataMappingKey = keyof MovieMetadataMapping;

const COLLECTION_FIELDS: Array<{
  key: CollectionMappingKey;
  label: string;
  required?: boolean;
}> = [
  { key: "titleKey", label: "Owned title", required: true },
  { key: "yearKey", label: "Year" },
  { key: "upcKey", label: "UPC / barcode" },
  { key: "imdbKey", label: "IMDb ID" },
  { key: "tmdbKey", label: "TMDb ID" },
  { key: "omdbKey", label: "OMDb ID" },
  { key: "otherExternalIdKey", label: "Other external ID" },
  { key: "formatKey", label: "Owned format" },
  { key: "shelfLocationKey", label: "Shelf location" },
  { key: "conditionKey", label: "Condition" },
  { key: "notesKey", label: "Personal notes" }
];

const METADATA_FIELDS: Array<{
  key: MetadataMappingKey;
  label: string;
  required?: boolean;
}> = [
  { key: "titleKey", label: "Metadata title", required: true },
  { key: "yearKey", label: "Release year" },
  { key: "upcKey", label: "UPC / barcode" },
  { key: "imdbKey", label: "IMDb ID" },
  { key: "tmdbKey", label: "TMDb ID" },
  { key: "omdbKey", label: "OMDb ID" },
  { key: "otherExternalIdKey", label: "Other external ID" },
  { key: "genresKey", label: "Genres" },
  { key: "runtimeKey", label: "Runtime" },
  { key: "posterUrlKey", label: "Poster URL" },
  { key: "overviewKey", label: "Overview" },
  { key: "providerRecordIdKey", label: "Provider record ID" }
];

const PROVIDERS: Array<{
  value: MovieMetadataSource;
  label: string;
  note: string;
}> = [
  {
    value: "imdb-dataset",
    label: "IMDb datasets",
    note: "Official/non-interactive dataset intake; provider record ID is treated as IMDb ID when needed."
  },
  {
    value: "tmdb",
    label: "TMDb API/export",
    note: "Use only data obtained through a permitted TMDb API/export workflow."
  },
  {
    value: "omdb",
    label: "OMDb API/export",
    note: "Use only data obtained through a permitted OMDb API/export workflow."
  },
  {
    value: "other-permitted",
    label: "Other permitted API/dataset",
    note: "Operator-confirmed source whose terms allow this metadata use."
  }
];

const COLLECTION_HINTS: Record<CollectionMappingKey, string[][]> = {
  titleKey: [["title"], ["movie", "name"], ["name"]],
  yearKey: [["release", "year"], ["year"]],
  upcKey: [["upc"], ["barcode"], ["ean"]],
  imdbKey: [["imdb"]],
  tmdbKey: [["tmdb"]],
  omdbKey: [["omdb"]],
  otherExternalIdKey: [["external", "id"], ["catalog", "id"]],
  formatKey: [["format"], ["media", "type"], ["disc", "type"]],
  shelfLocationKey: [["shelf", "location"], ["shelf"], ["location"]],
  conditionKey: [["condition"]],
  notesKey: [["personal", "notes"], ["notes"], ["comments"]]
};

const METADATA_HINTS: Record<MetadataMappingKey, string[][]> = {
  titleKey: [["title"], ["movie", "name"], ["name"]],
  yearKey: [["release", "year"], ["year"], ["release", "date"]],
  upcKey: [["upc"], ["barcode"], ["ean"]],
  imdbKey: [["imdb"]],
  tmdbKey: [["tmdb"]],
  omdbKey: [["omdb"]],
  otherExternalIdKey: [["external", "id"]],
  genresKey: [["genres"], ["genre"]],
  runtimeKey: [["runtime"], ["duration"], ["minutes"]],
  posterUrlKey: [["poster", "url"], ["poster"], ["image", "url"], ["image"]],
  overviewKey: [["overview"], ["plot"], ["summary"], ["description"]],
  providerRecordIdKey: [["provider", "id"], ["record", "id"], ["id"]]
};

function normalizedName(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function guessFromNames(
  names: string[],
  hints: string[][]
) {
  for (const terms of hints) {
    const found = names.find((name) => {
      const searchable = normalizedName(name);
      return terms.every((term) => searchable.includes(term));
    });
    if (found) return found;
  }
  return "";
}

function guessCollectionMapping(columns: string[]): MovieCollectionImportMapping {
  return {
    titleKey: guessFromNames(columns, COLLECTION_HINTS.titleKey),
    yearKey: guessFromNames(columns, COLLECTION_HINTS.yearKey),
    upcKey: guessFromNames(columns, COLLECTION_HINTS.upcKey),
    imdbKey: guessFromNames(columns, COLLECTION_HINTS.imdbKey),
    tmdbKey: guessFromNames(columns, COLLECTION_HINTS.tmdbKey),
    omdbKey: guessFromNames(columns, COLLECTION_HINTS.omdbKey),
    otherExternalIdKey: guessFromNames(
      columns,
      COLLECTION_HINTS.otherExternalIdKey
    ),
    formatKey: guessFromNames(columns, COLLECTION_HINTS.formatKey),
    shelfLocationKey: guessFromNames(
      columns,
      COLLECTION_HINTS.shelfLocationKey
    ),
    conditionKey: guessFromNames(columns, COLLECTION_HINTS.conditionKey),
    notesKey: guessFromNames(columns, COLLECTION_HINTS.notesKey)
  };
}

function guessMetadataMapping(columns: ReviewColumn[]): MovieMetadataMapping {
  const names = columns
    .filter((column) => !column.dropped)
    .flatMap((column) => [column.key, column.label]);

  function keyFor(hints: string[][]) {
    const guessed = guessFromNames(names, hints);
    if (!guessed) return "";
    const found = columns.find(
      (column) => column.key === guessed || column.label === guessed
    );
    return found?.key ?? "";
  }

  return {
    titleKey: keyFor(METADATA_HINTS.titleKey),
    yearKey: keyFor(METADATA_HINTS.yearKey),
    upcKey: keyFor(METADATA_HINTS.upcKey),
    imdbKey: keyFor(METADATA_HINTS.imdbKey),
    tmdbKey: keyFor(METADATA_HINTS.tmdbKey),
    omdbKey: keyFor(METADATA_HINTS.omdbKey),
    otherExternalIdKey: keyFor(METADATA_HINTS.otherExternalIdKey),
    genresKey: keyFor(METADATA_HINTS.genresKey),
    runtimeKey: keyFor(METADATA_HINTS.runtimeKey),
    posterUrlKey: keyFor(METADATA_HINTS.posterUrlKey),
    overviewKey: keyFor(METADATA_HINTS.overviewKey),
    providerRecordIdKey: keyFor(METADATA_HINTS.providerRecordIdKey)
  };
}

function sanitizeMetadataMapping(
  current: MovieMetadataMapping,
  columns: ReviewColumn[]
) {
  const active = new Set(
    columns.filter((column) => !column.dropped).map((column) => column.key)
  );
  const guessed = guessMetadataMapping(columns);
  const next = { ...current };

  for (const field of METADATA_FIELDS) {
    if (next[field.key] && !active.has(next[field.key])) {
      next[field.key] = guessed[field.key];
    } else if (!next[field.key] && guessed[field.key]) {
      next[field.key] = guessed[field.key];
    }
  }
  return next;
}

function collectionLabel(
  title: string,
  year: number | null
) {
  return title + (year ? " (" + year + ")" : "");
}

export function MovieMetadataPanel({
  columns,
  rows,
  sourceUrl
}: MovieMetadataPanelProps) {
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
  const [dataset, setDataset] =
    useState<MovieMetadataModuleDataset | null>(null);
  const [provider, setProvider] =
    useState<MovieMetadataSource>("imdb-dataset");
  const [metadataMapping, setMetadataMapping] =
    useState<MovieMetadataMapping>(() => guessMetadataMapping(columns));
  const [collectionFileName, setCollectionFileName] = useState("");
  const [collectionColumns, setCollectionColumns] = useState<string[]>([]);
  const [collectionRows, setCollectionRows] = useState<TabularRow[]>([]);
  const [collectionMapping, setCollectionMapping] =
    useState<MovieCollectionImportMapping>(() => guessCollectionMapping([]));
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [assignmentSearch, setAssignmentSearch] =
    useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMetadataMapping((current) =>
      sanitizeMetadataMapping(current, columns)
    );
  }, [columns]);

  useEffect(() => {
    let cancelled = false;
    void loadMovieMetadataModule()
      .then((loaded) => {
        if (!cancelled) setDataset(loaded);
      })
      .catch((reason) => {
        if (!cancelled) {
          setMessage(
            reason instanceof Error
              ? reason.message
              : "Movie metadata storage is unavailable."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const metadataPreview = useMemo(() => {
    if (!metadataMapping.titleKey || !includedRows.length) {
      return { count: 0, error: null as string | null };
    }
    try {
      const candidates = metadataCandidatesFromRows({
        sourceUrl,
        retrievedAt: new Date().toISOString(),
        provider,
        mapping: metadataMapping,
        rows: includedRows.map((row) => ({
          sourceIndex: row.sourceIndex,
          values: { ...row.values }
        }))
      });
      return { count: candidates.length, error: null };
    } catch (reason) {
      return {
        count: 0,
        error:
          reason instanceof Error
            ? reason.message
            : "Unable to preview movie metadata."
      };
    }
  }, [includedRows, metadataMapping, provider, sourceUrl]);

  const queueSummary = useMemo(
    () => (dataset ? summarizeMovieQueue(dataset) : null),
    [dataset]
  );
  const recentQueue = useMemo(
    () => (dataset?.matchQueue ?? []).slice(0, 12),
    [dataset]
  );
  const enrichedCount = useMemo(
    () =>
      (dataset?.collection ?? []).filter(
        (record) => record.metadata.provider !== null
      ).length,
    [dataset]
  );

  async function loadCollectionFile(file: File | undefined) {
    if (!file) return;

    setPending(true);
    setMessage(null);
    try {
      const parsed = parseMovieCollectionFile(file.name, await file.text());
      setCollectionFileName(file.name);
      setCollectionColumns(parsed.columns);
      setCollectionRows(parsed.rows);
      setCollectionMapping(guessCollectionMapping(parsed.columns));
      setMessage(
        "Loaded " +
          parsed.rows.length +
          " collection rows from " +
          file.name +
          ". Review the field mapping before importing."
      );
    } catch (reason) {
      setCollectionFileName("");
      setCollectionColumns([]);
      setCollectionRows([]);
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to read the collection file."
      );
    } finally {
      setPending(false);
    }
  }

  async function importCollection() {
    setPending(true);
    setMessage(null);
    try {
      const updated = await importMovieCollection({
        rows: collectionRows,
        mapping: collectionMapping,
        replaceExisting
      });
      setDataset(updated);
      setMessage(
        "Owned collection imported locally · " +
          updated.collection.length +
          " total movies. Ownership fields remain authoritative."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to import the owned movie collection."
      );
    } finally {
      setPending(false);
    }
  }

  async function queueMatches() {
    setPending(true);
    setMessage(null);
    try {
      const result = await queueMovieMetadataMatches({
        sourceUrl,
        retrievedAt: new Date().toISOString(),
        provider,
        mapping: metadataMapping,
        rows: includedRows.map((row) => ({
          sourceIndex: row.sourceIndex,
          values: { ...row.values }
        }))
      });
      setDataset(result.dataset);
      setMessage(
        "Metadata review queued · " +
          result.summary.candidates +
          " candidates · " +
          result.summary.exact +
          " exact · " +
          result.summary.strong +
          " strong · " +
          result.summary.ambiguous +
          " ambiguous · " +
          result.summary.unmatched +
          " unmatched."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to queue movie metadata matches."
      );
    } finally {
      setPending(false);
    }
  }

  async function review(itemId: string, status: MovieMatchReviewStatus) {
    setPending(true);
    setMessage(null);
    try {
      const updated = await reviewMovieMatch(itemId, status);
      setDataset(updated);
      setMessage(
        status === "approved"
          ? "Metadata enrichment approved locally. Owned format, shelf location, condition and notes were preserved."
          : status === "rejected"
            ? "Metadata candidate rejected."
            : "Metadata candidate returned to pending review."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to review the movie metadata candidate."
      );
    } finally {
      setPending(false);
    }
  }

  async function assign(itemId: string, recordId: string) {
    setPending(true);
    setMessage(null);
    try {
      const updated = await assignMovieMatch(itemId, recordId);
      setDataset(updated);
      setMessage("Owned movie assigned manually; approval is still required.");
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to assign the owned movie."
      );
    } finally {
      setPending(false);
    }
  }

  async function remove(itemId: string) {
    setPending(true);
    setMessage(null);
    try {
      const updated = await removeMovieMatch(itemId);
      setDataset(updated);
      setMessage("Metadata candidate removed from the local review queue.");
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to remove the metadata candidate."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="movieMetadata">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Build 016</p>
          <h2>Movie metadata module</h2>
        </div>
        <span className="movieMetadataBadge">Local review</span>
      </div>

      <p className="movieMetadataIntro">
        Import the existing owned collection locally, match permitted
        API/dataset metadata by external ID, UPC, title and year, and approve
        ambiguous matches manually. Owned format, shelf location, condition and
        personal notes are never overwritten by metadata enrichment.
      </p>

      <div className="movieCollectionImport">
        <div className="movieSubheader">
          <strong>1. Import existing collection</strong>
          <span>CSV or JSON · local only</span>
        </div>

        <input
          accept=".csv,.json,text/csv,application/json"
          disabled={pending}
          onChange={(event) => void loadCollectionFile(event.target.files?.[0])}
          type="file"
        />

        {collectionFileName ? (
          <>
            <small>
              {collectionFileName} · {collectionRows.length} rows ·{" "}
              {collectionColumns.length} columns
            </small>
            <div className="movieMappingGrid">
              {COLLECTION_FIELDS.map((field) => (
                <label key={field.key}>
                  <span>
                    {field.label}
                    {field.required ? " *" : ""}
                  </span>
                  <select
                    disabled={pending}
                    onChange={(event) =>
                      setCollectionMapping((current) => ({
                        ...current,
                        [field.key]: event.target.value
                      }))
                    }
                    value={collectionMapping[field.key]}
                  >
                    <option value="">
                      {field.required ? "Choose a field" : "Not mapped"}
                    </option>
                    {collectionColumns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <label className="movieReplace">
              <input
                checked={replaceExisting}
                disabled={pending}
                onChange={(event) => setReplaceExisting(event.target.checked)}
                type="checkbox"
              />
              <span>
                Replace the current local collection and clear its existing match
                queue before this import.
              </span>
            </label>

            <button
              className="movieImportButton"
              disabled={
                pending ||
                !collectionRows.length ||
                !collectionMapping.titleKey
              }
              onClick={importCollection}
              type="button"
            >
              {pending ? "Working…" : "Import owned collection locally"}
            </button>
          </>
        ) : null}
      </div>

      <div className="movieCollectionStats">
        <div>
          <strong>{dataset?.collection.length ?? 0}</strong>
          <span>owned movies</span>
        </div>
        <div>
          <strong>{enrichedCount}</strong>
          <span>enriched</span>
        </div>
        <div>
          <strong>{queueSummary?.pending ?? 0}</strong>
          <span>pending review</span>
        </div>
        <div>
          <strong>{queueSummary?.ambiguous ?? 0}</strong>
          <span>ambiguous</span>
        </div>
      </div>

      <div className="movieMetadataIntake">
        <div className="movieSubheader">
          <strong>2. Metadata source intake</strong>
          <span>permitted API/dataset results only</span>
        </div>

        <label className="movieProvider">
          Metadata provider profile
          <select
            disabled={pending}
            onChange={(event) =>
              setProvider(event.target.value as MovieMetadataSource)
            }
            value={provider}
          >
            {PROVIDERS.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>
          <small>
            {PROVIDERS.find((source) => source.value === provider)?.note}
          </small>
        </label>

        <div className="movieMappingGrid">
          {METADATA_FIELDS.map((field) => (
            <label key={field.key}>
              <span>
                {field.label}
                {field.required ? " *" : ""}
              </span>
              <select
                disabled={pending}
                onChange={(event) =>
                  setMetadataMapping((current) => ({
                    ...current,
                    [field.key]: event.target.value
                  }))
                }
                value={metadataMapping[field.key]}
              >
                <option value="">
                  {field.required ? "Choose a field" : "Not mapped"}
                </option>
                {visibleColumns.map((column) => (
                  <option key={column.id} value={column.key}>
                    {column.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="moviePreviewSummary">
          <strong>{metadataPreview.count}</strong>
          <span>included metadata candidates ready to match</span>
        </div>

        {metadataPreview.error ? (
          <p className="movieMetadataError">{metadataPreview.error}</p>
        ) : null}

        <button
          className="movieQueueButton"
          disabled={
            pending ||
            !(dataset?.collection.length) ||
            !metadataMapping.titleKey ||
            !includedRows.length ||
            Boolean(metadataPreview.error)
          }
          onClick={queueMatches}
          type="button"
        >
          {pending ? "Matching…" : "Match reviewed metadata to owned collection"}
        </button>
      </div>

      <div className="movieSubheader">
        <strong>3. Match review queue</strong>
        <span>most recent 12</span>
      </div>

      {recentQueue.length ? (
        <div className="movieMatchQueue">
          {recentQueue.map((item) => {
            const search = assignmentSearch[item.id] ?? "";
            const matches = search.trim()
              ? (dataset?.collection ?? [])
                  .filter((record) =>
                    collectionLabel(record.title, record.year)
                      .toLowerCase()
                      .includes(search.toLowerCase())
                  )
                  .slice(0, 6)
              : [];

            return (
              <article key={item.id}>
                <div className="movieMatchTop">
                  <div>
                    <span
                      className={
                        "movieConfidence movieConfidence-" + item.confidence
                      }
                    >
                      {item.confidence}
                    </span>
                    <strong>{item.candidate.title}</strong>
                  </div>
                  <small>
                    {item.candidate.provider} · score {item.score}
                  </small>
                </div>

                <small>
                  Candidate:{" "}
                  {collectionLabel(item.candidate.title, item.candidate.year)}
                  {item.candidate.externalIds.imdb
                    ? " · " + item.candidate.externalIds.imdb
                    : ""}
                </small>

                <b>
                  {item.recordId
                    ? "Owned match: " + item.recordTitle
                    : "No owned movie assigned"}
                </b>

                {item.reasons.length ? (
                  <ul>
                    {item.reasons.slice(0, 5).map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : null}

                {item.confidence === "ambiguous" ||
                item.confidence === "unmatched" ? (
                  <div className="movieManualAssign">
                    <input
                      disabled={pending}
                      onChange={(event) =>
                        setAssignmentSearch((current) => ({
                          ...current,
                          [item.id]: event.target.value
                        }))
                      }
                      placeholder="Search owned title to assign manually"
                      value={search}
                    />
                    {matches.length ? (
                      <div>
                        {matches.map((record) => (
                          <button
                            disabled={pending}
                            key={record.id}
                            onClick={() => assign(item.id, record.id)}
                            type="button"
                          >
                            {collectionLabel(record.title, record.year)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="movieReviewActions">
                  {item.reviewStatus !== "approved" && item.recordId ? (
                    <button
                      disabled={pending}
                      onClick={() => review(item.id, "approved")}
                      type="button"
                    >
                      Approve enrichment
                    </button>
                  ) : null}
                  {item.reviewStatus !== "rejected" ? (
                    <button
                      disabled={pending}
                      onClick={() => review(item.id, "rejected")}
                      type="button"
                    >
                      Reject
                    </button>
                  ) : null}
                  {item.reviewStatus !== "pending" ? (
                    <button
                      disabled={pending}
                      onClick={() => review(item.id, "pending")}
                      type="button"
                    >
                      Reopen
                    </button>
                  ) : null}
                  <button
                    disabled={pending}
                    onClick={() => remove(item.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>

                <small>
                  Review: {item.reviewStatus} · source captured{" "}
                  {new Date(item.candidate.retrievedAt).toLocaleString()}
                </small>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="movieMetadataEmpty">
          No metadata candidates are queued. Import the owned collection first,
          then map included reviewed rows from a permitted metadata source.
        </p>
      )}

      <div className="moviePreservationNote">
        <strong>Ownership preservation rule</strong>
        <p>
          Metadata approval may add canonical title, release year, genres,
          runtime, poster, overview and missing external IDs. It never replaces
          the owned title/year/UPC or the user-owned format, shelf location,
          condition or notes.
        </p>
      </div>

      {message ? (
        <p className="movieMetadataMessage" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
