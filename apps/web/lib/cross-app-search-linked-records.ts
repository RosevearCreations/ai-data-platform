export const CROSS_APP_SEARCH_VERSION = "1.0.0" as const;
export const CROSS_APP_SEARCH_REQUEST_SCHEMA =
  "rosevear.ai-data-platform.cross-app-search-request.v1" as const;
export const CROSS_APP_SEARCH_RESPONSE_SCHEMA =
  "rosevear.ai-data-platform.cross-app-search-response.v1" as const;

export type CrossAppSearchRecordKind =
  | "customer"
  | "contact"
  | "product"
  | "service"
  | "job"
  | "booking";

export type CanonicalLinkKind = CrossAppSearchRecordKind;

export type CrossAppSearchCanonicalLink = {
  kind: CanonicalLinkKind;
  canonicalId: string;
};

export type CrossAppSearchSourceRecord = {
  sourceRecordId: string;
  sourceRecordVersion?: string | null;
  recordKind: CrossAppSearchRecordKind;
  title: string;
  summary?: string | null;
  updatedAt: string;
  tenantId: string;
  workspaceId: string;
  sourcePath: string;
  contractId?: string | null;
  canonicalLinks: readonly CrossAppSearchCanonicalLink[];
  tags?: string[];
};

export type CrossAppSearchAuthorization = {
  capability: "cross-app-search.read";
  granted: boolean;
  evidenceId: string;
  subjectId: string;
  tenantId: string;
  workspaceId: string;
};

export type CrossAppSearchAdapterQuery = {
  query: string;
  recordKinds: readonly CrossAppSearchRecordKind[];
  updatedAfter: string | null;
  limit: number;
};

export type CrossAppSearchSourceAdapter = {
  sourceApplicationId: string;
  sourceOrigin: string;
  mappedApplication: boolean;
  authorization: CrossAppSearchAuthorization;
  search(
    input: Readonly<CrossAppSearchAdapterQuery>
  ):
    | CrossAppSearchSourceRecord[]
    | Promise<CrossAppSearchSourceRecord[]>;
};

export type CrossAppSearchHostContext = {
  hostApplicationId: string;
  hostEnvironment: "development" | "test" | "staging" | "production";
  subjectId: string;
  tenantId: string;
  workspaceId: string;
  auditCorrelationId: string;
};

export type CrossAppSearchFilters = {
  sourceApplicationIds?: string[];
  recordKinds?: CrossAppSearchRecordKind[];
  updatedAfter?: string | null;
};

export type CrossAppSearchRequest = {
  query: string;
  context: CrossAppSearchHostContext;
  filters?: CrossAppSearchFilters;
  limit?: number;
};

export type CrossAppSearchProvenance = {
  sourceApplicationId: string;
  sourceRecordId: string;
  sourceRecordVersion: string | null;
  contractId: string | null;
  sourceUpdatedAt: string;
  mappedApplication: true;
  authorizationEvidenceId: string;
  authorizationSubjectId: string;
};

export type CrossAppSearchResult = {
  nodeId: string;
  recordKind: CrossAppSearchRecordKind;
  title: string;
  summary: string | null;
  canonicalLinks: readonly CrossAppSearchCanonicalLink[];
  sourceDeepLink: string;
  provenance: CrossAppSearchProvenance;
};

export type CrossAppSearchGraphEdge = {
  edgeId: string;
  canonicalKind: CanonicalLinkKind;
  canonicalId: string;
  fromNodeId: string;
  toNodeId: string;
};

export type CrossAppSearchResponse = {
  schema: typeof CROSS_APP_SEARCH_RESPONSE_SCHEMA;
  version: typeof CROSS_APP_SEARCH_VERSION;
  query: string;
  tenantId: string;
  workspaceId: string;
  results: readonly CrossAppSearchResult[];
  graph: {
    nodes: readonly string[];
    edges: readonly CrossAppSearchGraphEdge[];
  };
  sources: ReadonlyArray<{
    sourceApplicationId: string;
    resultCount: number;
    mappedApplication: true;
    authorizationEvidenceId: string;
  }>;
  security: {
    readOnly: true;
    sourceRecordsMutated: false;
    sourceWritesRequested: false;
    tenantIsolationRequired: true;
    workspaceIsolationRequired: true;
    authorizationRequiredPerSource: true;
    mappingRequiredPerSource: true;
    deepLinksGrantAuthorization: false;
    searchActivatesConnection: false;
    ql266Resumed: false;
  };
};

export class CrossAppSearchError extends Error {
  readonly code:
    | "request_invalid"
    | "source_not_mapped"
    | "source_not_authorized"
    | "source_scope_mismatch"
    | "source_record_invalid"
    | "source_deep_link_invalid";

  constructor(code: CrossAppSearchError["code"], message: string) {
    super(message);
    this.name = "CrossAppSearchError";
    this.code = code;
  }
}

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{0,127}$/;
const APP_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const CANONICAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{0,191}$/;
const RECORD_KINDS: CrossAppSearchRecordKind[] = [
  "customer",
  "contact",
  "product",
  "service",
  "job",
  "booking"
];

function assertSafeId(value: string, field: string) {
  if (!ID_PATTERN.test(value)) {
    throw new CrossAppSearchError(
      "request_invalid",
      field + " contains an invalid identifier."
    );
  }
}

function normalizeQuery(value: string) {
  const query = value.trim().replace(/\s+/g, " ");
  if (!query || query.length > 200 || /[\r\n\0]/.test(query)) {
    throw new CrossAppSearchError(
      "request_invalid",
      "Search query must be a single bounded text value."
    );
  }
  return query;
}

function normalizeLimit(value: number | undefined) {
  const limit = value ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new CrossAppSearchError(
      "request_invalid",
      "Search result limit must be an integer from 1 to 100."
    );
  }
  return limit;
}

function normalizeKinds(values: CrossAppSearchRecordKind[] | undefined) {
  const kinds = values?.length ? [...new Set(values)] : [...RECORD_KINDS];
  if (kinds.some((kind) => !RECORD_KINDS.includes(kind))) {
    throw new CrossAppSearchError(
      "request_invalid",
      "Search record kind is unsupported."
    );
  }
  return kinds;
}

function normalizeSourceFilter(values: string[] | undefined) {
  if (!values?.length) return null;
  const ids = [...new Set(values)];
  if (
    ids.length > 25 ||
    ids.some((id) => !APP_ID_PATTERN.test(id) || id.length > 120)
  ) {
    throw new CrossAppSearchError(
      "request_invalid",
      "Source application filter is invalid."
    );
  }
  return new Set(ids);
}

function normalizeUpdatedAfter(value: string | null | undefined) {
  if (value == null || value === "") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new CrossAppSearchError(
      "request_invalid",
      "updatedAfter must be a valid timestamp."
    );
  }
  return new Date(timestamp).toISOString();
}

function normalizeOrigin(value: string) {
  let origin: URL;
  try {
    origin = new URL(value);
  } catch {
    throw new CrossAppSearchError(
      "source_deep_link_invalid",
      "Source application origin is invalid."
    );
  }
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new CrossAppSearchError(
      "source_deep_link_invalid",
      "Source application origin must be an HTTPS origin without credentials."
    );
  }
  return origin.origin;
}

function normalizeSourcePath(value: string) {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\r\n\0]/.test(value) ||
    value.length > 1200
  ) {
    throw new CrossAppSearchError(
      "source_deep_link_invalid",
      "Source record path must be a safe application-relative path."
    );
  }
  const parsed = new URL(value, "https://source.invalid");
  if (parsed.origin !== "https://source.invalid") {
    throw new CrossAppSearchError(
      "source_deep_link_invalid",
      "Source record path may not change origin."
    );
  }
  return parsed.pathname + parsed.search + parsed.hash;
}

function normalizeCanonicalLinks(values: readonly CrossAppSearchCanonicalLink[]) {
  if (!Array.isArray(values) || values.length > 20) {
    throw new CrossAppSearchError(
      "source_record_invalid",
      "Canonical link collection is invalid."
    );
  }
  const seen = new Set<string>();
  return values.map((link) => {
    if (
      !RECORD_KINDS.includes(link.kind) ||
      !CANONICAL_ID_PATTERN.test(link.canonicalId)
    ) {
      throw new CrossAppSearchError(
        "source_record_invalid",
        "Canonical link is invalid."
      );
    }
    const key = link.kind + ":" + link.canonicalId;
    if (seen.has(key)) {
      throw new CrossAppSearchError(
        "source_record_invalid",
        "Canonical links must be unique per record."
      );
    }
    seen.add(key);
    return Object.freeze({
      kind: link.kind,
      canonicalId: link.canonicalId
    });
  });
}

function normalizeRecord(
  adapter: CrossAppSearchSourceAdapter,
  context: CrossAppSearchHostContext,
  record: CrossAppSearchSourceRecord
): CrossAppSearchResult {
  assertSafeId(record.sourceRecordId, "sourceRecordId");
  if (
    record.sourceRecordVersion != null &&
    !ID_PATTERN.test(record.sourceRecordVersion)
  ) {
    throw new CrossAppSearchError(
      "source_record_invalid",
      "Source record version is invalid."
    );
  }
  if (!RECORD_KINDS.includes(record.recordKind)) {
    throw new CrossAppSearchError(
      "source_record_invalid",
      "Source record kind is unsupported."
    );
  }
  if (
    record.tenantId !== context.tenantId ||
    record.workspaceId !== context.workspaceId
  ) {
    throw new CrossAppSearchError(
      "source_scope_mismatch",
      "Source returned a record outside the authorized tenant/workspace."
    );
  }

  const title = record.title.trim();
  const summary = record.summary?.trim() || null;
  if (
    !title ||
    title.length > 240 ||
    (summary != null && summary.length > 1200) ||
    /[\0]/.test(title + (summary ?? ""))
  ) {
    throw new CrossAppSearchError(
      "source_record_invalid",
      "Source record display fields are invalid."
    );
  }

  const updatedAtMs = Date.parse(record.updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    throw new CrossAppSearchError(
      "source_record_invalid",
      "Source record updatedAt is invalid."
    );
  }

  const sourceOrigin = normalizeOrigin(adapter.sourceOrigin);
  const sourcePath = normalizeSourcePath(record.sourcePath);
  const nodeId =
    adapter.sourceApplicationId + ":" + record.recordKind + ":" + record.sourceRecordId;

  return Object.freeze({
    nodeId,
    recordKind: record.recordKind,
    title,
    summary,
    canonicalLinks: Object.freeze(normalizeCanonicalLinks(record.canonicalLinks)),
    sourceDeepLink: new URL(sourcePath, sourceOrigin).toString(),
    provenance: Object.freeze({
      sourceApplicationId: adapter.sourceApplicationId,
      sourceRecordId: record.sourceRecordId,
      sourceRecordVersion: record.sourceRecordVersion ?? null,
      contractId: record.contractId ?? null,
      sourceUpdatedAt: new Date(updatedAtMs).toISOString(),
      mappedApplication: true as const,
      authorizationEvidenceId: adapter.authorization.evidenceId,
      authorizationSubjectId: adapter.authorization.subjectId
    })
  });
}

function buildGraph(results: CrossAppSearchResult[]) {
  const buckets = new Map<string, string[]>();

  for (const result of results) {
    for (const link of result.canonicalLinks) {
      const key = link.kind + ":" + link.canonicalId;
      const nodes = buckets.get(key) ?? [];
      nodes.push(result.nodeId);
      buckets.set(key, nodes);
    }
  }

  const edges: CrossAppSearchGraphEdge[] = [];
  for (const [key, nodes] of buckets) {
    const uniqueNodes = [...new Set(nodes)].sort();
    if (uniqueNodes.length < 2) continue;
    const separator = key.indexOf(":");
    const canonicalKind = key.slice(0, separator) as CanonicalLinkKind;
    const canonicalId = key.slice(separator + 1);
    for (let index = 0; index < uniqueNodes.length - 1; index += 1) {
      for (let right = index + 1; right < uniqueNodes.length; right += 1) {
        edges.push({
          edgeId:
            canonicalKind +
            ":" +
            canonicalId +
            ":" +
            uniqueNodes[index] +
            "->" +
            uniqueNodes[right],
          canonicalKind,
          canonicalId,
          fromNodeId: uniqueNodes[index],
          toNodeId: uniqueNodes[right]
        });
      }
    }
  }

  return Object.freeze({
    nodes: Object.freeze(results.map((result) => result.nodeId)),
    edges: Object.freeze(edges)
  });
}

function assertContext(context: CrossAppSearchHostContext) {
  if (!APP_ID_PATTERN.test(context.hostApplicationId)) {
    throw new CrossAppSearchError(
      "request_invalid",
      "Host application ID is invalid."
    );
  }
  for (const [field, value] of [
    ["subjectId", context.subjectId],
    ["tenantId", context.tenantId],
    ["workspaceId", context.workspaceId],
    ["auditCorrelationId", context.auditCorrelationId]
  ] as const) {
    assertSafeId(value, field);
  }
}

function assertAdapterAuthorized(
  adapter: CrossAppSearchSourceAdapter,
  context: CrossAppSearchHostContext
) {
  if (!APP_ID_PATTERN.test(adapter.sourceApplicationId)) {
    throw new CrossAppSearchError(
      "source_not_mapped",
      "Source application identity is invalid."
    );
  }
  if (!adapter.mappedApplication) {
    throw new CrossAppSearchError(
      "source_not_mapped",
      "Federated search requires an explicitly mapped source application."
    );
  }
  if (
    !adapter.authorization.granted ||
    adapter.authorization.capability !== "cross-app-search.read"
  ) {
    throw new CrossAppSearchError(
      "source_not_authorized",
      "Federated search requires an explicit read grant for every source."
    );
  }
  if (
    adapter.authorization.subjectId !== context.subjectId ||
    adapter.authorization.tenantId !== context.tenantId ||
    adapter.authorization.workspaceId !== context.workspaceId
  ) {
    throw new CrossAppSearchError(
      "source_scope_mismatch",
      "Source authorization does not match the active subject/tenant/workspace."
    );
  }
  assertSafeId(adapter.authorization.evidenceId, "authorizationEvidenceId");
}

export async function executeAuthorizedFederatedSearch(
  request: CrossAppSearchRequest,
  adapters: CrossAppSearchSourceAdapter[]
): Promise<CrossAppSearchResponse> {
  assertContext(request.context);

  const query = normalizeQuery(request.query);
  const limit = normalizeLimit(request.limit);
  const recordKinds = normalizeKinds(request.filters?.recordKinds);
  const updatedAfter = normalizeUpdatedAfter(request.filters?.updatedAfter);
  const sourceFilter = normalizeSourceFilter(
    request.filters?.sourceApplicationIds
  );

  if (!Array.isArray(adapters) || adapters.length > 25) {
    throw new CrossAppSearchError(
      "request_invalid",
      "Search source adapter collection is invalid."
    );
  }

  const selected = adapters.filter(
    (adapter) => !sourceFilter || sourceFilter.has(adapter.sourceApplicationId)
  );

  const results: CrossAppSearchResult[] = [];
  const sourceSummaries: Array<{
    sourceApplicationId: string;
    resultCount: number;
    mappedApplication: true;
    authorizationEvidenceId: string;
  }> = [];

  for (const adapter of selected) {
    assertAdapterAuthorized(adapter, request.context);

    const raw = await adapter.search(
      Object.freeze({
        query,
        recordKinds: Object.freeze([...recordKinds]),
        updatedAfter,
        limit
      })
    );

    if (!Array.isArray(raw) || raw.length > 500) {
      throw new CrossAppSearchError(
        "source_record_invalid",
        "Source returned an invalid or excessive record collection."
      );
    }

    let accepted = 0;
    for (const record of raw) {
      if (!recordKinds.includes(record.recordKind)) continue;
      if (
        updatedAfter &&
        Date.parse(record.updatedAt) < Date.parse(updatedAfter)
      ) {
        continue;
      }
      const normalized = normalizeRecord(adapter, request.context, record);
      results.push(normalized);
      accepted += 1;
      if (results.length >= limit) break;
    }

    sourceSummaries.push(
      Object.freeze({
        sourceApplicationId: adapter.sourceApplicationId,
        resultCount: accepted,
        mappedApplication: true as const,
        authorizationEvidenceId: adapter.authorization.evidenceId
      })
    );

    if (results.length >= limit) break;
  }

  results.sort((left, right) => {
    const time =
      Date.parse(right.provenance.sourceUpdatedAt) -
      Date.parse(left.provenance.sourceUpdatedAt);
    return time || left.nodeId.localeCompare(right.nodeId);
  });

  const bounded = Object.freeze(results.slice(0, limit));
  const graph = buildGraph([...bounded]);

  return Object.freeze({
    schema: CROSS_APP_SEARCH_RESPONSE_SCHEMA,
    version: CROSS_APP_SEARCH_VERSION,
    query,
    tenantId: request.context.tenantId,
    workspaceId: request.context.workspaceId,
    results: bounded,
    graph,
    sources: Object.freeze(sourceSummaries),
    security: Object.freeze({
      readOnly: true as const,
      sourceRecordsMutated: false as const,
      sourceWritesRequested: false as const,
      tenantIsolationRequired: true as const,
      workspaceIsolationRequired: true as const,
      authorizationRequiredPerSource: true as const,
      mappingRequiredPerSource: true as const,
      deepLinksGrantAuthorization: false as const,
      searchActivatesConnection: false as const,
      ql266Resumed: false as const
    })
  });
}

export function crossAppSearchCapabilityDescriptor() {
  return Object.freeze({
    schema: CROSS_APP_SEARCH_REQUEST_SCHEMA,
    responseSchema: CROSS_APP_SEARCH_RESPONSE_SCHEMA,
    version: CROSS_APP_SEARCH_VERSION,
    capability: "cross-app-search.read",
    recordKinds: Object.freeze([...RECORD_KINDS]),
    filters: Object.freeze([
      "sourceApplicationIds",
      "recordKinds",
      "updatedAfter"
    ]),
    linkedRecordGraph: true,
    sourceProvenance: true,
    deepLinksToSourceApplications: true,
    readOnly: true,
    sourceWritesRequested: false,
    authorizationRequiredPerSource: true,
    tenantWorkspaceIsolation: true,
    mappingRequiredPerSource: true,
    searchActivatesConnection: false,
    ql266Resumed: false
  });
}
