import { browserlessPilotReadiness } from "./browserless-provider";
import {
  listCollectionProjectsForUser,
  type CollectionProjectRecord
} from "./collection-project-database";
import { withUserDatabase } from "./database";
import { listWorkspaceRemoteExecutionJobs } from "./remote-execution-database";
import { listRemotePilotOverviewForUser } from "./remote-pilot-database";

type JsonRecord = Record<string, unknown>;

export type CollectionRunStatus =
  | "prepared"
  | "queued"
  | "leased"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "timed-out";

export interface CollectionRunAttemptEvidence {
  id: string;
  mode: "local-chrome" | "browserless";
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  recordCount: number;
  warningCount: number;
  error: string;
  retryNumber: number;
  changed: boolean | null;
  providerUnits: number;
  durationMs: number | null;
  responseCode: number | null;
  pageTitle: string | null;
  finalUrl: string | null;
}

export interface CollectionRunSourceModel {
  workspaceId: string;
  workspaceName: string;
  role: "owner" | "admin" | "member";
  projectId: string;
  projectName: string;
  projectStatus: string;
  sourceId: string;
  displayName: string;
  sourceUrl: string;
  sourceOrigin: string;
  collectionMethod: string;
  sourceStatus: string;
  readiness: "ready" | "blocked" | "incomplete";
  savedScraperId: string;
  sourcePolicyId: string;
  policyPin: {
    id: string;
    revision: number;
    fingerprint: string;
  } | null;
  local: {
    available: boolean;
    scheduledJobId: string | null;
    enabled: boolean;
    due: boolean;
    attempts: CollectionRunAttemptEvidence[];
    rowsCollected: number;
    successes: number;
    failures: number;
    latestError: string;
    updatedAt: string | null;
    blockers: string[];
  };
  remote: {
    runnable: boolean;
    blockers: string[];
    activeJobId: string | null;
    retryable: boolean;
    attempts: CollectionRunAttemptEvidence[];
    pagesAttempted: number;
    pagesSucceeded: number;
    pagesFailed: number;
    pagesCancelled: number;
    rowsCollected: number;
    providerUnits: number;
    latestError: string;
    allowlisted: boolean;
    workspaceArmed: boolean;
    globalReady: boolean;
  };
}

export interface CollectionRunConsoleModel {
  generatedAt: string;
  runtime: {
    browserlessExecutionEnabled: boolean;
    browserlessTokenConfigured: boolean;
    globalKillSwitchActive: boolean;
    browserlessReady: boolean;
  };
  totals: {
    projects: number;
    sources: number;
    activeRemoteRuns: number;
    localAttempts: number;
    remoteAttempts: number;
    rowsCollected: number;
    providerUnits: number;
  };
  sources: CollectionRunSourceModel[];
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function array(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function dateValue(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") return null;
  return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
}

function isActiveRemoteStatus(status: string) {
  return status === "prepared" ||
    status === "queued" ||
    status === "leased" ||
    status === "running";
}

function scheduledJobsFromPayload(payload: unknown) {
  const body = record(payload);
  return array(body?.jobs).flatMap((candidate) => {
    const job = record(candidate);
    if (!job) return [];
    const attempts = array(job.attempts).flatMap((entry) => {
      const attempt = record(entry);
      if (!attempt) return [];
      return [{
        id: textValue(attempt.id),
        mode: "local-chrome" as const,
        status: textValue(attempt.status),
        startedAt: dateValue(attempt.startedAt),
        finishedAt: dateValue(attempt.finishedAt),
        recordCount: numberValue(attempt.recordCount),
        warningCount: numberValue(attempt.warningCount),
        error: textValue(attempt.error),
        retryNumber: numberValue(attempt.retryNumber),
        changed:
          typeof attempt.changed === "boolean" ? attempt.changed : null,
        providerUnits: 0,
        durationMs: null,
        responseCode: null,
        pageTitle: null,
        finalUrl: textValue(job.sourceUrl) || null
      }];
    });
    return [{
      id: textValue(job.id),
      savedScraperId: textValue(job.savedScraperId),
      sourceOrigin: textValue(job.sourceOrigin).toLowerCase(),
      enabled: job.enabled === true,
      due: job.due === true,
      updatedAt: dateValue(job.updatedAt),
      attempts
    }];
  });
}

function resultSummary(value: unknown) {
  const payload = record(value);
  const provider = record(payload?.provider);
  const page = record(payload?.page);
  return {
    recordsCollected: numberValue(payload?.recordsCollected),
    providerUnits: numberValue(provider?.unitsEstimated),
    durationMs:
      typeof provider?.durationMs === "number" ? provider.durationMs : null,
    responseCode:
      typeof provider?.responseCode === "number" ? provider.responseCode : null,
    pageTitle: typeof page?.title === "string" ? page.title : null,
    finalUrl: typeof page?.finalUrl === "string" ? page.finalUrl : null
  };
}

export function summarizeCollectionRunAttempts(
  attempts: CollectionRunAttemptEvidence[],
  mode: "local-chrome" | "browserless"
) {
  const filtered = attempts.filter((attempt) => attempt.mode === mode);
  return {
    attempts: filtered.length,
    successes: filtered.filter((attempt) => attempt.status === "succeeded").length,
    failures: filtered.filter(
      (attempt) => attempt.status === "failed" || attempt.status === "timed-out"
    ).length,
    cancelled: filtered.filter((attempt) => attempt.status === "cancelled").length,
    active: filtered.filter((attempt) => isActiveRemoteStatus(attempt.status)).length,
    rowsCollected: filtered.reduce((sum, attempt) => sum + attempt.recordCount, 0),
    providerUnits: filtered.reduce((sum, attempt) => sum + attempt.providerUnits, 0)
  };
}

export function browserlessRunBlockers(input: {
  project: CollectionProjectRecord;
  source: CollectionProjectRecord["sources"][number];
  runtimeReady: boolean;
  workspaceArmed: boolean;
  allowlisted: boolean;
}) {
  const blockers: string[] = [];
  const { project, source } = input;
  if (project.status !== "active") blockers.push("Project must be active.");
  if (source.status !== "active") blockers.push("Source must be active.");
  if (source.readiness !== "ready") blockers.push(...source.blockers);
  if (!source.savedScraperId) blockers.push("Link an active saved scraper before remote collection.");
  if (!source.sourceUrl.toLowerCase().startsWith("https://")) blockers.push("Browserless runs require HTTPS.");
  if (
    !source.policy.linked ||
    !source.policy.approved ||
    !source.policy.current ||
    !source.policy.originMatches ||
    !source.policy.methodMatches
  ) {
    blockers.push("A current matching approved Source Policy is required.");
  }
  if (source.collectionMethod !== "public-webpage") {
    blockers.push("Browserless is limited to approved public-webpage sources.");
  }
  if (
    source.policy.dataSensitivity !== "public-facts" ||
    source.policy.robotsDecision !== "allowed" ||
    !source.policy.publicOrAuthorized ||
    !source.policy.termsReviewed ||
    !source.policy.noAccessControlBypass
  ) {
    blockers.push("Source Policy must permit public-facts collection without access-control bypass.");
  }
  if (source.policy.revision < 1 || !source.policy.fingerprint) {
    blockers.push("Exact Source Policy revision and fingerprint are required.");
  }
  if (!input.runtimeReady) blockers.push("Global Browserless runtime is fail-closed.");
  if (!input.workspaceArmed) blockers.push("Workspace Browserless pilot is not armed.");
  if (!input.allowlisted) blockers.push("Source is not allowlisted with the current policy pin.");
  return [...new Set(blockers)];
}

export async function listCollectionRunConsoleForUser(
  userId: string
): Promise<CollectionRunConsoleModel> {
  const runtime = browserlessPilotReadiness();
  const [projects, remoteOverview, durable] = await Promise.all([
    listCollectionProjectsForUser(userId),
    listRemotePilotOverviewForUser(userId),
    withUserDatabase(userId, async (client) => {
      const [scheduled, results] = await Promise.all([
        client.query(
          "select workspace_id,payload,client_updated_at from app.workspace_intelligence_modules where module_key='scheduled-jobs'"
        ),
        client.query(
          "select workspace_id,job_id,result_fingerprint,payload,created_at from app.remote_execution_results order by created_at desc"
        )
      ]);
      return {
        scheduled: scheduled.rows.map((row) => ({
          workspaceId: String(row.workspace_id),
          payload: row.payload as unknown,
          updatedAt: dateValue(row.client_updated_at)
        })),
        results: results.rows.map((row) => ({
          workspaceId: String(row.workspace_id),
          jobId: String(row.job_id),
          fingerprint: String(row.result_fingerprint),
          payload: row.payload as unknown,
          createdAt: dateValue(row.created_at)
        }))
      };
    })
  ]);

  const workspaceIds = [...new Set(projects.map((project) => project.workspaceId))];
  const jobPairs = await Promise.all(
    workspaceIds.map(async (workspaceId) => ({
      workspaceId,
      jobs: await listWorkspaceRemoteExecutionJobs(userId, workspaceId)
    }))
  );
  const jobsByWorkspace = new Map(jobPairs.map((entry) => [entry.workspaceId, entry.jobs]));
  const remoteByWorkspace = new Map(
    remoteOverview.map((entry) => [entry.workspace.id, entry])
  );
  const scheduledByWorkspace = new Map(
    durable.scheduled.map((entry) => [
      entry.workspaceId,
      {
        jobs: scheduledJobsFromPayload(entry.payload),
        updatedAt: entry.updatedAt
      }
    ])
  );
  const resultByJob = new Map(
    durable.results.map((entry) => [
      entry.workspaceId + ":" + entry.jobId,
      entry
    ])
  );

  const sources: CollectionRunSourceModel[] = [];

  for (const project of projects) {
    const remoteWorkspace = remoteByWorkspace.get(project.workspaceId);
    const workspaceJobs = jobsByWorkspace.get(project.workspaceId) ?? [];
    const localWorkspace = scheduledByWorkspace.get(project.workspaceId);
    const allowlist = remoteWorkspace?.allowlist ?? [];
    const control = remoteWorkspace?.control ?? null;

    for (const source of project.sources) {
      if (source.status === "retired" || project.status === "archived") continue;

      const localJob = localWorkspace?.jobs.find(
        (job) =>
          (source.savedScraperId && job.savedScraperId === source.savedScraperId) ||
          job.sourceOrigin === source.sourceOrigin
      ) ?? null;
      const localAttempts = [...(localJob?.attempts ?? [])].sort(
        (a, b) =>
          Date.parse(b.finishedAt ?? b.startedAt ?? "1970-01-01") -
          Date.parse(a.finishedAt ?? a.startedAt ?? "1970-01-01")
      );
      const localSummary = summarizeCollectionRunAttempts(localAttempts, "local-chrome");

      const sourceJobs = workspaceJobs
        .filter(
          (job) =>
            job.sourceOrigin === source.sourceOrigin &&
            (!source.savedScraperId || job.savedScraperId === source.savedScraperId)
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const remoteAttempts: CollectionRunAttemptEvidence[] = sourceJobs.map((job) => {
        const result = resultByJob.get(project.workspaceId + ":" + job.jobId);
        const summary = resultSummary(result?.payload);
        const terminalAt = job.completedAt?.toISOString() ?? result?.createdAt ?? null;
        return {
          id: job.jobId,
          mode: "browserless",
          status: job.status,
          startedAt: job.startedAt?.toISOString() ?? job.createdAt.toISOString(),
          finishedAt: terminalAt,
          recordCount: summary.recordsCollected,
          warningCount: 0,
          error: job.failureCode ?? "",
          retryNumber: Math.max(0, job.attemptCount - 1),
          changed: null,
          providerUnits: summary.providerUnits,
          durationMs: summary.durationMs,
          responseCode: summary.responseCode,
          pageTitle: summary.pageTitle,
          finalUrl: summary.finalUrl
        };
      });
      const remoteSummary = summarizeCollectionRunAttempts(remoteAttempts, "browserless");
      const active = sourceJobs.find((job) => isActiveRemoteStatus(job.status)) ?? null;
      const latestTerminal = sourceJobs.find((job) => !isActiveRemoteStatus(job.status)) ?? null;

      const matchingAllowlist = allowlist.find(
        (item) =>
          item.enabled &&
          item.sourceOrigin === source.sourceOrigin &&
          item.policyId === source.sourcePolicyId &&
          item.policyRevision === source.policy.revision &&
          item.policyFingerprint === source.policy.fingerprint
      );
      const workspaceArmed = Boolean(control?.enabled && !control.killSwitch);
      const blockers = browserlessRunBlockers({
        project,
        source,
        runtimeReady: runtime.readyForLivePilot,
        workspaceArmed,
        allowlisted: Boolean(matchingAllowlist)
      });

      const localBlockers: string[] = [];
      if (project.status !== "active") localBlockers.push("Project must be active.");
      if (source.status !== "active") localBlockers.push("Source must be active.");
      if (source.readiness !== "ready") localBlockers.push(...source.blockers);
      if (!source.savedScraperId) localBlockers.push("Link a saved scraper before a Chrome run.");
      if (!localJob) {
        localBlockers.push(
          "Create or refresh the matching scheduled job in the Chrome extension, then synchronize intelligence."
        );
      }

      sources.push({
        workspaceId: project.workspaceId,
        workspaceName: project.workspaceName,
        role: project.role,
        projectId: project.projectId,
        projectName: project.name,
        projectStatus: project.status,
        sourceId: source.sourceId,
        displayName: source.displayName,
        sourceUrl: source.sourceUrl,
        sourceOrigin: source.sourceOrigin,
        collectionMethod: source.collectionMethod,
        sourceStatus: source.status,
        readiness: source.readiness,
        savedScraperId: source.savedScraperId,
        sourcePolicyId: source.sourcePolicyId,
        policyPin:
          source.sourcePolicyId && source.policy.revision > 0 && source.policy.fingerprint
            ? {
                id: source.sourcePolicyId,
                revision: source.policy.revision,
                fingerprint: source.policy.fingerprint
              }
            : null,
        local: {
          available: localBlockers.length === 0,
          scheduledJobId: localJob?.id ?? null,
          enabled: localJob?.enabled ?? false,
          due: localJob?.due ?? false,
          attempts: localAttempts.slice(0, 20),
          rowsCollected: localSummary.rowsCollected,
          successes: localSummary.successes,
          failures: localSummary.failures,
          latestError: localAttempts.find((attempt) => attempt.error)?.error ?? "",
          updatedAt: localJob?.updatedAt ?? localWorkspace?.updatedAt ?? null,
          blockers: [...new Set(localBlockers)]
        },
        remote: {
          runnable: blockers.length === 0 && !active,
          blockers,
          activeJobId: active?.jobId ?? null,
          retryable:
            blockers.length === 0 &&
            !active &&
            Boolean(
              latestTerminal &&
                (latestTerminal.status === "failed" ||
                  latestTerminal.status === "timed-out" ||
                  latestTerminal.status === "cancelled")
            ),
          attempts: remoteAttempts.slice(0, 20),
          pagesAttempted: remoteAttempts.length,
          pagesSucceeded: remoteSummary.successes,
          pagesFailed: remoteSummary.failures,
          pagesCancelled: remoteSummary.cancelled,
          rowsCollected: remoteSummary.rowsCollected,
          providerUnits: remoteSummary.providerUnits,
          latestError: remoteAttempts.find((attempt) => attempt.error)?.error ?? "",
          allowlisted: Boolean(matchingAllowlist),
          workspaceArmed,
          globalReady: runtime.readyForLivePilot
        }
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    runtime: {
      browserlessExecutionEnabled: runtime.executionEnabled,
      browserlessTokenConfigured: runtime.tokenConfigured,
      globalKillSwitchActive: runtime.globalKillSwitchActive,
      browserlessReady: runtime.readyForLivePilot
    },
    totals: {
      projects: projects.filter((project) => project.status !== "archived").length,
      sources: sources.length,
      activeRemoteRuns: sources.filter((source) => source.remote.activeJobId).length,
      localAttempts: sources.reduce((sum, source) => sum + source.local.attempts.length, 0),
      remoteAttempts: sources.reduce((sum, source) => sum + source.remote.attempts.length, 0),
      rowsCollected: sources.reduce(
        (sum, source) => sum + source.local.rowsCollected + source.remote.rowsCollected,
        0
      ),
      providerUnits: sources.reduce((sum, source) => sum + source.remote.providerUnits, 0)
    },
    sources
  };
}
