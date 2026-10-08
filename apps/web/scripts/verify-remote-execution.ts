import {
  MockRemoteExecutionProvider,
  createRemoteExecutionJobSpec,
  deriveRemoteExecutionBudget,
  isRemoteProviderExecutionEnabled,
  remoteExecutionReadiness,
  remoteExecutionResultFingerprint,
  selectRemoteSourcePolicy,
  validateEncryptedConfigReference,
  validateRemoteExecutionResultPayload
} from "../lib/remote-execution";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = new Date("2026-10-07T12:00:00.000Z");
const workspaceId = "26000000-0000-4000-8000-000000000001";
const policyPayload = {
  version: 1,
  entries: [{
    version: 1,
    id: "policy-build026",
    workspaceId,
    origin: "https://example.test",
    displayName: "Build 026 approved source",
    purpose: "CI lifecycle verification.",
    collectionMethod: "public-webpage",
    publicOrAuthorized: true,
    termsReviewed: true,
    termsUrl: "https://example.test/terms",
    robotsDecision: "allowed",
    robotsUrl: "https://example.test/robots.txt",
    noAccessControlBypass: true,
    dataSensitivity: "public-facts",
    minimumDelayMs: 1500,
    maxPagesPerRun: 8,
    maxRecordsPerRun: 250,
    reviewExpiresAt: "2027-01-01T00:00:00.000Z",
    status: "approved",
    revision: 3,
    fingerprint: "sp1-build026"
  }]
};

const policy = selectRemoteSourcePolicy(policyPayload, {
  workspaceId,
  origin: "https://example.test/path",
  policyId: "policy-build026",
  policyRevision: 3,
  policyFingerprint: "sp1-build026"
}, now);
assert(policy.origin === "https://example.test", "Policy origin was not normalized.");

let driftBlocked = false;
try {
  selectRemoteSourcePolicy(policyPayload, {
    workspaceId,
    origin: "https://example.test",
    policyId: "policy-build026",
    policyRevision: 2,
    policyFingerprint: "sp1-build026"
  }, now);
} catch (error) {
  driftBlocked = error instanceof Error &&
    error.message === "remote_source_policy_pin_drift";
}
assert(driftBlocked, "Policy drift did not fail closed.");

let rawSecretBlocked = false;
try {
  validateEncryptedConfigReference("api-key-plaintext");
} catch (error) {
  rawSecretBlocked = error instanceof Error &&
    error.message === "remote_config_reference_invalid";
}
assert(rawSecretBlocked, "Raw provider configuration was accepted.");

const budget = deriveRemoteExecutionBudget(policy, {
  maxPages: 99,
  maxRecords: 99999,
  maxRuntimeSeconds: 5000,
  minimumDelayMs: 500
});
assert(budget.maxPages === 8, "Page budget escaped policy.");
assert(budget.maxRecords === 250, "Record budget escaped policy.");
assert(budget.maxRuntimeSeconds === 900, "Runtime cap was not applied.");
assert(budget.minimumDelayMs === 1500, "Source delay was weakened.");

const job = createRemoteExecutionJobSpec({
  jobId: "26000000-0000-4000-8000-000000000002",
  workspaceId,
  savedScraperId: "build026-scraper",
  providerKey: "mock",
  sourceUrl: "https://example.test/catalog",
  policy,
  requestedBudget: { maxPages: 3, maxRecords: 25, maxRuntimeSeconds: 60 },
  createdAt: now.toISOString()
});

const readiness = remoteExecutionReadiness({});
assert(!readiness.productionExecutionEnabled, "Execution must default off.");
assert(isRemoteProviderExecutionEnabled({
  REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED: "true"
}), "Explicit execution flag was not recognized.");

const mock = new MockRemoteExecutionProvider();
assert((await mock.readiness()).ready, "Mock worker is not ready.");
assert((await mock.dispatch(job)).accepted, "Mock dispatch failed.");
validateRemoteExecutionResultPayload(await mock.execute(job), job.budget);

const fingerprintA = remoteExecutionResultFingerprint({
  recordsCollected: 0,
  pagesProcessed: 1,
  records: []
});
const fingerprintB = remoteExecutionResultFingerprint({
  records: [],
  pagesProcessed: 1,
  recordsCollected: 0
});
assert(fingerprintA === fingerprintB, "Fingerprint is not canonical.");

let pageBudgetBlocked = false;
try {
  validateRemoteExecutionResultPayload(
    { pagesProcessed: 4, recordsCollected: 0 },
    job.budget
  );
} catch (error) {
  pageBudgetBlocked = error instanceof Error &&
    error.message === "remote_result_page_budget_exceeded";
}
assert(pageBudgetBlocked, "Page overrun was not blocked.");

console.log(
  "Build 026 remote execution contract, policy pins, budgets, mock worker and disabled-by-default gate passed."
);
