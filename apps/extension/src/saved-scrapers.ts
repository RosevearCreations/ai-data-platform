import {
  getActiveWorkspaceId,
  requireActiveWorkspaceId
} from "./workspace-session";
import {
  queueWorkspaceSyncDelete,
  queueWorkspaceSyncUpsert,
  scheduleWorkspaceSyncAttempt
} from "./workspace-sync";
import type {
  ExtractionFieldRecipe,
  ExtractionRecipe,
  SavedScraper,
  SavedScraperKind,
  ScraperCompatibilityReport,
  ScraperRevisionKind,
  ScraperTemplate
} from "./types";

const STORAGE_KEY = "ai-data-platform-saved-scrapers-v1";
const MAX_REVISIONS = 12;
const MAX_CHECK_HISTORY = 20;

function nextId(prefix: string) {
  return (
    prefix +
    "-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 9)
  );
}

export function cloneExtractionRecipe(recipe: ExtractionRecipe): ExtractionRecipe {
  return {
    ...recipe,
    fields: recipe.fields.map((field) => ({
      ...field,
      transforms: [...field.transforms]
    }))
  };
}

export function sourceOriginFor(url: string) {
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function normalizeCompatibilityReport(
  value: unknown
): ScraperCompatibilityReport | null {
  if (!value || typeof value !== "object") return null;
  const report = value as Partial<ScraperCompatibilityReport> & {
    fields?: Array<Partial<ScraperCompatibilityReport["fields"][number]>>;
  };
  if (
    typeof report.checkedAt !== "string" ||
    typeof report.url !== "string" ||
    (report.status !== "healthy" &&
      report.status !== "degraded" &&
      report.status !== "broken")
  ) {
    return null;
  }

  return {
    checkedAt: report.checkedAt,
    url: report.url,
    status: report.status,
    recordMatches:
      typeof report.recordMatches === "number" ? report.recordMatches : 0,
    sampledRecords:
      typeof report.sampledRecords === "number" ? report.sampledRecords : 0,
    structuralFingerprint:
      typeof report.structuralFingerprint === "string"
        ? report.structuralFingerprint
        : "",
    previousStructuralFingerprint:
      typeof report.previousStructuralFingerprint === "string"
        ? report.previousStructuralFingerprint
        : null,
    structuralChanged: report.structuralChanged === true,
    fields: Array.isArray(report.fields)
      ? report.fields.flatMap((field) =>
          typeof field.key === "string" && typeof field.label === "string"
            ? [
                {
                  key: field.key,
                  label: field.label,
                  selector:
                    typeof field.selector === "string" ? field.selector : "",
                  matchedRecords:
                    typeof field.matchedRecords === "number"
                      ? field.matchedRecords
                      : 0,
                  sampledRecords:
                    typeof field.sampledRecords === "number"
                      ? field.sampledRecords
                      : 0,
                  coverage:
                    typeof field.coverage === "number" ? field.coverage : 0,
                  previousCoverage:
                    typeof field.previousCoverage === "number"
                      ? field.previousCoverage
                      : null,
                  trend:
                    field.trend === "stable" ||
                    field.trend === "improved" ||
                    field.trend === "degraded" ||
                    field.trend === "broken"
                      ? field.trend
                      : "new",
                  required: field.required === true,
                  validSelector: field.validSelector !== false,
                  samples: Array.isArray(field.samples)
                    ? field.samples
                        .filter(
                          (sample): sample is string =>
                            typeof sample === "string"
                        )
                        .slice(0, 4)
                    : []
                }
              ]
            : []
        )
      : [],
    issues: Array.isArray(report.issues) ? report.issues : [],
    repairCandidateCount:
      typeof report.repairCandidateCount === "number"
        ? report.repairCandidateCount
        : 0,
    warnings: Array.isArray(report.warnings)
      ? report.warnings.filter(
          (warning): warning is string => typeof warning === "string"
        )
      : []
  };
}

function normalizeItems(value: unknown): SavedScraper[] {
  if (!value || typeof value !== "object") return [];
  const record = value as { version?: unknown; items?: unknown };
  if (record.version !== 1 || !Array.isArray(record.items)) return [];
  return record.items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<SavedScraper>;
    if (
      candidate.version !== 1 ||
      typeof candidate.id !== "string" ||
      (candidate.kind !== "scraper" && candidate.kind !== "template") ||
      typeof candidate.revision !== "number" ||
      !candidate.recipe ||
      !Array.isArray(candidate.revisions)
    ) {
      return [];
    }

    const lastCheck = normalizeCompatibilityReport(candidate.lastCheck);
    const checkHistory = Array.isArray(candidate.checkHistory)
      ? candidate.checkHistory
          .map(normalizeCompatibilityReport)
          .filter(
            (report): report is ScraperCompatibilityReport => Boolean(report)
          )
          .slice(-MAX_CHECK_HISTORY)
      : lastCheck
        ? [lastCheck]
        : [];

    return [
      {
        ...candidate,
        version: 1 as const,
        lastCheck,
        checkHistory,
        structuralFingerprint:
          typeof candidate.structuralFingerprint === "string"
            ? candidate.structuralFingerprint
            : lastCheck?.structuralFingerprint || null,
        revisionKind: candidate.revisionKind ?? "initial"
      } as SavedScraper
    ];
  });
}

async function loadAllSavedScrapers() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return normalizeItems(stored[STORAGE_KEY]);
}

export async function loadSavedScrapers() {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return [];

  return (await loadAllSavedScrapers())
    .filter((item) => item.workspaceId === workspaceId)
    .sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
}

async function writeSavedScrapers(items: SavedScraper[]) {
  await chrome.storage.local.set({ [STORAGE_KEY]: { version: 1, items } });
}

export async function createSavedScraper(
  recipe: ExtractionRecipe,
  sourceUrl: string,
  kind: SavedScraperKind
) {
  const items = await loadAllSavedScrapers();
  const workspaceId = await requireActiveWorkspaceId();
  const now = new Date().toISOString();
  const saved: SavedScraper = {
    version: 1,
    id: nextId(kind),
    workspaceId,
    kind,
    name: recipe.name.trim() || "Untitled extraction recipe",
    sourceUrl,
    sourceOrigin: sourceOriginFor(sourceUrl),
    createdAt: now,
    updatedAt: now,
    revision: 1,
    revisionKind: "initial",
    structuralFingerprint: null,
    recipe: cloneExtractionRecipe({ ...recipe, sourceUrl }),
    revisions: [],
    lastCheck: null,
    checkHistory: []
  };
  await writeSavedScrapers([saved, ...items]);
  await queueWorkspaceSyncUpsert({
    workspaceId,
    resource: "saved-scraper",
    recordId: saved.id,
    clientUpdatedAt: saved.updatedAt,
    payload: JSON.parse(JSON.stringify(saved)) as Record<string, unknown>
  });
  scheduleWorkspaceSyncAttempt();
  return saved;
}

export async function updateSavedScraper(
  id: string,
  recipe: ExtractionRecipe,
  sourceUrl: string,
  revisionKind: ScraperRevisionKind = "manual"
): Promise<SavedScraper> {
  const workspaceId = await requireActiveWorkspaceId();
  const items = await loadAllSavedScrapers();
  const index = items.findIndex(
    (item) => item.id === id && item.workspaceId === workspaceId
  );

  if (index < 0) {
    throw new Error("The selected saved scraper no longer exists.");
  }

  const item = items[index];
  const now = new Date().toISOString();
  const previous = {
    revision: item.revision,
    savedAt: item.updatedAt,
    sourceUrl: item.sourceUrl,
    revisionKind: item.revisionKind ?? "manual",
    structuralFingerprint: item.structuralFingerprint ?? null,
    compatibility: item.lastCheck,
    recipe: cloneExtractionRecipe(item.recipe)
  };
  const updated: SavedScraper = {
    ...item,
    name: recipe.name.trim() || item.name,
    sourceUrl,
    sourceOrigin: sourceOriginFor(sourceUrl),
    updatedAt: now,
    revision: item.revision + 1,
    revisionKind,
    structuralFingerprint: null,
    recipe: cloneExtractionRecipe({ ...recipe, sourceUrl }),
    revisions: [...item.revisions, previous].slice(-MAX_REVISIONS),
    lastCheck: null
  };

  const next = [...items];
  next[index] = updated;
  await writeSavedScrapers(next);
  await queueWorkspaceSyncUpsert({
    workspaceId,
    resource: "saved-scraper",
    recordId: updated.id,
    clientUpdatedAt: updated.updatedAt,
    payload: JSON.parse(JSON.stringify(updated)) as Record<string, unknown>
  });
  scheduleWorkspaceSyncAttempt();
  return updated;
}

export async function deleteSavedScraper(id: string) {
  const workspaceId = await requireActiveWorkspaceId();
  const items = await loadAllSavedScrapers();
  const existing = items.find(
    (item) => item.id === id && item.workspaceId === workspaceId
  );

  await writeSavedScrapers(
    items.filter(
      (item) => !(item.id === id && item.workspaceId === workspaceId)
    )
  );

  if (existing) {
    await queueWorkspaceSyncDelete({
      workspaceId,
      resource: "saved-scraper",
      recordId: id,
      clientUpdatedAt: new Date().toISOString()
    });
    scheduleWorkspaceSyncAttempt();
  }
}

export async function updateSavedScraperCheck(
  id: string,
  report: ScraperCompatibilityReport
) {
  const workspaceId = await requireActiveWorkspaceId();
  const items = await loadAllSavedScrapers();
  const target = items.find(
    (item) => item.id === id && item.workspaceId === workspaceId
  );

  if (!target) {
    return;
  }

  const updated: SavedScraper = {
    ...target,
    lastCheck: report,
    structuralFingerprint: report.structuralFingerprint || null,
    checkHistory: [
      ...(target.checkHistory ?? []),
      report
    ].slice(-MAX_CHECK_HISTORY),
    updatedAt: new Date().toISOString()
  };
  const next = items.map((item) =>
    item.id === id && item.workspaceId === workspaceId ? updated : item
  );

  await writeSavedScrapers(next);
  await queueWorkspaceSyncUpsert({
    workspaceId,
    resource: "saved-scraper",
    recordId: updated.id,
    clientUpdatedAt: updated.updatedAt,
    payload: JSON.parse(JSON.stringify(updated)) as Record<string, unknown>
  });
  scheduleWorkspaceSyncAttempt();
}

export async function applySavedScraperRepair(input: {
  id: string;
  recordSelector?: string;
  fieldSelectors: Record<string, string>;
}) {
  const workspaceId = await requireActiveWorkspaceId();
  const items = await loadAllSavedScrapers();
  const item = items.find(
    (candidate) =>
      candidate.id === input.id && candidate.workspaceId === workspaceId
  );
  if (!item) {
    throw new Error("The selected saved scraper no longer exists.");
  }

  const recordSelector =
    input.recordSelector?.trim() || item.recipe.recordSelector;
  const fields = item.recipe.fields.map((field) => ({
    ...field,
    selector:
      input.fieldSelectors[field.key]?.trim() || field.selector,
    transforms: [...field.transforms]
  }));

  const changed =
    recordSelector !== item.recipe.recordSelector ||
    fields.some(
      (field, index) =>
        field.selector !== item.recipe.fields[index]?.selector
    );
  if (!changed) {
    throw new Error("Select at least one repair candidate before approval.");
  }

  return updateSavedScraper(
    item.id,
    {
      ...cloneExtractionRecipe(item.recipe),
      recordSelector,
      fields
    },
    item.sourceUrl,
    "repair"
  );
}

export async function rollbackSavedScraperRevision(
  id: string,
  revisionNumber: number
) {
  const workspaceId = await requireActiveWorkspaceId();
  const items = await loadAllSavedScrapers();
  const item = items.find(
    (candidate) =>
      candidate.id === id && candidate.workspaceId === workspaceId
  );
  if (!item) {
    throw new Error("The selected saved scraper no longer exists.");
  }
  const revision = item.revisions.find(
    (candidate) => candidate.revision === revisionNumber
  );
  if (!revision) {
    throw new Error("The selected historical revision is no longer retained.");
  }

  return updateSavedScraper(
    item.id,
    cloneExtractionRecipe(revision.recipe),
    revision.sourceUrl,
    "rollback"
  );
}

function field(
  id: string,
  key: string,
  label: string,
  selector: string,
  source: ExtractionFieldRecipe["source"],
  required = false,
  transforms: ExtractionFieldRecipe["transforms"] = ["trim", "collapse-whitespace"]
): ExtractionFieldRecipe {
  return { id, key, label, selector, source, attribute: "", required, transforms };
}

const BUILT_IN_TEMPLATE_DEFINITIONS: ScraperTemplate[] = [
  {
    id: "html-table",
    name: "HTML data table",
    description: "Starter for ordinary tbody rows with the first three columns exposed for editing.",
    recipe: {
      version: 1,
      name: "HTML table starter",
      sourceUrl: "",
      recordSelector: "table tbody tr",
      fields: [
        field("template-table-1", "column_1", "Column 1", "td:nth-child(1)", "text", true),
        field("template-table-2", "column_2", "Column 2", "td:nth-child(2)", "text"),
        field("template-table-3", "column_3", "Column 3", "td:nth-child(3)", "text")
      ]
    }
  },
  {
    id: "schema-product",
    name: "Schema.org product cards",
    description: "Starter for product cards that expose schema.org Product item types.",
    recipe: {
      version: 1,
      name: "Schema product starter",
      sourceUrl: "",
      recordSelector: '[itemtype*="schema.org/Product"]',
      fields: [
        field("template-product-name", "name", "Name", '[itemprop="name"], h2, h3', "text", true),
        field("template-product-price", "price", "Price", '[itemprop="price"], .price', "text", false, ["trim", "collapse-whitespace", "currency"]),
        field("template-product-link", "url", "Product URL", "a[href]", "link", false, ["trim"]),
        field("template-product-image", "image", "Image", '[itemprop="image"], img', "image", false, ["trim"])
      ]
    }
  },
  {
    id: "semantic-articles",
    name: "Semantic article list",
    description: "Starter for search results, news lists, blogs, and directories built from main article elements.",
    recipe: {
      version: 1,
      name: "Article list starter",
      sourceUrl: "",
      recordSelector: "main article",
      fields: [
        field("template-article-title", "title", "Title", "h1, h2, h3", "text", true),
        field("template-article-link", "url", "URL", "a[href]", "link", false, ["trim"]),
        field("template-article-image", "image", "Image", "img", "image", false, ["trim"])
      ]
    }
  }
];

export const BUILT_IN_SCRAPER_TEMPLATES: ScraperTemplate[] =
  BUILT_IN_TEMPLATE_DEFINITIONS.map((template) => ({
    ...template,
    recipe: cloneExtractionRecipe(template.recipe)
  }));
