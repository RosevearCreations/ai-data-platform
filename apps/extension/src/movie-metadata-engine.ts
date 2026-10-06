import type {
  MovieCollectionImportMapping,
  MovieCollectionRecord,
  MovieExternalIds,
  MovieMatchConfidence,
  MovieMatchQueueItem,
  MovieMetadataCandidate,
  MovieMetadataMapping,
  MovieMetadataSource
} from "./types";

export type TabularRow = Record<string, string>;

export interface MovieReviewedRow {
  sourceIndex: number;
  values: Record<string, string | number | null>;
}

const MAX_COLLECTION_IMPORT_ROWS = 5000;
const MAX_METADATA_CANDIDATES = 500;

function id(prefix: string) {
  return prefix + "-" + crypto.randomUUID();
}

function clean(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function intValue(value: unknown) {
  const match = clean(value).match(/\b(18|19|20|21)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function runtimeValue(value: unknown) {
  const text = clean(value);
  if (!text) return null;

  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i);
  const minuteMatch = text.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/i);
  if (hourMatch || minuteMatch) {
    const hours = hourMatch ? Number(hourMatch[1]) : 0;
    const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
    const total = Math.round(hours * 60 + minutes);
    return total > 0 ? total : null;
  }

  const numeric = Number(text.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 && numeric < 1000
    ? Math.round(numeric)
    : null;
}

function normalizedTitle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedUpc(value: string) {
  return value.replace(/\D/g, "");
}

function cleanExternalId(value: string, provider: keyof MovieExternalIds) {
  const raw = value.trim();
  if (!raw) return "";
  if (provider === "imdb") {
    const match = raw.match(/tt\d{5,12}/i);
    return match ? match[0].toLowerCase() : raw.toLowerCase();
  }
  return raw.toLowerCase();
}

function splitGenres(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[|,;/]+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => part.slice(0, 50))
    )
  ).slice(0, 16);
}

function safeUrl(value: string, base = "") {
  if (!value.trim()) return "";
  try {
    const parsed = new URL(value, base || undefined);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.href
      : "";
  } catch {
    return "";
  }
}

function externalIds(input: {
  imdb?: string;
  tmdb?: string;
  omdb?: string;
  other?: string;
}): MovieExternalIds {
  return {
    imdb: cleanExternalId(input.imdb ?? "", "imdb"),
    tmdb: cleanExternalId(input.tmdb ?? "", "tmdb"),
    omdb: cleanExternalId(input.omdb ?? "", "omdb"),
    other: cleanExternalId(input.other ?? "", "other")
  };
}

function csvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

export function parseMovieCollectionFile(
  filename: string,
  text: string
): { columns: string[]; rows: TabularRow[] } {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".json")) {
    const parsed = JSON.parse(text) as unknown;
    const sourceRows = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { records?: unknown }).records)
        ? (parsed as { records: unknown[] }).records
        : null;

    if (!sourceRows) {
      throw new Error("JSON movie imports must be an array or an object with a records array.");
    }

    const objectRows = sourceRows
      .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row))
      .slice(0, MAX_COLLECTION_IMPORT_ROWS);
    const columns = Array.from(
      new Set(objectRows.flatMap((row) => Object.keys(row)))
    );

    return {
      columns,
      rows: objectRows.map((row) =>
        Object.fromEntries(columns.map((column) => [column, clean(row[column])]))
      )
    };
  }

  const parsed = csvRows(text);
  if (parsed.length < 2) {
    throw new Error("CSV movie imports need a header row and at least one data row.");
  }

  const columns = parsed[0].map((column, index) =>
    column.trim() || "column_" + (index + 1)
  );
  const rows = parsed
    .slice(1, MAX_COLLECTION_IMPORT_ROWS + 1)
    .map((values) =>
      Object.fromEntries(
        columns.map((column, index) => [column, (values[index] ?? "").trim()])
      )
    );

  return { columns, rows };
}

export function collectionRecordsFromRows(
  rows: TabularRow[],
  mapping: MovieCollectionImportMapping
): MovieCollectionRecord[] {
  if (!mapping.titleKey) {
    throw new Error("Choose the owned collection title field before importing.");
  }

  const now = new Date().toISOString();
  const records = rows.flatMap((row) => {
    const title = clean(row[mapping.titleKey]);
    if (!title) return [];

    return [{
      version: 1 as const,
      id: id("movie"),
      title,
      year: intValue(row[mapping.yearKey]),
      upc: normalizedUpc(clean(row[mapping.upcKey])),
      externalIds: externalIds({
        imdb: clean(row[mapping.imdbKey]),
        tmdb: clean(row[mapping.tmdbKey]),
        omdb: clean(row[mapping.omdbKey]),
        other: clean(row[mapping.otherExternalIdKey])
      }),
      ownership: {
        format: clean(row[mapping.formatKey]),
        shelfLocation: clean(row[mapping.shelfLocationKey]),
        condition: clean(row[mapping.conditionKey]),
        notes: clean(row[mapping.notesKey])
      },
      metadata: {
        canonicalTitle: "",
        releaseYear: null,
        genres: [],
        runtimeMinutes: null,
        posterUrl: "",
        overview: "",
        provider: null,
        providerRecordId: "",
        sourceUrl: "",
        retrievedAt: null
      },
      createdAt: now,
      updatedAt: now
    }];
  });

  if (!records.length) {
    throw new Error("No imported row contains a movie title.");
  }

  return records;
}

function rowValue(row: MovieReviewedRow, key: string) {
  return key ? clean(row.values[key]) : "";
}

export function metadataCandidatesFromRows(input: {
  sourceUrl: string;
  retrievedAt: string;
  provider: MovieMetadataSource;
  mapping: MovieMetadataMapping;
  rows: MovieReviewedRow[];
}) {
  if (!input.mapping.titleKey) {
    throw new Error("Choose the metadata title field before matching.");
  }
  if (!input.rows.length) {
    throw new Error("Metadata matching needs at least one included reviewed row.");
  }
  if (input.rows.length > MAX_METADATA_CANDIDATES) {
    throw new Error("Metadata matching is capped at 500 included reviewed rows per batch.");
  }

  const candidates: MovieMetadataCandidate[] = input.rows.flatMap((row) => {
    const title = rowValue(row, input.mapping.titleKey);
    if (!title) return [];

    const providerRecordId = rowValue(
      row,
      input.mapping.providerRecordIdKey
    );
    const mappedIds = {
      imdb: rowValue(row, input.mapping.imdbKey),
      tmdb: rowValue(row, input.mapping.tmdbKey),
      omdb: rowValue(row, input.mapping.omdbKey),
      other: rowValue(row, input.mapping.otherExternalIdKey)
    };

    if (providerRecordId) {
      if (input.provider === "imdb-dataset" && !mappedIds.imdb) {
        mappedIds.imdb = providerRecordId;
      } else if (input.provider === "tmdb" && !mappedIds.tmdb) {
        mappedIds.tmdb = providerRecordId;
      } else if (input.provider === "omdb" && !mappedIds.omdb) {
        mappedIds.omdb = providerRecordId;
      } else if (input.provider === "other-permitted" && !mappedIds.other) {
        mappedIds.other = providerRecordId;
      }
    }

    return [{
      version: 1 as const,
      id: id("movie-candidate"),
      provider: input.provider,
      providerRecordId,
      title,
      year: intValue(rowValue(row, input.mapping.yearKey)),
      upc: normalizedUpc(rowValue(row, input.mapping.upcKey)),
      externalIds: externalIds(mappedIds),
      genres: splitGenres(rowValue(row, input.mapping.genresKey)),
      runtimeMinutes: runtimeValue(rowValue(row, input.mapping.runtimeKey)),
      posterUrl: safeUrl(rowValue(row, input.mapping.posterUrlKey), input.sourceUrl),
      overview: rowValue(row, input.mapping.overviewKey).slice(0, 1200),
      sourceUrl: input.sourceUrl,
      sourceIndex: row.sourceIndex,
      retrievedAt: input.retrievedAt
    }];
  });

  if (!candidates.length) {
    throw new Error("No included metadata row contains a title.");
  }

  return candidates;
}

function tokenSimilarity(left: string, right: string) {
  const a = new Set(normalizedTitle(left).split(" ").filter(Boolean));
  const b = new Set(normalizedTitle(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

function externalIdMatch(record: MovieCollectionRecord, candidate: MovieMetadataCandidate) {
  const providers: Array<keyof MovieExternalIds> = ["imdb", "tmdb", "omdb", "other"];
  return providers.find((provider) => {
    const left = record.externalIds[provider];
    const right = candidate.externalIds[provider];
    return Boolean(left && right && left === right);
  }) ?? null;
}

function scoreMatch(record: MovieCollectionRecord, candidate: MovieMetadataCandidate) {
  const reasons: string[] = [];
  let score = 0;

  const idProvider = externalIdMatch(record, candidate);
  if (idProvider) {
    score += 100;
    reasons.push(idProvider.toUpperCase() + " ID exact match");
  }

  if (record.upc && candidate.upc && record.upc === candidate.upc) {
    score += 95;
    reasons.push("UPC exact match");
  }

  const recordTitle = normalizedTitle(record.title);
  const candidateTitle = normalizedTitle(candidate.title);
  if (recordTitle && recordTitle === candidateTitle) {
    score += 60;
    reasons.push("Title exact match");
  } else {
    const similarity = tokenSimilarity(record.title, candidate.title);
    if (similarity >= 0.8) {
      score += 35;
      reasons.push("Title tokens closely match");
    } else if (similarity >= 0.6) {
      score += 20;
      reasons.push("Title tokens partially match");
    }
  }

  if (record.year !== null && candidate.year !== null) {
    if (record.year === candidate.year) {
      score += 25;
      reasons.push("Year exact match");
    } else if (Math.abs(record.year - candidate.year) === 1) {
      score += 5;
      reasons.push("Year differs by one");
    } else {
      score -= 30;
      reasons.push("Year conflicts");
    }
  }

  return { record, score, reasons };
}

function confidenceFor(score: number): MovieMatchConfidence {
  if (score >= 95) return "exact";
  if (score >= 80) return "strong";
  if (score >= 55) return "ambiguous";
  return "unmatched";
}

export function buildMovieMatchQueue(
  collection: MovieCollectionRecord[],
  candidates: MovieMetadataCandidate[]
): MovieMatchQueueItem[] {
  const now = new Date().toISOString();

  return candidates.map((candidate) => {
    const scored = collection
      .map((record) => scoreMatch(record, candidate))
      .sort((left, right) => right.score - left.score);
    const best = scored[0] ?? null;
    const second = scored[1] ?? null;
    let confidence = best ? confidenceFor(best.score) : "unmatched";
    const competingRecordIds: string[] = [];

    if (
      best &&
      second &&
      best.score >= 55 &&
      second.score >= 55 &&
      best.score - second.score < 15
    ) {
      confidence = "ambiguous";
      competingRecordIds.push(second.record.id);
    }

    return {
      version: 1,
      id: id("movie-match"),
      candidate,
      recordId: confidence === "unmatched" ? null : best?.record.id ?? null,
      recordTitle: confidence === "unmatched" ? "" : best?.record.title ?? "",
      confidence,
      score: best?.score ?? 0,
      reasons: best?.reasons ?? [],
      competingRecordIds,
      reviewStatus: "pending",
      reviewedAt: null,
      createdAt: now,
      updatedAt: now
    };
  });
}

export function applyMovieMetadata(
  record: MovieCollectionRecord,
  candidate: MovieMetadataCandidate
): MovieCollectionRecord {
  const now = new Date().toISOString();

  return {
    ...record,
    title: record.title,
    year: record.year,
    upc: record.upc,
    ownership: { ...record.ownership },
    externalIds: {
      imdb: record.externalIds.imdb || candidate.externalIds.imdb,
      tmdb: record.externalIds.tmdb || candidate.externalIds.tmdb,
      omdb: record.externalIds.omdb || candidate.externalIds.omdb,
      other: record.externalIds.other || candidate.externalIds.other
    },
    metadata: {
      canonicalTitle: candidate.title,
      releaseYear: candidate.year,
      genres: [...candidate.genres],
      runtimeMinutes: candidate.runtimeMinutes,
      posterUrl: candidate.posterUrl,
      overview: candidate.overview,
      provider: candidate.provider,
      providerRecordId: candidate.providerRecordId,
      sourceUrl: candidate.sourceUrl,
      retrievedAt: candidate.retrievedAt
    },
    updatedAt: now
  };
}
