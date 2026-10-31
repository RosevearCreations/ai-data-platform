import { HELP_TOPICS } from "@/app/help/help-content";

import { APPLICATION_NAVIGATION, MODULE_CARDS, moduleHubHref } from "./application-navigation";
import { listApprovedDatasetPublishingForUser } from "./approved-dataset-publishing";
import { listCollectionProjectsForUser } from "./collection-project-database";
import { listCollectionRunConsoleForUser } from "./collection-runs";
import { listUnifiedDataLibrary, normalizeDataLibraryQuery } from "./data-library";
import { listIntelligenceOverviewForUser, listWorkspacesForUser } from "./database";
import { listIntegrationDeliveryOverviewForUser } from "./integration-delivery-database";
import { listVisualRecipesForUser } from "./recipe-builder-database";

export const UNIFIED_SEARCH_SCOPES = [
  "all",
  "navigation",
  "data",
  "approved",
  "collection",
  "intelligence",
  "integrations",
  "workspace",
  "help"
] as const;

export type UnifiedSearchScope = (typeof UNIFIED_SEARCH_SCOPES)[number];

export type UnifiedSearchResult = {
  id: string;
  scope: Exclude<UnifiedSearchScope, "all">;
  kind:
    | "module"
    | "screen"
    | "data-record"
    | "approved-dataset"
    | "publication"
    | "collection-project"
    | "collection-run"
    | "recipe"
    | "intelligence-module"
    | "evidence"
    | "integration-event"
    | "workspace"
    | "help-topic";
  title: string;
  detail: string;
  href: string;
  workspaceName?: string;
  meta?: string;
  score: number;
};

export type UnifiedSearchModel = {
  query: string;
  scope: UnifiedSearchScope;
  results: UnifiedSearchResult[];
  counts: Record<Exclude<UnifiedSearchScope, "all">, number>;
  total: number;
};

function text(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function boundedQuery(value: unknown) {
  return normalize(typeof value === "string" ? value.slice(0, 120) : "");
}

export function normalizeUnifiedSearchScope(value: unknown): UnifiedSearchScope {
  return UNIFIED_SEARCH_SCOPES.includes(value as UnifiedSearchScope)
    ? (value as UnifiedSearchScope)
    : "all";
}

function matchScore(query: string, title: string, values: unknown[]) {
  const tokens = query.split(" ").filter(Boolean);
  if (!tokens.length) return -1;
  const normalizedTitle = normalize(title);
  const haystack = normalize([title, ...values.map(text)].join(" "));
  if (!tokens.every((token) => haystack.includes(token))) return -1;

  let score = 10;
  if (normalizedTitle === query) score += 120;
  else if (normalizedTitle.startsWith(query)) score += 80;
  else if (normalizedTitle.includes(query)) score += 55;
  score += tokens.reduce((total, token) => total + (normalizedTitle.includes(token) ? 12 : 3), 0);
  return score;
}

function result(
  query: string,
  input: Omit<UnifiedSearchResult, "score">,
  values: unknown[] = []
): UnifiedSearchResult | null {
  const score = matchScore(query, input.title, [input.detail, input.workspaceName, input.meta, ...values]);
  return score < 0 ? null : { ...input, score };
}

function takeMatches(items: Array<UnifiedSearchResult | null>, limit = 12) {
  return items
    .filter((item): item is UnifiedSearchResult => Boolean(item))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, limit);
}

function navigationResults(query: string) {
  const modules = MODULE_CARDS.map((group) =>
    result(query, {
      id: "module:" + group.id,
      scope: "navigation",
      kind: "module",
      title: group.label,
      detail: group.description,
      href: moduleHubHref(group.id),
      meta: "Module hub"
    }, [group.shortLabel])
  );
  const screens = APPLICATION_NAVIGATION.flatMap((group) =>
    group.items.map((item) =>
      result(query, {
        id: "screen:" + item.href,
        scope: "navigation",
        kind: "screen",
        title: item.label,
        detail: item.description,
        href: item.href,
        meta: group.label
      }, [group.shortLabel])
    )
  );
  return takeMatches([...modules, ...screens], 16);
}

function helpResults(query: string) {
  return takeMatches(
    Object.entries(HELP_TOPICS).map(([key, topic]) =>
      result(query, {
        id: "help:" + key,
        scope: "help",
        kind: "help-topic",
        title: topic.title,
        detail: topic.summary,
        href: "/help#" + key,
        meta: "Help topic"
      }, [key, topic.steps, "notes" in topic ? topic.notes : [], "manual" in topic ? topic.manual : []])
    ),
    16
  );
}

export async function buildUnifiedCrossModuleSearch(
  userId: string,
  input: { query?: unknown; scope?: unknown }
): Promise<UnifiedSearchModel> {
  const query = boundedQuery(input.query);
  const scope = normalizeUnifiedSearchScope(input.scope);
  const staticResults = query ? [...navigationResults(query), ...helpResults(query)] : [];

  if (!query) {
    const counts = {
      navigation: 0,
      data: 0,
      approved: 0,
      collection: 0,
      intelligence: 0,
      integrations: 0,
      workspace: 0,
      help: 0
    };
    return { query, scope, results: [], counts, total: 0 };
  }

  const [
    library,
    approved,
    projects,
    runs,
    recipeModel,
    intelligence,
    delivery,
    workspaces
  ] = await Promise.all([
    listUnifiedDataLibrary(userId, normalizeDataLibraryQuery({ search: query, page: 1, pageSize: 12 })),
    listApprovedDatasetPublishingForUser(userId),
    listCollectionProjectsForUser(userId),
    listCollectionRunConsoleForUser(userId),
    listVisualRecipesForUser(userId),
    listIntelligenceOverviewForUser(userId),
    listIntegrationDeliveryOverviewForUser(userId),
    listWorkspacesForUser(userId)
  ]);

  const data = library.records.map((record) =>
    result(query, {
      id: "data:" + record.workspaceId + ":" + record.recordType + ":" + record.recordId,
      scope: "data",
      kind: "data-record",
      title: record.title || record.recordId,
      detail: record.subtitle || record.sourceLabel || record.recordType,
      href:
        "/data-library?workspace=" + encodeURIComponent(record.workspaceId) +
        "&q=" + encodeURIComponent(query),
      workspaceName: record.workspaceName,
      meta: record.recordType + " · " + record.status
    }, [record.sourceUrl, record.sourceLabel, record.normalized, record.raw])
  );

  const approvedResults = [
    ...approved.candidates.map((candidate) =>
      result(query, {
        id: "approved-candidate:" + candidate.workspaceId + ":" + candidate.reviewId,
        scope: "approved",
        kind: "approved-dataset",
        title: candidate.title,
        detail: candidate.rowCount + " approved row(s) · " + (candidate.publicationStatus ?? "not published"),
        href: "/approved-data",
        workspaceName: candidate.workspaceName,
        meta: "Approved dataset candidate"
      }, [candidate.sourceDatasetId, candidate.sourceUrl, candidate.approvalNote])
    ),
    ...approved.publications.map((publication) =>
      result(query, {
        id: "publication:" + publication.workspaceId + ":" + publication.publicationId,
        scope: "approved",
        kind: "publication",
        title: publication.title,
        detail: publication.rowCount + " published row(s) · " + publication.status,
        href: "/approved-data",
        workspaceName: publication.workspaceName,
        meta: "Published dataset"
      }, [publication.sourceDatasetId, publication.sourceUrl, publication.publicationNote, publication.approvalNote])
    )
  ];

  const collectionResults = [
    ...projects.map((project) =>
      result(query, {
        id: "project:" + project.workspaceId + ":" + project.projectId,
        scope: "collection",
        kind: "collection-project",
        title: project.name,
        detail: project.purpose || project.status,
        href: "/collection-projects",
        workspaceName: project.workspaceName,
        meta: project.status + " · " + project.readiness
      }, [project.ownerLabel, project.notes, project.cadence, project.sources.map((source) => [source.displayName, source.sourceUrl, source.sourceOrigin])])
    ),
    ...runs.sources.map((source) =>
      result(query, {
        id: "run:" + source.workspaceId + ":" + source.projectId + ":" + source.sourceId,
        scope: "collection",
        kind: "collection-run",
        title: source.displayName,
        detail: source.projectName + " · " + source.readiness,
        href: "/collection-runs",
        workspaceName: source.workspaceName,
        meta: source.collectionMethod + " · " + source.sourceStatus
      }, [source.sourceUrl, source.sourceOrigin, source.local.latestError, source.remote.latestError])
    ),
    ...recipeModel.recipes.map((recipe) =>
      result(query, {
        id: "recipe:" + recipe.workspaceId + ":" + recipe.recordId,
        scope: "collection",
        kind: "recipe",
        title: recipe.name,
        detail: recipe.kind + " · revision " + recipe.revision,
        href: "/recipe-builder",
        workspaceName: recipe.workspaceName,
        meta: recipe.sourceOrigin || "Recipe"
      }, [recipe.sourceUrl, recipe.recipe])
    )
  ];

  const intelligenceResults: Array<UnifiedSearchResult | null> = [];
  for (const overview of intelligence) {
    for (const module of overview.modules) {
      const record = module as unknown as Record<string, unknown>;
      intelligenceResults.push(
        result(query, {
          id: "intelligence:" + overview.workspace.id + ":" + text(record.moduleKey),
          scope: "intelligence",
          kind: "intelligence-module",
          title: text(record.moduleKey) || "Intelligence module",
          detail: text(record.summary) || "Workspace intelligence",
          href: "/intelligence",
          workspaceName: overview.workspace.name,
          meta: "Intelligence module"
        }, [record.payload, record.serverVersion, record.clientUpdatedAt])
      );
    }
    for (const audit of overview.audit) {
      const record = audit as unknown as Record<string, unknown>;
      intelligenceResults.push(
        result(query, {
          id: "evidence:" + overview.workspace.id + ":" + text(record.auditId),
          scope: "intelligence",
          kind: "evidence",
          title: text(record.action) || "Intelligence evidence",
          detail: text(record.details) || text(record.target),
          href: "/intelligence",
          workspaceName: overview.workspace.name,
          meta: text(record.target) || "Append-only evidence"
        }, [record.batchId, record.fingerprint, record.payload, record.occurredAt])
      );
    }
  }

  const integrationResults: Array<UnifiedSearchResult | null> = [];
  for (const entry of delivery) {
    for (const event of entry.recent) {
      integrationResults.push(
        result(query, {
          id: "integration:" + entry.workspace.id + ":" + event.eventId,
          scope: "integrations",
          kind: "integration-event",
          title: event.eventType,
          detail: event.target + " · " + event.validationCode,
          href: "/integration-delivery",
          workspaceName: entry.workspace.name,
          meta: event.httpStatus ? "HTTP " + event.httpStatus : event.transportMode
        }, [event.consumerId, event.batchId, event.packageId, event.details])
      );
    }
  }

  const workspaceResults = workspaces.map((workspace) =>
    result(query, {
      id: "workspace:" + workspace.id,
      scope: "workspace",
      kind: "workspace",
      title: workspace.name,
      detail: workspace.purpose || workspace.profileDescription,
      href: "/workspace-profiles",
      workspaceName: workspace.name,
      meta: workspace.role + " · " + workspace.profileName
    }, [workspace.slug, workspace.type, workspace.profileKey, workspace.profileCapabilities])
  );

  const all = [
    ...staticResults,
    ...takeMatches(data, 12),
    ...takeMatches(approvedResults, 12),
    ...takeMatches(collectionResults, 16),
    ...takeMatches(intelligenceResults, 16),
    ...takeMatches(integrationResults, 12),
    ...takeMatches(workspaceResults, 12)
  ];

  const counts = {
    navigation: all.filter((item) => item.scope === "navigation").length,
    data: all.filter((item) => item.scope === "data").length,
    approved: all.filter((item) => item.scope === "approved").length,
    collection: all.filter((item) => item.scope === "collection").length,
    intelligence: all.filter((item) => item.scope === "intelligence").length,
    integrations: all.filter((item) => item.scope === "integrations").length,
    workspace: all.filter((item) => item.scope === "workspace").length,
    help: all.filter((item) => item.scope === "help").length
  };

  const visible = (scope === "all" ? all : all.filter((item) => item.scope === scope))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));

  return { query, scope, results: visible, counts, total: all.length };
}
