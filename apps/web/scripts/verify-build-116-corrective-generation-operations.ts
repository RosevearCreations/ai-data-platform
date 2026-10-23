import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  CORRECTIVE_GENERATION_AUDIT_SCHEMA_VERSION,
  buildCorrectiveGenerationAuditExport,
  correctiveGenerationAuditExportCsv,
  filterCorrectiveGenerationOperations,
  type CorrectiveGenerationOperationsModel
} from "../lib/corrective-generation-operations";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const cycleBase = {
  workspaceId: "11111111-1111-1111-1111-111111111111",
  workspaceName: "Workspace A",
  role: "owner" as const,
  caseId: "22222222-2222-2222-2222-222222222222",
  target: "rosie-dazzlers" as const,
  successorSourceId: "33333333-3333-3333-3333-333333333333",
  predecessorGenerationLineageId: "44444444-4444-4444-4444-444444444444",
  sourceRecurrenceKind: "generic-corrective-generation" as const,
  caseStatus: "open",
  predecessorSourceKind: "generic" as const,
  retriageId: "55555555-5555-5555-5555-555555555555",
  retriageStatus: "approved",
  planId: "66666666-6666-6666-6666-666666666666",
  planStatus: "approved",
  activationId: "77777777-7777-7777-7777-777777777777",
  activationStatus: "active",
  deliveryId: "88888888-8888-8888-8888-888888888888",
  deliveryStatus: "accepted",
  deliveryAttemptCount: 1,
  reconciliationId: "99999999-9999-9999-9999-999999999999",
  reconciliationStatus: "matched",
  reclosureId: null,
  regressionCheckId: null,
  regressionStatus: null,
  recurrenceId: null,
  nextSuccessorSourceId: null
};

const model: CorrectiveGenerationOperationsModel = {
  stateMachine: {
    cycles: [
      {
        ...cycleBase,
        generationNumber: 4,
        phase: "verified-awaiting-reclosure"
      },
      {
        ...cycleBase,
        successorSourceId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        generationNumber: 5,
        caseStatus: "closed",
        reclosureId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        regressionCheckId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
        regressionStatus: "stable",
        phase: "reclosed-stable"
      }
    ],
    violations: [
      {
        workspaceId: cycleBase.workspaceId,
        workspaceName: cycleBase.workspaceName,
        role: "owner",
        caseId: cycleBase.caseId,
        target: "rosie-dazzlers",
        generationNumber: 4,
        code: "example-critical",
        severity: "critical",
        detail: "Synthetic Build 116 critical finding."
      },
      {
        workspaceId: cycleBase.workspaceId,
        workspaceName: cycleBase.workspaceName,
        role: "owner",
        caseId: cycleBase.caseId,
        target: "rosie-dazzlers",
        generationNumber: 5,
        code: "example-warning",
        severity: "warning",
        detail: "Synthetic Build 116 warning."
      }
    ],
    summary: {
      cycles: 2,
      activeCycles: 1,
      completedCycles: 1,
      recurrentCycles: 0,
      criticalViolations: 1,
      warnings: 1
    }
  },
  timeline: [
    {
      workspaceId: cycleBase.workspaceId,
      workspaceName: cycleBase.workspaceName,
      role: "owner",
      caseId: cycleBase.caseId,
      target: "rosie-dazzlers",
      generationNumber: 4,
      eventType: "reconciliation-recorded",
      entityId: cycleBase.reconciliationId,
      occurredAt: "2026-10-23T12:00:00.000Z",
      status: "matched",
      title: "Delivery reconciliation recorded",
      detail: "matched=1",
      evidenceFingerprint: "verify-fingerprint"
    },
    {
      workspaceId: cycleBase.workspaceId,
      workspaceName: cycleBase.workspaceName,
      role: "owner",
      caseId: cycleBase.caseId,
      target: "rosie-dazzlers",
      generationNumber: 5,
      eventType: "regression-check-recorded",
      entityId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      occurredAt: "2026-10-23T13:00:00.000Z",
      status: "stable",
      title: "Post-reclosure regression check",
      detail: "stable",
      evidenceFingerprint: "stable-fingerprint"
    }
  ],
  workspaces: [
    {
      workspaceId: cycleBase.workspaceId,
      workspaceName: cycleBase.workspaceName
    }
  ],
  cases: [
    {
      workspaceId: cycleBase.workspaceId,
      workspaceName: cycleBase.workspaceName,
      caseId: cycleBase.caseId,
      target: "rosie-dazzlers",
      latestGenerationNumber: 5,
      latestPhase: "reclosed-stable",
      criticalViolations: 1,
      warnings: 1
    }
  ],
  summary: {
    workspaces: 1,
    cases: 1,
    timelineEvents: 2,
    cycles: 2,
    activeCycles: 1,
    completedCycles: 1,
    recurrentCycles: 0,
    criticalViolations: 1,
    warnings: 1
  }
};

const filtered = filterCorrectiveGenerationOperations(model, {
  generationNumber: 5,
  phase: "reclosed-stable",
  severity: "warning",
  eventType: "regression-check-recorded"
});
assert(filtered.cycles.length === 1, "Build 116 must filter cycles by generation and phase.");
assert(filtered.violations.length === 1, "Build 116 must filter findings by severity.");
assert(filtered.timeline.length === 1, "Build 116 must filter timeline by event type.");

const first = buildCorrectiveGenerationAuditExport(
  model,
  { generationNumber: 5, phase: "reclosed-stable" },
  "2026-10-23T13:00:00.000Z"
);
const second = buildCorrectiveGenerationAuditExport(
  model,
  { generationNumber: 5, phase: "reclosed-stable" },
  "2026-10-23T14:00:00.000Z"
);

assert(
  first.schemaVersion === CORRECTIVE_GENERATION_AUDIT_SCHEMA_VERSION,
  "Build 116 audit export must carry the canonical schema version."
);
assert(
  first.digest.value === second.digest.value,
  "Build 116 audit digest must be deterministic and independent of export timestamp."
);
assert(first.summary.cycles === 1, "Build 116 audit summary must reflect filtered cycles.");
assert(first.summary.timelineEvents === 1, "Build 116 audit summary must reflect filtered timeline.");
assert(first.summary.warnings === 1, "Build 116 audit summary must reflect filtered findings.");
assert(first.digest.value.length === 64, "Build 116 SHA-256 audit digest must be 64 hex characters.");

const csv = correctiveGenerationAuditExportCsv(first);
assert(csv.includes("audit_schema_version"), "Build 116 CSV must include schema-version metadata.");
assert(csv.includes(first.schemaVersion), "Build 116 CSV must contain the schema version.");
assert(csv.includes(first.generatedAt), "Build 116 CSV must contain the export timestamp.");
assert(csv.includes(first.digest.value), "Build 116 CSV must contain the audit digest.");

const servicePath = fileURLToPath(
  new URL("../lib/corrective-generation-operations.ts", import.meta.url)
);
const apiPath = fileURLToPath(
  new URL(
    "../app/api/approved-data/reconciliation/corrective-generation-operations/route.ts",
    import.meta.url
  )
);
const exportPath = fileURLToPath(
  new URL(
    "../app/api/approved-data/reconciliation/corrective-generation-operations/export/route.ts",
    import.meta.url
  )
);
const service = readFileSync(servicePath, "utf8");
const api = readFileSync(apiPath, "utf8");
const exportRoute = readFileSync(exportPath, "utf8");

for (const required of [
  "workspace_corrective_generation_registry",
  "workspace_cg_legacy_terminal_events",
  "workspace_corrective_generation_successors",
  "workspace_corrective_generation_retriage",
  "workspace_corrective_generation_plans",
  "workspace_unified_cg_delivery_activations",
  "workspace_unified_cg_live_deliveries",
  "workspace_unified_cg_delivery_reconciliations",
  "workspace_reconciliation_unified_cg_reclosures",
  "workspace_post_unified_cg_reclosure_checks",
  "workspace_reconciliation_unified_cg_recurrences"
]) {
  assert(service.includes(required), "Build 116 timeline is missing source table " + required + ".");
}

assert(
  !/\binsert\s+into\s+app\./i.test(service) &&
    !/\bupdate\s+app\./i.test(service) &&
    !/\bdelete\s+from\s+app\./i.test(service),
  "Build 116 operations service must remain read-only."
);
assert(
  !api.includes("export async function POST") &&
    !api.includes("export async function PUT") &&
    !api.includes("export async function PATCH") &&
    !api.includes("export async function DELETE"),
  "Build 116 operations API must expose GET only."
);
assert(
  !exportRoute.includes("export async function POST") &&
    exportRoute.includes("content-disposition") &&
    exportRoute.includes("x-audit-digest") &&
    exportRoute.includes("text/csv") &&
    exportRoute.includes("application/json"),
  "Build 116 export API must be read-only and expose JSON/CSV audit metadata."
);

console.log("Build 116 corrective-generation operations console verification passed.");
