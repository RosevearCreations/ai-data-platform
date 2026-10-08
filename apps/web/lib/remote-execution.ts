import { createHash } from "node:crypto";

export const REMOTE_EXECUTION_PROVIDER_FLAG =
  "REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED";
export const REMOTE_EXECUTION_CONFIG_PREFIX =
  "enc-config://remote-execution/";

export type RemoteExecutionJobStatus =
  | "prepared"
  | "queued"
  | "leased"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "timed-out";

export interface RemoteExecutionPolicyPin {
  workspaceId: string;
  origin: string;
  policyId: string;
  policyRevision: number;
  policyFingerprint: string;
}

export interface RemoteExecutionPolicySnapshot {
  version: 1;
  workspaceId: string;
  policyId: string;
  revision: number;
  fingerprint: string;
  origin: string;
  displayName: string;
  purpose: string;
  collectionMethod:
    | "official-api"
    | "official-dataset"
    | "user-export"
    | "public-webpage";
  publicOrAuthorized: true;
  termsReviewed: true;
  termsUrl: string | null;
  robotsDecision: "allowed" | "not-applicable";
  robotsUrl: string | null;
  noAccessControlBypass: true;
  dataSensitivity: "public-facts" | "user-authorized";
  minimumDelayMs: number;
  maxPagesPerRun: number;
  maxRecordsPerRun: number;
  reviewExpiresAt: string;
  copiedAt: string;
}

export interface RemoteExecutionBudget {
  maxPages: number;
  maxRecords: number;
  maxRuntimeSeconds: number;
  minimumDelayMs: number;
}

export interface RemoteExecutionJobSpec {
  jobId: string;
  workspaceId: string;
  savedScraperId: string;
  providerKey: string;
  configRef: string | null;
  sourceUrl: string;
  sourceOrigin: string;
  policy: RemoteExecutionPolicySnapshot;
  budget: RemoteExecutionBudget;
  createdAt: string;
}

export interface RemoteExecutionProviderReadiness {
  providerKey: string;
  mode: "mock" | "external";
  ready: boolean;
  details: string;
}

export interface RemoteExecutionProviderDispatch {
  accepted: boolean;
  providerJobId: string | null;
}

export interface RemoteExecutionProvider {
  readonly key: string;
  readonly mode: "mock" | "external";
  readiness(): Promise<RemoteExecutionProviderReadiness>;
  dispatch(job: RemoteExecutionJobSpec): Promise<RemoteExecutionProviderDispatch>;
  cancel(providerJobId: string): Promise<{ cancelled: boolean }>;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(record: JsonRecord, key: string) {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("remote_source_policy_invalid_" + key);
  }
  return value.trim();
}

function optionalString(record: JsonRecord, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredInteger(record: JsonRecord, key: string) {
  const value = record[key];
  if (!Number.isInteger(value)) {
    throw new Error("remote_source_policy_invalid_" + key);
  }
  return value as number;
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  return null;
}

export function normalizeRemoteSourceOrigin(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("remote_source_protocol_not_allowed");
  }
  return parsed.origin;
}

export function validateEncryptedConfigReference(
  value: string | null | undefined
) {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  if (
    !/^enc-config:\/\/remote-execution\/[a-z0-9][a-z0-9/_-]{2,127}$/i.test(
      normalized
    )
  ) {
    throw new Error("remote_config_reference_invalid");
  }
  return normalized;
}

export function isRemoteProviderExecutionEnabled(
  env: Readonly<Record<string, string | undefined>> = process.env
) {
  return env[REMOTE_EXECUTION_PROVIDER_FLAG] === "true";
}

export function remoteExecutionReadiness(
  env: Readonly<Record<string, string | undefined>> = process.env
) {
  return {
    build: 26,
    productionExecutionEnabled: isRemoteProviderExecutionEnabled(env),
    providerSelectionRequired: true,
    externalProviderConfigured: false,
    mockWorker: {
      providerKey: "mock",
      mode: "mock",
      ready: true,
      networkAccess: false,
      intendedUse: "CI lifecycle verification only"
    },
    configReferenceScheme: REMOTE_EXECUTION_CONFIG_PREFIX,
    sourcePolicyRequirement:
      "Exact approved Build 025 policy ID, revision and fingerprint are required."
  };
}

export function selectRemoteSourcePolicy(
  registryPayload: Record<string, unknown>,
  pin: RemoteExecutionPolicyPin,
  now = new Date()
): RemoteExecutionPolicySnapshot {
  const entries = Array.isArray(registryPayload.entries)
    ? registryPayload.entries
    : [];
  const normalizedOrigin = normalizeRemoteSourceOrigin(pin.origin);
  const raw = entries.find(
    (candidate) =>
      isRecord(candidate) &&
      candidate.id === pin.policyId &&
      candidate.workspaceId === pin.workspaceId
  );

  if (!isRecord(raw)) {
    throw new Error("remote_source_policy_not_found");
  }

  const revision = requiredInteger(raw, "revision");
  const fingerprint = requiredString(raw, "fingerprint");
  const origin = normalizeRemoteSourceOrigin(requiredString(raw, "origin"));

  if (
    revision !== pin.policyRevision ||
    fingerprint !== pin.policyFingerprint ||
    origin !== normalizedOrigin
  ) {
    throw new Error("remote_source_policy_pin_drift");
  }
  if (raw.status !== "approved") {
    throw new Error("remote_source_policy_not_approved");
  }
  if (raw.publicOrAuthorized !== true) {
    throw new Error("remote_source_not_public_or_authorized");
  }
  if (raw.termsReviewed !== true) {
    throw new Error("remote_source_terms_not_reviewed");
  }
  if (raw.noAccessControlBypass !== true) {
    throw new Error("remote_source_access_control_bypass_forbidden");
  }
  if (
    raw.dataSensitivity !== "public-facts" &&
    raw.dataSensitivity !== "user-authorized"
  ) {
    throw new Error("remote_source_sensitivity_blocked");
  }

  const collectionMethod = raw.collectionMethod;
  if (
    collectionMethod !== "official-api" &&
    collectionMethod !== "official-dataset" &&
    collectionMethod !== "user-export" &&
    collectionMethod !== "public-webpage"
  ) {
    throw new Error("remote_source_collection_method_invalid");
  }

  const robotsDecision = raw.robotsDecision;
  if (
    robotsDecision !== "allowed" &&
    robotsDecision !== "not-applicable"
  ) {
    throw new Error("remote_source_robots_blocked");
  }
  if (
    collectionMethod === "public-webpage" &&
    robotsDecision !== "allowed"
  ) {
    throw new Error("remote_source_public_webpage_requires_robots_allow");
  }

  const reviewExpiresAt = requiredString(raw, "reviewExpiresAt");
  if (
    !Number.isFinite(Date.parse(reviewExpiresAt)) ||
    Date.parse(reviewExpiresAt) <= now.getTime()
  ) {
    throw new Error("remote_source_policy_expired");
  }

  const minimumDelayMs = requiredInteger(raw, "minimumDelayMs");
  const maxPagesPerRun = requiredInteger(raw, "maxPagesPerRun");
  const maxRecordsPerRun = requiredInteger(raw, "maxRecordsPerRun");

  if (minimumDelayMs < 500) {
    throw new Error("remote_source_delay_below_floor");
  }
  if (maxPagesPerRun < 1 || maxPagesPerRun > 50) {
    throw new Error("remote_source_page_budget_invalid");
  }
  if (maxRecordsPerRun < 1 || maxRecordsPerRun > 5000) {
    throw new Error("remote_source_record_budget_invalid");
  }

  return {
    version: 1,
    workspaceId: pin.workspaceId,
    policyId: pin.policyId,
    revision,
    fingerprint,
    origin,
    displayName: requiredString(raw, "displayName"),
    purpose: requiredString(raw, "purpose"),
    collectionMethod,
    publicOrAuthorized: true,
    termsReviewed: true,
    termsUrl: optionalString(raw, "termsUrl"),
    robotsDecision,
    robotsUrl: optionalString(raw, "robotsUrl"),
    noAccessControlBypass: true,
    dataSensitivity: raw.dataSensitivity,
    minimumDelayMs,
    maxPagesPerRun,
    maxRecordsPerRun,
    reviewExpiresAt,
    copiedAt: now.toISOString()
  };
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
) {
  if (value === undefined) {
    return fallback;
  }
  if (!Number.isFinite(value)) {
    throw new Error("remote_budget_invalid");
  }
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export function deriveRemoteExecutionBudget(
  policy: RemoteExecutionPolicySnapshot,
  requested: Partial<RemoteExecutionBudget> = {}
): RemoteExecutionBudget {
  return {
    maxPages: boundedInteger(
      requested.maxPages,
      policy.maxPagesPerRun,
      1,
      policy.maxPagesPerRun
    ),
    maxRecords: boundedInteger(
      requested.maxRecords,
      policy.maxRecordsPerRun,
      1,
      policy.maxRecordsPerRun
    ),
    maxRuntimeSeconds: boundedInteger(
      requested.maxRuntimeSeconds,
      120,
      10,
      900
    ),
    minimumDelayMs: Math.max(
      policy.minimumDelayMs,
      boundedInteger(
        requested.minimumDelayMs,
        policy.minimumDelayMs,
        500,
        60_000
      )
    )
  };
}

export function createRemoteExecutionJobSpec(input: {
  jobId: string;
  workspaceId: string;
  savedScraperId: string;
  providerKey: string;
  configRef?: string | null;
  sourceUrl: string;
  policy: RemoteExecutionPolicySnapshot;
  requestedBudget?: Partial<RemoteExecutionBudget>;
  createdAt?: string;
}): RemoteExecutionJobSpec {
  const providerKey = input.providerKey.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(providerKey)) {
    throw new Error("remote_provider_key_invalid");
  }
  const sourceOrigin = normalizeRemoteSourceOrigin(input.sourceUrl);
  if (
    input.policy.workspaceId !== input.workspaceId ||
    input.policy.origin !== sourceOrigin
  ) {
    throw new Error("remote_job_policy_scope_mismatch");
  }
  return {
    jobId: input.jobId,
    workspaceId: input.workspaceId,
    savedScraperId: input.savedScraperId.trim(),
    providerKey,
    configRef: validateEncryptedConfigReference(input.configRef),
    sourceUrl: input.sourceUrl,
    sourceOrigin,
    policy: input.policy,
    budget: deriveRemoteExecutionBudget(input.policy, input.requestedBudget),
    createdAt: input.createdAt ?? new Date().toISOString()
  };
}

export function boundedRemoteLeaseSeconds(value = 60) {
  return boundedInteger(value, 60, 30, 300);
}

export function remoteExecutionResultFingerprint(
  payload: Record<string, unknown>
) {
  return (
    "rer1-" +
    createHash("sha256")
      .update(JSON.stringify(canonicalize(payload)))
      .digest("hex")
  );
}

export function validateRemoteExecutionResultPayload(
  payload: Record<string, unknown>,
  budget: RemoteExecutionBudget
) {
  const pagesProcessed = payload.pagesProcessed;
  const recordsCollected = payload.recordsCollected;
  if (
    !Number.isInteger(pagesProcessed) ||
    (pagesProcessed as number) < 0 ||
    (pagesProcessed as number) > budget.maxPages
  ) {
    throw new Error("remote_result_page_budget_exceeded");
  }
  if (
    !Number.isInteger(recordsCollected) ||
    (recordsCollected as number) < 0 ||
    (recordsCollected as number) > budget.maxRecords
  ) {
    throw new Error("remote_result_record_budget_exceeded");
  }
  if (Buffer.byteLength(JSON.stringify(payload), "utf8") > 1_000_000) {
    throw new Error("remote_result_payload_too_large");
  }
}

export class MockRemoteExecutionProvider implements RemoteExecutionProvider {
  readonly key = "mock";
  readonly mode = "mock" as const;

  async readiness(): Promise<RemoteExecutionProviderReadiness> {
    return {
      providerKey: this.key,
      mode: this.mode,
      ready: true,
      details: "Deterministic no-network CI worker is ready."
    };
  }

  async dispatch(
    job: RemoteExecutionJobSpec
  ): Promise<RemoteExecutionProviderDispatch> {
    return { accepted: true, providerJobId: "mock-" + job.jobId };
  }

  async cancel() {
    return { cancelled: true };
  }

  async execute(job: RemoteExecutionJobSpec) {
    return {
      pagesProcessed: Math.min(1, job.budget.maxPages),
      recordsCollected: 0,
      records: [],
      warnings: ["Mock worker performed no network access."],
      provider: { key: this.key, mode: this.mode },
      sourcePolicy: {
        id: job.policy.policyId,
        revision: job.policy.revision,
        fingerprint: job.policy.fingerprint
      }
    };
  }
}
