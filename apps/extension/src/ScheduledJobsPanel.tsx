import { useEffect, useMemo, useState } from "react";

import { executeExtractionRecipe } from "./recipe-engine";
import {
  createScheduledJob,
  deleteScheduledJob,
  loadScheduledJobsDataset,
  markScheduledNotificationRead,
  recordScheduledJobFailure,
  recordScheduledJobSuccess,
  refreshScheduledJobRecipe,
  setScheduledJobEnabled
} from "./scheduled-job-store";
import { loadSavedScrapers, sourceOriginFor } from "./saved-scrapers";
import type {
  ExtractionRecipe,
  ExtractionRunResult,
  SavedScraper,
  ScheduledExtractionJob,
  ScheduledJobCadence,
  ScheduledJobsDataset,
  ScheduledSourcePolicyReview
} from "./types";

interface ScheduledJobsPanelProps {
  onApplyRecipe: (recipe: ExtractionRecipe) => void;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  if (!tab?.id) throw new Error("No active browser tab is available.");
  return tab;
}

function scheduleLabel(job: ScheduledExtractionJob) {
  if (job.schedule.cadence === "interval") {
    return "Every " + job.schedule.intervalHours + " hour" +
      (job.schedule.intervalHours === 1 ? "" : "s");
  }

  const hour = new Date();
  hour.setHours(job.schedule.localHour, 0, 0, 0);
  const time = hour.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

  if (job.schedule.cadence === "daily") {
    return "Daily at " + time;
  }

  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return (weekdays[job.schedule.weekday] ?? "Weekly") + " at " + time;
}

function clonePolicy(policy: ScheduledSourcePolicyReview) {
  return { ...policy, reviewedAt: new Date().toISOString() };
}

export function ScheduledJobsPanel({
  onApplyRecipe
}: ScheduledJobsPanelProps) {
  const [scrapers, setScrapers] = useState<SavedScraper[]>([]);
  const [dataset, setDataset] = useState<ScheduledJobsDataset | null>(null);
  const [savedScraperId, setSavedScraperId] = useState("");
  const [cadence, setCadence] = useState<ScheduledJobCadence>("daily");
  const [localHour, setLocalHour] = useState(new Date().getHours());
  const [weekday, setWeekday] = useState(new Date().getDay());
  const [intervalHours, setIntervalHours] = useState(24);
  const [maxRecords, setMaxRecords] = useState(200);
  const [maxRetries, setMaxRetries] = useState(2);
  const [retryDelayMinutes, setRetryDelayMinutes] = useState(60);
  const [policy, setPolicy] = useState<ScheduledSourcePolicyReview>({
    reviewedAt: "",
    publicOrAuthorized: false,
    termsReviewed: false,
    noAccessControlBypass: false,
    notes: ""
  });
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function refresh() {
    const [saved, jobs] = await Promise.all([
      loadSavedScrapers(),
      loadScheduledJobsDataset()
    ]);
    const schedulable = saved.filter((item) => item.kind === "scraper");
    setScrapers(schedulable);
    setDataset(jobs);
    setSavedScraperId((current) =>
      current && schedulable.some((item) => item.id === current)
        ? current
        : schedulable[0]?.id ?? ""
    );
  }

  useEffect(() => {
    void refresh().catch(() => undefined);

    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === "local" && Object.keys(changes).length) {
        void refresh().catch(() => undefined);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const selectedScraper = useMemo(
    () => scrapers.find((item) => item.id === savedScraperId) ?? null,
    [savedScraperId, scrapers]
  );
  const jobs = dataset?.jobs ?? [];
  const notifications = dataset?.notifications ?? [];
  const dueCount = jobs.filter((job) => job.enabled && job.due).length;
  const unreadCount = notifications.filter(
    (notification) => notification.status === "unread"
  ).length;

  async function createJob() {
    if (!selectedScraper) return;
    setPending(true);
    setStatus(null);

    try {
      await createScheduledJob({
        savedScraper: selectedScraper,
        schedule: {
          cadence,
          localHour,
          weekday,
          intervalHours
        },
        limits: {
          maxRecords,
          maxRetries,
          retryDelayMinutes
        },
        sourcePolicy: clonePolicy(policy)
      });
      await refresh();
      setStatus(
        "Scheduled job created. Chrome will mark it due at the scheduled time; extraction still requires you to open an allowed source page and run it interactively."
      );
    } catch (reason) {
      setStatus(
        reason instanceof Error ? reason.message : "Unable to create scheduled job."
      );
    } finally {
      setPending(false);
    }
  }

  async function runJob(job: ScheduledExtractionJob) {
    const saved = scrapers.find((item) => item.id === job.savedScraperId);
    if (!saved) {
      setStatus("The source saved scraper no longer exists. Recreate this scheduled job.");
      return;
    }
    if (saved.revision !== job.savedScraperRevision) {
      setStatus(
        "This job is pinned to scraper revision " +
          job.savedScraperRevision +
          ", while the saved scraper is revision " +
          saved.revision +
          ". Refresh + re-review the job before running it."
      );
      return;
    }

    let tab: chrome.tabs.Tab;
    try {
      tab = await getActiveTab();
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "No active tab is available.");
      return;
    }

    const currentOrigin = sourceOriginFor(tab.url ?? "");
    if (!currentOrigin || currentOrigin !== job.sourceOrigin) {
      setStatus(
        "Open an allowed page on " +
          (job.sourceOrigin || "the scheduled source site") +
          " before running this job."
      );
      return;
    }

    const hadBaseline = Boolean(job.lastSnapshot);
    const startedAt = new Date().toISOString();
    setPending(true);
    setStatus(null);

    try {
      const injection = {
        target: { tabId: tab.id! },
        func: executeExtractionRecipe,
        args: [job.recipe]
      } as unknown as Parameters<typeof chrome.scripting.executeScript>[0];

      const results = await chrome.scripting.executeScript(injection);
      const result = results[0]?.result as ExtractionRunResult | undefined;
      if (!result) {
        throw new Error("The scheduled extraction did not return a result.");
      }

      const limited = result.records.slice(0, job.limits.maxRecords);
      const warningCount =
        result.warnings.length +
        limited.reduce((total, record) => total + record.warnings.length, 0) +
        (result.records.length > job.limits.maxRecords ? 1 : 0);

      const updated = await recordScheduledJobSuccess({
        jobId: job.id,
        startedAt,
        records: limited,
        warningCount
      });
      setDataset(updated);

      const updatedJob = updated.jobs.find((entry) => entry.id === job.id);
      const lastAttempt = updatedJob?.attempts[updatedJob.attempts.length - 1];
      setStatus(
        lastAttempt?.changed
          ? "Run completed and a data change was detected. A local change notification was created."
          : !hadBaseline
            ? "Run completed. The first successful run established the comparison baseline."
            : "Run completed with no snapshot change detected."
      );
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Scheduled extraction failed.";
      try {
        const updated = await recordScheduledJobFailure({
          jobId: job.id,
          startedAt,
          error: message
        });
        setDataset(updated);
      } catch {
        // Preserve the original execution error in the UI.
      }
      setStatus(
        message +
          " Retry handling follows the job's bounded retry policy; no access control will be bypassed."
      );
    } finally {
      setPending(false);
    }
  }

  async function toggleJob(job: ScheduledExtractionJob) {
    setPending(true);
    setStatus(null);
    try {
      const updated = await setScheduledJobEnabled(job.id, !job.enabled);
      setDataset(updated);
      setStatus(job.enabled ? "Scheduled job paused." : "Scheduled job enabled with a fresh next-run time.");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to update scheduled job.");
    } finally {
      setPending(false);
    }
  }

  async function refreshJob(job: ScheduledExtractionJob) {
    const saved = scrapers.find((item) => item.id === job.savedScraperId);
    if (!saved) {
      setStatus("The source saved scraper no longer exists.");
      return;
    }

    setPending(true);
    setStatus(null);
    try {
      const updated = await refreshScheduledJobRecipe({
        jobId: job.id,
        savedScraper: saved,
        sourcePolicy: clonePolicy(policy)
      });
      setDataset(updated);
      setStatus(
        "Scheduled job refreshed to scraper revision " +
          saved.revision +
          " and the source-policy review timestamp was renewed."
      );
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to refresh scheduled job.");
    } finally {
      setPending(false);
    }
  }

  async function removeJob(jobId: string) {
    setPending(true);
    setStatus(null);
    try {
      const updated = await deleteScheduledJob(jobId);
      setDataset(updated);
      setStatus("Scheduled job and its local change notifications were deleted.");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to delete scheduled job.");
    } finally {
      setPending(false);
    }
  }

  async function readNotification(notificationId: string) {
    try {
      const updated = await markScheduledNotificationRead(notificationId);
      setDataset(updated);
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to mark notification read.");
    }
  }

  return (
    <section className="scheduledJobs">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Build 017</p>
          <h2>Scheduled & repeatable jobs</h2>
        </div>
        <span className="scheduledBadge">
          {dueCount} due · {unreadCount} new
        </span>
      </div>

      <p className="scheduledIntro">
        Schedules create bounded due-work reminders, not unattended crawling.
        A source-policy review is required before a job can be enabled, and each
        extraction runs only while you are present on the approved source site.
      </p>

      <div className="scheduledCreate">
        <strong>Create a repeatable job</strong>

        <label>
          Saved scraper
          <select
            disabled={pending}
            onChange={(event) => setSavedScraperId(event.target.value)}
            value={savedScraperId}
          >
            {scrapers.length ? null : <option value="">No saved scrapers</option>}
            {scrapers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · r{item.revision}
              </option>
            ))}
          </select>
        </label>

        <div className="scheduledGrid">
          <label>
            Cadence
            <select
              disabled={pending}
              onChange={(event) =>
                setCadence(event.target.value as ScheduledJobCadence)
              }
              value={cadence}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="interval">Every N hours</option>
            </select>
          </label>

          {cadence === "weekly" ? (
            <label>
              Weekday
              <select
                disabled={pending}
                onChange={(event) => setWeekday(Number(event.target.value))}
                value={weekday}
              >
                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
                  (day, index) => (
                    <option key={day} value={index}>{day}</option>
                  )
                )}
              </select>
            </label>
          ) : null}

          {cadence === "interval" ? (
            <label>
              Interval hours
              <input
                disabled={pending}
                max={720}
                min={1}
                onChange={(event) => setIntervalHours(Number(event.target.value))}
                type="number"
                value={intervalHours}
              />
            </label>
          ) : (
            <label>
              Local hour (0–23)
              <input
                disabled={pending}
                max={23}
                min={0}
                onChange={(event) => setLocalHour(Number(event.target.value))}
                type="number"
                value={localHour}
              />
            </label>
          )}

          <label>
            Max records / run
            <input
              disabled={pending}
              max={500}
              min={1}
              onChange={(event) => setMaxRecords(Number(event.target.value))}
              type="number"
              value={maxRecords}
            />
          </label>

          <label>
            Max retries
            <input
              disabled={pending}
              max={3}
              min={0}
              onChange={(event) => setMaxRetries(Number(event.target.value))}
              type="number"
              value={maxRetries}
            />
          </label>

          <label>
            Retry delay (minutes)
            <input
              disabled={pending}
              max={1440}
              min={5}
              onChange={(event) => setRetryDelayMinutes(Number(event.target.value))}
              type="number"
              value={retryDelayMinutes}
            />
          </label>
        </div>

        <div className="scheduledPolicy">
          <strong>Required source-policy review</strong>
          <label>
            <input
              checked={policy.publicOrAuthorized}
              disabled={pending}
              onChange={(event) =>
                setPolicy((current) => ({
                  ...current,
                  publicOrAuthorized: event.target.checked
                }))
              }
              type="checkbox"
            />
            <span>The source is public or I am explicitly authorized to access it.</span>
          </label>
          <label>
            <input
              checked={policy.termsReviewed}
              disabled={pending}
              onChange={(event) =>
                setPolicy((current) => ({
                  ...current,
                  termsReviewed: event.target.checked
                }))
              }
              type="checkbox"
            />
            <span>I reviewed applicable source terms and robots/crawl directives where relevant.</span>
          </label>
          <label>
            <input
              checked={policy.noAccessControlBypass}
              disabled={pending}
              onChange={(event) =>
                setPolicy((current) => ({
                  ...current,
                  noAccessControlBypass: event.target.checked
                }))
              }
              type="checkbox"
            />
            <span>This job does not require bypassing login, paywall, CAPTCHA or technical access controls.</span>
          </label>
          <textarea
            disabled={pending}
            onChange={(event) =>
              setPolicy((current) => ({ ...current, notes: event.target.value }))
            }
            placeholder="Optional source-policy notes"
            rows={2}
            value={policy.notes}
          />
        </div>

        <button
          className="scheduledCreateButton"
          disabled={
            pending ||
            !selectedScraper ||
            !policy.publicOrAuthorized ||
            !policy.termsReviewed ||
            !policy.noAccessControlBypass
          }
          onClick={createJob}
          type="button"
        >
          {pending ? "Updating schedule…" : "Create scheduled job"}
        </button>
      </div>

      <div className="scheduledListHeader">
        <strong>Local scheduled jobs</strong>
        <span>{jobs.length} configured</span>
      </div>

      {jobs.length ? (
        <div className="scheduledList">
          {jobs.map((job) => {
            const saved = scrapers.find((item) => item.id === job.savedScraperId);
            const stale = Boolean(saved && saved.revision !== job.savedScraperRevision);
            const lastAttempt = job.attempts[job.attempts.length - 1];

            return (
              <article key={job.id}>
                <div className="scheduledJobTop">
                  <div>
                    <span
                      className={
                        "scheduledState " +
                        (job.enabled
                          ? job.due
                            ? "scheduledState-due"
                            : "scheduledState-enabled"
                          : "scheduledState-paused")
                      }
                    >
                      {job.enabled ? (job.due ? "due" : "enabled") : "paused"}
                    </span>
                    <strong>{job.name}</strong>
                  </div>
                  <small>r{job.savedScraperRevision}</small>
                </div>

                <span>{scheduleLabel(job)}</span>
                <small>
                  Next: {new Date(job.nextRunAt).toLocaleString()} · max{" "}
                  {job.limits.maxRecords} records · {job.limits.maxRetries} retries
                </small>
                <small className="scheduledSource">{job.sourceOrigin || job.sourceUrl}</small>

                {stale ? (
                  <p className="scheduledWarning">
                    Saved scraper is now revision {saved?.revision}. Refresh + re-review before running this job.
                  </p>
                ) : null}

                {lastAttempt ? (
                  <small>
                    Last run: {lastAttempt.status} · {lastAttempt.recordCount} records
                    {lastAttempt.error ? " · " + lastAttempt.error : ""}
                  </small>
                ) : (
                  <small>No run baseline yet.</small>
                )}

                <div className="scheduledActions">
                  <button
                    disabled={pending || !job.enabled || stale}
                    onClick={() => runJob(job)}
                    type="button"
                  >
                    {job.due ? "Run due job" : "Run now"}
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => onApplyRecipe(job.recipe)}
                    type="button"
                  >
                    Load recipe
                  </button>
                  {stale ? (
                    <button
                      disabled={
                        pending ||
                        !policy.publicOrAuthorized ||
                        !policy.termsReviewed ||
                        !policy.noAccessControlBypass
                      }
                      onClick={() => refreshJob(job)}
                      type="button"
                    >
                      Refresh + re-review
                    </button>
                  ) : null}
                  <button
                    disabled={pending}
                    onClick={() => toggleJob(job)}
                    type="button"
                  >
                    {job.enabled ? "Pause" : "Enable"}
                  </button>
                  <button
                    className="scheduledDelete"
                    disabled={pending}
                    onClick={() => removeJob(job.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>

                {job.attempts.length ? (
                  <details className="scheduledAttempts">
                    <summary>Run history ({job.attempts.length})</summary>
                    <div>
                      {[...job.attempts]
                        .reverse()
                        .slice(0, 8)
                        .map((attempt) => (
                          <span key={attempt.id}>
                            {new Date(attempt.finishedAt).toLocaleString()} ·{" "}
                            {attempt.status} · {attempt.recordCount} records
                          </span>
                        ))}
                    </div>
                  </details>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="scheduledEmpty">
          No scheduled jobs yet. Save a scraper first, complete the source-policy review, and choose a bounded cadence.
        </p>
      )}

      <div className="scheduledListHeader">
        <strong>Change notifications</strong>
        <span>{unreadCount} unread</span>
      </div>

      {notifications.length ? (
        <div className="scheduledNotifications">
          {notifications.slice(0, 12).map((notification) => {
            const job = jobs.find((entry) => entry.id === notification.jobId);
            return (
              <article
                className={
                  notification.status === "unread" ? "scheduledUnread" : ""
                }
                key={notification.id}
              >
                <div>
                  <strong>{job?.name ?? "Scheduled job"}</strong>
                  <span>{notification.status}</span>
                </div>
                <small>
                  {new Date(notification.detectedAt).toLocaleString()} ·{" "}
                  {notification.previousRecordCount} →{" "}
                  {notification.currentRecordCount} records · +{notification.addedRows} / -{notification.removedRows}
                </small>
                {notification.status === "unread" ? (
                  <button
                    disabled={pending}
                    onClick={() => readNotification(notification.id)}
                    type="button"
                  >
                    Mark read
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="scheduledEmpty">
          The first successful run creates a baseline. Later snapshot changes create local notifications without writing to any business system.
        </p>
      )}

      {status ? <p className="scheduledStatus" role="status">{status}</p> : null}
    </section>
  );
}
