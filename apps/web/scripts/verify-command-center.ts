import { buildCommandCenterSummary } from "../lib/command-center";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = new Date("2026-10-11T16:00:00.000Z");
const summary = buildCommandCenterSummary({
  adoption: {
    generatedAt: now.toISOString(),
    totals: { workspaces: 2, activeWorkspaces: 1 },
    profiles: [],
    recommendations: [],
    workspaces: [
      {
        workspaceId: "w1", workspaceName: "Rosie", profileKey: "detail", profileName: "Detailing",
        role: "owner", activityEvents: 7,
        activity: { sync: 2, sourcePolicySources: 1, scheduledJobs: 1, scheduledAttempts: 2, remoteJobs: 1, remoteRuns: 1, barcodeCaptures: 0, integrationEvents: 1, connectorExecutions: 0 },
        capabilities: { enabled: [], used: [], unusedEnabled: [], highRiskUnused: [], disabledUsed: [] },
        connectors: { installations: 0, enabledInstallations: 0, grants: [], usedGrants: [], unusedGrants: [], staleUnusedGrants: [], blockedAttempts: 0, executions: 0 },
        permissions: { owners: 1, admins: 0, members: 0, status: "healthy", recommendations: [] },
        trend: { previousSnapshotAt: null, activityEventsDelta: null, usedCapabilitiesDelta: null, connectorUsedGrantsDelta: null },
        snapshotCount: 1
      },
      {
        workspaceId: "w2", workspaceName: "Maker", profileKey: "maker", profileName: "Maker",
        role: "admin", activityEvents: 0,
        activity: { sync: 0, sourcePolicySources: 0, scheduledJobs: 0, scheduledAttempts: 0, remoteJobs: 0, remoteRuns: 0, barcodeCaptures: 0, integrationEvents: 0, connectorExecutions: 0 },
        capabilities: { enabled: [], used: [], unusedEnabled: [], highRiskUnused: [], disabledUsed: ["remoteExecution"] },
        connectors: { installations: 0, enabledInstallations: 0, grants: [], usedGrants: [], unusedGrants: [], staleUnusedGrants: [], blockedAttempts: 0, executions: 0 },
        permissions: { owners: 1, admins: 1, members: 0, status: "review", recommendations: [] },
        trend: { previousSnapshotAt: null, activityEventsDelta: null, usedCapabilitiesDelta: null, connectorUsedGrantsDelta: null },
        snapshotCount: 1
      }
    ]
  } as never,
  remote: [
    { workspace: { id: "w1" }, events: [{ eventType: "run-succeeded", createdAt: now }], report: { runs: 1, successes: 1, failures: 0, successRate: 1, providerUnits: 1, averageDurationMs: 10 } }
  ] as never,
  retention: [
    { workspace: { id: "w1" }, measuredBytes: 2048, budgetBreaches: [], recentRuns: [] },
    { workspace: { id: "w2" }, measuredBytes: 1024, budgetBreaches: ["sync-payloads"], recentRuns: [] }
  ] as never,
  delivery: [
    { workspace: { id: "w1" }, counts: { accepted: 1 }, recent: [{ eventType: "accepted", occurredAt: new Date("2026-10-11T15:00:00Z") }] },
    { workspace: { id: "w2" }, counts: { "transport-error": 1 }, recent: [] }
  ] as never
});

assert(summary.totals.workspaces === 2, "workspace total must come from authorized adoption evidence");
assert(summary.totals.activeWorkspaces === 1, "active workspace total must remain durable-evidence based");
assert(summary.totals.sync === 2 && summary.totals.remoteRuns === 1, "activity totals must aggregate existing evidence");
assert(summary.totals.measuredBytes === 3072, "storage footprint must aggregate retention evidence");
assert(summary.totals.attentionWorkspaces === 1, "attention must identify only workspaces with measured conditions");
assert(summary.workspaces[1]?.attention.includes("Profile mismatch"), "disabled capability use must surface");
assert(summary.workspaces[1]?.attention.includes("Permission review"), "permission review must surface");
assert(summary.workspaces[1]?.attention.includes("Storage budget"), "storage pressure must surface");
assert(summary.workspaces[1]?.attention.includes("Delivery transport"), "delivery transport failures must surface");
assert(summary.latestEvents[0]?.kind === "Remote", "latest event ordering must be timestamp based");

console.log("Build 043 command-center aggregation, attention rules and recent evidence ordering passed.");
