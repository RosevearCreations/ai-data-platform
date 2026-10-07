import type {
  BusinessIntegrationAuditAction,
  BusinessIntegrationAuditEntry,
  BusinessIntegrationBatch,
  BusinessIntegrationState,
  BusinessIntegrationTarget
} from "./types";

import { scheduleIntelligenceSyncAttempt } from "./intelligence-sync";

const STORAGE_KEY = "ai-data-platform-business-integrations-v1";
const STATE_ID = "ai-data-platform-business-integrations";
const MAX_BATCHES = 30;
const MAX_AUDIT = 250;

function nowIso() {
  return new Date().toISOString();
}

function emptyState(now = nowIso()): BusinessIntegrationState {
  return {
    version: 1,
    id: STATE_ID,
    createdAt: now,
    updatedAt: now,
    batches: [],
    audit: []
  };
}

function normalizeState(value: unknown): BusinessIntegrationState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<BusinessIntegrationState>;
  if (
    candidate.version !== 1 ||
    candidate.id !== STATE_ID ||
    !Array.isArray(candidate.batches) ||
    !Array.isArray(candidate.audit)
  ) {
    return null;
  }
  return candidate as BusinessIntegrationState;
}

export async function loadBusinessIntegrationState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return normalizeState(stored[STORAGE_KEY]) ?? emptyState();
}

async function writeState(state: BusinessIntegrationState) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
  scheduleIntelligenceSyncAttempt();
}

function auditEntry(
  batch: BusinessIntegrationBatch,
  action: BusinessIntegrationAuditAction,
  details: string,
  occurredAt = nowIso()
): BusinessIntegrationAuditEntry {
  return {
    version: 1,
    id: "integration-audit-" + crypto.randomUUID(),
    batchId: batch.id,
    target: batch.target,
    action,
    occurredAt,
    fingerprint: batch.dryRunFingerprint,
    details: details.slice(0, 1000)
  };
}

export async function saveBusinessIntegrationDryRun(
  batch: BusinessIntegrationBatch
) {
  const state = await loadBusinessIntegrationState();
  const now = nowIso();
  const next: BusinessIntegrationState = {
    ...state,
    updatedAt: now,
    batches: [batch, ...state.batches].slice(0, MAX_BATCHES),
    audit: [
      auditEntry(
        batch,
        "dry-run-created",
        "Dry run created for " +
          batch.adapterContract +
          " with " +
          batch.summary.exportableOperations +
          " exportable operations."
      ),
      ...state.audit
    ].slice(0, MAX_AUDIT)
  };
  await writeState(next);
  return next;
}

export async function approveBusinessIntegrationBatch(input: {
  batchId: string;
  expectedSourceDatasetUpdatedAt: string;
}) {
  const state = await loadBusinessIntegrationState();
  const index = state.batches.findIndex((batch) => batch.id === input.batchId);
  if (index < 0) throw new Error("The integration batch no longer exists.");

  const current = state.batches[index];
  if (current.status !== "draft") {
    throw new Error("Only a draft integration batch can be approved.");
  }
  if (current.sourceDatasetUpdatedAt !== input.expectedSourceDatasetUpdatedAt) {
    throw new Error(
      "The source dataset changed after this dry run. Generate a new dry run before approval."
    );
  }
  if (!current.summary.exportableOperations) {
    throw new Error("This dry run has no create or update operations to approve.");
  }

  const now = nowIso();
  const approved: BusinessIntegrationBatch = {
    ...current,
    status: "approved",
    approvedAt: now,
    updatedAt: now
  };
  const batches = [...state.batches];
  batches[index] = approved;
  const next = {
    ...state,
    updatedAt: now,
    batches,
    audit: [
      auditEntry(
        approved,
        "approved",
        "Explicit approval recorded for " +
          approved.summary.exportableOperations +
          " exportable operations.",
        now
      ),
      ...state.audit
    ].slice(0, MAX_AUDIT)
  };
  await writeState(next);
  return next;
}

export async function markBusinessIntegrationExported(batchId: string) {
  const state = await loadBusinessIntegrationState();
  const index = state.batches.findIndex((batch) => batch.id === batchId);
  if (index < 0) throw new Error("The integration batch no longer exists.");

  const current = state.batches[index];
  if (current.status !== "approved" && current.status !== "exported") {
    throw new Error("Only an approved integration batch can be exported.");
  }

  const now = nowIso();
  const exported: BusinessIntegrationBatch = {
    ...current,
    status: "exported",
    exportedAt: now,
    updatedAt: now
  };
  const batches = [...state.batches];
  batches[index] = exported;
  const next = {
    ...state,
    updatedAt: now,
    batches,
    audit: [
      auditEntry(
        exported,
        "exported",
        "Approved integration package exported for controlled business-system handoff.",
        now
      ),
      ...state.audit
    ].slice(0, MAX_AUDIT)
  };
  await writeState(next);
  return next;
}

export async function cancelBusinessIntegrationBatch(batchId: string) {
  const state = await loadBusinessIntegrationState();
  const index = state.batches.findIndex((batch) => batch.id === batchId);
  if (index < 0) throw new Error("The integration batch no longer exists.");

  const current = state.batches[index];
  if (current.status === "exported") {
    throw new Error("An exported integration batch cannot be cancelled retroactively.");
  }
  if (current.status === "cancelled") return state;

  const now = nowIso();
  const cancelled: BusinessIntegrationBatch = {
    ...current,
    status: "cancelled",
    cancelledAt: now,
    updatedAt: now
  };
  const batches = [...state.batches];
  batches[index] = cancelled;
  const next = {
    ...state,
    updatedAt: now,
    batches,
    audit: [
      auditEntry(
        cancelled,
        "cancelled",
        "Integration batch cancelled before controlled handoff.",
        now
      ),
      ...state.audit
    ].slice(0, MAX_AUDIT)
  };
  await writeState(next);
  return next;
}

export function latestBatchForTarget(
  state: BusinessIntegrationState | null,
  target: BusinessIntegrationTarget
) {
  return (
    state?.batches.find((batch) => batch.target === target) ?? null
  );
}
