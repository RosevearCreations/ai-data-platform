import type { HardeningAuditModel } from "./hardening-audit";
import type { OperatorAttentionModel } from "./operator-attention";
import type {
  ProductionLearningEvidence,
  ProductionLearningFinding,
  ProductionLearningWorkspaceEvidence
} from "./production-learning";
import type { ReliabilityDashboardModel } from "./system-reliability-contract";

export type BaselineDisposition = "active" | "validated" | "historical";
export type BaselineSource =
  | "production-learning"
  | "renewal-gap"
  | "hardening"
  | "reliability"
  | "attention";

export type ProductionEvidenceBaselineItem = {
  id: string;
  source: BaselineSource;
  disposition: BaselineDisposition;
  status: string;
  title: string;
  evidence: string;
  action: string;
  owner: "platform" | "workspace-owner" | "operations" | "system";
  href: string;
  targetBuild: 274 | 275 | 276 | 277 | 278 | 279 | null;
};

export type ProductionEvidenceExitCriterion = {
  build: 274 | 275 | 276 | 277 | 278 | 279;
  title: string;
  criterion: string;
  currentEvidence: string;
  met: boolean;
  href: string;
};

export type ProductionEvidenceBaselineModel = {
  schema: "ai-data-platform.production-evidence-baseline.v1";
  generatedAt: string;
  batch: "273-280";
  state: "ready" | "attention";
  counts: {
    total: number;
    active: number;
    validated: number;
    historical: number;
    criticalReliability: number;
    attentionItems: number;
  };
  items: ProductionEvidenceBaselineItem[];
  exitCriteria: ProductionEvidenceExitCriterion[];
};

export type ProductionEvidenceBaselineInput = {
  findings: ProductionLearningFinding[];
  renewalGaps: string[];
  adoption: ProductionLearningEvidence["adoption"];
  trend: ProductionLearningEvidence["trend"];
  workspaces: ProductionLearningWorkspaceEvidence[];
  hardeningItems: HardeningAuditModel["items"];
  reliabilitySignals: ReliabilityDashboardModel["signals"];
  reliabilityTotals: ReliabilityDashboardModel["totals"];
  attentionItems: OperatorAttentionModel["items"];
  attentionCounts: OperatorAttentionModel["counts"];
  generatedAt?: string;
};

const CURRENT_FINDING_TARGETS: Record<string, 274 | 275 | 276 | 277 | 278 | 279> = {
  "barcode-adoption": 274,
  "first-evidence-adoption": 274,
  "remote-cost-reliability": 275,
  "source-policy-health": 275,
  "integration-consumer-readiness": 276,
  "storage-retention": 277,
  "connector-readiness": 278,
  "adoption-permission-outcomes": 278,
  "permission-health": 278,
  "sync-outcome-telemetry": 279,
  "repair-outcome-telemetry": 279,
  "production-learning-renewal": 279
};

function targetBuildForText(text: string): 274 | 275 | 276 | 277 | 278 | 279 {
  const value = text.toLowerCase();
  if (value.includes("provider") || value.includes("browserless") || value.includes("source polic")) return 275;
  if (value.includes("integration") || value.includes("consumer") || value.includes("delivery") || value.includes("acknowledg")) return 276;
  if (value.includes("retention") || value.includes("storage") || value.includes("archive") || value.includes("delete")) return 277;
  if (value.includes("permission") || value.includes("grant") || value.includes("connector") || value.includes("privilege") || value.includes("ownerless")) return 278;
  if (value.includes("adoption") || value.includes("barcode") || value.includes("review") || value.includes("approval") || value.includes("collection")) return 274;
  return 279;
}

function targetBuildForAttention(category: string): 274 | 275 | 276 | 277 | 278 | 279 {
  if (category === "integration") return 276;
  if (category === "retention") return 277;
  if (category === "connectors" || category === "governance") return 278;
  if (category === "collection" || category === "review" || category === "approval") return 274;
  return 279;
}

function targetBuildForReliability(id: string): 274 | 275 | 276 | 277 | 278 | 279 {
  if (id === "remote") return 275;
  if (id === "integration") return 276;
  if (id === "connectors") return 278;
  if (id === "collection" || id === "queues") return 274;
  return 279;
}

function sum(
  workspaces: ProductionLearningWorkspaceEvidence[],
  selector: (workspace: ProductionLearningWorkspaceEvidence) => number
) {
  return workspaces.reduce((total, workspace) => total + selector(workspace), 0);
}

function buildExitCriteria(input: ProductionEvidenceBaselineInput): ProductionEvidenceExitCriterion[] {
  const providerRuns = sum(input.workspaces, (workspace) => workspace.remote.providerRuns);
  const providerUnits = sum(input.workspaces, (workspace) => workspace.remote.providerUnits);
  const approvedPublicSources = sum(input.workspaces, (workspace) => workspace.remote.approvedPublicSources);
  const conformanceAccepted = sum(input.workspaces, (workspace) => workspace.integrations.conformanceAccepted);
  const liveAccepted = sum(input.workspaces, (workspace) => workspace.integrations.liveAccepted);
  const deliveryRejected = sum(input.workspaces, (workspace) => workspace.integrations.deliveryRejected);
  const transportErrors = sum(input.workspaces, (workspace) => workspace.integrations.transportErrors);
  const retentionBreaches = sum(input.workspaces, (workspace) => workspace.retention.budgetBreaches);
  const retentionFailedRuns = sum(input.workspaces, (workspace) => workspace.retention.failedRuns);
  const deleteEligible = sum(input.workspaces, (workspace) => workspace.retention.deleteEligibleRows);
  const ownerlessWorkspaces = input.workspaces.filter((workspace) => workspace.security.owners === 0).length;

  return [
    {
      build: 274,
      title: "Guided Adoption Runbook & First-Evidence Completion",
      criterion: "At least one authorized workspace has durable real operating activity; zero-activity workspaces retain an explicit first-evidence next action without synthetic records.",
      currentEvidence: `${input.adoption.activeWorkspaces}/${input.workspaces.length} workspace(s) active; ${input.adoption.noActivityWorkspaces} at measured zero.`,
      met: input.adoption.activeWorkspaces > 0,
      href: "/first-evidence"
    },
    {
      build: 275,
      title: "Provider Pilot Baseline, Cost, Latency & Failure Evidence",
      criterion: "At least one bounded terminal provider run exists with units and outcome evidence, or the missing authorization/source-policy prerequisite remains explicitly blocked rather than simulated.",
      currentEvidence: `${providerRuns} provider run(s); ${providerUnits} unit(s); ${approvedPublicSources} approved public source(s).`,
      met: providerRuns > 0,
      href: "/remote-execution"
    },
    {
      build: 276,
      title: "Consumer Acceptance, Replay & Delivery Receipt Reconciliation",
      criterion: "A supported consumer has durable acknowledgement evidence, with rejection/transport outcomes retained and no conformance-only result mislabeled as live acceptance.",
      currentEvidence: `${conformanceAccepted} conformance accept(s); ${liveAccepted} live acknowledgement(s); ${deliveryRejected} rejection(s); ${transportErrors} transport error(s).`,
      met: liveAccepted > 0,
      href: "/integration-delivery"
    },
    {
      build: 277,
      title: "Retention Cleanup Readiness & Storage Budget Reconciliation",
      criterion: "No unresolved retention budget breach or failed cleanup run remains; any delete-eligible data stays approval-gated until an authorized operator acts.",
      currentEvidence: `${retentionBreaches} budget breach(es); ${retentionFailedRuns} failed cleanup run(s); ${deleteEligible} delete-eligible row(s).`,
      met: retentionBreaches === 0 && retentionFailedRuns === 0,
      href: "/retention"
    },
    {
      build: 278,
      title: "Least-Privilege Adoption, Stale Grants & Capability Cleanup Review",
      criterion: "No ownerless workspace, disabled-but-used capability, stale connector grant, or unresolved permission-review workspace remains without an explicit owner disposition.",
      currentEvidence: `${ownerlessWorkspaces} ownerless workspace(s); ${input.adoption.disabledUsedCapabilities} disabled-used capability slot(s); ${input.adoption.connectorStaleGrants} stale grant(s); ${input.adoption.permissionReviewWorkspaces} permission-review workspace(s).`,
      met:
        ownerlessWorkspaces === 0 &&
        input.adoption.disabledUsedCapabilities === 0 &&
        input.adoption.connectorStaleGrants === 0 &&
        input.adoption.permissionReviewWorkspaces === 0,
      href: "/adoption"
    },
    {
      build: 279,
      title: "Reliability Trend Validation, Failure Patterns & Recovery Readiness",
      criterion: "No unclassified critical reliability condition remains and a durable trend baseline exists for comparison; recurring failures retain explicit recovery actions.",
      currentEvidence: `${input.reliabilityTotals.critical} critical reliability signal(s); ${input.reliabilityTotals.exceptions} exception(s); ${input.trend.baselineSnapshots} trend baseline snapshot(s).`,
      met: input.reliabilityTotals.critical === 0 && input.trend.baselineSnapshots > 0,
      href: "/system-reliability"
    }
  ];
}

export function buildProductionEvidenceBaseline(
  input: ProductionEvidenceBaselineInput
): ProductionEvidenceBaselineModel {
  const items: ProductionEvidenceBaselineItem[] = [];

  for (const finding of input.findings) {
    const targetBuild = CURRENT_FINDING_TARGETS[finding.key] ?? null;
    const disposition: BaselineDisposition =
      targetBuild === null
        ? "historical"
        : finding.status === "healthy"
          ? "validated"
          : "active";

    items.push({
      id: "learning:" + finding.key,
      source: "production-learning",
      disposition,
      status: finding.status,
      title: finding.title,
      evidence: finding.evidence,
      action: disposition === "historical"
        ? "Retain as historical context only unless fresh measured evidence reactivates this condition."
        : finding.action,
      owner: finding.owner,
      href: "/production-learning",
      targetBuild
    });
  }

  for (const [index, gap] of input.renewalGaps.entries()) {
    items.push({
      id: "renewal:" + String(index),
      source: "renewal-gap",
      disposition: "active",
      status: "gap",
      title: gap,
      evidence: "Production Learning IV renewal evidence gap.",
      action: "Resolve with real operating evidence or retain the explicit blocker; do not synthesize a successful sample.",
      owner: "operations",
      href: "/production-learning",
      targetBuild: targetBuildForText(gap)
    });
  }

  for (const item of input.hardeningItems) {
    items.push({
      id: "hardening:" + item.key,
      source: "hardening",
      disposition: item.status === "hardened" ? "validated" : "active",
      status: item.status,
      title: item.label,
      evidence: item.detail + " Evidence: " + item.evidence + ".",
      action: item.status === "hardened"
        ? "Keep this hardening control in the regression baseline."
        : "Review the hardening gap before reliability closure.",
      owner: "platform",
      href: "/hardening",
      targetBuild: item.status === "hardened" ? null : 279
    });
  }

  for (const signal of input.reliabilitySignals) {
    const active = signal.state === "critical" || signal.state === "attention";
    items.push({
      id: "reliability:" + signal.id,
      source: "reliability",
      disposition: active ? "active" : "validated",
      status: signal.state,
      title: signal.label,
      evidence: signal.value + " · " + signal.detail,
      action: active
        ? "Follow the measured reliability condition to its source and retain recovery evidence."
        : "Keep this signal in the measured reliability baseline.",
      owner: "system",
      href: signal.href,
      targetBuild: active ? targetBuildForReliability(signal.id) : null
    });
  }

  for (const item of input.attentionItems) {
    items.push({
      id: "attention:" + item.id,
      source: "attention",
      disposition: "active",
      status: item.severity,
      title: item.title,
      evidence: item.detail + (item.ageDays === null ? "" : " · age " + String(item.ageDays) + " day(s)"),
      action: item.actionLabel,
      owner: "operations",
      href: item.href,
      targetBuild: targetBuildForAttention(item.category)
    });
  }

  const counts = {
    total: items.length,
    active: items.filter((item) => item.disposition === "active").length,
    validated: items.filter((item) => item.disposition === "validated").length,
    historical: items.filter((item) => item.disposition === "historical").length,
    criticalReliability: input.reliabilityTotals.critical,
    attentionItems: input.attentionCounts.total
  };

  return {
    schema: "ai-data-platform.production-evidence-baseline.v1",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    batch: "273-280",
    state: counts.active > 0 ? "attention" : "ready",
    counts,
    items,
    exitCriteria: buildExitCriteria(input)
  };
}
