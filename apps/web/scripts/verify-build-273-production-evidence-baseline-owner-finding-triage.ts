import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildProductionEvidenceBaseline } from "../lib/production-evidence-baseline";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 273 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const baseline = buildProductionEvidenceBaseline({
    findings: [
      {
        key: "first-evidence-adoption",
        category: "Guided production adoption",
        status: "watch",
        title: "First evidence required",
        evidence: "0/1 workspaces active.",
        action: "Use one real workflow.",
        owner: "operations"
      },
      {
        key: "old-build-only",
        category: "Build 040",
        status: "watch",
        title: "Historical gate",
        evidence: "Legacy context.",
        action: "Old action.",
        owner: "operations"
      },
      {
        key: "storage-retention",
        category: "Storage & retention",
        status: "healthy",
        title: "Retention healthy",
        evidence: "No breach.",
        action: "Monitor.",
        owner: "operations"
      }
    ],
    renewalGaps: ["The Browserless production cost/reliability baseline is still unmeasured."],
    adoption: {
      reviewSnapshots: 1,
      activeWorkspaces: 0,
      noActivityWorkspaces: 1,
      enabledCapabilities: 2,
      usedCapabilities: 0,
      unusedEnabledCapabilities: 2,
      highRiskUnusedCapabilities: 0,
      disabledUsedCapabilities: 0,
      connectorGrants: 0,
      connectorUsedGrants: 0,
      connectorUnusedGrants: 0,
      connectorStaleGrants: 0,
      permissionReviewWorkspaces: 0,
      barcodeWorkspaces: 0,
      scheduledWorkspaces: 0,
      remoteWorkspaces: 0,
      integrationWorkspaces: 0
    },
    trend: {
      cycleSnapshots: 1,
      baselineSnapshots: 1,
      baselineGeneratedAt: "2026-11-01T00:00:00.000Z",
      baselineSyncEvents: 0,
      baselineSyncConflicts: 0,
      baselineRepairChecks: 0,
      baselineRepairHealthy: 0,
      baselineProviderRuns: 0,
      baselineProviderUnits: 0,
      baselineIntegrationLiveAccepted: 0,
      baselineRetentionBudgetBreaches: 0,
      baselineAdoptionActivityEvents: 0,
      baselineAdoptionUsedCapabilities: 0,
      baselineAdoptionHighRiskUnused: 0,
      baselineConnectorUnusedGrants: 0
    },
    workspaces: [],
    hardeningItems: [
      {
        key: "keyboard-focus",
        area: "Accessibility",
        label: "Keyboard",
        status: "hardened",
        detail: "Covered.",
        evidence: "Shell"
      }
    ],
    reliabilitySignals: [
      {
        id: "database",
        label: "Database",
        state: "healthy",
        value: "Serving",
        detail: "RLS probe passed.",
        href: "/audit-evidence"
      }
    ],
    reliabilityTotals: {
      healthy: 1,
      attention: 0,
      critical: 0,
      inactive: 0,
      exceptions: 0
    },
    attentionItems: [],
    attentionCounts: {
      total: 0,
      critical: 0,
      attention: 0,
      info: 0,
      workspaces: 0,
      byCategory: {
        governance: 0,
        collection: 0,
        connectors: 0,
        review: 0,
        approval: 0,
        integration: 0,
        retention: 0,
        corrective: 0
      }
    },
    generatedAt: "2026-11-02T12:00:00.000Z"
  });

  ensure(baseline.schema === "ai-data-platform.production-evidence-baseline.v1", "schema");
  ensure(baseline.batch === "273-280", "batch");
  ensure(baseline.items.some((item) => item.id === "learning:first-evidence-adoption" && item.disposition === "active" && item.targetBuild === 274), "active adoption triage");
  ensure(baseline.items.some((item) => item.id === "learning:old-build-only" && item.disposition === "historical" && item.targetBuild === null), "historical separation");
  ensure(baseline.items.some((item) => item.id === "learning:storage-retention" && item.disposition === "validated"), "healthy validation");
  ensure(baseline.items.some((item) => item.source === "renewal-gap" && item.targetBuild === 275), "renewal gap routing");
  ensure(baseline.exitCriteria.length === 6, "six exit criteria");
  ensure(baseline.exitCriteria.map((item) => item.build).join(",") === "274,275,276,277,278,279", "exit build range");

  const [lib, page, owner, nav, pkg, doc, statusRaw, queue] = await Promise.all([
    source("lib/production-evidence-baseline.ts"),
    source("app/evidence-baseline/page.tsx"),
    source("app/owner-acceptance/page.tsx"),
    source("lib/application-navigation.ts"),
    source("package.json"),
    source("../../docs/BUILD_273_PRODUCTION_EVIDENCE_BASELINE_OWNER_FINDING_TRIAGE.md"),
    source("../../docs/integration/ql266-ai-data-platform-build273-review.json"),
    source("../../docs/NEXT_BUILDS_273_280.md")
  ]);

  for (const token of ["production-learning", "renewal-gap", "hardening", "reliability", "attention"]) {
    ensure(lib.includes('"' + token + '"'), "source " + token);
  }
  ensure(page.includes("Production Evidence Baseline &amp; Owner Finding Triage"), "baseline page");
  ensure(page.includes("Measurable exit criteria"), "exit criteria UI");
  ensure(page.includes("Historical findings"), "historical UI");
  ensure(owner.includes('href="/evidence-baseline"'), "owner acceptance handoff");
  ensure(!nav.includes('href: "/evidence-baseline"'), "historical evidence baseline removed from active navigation");
  ensure(pkg.includes("verify-build-273-production-evidence-baseline-owner-finding-triage.ts"), "verifier registered");

  const status = JSON.parse(statusRaw);
  ensure(status.build === 273, "status build");
  ensure(status.baseline.second_evidence_store === false && status.baseline.synthetic_production_activity === false, "evidence boundary");
  ensure(status.authorization.rls_preserved === true && status.authorization.external_gate_bypass === false, "authorization boundary");
  ensure(status.ql266_status === "UNDER_REVIEW" && status.connection_state === "DISCONNECTED", "QL-266 boundary");
  ensure(status.new_ql266_test_started === false, "no QL-266 restart");
  ensure(status.next_build === 274, "next build");

  ensure(doc.includes("active") && doc.includes("validated") && doc.includes("historical"), "triage documentation");
  ensure(doc.includes("Build 274 — Guided Adoption Runbook & First-Evidence Completion"), "next build documentation");
  ensure(queue.includes("Build 273 — Production Evidence Baseline & Owner Finding Triage"), "queue Build 273");
  ensure(queue.includes("Build 274 — Guided Adoption Runbook & First-Evidence Completion"), "queue Build 274");

  console.log("Build 273 production evidence baseline and owner finding triage verification passed.");
}

void main();
