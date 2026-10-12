import {
  browserlessRunBlockers,
  summarizeCollectionRunAttempts,
  type CollectionRunAttemptEvidence
} from "../lib/collection-runs";
import type { CollectionProjectRecord } from "../lib/collection-project-database";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const baseSource = {
  sourceId: "source-1",
  displayName: "Example",
  sourceUrl: "https://example.com/",
  sourceOrigin: "https://example.com",
  collectionMethod: "public-webpage",
  sourcePolicyId: "policy-1",
  savedScraperId: "scraper-1",
  cadence: "manual",
  status: "active",
  notes: "",
  readiness: "ready",
  blockers: [],
  policy: {
    linked: true,
    approved: true,
    current: true,
    originMatches: true,
    methodMatches: true,
    revision: 3,
    fingerprint: "policy-fingerprint",
    dataSensitivity: "public-facts",
    robotsDecision: "allowed",
    publicOrAuthorized: true,
    termsReviewed: true,
    noAccessControlBypass: true
  },
  scraper: {
    requested: true,
    present: true,
    originMatches: true
  },
  createdAt: new Date("2026-10-11T20:00:00Z"),
  updatedAt: new Date("2026-10-11T20:00:00Z")
} as const;

const project = {
  workspaceId: "00000000-0000-0000-0000-000000000001",
  workspaceName: "Example",
  workspaceProfile: "Example",
  role: "owner",
  canManage: true,
  projectId: "00000000-0000-0000-0000-000000000002",
  name: "Collection",
  purpose: "Test factual collection",
  status: "active",
  cadence: "manual",
  ownerLabel: "Owner",
  notes: "",
  readiness: "ready",
  sources: [baseSource],
  createdAt: new Date("2026-10-11T20:00:00Z"),
  updatedAt: new Date("2026-10-11T20:00:00Z")
} as unknown as CollectionProjectRecord;

const ready = browserlessRunBlockers({
  project,
  source: project.sources[0],
  runtimeReady: true,
  workspaceArmed: true,
  allowlisted: true
});
assert(ready.length === 0, "Fully governed Browserless source should be runnable.");

const killed = browserlessRunBlockers({
  project,
  source: project.sources[0],
  runtimeReady: false,
  workspaceArmed: true,
  allowlisted: true
});
assert(
  killed.some((item) => item.includes("fail-closed")),
  "Global Browserless gate must block execution."
);

const noRecipeProject = {
  ...project,
  sources: [{ ...project.sources[0], savedScraperId: "" }]
};
const noRecipe = browserlessRunBlockers({
  project: noRecipeProject,
  source: noRecipeProject.sources[0],
  runtimeReady: true,
  workspaceArmed: true,
  allowlisted: true
});
assert(
  noRecipe.some((item) => item.includes("saved scraper")),
  "Remote collection must require an explicitly linked saved scraper."
);

const attempts: CollectionRunAttemptEvidence[] = [
  {
    id: "remote-ok",
    mode: "browserless",
    status: "succeeded",
    startedAt: "2026-10-11T20:00:00Z",
    finishedAt: "2026-10-11T20:00:10Z",
    recordCount: 0,
    warningCount: 0,
    error: "",
    retryNumber: 0,
    changed: null,
    providerUnits: 1,
    durationMs: 10000,
    responseCode: 200,
    pageTitle: "Example",
    finalUrl: "https://example.com/"
  },
  {
    id: "remote-failed",
    mode: "browserless",
    status: "failed",
    startedAt: "2026-10-11T20:01:00Z",
    finishedAt: "2026-10-11T20:01:05Z",
    recordCount: 0,
    warningCount: 0,
    error: "provider_failure",
    retryNumber: 0,
    changed: null,
    providerUnits: 0,
    durationMs: null,
    responseCode: null,
    pageTitle: null,
    finalUrl: null
  },
  {
    id: "local-ok",
    mode: "local-chrome",
    status: "succeeded",
    startedAt: "2026-10-11T20:02:00Z",
    finishedAt: "2026-10-11T20:02:01Z",
    recordCount: 12,
    warningCount: 1,
    error: "",
    retryNumber: 0,
    changed: true,
    providerUnits: 0,
    durationMs: null,
    responseCode: null,
    pageTitle: null,
    finalUrl: "https://example.com/"
  }
];

const remote = summarizeCollectionRunAttempts(attempts, "browserless");
assert(remote.attempts === 2, "Browserless attempt count mismatch.");
assert(remote.successes === 1 && remote.failures === 1, "Browserless terminal counts mismatch.");
assert(remote.providerUnits === 1, "Browserless unit evidence mismatch.");

const local = summarizeCollectionRunAttempts(attempts, "local-chrome");
assert(local.rowsCollected === 12, "Local Chrome row evidence mismatch.");
assert(local.successes === 1, "Local Chrome success evidence mismatch.");

console.log(
  "Build 047 collection-run gates, fail-closed Browserless readiness and local/remote evidence summaries passed."
);
