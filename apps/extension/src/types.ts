export interface ElementSnapshot {
  tagName: string;
  selectorHint: string;
  text: string;
  attributes: Record<string, string>;
}

export interface ContainerCandidate {
  selectorHint: string;
  tagName: string;
  signature: string;
  childCount: number;
  repeatedChildren: number;
  repeatRatio: number;
  score: number;
  sampleTexts: string[];
}

export interface PageInspection {
  url: string;
  title: string;
  language: string;
  inspectedAt: string;
  metadata: {
    description: string;
    canonicalUrl: string;
  };
  counts: {
    elements: number;
    visibleElements: number;
    links: number;
    images: number;
    headings: number;
    tables: number;
    forms: number;
  };
  headings: Array<{
    level: number;
    text: string;
  }>;
  elements: ElementSnapshot[];
  candidates: ContainerCandidate[];
  truncated: boolean;
}

export interface VisualPickResult {
  status: "picked" | "cancelled";
  selector: string;
  selectorMatchCount: number;
  generalizedSelector: string;
  generalizedMatchCount: number;
  tagName: string;
  text: string;
  attributes: Record<string, string>;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
}

export interface SelectorPreviewResult {
  selector: string;
  matchCount: number;
  visibleMatchCount: number;
  sampleTexts: string[];
  truncated: boolean;
}

export interface RecordSample {
  index: number;
  text: string;
  link: string;
  image: string;
  descendantCount: number;
  fieldHints: string[];
}

export interface RecordGroupCandidate {
  containerSelector: string;
  recordSelector: string;
  source: "auto" | "selected-field";
  recordCount: number;
  visibleRecordCount: number;
  confidence: number;
  metrics: {
    repeatRatio: number;
    structuralConsistency: number;
    textCoverage: number;
    linkCoverage: number;
    imageCoverage: number;
    averageDescendants: number;
  };
  diagnostics: string[];
  samples: RecordSample[];
}

export interface RecordDetectionResult {
  url: string;
  detectedAt: string;
  mode: "auto" | "selected-field";
  inputSelector: string;
  candidates: RecordGroupCandidate[];
  inspectedParents: number;
  truncated: boolean;
}

export interface RecordPreviewResult {
  recordSelector: string;
  matchCount: number;
  visibleMatchCount: number;
  sampleTexts: string[];
  truncated: boolean;
}

export type ExtractionSource = "text" | "attribute" | "link" | "image";

export type ExtractionTransform =
  | "trim"
  | "collapse-whitespace"
  | "lowercase"
  | "uppercase"
  | "number"
  | "currency";

export interface ExtractionFieldRecipe {
  id: string;
  key: string;
  label: string;
  selector: string;
  source: ExtractionSource;
  attribute: string;
  required: boolean;
  transforms: ExtractionTransform[];
}

export interface ExtractionRecipe {
  version: 1;
  name: string;
  sourceUrl: string;
  recordSelector: string;
  fields: ExtractionFieldRecipe[];
}

export interface DerivedFieldResult {
  field: ExtractionFieldRecipe;
  matchedRecords: number;
  recordCount: number;
  coverage: number;
  samples: string[];
}

export interface ExtractionRecordResult {
  index: number;
  values: Record<string, string | number | null>;
  warnings: string[];
}

export interface ExtractionRunResult {
  recipeVersion: 1;
  sourceUrl: string;
  recordSelector: string;
  recordCount: number;
  fieldCount: number;
  records: ExtractionRecordResult[];
  warnings: string[];
  stats: {
    populatedCells: number;
    emptyCells: number;
    requiredMissingCells: number;
  };
  truncated: boolean;
}

export interface ReviewColumn {
  id: string;
  key: string;
  label: string;
  position: number;
  dropped: boolean;
}

export interface ReviewRow {
  id: string;
  sourceIndex: number;
  included: boolean;
  values: Record<string, string | number | null>;
  warnings: string[];
  editedKeys: string[];
}

export interface ReviewedDataset {
  version: 1;
  id: string;
  recipeName: string;
  sourceUrl: string;
  createdAt: string;
  updatedAt: string;
  columns: ReviewColumn[];
  rows: ReviewRow[];
  stats: {
    totalRows: number;
    includedRows: number;
    excludedRows: number;
    visibleColumns: number;
    droppedColumns: number;
    editedCells: number;
    warningRows: number;
  };
}

export type PaginationMode =
  | "next-button"
  | "numbered-pages"
  | "load-more"
  | "infinite-scroll"
  | "none";

export interface PaginationCandidate {
  mode: Exclude<PaginationMode, "none">;
  selector: string;
  label: string;
  confidence: number;
  sameOrigin: boolean;
  disabled: boolean;
}

export interface PaginationInspection {
  url: string;
  recordCount: number;
  scrollHeight: number;
  recommendedMode: PaginationMode;
  recommendedSelector: string;
  candidates: PaginationCandidate[];
  diagnostics: string[];
}

export interface PaginationProbe {
  url: string;
  origin: string;
  recordCount: number;
  scrollHeight: number;
  readyState: DocumentReadyState;
  recordSignature: string;
}

export interface PaginationStepResult {
  mode: Exclude<PaginationMode, "none">;
  selector: string;
  action: "clicked" | "scrolled";
  beforeUrl: string;
  beforeRecordCount: number;
  beforeScrollHeight: number;
}

export interface PaginationRunLimits {
  maxPages: number;
  maxRecords: number;
  waitMs: number;
  maxStalledSteps: number;
}

export interface PaginationPageSummary {
  page: number;
  url: string;
  extractedRows: number;
  addedRows: number;
  duplicateRows: number;
}

export interface PaginatedExtractionRecord extends ExtractionRecordResult {
  page: number;
  sourceUrl: string;
}

export interface PaginatedExtractionResult {
  startedAt: string;
  finishedAt: string;
  mode: PaginationMode;
  pagesVisited: number;
  rows: PaginatedExtractionRecord[];
  pageSummaries: PaginationPageSummary[];
  stopReason:
    | "completed"
    | "max-pages"
    | "max-records"
    | "no-next-control"
    | "no-new-records"
    | "repeated-url"
    | "cross-origin"
    | "stalled"
    | "cancelled"
    | "error";
  warnings: string[];
}

export type DetailExtractionSource =
  | "text"
  | "attribute"
  | "link"
  | "image"
  | "meta";

export interface DetailFieldRecipe {
  id: string;
  key: string;
  label: string;
  selector: string;
  source: DetailExtractionSource;
  attribute: string;
  required: boolean;
  transforms: ExtractionTransform[];
}

export interface DetailEnrichmentLimits {
  maxPages: number;
  delayMs: number;
  timeoutMs: number;
}

export interface DetailPageEvidence {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  fetched: boolean;
  reused: boolean;
  error: string;
}

export interface DetailEnrichedRecord extends ExtractionRecordResult {
  detailUrl: string;
  detailPageIndex: number | null;
  evidence: DetailPageEvidence;
}

export interface DetailEnrichmentResult {
  startedAt: string;
  finishedAt: string;
  sourceFieldKey: string;
  sourceOrigin: string;
  parentRows: number;
  uniqueDetailUrls: number;
  fetchedPages: number;
  reusedPages: number;
  skippedRows: number;
  failedPages: number;
  records: DetailEnrichedRecord[];
  detailFields: DetailFieldRecipe[];
  warnings: string[];
}

export type ExportFormat = "csv" | "xlsx" | "json";
export type ExportValueView = "reviewed" | "raw";
export type ExportRowScope = "included" | "all";
export type ExportColumnScope = "visible" | "all";

export interface ExportOptions {
  format: ExportFormat;
  valueView: ExportValueView;
  rowScope: ExportRowScope;
  columnScope: ExportColumnScope;
  includeWarnings: boolean;
  includeSourceEvidence: boolean;
}

export interface ExportColumn {
  key: string;
  label: string;
}

export interface ExportRecord {
  sourceIndex: number;
  values: Record<string, string | number | null>;
  warnings: string[];
  included: boolean;
  sourceUrl: string;
  page: number | null;
  detailUrl: string;
  detailPageIndex: number | null;
  detailStatus: number | null;
  detailReused: boolean | null;
  detailError: string;
}

export interface PreparedExport {
  filenameBase: string;
  generatedAt: string;
  recipeName: string;
  sourceUrl: string;
  valueView: ExportValueView;
  includeWarnings: boolean;
  includeSourceEvidence: boolean;
  columns: ExportColumn[];
  records: ExportRecord[];
}


export type SavedScraperKind = "scraper" | "template";
export type ScraperHealth = "healthy" | "degraded" | "broken";

export interface RecipeFieldCompatibility {
  key: string;
  label: string;
  matchedRecords: number;
  sampledRecords: number;
  coverage: number;
  required: boolean;
  validSelector: boolean;
}

export interface ScraperCompatibilityReport {
  checkedAt: string;
  url: string;
  status: ScraperHealth;
  recordMatches: number;
  sampledRecords: number;
  fields: RecipeFieldCompatibility[];
  warnings: string[];
}

export interface SavedScraperRevision {
  revision: number;
  savedAt: string;
  sourceUrl: string;
  recipe: ExtractionRecipe;
}

export interface SavedScraper {
  version: 1;
  id: string;
  kind: SavedScraperKind;
  name: string;
  sourceUrl: string;
  sourceOrigin: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  recipe: ExtractionRecipe;
  revisions: SavedScraperRevision[];
  lastCheck: ScraperCompatibilityReport | null;
}

export interface ScraperTemplate {
  id: string;
  name: string;
  description: string;
  recipe: ExtractionRecipe;
}
