// Build 115 — Corrective-Generation State Machine & Cross-Generation Invariant Enforcement
import type { QueryResultRow } from "pg";

import { withUserDatabase, type WorkspaceRole } from "./database";
import type { IntegrationTarget } from "./integration-delivery";

export type CorrectiveGenerationMachinePhase =
  | "successor-ready"
  | "retriage-open"
  | "retriage-dismissed"
  | "plan-proposed"
  | "plan-approved"
  | "activation-active"
  | "activation-revoked"
  | "delivery-reserved"
  | "delivery-transport-error"
  | "delivery-rejected"
  | "delivery-accepted"
  | "reconciliation-error"
  | "reconciliation-drift"
  | "verified-awaiting-reclosure"
  | "reclosed-awaiting-monitor"
  | "reclosed-stable"
  | "recurrence-pending-governance"
  | "recurred";

export type CorrectiveGenerationInvariantSeverity = "warning" | "critical";

export interface CorrectiveGenerationMachineCycle {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  caseId: string;
  target: IntegrationTarget;
  generationNumber: number;
  successorSourceId: string;
  predecessorGenerationLineageId: string;
  sourceRecurrenceKind: "following-corrective-generation" | "generic-corrective-generation";
  caseStatus: string;
  predecessorSourceKind: "legacy-next" | "legacy-following" | "generic";
  retriageId: string | null;
  retriageStatus: string | null;
  planId: string | null;
  planStatus: string | null;
  activationId: string | null;
  activationStatus: string | null;
  deliveryId: string | null;
  deliveryStatus: string | null;
  deliveryAttemptCount: number | null;
  reconciliationId: string | null;
  reconciliationStatus: string | null;
  reclosureId: string | null;
  regressionCheckId: string | null;
  regressionStatus: string | null;
  recurrenceId: string | null;
  nextSuccessorSourceId: string | null;
  phase: CorrectiveGenerationMachinePhase;
}

export interface CorrectiveGenerationInvariantViolation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  caseId: string;
  target: IntegrationTarget;
  generationNumber: number;
  code: string;
  severity: CorrectiveGenerationInvariantSeverity;
  detail: string;
}

export interface CorrectiveGenerationStateMachineModel {
  cycles: CorrectiveGenerationMachineCycle[];
  violations: CorrectiveGenerationInvariantViolation[];
  summary: {
    cycles: number;
    activeCycles: number;
    completedCycles: number;
    recurrentCycles: number;
    criticalViolations: number;
    warnings: number;
  };
}

type CycleRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  case_id: string;
  target: IntegrationTarget;
  generation_number: number;
  successor_source_id: string;
  predecessor_generation_lineage_id: string;
  source_recurrence_kind: "following-corrective-generation" | "generic-corrective-generation";
  case_status: string;
  predecessor_source_kind: "legacy-next" | "legacy-following" | "generic";
  corrective_generation_retriage_id: string | null;
  retriage_status: string | null;
  corrective_generation_plan_id: string | null;
  plan_status: string | null;
  activation_id: string | null;
  activation_status: string | null;
  delivery_id: string | null;
  delivery_status: string | null;
  attempt_count: number | null;
  reconciliation_id: string | null;
  reconciliation_status: string | null;
  reclosure_id: string | null;
  regression_check_id: string | null;
  regression_status: string | null;
  recurrence_id: string | null;
  next_successor_source_id: string | null;
};

type ViolationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  case_id: string;
  target: IntegrationTarget;
  generation_number: number;
  code: string;
  severity: CorrectiveGenerationInvariantSeverity;
  detail: string;
};

export function deriveCorrectiveGenerationMachinePhase(input: {
  retriageStatus?: string | null;
  planStatus?: string | null;
  activationStatus?: string | null;
  deliveryStatus?: string | null;
  reconciliationStatus?: string | null;
  hasReclosure?: boolean;
  regressionStatus?: string | null;
  hasRecurrence?: boolean;
}): CorrectiveGenerationMachinePhase {
  if (input.hasRecurrence) return "recurred";
  if (input.hasReclosure) {
    if (input.regressionStatus === "recurred") return "recurrence-pending-governance";
    if (input.regressionStatus === "stable") return "reclosed-stable";
    return "reclosed-awaiting-monitor";
  }
  if (input.reconciliationStatus === "matched") return "verified-awaiting-reclosure";
  if (input.reconciliationStatus === "drift") return "reconciliation-drift";
  if (
    input.reconciliationStatus === "rejected" ||
    input.reconciliationStatus === "transport-error"
  ) {
    return "reconciliation-error";
  }
  if (input.deliveryStatus === "accepted") return "delivery-accepted";
  if (input.deliveryStatus === "rejected") return "delivery-rejected";
  if (input.deliveryStatus === "transport-error") return "delivery-transport-error";
  if (input.deliveryStatus === "reserved") return "delivery-reserved";
  if (input.activationStatus === "revoked") return "activation-revoked";
  if (input.activationStatus === "active") return "activation-active";
  if (input.planStatus === "approved") return "plan-approved";
  if (input.planStatus === "proposed") return "plan-proposed";
  if (input.retriageStatus === "dismissed") return "retriage-dismissed";
  if (input.retriageStatus) return "retriage-open";
  return "successor-ready";
}

function mapCycle(row: CycleRow): CorrectiveGenerationMachineCycle {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    caseId: row.case_id,
    target: row.target,
    generationNumber: Number(row.generation_number),
    successorSourceId: row.successor_source_id,
    predecessorGenerationLineageId: row.predecessor_generation_lineage_id,
    sourceRecurrenceKind: row.source_recurrence_kind,
    caseStatus: row.case_status,
    predecessorSourceKind: row.predecessor_source_kind,
    retriageId: row.corrective_generation_retriage_id,
    retriageStatus: row.retriage_status,
    planId: row.corrective_generation_plan_id,
    planStatus: row.plan_status,
    activationId: row.activation_id,
    activationStatus: row.activation_status,
    deliveryId: row.delivery_id,
    deliveryStatus: row.delivery_status,
    deliveryAttemptCount: row.attempt_count == null ? null : Number(row.attempt_count),
    reconciliationId: row.reconciliation_id,
    reconciliationStatus: row.reconciliation_status,
    reclosureId: row.reclosure_id,
    regressionCheckId: row.regression_check_id,
    regressionStatus: row.regression_status,
    recurrenceId: row.recurrence_id,
    nextSuccessorSourceId: row.next_successor_source_id,
    phase: deriveCorrectiveGenerationMachinePhase({
      retriageStatus: row.retriage_status,
      planStatus: row.plan_status,
      activationStatus: row.activation_status,
      deliveryStatus: row.delivery_status,
      reconciliationStatus: row.reconciliation_status,
      hasReclosure: Boolean(row.reclosure_id),
      regressionStatus: row.regression_status,
      hasRecurrence: Boolean(row.recurrence_id)
    })
  };
}

function mapViolation(row: ViolationRow): CorrectiveGenerationInvariantViolation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    caseId: row.case_id,
    target: row.target,
    generationNumber: Number(row.generation_number),
    code: row.code,
    severity: row.severity,
    detail: row.detail
  };
}

export async function listCorrectiveGenerationStateMachineForUser(
  userId: string
): Promise<CorrectiveGenerationStateMachineModel> {
  return withUserDatabase(userId, async (client) => {
    const cycleRows = await client.query<CycleRow>(
      `select
         s.workspace_id,
         w.name as workspace_name,
         wm.role,
         s.case_id,
         s.target,
         s.generation_number,
         s.successor_source_id,
         s.predecessor_generation_lineage_id,
         s.source_recurrence_kind,
         c.status as case_status,
         pred.source_kind as predecessor_source_kind,
         t.corrective_generation_retriage_id,
         t.status as retriage_status,
         p.corrective_generation_plan_id,
         p.status as plan_status,
         a.activation_id,
         a.status as activation_status,
         d.delivery_id,
         d.status as delivery_status,
         d.attempt_count,
         vr.reconciliation_id,
         vr.status as reconciliation_status,
         rc.reclosure_id,
         chk.regression_check_id,
         chk.status as regression_status,
         rec.recurrence_id,
         nexts.successor_source_id as next_successor_source_id
       from app.workspace_corrective_generation_successors s
       join app.workspaces w on w.id=s.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=s.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=s.workspace_id and c.case_id=s.case_id
       join app.workspace_corrective_generation_registry pred
         on pred.workspace_id=s.workspace_id
        and pred.generation_lineage_id=s.predecessor_generation_lineage_id
       left join app.workspace_corrective_generation_retriage t
         on t.workspace_id=s.workspace_id and t.successor_source_id=s.successor_source_id
       left join lateral (
         select x.*
         from app.workspace_corrective_generation_plans x
         where x.workspace_id=s.workspace_id
           and x.successor_source_id=s.successor_source_id
         order by x.created_at desc,x.corrective_generation_plan_id desc
         limit 1
       ) p on true
       left join lateral (
         select x.*
         from app.workspace_unified_cg_delivery_activations x
         where x.workspace_id=s.workspace_id
           and x.corrective_generation_plan_id=p.corrective_generation_plan_id
         order by x.activated_at desc,x.activation_id desc
         limit 1
       ) a on true
       left join lateral (
         select x.*
         from app.workspace_unified_cg_live_deliveries x
         where x.workspace_id=s.workspace_id
           and x.corrective_generation_plan_id=p.corrective_generation_plan_id
         order by x.updated_at desc,x.delivery_id desc
         limit 1
       ) d on true
       left join lateral (
         select x.*
         from app.workspace_unified_cg_delivery_reconciliations x
         where x.workspace_id=s.workspace_id
           and x.delivery_id=d.delivery_id
         order by x.created_at desc,x.reconciliation_id desc
         limit 1
       ) vr on true
       left join app.workspace_reconciliation_unified_cg_reclosures rc
         on rc.workspace_id=s.workspace_id
        and rc.successor_source_id=s.successor_source_id
       left join lateral (
         select x.*
         from app.workspace_post_unified_cg_reclosure_checks x
         where x.workspace_id=s.workspace_id
           and x.reclosure_id=rc.reclosure_id
         order by x.created_at desc,x.regression_check_id desc
         limit 1
       ) chk on true
       left join app.workspace_reconciliation_unified_cg_recurrences rec
         on rec.workspace_id=s.workspace_id
        and rec.successor_source_id=s.successor_source_id
       left join app.workspace_corrective_generation_successors nexts
         on nexts.workspace_id=s.workspace_id
        and nexts.predecessor_generation_lineage_id=p.corrective_generation_plan_id
        and nexts.generation_number=s.generation_number+1
       order by w.name,s.case_id,s.generation_number,s.created_at`
    );

    const violationRows = await client.query<ViolationRow>(
      `with effective_registry as (
         select
           r.*,
           case
             when r.generation_state='recurred' or le.legacy_terminal_event_id is not null
               then 'recurred'
             else 'reclosed'
           end as effective_state,
           coalesce(le.terminal_recurrence_id,r.terminal_recurrence_id) as effective_terminal_recurrence_id,
           coalesce(
             le.terminal_recurrence_fingerprint,
             r.terminal_recurrence_fingerprint
           ) as effective_terminal_recurrence_fingerprint,
           coalesce(
             le.terminal_regression_fingerprint,
             r.terminal_regression_fingerprint
           ) as effective_terminal_regression_fingerprint
         from app.workspace_corrective_generation_registry r
         left join app.workspace_cg_legacy_terminal_events le
           on le.workspace_id=r.workspace_id
          and le.generation_lineage_id=r.generation_lineage_id
       ),
       latest_successor as (
         select distinct on (s.workspace_id,s.case_id)
           s.workspace_id,s.case_id,s.successor_source_id,s.generation_number
         from app.workspace_corrective_generation_successors s
         order by s.workspace_id,s.case_id,s.generation_number desc,s.created_at desc,s.successor_source_id desc
       ),
       violations as (
         select
           r.workspace_id,r.case_id,r.target,r.generation_number,
           'registry-predecessor-continuity'::text as code,
           'critical'::text as severity,
           'Registered generation does not point to the immediately preceding generation for the same case and target.'::text as detail
         from effective_registry r
         left join effective_registry pred
           on pred.workspace_id=r.workspace_id
          and pred.generation_lineage_id=r.predecessor_generation_lineage_id
         where r.generation_number>1
           and (
             pred.generation_lineage_id is null
             or pred.case_id<>r.case_id
             or pred.target<>r.target
             or pred.generation_number+1<>r.generation_number
           )

         union all

         select
           s.workspace_id,s.case_id,s.target,s.generation_number,
           'successor-predecessor-continuity','critical',
           'Successor source is not exactly one generation after its registered predecessor.'
         from app.workspace_corrective_generation_successors s
         left join effective_registry pred
           on pred.workspace_id=s.workspace_id
          and pred.generation_lineage_id=s.predecessor_generation_lineage_id
         where pred.generation_lineage_id is null
            or pred.case_id<>s.case_id
            or pred.target<>s.target
            or pred.generation_number+1<>s.generation_number

         union all

         select
           s.workspace_id,s.case_id,s.target,s.generation_number,
           'successor-terminal-recurrence-identity','critical',
           'Successor source does not bind the exact terminal recurrence and regression fingerprints of its predecessor.'
         from app.workspace_corrective_generation_successors s
         join effective_registry pred
           on pred.workspace_id=s.workspace_id
          and pred.generation_lineage_id=s.predecessor_generation_lineage_id
         where pred.effective_state<>'recurred'
            or pred.effective_terminal_recurrence_id is distinct from s.source_recurrence_id
            or pred.effective_terminal_recurrence_fingerprint is distinct from s.source_recurrence_fingerprint
            or pred.effective_terminal_regression_fingerprint is distinct from s.source_regression_fingerprint

         union all

         select
           p.workspace_id,p.case_id,p.target,p.generation_number,
           'plan-generation-identity','critical',
           'Generic plan identity does not match its successor source and predecessor generation.'
         from app.workspace_corrective_generation_plans p
         join app.workspace_corrective_generation_successors s
           on s.workspace_id=p.workspace_id
          and s.successor_source_id=p.successor_source_id
         join effective_registry pred
           on pred.workspace_id=p.workspace_id
          and pred.generation_lineage_id=p.predecessor_generation_lineage_id
         where p.case_id<>s.case_id
            or p.target<>s.target
            or p.generation_number<>s.generation_number
            or p.predecessor_generation_lineage_id<>s.predecessor_generation_lineage_id
            or p.source_recurrence_id<>s.source_recurrence_id
            or p.source_recurrence_fingerprint<>s.source_recurrence_fingerprint
            or p.source_regression_fingerprint<>s.source_regression_fingerprint
            or p.predecessor_plan_id<>pred.plan_id
            or p.predecessor_delivery_id<>pred.delivery_id
            or p.predecessor_package_id<>pred.package_id
            or p.predecessor_replay_key<>pred.replay_key
            or p.predecessor_package_fingerprint<>pred.package_fingerprint
            or p.predecessor_reclosure_id<>pred.reclosure_id
            or p.predecessor_reclosure_fingerprint<>pred.reclosure_fingerprint

         union all

         select
           a.workspace_id,a.case_id,a.target,a.generation_number,
           'activation-generation-identity','critical',
           'Delivery activation identity does not match its approved plan/re-triage generation.'
         from app.workspace_unified_cg_delivery_activations a
         join app.workspace_corrective_generation_plans p
           on p.workspace_id=a.workspace_id
          and p.corrective_generation_plan_id=a.corrective_generation_plan_id
         join app.workspace_corrective_generation_retriage t
           on t.workspace_id=p.workspace_id
          and t.corrective_generation_retriage_id=p.corrective_generation_retriage_id
         where a.corrective_generation_retriage_id<>p.corrective_generation_retriage_id
            or a.successor_source_id<>p.successor_source_id
            or a.predecessor_generation_lineage_id<>p.predecessor_generation_lineage_id
            or a.case_id<>p.case_id
            or a.target<>p.target
            or a.generation_number<>p.generation_number
            or a.plan_fingerprint<>p.plan_fingerprint
            or p.status<>'approved'
            or t.status<>'approved'

         union all

         select
           d.workspace_id,p.case_id,d.target,d.generation_number,
           'delivery-generation-identity','critical',
           'Live delivery identity does not match its activation and corrective-generation plan.'
         from app.workspace_unified_cg_live_deliveries d
         join app.workspace_unified_cg_delivery_activations a
           on a.workspace_id=d.workspace_id and a.activation_id=d.activation_id
         join app.workspace_corrective_generation_plans p
           on p.workspace_id=d.workspace_id
          and p.corrective_generation_plan_id=d.corrective_generation_plan_id
         where d.corrective_generation_plan_id<>a.corrective_generation_plan_id
            or d.generation_number<>a.generation_number
            or d.target<>a.target
            or d.predecessor_delivery_id<>a.predecessor_delivery_id
            or d.plan_fingerprint<>a.plan_fingerprint
            or d.activation_fingerprint<>a.activation_fingerprint
            or d.unified_package_id<>a.unified_package_id
            or d.unified_replay_key<>a.unified_replay_key
            or d.unified_package_fingerprint<>a.unified_package_fingerprint
            or p.status<>'approved'

         union all

         select
           rc.workspace_id,rc.case_id,rc.target,rc.generation_number,
           'reclosure-generation-identity','critical',
           'Verified re-closure does not match the accepted delivery, matched reconciliation, and approved plan generation.'
         from app.workspace_reconciliation_unified_cg_reclosures rc
         join app.workspace_corrective_generation_plans p
           on p.workspace_id=rc.workspace_id
          and p.corrective_generation_plan_id=rc.corrective_generation_plan_id
         join app.workspace_corrective_generation_retriage t
           on t.workspace_id=p.workspace_id
          and t.corrective_generation_retriage_id=p.corrective_generation_retriage_id
         join app.workspace_unified_cg_live_deliveries d
           on d.workspace_id=rc.workspace_id and d.delivery_id=rc.delivery_id
         join app.workspace_unified_cg_delivery_reconciliations vr
           on vr.workspace_id=rc.workspace_id
          and vr.reconciliation_id=rc.reconciliation_id
         where rc.successor_source_id<>p.successor_source_id
            or rc.predecessor_generation_lineage_id<>p.predecessor_generation_lineage_id
            or rc.case_id<>p.case_id
            or rc.target<>p.target
            or rc.generation_number<>p.generation_number
            or rc.plan_fingerprint<>p.plan_fingerprint
            or d.status<>'accepted'
            or vr.status<>'matched'
            or p.status<>'approved'
            or t.status<>'approved'

         union all

         select
           r.workspace_id,r.case_id,r.target,r.generation_number,
           'recurred-generation-missing-successor','critical',
           'Effective recurrent generation has no exact next-generation successor source.'
         from effective_registry r
         where r.generation_number>=2
           and r.generation_number<10000
           and r.effective_state='recurred'
           and not exists (
             select 1
             from app.workspace_corrective_generation_successors s
             where s.workspace_id=r.workspace_id
               and s.predecessor_generation_lineage_id=r.generation_lineage_id
               and s.case_id=r.case_id
               and s.target=r.target
               and s.generation_number=r.generation_number+1
               and s.source_recurrence_id=r.effective_terminal_recurrence_id
               and s.source_recurrence_fingerprint=r.effective_terminal_recurrence_fingerprint
               and s.source_regression_fingerprint=r.effective_terminal_regression_fingerprint
           )

         union all

         select
           s.workspace_id,s.case_id,s.target,s.generation_number,
           'latest-case-state','warning',
           case
             when rc.reclosure_id is null
               then 'Latest successor generation is active but the exception case is not open.'
             else 'Latest successor generation is re-closed without recurrence but the exception case is not closed.'
           end
         from latest_successor ls
         join app.workspace_corrective_generation_successors s
           on s.workspace_id=ls.workspace_id
          and s.successor_source_id=ls.successor_source_id
         join app.workspace_reconciliation_exception_cases c
           on c.workspace_id=s.workspace_id and c.case_id=s.case_id
         left join app.workspace_reconciliation_unified_cg_reclosures rc
           on rc.workspace_id=s.workspace_id
          and rc.successor_source_id=s.successor_source_id
         where (rc.reclosure_id is null and c.status<>'open')
            or (
              rc.reclosure_id is not null
              and not exists (
                select 1
                from app.workspace_reconciliation_unified_cg_recurrences rec
                where rec.workspace_id=rc.workspace_id
                  and rec.reclosure_id=rc.reclosure_id
              )
              and c.status<>'closed'
            )
       )
       select
         v.workspace_id,
         w.name as workspace_name,
         wm.role,
         v.case_id,
         v.target,
         v.generation_number,
         v.code,
         v.severity,
         v.detail
       from violations v
       join app.workspaces w on w.id=v.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=v.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by
         case when v.severity='critical' then 0 else 1 end,
         w.name,v.case_id,v.generation_number,v.code`
    );

    const cycles = cycleRows.rows.map(mapCycle);
    const violations = violationRows.rows.map(mapViolation);
    const completed = new Set<CorrectiveGenerationMachinePhase>([
      "reclosed-awaiting-monitor",
      "reclosed-stable",
      "recurrence-pending-governance",
      "recurred"
    ]);

    return {
      cycles,
      violations,
      summary: {
        cycles: cycles.length,
        activeCycles: cycles.filter((item) => !completed.has(item.phase)).length,
        completedCycles: cycles.filter((item) => completed.has(item.phase)).length,
        recurrentCycles: cycles.filter((item) => item.phase === "recurred").length,
        criticalViolations: violations.filter((item) => item.severity === "critical").length,
        warnings: violations.filter((item) => item.severity === "warning").length
      }
    };
  });
}
