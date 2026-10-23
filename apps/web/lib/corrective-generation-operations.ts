// Build 116 — Corrective-Generation Operations Console, Timeline & Audit Export
import { createHash } from "node:crypto";
import type { QueryResultRow } from "pg";

import {
  listCorrectiveGenerationStateMachineForUser,
  type CorrectiveGenerationInvariantSeverity,
  type CorrectiveGenerationMachineCycle,
  type CorrectiveGenerationMachinePhase,
  type CorrectiveGenerationStateMachineModel
} from "./corrective-generation-state-machine";
import { withUserDatabase, type WorkspaceRole } from "./database";
import type { IntegrationTarget } from "./integration-delivery";

export const CORRECTIVE_GENERATION_AUDIT_SCHEMA_VERSION =
  "corrective-generation-audit-export.v1";

export type CorrectiveGenerationTimelineEventType =
  | "generation-registered"
  | "legacy-terminal-recurrence"
  | "successor-created"
  | "retriage-created"
  | "retriage-updated"
  | "plan-created"
  | "plan-reviewed"
  | "activation-created"
  | "activation-revoked"
  | "delivery-created"
  | "delivery-updated"
  | "reconciliation-recorded"
  | "reclosure-recorded"
  | "regression-check-recorded"
  | "recurrence-governed";

export interface CorrectiveGenerationTimelineEvent {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  caseId: string;
  target: IntegrationTarget;
  generationNumber: number;
  eventType: CorrectiveGenerationTimelineEventType;
  entityId: string;
  occurredAt: string;
  status: string;
  title: string;
  detail: string;
  evidenceFingerprint: string | null;
}

export interface CorrectiveGenerationOperationsFilters {
  workspaceId?: string;
  caseId?: string;
  target?: IntegrationTarget;
  generationNumber?: number;
  phase?: CorrectiveGenerationMachinePhase;
  severity?: CorrectiveGenerationInvariantSeverity;
  eventType?: CorrectiveGenerationTimelineEventType;
}

export interface CorrectiveGenerationOperationsModel {
  stateMachine: CorrectiveGenerationStateMachineModel;
  timeline: CorrectiveGenerationTimelineEvent[];
  workspaces: Array<{ workspaceId: string; workspaceName: string }>;
  cases: Array<{
    workspaceId: string;
    workspaceName: string;
    caseId: string;
    target: IntegrationTarget;
    latestGenerationNumber: number;
    latestPhase: CorrectiveGenerationMachinePhase | null;
    criticalViolations: number;
    warnings: number;
  }>;
  summary: {
    workspaces: number;
    cases: number;
    timelineEvents: number;
    cycles: number;
    activeCycles: number;
    completedCycles: number;
    recurrentCycles: number;
    criticalViolations: number;
    warnings: number;
  };
}

export interface CorrectiveGenerationAuditExport {
  schemaVersion: typeof CORRECTIVE_GENERATION_AUDIT_SCHEMA_VERSION;
  generatedAt: string;
  filters: CorrectiveGenerationOperationsFilters;
  digest: {
    algorithm: "sha256";
    value: string;
  };
  summary: CorrectiveGenerationOperationsModel["summary"];
  cycles: CorrectiveGenerationMachineCycle[];
  violations: CorrectiveGenerationStateMachineModel["violations"];
  timeline: CorrectiveGenerationTimelineEvent[];
}

type TimelineRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  case_id: string;
  target: IntegrationTarget;
  generation_number: number;
  event_type: CorrectiveGenerationTimelineEventType;
  entity_id: string;
  occurred_at: Date;
  status: string;
  title: string;
  detail: string;
  evidence_fingerprint: string | null;
};

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonical(nested)])
    );
  }
  return value;
}

function digest(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

function mapTimeline(row: TimelineRow): CorrectiveGenerationTimelineEvent {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    caseId: row.case_id,
    target: row.target,
    generationNumber: Number(row.generation_number),
    eventType: row.event_type,
    entityId: row.entity_id,
    occurredAt: row.occurred_at.toISOString(),
    status: row.status,
    title: row.title,
    detail: row.detail,
    evidenceFingerprint: row.evidence_fingerprint
  };
}

function latestCycleByCase(cycles: CorrectiveGenerationMachineCycle[]) {
  const latest = new Map<string, CorrectiveGenerationMachineCycle>();
  for (const cycle of cycles) {
    const key = cycle.workspaceId + ":" + cycle.caseId;
    const current = latest.get(key);
    if (!current || current.generationNumber < cycle.generationNumber) {
      latest.set(key, cycle);
    }
  }
  return latest;
}

export function filterCorrectiveGenerationOperations(
  model: CorrectiveGenerationOperationsModel,
  filters: CorrectiveGenerationOperationsFilters
) {
  const workspaceMatches = (workspaceId: string) =>
    !filters.workspaceId || workspaceId === filters.workspaceId;
  const caseMatches = (caseId: string) =>
    !filters.caseId || caseId === filters.caseId;
  const targetMatches = (target: IntegrationTarget) =>
    !filters.target || target === filters.target;
  const generationMatches = (generationNumber: number) =>
    filters.generationNumber == null || generationNumber === filters.generationNumber;

  const cycles = model.stateMachine.cycles.filter(
    (item) =>
      workspaceMatches(item.workspaceId) &&
      caseMatches(item.caseId) &&
      targetMatches(item.target) &&
      generationMatches(item.generationNumber) &&
      (!filters.phase || item.phase === filters.phase)
  );

  const cycleKeys = new Set(
    cycles.map(
      (item) =>
        item.workspaceId + ":" + item.caseId + ":" + String(item.generationNumber)
    )
  );

  const violations = model.stateMachine.violations.filter(
    (item) =>
      workspaceMatches(item.workspaceId) &&
      caseMatches(item.caseId) &&
      targetMatches(item.target) &&
      generationMatches(item.generationNumber) &&
      (!filters.severity || item.severity === filters.severity) &&
      (!filters.phase ||
        cycleKeys.has(
          item.workspaceId + ":" + item.caseId + ":" + String(item.generationNumber)
        ))
  );

  const timeline = model.timeline.filter(
    (item) =>
      workspaceMatches(item.workspaceId) &&
      caseMatches(item.caseId) &&
      targetMatches(item.target) &&
      generationMatches(item.generationNumber) &&
      (!filters.eventType || item.eventType === filters.eventType) &&
      (!filters.phase ||
        cycleKeys.has(
          item.workspaceId + ":" + item.caseId + ":" + String(item.generationNumber)
        ))
  );

  return { cycles, violations, timeline };
}

export function buildCorrectiveGenerationAuditExport(
  model: CorrectiveGenerationOperationsModel,
  filters: CorrectiveGenerationOperationsFilters,
  generatedAt = new Date().toISOString()
): CorrectiveGenerationAuditExport {
  const filtered = filterCorrectiveGenerationOperations(model, filters);
  const content = {
    schemaVersion: CORRECTIVE_GENERATION_AUDIT_SCHEMA_VERSION,
    filters,
    summary: model.summary,
    cycles: filtered.cycles,
    violations: filtered.violations,
    timeline: filtered.timeline
  };

  return {
    ...content,
    generatedAt,
    digest: {
      algorithm: "sha256",
      value: digest(content)
    }
  };
}

function csvCell(value: unknown) {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return '"' + text.replaceAll('"', '""') + '"';
}

export function correctiveGenerationAuditExportCsv(
  audit: CorrectiveGenerationAuditExport
) {
  const headers = [
    "row_type",
    "workspace_id",
    "workspace_name",
    "case_id",
    "target",
    "generation_number",
    "phase_or_severity",
    "event_or_code",
    "status",
    "occurred_at",
    "entity_id",
    "detail",
    "evidence_fingerprint",
    "audit_digest"
  ];
  const rows: unknown[][] = [];

  for (const cycle of audit.cycles) {
    rows.push([
      "cycle",
      cycle.workspaceId,
      cycle.workspaceName,
      cycle.caseId,
      cycle.target,
      cycle.generationNumber,
      cycle.phase,
      "cycle",
      cycle.caseStatus,
      "",
      cycle.successorSourceId,
      "predecessor=" + cycle.predecessorGenerationLineageId,
      "",
      audit.digest.value
    ]);
  }

  for (const violation of audit.violations) {
    rows.push([
      "violation",
      violation.workspaceId,
      violation.workspaceName,
      violation.caseId,
      violation.target,
      violation.generationNumber,
      violation.severity,
      violation.code,
      "",
      "",
      "",
      violation.detail,
      "",
      audit.digest.value
    ]);
  }

  for (const event of audit.timeline) {
    rows.push([
      "timeline",
      event.workspaceId,
      event.workspaceName,
      event.caseId,
      event.target,
      event.generationNumber,
      "",
      event.eventType,
      event.status,
      event.occurredAt,
      event.entityId,
      event.title + " — " + event.detail,
      event.evidenceFingerprint ?? "",
      audit.digest.value
    ]);
  }

  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(","))
  ].join("\r\n");
}

export async function listCorrectiveGenerationOperationsForUser(
  userId: string
): Promise<CorrectiveGenerationOperationsModel> {
  const stateMachine = await listCorrectiveGenerationStateMachineForUser(userId);

  const timelineRows = await withUserDatabase(userId, async (client) => {
    return client.query<TimelineRow>(
      `with timeline as (
         select
           r.workspace_id,
           r.case_id,
           r.target,
           r.generation_number,
           'generation-registered'::text as event_type,
           r.generation_lineage_id::text as entity_id,
           r.registered_at as occurred_at,
           r.generation_state as status,
           'Generation registered'::text as title,
           r.generation_label || ' registered from ' || r.source_kind as detail,
           r.registry_fingerprint as evidence_fingerprint
         from app.workspace_corrective_generation_registry r

         union all

         select
           le.workspace_id,
           le.case_id,
           le.target,
           le.generation_number,
           'legacy-terminal-recurrence',
           le.legacy_terminal_event_id::text,
           le.observed_at,
           'recurred',
           'Legacy terminal recurrence bridged',
           'Append-only recurrence evidence adopted for ' || le.source_kind,
           le.event_fingerprint
         from app.workspace_cg_legacy_terminal_events le

         union all

         select
           s.workspace_id,
           s.case_id,
           s.target,
           s.generation_number,
           'successor-created',
           s.successor_source_id::text,
           s.created_at,
           s.status,
           'Successor source created',
           s.source_recurrence_kind || ' successor ready for G' || s.generation_number::text,
           s.successor_fingerprint
         from app.workspace_corrective_generation_successors s

         union all

         select
           t.workspace_id,
           t.case_id,
           t.target,
           t.generation_number,
           'retriage-created',
           t.corrective_generation_retriage_id::text,
           t.created_at,
           t.status,
           'Re-triage opened',
           t.summary,
           t.successor_fingerprint
         from app.workspace_corrective_generation_retriage t

         union all

         select
           t.workspace_id,
           t.case_id,
           t.target,
           t.generation_number,
           'retriage-updated',
           t.corrective_generation_retriage_id::text,
           t.updated_at,
           t.status,
           'Re-triage updated',
           t.classification || '/' || t.severity || '/' || t.resolution_intent,
           t.successor_fingerprint
         from app.workspace_corrective_generation_retriage t
         where t.updated_at>t.created_at

         union all

         select
           p.workspace_id,
           p.case_id,
           p.target,
           p.generation_number,
           'plan-created',
           p.corrective_generation_plan_id::text,
           p.created_at,
           p.status,
           'Corrective plan created',
           p.rationale,
           p.plan_fingerprint
         from app.workspace_corrective_generation_plans p

         union all

         select
           p.workspace_id,
           p.case_id,
           p.target,
           p.generation_number,
           'plan-reviewed',
           p.corrective_generation_plan_id::text,
           p.reviewed_at,
           p.status,
           'Corrective plan reviewed',
           coalesce(nullif(p.review_note,''),'Plan review completed'),
           p.plan_fingerprint
         from app.workspace_corrective_generation_plans p
         where p.reviewed_at is not null

         union all

         select
           a.workspace_id,
           a.case_id,
           a.target,
           a.generation_number,
           'activation-created',
           a.activation_id::text,
           a.activated_at,
           a.status,
           'Delivery activation created',
           'Consumer ' || a.consumer_id || ' activated for corrective-generation delivery',
           a.activation_fingerprint
         from app.workspace_unified_cg_delivery_activations a

         union all

         select
           a.workspace_id,
           a.case_id,
           a.target,
           a.generation_number,
           'activation-revoked',
           a.activation_id::text,
           a.revoked_at,
           a.status,
           'Delivery activation revoked',
           coalesce(nullif(a.revocation_note,''),'Activation revoked'),
           a.activation_fingerprint
         from app.workspace_unified_cg_delivery_activations a
         where a.revoked_at is not null

         union all

         select
           d.workspace_id,
           p.case_id,
           d.target,
           d.generation_number,
           'delivery-created',
           d.delivery_id::text,
           d.created_at,
           d.status,
           'Delivery reserved',
           'Package ' || d.unified_package_id || ' reserved for ' || d.consumer_id,
           d.unified_package_fingerprint
         from app.workspace_unified_cg_live_deliveries d
         join app.workspace_corrective_generation_plans p
           on p.workspace_id=d.workspace_id
          and p.corrective_generation_plan_id=d.corrective_generation_plan_id

         union all

         select
           d.workspace_id,
           p.case_id,
           d.target,
           d.generation_number,
           'delivery-updated',
           d.delivery_id::text,
           d.updated_at,
           d.status,
           'Delivery state updated',
           d.validation_code || ' / attempt ' || d.attempt_count::text,
           d.unified_package_fingerprint
         from app.workspace_unified_cg_live_deliveries d
         join app.workspace_corrective_generation_plans p
           on p.workspace_id=d.workspace_id
          and p.corrective_generation_plan_id=d.corrective_generation_plan_id
         where d.updated_at>d.created_at

         union all

         select
           vr.workspace_id,
           vr.case_id,
           vr.target,
           vr.generation_number,
           'reconciliation-recorded',
           vr.reconciliation_id::text,
           vr.created_at,
           vr.status,
           'Delivery reconciliation recorded',
           vr.validation_code || ' / matched=' || vr.matched_count::text ||
             ' mismatched=' || vr.mismatched_count::text ||
             ' missing=' || vr.missing_count::text,
           vr.verification_fingerprint
         from app.workspace_unified_cg_delivery_reconciliations vr

         union all

         select
           rc.workspace_id,
           rc.case_id,
           rc.target,
           rc.generation_number,
           'reclosure-recorded',
           rc.reclosure_id::text,
           rc.closed_at,
           'reclosed',
           'Corrective generation re-closed',
           coalesce(nullif(rc.reclosure_note,''),'Verified corrective generation re-closed'),
           rc.reclosure_fingerprint
         from app.workspace_reconciliation_unified_cg_reclosures rc

         union all

         select
           chk.workspace_id,
           chk.case_id,
           chk.target,
           chk.generation_number,
           'regression-check-recorded',
           chk.regression_check_id::text,
           chk.created_at,
           chk.status,
           'Post-reclosure regression check',
           chk.validation_code || ' / matched=' || chk.matched_count::text ||
             ' mismatched=' || chk.mismatched_count::text ||
             ' missing=' || chk.missing_count::text,
           chk.verification_fingerprint
         from app.workspace_post_unified_cg_reclosure_checks chk

         union all

         select
           rec.workspace_id,
           rec.case_id,
           rec.target,
           rec.generation_number,
           'recurrence-governed',
           rec.recurrence_id::text,
           rec.recurred_at,
           'recurred',
           'Corrective-generation recurrence governed',
           rec.recurrence_reason,
           rec.recurrence_fingerprint
         from app.workspace_reconciliation_unified_cg_recurrences rec
       )
       select
         x.*,
         w.name as workspace_name,
         wm.role
       from timeline x
       join app.workspaces w on w.id=x.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=x.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       where x.occurred_at is not null
       order by x.occurred_at desc,x.generation_number desc,x.entity_id desc
       limit 5000`
    );
  });

  const timeline = timelineRows.rows.map(mapTimeline);
  const workspaceMap = new Map<string, string>();
  for (const event of timeline) workspaceMap.set(event.workspaceId, event.workspaceName);
  for (const cycle of stateMachine.cycles) {
    workspaceMap.set(cycle.workspaceId, cycle.workspaceName);
  }

  const latest = latestCycleByCase(stateMachine.cycles);
  const caseMap = new Map<
    string,
    CorrectiveGenerationOperationsModel["cases"][number]
  >();

  for (const event of timeline) {
    const key = event.workspaceId + ":" + event.caseId;
    if (!caseMap.has(key)) {
      const cycle = latest.get(key);
      const caseViolations = stateMachine.violations.filter(
        (item) => item.workspaceId === event.workspaceId && item.caseId === event.caseId
      );
      caseMap.set(key, {
        workspaceId: event.workspaceId,
        workspaceName: event.workspaceName,
        caseId: event.caseId,
        target: event.target,
        latestGenerationNumber:
          cycle?.generationNumber ??
          Math.max(
            ...timeline
              .filter(
                (item) =>
                  item.workspaceId === event.workspaceId && item.caseId === event.caseId
              )
              .map((item) => item.generationNumber)
          ),
        latestPhase: cycle?.phase ?? null,
        criticalViolations: caseViolations.filter(
          (item) => item.severity === "critical"
        ).length,
        warnings: caseViolations.filter((item) => item.severity === "warning").length
      });
    }
  }

  const cases = [...caseMap.values()].sort(
    (left, right) =>
      left.workspaceName.localeCompare(right.workspaceName) ||
      left.caseId.localeCompare(right.caseId)
  );
  const workspaces = [...workspaceMap.entries()]
    .map(([workspaceId, workspaceName]) => ({ workspaceId, workspaceName }))
    .sort((left, right) => left.workspaceName.localeCompare(right.workspaceName));

  return {
    stateMachine,
    timeline,
    workspaces,
    cases,
    summary: {
      workspaces: workspaces.length,
      cases: cases.length,
      timelineEvents: timeline.length,
      ...stateMachine.summary
    }
  };
}
