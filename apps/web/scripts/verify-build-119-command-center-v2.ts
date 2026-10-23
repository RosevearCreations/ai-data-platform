import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import { buildCommandCenterSummary } from "../lib/command-center";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {\nconst now = new Date("2026-10-23T18:00:00.000Z");
const summary = buildCommandCenterSummary({
  adoption: {
    generatedAt: now.toISOString(),
    totals: { workspaces: 1, activeWorkspaces: 1 },
    profiles: [],
    recommendations: [],
    workspaces: [{
      workspaceId: "w1", workspaceName: "Rosie", profileKey: "detail", profileName: "Detailing",
      role: "owner", activityEvents: 5,
      activity: { sync: 1, sourcePolicySources: 1, scheduledJobs: 1, scheduledAttempts: 1, remoteJobs: 1, remoteRuns: 1, barcodeCaptures: 0, integrationEvents: 1, connectorExecutions: 0 },
      capabilities: { enabled: [], used: [], unusedEnabled: [], highRiskUnused: [], disabledUsed: [] },
      connectors: { installations: 0, enabledInstallations: 0, grants: [], usedGrants: [], unusedGrants: [], staleUnusedGrants: [], blockedAttempts: 0, executions: 0 },
      permissions: { owners: 1, admins: 0, members: 0, status: "healthy", recommendations: [] },
      trend: { previousSnapshotAt: null, activityEventsDelta: null, usedCapabilitiesDelta: null, connectorUsedGrantsDelta: null },
      snapshotCount: 1
    }]
  } as never,
  remote: [{ workspace: { id: "w1" }, events: [{ eventType: "run-failed", createdAt: now }], report: { runs: 1, successes: 0, failures: 1, successRate: 0, providerUnits: 1, averageDurationMs: 10 } }] as never,
  retention: [{ workspace: { id: "w1" }, measuredBytes: 2048, budgetBreaches: [], recentRuns: [] }] as never,
  delivery: [{ workspace: { id: "w1" }, counts: { accepted: 1 }, recent: [{ eventType: "accepted", occurredAt: new Date("2026-10-23T17:00:00Z") }] }] as never,
  collectionProjects: [{
    workspaceId: "w1", workspaceName: "Rosie", workspaceProfile: "detail", role: "owner", canManage: true,
    projectId: "p1", name: "Competitor scan", purpose: "", status: "active", cadence: "", ownerLabel: "", notes: "",
    readiness: "blocked", sources: [{
      sourceId: "s1", displayName: "Source", sourceUrl: "https://example.com", sourceOrigin: "https://example.com",
      collectionMethod: "public-webpage", sourcePolicyId: "", savedScraperId: "", cadence: "", status: "active",
      notes: "", readiness: "blocked", blockers: ["policy"], policy: { linked: false, approved: false, current: false, originMatches: false, methodMatches: false, revision: 0, fingerprint: "", dataSensitivity: "", robotsDecision: "", publicOrAuthorized: false, termsReviewed: false, noAccessControlBypass: false },
      scraper: { requested: false, present: false, originMatches: false }, createdAt: new Date("2026-10-22T12:00:00Z"), updatedAt: new Date("2026-10-23T16:00:00Z")
    }], createdAt: new Date("2026-10-22T12:00:00Z"), updatedAt: new Date("2026-10-23T16:00:00Z")
  }] as never,
  corrective: {
    cycles: [],
    violations: [{ workspaceId: "w1", workspaceName: "Rosie", role: "owner", caseId: "c1", target: "devilndove", generationNumber: 3, code: "test", severity: "critical", detail: "test" }],
    summary: { cycles: 1, activeCycles: 1, completedCycles: 0, recurrentCycles: 0, criticalViolations: 1, warnings: 0 }
  } as never
});

assert(summary.dashboard.overallHealth === "critical", "critical evidence must set overall dashboard health");
assert(summary.dashboard.attentionQueue[0]?.severity === "critical", "attention queue must prioritize critical items");
assert(summary.dashboard.attentionQueue.some((item) => item.id === "collection:blocked"), "collection blockers must enter attention queue");
assert(summary.dashboard.attentionQueue.some((item) => item.id === "corrective:critical"), "corrective invariant findings must enter attention queue");
assert(summary.dashboard.quickActions.some((item) => item.href === "/data-review"), "quick actions must route to governed workflows");
assert(summary.dashboard.healthSignals.length >= 6, "dashboard must expose the core operational health signals");
assert(summary.dashboard.recentWork[0]?.kind === "Remote", "recent work must remain timestamp ordered across evidence kinds");
assert(summary.dashboard.collection.blockedProjects === 1, "collection summary must preserve blocked-project evidence");
assert(summary.dashboard.corrective.criticalViolations === 1, "corrective summary must preserve invariant counts");

const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const command = await readFile(new URL("../lib/command-center.ts", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const doc = await readFile(new URL("../../../docs/BUILD_119_COMMAND_CENTER_V2.md", import.meta.url), "utf8");

for (const heading of ["Needs Attention", "Quick Actions", "Operational Pulse", "Recent Work", "Workspaces", "Application Modules"]) {
  assert(home.includes(heading), "Build 119 Operator Home section missing: " + heading);
}
for (const topic of ["command-center-v2", "dashboard-attention", "dashboard-quick-actions", "dashboard-health", "dashboard-recent-work", "dashboard-workspaces"] as const) {
  assert(topic in HELP_TOPICS, "Build 119 help topic missing: " + topic);
}
assert(command.includes("listCollectionProjectsForUser") && command.includes("listCorrectiveGenerationStateMachineForUser"), "Build 119 must aggregate collection and corrective evidence.");
assert(command.includes("attentionQueue") && command.includes("healthSignals") && command.includes("recentWork"), "Build 119 dashboard model is incomplete.");
assert(css.includes(".commandV2PriorityGrid") && css.includes(".commandHealthGrid") && css.includes(".commandRecentWorkGrid"), "Build 119 dashboard styles are incomplete.");
assert(doc.includes("no new mutation endpoint") && doc.includes("Build 120"), "Build 119 documentation must preserve safety boundary and next roadmap item.");

console.log("Build 119 functional operator dashboard verification passed.");\n}\n\nvoid main();
