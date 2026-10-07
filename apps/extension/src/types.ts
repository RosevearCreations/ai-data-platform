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
  workspaceId?: string | null;
  retrievedAt?: string;
  syncTruncated?: boolean;
  legacyMigrationCompletedFor?: string[];
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
  workspaceId?: string | null;
  legacyMigrationCompletedFor?: string[];
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


export type HistoryReviewStatus = "pending" | "reviewed" | "dismissed";
export type HistoricalChangeKind = "added" | "removed" | "changed";

export interface HistoricalFieldDefinition {
  key: string;
  label: string;
}

export interface HistoricalRecordVersion {
  identity: string;
  sourceIndex: number;
  observedAt: string;
  values: Record<string, string | number | null>;
}

export interface HistoricalSnapshot {
  version: 1;
  snapshotVersion: number;
  id: string;
  capturedAt: string;
  recipeName: string;
  sourceUrl: string;
  sourceScope: string;
  identityKey: string;
  fields: HistoricalFieldDefinition[];
  records: HistoricalRecordVersion[];
}

export interface HistoricalFieldChange {
  key: string;
  label: string;
  before: string | number | null;
  after: string | number | null;
}

export interface HistoricalChangeItem {
  id: string;
  kind: HistoricalChangeKind;
  identity: string;
  detectedAt: string;
  fromVersion: number | null;
  toVersion: number;
  fields: HistoricalFieldChange[];
  reviewStatus: HistoryReviewStatus;
}

export interface HistoricalCaptureSummary {
  snapshotVersion: number;
  baseline: boolean;
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
  pendingQueue: number;
}

export interface HistoricalSeries {
  version: 1;
  workspaceId?: string | null;
  id: string;
  seriesKey: string;
  recipeName: string;
  sourceUrl: string;
  sourceScope: string;
  identityKey: string;
  createdAt: string;
  updatedAt: string;
  latestVersion: number;
  snapshots: HistoricalSnapshot[];
  changes: HistoricalChangeItem[];
  lastSummary: HistoricalCaptureSummary;
}


export type OntarioDetailingOfferingKind =
  | "package"
  | "service"
  | "addon"
  | "promotion"
  | "unknown";

export type OntarioDetailingDeliveryMode =
  | "mobile"
  | "fixed-location"
  | "both"
  | "unknown";

export type OntarioVehicleSize =
  | "small"
  | "medium"
  | "large"
  | "oversize"
  | "universal"
  | "unknown";

export interface RosieCompetitiveMapping {
  businessNameKey: string;
  offeringNameKey: string;
  offeringKindKey: string;
  priceKey: string;
  packageContentsKey: string;
  vehicleSizeKey: string;
  serviceAreaKey: string;
  deliveryModeKey: string;
}

export interface OntarioPriceObservation {
  raw: string;
  currency: "CAD";
  minimum: number | null;
  maximum: number | null;
  startingAt: boolean;
}

export interface OntarioServiceAreaObservation {
  raw: string;
  province: "ON";
  locations: string[];
}

export interface OntarioCompetitorOffering {
  id: string;
  businessKey: string;
  businessName: string;
  sourceUrl: string;
  sourceScope: string;
  sourceIndex: number;
  retrievedAt: string;
  offeringKey: string;
  offeringName: string;
  offeringKind: OntarioDetailingOfferingKind;
  category: string;
  price: OntarioPriceObservation;
  packageContents: string[];
  vehicleSize: OntarioVehicleSize;
  serviceArea: OntarioServiceAreaObservation;
  deliveryMode: OntarioDetailingDeliveryMode;
}

export interface OntarioCompetitorSnapshot {
  version: 1;
  id: string;
  snapshotVersion: number;
  capturedAt: string;
  businessKey: string;
  businessName: string;
  sourceUrl: string;
  sourceScope: string;
  offerings: OntarioCompetitorOffering[];
}

export interface OntarioCompetitorFieldChange {
  field: string;
  before: string;
  after: string;
}

export interface OntarioCompetitorChange {
  id: string;
  kind: "added" | "removed" | "changed";
  detectedAt: string;
  businessKey: string;
  businessName: string;
  sourceScope: string;
  offeringKey: string;
  offeringName: string;
  fromVersion: number | null;
  toVersion: number;
  fields: OntarioCompetitorFieldChange[];
}

export interface OntarioCompetitorSeries {
  version: 1;
  id: string;
  seriesKey: string;
  businessKey: string;
  businessName: string;
  sourceUrl: string;
  sourceScope: string;
  createdAt: string;
  updatedAt: string;
  latestVersion: number;
  snapshots: OntarioCompetitorSnapshot[];
  changes: OntarioCompetitorChange[];
}

export interface OntarioDetailerDataset {
  version: 1;
  id: "rosie-dazzlers-ontario-detailers";
  province: "ON";
  createdAt: string;
  updatedAt: string;
  series: OntarioCompetitorSeries[];
}

export interface OntarioDatasetCaptureSummary {
  businessCount: number;
  seriesUpdated: number;
  snapshotsCaptured: number;
  offeringsCaptured: number;
  added: number;
  removed: number;
  changed: number;
}


export type SupplierUnit =
  | "each"
  | "piece"
  | "pair"
  | "pack"
  | "box"
  | "bottle"
  | "jar"
  | "tube"
  | "roll"
  | "sheet"
  | "millilitre"
  | "litre"
  | "gram"
  | "kilogram"
  | "centimetre"
  | "metre"
  | "foot"
  | "ounce"
  | "pound"
  | "other";

export type SupplierStageStatus = "pending" | "approved" | "rejected";

export interface DevilSupplierMapping {
  supplierNameKey: string;
  productNameKey: string;
  skuKey: string;
  imageUrlKey: string;
  packagePriceKey: string;
  packageQuantityKey: string;
  stockUnitKey: string;
  usageUnitKey: string;
  usageUnitsPerStockUnitKey: string;
}

export interface SupplierPriceObservation {
  observedAt: string;
  currency: "CAD";
  packagePrice: number | null;
  rawPrice: string;
}

export interface NormalizedSupplierProduct {
  version: 1;
  id: string;
  stagingKey: string;
  supplierName: string;
  productName: string;
  sku: string;
  imageUrl: string;
  sourceUrl: string;
  sourceScope: string;
  sourceIndex: number;
  retrievedAt: string;
  currency: "CAD";
  rawPrice: string;
  packagePrice: number | null;
  packageQuantity: number | null;
  stockUnit: SupplierUnit;
  stockUnitRaw: string;
  usageUnit: SupplierUnit;
  usageUnitRaw: string;
  usageUnitsPerStockUnit: number | null;
  usageUnitsPerStockUnitSource: "mapped" | "inferred" | "unavailable";
  totalUsageUnits: number | null;
  costPerStockUnit: number | null;
  costPerUsageUnit: number | null;
  warnings: string[];
}

export interface SupplierInventoryStageItem {
  version: 1;
  id: string;
  stagingKey: string;
  createdAt: string;
  updatedAt: string;
  reviewStatus: SupplierStageStatus;
  reviewedAt: string | null;
  product: NormalizedSupplierProduct;
  priceHistory: SupplierPriceObservation[];
}

export interface SupplierInventoryStagingDataset {
  version: 1;
  id: "devil-n-dove-supplier-staging";
  createdAt: string;
  updatedAt: string;
  items: SupplierInventoryStageItem[];
}

export interface SupplierStageSummary {
  staged: number;
  created: number;
  updated: number;
  pending: number;
  approved: number;
  rejected: number;
  calculableUsageCost: number;
}


export interface DevilSupplierDefaults {
  packageQuantity: string;
  stockUnit: string;
  usageUnit: string;
  usageUnitsPerStockUnit: string;
}


export type MovieMetadataSource =
  | "tmdb"
  | "omdb"
  | "imdb-dataset"
  | "other-permitted";

export type MovieMatchConfidence =
  | "exact"
  | "strong"
  | "ambiguous"
  | "unmatched";

export type MovieMatchReviewStatus = "pending" | "approved" | "rejected";

export interface MovieOwnershipFields {
  format: string;
  shelfLocation: string;
  condition: string;
  notes: string;
}

export interface MovieExternalIds {
  imdb: string;
  tmdb: string;
  omdb: string;
  other: string;
}

export interface MovieMetadataFields {
  canonicalTitle: string;
  releaseYear: number | null;
  genres: string[];
  runtimeMinutes: number | null;
  posterUrl: string;
  overview: string;
  provider: MovieMetadataSource | null;
  providerRecordId: string;
  sourceUrl: string;
  retrievedAt: string | null;
}

export interface MovieCollectionRecord {
  version: 1;
  id: string;
  title: string;
  year: number | null;
  upc: string;
  externalIds: MovieExternalIds;
  ownership: MovieOwnershipFields;
  metadata: MovieMetadataFields;
  createdAt: string;
  updatedAt: string;
}

export interface MovieCollectionImportMapping {
  titleKey: string;
  yearKey: string;
  upcKey: string;
  imdbKey: string;
  tmdbKey: string;
  omdbKey: string;
  otherExternalIdKey: string;
  formatKey: string;
  shelfLocationKey: string;
  conditionKey: string;
  notesKey: string;
}

export interface MovieMetadataMapping {
  titleKey: string;
  yearKey: string;
  upcKey: string;
  imdbKey: string;
  tmdbKey: string;
  omdbKey: string;
  otherExternalIdKey: string;
  genresKey: string;
  runtimeKey: string;
  posterUrlKey: string;
  overviewKey: string;
  providerRecordIdKey: string;
}

export interface MovieMetadataCandidate {
  version: 1;
  id: string;
  provider: MovieMetadataSource;
  providerRecordId: string;
  title: string;
  year: number | null;
  upc: string;
  externalIds: MovieExternalIds;
  genres: string[];
  runtimeMinutes: number | null;
  posterUrl: string;
  overview: string;
  sourceUrl: string;
  sourceIndex: number;
  retrievedAt: string;
}

export interface MovieMatchQueueItem {
  version: 1;
  id: string;
  candidate: MovieMetadataCandidate;
  recordId: string | null;
  recordTitle: string;
  confidence: MovieMatchConfidence;
  score: number;
  reasons: string[];
  competingRecordIds: string[];
  reviewStatus: MovieMatchReviewStatus;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MovieMetadataModuleDataset {
  version: 1;
  id: "personal-movie-metadata-module";
  createdAt: string;
  updatedAt: string;
  collection: MovieCollectionRecord[];
  matchQueue: MovieMatchQueueItem[];
}

export interface MovieMetadataQueueSummary {
  candidates: number;
  exact: number;
  strong: number;
  ambiguous: number;
  unmatched: number;
  pending: number;
  approved: number;
  rejected: number;
}


export type ScheduledJobCadence = "daily" | "weekly" | "interval";
export type ScheduledJobRunStatus =
  | "success"
  | "failed"
  | "change-detected";
export type ScheduledJobNotificationStatus = "unread" | "read";

export interface ScheduledSourcePolicyReview {
  reviewedAt: string;
  publicOrAuthorized: boolean;
  termsReviewed: boolean;
  noAccessControlBypass: boolean;
  notes: string;
}

export interface ScheduledJobSchedule {
  cadence: ScheduledJobCadence;
  localHour: number;
  weekday: number;
  intervalHours: number;
}

export interface ScheduledJobLimits {
  maxRecords: number;
  maxRetries: number;
  retryDelayMinutes: number;
}

export interface ScheduledJobSnapshot {
  capturedAt: string;
  recordCount: number;
  signature: string;
  rowFingerprints: string[];
}

export interface ScheduledJobRunAttempt {
  id: string;
  startedAt: string;
  finishedAt: string;
  status: ScheduledJobRunStatus;
  recordCount: number;
  warningCount: number;
  error: string;
  retryNumber: number;
  changed: boolean;
}

export interface ScheduledJobChangeNotification {
  id: string;
  jobId: string;
  detectedAt: string;
  status: ScheduledJobNotificationStatus;
  previousRecordCount: number;
  currentRecordCount: number;
  addedRows: number;
  removedRows: number;
}

export interface ScheduledExtractionJob {
  version: 1;
  workspaceId?: string | null;
  id: string;
  name: string;
  savedScraperId: string;
  savedScraperRevision: number;
  sourceUrl: string;
  sourceOrigin: string;
  recipe: ExtractionRecipe;
  enabled: boolean;
  due: boolean;
  createdAt: string;
  updatedAt: string;
  nextRunAt: string;
  lastRunAt: string | null;
  consecutiveFailures: number;
  schedule: ScheduledJobSchedule;
  limits: ScheduledJobLimits;
  sourcePolicy: ScheduledSourcePolicyReview;
  lastSnapshot: ScheduledJobSnapshot | null;
  attempts: ScheduledJobRunAttempt[];
}

export interface ScheduledJobsDataset {
  version: 1;
  id: "ai-data-platform-scheduled-jobs";
  createdAt: string;
  updatedAt: string;
  jobs: ScheduledExtractionJob[];
  notifications: ScheduledJobChangeNotification[];
}

export interface ScheduledJobRunComparison {
  snapshot: ScheduledJobSnapshot;
  changed: boolean;
  addedRows: number;
  removedRows: number;
}


export type BusinessIntegrationTarget =
  | "rosie-dazzlers"
  | "devil-n-dove";

export type BusinessIntegrationBatchStatus =
  | "draft"
  | "approved"
  | "exported"
  | "cancelled";

export type BusinessIntegrationDiffAction =
  | "create"
  | "update"
  | "unchanged"
  | "blocked";

export type BusinessIntegrationAuditAction =
  | "dry-run-created"
  | "approved"
  | "exported"
  | "cancelled";

export interface BusinessSnapshotRecord {
  integrationKey: string;
  values: Record<string, string | number | boolean | null>;
  userOwnedKeys: string[];
}

export interface BusinessSystemSnapshot {
  version: 1;
  target: BusinessIntegrationTarget;
  capturedAt: string;
  records: BusinessSnapshotRecord[];
}

export interface BusinessIntegrationCandidate {
  integrationKey: string;
  values: Record<string, string | number | boolean | null>;
  sourceEvidence: {
    sourceUrl: string;
    retrievedAt: string;
  };
}

export interface BusinessIntegrationFieldDiff {
  key: string;
  before: string | number | boolean | null;
  after: string | number | boolean | null;
}

export interface BusinessIntegrationDiff {
  id: string;
  integrationKey: string;
  action: BusinessIntegrationDiffAction;
  changedFields: BusinessIntegrationFieldDiff[];
  blockedFields: string[];
  payload: Record<string, string | number | boolean | null>;
  sourceEvidence: {
    sourceUrl: string;
    retrievedAt: string;
  };
}

export interface BusinessIntegrationBatchSummary {
  create: number;
  update: number;
  unchanged: number;
  blocked: number;
  exportableOperations: number;
}

export interface BusinessIntegrationBatch {
  version: 1;
  id: string;
  target: BusinessIntegrationTarget;
  adapterContract: string;
  contractVersion: 1;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  exportedAt: string | null;
  cancelledAt: string | null;
  status: BusinessIntegrationBatchStatus;
  sourceDatasetUpdatedAt: string;
  snapshotCapturedAt: string | null;
  dryRunFingerprint: string;
  summary: BusinessIntegrationBatchSummary;
  diffs: BusinessIntegrationDiff[];
}

export interface BusinessIntegrationAuditEntry {
  version: 1;
  id: string;
  batchId: string;
  target: BusinessIntegrationTarget;
  action: BusinessIntegrationAuditAction;
  occurredAt: string;
  fingerprint: string;
  details: string;
}

export interface BusinessIntegrationState {
  version: 1;
  id: "ai-data-platform-business-integrations";
  createdAt: string;
  updatedAt: string;
  batches: BusinessIntegrationBatch[];
  audit: BusinessIntegrationAuditEntry[];
}

export interface BusinessIntegrationOperation {
  action: "create" | "update";
  integrationKey: string;
  values: Record<string, string | number | boolean | null>;
  sourceEvidence: {
    sourceUrl: string;
    retrievedAt: string;
  };
}

export interface BusinessIntegrationPackage {
  version: 1;
  schemaId: string;
  target: BusinessIntegrationTarget;
  adapterContract: string;
  contractVersion: 1;
  packageId: string;
  replayKey: string;
  batchId: string;
  approvedAt: string;
  sourceDatasetUpdatedAt: string;
  generatedAt: string;
  expiresAt: string;
  fingerprint: string;
  operations: BusinessIntegrationOperation[];
}

export type BusinessIntegrationValidationCode =
  | "valid"
  | "invalid-json"
  | "invalid-shape"
  | "unsupported-version"
  | "wrong-contract"
  | "wrong-schema"
  | "invalid-package-id"
  | "invalid-replay-key"
  | "fingerprint-mismatch"
  | "duplicate"
  | "stale"
  | "expired"
  | "future-dated"
  | "unexpected-field"
  | "invalid-operation"
  | "invalid-evidence";

export interface BusinessIntegrationValidationResult {
  valid: boolean;
  code: BusinessIntegrationValidationCode;
  errors: string[];
  warnings: string[];
  packageId: string;
  replayKey: string;
  fingerprint: string;
  target: BusinessIntegrationTarget | null;
}


export type WorkspaceRole = "owner" | "admin" | "member";

export interface WorkspaceSummary {
  id: string;
  slug: string;
  name: string;
  type: "business" | "personal";
  role: WorkspaceRole;
}

export type WorkspaceBridgeStatus =
  | "loading"
  | "connected"
  | "signed-out"
  | "expired"
  | "unavailable"
  | "no-access";

export interface WorkspaceBridgeState {
  status: WorkspaceBridgeStatus;
  platformOrigin: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string | null;
  expiresAt: string | null;
  message: string;
}


export type WorkspaceSyncResource =
  | "saved-scraper"
  | "reviewed-dataset";

export type WorkspaceSyncEntryState =
  | "clean"
  | "dirty"
  | "queued"
  | "conflict"
  | "deleted";

export interface WorkspaceSyncMetadataEntry {
  key: string;
  workspaceId: string;
  resource: WorkspaceSyncResource;
  recordId: string;
  serverVersion: number | null;
  state: WorkspaceSyncEntryState;
  localUpdatedAt: string;
  lastSyncedAt: string | null;
  error: string;
}

export interface WorkspaceSyncQueueItem {
  id: string;
  workspaceId: string;
  resource: WorkspaceSyncResource;
  recordId: string;
  action: "upsert" | "delete";
  expectedServerVersion: number | null;
  clientUpdatedAt: string;
  payload: Record<string, unknown> | null;
  enqueuedAt: string;
  attempts: number;
}

export interface WorkspaceSyncServerRecord {
  resource: WorkspaceSyncResource;
  recordId: string;
  workspaceId: string;
  serverVersion: number;
  clientUpdatedAt: string;
  deleted: boolean;
  payload: Record<string, unknown>;
}

export interface WorkspaceSyncConflict {
  key: string;
  workspaceId: string;
  resource: WorkspaceSyncResource;
  recordId: string;
  detectedAt: string;
  localPayload: Record<string, unknown> | null;
  serverRecord: WorkspaceSyncServerRecord | null;
}

export interface WorkspaceSyncLocalState {
  version: 1;
  id: "ai-data-platform-workspace-sync";
  updatedAt: string;
  lastSyncAt: string | null;
  metadata: WorkspaceSyncMetadataEntry[];
  queue: WorkspaceSyncQueueItem[];
  conflicts: WorkspaceSyncConflict[];
}

export interface WorkspaceSyncSummary {
  workspaceId: string;
  pushed: number;
  pulled: number;
  deleted: number;
  conflicts: number;
  queued: number;
  lastSyncAt: string | null;
}


export type IntelligenceModuleKey =
  | "history"
  | "rosie-competitive"
  | "devil-supplier"
  | "movie-metadata"
  | "scheduled-jobs"
  | "business-integrations";

export interface IntelligenceSyncMetadata {
  key: string;
  workspaceId: string;
  moduleKey: IntelligenceModuleKey;
  serverVersion: number | null;
  state: "clean" | "queued" | "conflict";
  localUpdatedAt: string;
  lastSyncedAt: string | null;
  error: string;
}

export interface IntelligenceSyncQueueItem {
  id: string;
  workspaceId: string;
  moduleKey: IntelligenceModuleKey;
  expectedServerVersion: number | null;
  clientUpdatedAt: string;
  summary: Record<string, unknown>;
  payload: Record<string, unknown>;
  auditEntries: BusinessIntegrationAuditEntry[];
  enqueuedAt: string;
  attempts: number;
}

export interface IntelligenceServerRecord {
  workspaceId: string;
  moduleKey: IntelligenceModuleKey;
  serverVersion: number;
  clientUpdatedAt: string;
  summary: Record<string, unknown>;
  payload: Record<string, unknown>;
}

export interface IntelligenceSyncConflict {
  key: string;
  workspaceId: string;
  moduleKey: IntelligenceModuleKey;
  detectedAt: string;
  localPayload: Record<string, unknown>;
  serverRecord: IntelligenceServerRecord;
}

export interface IntelligenceSyncState {
  version: 1;
  id: "ai-data-platform-intelligence-sync";
  updatedAt: string;
  lastSyncAt: string | null;
  metadata: IntelligenceSyncMetadata[];
  queue: IntelligenceSyncQueueItem[];
  conflicts: IntelligenceSyncConflict[];
}

export interface IntelligenceSyncSummary {
  pushed: number;
  pulled: number;
  conflicts: number;
  queued: number;
  auditInserted: number;
  lastSyncAt: string | null;
}
