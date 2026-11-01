import { listApprovedDatasetPublishingForUser } from "./approved-dataset-publishing";
import { listCollectionRunConsoleForUser } from "./collection-runs";
import { buildCommandCenterHome } from "./command-center";
import { listConnectorOverviewForUser } from "./connector-database";
import { listDataReviewWorkbenchForUser } from "./data-review-workbench";
import { listIntegrationDeliveryOverviewForUser } from "./integration-delivery-database";
import { listReconciliationExceptionTriageForUser } from "./reconciliation-exception-triage";
import { listRetentionOverviewForUser } from "./retention-database";

export const OPERATOR_ATTENTION_CATEGORIES = [
  "all",
  "governance",
  "collection",
  "connectors",
  "review",
  "approval",
  "integration",
  "retention",
  "corrective"
] as const;

export const OPERATOR_ATTENTION_SEVERITIES = [
  "all",
  "critical",
  "attention",
  "info"
] as const;

export type OperatorAttentionCategory =
  (typeof OPERATOR_ATTENTION_CATEGORIES)[number];
export type OperatorAttentionSeverity =
  (typeof OPERATOR_ATTENTION_SEVERITIES)[number];

type ConcreteCategory = Exclude<OperatorAttentionCategory, "all">;
type ConcreteSeverity = Exclude<OperatorAttentionSeverity, "all">;

export interface OperatorAttentionItem {
  id: string;
  category: ConcreteCategory;
  severity: ConcreteSeverity;
  workspaceId: string | null;
  workspaceName: string;
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
  observedAt: string | null;
  ageDays: number | null;
  statusLabel: string;
}

export interface OperatorAttentionFilters {
  category: OperatorAttentionCategory;
  severity: OperatorAttentionSeverity;
  workspace: string;
  query: string;
}

export interface OperatorAttentionModel {
  generatedAt: string;
  staleApprovalDays: number;
  items: OperatorAttentionItem[];
  filteredItems: OperatorAttentionItem[];
  counts: {
    total: number;
    critical: number;
    attention: number;
    info: number;
    workspaces: number;
    byCategory: Record<ConcreteCategory, number>;
  };
  workspaces: Array<{ id: string; name: string }>;
  filters: OperatorAttentionFilters;
}

const STALE_APPROVAL_DAYS = 14;

const severityRank: Record<ConcreteSeverity, number> = {
  critical: 0,
  attention: 1,
  info: 2
};

function clean(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

export function normalizeOperatorAttentionFilters(input: {
  category?: unknown;
  severity?: unknown;
  workspace?: unknown;
  query?: unknown;
}): OperatorAttentionFilters {
  const category = OPERATOR_ATTENTION_CATEGORIES.includes(
    input.category as OperatorAttentionCategory
  )
    ? (input.category as OperatorAttentionCategory)
    : "all";
  const severity = OPERATOR_ATTENTION_SEVERITIES.includes(
    input.severity as OperatorAttentionSeverity
  )
    ? (input.severity as OperatorAttentionSeverity)
    : "all";
  return {
    category,
    severity,
    workspace: clean(input.workspace, 80),
    query: clean(input.query, 120).toLowerCase()
  };
}

export function operatorAttentionAgeDays(
  value: string | Date | null | undefined,
  now = new Date()
) {
  if (!value) return null;
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 86_400_000));
}

export function isStaleOperatorApproval(
  approvedAt: string,
  now = new Date(),
  thresholdDays = STALE_APPROVAL_DAYS
) {
  const age = operatorAttentionAgeDays(approvedAt, now);
  return age !== null && age >= thresholdDays;
}

function attentionItem(input: Omit<OperatorAttentionItem, "ageDays">, now: Date) {
  return {
    ...input,
    ageDays: operatorAttentionAgeDays(input.observedAt, now)
  } satisfies OperatorAttentionItem;
}

function categoryForCommandHref(href: string): ConcreteCategory {
  if (href.startsWith("/adoption") || href.startsWith("/workspace-profiles")) {
    return "governance";
  }
  return "corrective";
}

function latestByKey<T>(
  values: T[],
  key: (value: T) => string
) {
  const map = new Map<string, T>();
  for (const value of values) {
    const k = key(value);
    if (!map.has(k)) map.set(k, value);
  }
  return [...map.values()];
}

export async function buildOperatorAttentionCenter(
  userId: string,
  filterInput: {
    category?: unknown;
    severity?: unknown;
    workspace?: unknown;
    query?: unknown;
  } = {},
  now = new Date()
): Promise<OperatorAttentionModel> {
  const [
    commandCenter,
    collectionRuns,
    connectors,
    reviews,
    approved,
    delivery,
    retention,
    triage
  ] = await Promise.all([
    buildCommandCenterHome(userId),
    listCollectionRunConsoleForUser(userId),
    listConnectorOverviewForUser(userId),
    listDataReviewWorkbenchForUser(userId),
    listApprovedDatasetPublishingForUser(userId),
    listIntegrationDeliveryOverviewForUser(userId),
    listRetentionOverviewForUser(userId),
    listReconciliationExceptionTriageForUser(userId)
  ]);

  const items: OperatorAttentionItem[] = [];

  for (const source of commandCenter.dashboard.attentionQueue) {
    if (
      source.href === "/collection-projects" ||
      source.href === "/remote-execution" ||
      source.href === "/integration-delivery" ||
      source.href === "/retention"
    ) {
      continue;
    }
    items.push(attentionItem({
      id: "command:" + source.id,
      category: categoryForCommandHref(source.href),
      severity: source.severity,
      workspaceId: source.workspaceId,
      workspaceName: source.workspaceName,
      title: source.title,
      detail: source.detail,
      href: source.href,
      actionLabel: source.actionLabel,
      observedAt: null,
      statusLabel: source.severity === "critical" ? "Immediate review" : "Needs review"
    }, now));
  }

  for (const source of collectionRuns.sources) {
    if (source.readiness !== "ready") {
      items.push(attentionItem({
        id: "collection-readiness:" + source.workspaceId + ":" + source.sourceId,
        category: "collection",
        severity: "attention",
        workspaceId: source.workspaceId,
        workspaceName: source.workspaceName,
        title: source.displayName + " has collection blockers",
        detail: [...source.local.blockers, ...source.remote.blockers].slice(0, 3).join(" · ") ||
          (source.readiness + " collection readiness"),
        href: "/collection-runs",
        actionLabel: "Review collection source",
        observedAt: source.local.updatedAt,
        statusLabel: source.readiness === "blocked" ? "Blocked" : "Incomplete"
      }, now));
    }

    const latestLocal = source.local.attempts[0] ?? null;
    if (
      latestLocal &&
      (latestLocal.status === "failed" || latestLocal.status === "timed-out")
    ) {
      items.push(attentionItem({
        id: "collection-local-failure:" + source.workspaceId + ":" + source.sourceId,
        category: "collection",
        severity: "critical",
        workspaceId: source.workspaceId,
        workspaceName: source.workspaceName,
        title: source.displayName + " local collection failed",
        detail: latestLocal.error || "The latest local collection attempt did not complete successfully.",
        href: "/collection-runs",
        actionLabel: "Inspect failed run",
        observedAt: latestLocal.finishedAt ?? latestLocal.startedAt,
        statusLabel: latestLocal.status
      }, now));
    }

    const latestRemote = source.remote.attempts[0] ?? null;
    if (
      latestRemote &&
      ["failed", "timed-out", "cancelled"].includes(latestRemote.status)
    ) {
      items.push(attentionItem({
        id: "collection-remote-failure:" + source.workspaceId + ":" + source.sourceId,
        category: "collection",
        severity: latestRemote.status === "cancelled" ? "attention" : "critical",
        workspaceId: source.workspaceId,
        workspaceName: source.workspaceName,
        title: source.displayName + " remote collection needs follow-up",
        detail: latestRemote.error || "The latest remote collection attempt did not complete successfully.",
        href: "/collection-runs",
        actionLabel: "Inspect remote run",
        observedAt: latestRemote.finishedAt ?? latestRemote.startedAt,
        statusLabel: latestRemote.status
      }, now));
    }
  }

  const manifestByKey = new Map(
    connectors.manifests.map((manifest) => [manifest.key, manifest])
  );
  for (const entry of connectors.workspaces) {
    const latestAudits = latestByKey(entry.audit, (audit) => audit.connectorKey);
    for (const installation of entry.installations) {
      const manifest = manifestByKey.get(installation.connectorKey);
      if (
        !manifest ||
        installation.manifestVersion !== manifest.manifestVersion ||
        installation.connectorVersion !== manifest.version
      ) {
        items.push(attentionItem({
          id: "connector-version:" + entry.workspace.id + ":" + installation.connectorKey,
          category: "connectors",
          severity: "critical",
          workspaceId: entry.workspace.id,
          workspaceName: entry.workspace.name,
          title: installation.connectorKey + " installation is incompatible",
          detail: "The installed connector version no longer matches the registered connector manifest.",
          href: "/connectors",
          actionLabel: "Review connector configuration",
          observedAt: installation.updatedAt.toISOString(),
          statusLabel: "Configuration mismatch"
        }, now));
      }
    }
    for (const audit of latestAudits) {
      if (audit.status !== "failed" && audit.status !== "blocked") continue;
      items.push(attentionItem({
        id: "connector-audit:" + entry.workspace.id + ":" + audit.connectorKey,
        category: "connectors",
        severity: audit.status === "failed" ? "critical" : "attention",
        workspaceId: entry.workspace.id,
        workspaceName: entry.workspace.name,
        title: audit.connectorKey + " connector " + audit.status,
        detail: audit.errorCode || "The latest connector execution evidence requires review.",
        href: "/connectors",
        actionLabel: "Inspect connector evidence",
        observedAt: audit.createdAt.toISOString(),
        statusLabel: audit.status
      }, now));
    }
  }

  for (const batch of reviews.batches.filter((batch) => batch.status === "in-review")) {
    items.push(attentionItem({
      id: "review:" + batch.workspaceId + ":" + batch.reviewId,
      category: "review",
      severity: batch.canApprove ? "attention" : "info",
      workspaceId: batch.workspaceId,
      workspaceName: batch.workspaceName,
      title: batch.title + " is waiting in Data Review",
      detail: batch.includedCount + " included row(s) remain in an open review batch.",
      href: "/data-review",
      actionLabel: batch.canApprove ? "Continue review" : "Open review",
      observedAt: batch.updatedAt,
      statusLabel: "In review"
    }, now));
  }

  for (const candidate of reviews.candidates.filter((candidate) => !candidate.reviewId).slice(0, 12)) {
    items.push(attentionItem({
      id: "review-unstarted:" + candidate.workspaceId + ":" + candidate.datasetId,
      category: "review",
      severity: "info",
      workspaceId: candidate.workspaceId,
      workspaceName: candidate.workspaceName,
      title: candidate.recipeName + " has not entered Data Review",
      detail: candidate.rowCount + " row(s) are available for governed review.",
      href: "/data-review",
      actionLabel: "Start review",
      observedAt: candidate.retrievedAt,
      statusLabel: "Review not started"
    }, now));
  }

  for (const candidate of approved.candidates.filter((candidate) => !candidate.publicationId)) {
    const stale = isStaleOperatorApproval(candidate.approvedAt, now);
    items.push(attentionItem({
      id: "approval:" + candidate.workspaceId + ":" + candidate.reviewId,
      category: "approval",
      severity: stale ? "attention" : "info",
      workspaceId: candidate.workspaceId,
      workspaceName: candidate.workspaceName,
      title: candidate.title + (stale ? " approval is stale" : " is approved but unpublished"),
      detail: candidate.rowCount + " approved row(s) are waiting for a publication decision." +
        (stale ? " Approval is at least " + STALE_APPROVAL_DAYS + " days old." : ""),
      href: "/approved-data",
      actionLabel: "Review publication decision",
      observedAt: candidate.approvedAt,
      statusLabel: stale ? "Stale approval" : "Awaiting publication"
    }, now));
  }

  for (const entry of delivery) {
    const latest = latestByKey(
      entry.recent,
      (event) => event.consumerId + ":" + event.target
    );
    for (const event of latest) {
      if (
        event.eventType !== "transport-error" &&
        event.eventType !== "delivery-rejected" &&
        event.eventType !== "handshake-rejected"
      ) {
        continue;
      }
      items.push(attentionItem({
        id: "integration:" + entry.workspace.id + ":" + event.consumerId + ":" + event.target,
        category: "integration",
        severity: event.eventType === "transport-error" ? "critical" : "attention",
        workspaceId: entry.workspace.id,
        workspaceName: entry.workspace.name,
        title: event.target + " " + event.eventType.replaceAll("-", " "),
        detail: event.validationCode +
          (event.httpStatus ? " · HTTP " + event.httpStatus : ""),
        href: "/integration-delivery",
        actionLabel: "Inspect delivery evidence",
        observedAt: event.occurredAt.toISOString(),
        statusLabel: event.eventType
      }, now));
    }
  }

  for (const entry of retention) {
    const latestRun = entry.recentRuns[0] ?? null;
    if (latestRun?.status === "failed") {
      items.push(attentionItem({
        id: "retention-failed:" + entry.workspace.id + ":" + latestRun.runId,
        category: "retention",
        severity: "critical",
        workspaceId: entry.workspace.id,
        workspaceName: entry.workspace.name,
        title: "Retention cleanup failed",
        detail: latestRun.errorCode || "The latest retention cleanup run failed.",
        href: "/retention",
        actionLabel: "Inspect retention run",
        observedAt: latestRun.createdAt.toISOString(),
        statusLabel: "Cleanup failed"
      }, now));
    }
    if (entry.budgetBreaches.length > 0) {
      items.push(attentionItem({
        id: "retention-budget:" + entry.workspace.id,
        category: "retention",
        severity: "attention",
        workspaceId: entry.workspace.id,
        workspaceName: entry.workspace.name,
        title: "Retention budget needs review",
        detail: entry.budgetBreaches.length + " retention class budget condition(s) are active.",
        href: "/retention",
        actionLabel: "Review storage budget",
        observedAt: null,
        statusLabel: "Budget condition"
      }, now));
    }
    if (entry.deleteEligibleRows > 0) {
      items.push(attentionItem({
        id: "retention-decision:" + entry.workspace.id,
        category: "retention",
        severity: entry.cleanupApproved ? "info" : "attention",
        workspaceId: entry.workspace.id,
        workspaceName: entry.workspace.name,
        title: entry.cleanupApproved
          ? "Approved retention cleanup is waiting to run"
          : "Retention cleanup decision required",
        detail: entry.deleteEligibleRows + " row(s) are delete-eligible under the current retention policy.",
        href: "/retention",
        actionLabel: entry.cleanupApproved ? "Review cleanup scope" : "Review cleanup decision",
        observedAt: entry.approvedAt?.toISOString() ?? null,
        statusLabel: entry.cleanupApproved ? "Approved, not executed" : "Approval required"
      }, now));
    }
  }

  if (triage.totals.driftWithoutCase > 0) {
    items.push(attentionItem({
      id: "triage:drift-without-case",
      category: "integration",
      severity: "critical",
      workspaceId: null,
      workspaceName: "Integration reconciliation",
      title: "Delivery drift has no exception case",
      detail: triage.totals.driftWithoutCase + " reconciliation drift result(s) require triage.",
      href: "/approved-data/reconciliation/triage",
      actionLabel: "Triage delivery drift",
      observedAt: null,
      statusLabel: "Untriaged drift"
    }, now));
  }
  if (triage.totals.proposedPlans > 0) {
    items.push(attentionItem({
      id: "triage:proposed-plans",
      category: "corrective",
      severity: "attention",
      workspaceId: null,
      workspaceName: "Corrective Operations",
      title: "Corrective plans are waiting for review",
      detail: triage.totals.proposedPlans + " proposed corrective plan(s) require an operator decision.",
      href: "/approved-data/reconciliation/triage",
      actionLabel: "Review corrective plans",
      observedAt: null,
      statusLabel: "Plan review"
    }, now));
  }

  const deduplicated = [...new Map(items.map((item) => [item.id, item])).values()]
    .sort((left, right) => {
      const severity = severityRank[left.severity] - severityRank[right.severity];
      if (severity !== 0) return severity;
      const leftAge = left.ageDays ?? -1;
      const rightAge = right.ageDays ?? -1;
      if (leftAge !== rightAge) return rightAge - leftAge;
      return left.title.localeCompare(right.title);
    })
    .slice(0, 100);

  const filters = normalizeOperatorAttentionFilters(filterInput);
  const filteredItems = deduplicated.filter((item) => {
    if (filters.category !== "all" && item.category !== filters.category) return false;
    if (filters.severity !== "all" && item.severity !== filters.severity) return false;
    if (filters.workspace && item.workspaceId !== filters.workspace) return false;
    if (filters.query) {
      const haystack = [
        item.title,
        item.detail,
        item.workspaceName,
        item.statusLabel,
        item.category
      ].join(" ").toLowerCase();
      if (!haystack.includes(filters.query)) return false;
    }
    return true;
  });

  const byCategory = Object.fromEntries(
    OPERATOR_ATTENTION_CATEGORIES
      .filter((category): category is ConcreteCategory => category !== "all")
      .map((category) => [
        category,
        deduplicated.filter((item) => item.category === category).length
      ])
  ) as Record<ConcreteCategory, number>;

  const workspaces = [...new Map(
    deduplicated
      .filter((item) => item.workspaceId)
      .map((item) => [item.workspaceId as string, { id: item.workspaceId as string, name: item.workspaceName }])
  ).values()].sort((a, b) => a.name.localeCompare(b.name));

  return {
    generatedAt: now.toISOString(),
    staleApprovalDays: STALE_APPROVAL_DAYS,
    items: deduplicated,
    filteredItems,
    counts: {
      total: deduplicated.length,
      critical: deduplicated.filter((item) => item.severity === "critical").length,
      attention: deduplicated.filter((item) => item.severity === "attention").length,
      info: deduplicated.filter((item) => item.severity === "info").length,
      workspaces: workspaces.length,
      byCategory
    },
    workspaces,
    filters
  };
}
