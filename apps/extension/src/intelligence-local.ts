import {
  getActiveWorkspaceId,
  getCachedWorkspaceIdForSlug
} from "./workspace-session";
import type {
  BusinessIntegrationAuditEntry,
  BusinessIntegrationState,
  HistoricalSeries,
  IntelligenceModuleKey,
  IntelligenceServerRecord,
  MovieMetadataModuleDataset,
  OntarioDetailerDataset,
  ScheduledExtractionJob,
  ScheduledJobsDataset,
  SupplierInventoryStagingDataset
} from "./types";

export const INTELLIGENCE_KEYS = {
  history: "ai-data-platform-history-series-v1",
  rosie: "ai-data-platform-rosie-ontario-detailers-v1",
  devil: "ai-data-platform-devil-supplier-staging-v1",
  movie: "ai-data-platform-personal-movie-metadata-v1",
  scheduled: "ai-data-platform-scheduled-jobs-v1",
  integration: "ai-data-platform-business-integrations-v1"
} as const;

export interface LocalIntelligenceSnapshot {
  workspaceId: string;
  moduleKey: IntelligenceModuleKey;
  clientUpdatedAt: string;
  summary: Record<string, unknown>;
  payload: Record<string, unknown>;
  auditEntries: BusinessIntegrationAuditEntry[];
}

function payload(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function historySummary(series: HistoricalSeries[]) {
  return {
    series: series.length,
    snapshots: series.reduce((sum, item) => sum + item.snapshots.length, 0),
    changes: series.reduce((sum, item) => sum + item.changes.length, 0),
    pendingReview: series.reduce(
      (sum, item) =>
        sum +
        item.changes.filter((change) => change.reviewStatus === "pending").length,
      0
    )
  };
}

function scheduledSummary(dataset: ScheduledJobsDataset) {
  return {
    jobs: dataset.jobs.length,
    enabled: dataset.jobs.filter((job) => job.enabled).length,
    due: dataset.jobs.filter((job) => job.due).length,
    unread: dataset.notifications.filter((item) => item.status === "unread").length,
    attempts: dataset.jobs.reduce((sum, job) => sum + job.attempts.length, 0)
  };
}

export async function buildLocalIntelligenceSnapshots() {
  const stored = await chrome.storage.local.get(Object.values(INTELLIGENCE_KEYS));
  const snapshots: LocalIntelligenceSnapshot[] = [];

  const historyEnvelope = stored[INTELLIGENCE_KEYS.history] as
    | { series?: HistoricalSeries[] }
    | undefined;
  const historyGroups = new Map<string, HistoricalSeries[]>();
  for (const series of historyEnvelope?.series ?? []) {
    if (!series.workspaceId) continue;
    const items = historyGroups.get(series.workspaceId) ?? [];
    items.push(series);
    historyGroups.set(series.workspaceId, items);
  }
  for (const [workspaceId, series] of historyGroups) {
    snapshots.push({
      workspaceId,
      moduleKey: "history",
      clientUpdatedAt:
        [...series].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
          ?.updatedAt ?? new Date().toISOString(),
      summary: historySummary(series),
      payload: payload({ version: 1, series }),
      auditEntries: []
    });
  }

  const rosie = stored[INTELLIGENCE_KEYS.rosie] as OntarioDetailerDataset | undefined;
  const rosieId = await getCachedWorkspaceIdForSlug("rosiedazzlers");
  if (rosieId && rosie?.version === 1) {
    snapshots.push({
      workspaceId: rosieId,
      moduleKey: "rosie-competitive",
      clientUpdatedAt: rosie.updatedAt,
      summary: {
        series: rosie.series.length,
        businesses: new Set(rosie.series.map((item) => item.businessKey)).size,
        changes: rosie.series.reduce((sum, item) => sum + item.changes.length, 0)
      },
      payload: payload(rosie),
      auditEntries: []
    });
  }

  const devil = stored[INTELLIGENCE_KEYS.devil] as
    | SupplierInventoryStagingDataset
    | undefined;
  const devilId = await getCachedWorkspaceIdForSlug("devilndove");
  if (devilId && devil?.version === 1) {
    snapshots.push({
      workspaceId: devilId,
      moduleKey: "devil-supplier",
      clientUpdatedAt: devil.updatedAt,
      summary: {
        items: devil.items.length,
        pending: devil.items.filter((item) => item.reviewStatus === "pending").length,
        approved: devil.items.filter((item) => item.reviewStatus === "approved").length,
        priceObservations: devil.items.reduce((sum, item) => sum + item.priceHistory.length, 0)
      },
      payload: payload(devil),
      auditEntries: []
    });
  }

  const movie = stored[INTELLIGENCE_KEYS.movie] as MovieMetadataModuleDataset | undefined;
  const personalId = await getCachedWorkspaceIdForSlug("personal");
  if (personalId && movie?.version === 1) {
    snapshots.push({
      workspaceId: personalId,
      moduleKey: "movie-metadata",
      clientUpdatedAt: movie.updatedAt,
      summary: {
        collection: movie.collection.length,
        pending: movie.matchQueue.filter((item) => item.reviewStatus === "pending").length,
        approved: movie.matchQueue.filter((item) => item.reviewStatus === "approved").length
      },
      payload: payload(movie),
      auditEntries: []
    });
  }

  const scheduled = stored[INTELLIGENCE_KEYS.scheduled] as ScheduledJobsDataset | undefined;
  if (scheduled?.version === 1) {
    const groups = new Map<string, ScheduledExtractionJob[]>();
    for (const job of scheduled.jobs) {
      if (!job.workspaceId) continue;
      const jobs = groups.get(job.workspaceId) ?? [];
      jobs.push(job);
      groups.set(job.workspaceId, jobs);
    }
    for (const [workspaceId, jobs] of groups) {
      const jobIds = new Set(jobs.map((job) => job.id));
      const scoped: ScheduledJobsDataset = {
        ...scheduled,
        jobs,
        notifications: scheduled.notifications.filter((item) => jobIds.has(item.jobId))
      };
      snapshots.push({
        workspaceId,
        moduleKey: "scheduled-jobs",
        clientUpdatedAt:
          [...jobs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
            ?.updatedAt ?? scheduled.updatedAt,
        summary: scheduledSummary(scoped),
        payload: payload(scoped),
        auditEntries: []
      });
    }
  }

  const integrations = stored[INTELLIGENCE_KEYS.integration] as
    | BusinessIntegrationState
    | undefined;
  if (integrations?.version === 1) {
    for (const target of ["rosie-dazzlers", "devil-n-dove"] as const) {
      const workspaceId = await getCachedWorkspaceIdForSlug(
        target === "rosie-dazzlers" ? "rosiedazzlers" : "devilndove"
      );
      if (!workspaceId) continue;
      const batches = integrations.batches.filter((item) => item.target === target);
      const audit = integrations.audit.filter((item) => item.target === target);
      if (!batches.length && !audit.length) continue;
      snapshots.push({
        workspaceId,
        moduleKey: "business-integrations",
        clientUpdatedAt:
          [...batches].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
            ?.updatedAt ?? integrations.updatedAt,
        summary: {
          batches: batches.length,
          draft: batches.filter((item) => item.status === "draft").length,
          approved: batches.filter((item) => item.status === "approved").length,
          exported: batches.filter((item) => item.status === "exported").length,
          cancelled: batches.filter((item) => item.status === "cancelled").length,
          audit: audit.length
        },
        payload: payload({ ...integrations, batches, audit }),
        auditEntries: audit
      });
    }
  }

  return snapshots;
}

export async function applyIntelligenceServerRecord(record: IntelligenceServerRecord) {
  const keys = INTELLIGENCE_KEYS;
  if (record.moduleKey === "history") {
    const stored = await chrome.storage.local.get(keys.history);
    const current = stored[keys.history] as { series?: HistoricalSeries[] } | undefined;
    const incoming = Array.isArray(record.payload.series)
      ? (record.payload.series as HistoricalSeries[])
      : [];
    await chrome.storage.local.set({
      [keys.history]: {
        version: 1,
        series: [
          ...incoming,
          ...(current?.series ?? []).filter((item) => item.workspaceId !== record.workspaceId)
        ]
      }
    });
    return;
  }

  if (record.moduleKey === "rosie-competitive") {
    await chrome.storage.local.set({ [keys.rosie]: record.payload });
    return;
  }
  if (record.moduleKey === "devil-supplier") {
    await chrome.storage.local.set({ [keys.devil]: record.payload });
    return;
  }
  if (record.moduleKey === "movie-metadata") {
    await chrome.storage.local.set({ [keys.movie]: record.payload });
    return;
  }

  if (record.moduleKey === "scheduled-jobs") {
    const stored = await chrome.storage.local.get(keys.scheduled);
    const current = stored[keys.scheduled] as ScheduledJobsDataset | undefined;
    const incoming = record.payload as unknown as ScheduledJobsDataset;
    const others = current?.jobs.filter((job) => job.workspaceId !== record.workspaceId) ?? [];
    const otherIds = new Set(others.map((job) => job.id));
    await chrome.storage.local.set({
      [keys.scheduled]: {
        ...incoming,
        jobs: [...incoming.jobs, ...others],
        notifications: [
          ...incoming.notifications,
          ...(current?.notifications.filter((item) => otherIds.has(item.jobId)) ?? [])
        ]
      }
    });
    return;
  }

  const stored = await chrome.storage.local.get(keys.integration);
  const current = stored[keys.integration] as BusinessIntegrationState | undefined;
  const incoming = record.payload as unknown as BusinessIntegrationState;
  const rosieId = await getCachedWorkspaceIdForSlug("rosiedazzlers");
  const target = record.workspaceId === rosieId ? "rosie-dazzlers" : "devil-n-dove";
  const otherBatches = current?.batches.filter((item) => item.target !== target) ?? [];
  const otherAudit = current?.audit.filter((item) => item.target !== target) ?? [];
  const auditById = new Map<string, BusinessIntegrationAuditEntry>();
  for (const item of [...incoming.audit, ...otherAudit]) auditById.set(item.id, item);
  await chrome.storage.local.set({
    [keys.integration]: {
      ...incoming,
      batches: [...incoming.batches, ...otherBatches].slice(0, 60),
      audit: Array.from(auditById.values())
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 500)
    }
  });
}

export async function countLegacyIntelligenceCandidates() {
  const stored = await chrome.storage.local.get([
    INTELLIGENCE_KEYS.history,
    INTELLIGENCE_KEYS.scheduled
  ]);
  const history = (
    (stored[INTELLIGENCE_KEYS.history] as { series?: HistoricalSeries[] } | undefined)
      ?.series ?? []
  ).filter((item) => !item.workspaceId).length;
  const jobs = (
    (stored[INTELLIGENCE_KEYS.scheduled] as ScheduledJobsDataset | undefined)?.jobs ?? []
  ).filter((item) => !item.workspaceId).length;
  return { history, jobs, total: history + jobs };
}

export async function adoptLegacyIntelligenceIntoActiveWorkspace() {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) throw new Error("Select an authenticated workspace first.");
  const keys = INTELLIGENCE_KEYS;
  const stored = await chrome.storage.local.get([keys.history, keys.scheduled]);

  const historyState = stored[keys.history] as { series?: HistoricalSeries[] } | undefined;
  const series = historyState?.series ?? [];
  const history = series.filter((item) => !item.workspaceId).length;
  if (history) {
    await chrome.storage.local.set({
      [keys.history]: {
        version: 1,
        series: series.map((item) => item.workspaceId ? item : { ...item, workspaceId })
      }
    });
  }

  const scheduled = stored[keys.scheduled] as ScheduledJobsDataset | undefined;
  const jobs = scheduled?.jobs ?? [];
  const adoptedJobs = jobs.filter((item) => !item.workspaceId).length;
  if (scheduled && adoptedJobs) {
    await chrome.storage.local.set({
      [keys.scheduled]: {
        ...scheduled,
        jobs: jobs.map((item) => item.workspaceId ? item : { ...item, workspaceId })
      }
    });
  }

  return { history, jobs: adoptedJobs, total: history + adoptedJobs };
}
