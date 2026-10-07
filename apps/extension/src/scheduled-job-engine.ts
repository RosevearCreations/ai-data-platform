import type {
  ExtractionRecordResult,
  ScheduledExtractionJob,
  ScheduledJobRunComparison,
  ScheduledJobSchedule,
  ScheduledJobSnapshot,
  ScheduledSourcePolicyReview
} from "./types";

const MIN_INTERVAL_HOURS = 1;
const MAX_INTERVAL_HOURS = 24 * 30;

function clampInteger(value: number, minimum: number, maximum: number) {
  const rounded = Math.round(Number.isFinite(value) ? value : minimum);
  return Math.max(minimum, Math.min(maximum, rounded));
}

export function normalizedSchedule(
  schedule: ScheduledJobSchedule
): ScheduledJobSchedule {
  return {
    cadence: schedule.cadence,
    localHour: clampInteger(schedule.localHour, 0, 23),
    weekday: clampInteger(schedule.weekday, 0, 6),
    intervalHours: clampInteger(
      schedule.intervalHours,
      MIN_INTERVAL_HOURS,
      MAX_INTERVAL_HOURS
    )
  };
}

export function nextScheduledRunAt(
  scheduleInput: ScheduledJobSchedule,
  from = new Date()
) {
  const schedule = normalizedSchedule(scheduleInput);

  if (schedule.cadence === "interval") {
    return new Date(
      from.getTime() + schedule.intervalHours * 60 * 60 * 1000
    ).toISOString();
  }

  const next = new Date(from);
  next.setMinutes(0, 0, 0);
  next.setHours(schedule.localHour);

  if (schedule.cadence === "daily") {
    if (next.getTime() <= from.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    return next.toISOString();
  }

  const currentWeekday = next.getDay();
  let daysAhead = (schedule.weekday - currentWeekday + 7) % 7;
  if (daysAhead === 0 && next.getTime() <= from.getTime()) {
    daysAhead = 7;
  }
  next.setDate(next.getDate() + daysAhead);
  return next.toISOString();
}

export function retryRunAt(
  retryDelayMinutes: number,
  from = new Date()
) {
  const delay = clampInteger(retryDelayMinutes, 5, 24 * 60);
  return new Date(from.getTime() + delay * 60 * 1000).toISOString();
}

export function validateSourcePolicy(
  policy: ScheduledSourcePolicyReview
) {
  const reasons: string[] = [];

  if (!policy.publicOrAuthorized) {
    reasons.push("The source must be public or explicitly authorized.");
  }
  if (!policy.termsReviewed) {
    reasons.push(
      "Review applicable source terms and robots/crawl directives before scheduling."
    );
  }
  if (!policy.noAccessControlBypass) {
    reasons.push(
      "Scheduled jobs cannot require bypassing login, paywall, CAPTCHA or technical access controls."
    );
  }
  if (
    !policy.registryPolicyId ||
    !policy.registryPolicyFingerprint ||
    !Number.isInteger(policy.registryPolicyRevision) ||
    Number(policy.registryPolicyRevision) < 1
  ) {
    reasons.push(
      "A current Build 025 source-policy registry revision is required before scheduling."
    );
  }
  if (
    !policy.reviewExpiresAt ||
    !Number.isFinite(Date.parse(policy.reviewExpiresAt)) ||
    Date.parse(policy.reviewExpiresAt) <= Date.now()
  ) {
    reasons.push("The source-policy review has expired.");
  }
  if (
    typeof policy.minimumDelayMs !== "number" ||
    policy.minimumDelayMs < 500
  ) {
    reasons.push("The registered minimum crawl delay must be at least 500 ms.");
  }

  return {
    allowed: reasons.length === 0,
    reasons
  };
}

function canonicalValue(value: string | number | null) {
  return value === null ? null : value;
}

function stableRecordPayload(record: ExtractionRecordResult) {
  const values = Object.fromEntries(
    Object.keys(record.values)
      .sort()
      .map((key) => [key, canonicalValue(record.values[key] ?? null)])
  );
  return JSON.stringify(values);
}

function hashText(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createScheduledJobSnapshot(
  records: ExtractionRecordResult[],
  capturedAt = new Date().toISOString()
): ScheduledJobSnapshot {
  const rowFingerprints = records
    .map((record) => hashText(stableRecordPayload(record)))
    .sort();

  return {
    capturedAt,
    recordCount: records.length,
    signature: hashText(rowFingerprints.join("|")),
    rowFingerprints
  };
}

export function compareScheduledJobRun(
  previous: ScheduledJobSnapshot | null,
  records: ExtractionRecordResult[],
  capturedAt = new Date().toISOString()
): ScheduledJobRunComparison {
  const snapshot = createScheduledJobSnapshot(records, capturedAt);

  if (!previous) {
    return {
      snapshot,
      changed: false,
      addedRows: 0,
      removedRows: 0
    };
  }

  const before = new Map<string, number>();
  const after = new Map<string, number>();

  for (const fingerprint of previous.rowFingerprints) {
    before.set(fingerprint, (before.get(fingerprint) ?? 0) + 1);
  }
  for (const fingerprint of snapshot.rowFingerprints) {
    after.set(fingerprint, (after.get(fingerprint) ?? 0) + 1);
  }

  let addedRows = 0;
  let removedRows = 0;

  for (const [fingerprint, count] of after) {
    addedRows += Math.max(0, count - (before.get(fingerprint) ?? 0));
  }
  for (const [fingerprint, count] of before) {
    removedRows += Math.max(0, count - (after.get(fingerprint) ?? 0));
  }

  return {
    snapshot,
    changed: previous.signature !== snapshot.signature,
    addedRows,
    removedRows
  };
}

export function jobIsDue(
  job: ScheduledExtractionJob,
  now = new Date()
) {
  return (
    job.enabled &&
    (job.due || new Date(job.nextRunAt).getTime() <= now.getTime())
  );
}
