import { scheduleIntelligenceSyncAttempt } from "./intelligence-sync";
import {
  assertCurrentSourcePolicyReview,
  assertScheduledJobPolicy
} from "./source-policy-registry";
import {
  compareScheduledJobRun,
  nextScheduledRunAt,
  retryRunAt,
  validateSourcePolicy
} from "./scheduled-job-engine";
import type {
  ExtractionRecordResult,
  SavedScraper,
  ScheduledExtractionJob,
  ScheduledJobChangeNotification,
  ScheduledJobLimits,
  ScheduledJobRunAttempt,
  ScheduledJobSchedule,
  ScheduledJobsDataset,
  ScheduledSourcePolicyReview
} from "./types";

const STORAGE_KEY = "ai-data-platform-scheduled-jobs-v1";
const DATASET_ID = "ai-data-platform-scheduled-jobs";
const ALARM_PREFIX = "ai-data-platform-job:";
const MAX_JOBS = 50;
const MAX_ATTEMPTS = 30;
const MAX_NOTIFICATIONS = 100;

function nowIso() {
  return new Date().toISOString();
}

function emptyDataset(now = nowIso()): ScheduledJobsDataset {
  return {
    version: 1,
    id: DATASET_ID,
    createdAt: now,
    updatedAt: now,
    jobs: [],
    notifications: []
  };
}

function normalizeDataset(value: unknown): ScheduledJobsDataset | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ScheduledJobsDataset>;
  if (
    candidate.version !== 1 ||
    candidate.id !== DATASET_ID ||
    !Array.isArray(candidate.jobs) ||
    !Array.isArray(candidate.notifications)
  ) {
    return null;
  }
  return candidate as ScheduledJobsDataset;
}

export async function loadScheduledJobsDataset() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return normalizeDataset(stored[STORAGE_KEY]) ?? emptyDataset();
}

async function writeDataset(dataset: ScheduledJobsDataset) {
  await chrome.storage.local.set({ [STORAGE_KEY]: dataset });
  await refreshScheduledJobBadge(dataset);
  scheduleIntelligenceSyncAttempt();
}

function alarmName(jobId: string) {
  return ALARM_PREFIX + jobId;
}

async function setJobAlarm(job: ScheduledExtractionJob) {
  await chrome.alarms.clear(alarmName(job.id));
  if (!job.enabled) return;

  const when = Math.max(Date.now() + 1000, new Date(job.nextRunAt).getTime());
  await chrome.alarms.create(alarmName(job.id), { when });
}

export async function reconcileScheduledJobAlarms() {
  const dataset = await loadScheduledJobsDataset();
  const alarms = await chrome.alarms.getAll();

  for (const alarm of alarms) {
    if (alarm.name.startsWith(ALARM_PREFIX)) {
      await chrome.alarms.clear(alarm.name);
    }
  }
  for (const job of dataset.jobs) {
    await setJobAlarm(job);
  }
  await refreshScheduledJobBadge(dataset);
}

export async function refreshScheduledJobBadge(
  supplied?: ScheduledJobsDataset
) {
  const dataset = supplied ?? (await loadScheduledJobsDataset());
  const unread = dataset.notifications.filter(
    (notification) => notification.status === "unread"
  ).length;
  const due = dataset.jobs.filter((job) => job.enabled && job.due).length;

  await chrome.action.setBadgeText({
    text: unread ? "NEW" : due ? "DUE" : ""
  });
}

export async function createScheduledJob(input: {
  savedScraper: SavedScraper;
  schedule: ScheduledJobSchedule;
  limits: ScheduledJobLimits;
  sourcePolicy: ScheduledSourcePolicyReview;
}) {
  if (input.savedScraper.kind !== "scraper") {
    throw new Error("Only saved scrapers can be scheduled; templates must be saved as a scraper first.");
  }

  const policy = validateSourcePolicy(input.sourcePolicy);
  if (!policy.allowed) {
    throw new Error(policy.reasons.join(" "));
  }
  const registryPolicy = await assertCurrentSourcePolicyReview(
    input.savedScraper,
    input.sourcePolicy
  );
  if (!input.savedScraper.sourceOrigin) {
    throw new Error("The saved scraper needs a valid HTTP/HTTPS source URL before it can be scheduled.");
  }

  const dataset = await loadScheduledJobsDataset();
  if (dataset.jobs.length >= MAX_JOBS) {
    throw new Error("Scheduled jobs are capped at 50 local jobs.");
  }
  if (
    dataset.jobs.some(
      (job) =>
        job.savedScraperId === input.savedScraper.id &&
        job.enabled
    )
  ) {
    throw new Error("This saved scraper already has an enabled scheduled job.");
  }

  const now = nowIso();
  const job: ScheduledExtractionJob = {
    version: 1,
    id: "scheduled-job-" + crypto.randomUUID(),
    workspaceId: input.savedScraper.workspaceId ?? null,
    name: input.savedScraper.name,
    savedScraperId: input.savedScraper.id,
    savedScraperRevision: input.savedScraper.revision,
    sourceUrl: input.savedScraper.sourceUrl,
    sourceOrigin: input.savedScraper.sourceOrigin,
    recipe: {
      ...input.savedScraper.recipe,
      fields: input.savedScraper.recipe.fields.map((field) => ({
        ...field,
        transforms: [...field.transforms]
      }))
    },
    enabled: true,
    due: false,
    createdAt: now,
    updatedAt: now,
    nextRunAt: nextScheduledRunAt(input.schedule, new Date()),
    lastRunAt: null,
    consecutiveFailures: 0,
    schedule: input.schedule,
    limits: {
      maxRecords: Math.max(
        1,
        Math.min(
          500,
          registryPolicy.maxRecordsPerRun,
          Math.round(input.limits.maxRecords)
        )
      ),
      maxRetries: Math.max(0, Math.min(3, Math.round(input.limits.maxRetries))),
      retryDelayMinutes: Math.max(
        5,
        Math.min(1440, Math.round(input.limits.retryDelayMinutes))
      )
    },
    sourcePolicy: {
      ...input.sourcePolicy,
      reviewedAt: input.sourcePolicy.reviewedAt || now
    },
    lastSnapshot: null,
    attempts: []
  };

  const next = {
    ...dataset,
    updatedAt: now,
    jobs: [job, ...dataset.jobs]
  };
  await writeDataset(next);
  await setJobAlarm(job);
  return job;
}

export async function deleteScheduledJob(jobId: string) {
  const dataset = await loadScheduledJobsDataset();
  const now = nowIso();
  const next = {
    ...dataset,
    updatedAt: now,
    jobs: dataset.jobs.filter((job) => job.id !== jobId),
    notifications: dataset.notifications.filter(
      (notification) => notification.jobId !== jobId
    )
  };
  await chrome.alarms.clear(alarmName(jobId));
  await writeDataset(next);
  return next;
}

export async function refreshScheduledJobRecipe(input: {
  jobId: string;
  savedScraper: SavedScraper;
  sourcePolicy: ScheduledSourcePolicyReview;
}) {
  const policy = validateSourcePolicy(input.sourcePolicy);
  if (!policy.allowed) {
    throw new Error(policy.reasons.join(" "));
  }
  await assertCurrentSourcePolicyReview(input.savedScraper, input.sourcePolicy);

  const dataset = await loadScheduledJobsDataset();
  const now = nowIso();
  let updatedJob: ScheduledExtractionJob | null = null;

  const jobs = dataset.jobs.map((job) => {
    if (job.id !== input.jobId) return job;

    if (input.savedScraper.kind !== "scraper") {
      throw new Error("Scheduled jobs require a saved scraper, not a template.");
    }
    if (input.savedScraper.id !== job.savedScraperId) {
      throw new Error("The selected saved scraper does not match this scheduled job.");
    }

    updatedJob = {
      ...job,
      name: input.savedScraper.name,
      savedScraperRevision: input.savedScraper.revision,
      sourceUrl: input.savedScraper.sourceUrl,
      sourceOrigin: input.savedScraper.sourceOrigin,
      recipe: {
        ...input.savedScraper.recipe,
        fields: input.savedScraper.recipe.fields.map((field) => ({
          ...field,
          transforms: [...field.transforms]
        }))
      },
      sourcePolicy: {
        ...input.sourcePolicy,
        reviewedAt: input.sourcePolicy.reviewedAt || now
      },
      due: false,
      consecutiveFailures: 0,
      updatedAt: now,
      nextRunAt: nextScheduledRunAt(job.schedule, new Date())
    };
    return updatedJob;
  });

  if (!updatedJob) throw new Error("The scheduled job no longer exists.");

  const next = { ...dataset, updatedAt: now, jobs };
  await writeDataset(next);
  await setJobAlarm(updatedJob);
  return next;
}

export async function setScheduledJobEnabled(
  jobId: string,
  enabled: boolean
) {
  const dataset = await loadScheduledJobsDataset();
  const target = dataset.jobs.find((job) => job.id === jobId);
  if (!target) throw new Error("The scheduled job no longer exists.");
  if (enabled) {
    await assertScheduledJobPolicy(target);
  }
  const now = nowIso();
  let updatedJob: ScheduledExtractionJob | null = null;

  const jobs = dataset.jobs.map((job) => {
    if (job.id !== jobId) return job;
    updatedJob = {
      ...job,
      enabled,
      due: enabled ? job.due : false,
      updatedAt: now,
      nextRunAt: enabled
        ? nextScheduledRunAt(job.schedule, new Date())
        : job.nextRunAt
    };
    return updatedJob;
  });

  if (!updatedJob) throw new Error("The scheduled job no longer exists.");

  const next = { ...dataset, updatedAt: now, jobs };
  await writeDataset(next);
  await setJobAlarm(updatedJob);
  return next;
}

export async function markScheduledJobDue(jobId: string) {
  const dataset = await loadScheduledJobsDataset();
  const now = nowIso();
  const jobs = dataset.jobs.map((job) =>
    job.id === jobId && job.enabled
      ? { ...job, due: true, updatedAt: now }
      : job
  );
  const next = { ...dataset, updatedAt: now, jobs };
  await writeDataset(next);
  return next;
}

function attempt(
  status: ScheduledJobRunAttempt["status"],
  startedAt: string,
  finishedAt: string,
  recordCount: number,
  warningCount: number,
  error: string,
  retryNumber: number,
  changed: boolean
): ScheduledJobRunAttempt {
  return {
    id: "scheduled-attempt-" + crypto.randomUUID(),
    startedAt,
    finishedAt,
    status,
    recordCount,
    warningCount,
    error,
    retryNumber,
    changed
  };
}

export async function recordScheduledJobSuccess(input: {
  jobId: string;
  startedAt: string;
  records: ExtractionRecordResult[];
  warningCount: number;
}) {
  const dataset = await loadScheduledJobsDataset();
  const index = dataset.jobs.findIndex((job) => job.id === input.jobId);
  if (index < 0) throw new Error("The scheduled job no longer exists.");

  const current = dataset.jobs[index];
  const finishedAt = nowIso();
  const limitedRecords = input.records.slice(0, current.limits.maxRecords);
  const comparison = compareScheduledJobRun(
    current.lastSnapshot,
    limitedRecords,
    finishedAt
  );
  const status = comparison.changed ? "change-detected" : "success";
  const run = attempt(
    status,
    input.startedAt,
    finishedAt,
    limitedRecords.length,
    input.warningCount,
    "",
    current.consecutiveFailures,
    comparison.changed
  );
  const updatedJob: ScheduledExtractionJob = {
    ...current,
    due: false,
    updatedAt: finishedAt,
    lastRunAt: finishedAt,
    nextRunAt: nextScheduledRunAt(current.schedule, new Date(finishedAt)),
    consecutiveFailures: 0,
    lastSnapshot: comparison.snapshot,
    attempts: [...current.attempts, run].slice(-MAX_ATTEMPTS)
  };
  const jobs = [...dataset.jobs];
  jobs[index] = updatedJob;
  let notifications = dataset.notifications;

  if (comparison.changed && current.lastSnapshot) {
    const notification: ScheduledJobChangeNotification = {
      id: "scheduled-change-" + crypto.randomUUID(),
      jobId: current.id,
      detectedAt: finishedAt,
      status: "unread",
      previousRecordCount: current.lastSnapshot.recordCount,
      currentRecordCount: comparison.snapshot.recordCount,
      addedRows: comparison.addedRows,
      removedRows: comparison.removedRows
    };
    notifications = [notification, ...notifications].slice(0, MAX_NOTIFICATIONS);
  }

  const next = {
    ...dataset,
    updatedAt: finishedAt,
    jobs,
    notifications
  };
  await writeDataset(next);
  await setJobAlarm(updatedJob);
  return next;
}

export async function recordScheduledJobFailure(input: {
  jobId: string;
  startedAt: string;
  error: string;
}) {
  const dataset = await loadScheduledJobsDataset();
  const index = dataset.jobs.findIndex((job) => job.id === input.jobId);
  if (index < 0) throw new Error("The scheduled job no longer exists.");

  const current = dataset.jobs[index];
  const finishedAt = nowIso();
  const failures = current.consecutiveFailures + 1;
  const retryAllowed = failures <= current.limits.maxRetries;
  const run = attempt(
    "failed",
    input.startedAt,
    finishedAt,
    0,
    0,
    input.error.slice(0, 500),
    failures,
    false
  );
  const updatedJob: ScheduledExtractionJob = {
    ...current,
    due: false,
    updatedAt: finishedAt,
    lastRunAt: finishedAt,
    nextRunAt: retryAllowed
      ? retryRunAt(current.limits.retryDelayMinutes, new Date(finishedAt))
      : nextScheduledRunAt(current.schedule, new Date(finishedAt)),
    consecutiveFailures: retryAllowed ? failures : 0,
    attempts: [...current.attempts, run].slice(-MAX_ATTEMPTS)
  };
  const jobs = [...dataset.jobs];
  jobs[index] = updatedJob;
  const next = { ...dataset, updatedAt: finishedAt, jobs };
  await writeDataset(next);
  await setJobAlarm(updatedJob);
  return next;
}

export async function markScheduledNotificationRead(notificationId: string) {
  const dataset = await loadScheduledJobsDataset();
  const now = nowIso();
  const next = {
    ...dataset,
    updatedAt: now,
    notifications: dataset.notifications.map((notification) =>
      notification.id === notificationId
        ? { ...notification, status: "read" as const }
        : notification
    )
  };
  await writeDataset(next);
  return next;
}

export function scheduledJobIdFromAlarm(name: string) {
  return name.startsWith(ALARM_PREFIX)
    ? name.slice(ALARM_PREFIX.length)
    : null;
}
