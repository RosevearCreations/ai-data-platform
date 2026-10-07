import { scheduleIntelligenceSyncAttempt } from "./intelligence-sync";
import { sourceOriginFor } from "./saved-scrapers";
import {
  getActiveWorkspaceId,
  requireActiveWorkspaceId
} from "./workspace-session";
import type {
  SavedScraper,
  ScheduledExtractionJob,
  ScheduledSourcePolicyReview,
  SourcePolicyCollectionMethod,
  SourcePolicyDataSensitivity,
  SourcePolicyEntry,
  SourcePolicyEvaluation,
  SourcePolicyRegistryDataset,
  SourcePolicyRobotsDecision,
  SourcePolicyStatus
} from "./types";

export const SOURCE_POLICY_STORAGE_KEY =
  "ai-data-platform-source-policy-registry-v1";

const DATASET_ID = "ai-data-platform-source-policy-registry";
const MAX_ENTRIES = 150;

function nowIso() {
  return new Date().toISOString();
}

function clampInteger(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function emptyDataset(): SourcePolicyRegistryDataset {
  const now = nowIso();
  return {
    version: 1,
    id: DATASET_ID,
    createdAt: now,
    updatedAt: now,
    entries: []
  };
}

export function normalizeSourcePolicyOrigin(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid HTTP/HTTPS source URL or origin.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Source policy origins must use HTTP or HTTPS.");
  }

  return url.origin;
}

function normalizedText(value: string, limit: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, limit);
}

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function sourcePolicyFingerprint(
  policy: Omit<SourcePolicyEntry, "fingerprint">
) {
  const canonical = JSON.stringify({
    workspaceId: policy.workspaceId,
    origin: policy.origin,
    displayName: policy.displayName,
    purpose: policy.purpose,
    collectionMethod: policy.collectionMethod,
    publicOrAuthorized: policy.publicOrAuthorized,
    termsReviewed: policy.termsReviewed,
    termsUrl: policy.termsUrl,
    robotsDecision: policy.robotsDecision,
    robotsUrl: policy.robotsUrl,
    noAccessControlBypass: policy.noAccessControlBypass,
    dataSensitivity: policy.dataSensitivity,
    minimumDelayMs: policy.minimumDelayMs,
    maxPagesPerRun: policy.maxPagesPerRun,
    maxRecordsPerRun: policy.maxRecordsPerRun,
    reviewExpiresAt: policy.reviewExpiresAt,
    status: policy.status,
    notes: policy.notes,
    revision: policy.revision
  });
  return "sp1-" + hashText(canonical);
}

function normalizeDataset(value: unknown): SourcePolicyRegistryDataset | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SourcePolicyRegistryDataset>;
  if (
    candidate.version !== 1 ||
    candidate.id !== DATASET_ID ||
    !Array.isArray(candidate.entries)
  ) {
    return null;
  }
  return candidate as SourcePolicyRegistryDataset;
}

export async function loadSourcePolicyRegistry() {
  const stored = await chrome.storage.local.get(SOURCE_POLICY_STORAGE_KEY);
  return normalizeDataset(stored[SOURCE_POLICY_STORAGE_KEY]) ?? emptyDataset();
}

async function writeRegistry(dataset: SourcePolicyRegistryDataset) {
  await chrome.storage.local.set({ [SOURCE_POLICY_STORAGE_KEY]: dataset });
  scheduleIntelligenceSyncAttempt();
  return dataset;
}

export function evaluateSourcePolicyEntry(
  policy: SourcePolicyEntry,
  at = new Date()
): SourcePolicyEvaluation {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (policy.status !== "approved") {
    reasons.push(
      policy.status === "blocked"
        ? "This source policy is blocked."
        : "This source policy still requires review."
    );
  }
  if (!policy.publicOrAuthorized) {
    reasons.push("The source must be public or explicitly authorized.");
  }
  if (!policy.termsReviewed) {
    reasons.push("Applicable source terms must be reviewed.");
  }
  if (!policy.noAccessControlBypass) {
    reasons.push(
      "The collection plan must not require bypassing login, paywall, CAPTCHA or technical access controls."
    );
  }
  if (policy.dataSensitivity === "restricted") {
    reasons.push("Restricted/private data is not approved for crawler collection.");
  }

  if (policy.collectionMethod === "public-webpage") {
    if (policy.robotsDecision === "disallowed") {
      reasons.push("Robots/crawl directives disallow the intended public-webpage crawl.");
    } else if (policy.robotsDecision === "unknown") {
      reasons.push("Robots/crawl directives have not been resolved for this webpage source.");
    }
  }

  const expires = Date.parse(policy.reviewExpiresAt);
  if (!Number.isFinite(expires) || expires <= at.getTime()) {
    reasons.push("The source-policy review has expired.");
  }

  if (policy.minimumDelayMs < 500) {
    reasons.push("The minimum crawl delay must be at least 500 ms.");
  }
  if (policy.maxPagesPerRun < 1 || policy.maxPagesPerRun > 50) {
    reasons.push("The page budget must be between 1 and 50 pages per run.");
  }
  if (policy.maxRecordsPerRun < 1 || policy.maxRecordsPerRun > 5000) {
    reasons.push("The record budget must be between 1 and 5,000 records per run.");
  }

  if (
    policy.collectionMethod === "public-webpage" &&
    policy.robotsDecision === "not-applicable"
  ) {
    warnings.push(
      "Robots directives are marked not applicable for a webpage source; confirm that decision before high-volume use."
    );
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    warnings
  };
}

export async function listWorkspaceSourcePolicies(workspaceId?: string | null) {
  const id = workspaceId ?? (await getActiveWorkspaceId());
  if (!id) return [];
  const dataset = await loadSourcePolicyRegistry();
  return dataset.entries
    .filter((entry) => entry.workspaceId === id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function upsertSourcePolicy(input: {
  origin: string;
  displayName: string;
  purpose: string;
  collectionMethod: SourcePolicyCollectionMethod;
  publicOrAuthorized: boolean;
  termsReviewed: boolean;
  termsUrl: string;
  robotsDecision: SourcePolicyRobotsDecision;
  robotsUrl: string;
  noAccessControlBypass: boolean;
  dataSensitivity: SourcePolicyDataSensitivity;
  minimumDelayMs: number;
  maxPagesPerRun: number;
  maxRecordsPerRun: number;
  reviewDays: number;
  status: SourcePolicyStatus;
  notes: string;
}) {
  const workspaceId = await requireActiveWorkspaceId();
  const origin = normalizeSourcePolicyOrigin(input.origin);
  const dataset = await loadSourcePolicyRegistry();
  const previous = dataset.entries.find(
    (entry) => entry.workspaceId === workspaceId && entry.origin === origin
  );
  const now = nowIso();
  const reviewDays = clampInteger(input.reviewDays, 1, 365);
  const reviewExpiresAt = new Date(
    Date.now() + reviewDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const draft: Omit<SourcePolicyEntry, "fingerprint"> = {
    version: 1,
    id: previous?.id ?? "source-policy-" + crypto.randomUUID(),
    workspaceId,
    origin,
    displayName: normalizedText(input.displayName || origin, 120),
    purpose: normalizedText(input.purpose, 500),
    collectionMethod: input.collectionMethod,
    publicOrAuthorized: input.publicOrAuthorized,
    termsReviewed: input.termsReviewed,
    termsUrl: normalizedText(input.termsUrl, 500),
    robotsDecision: input.robotsDecision,
    robotsUrl: normalizedText(input.robotsUrl, 500),
    noAccessControlBypass: input.noAccessControlBypass,
    dataSensitivity: input.dataSensitivity,
    minimumDelayMs: clampInteger(input.minimumDelayMs, 500, 10 * 60 * 1000),
    maxPagesPerRun: clampInteger(input.maxPagesPerRun, 1, 50),
    maxRecordsPerRun: clampInteger(input.maxRecordsPerRun, 1, 5000),
    reviewExpiresAt,
    status: input.status,
    notes: normalizedText(input.notes, 2000),
    revision: (previous?.revision ?? 0) + 1,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now
  };

  const entry: SourcePolicyEntry = {
    ...draft,
    fingerprint: sourcePolicyFingerprint(draft)
  };

  const nextEntries = [
    entry,
    ...dataset.entries.filter((item) => item.id !== entry.id)
  ].slice(0, MAX_ENTRIES);

  await writeRegistry({
    ...dataset,
    updatedAt: now,
    entries: nextEntries
  });
  return entry;
}

export async function setSourcePolicyStatus(
  policyId: string,
  status: SourcePolicyStatus
) {
  const workspaceId = await requireActiveWorkspaceId();
  const dataset = await loadSourcePolicyRegistry();
  const previous = dataset.entries.find(
    (entry) => entry.id === policyId && entry.workspaceId === workspaceId
  );
  if (!previous) throw new Error("Source policy not found in the active workspace.");

  const now = nowIso();
  const draft: Omit<SourcePolicyEntry, "fingerprint"> = {
    ...previous,
    status,
    revision: previous.revision + 1,
    updatedAt: now
  };
  const entry: SourcePolicyEntry = {
    ...draft,
    fingerprint: sourcePolicyFingerprint(draft)
  };

  await writeRegistry({
    ...dataset,
    updatedAt: now,
    entries: dataset.entries.map((item) => (item.id === policyId ? entry : item))
  });
  return entry;
}

export function sourcePolicyReviewFromEntry(
  entry: SourcePolicyEntry
): ScheduledSourcePolicyReview {
  const evaluation = evaluateSourcePolicyEntry(entry);
  if (!evaluation.allowed) {
    throw new Error(evaluation.reasons.join(" "));
  }

  return {
    reviewedAt: new Date().toISOString(),
    publicOrAuthorized: entry.publicOrAuthorized,
    termsReviewed: entry.termsReviewed,
    noAccessControlBypass: entry.noAccessControlBypass,
    notes: entry.notes,
    registryPolicyId: entry.id,
    registryPolicyRevision: entry.revision,
    registryPolicyFingerprint: entry.fingerprint,
    reviewExpiresAt: entry.reviewExpiresAt,
    minimumDelayMs: entry.minimumDelayMs,
    maxPagesPerRun: entry.maxPagesPerRun,
    maxRecordsPerRun: entry.maxRecordsPerRun
  };
}

export async function policyForSavedScraper(savedScraper: SavedScraper) {
  const workspaceId = savedScraper.workspaceId;
  const origin = sourceOriginFor(savedScraper.sourceUrl);
  if (!workspaceId || !origin) return null;
  const dataset = await loadSourcePolicyRegistry();
  return (
    dataset.entries.find(
      (entry) =>
        entry.workspaceId === workspaceId &&
        entry.origin === origin
    ) ?? null
  );
}

export async function assertCurrentSourcePolicyReview(
  savedScraper: SavedScraper,
  review: ScheduledSourcePolicyReview
) {
  const current = await policyForSavedScraper(savedScraper);
  if (!current) {
    throw new Error(
      "Register and approve this source in Build 025 Source Policy Registry before scheduling it."
    );
  }

  const evaluation = evaluateSourcePolicyEntry(current);
  if (!evaluation.allowed) {
    throw new Error(evaluation.reasons.join(" "));
  }

  if (
    review.registryPolicyId !== current.id ||
    review.registryPolicyRevision !== current.revision ||
    review.registryPolicyFingerprint !== current.fingerprint
  ) {
    throw new Error(
      "The source policy changed. Reload the current approved registry policy and re-review this job."
    );
  }

  return current;
}

export async function assertScheduledJobPolicy(job: ScheduledExtractionJob) {
  const dataset = await loadSourcePolicyRegistry();
  const current = dataset.entries.find(
    (entry) =>
      entry.workspaceId === job.workspaceId &&
      entry.id === job.sourcePolicy.registryPolicyId &&
      entry.origin === job.sourceOrigin
  );

  if (!current) {
    throw new Error(
      "The scheduled job no longer has a matching registered source policy. Re-review it before running."
    );
  }

  const evaluation = evaluateSourcePolicyEntry(current);
  if (!evaluation.allowed) {
    throw new Error(evaluation.reasons.join(" "));
  }

  if (
    job.sourcePolicy.registryPolicyRevision !== current.revision ||
    job.sourcePolicy.registryPolicyFingerprint !== current.fingerprint
  ) {
    throw new Error(
      "The registered source policy changed after this job was approved. Refresh + re-review the job."
    );
  }

  return current;
}
