export const CONNECTOR_SDK_VERSION = 2 as const;
export const CONNECTOR_MANIFEST_VERSION = 2 as const;
export const LEGACY_CONNECTOR_SDK_VERSION = 1 as const;
export const LEGACY_CONNECTOR_MANIFEST_VERSION = 1 as const;
export const CONNECTOR_CAPABILITIES = ["import", "enrichment", "export"] as const;
export const CONNECTOR_HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] as const;

export type ConnectorCapability = (typeof CONNECTOR_CAPABILITIES)[number];
export type ConnectorHttpMethod = (typeof CONNECTOR_HTTP_METHODS)[number];
export type ConnectorConfigScalar = string | number | boolean;

export interface ConnectorConfigField {
  key: string;
  label: string;
  description: string;
  type: "string" | "number" | "boolean";
  required: boolean;
  defaultValue?: ConnectorConfigScalar;
  allowedValues?: string[];
  minimum?: number;
  maximum?: number;
}

export interface ConnectorSecretDeclaration {
  key: string;
  label: string;
  description: string;
  required: boolean;
  environmentVariable: string;
}

export interface ConnectorLimits {
  maxExecutionMs: number;
  maxInputBytes: number;
  maxOutputBytes: number;
}

export interface ConnectorManifestV1 {
  manifestVersion: 1;
  sdkVersion: 1;
  key: string;
  version: string;
  displayName: string;
  description: string;
  capabilities: ConnectorCapability[];
  configSchema: ConnectorConfigField[];
  secrets: ConnectorSecretDeclaration[];
  limits: ConnectorLimits;
}

export type ConnectorAuthenticationPolicy =
  | { mode: "none" }
  | {
      mode: "bearer";
      secretKey: string;
      scheme?: string;
    }
  | {
      mode: "api-key-header";
      secretKey: string;
      headerName: string;
      prefix?: string;
    };

export interface ConnectorRetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryStatuses: number[];
  jitter: boolean;
}

export interface ConnectorRequestPolicy {
  allowedOrigins: string[];
  allowedMethods: ConnectorHttpMethod[];
  defaultTimeoutMs: number;
  retry: ConnectorRetryPolicy;
  userAgent?: string;
}

export type ConnectorPaginationPolicy =
  | { mode: "none" }
  | {
      mode: "cursor";
      itemsPath: string;
      cursorParameter: string;
      nextCursorPath: string;
      pageSizeParameter?: string;
      pageSize?: number;
      maxPages: number;
    }
  | {
      mode: "page-number";
      itemsPath: string;
      pageParameter: string;
      startPage: number;
      pageSizeParameter?: string;
      pageSize?: number;
      maxPages: number;
    };

export interface ConnectorHealthPolicy {
  path: string;
  method: "GET" | "HEAD";
  expectedStatuses: number[];
  timeoutMs?: number;
}

export type ConnectorTransportV2 =
  | {
      kind: "local";
    }
  | {
      kind: "http";
      baseUrlConfigKey: string;
      authentication: ConnectorAuthenticationPolicy;
      request: ConnectorRequestPolicy;
      pagination: ConnectorPaginationPolicy;
      health: ConnectorHealthPolicy;
    };

export interface ConnectorManifestV2 {
  manifestVersion: 2;
  sdkVersion: 2;
  key: string;
  version: string;
  displayName: string;
  description: string;
  capabilities: ConnectorCapability[];
  configSchema: ConnectorConfigField[];
  secrets: ConnectorSecretDeclaration[];
  limits: ConnectorLimits;
  transport: ConnectorTransportV2;
}

export type ConnectorManifest = ConnectorManifestV1 | ConnectorManifestV2;

export interface ConnectorSecretReference {
  kind: "environment";
  environmentVariable: string;
}

export type ConnectorSecretReferences = Record<string, ConnectorSecretReference>;

export type ConnectorAuditEventType =
  | "request-started"
  | "request-retrying"
  | "request-succeeded"
  | "request-failed"
  | "page-received"
  | "health-checked";

export interface ConnectorAuditEvent {
  type: ConnectorAuditEventType;
  occurredAt: string;
  correlationId: string;
  connectorKey: string;
  method?: ConnectorHttpMethod;
  origin?: string;
  path?: string;
  status?: number | null;
  attempt?: number;
  durationMs?: number;
  retryDelayMs?: number;
  page?: number;
  itemCount?: number;
  errorCode?: string | null;
  detail?: string | null;
}

export interface ConnectorAuditSink {
  record(event: ConnectorAuditEvent): void | Promise<void>;
}

export interface ConnectorHttpEvidence {
  sdkVersion: 2;
  requests: number;
  retries: number;
  succeededRequests: number;
  failedRequests: number;
  pages: number;
  healthChecks: number;
  lastStatus: number | null;
  lastErrorCode: string | null;
}

export type ConnectorRequestBody =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[];

export interface ConnectorHttpRequest {
  path: string;
  method?: ConnectorHttpMethod;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  body?: ConnectorRequestBody;
  timeoutMs?: number;
  signal?: AbortSignal;
  idempotencyKey?: string;
  acceptStatuses?: number[];
  responseType?: "auto" | "json" | "text" | "none";
}

export interface ConnectorHttpResponse<T = unknown> {
  status: number;
  ok: boolean;
  data: T;
  headers: Record<string, string>;
  correlationId: string;
  attempts: number;
  durationMs: number;
}

export interface ConnectorPaginationRequest {
  path: string;
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  body?: ConnectorRequestBody;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ConnectorPaginationResult<T = unknown> {
  items: T[];
  pages: number;
  truncated: boolean;
  lastCursor: string | null;
}

export interface ConnectorHealthResult {
  healthy: boolean;
  status: number | null;
  durationMs: number;
  checkedAt: string;
  errorCode: string | null;
}

export interface ConnectorHttpClient {
  request<T = unknown>(input: ConnectorHttpRequest): Promise<ConnectorHttpResponse<T>>;
  paginate<T = unknown>(input: ConnectorPaginationRequest): Promise<ConnectorPaginationResult<T>>;
  health(): Promise<ConnectorHealthResult>;
  evidence(): ConnectorHttpEvidence;
}

export interface ConnectorExecutionContext {
  workspaceId: string;
  capability: ConnectorCapability;
  config: Record<string, ConnectorConfigScalar>;
  input: unknown;
  signal: AbortSignal;
  secret(key: string): Promise<string>;
  http: ConnectorHttpClient | null;
}

export interface ConnectorExecutionResult {
  output: unknown;
  summary: Record<string, string | number | boolean | null>;
}

export type ConnectorExecutor = (
  context: ConnectorExecutionContext
) => Promise<ConnectorExecutionResult>;

export interface ConnectorDefinition {
  manifest: ConnectorManifest;
  execute: ConnectorExecutor;
}

export interface ConnectorValidationResult {
  valid: boolean;
  errors: string[];
}

export type ConnectorErrorCategory =
  | "configuration"
  | "authentication"
  | "authorization"
  | "timeout"
  | "network"
  | "rate-limit"
  | "remote"
  | "response"
  | "pagination"
  | "aborted"
  | "internal";

export class ConnectorSdkError extends Error {
  readonly code: string;
  readonly category: ConnectorErrorCategory;
  readonly retryable: boolean;
  readonly status: number | null;
  readonly attempt: number | null;

  constructor(input: {
    code: string;
    message: string;
    category: ConnectorErrorCategory;
    retryable?: boolean;
    status?: number | null;
    attempt?: number | null;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "ConnectorSdkError";
    this.code = input.code;
    this.category = input.category;
    this.retryable = input.retryable ?? false;
    this.status = input.status ?? null;
    this.attempt = input.attempt ?? null;
  }
}

const KEY_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const ENV_PATTERN = /^[A-Z][A-Z0-9_]{2,127}$/;
const HEADER_PATTERN = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;
const SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]{0,31}$/;
const PATH_PATTERN = /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/;
const JSON_PATH_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*)*$/;
const QUERY_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_.-]{0,119}$/;
const FORBIDDEN_CALLER_HEADERS = new Set([
  "authorization",
  "cookie",
  "proxy-authorization",
  "x-forwarded-for",
  "x-real-ip",
  "host",
  "connection",
  "content-length"
]);

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function jsonBytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function uniqueStrings(values: unknown[]) {
  return new Set(values.map(String)).size === values.length;
}

function validateCommonManifest(
  manifest: Partial<ConnectorManifestV1 & ConnectorManifestV2>,
  errors: string[]
) {
  if (typeof manifest.key !== "string" || !KEY_PATTERN.test(manifest.key)) {
    errors.push("Connector key must be a stable lowercase dotted/dashed identifier.");
  }
  if (typeof manifest.version !== "string" || !VERSION_PATTERN.test(manifest.version)) {
    errors.push("Connector version must use semantic x.y.z form.");
  }
  if (
    typeof manifest.displayName !== "string" ||
    !manifest.displayName.trim() ||
    manifest.displayName.length > 120
  ) {
    errors.push("Connector display name is required and bounded.");
  }
  if (
    typeof manifest.description !== "string" ||
    !manifest.description.trim() ||
    manifest.description.length > 1000
  ) {
    errors.push("Connector description is required and bounded.");
  }

  const capabilities = Array.isArray(manifest.capabilities)
    ? manifest.capabilities
    : [];
  if (!capabilities.length) errors.push("At least one connector capability is required.");
  if (!uniqueStrings(capabilities)) errors.push("Connector capabilities must be unique.");
  for (const capability of capabilities) {
    if (!CONNECTOR_CAPABILITIES.includes(capability as ConnectorCapability)) {
      errors.push("Unsupported connector capability: " + String(capability));
    }
  }

  const configSchema = Array.isArray(manifest.configSchema) ? manifest.configSchema : [];
  const configKeys = new Set<string>();
  for (const field of configSchema) {
    const item = object(field) as Partial<ConnectorConfigField> | null;
    if (!item || typeof item.key !== "string" || !KEY_PATTERN.test(item.key)) {
      errors.push("Every config field requires a stable key.");
      continue;
    }
    if (configKeys.has(item.key)) errors.push("Config field keys must be unique.");
    configKeys.add(item.key);
    if (!["string", "number", "boolean"].includes(String(item.type))) {
      errors.push("Config field type is unsupported: " + item.key);
    }
    if (item.allowedValues && item.type !== "string") {
      errors.push("allowedValues is supported only for string config fields.");
    }
    if (item.allowedValues && !uniqueStrings(item.allowedValues)) {
      errors.push("allowedValues must be unique: " + item.key);
    }
  }

  const secrets = Array.isArray(manifest.secrets) ? manifest.secrets : [];
  const secretKeys = new Set<string>();
  for (const secret of secrets) {
    const item = object(secret) as Partial<ConnectorSecretDeclaration> | null;
    if (
      !item ||
      typeof item.key !== "string" ||
      !KEY_PATTERN.test(item.key) ||
      typeof item.environmentVariable !== "string" ||
      !ENV_PATTERN.test(item.environmentVariable)
    ) {
      errors.push("Secret declarations require a stable key and fixed environment variable.");
      continue;
    }
    if (secretKeys.has(item.key)) errors.push("Secret keys must be unique.");
    secretKeys.add(item.key);
  }

  const limits = object(manifest.limits);
  const maxExecutionMs = Number(limits?.maxExecutionMs);
  const maxInputBytes = Number(limits?.maxInputBytes);
  const maxOutputBytes = Number(limits?.maxOutputBytes);
  if (
    !Number.isInteger(maxExecutionMs) ||
    maxExecutionMs < 100 ||
    maxExecutionMs > 120_000
  ) {
    errors.push("maxExecutionMs must be between 100 and 120000.");
  }
  if (
    !Number.isInteger(maxInputBytes) ||
    maxInputBytes < 1024 ||
    maxInputBytes > 5_000_000
  ) {
    errors.push("maxInputBytes must be between 1024 and 5000000.");
  }
  if (
    !Number.isInteger(maxOutputBytes) ||
    maxOutputBytes < 1024 ||
    maxOutputBytes > 5_000_000
  ) {
    errors.push("maxOutputBytes must be between 1024 and 5000000.");
  }

  return { configSchema, secretKeys };
}

function validateHttpTransport(
  manifest: Partial<ConnectorManifestV2>,
  errors: string[],
  configSchema: unknown[],
  secretKeys: Set<string>
) {
  const transport = object(manifest.transport);
  if (!transport) {
    errors.push("SDK v2 manifests require a transport declaration.");
    return;
  }
  if (transport.kind === "local") return;
  if (transport.kind !== "http") {
    errors.push("SDK v2 transport kind must be local or http.");
    return;
  }

  const baseUrlConfigKey = String(transport.baseUrlConfigKey ?? "");
  const baseField = configSchema
    .map((field) => object(field))
    .find((field) => field?.key === baseUrlConfigKey);
  if (
    !baseUrlConfigKey ||
    !baseField ||
    baseField.type !== "string" ||
    baseField.required !== true
  ) {
    errors.push("HTTP transport baseUrlConfigKey must reference a required string config field.");
  }

  const authentication = object(transport.authentication);
  const authMode = String(authentication?.mode ?? "");
  if (!["none", "bearer", "api-key-header"].includes(authMode)) {
    errors.push("HTTP authentication mode is unsupported.");
  }
  if (authMode === "bearer" || authMode === "api-key-header") {
    const secretKey = String(authentication?.secretKey ?? "");
    if (!secretKeys.has(secretKey)) {
      errors.push("HTTP authentication must reference a declared secret key.");
    }
  }
  if (authMode === "bearer") {
    const scheme = authentication?.scheme;
    if (scheme !== undefined && (typeof scheme !== "string" || !SCHEME_PATTERN.test(scheme))) {
      errors.push("Bearer authentication scheme is invalid.");
    }
  }
  if (authMode === "api-key-header") {
    const headerName = String(authentication?.headerName ?? "");
    if (!HEADER_PATTERN.test(headerName) || FORBIDDEN_CALLER_HEADERS.has(headerName.toLowerCase())) {
      errors.push("API-key header name is unsafe.");
    }
  }

  const request = object(transport.request);
  const origins = Array.isArray(request?.allowedOrigins) ? request.allowedOrigins : [];
  if (!origins.length || origins.length > 20) {
    errors.push("HTTP request policy requires 1-20 allowed origins.");
  }
  const normalizedOrigins = new Set<string>();
  for (const candidate of origins) {
    try {
      const url = new URL(String(candidate));
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash
      ) {
        errors.push("Allowed origins must be credential-free HTTPS origins.");
        continue;
      }
      normalizedOrigins.add(url.origin);
    } catch {
      errors.push("Allowed origin is not a valid HTTPS origin.");
    }
  }
  if (normalizedOrigins.size !== origins.length) {
    errors.push("Allowed origins must be unique after normalization.");
  }

  const methods = Array.isArray(request?.allowedMethods) ? request.allowedMethods : [];
  if (!methods.length || !uniqueStrings(methods)) {
    errors.push("HTTP allowedMethods must be a non-empty unique list.");
  }
  for (const method of methods) {
    if (!CONNECTOR_HTTP_METHODS.includes(method as ConnectorHttpMethod)) {
      errors.push("Unsupported HTTP method: " + String(method));
    }
  }

  const timeout = Number(request?.defaultTimeoutMs);
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 30_000) {
    errors.push("HTTP defaultTimeoutMs must be between 100 and 30000.");
  }

  const retry = object(request?.retry);
  const maxAttempts = Number(retry?.maxAttempts);
  const baseDelayMs = Number(retry?.baseDelayMs);
  const maxDelayMs = Number(retry?.maxDelayMs);
  const retryStatuses = Array.isArray(retry?.retryStatuses) ? retry.retryStatuses : [];
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) {
    errors.push("Retry maxAttempts must be between 1 and 5.");
  }
  if (!Number.isInteger(baseDelayMs) || baseDelayMs < 0 || baseDelayMs > 5000) {
    errors.push("Retry baseDelayMs must be between 0 and 5000.");
  }
  if (
    !Number.isInteger(maxDelayMs) ||
    maxDelayMs < Math.max(0, baseDelayMs) ||
    maxDelayMs > 30_000
  ) {
    errors.push("Retry maxDelayMs must be >= baseDelayMs and <= 30000.");
  }
  if (
    !retryStatuses.length ||
    retryStatuses.length > 20 ||
    !retryStatuses.every((status) => Number.isInteger(status) && status >= 400 && status <= 599) ||
    new Set(retryStatuses).size !== retryStatuses.length
  ) {
    errors.push("Retry statuses must be a unique bounded HTTP status list.");
  }
  if (typeof retry?.jitter !== "boolean") {
    errors.push("Retry jitter must be explicitly true or false.");
  }

  const pagination = object(transport.pagination);
  const paginationMode = String(pagination?.mode ?? "");
  if (!["none", "cursor", "page-number"].includes(paginationMode)) {
    errors.push("Pagination mode is unsupported.");
  }
  if (paginationMode !== "none") {
    const itemsPath = String(pagination?.itemsPath ?? "");
    const maxPages = Number(pagination?.maxPages);
    if (!JSON_PATH_PATTERN.test(itemsPath)) {
      errors.push("Pagination itemsPath is invalid.");
    }
    if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 100) {
      errors.push("Pagination maxPages must be between 1 and 100.");
    }
    const pageSize = pagination?.pageSize;
    if (
      pageSize !== undefined &&
      (!Number.isInteger(Number(pageSize)) || Number(pageSize) < 1 || Number(pageSize) > 1000)
    ) {
      errors.push("Pagination pageSize must be between 1 and 1000.");
    }
    const pageSizeParameter = pagination?.pageSizeParameter;
    if (
      pageSizeParameter !== undefined &&
      (typeof pageSizeParameter !== "string" || !QUERY_KEY_PATTERN.test(pageSizeParameter))
    ) {
      errors.push("Pagination pageSizeParameter is invalid.");
    }
  }
  if (paginationMode === "cursor") {
    if (!QUERY_KEY_PATTERN.test(String(pagination?.cursorParameter ?? ""))) {
      errors.push("Cursor pagination cursorParameter is invalid.");
    }
    if (!JSON_PATH_PATTERN.test(String(pagination?.nextCursorPath ?? ""))) {
      errors.push("Cursor pagination nextCursorPath is invalid.");
    }
  }
  if (paginationMode === "page-number") {
    if (!QUERY_KEY_PATTERN.test(String(pagination?.pageParameter ?? ""))) {
      errors.push("Page pagination pageParameter is invalid.");
    }
    const startPage = Number(pagination?.startPage);
    if (!Number.isInteger(startPage) || startPage < 0 || startPage > 1000) {
      errors.push("Page pagination startPage is invalid.");
    }
  }

  const health = object(transport.health);
  if (
    !health ||
    !PATH_PATTERN.test(String(health.path ?? "")) ||
    !["GET", "HEAD"].includes(String(health.method ?? ""))
  ) {
    errors.push("HTTP health policy requires a safe path and GET/HEAD method.");
  }
  const expectedStatuses = Array.isArray(health?.expectedStatuses)
    ? health.expectedStatuses
    : [];
  if (
    !expectedStatuses.length ||
    expectedStatuses.length > 20 ||
    !expectedStatuses.every((status) => Number.isInteger(status) && status >= 100 && status <= 599) ||
    new Set(expectedStatuses).size !== expectedStatuses.length
  ) {
    errors.push("Health expectedStatuses must be a unique bounded HTTP status list.");
  }
  const healthTimeout = health?.timeoutMs;
  if (
    healthTimeout !== undefined &&
    (!Number.isInteger(Number(healthTimeout)) || Number(healthTimeout) < 100 || Number(healthTimeout) > 30_000)
  ) {
    errors.push("Health timeoutMs must be between 100 and 30000.");
  }
}

export function validateConnectorManifest(value: unknown): ConnectorValidationResult {
  const errors: string[] = [];
  const manifest = object(value) as Partial<ConnectorManifestV1 & ConnectorManifestV2> | null;
  if (!manifest) return { valid: false, errors: ["Manifest must be an object."] };

  if (
    !(
      (manifest.manifestVersion === 1 && manifest.sdkVersion === 1) ||
      (manifest.manifestVersion === 2 && manifest.sdkVersion === 2)
    )
  ) {
    errors.push("Connector manifest/SDK version pair is incompatible.");
  }

  const { configSchema, secretKeys } = validateCommonManifest(manifest, errors);
  if (manifest.manifestVersion === 2 && manifest.sdkVersion === 2) {
    validateHttpTransport(manifest, errors, configSchema, secretKeys);
  }

  return { valid: errors.length === 0, errors };
}

export function connectorManifestGeneration(manifest: ConnectorManifest) {
  return manifest.manifestVersion;
}

export function isConnectorManifestV2(manifest: ConnectorManifest): manifest is ConnectorManifestV2 {
  return manifest.manifestVersion === 2 && manifest.sdkVersion === 2;
}

export function normalizeConnectorConfig(
  manifest: ConnectorManifest,
  value: unknown
) {
  const source = object(value) ?? {};
  const allowed = new Set(manifest.configSchema.map((field) => field.key));
  for (const key of Object.keys(source)) {
    if (!allowed.has(key)) throw new Error("connector_config_unknown_field:" + key);
  }

  const normalized: Record<string, ConnectorConfigScalar> = {};
  for (const field of manifest.configSchema) {
    let current = source[field.key];
    if (current === undefined) current = field.defaultValue;
    if (current === undefined) {
      if (field.required) throw new Error("connector_config_required:" + field.key);
      continue;
    }
    if (typeof current !== field.type) {
      throw new Error("connector_config_type:" + field.key);
    }
    if (
      field.type === "string" &&
      field.allowedValues?.length &&
      !field.allowedValues.includes(current as string)
    ) {
      throw new Error("connector_config_value:" + field.key);
    }
    if (field.type === "number") {
      const numeric = current as number;
      if (field.minimum !== undefined && numeric < field.minimum) {
        throw new Error("connector_config_minimum:" + field.key);
      }
      if (field.maximum !== undefined && numeric > field.maximum) {
        throw new Error("connector_config_maximum:" + field.key);
      }
    }
    normalized[field.key] = current as ConnectorConfigScalar;
  }
  return normalized;
}

export function validateConnectorSecretReferences(
  manifest: ConnectorManifest,
  value: unknown
): ConnectorSecretReferences {
  const source = object(value) ?? {};
  const allowed = new Set(manifest.secrets.map((secret) => secret.key));
  for (const key of Object.keys(source)) {
    if (!allowed.has(key)) throw new Error("connector_secret_unknown:" + key);
  }

  const result: ConnectorSecretReferences = {};
  for (const declaration of manifest.secrets) {
    const raw = source[declaration.key];
    if (raw === undefined) {
      if (declaration.required) {
        throw new Error("connector_secret_reference_required:" + declaration.key);
      }
      continue;
    }
    const reference = object(raw);
    if (
      reference?.kind !== "environment" ||
      reference.environmentVariable !== declaration.environmentVariable
    ) {
      throw new Error("connector_secret_reference_invalid:" + declaration.key);
    }
    result[declaration.key] = {
      kind: "environment",
      environmentVariable: declaration.environmentVariable
    };
  }
  return result;
}

export function assertConnectorCapability(
  manifest: ConnectorManifest,
  grantedCapabilities: readonly string[],
  requested: ConnectorCapability
) {
  if (!manifest.capabilities.includes(requested)) {
    throw new Error("connector_capability_unsupported");
  }
  if (!grantedCapabilities.includes(requested)) {
    throw new Error("connector_capability_not_granted");
  }
}

export function assertConnectorInputBound(
  manifest: ConnectorManifest,
  input: unknown
) {
  if (jsonBytes(input) > manifest.limits.maxInputBytes) {
    throw new Error("connector_input_too_large");
  }
}

export function assertConnectorOutputBound(
  manifest: ConnectorManifest,
  output: unknown
) {
  if (jsonBytes(output) > manifest.limits.maxOutputBytes) {
    throw new Error("connector_output_too_large");
  }
}

export function defineConnector(
  manifest: ConnectorManifest,
  execute: ConnectorExecutor
): ConnectorDefinition {
  const validation = validateConnectorManifest(manifest);
  if (!validation.valid) {
    throw new Error("Invalid connector manifest: " + validation.errors.join(" "));
  }
  return { manifest, execute };
}

function normalizeOrigin(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new ConnectorSdkError({
      code: "connector_http_origin_invalid",
      message: "Connector HTTP origin must be a credential-free HTTPS origin.",
      category: "configuration"
    });
  }
  return url.origin;
}

function normalizedBaseUrl(manifest: ConnectorManifestV2, config: Record<string, ConnectorConfigScalar>) {
  if (manifest.transport.kind !== "http") {
    throw new ConnectorSdkError({
      code: "connector_http_not_configured",
      message: "Connector does not declare HTTP transport.",
      category: "configuration"
    });
  }
  const raw = config[manifest.transport.baseUrlConfigKey];
  if (typeof raw !== "string") {
    throw new ConnectorSdkError({
      code: "connector_http_base_url_missing",
      message: "Connector HTTP base URL is not configured.",
      category: "configuration"
    });
  }
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new ConnectorSdkError({
      code: "connector_http_base_url_invalid",
      message: "Connector HTTP base URL must use HTTPS and contain no inline credentials.",
      category: "configuration"
    });
  }
  const allowedOrigins = new Set(manifest.transport.request.allowedOrigins.map(normalizeOrigin));
  if (!allowedOrigins.has(url.origin)) {
    throw new ConnectorSdkError({
      code: "connector_http_origin_not_allowed",
      message: "Connector HTTP base URL origin is not declared by the manifest.",
      category: "authorization"
    });
  }
  return url;
}

function buildUrl(
  baseUrl: URL,
  path: string,
  query: ConnectorHttpRequest["query"],
  allowedOrigins: Set<string>
) {
  const url = (() => {
    if (/^https:\/\//i.test(path)) return new URL(path);
    if (!PATH_PATTERN.test(path)) {
      throw new ConnectorSdkError({
        code: "connector_http_path_invalid",
        message: "Connector request path must be a safe absolute path.",
        category: "configuration"
      });
    }
    return new URL(path, baseUrl);
  })();

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !allowedOrigins.has(url.origin)
  ) {
    throw new ConnectorSdkError({
      code: "connector_http_destination_not_allowed",
      message: "Connector request destination is outside the manifest allowlist.",
      category: "authorization"
    });
  }

  for (const [key, value] of Object.entries(query ?? {})) {
    if (!QUERY_KEY_PATTERN.test(key)) {
      throw new ConnectorSdkError({
        code: "connector_http_query_key_invalid",
        message: "Connector request query key is invalid.",
        category: "configuration"
      });
    }
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

function safeHeaders(input: Record<string, string> | undefined) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(input ?? {})) {
    const lower = name.toLowerCase();
    if (!HEADER_PATTERN.test(name) || FORBIDDEN_CALLER_HEADERS.has(lower)) {
      throw new ConnectorSdkError({
        code: "connector_http_header_not_allowed",
        message: "Connector request includes a forbidden header.",
        category: "authorization"
      });
    }
    if (value.length > 4096 || /[\r\n]/.test(value)) {
      throw new ConnectorSdkError({
        code: "connector_http_header_invalid",
        message: "Connector request header value is invalid.",
        category: "configuration"
      });
    }
    headers.set(name, value);
  }
  return headers;
}

async function applyAuthentication(
  policy: ConnectorAuthenticationPolicy,
  headers: Headers,
  secret: (key: string) => Promise<string>
) {
  if (policy.mode === "none") return;
  const value = await secret(policy.secretKey);
  if (!value) {
    throw new ConnectorSdkError({
      code: "connector_auth_secret_empty",
      message: "Connector authentication secret resolved to an empty value.",
      category: "authentication"
    });
  }
  if (policy.mode === "bearer") {
    if (headers.has("authorization")) {
      throw new ConnectorSdkError({
        code: "connector_auth_header_conflict",
        message: "Authorization is managed by the connector SDK.",
        category: "authorization"
      });
    }
    headers.set("authorization", (policy.scheme ?? "Bearer") + " " + value);
    return;
  }
  if (headers.has(policy.headerName)) {
    throw new ConnectorSdkError({
      code: "connector_auth_header_conflict",
      message: "Authentication header is managed by the connector SDK.",
      category: "authorization"
    });
  }
  headers.set(policy.headerName, (policy.prefix ?? "") + value);
}

function requestBody(value: ConnectorRequestBody | undefined) {
  if (value === undefined) return { body: undefined as string | undefined, contentType: null as string | null };
  if (typeof value === "string") return { body: value, contentType: "text/plain; charset=utf-8" };
  return {
    body: JSON.stringify(value),
    contentType: "application/json; charset=utf-8"
  };
}

function headerRecord(headers: Headers) {
  const result: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    if (
      key === "content-type" ||
      key === "etag" ||
      key === "last-modified" ||
      key === "retry-after" ||
      key === "x-request-id" ||
      key === "x-ratelimit-remaining"
    ) {
      result[key] = value;
    }
  }
  return result;
}

function readPath(value: unknown, path: string): unknown {
  let current: unknown = value;
  for (const segment of path.split(".")) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function retryableStatus(status: number, policy: ConnectorRetryPolicy) {
  return policy.retryStatuses.includes(status);
}

function retryableMethod(method: ConnectorHttpMethod, idempotencyKey?: string) {
  return method === "GET" || method === "HEAD" || method === "PUT" || method === "DELETE" || Boolean(idempotencyKey);
}

function parseRetryAfter(value: string | null) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(30_000, Math.round(seconds * 1000));
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.min(30_000, Math.max(0, date - Date.now()));
}

function computeDelay(
  attempt: number,
  policy: ConnectorRetryPolicy,
  retryAfter: string | null
) {
  const serverDelay = parseRetryAfter(retryAfter);
  if (serverDelay !== null) return Math.min(policy.maxDelayMs, serverDelay);
  const exponential = Math.min(
    policy.maxDelayMs,
    policy.baseDelayMs * Math.pow(2, Math.max(0, attempt - 1))
  );
  if (!policy.jitter || exponential <= 1) return Math.round(exponential);
  return Math.round(exponential * (0.75 + Math.random() * 0.5));
}

function errorCategoryForStatus(status: number): ConnectorErrorCategory {
  if (status === 401) return "authentication";
  if (status === 403) return "authorization";
  if (status === 408) return "timeout";
  if (status === 429) return "rate-limit";
  if (status >= 500) return "remote";
  return "response";
}

export function normalizeConnectorError(error: unknown): ConnectorSdkError {
  if (error instanceof ConnectorSdkError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new ConnectorSdkError({
      code: "connector_request_aborted",
      message: "Connector request was aborted.",
      category: "aborted",
      retryable: false,
      cause: error
    });
  }
  return new ConnectorSdkError({
    code: "connector_request_failed",
    message: error instanceof Error ? error.message : "Connector request failed.",
    category: "network",
    retryable: true,
    cause: error
  });
}

async function readResponseBody(
  response: Response,
  responseType: ConnectorHttpRequest["responseType"],
  maxBytes: number
) {
  if (responseType === "none" || response.status === 204 || response.status === 205) {
    return null;
  }
  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength > maxBytes) {
    throw new ConnectorSdkError({
      code: "connector_response_too_large",
      message: "Connector response exceeded the manifest output limit.",
      category: "response"
    });
  }
  if (!buffer.byteLength) return null;
  const text = new TextDecoder().decode(buffer);
  const mode =
    responseType === "auto" || responseType === undefined
      ? (response.headers.get("content-type") ?? "").toLowerCase().includes("json")
        ? "json"
        : "text"
      : responseType;
  if (mode === "text") return text;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ConnectorSdkError({
      code: "connector_response_json_invalid",
      message: "Connector response was not valid JSON.",
      category: "response",
      cause: error
    });
  }
}

function combineSignal(parent: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const abort = () => controller.abort(parent?.reason);
  if (parent?.aborted) abort();
  else parent?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("connector_request_timeout")), timeoutMs);
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer);
      parent?.removeEventListener("abort", abort);
    }
  };
}

function idFactory() {
  return "conn-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

async function defaultSleep(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(
        new ConnectorSdkError({
          code: "connector_retry_aborted",
          message: "Connector retry delay was aborted.",
          category: "aborted"
        })
      );
    };
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
}

export function createConnectorHttpClient(input: {
  manifest: ConnectorManifestV2;
  config: Record<string, ConnectorConfigScalar>;
  secret(key: string): Promise<string>;
  audit?: ConnectorAuditSink | null;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  signal?: AbortSignal;
  correlationIdFactory?: () => string;
}): ConnectorHttpClient {
  if (input.manifest.transport.kind !== "http") {
    throw new ConnectorSdkError({
      code: "connector_http_not_configured",
      message: "Connector manifest declares local transport.",
      category: "configuration"
    });
  }
  const transport = input.manifest.transport;
  const baseUrl = normalizedBaseUrl(input.manifest, input.config);
  const allowedOrigins = new Set(transport.request.allowedOrigins.map(normalizeOrigin));
  const fetchImpl = input.fetchImpl ?? fetch;
  const sleep = input.sleep ?? defaultSleep;
  const makeId = input.correlationIdFactory ?? idFactory;
  const evidence: ConnectorHttpEvidence = {
    sdkVersion: 2,
    requests: 0,
    retries: 0,
    succeededRequests: 0,
    failedRequests: 0,
    pages: 0,
    healthChecks: 0,
    lastStatus: null,
    lastErrorCode: null
  };

  const record = async (event: ConnectorAuditEvent) => {
    await input.audit?.record(event);
  };

  async function request<T = unknown>(
    requestInput: ConnectorHttpRequest
  ): Promise<ConnectorHttpResponse<T>> {
    const method = requestInput.method ?? "GET";
    if (!transport.request.allowedMethods.includes(method)) {
      throw new ConnectorSdkError({
        code: "connector_http_method_not_allowed",
        message: "Connector request method is not allowed by the manifest.",
        category: "authorization"
      });
    }
    if ((method === "GET" || method === "HEAD") && requestInput.body !== undefined) {
      throw new ConnectorSdkError({
        code: "connector_http_body_not_allowed",
        message: "GET and HEAD connector requests cannot include a body.",
        category: "configuration"
      });
    }
    if (
      requestInput.idempotencyKey !== undefined &&
      (!requestInput.idempotencyKey ||
        requestInput.idempotencyKey.length > 200 ||
        /[\r\n]/.test(requestInput.idempotencyKey))
    ) {
      throw new ConnectorSdkError({
        code: "connector_idempotency_key_invalid",
        message: "Connector idempotency key is invalid.",
        category: "configuration"
      });
    }

    const url = buildUrl(baseUrl, requestInput.path, requestInput.query, allowedOrigins);
    const timeoutMs = requestInput.timeoutMs ?? transport.request.defaultTimeoutMs;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) {
      throw new ConnectorSdkError({
        code: "connector_http_timeout_invalid",
        message: "Connector request timeout is outside the SDK bounds.",
        category: "configuration"
      });
    }

    const correlationId = makeId();
    const startedAt = Date.now();
    const maxAttempts = retryableMethod(method, requestInput.idempotencyKey)
      ? transport.request.retry.maxAttempts
      : 1;
    const accepted = new Set(
      requestInput.acceptStatuses?.length
        ? requestInput.acceptStatuses
        : Array.from({ length: 100 }, (_, index) => 200 + index)
    );

    let lastError: ConnectorSdkError | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const attemptStartedAt = Date.now();
      const headers = safeHeaders(requestInput.headers);
      headers.set("accept", "application/json, text/plain;q=0.9, */*;q=0.5");
      if (transport.request.userAgent) headers.set("user-agent", transport.request.userAgent);
      if (requestInput.idempotencyKey) headers.set("idempotency-key", requestInput.idempotencyKey);
      const encoded = requestBody(requestInput.body);
      if (encoded.contentType && !headers.has("content-type")) {
        headers.set("content-type", encoded.contentType);
      }
      await applyAuthentication(transport.authentication, headers, input.secret);

      evidence.requests += 1;
      await record({
        type: "request-started",
        occurredAt: new Date().toISOString(),
        correlationId,
        connectorKey: input.manifest.key,
        method,
        origin: url.origin,
        path: url.pathname,
        attempt
      });

      const combined = combineSignal(requestInput.signal ?? input.signal, timeoutMs);
      try {
        const response = await fetchImpl(url, {
          method,
          headers,
          body: encoded.body,
          signal: combined.signal,
          redirect: "error",
          credentials: "omit",
          cache: "no-store"
        });
        evidence.lastStatus = response.status;

        if (!accepted.has(response.status)) {
          const retryable =
            retryableStatus(response.status, transport.request.retry) &&
            attempt < maxAttempts;
          if (retryable) {
            const retryDelayMs = computeDelay(
              attempt,
              transport.request.retry,
              response.headers.get("retry-after")
            );
            evidence.retries += 1;
            await record({
              type: "request-retrying",
              occurredAt: new Date().toISOString(),
              correlationId,
              connectorKey: input.manifest.key,
              method,
              origin: url.origin,
              path: url.pathname,
              status: response.status,
              attempt,
              durationMs: Date.now() - attemptStartedAt,
              retryDelayMs,
              errorCode: "connector_http_status_" + response.status
            });
            combined.dispose();
            await sleep(retryDelayMs, requestInput.signal ?? input.signal);
            continue;
          }

          const error = new ConnectorSdkError({
            code: "connector_http_status_" + response.status,
            message: "Connector remote endpoint returned HTTP " + response.status + ".",
            category: errorCategoryForStatus(response.status),
            retryable: retryableStatus(response.status, transport.request.retry),
            status: response.status,
            attempt
          });
          evidence.failedRequests += 1;
          evidence.lastErrorCode = error.code;
          await record({
            type: "request-failed",
            occurredAt: new Date().toISOString(),
            correlationId,
            connectorKey: input.manifest.key,
            method,
            origin: url.origin,
            path: url.pathname,
            status: response.status,
            attempt,
            durationMs: Date.now() - attemptStartedAt,
            errorCode: error.code
          });
          throw error;
        }

        const data = await readResponseBody(
          response,
          requestInput.responseType,
          input.manifest.limits.maxOutputBytes
        );
        evidence.succeededRequests += 1;
        evidence.lastErrorCode = null;
        await record({
          type: "request-succeeded",
          occurredAt: new Date().toISOString(),
          correlationId,
          connectorKey: input.manifest.key,
          method,
          origin: url.origin,
          path: url.pathname,
          status: response.status,
          attempt,
          durationMs: Date.now() - attemptStartedAt
        });
        return {
          status: response.status,
          ok: response.ok,
          data: data as T,
          headers: headerRecord(response.headers),
          correlationId,
          attempts: attempt,
          durationMs: Date.now() - startedAt
        };
      } catch (error) {
        const normalized = normalizeConnectorError(error);
        lastError = normalized;
        const timedOut =
          combined.signal.aborted &&
          !(requestInput.signal ?? input.signal)?.aborted;
        const retryable =
          (timedOut || normalized.retryable) &&
          attempt < maxAttempts;

        if (retryable) {
          const retryDelayMs = computeDelay(attempt, transport.request.retry, null);
          evidence.retries += 1;
          await record({
            type: "request-retrying",
            occurredAt: new Date().toISOString(),
            correlationId,
            connectorKey: input.manifest.key,
            method,
            origin: url.origin,
            path: url.pathname,
            status: normalized.status,
            attempt,
            durationMs: Date.now() - attemptStartedAt,
            retryDelayMs,
            errorCode: timedOut ? "connector_request_timeout" : normalized.code
          });
          combined.dispose();
          await sleep(retryDelayMs, requestInput.signal ?? input.signal);
          continue;
        }

        const finalError = timedOut
          ? new ConnectorSdkError({
              code: "connector_request_timeout",
              message: "Connector request exceeded its timeout.",
              category: "timeout",
              retryable: true,
              attempt,
              cause: error
            })
          : normalized;
        evidence.failedRequests += 1;
        evidence.lastErrorCode = finalError.code;
        await record({
          type: "request-failed",
          occurredAt: new Date().toISOString(),
          correlationId,
          connectorKey: input.manifest.key,
          method,
          origin: url.origin,
          path: url.pathname,
          status: finalError.status,
          attempt,
          durationMs: Date.now() - attemptStartedAt,
          errorCode: finalError.code
        });
        throw finalError;
      } finally {
        combined.dispose();
      }
    }

    throw (
      lastError ??
      new ConnectorSdkError({
        code: "connector_request_failed",
        message: "Connector request failed without a terminal response.",
        category: "internal"
      })
    );
  }

  async function paginate<T = unknown>(
    paginationInput: ConnectorPaginationRequest
  ): Promise<ConnectorPaginationResult<T>> {
    const policy = transport.pagination;
    if (policy.mode === "none") {
      throw new ConnectorSdkError({
        code: "connector_pagination_not_configured",
        message: "Connector manifest does not declare pagination.",
        category: "pagination"
      });
    }
    const items: T[] = [];
    let lastCursor: string | null = null;
    let truncated = false;

    for (let pageIndex = 0; pageIndex < policy.maxPages; pageIndex += 1) {
      const query = { ...(paginationInput.query ?? {}) };
      if (policy.mode === "cursor") {
        if (lastCursor !== null) query[policy.cursorParameter] = lastCursor;
        if (policy.pageSizeParameter && policy.pageSize) {
          query[policy.pageSizeParameter] = policy.pageSize;
        }
      } else {
        query[policy.pageParameter] = policy.startPage + pageIndex;
        if (policy.pageSizeParameter && policy.pageSize) {
          query[policy.pageSizeParameter] = policy.pageSize;
        }
      }

      const response = await request<unknown>({
        path: paginationInput.path,
        method: paginationInput.method ?? "GET",
        query,
        headers: paginationInput.headers,
        body: paginationInput.body,
        timeoutMs: paginationInput.timeoutMs,
        signal: paginationInput.signal,
        responseType: "json"
      });
      const pageItems = readPath(response.data, policy.itemsPath);
      if (!Array.isArray(pageItems)) {
        throw new ConnectorSdkError({
          code: "connector_pagination_items_invalid",
          message: "Connector pagination itemsPath did not resolve to an array.",
          category: "pagination"
        });
      }
      items.push(...(pageItems as T[]));
      evidence.pages += 1;
      await record({
        type: "page-received",
        occurredAt: new Date().toISOString(),
        correlationId: response.correlationId,
        connectorKey: input.manifest.key,
        method: paginationInput.method ?? "GET",
        path: new URL(paginationInput.path, baseUrl).pathname,
        status: response.status,
        page: pageIndex + 1,
        itemCount: pageItems.length
      });

      if (policy.mode === "cursor") {
        const next = readPath(response.data, policy.nextCursorPath);
        const nextCursor =
          typeof next === "string" || typeof next === "number"
            ? String(next)
            : null;
        if (!nextCursor) {
          return { items, pages: pageIndex + 1, truncated: false, lastCursor };
        }
        if (nextCursor === lastCursor) {
          throw new ConnectorSdkError({
            code: "connector_pagination_cursor_repeated",
            message: "Connector pagination returned the same cursor twice.",
            category: "pagination"
          });
        }
        lastCursor = nextCursor;
      } else if (
        pageItems.length === 0 ||
        (policy.pageSize !== undefined && pageItems.length < policy.pageSize)
      ) {
        return { items, pages: pageIndex + 1, truncated: false, lastCursor: null };
      }
    }

    truncated = true;
    return { items, pages: policy.maxPages, truncated, lastCursor };
  }

  async function health(): Promise<ConnectorHealthResult> {
    const policy = transport.health;
    const startedAt = Date.now();
    evidence.healthChecks += 1;
    try {
      const response = await request({
        path: policy.path,
        method: policy.method,
        timeoutMs: policy.timeoutMs ?? transport.request.defaultTimeoutMs,
        acceptStatuses: policy.expectedStatuses,
        responseType: "none"
      });
      const result = {
        healthy: true,
        status: response.status,
        durationMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
        errorCode: null
      };
      await record({
        type: "health-checked",
        occurredAt: result.checkedAt,
        correlationId: response.correlationId,
        connectorKey: input.manifest.key,
        method: policy.method,
        origin: baseUrl.origin,
        path: policy.path,
        status: response.status,
        durationMs: result.durationMs,
        errorCode: null
      });
      return result;
    } catch (error) {
      const normalized = normalizeConnectorError(error);
      const result = {
        healthy: false,
        status: normalized.status,
        durationMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
        errorCode: normalized.code
      };
      await record({
        type: "health-checked",
        occurredAt: result.checkedAt,
        correlationId: makeId(),
        connectorKey: input.manifest.key,
        method: policy.method,
        origin: baseUrl.origin,
        path: policy.path,
        status: normalized.status,
        durationMs: result.durationMs,
        errorCode: normalized.code
      });
      return result;
    }
  }

  return {
    request,
    paginate,
    health,
    evidence() {
      return { ...evidence };
    }
  };
}

export function createExecutionHttpClient(input: {
  manifest: ConnectorManifest;
  config: Record<string, ConnectorConfigScalar>;
  secret(key: string): Promise<string>;
  audit?: ConnectorAuditSink | null;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  signal?: AbortSignal;
  correlationIdFactory?: () => string;
}) {
  if (!isConnectorManifestV2(input.manifest) || input.manifest.transport.kind !== "http") {
    return null;
  }
  return createConnectorHttpClient({
    manifest: input.manifest,
    config: input.config,
    secret: input.secret,
    audit: input.audit,
    fetchImpl: input.fetchImpl,
    sleep: input.sleep,
    signal: input.signal,
    correlationIdFactory: input.correlationIdFactory
  });
}

export const CONNECTOR_SDK_V2_FEATURES = Object.freeze({
  authentication: ["none", "bearer", "api-key-header"] as const,
  requestPolicy: true as const,
  exactOriginAllowlist: true as const,
  boundedTimeouts: true as const,
  boundedRetries: true as const,
  retryAfterSupport: true as const,
  idempotencyAwareRetries: true as const,
  cursorPagination: true as const,
  pageNumberPagination: true as const,
  sanitizedAuditEvents: true as const,
  healthChecks: true as const,
  normalizedErrors: true as const,
  secretValuesInAudit: false as const,
  automaticConnectionActivation: false as const
});
