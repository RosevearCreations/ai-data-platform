// Build 114 — Legacy Corrective-Generation Compatibility & Historical Lineage Bridge
import type { QueryResultRow } from "pg";

import { withUserDatabase, type WorkspaceRole } from "./database";
import type { IntegrationTarget } from "./integration-delivery";

export type LegacyCorrectiveGenerationSourceKind = "legacy-next" | "legacy-following";
export type LegacyCorrectiveGenerationCompatibilityStatus =
  | "compatible"
  | "missing-lineage"
  | "late-recurrence-unbridged"
  | "missing-successor"
  | "conflict";

export interface LegacyCorrectiveGenerationCandidate {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  sourceKind: LegacyCorrectiveGenerationSourceKind;
  generationNumber: 1 | 2;
  planId: string;
  predecessorPlanId: string | null;
  caseId: string;
  target: IntegrationTarget;
  sourceRecurrenceId: string;
  terminalRecurrenceId: string | null;
  registeredGenerationLineageId: string | null;
  registeredState: "reclosed" | "recurred" | null;
  terminalEventId: string | null;
  successorSourceId: string | null;
  registryMatches: boolean;
  terminalEventMatches: boolean;
  successorMatches: boolean;
  status: LegacyCorrectiveGenerationCompatibilityStatus;
  canBridge: boolean;
  completedAt: string;
}

export interface LegacyCorrectiveGenerationCompatibilityModel {
  candidates: LegacyCorrectiveGenerationCandidate[];
  summary: {
    total: number;
    compatible: number;
    missingLineage: number;
    lateRecurrenceUnbridged: number;
    missingSuccessor: number;
    conflicts: number;
    bridgeable: number;
  };
}

type CandidateRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  source_kind: LegacyCorrectiveGenerationSourceKind;
  generation_number: 1 | 2;
  plan_id: string;
  predecessor_plan_id: string | null;
  case_id: string;
  target: IntegrationTarget;
  source_recurrence_id: string;
  terminal_recurrence_id: string | null;
  registered_generation_lineage_id: string | null;
  registered_state: "reclosed" | "recurred" | null;
  terminal_event_id: string | null;
  successor_source_id: string | null;
  registry_matches: boolean;
  terminal_event_matches: boolean;
  successor_matches: boolean;
  completed_at: Date;
};

export function classifyLegacyCorrectiveGenerationCompatibility(input: {
  hasRegistry: boolean;
  registryMatches: boolean;
  hasTerminalRecurrence: boolean;
  registeredState: "reclosed" | "recurred" | null;
  hasTerminalEvent: boolean;
  terminalEventMatches: boolean;
  successorRequired: boolean;
  hasSuccessor: boolean;
  successorMatches: boolean;
}): LegacyCorrectiveGenerationCompatibilityStatus {
  if (!input.hasRegistry) return "missing-lineage";
  if (!input.registryMatches) return "conflict";

  if (input.hasTerminalRecurrence && input.registeredState === "reclosed") {
    if (input.hasTerminalEvent && !input.terminalEventMatches) return "conflict";
    if (!input.hasTerminalEvent) return "late-recurrence-unbridged";
  }

  if (input.successorRequired) {
    if (input.hasSuccessor && !input.successorMatches) return "conflict";
    if (!input.hasSuccessor) return "missing-successor";
  }

  return "compatible";
}

function mapCandidate(row: CandidateRow): LegacyCorrectiveGenerationCandidate {
  const successorRequired =
    row.source_kind === "legacy-following" && Boolean(row.terminal_recurrence_id);
  const status = classifyLegacyCorrectiveGenerationCompatibility({
    hasRegistry: Boolean(row.registered_generation_lineage_id),
    registryMatches: row.registry_matches,
    hasTerminalRecurrence: Boolean(row.terminal_recurrence_id),
    registeredState: row.registered_state,
    hasTerminalEvent: Boolean(row.terminal_event_id),
    terminalEventMatches: row.terminal_event_matches,
    successorRequired,
    hasSuccessor: Boolean(row.successor_source_id),
    successorMatches: row.successor_matches
  });

  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    sourceKind: row.source_kind,
    generationNumber: row.generation_number,
    planId: row.plan_id,
    predecessorPlanId: row.predecessor_plan_id,
    caseId: row.case_id,
    target: row.target,
    sourceRecurrenceId: row.source_recurrence_id,
    terminalRecurrenceId: row.terminal_recurrence_id,
    registeredGenerationLineageId: row.registered_generation_lineage_id,
    registeredState: row.registered_state,
    terminalEventId: row.terminal_event_id,
    successorSourceId: row.successor_source_id,
    registryMatches: row.registry_matches,
    terminalEventMatches: row.terminal_event_matches,
    successorMatches: row.successor_matches,
    status,
    canBridge:
      (row.role === "owner" || row.role === "admin") &&
      status !== "compatible" &&
      status !== "conflict",
    completedAt: row.completed_at.toISOString()
  };
}

export async function listLegacyCorrectiveGenerationCompatibilityForUser(
  userId: string
): Promise<LegacyCorrectiveGenerationCompatibilityModel> {
  const rows = await withUserDatabase(userId, async (client) => {
    return client.query<CandidateRow>(
      `with legacy as (
         select
           p.workspace_id,
           'legacy-next'::text as source_kind,
           1::integer as generation_number,
           p.next_corrective_generation_plan_id as plan_id,
           null::uuid as predecessor_plan_id,
           p.case_id,
           p.target,
           p.continuation_cycle_recurrence_id as source_recurrence_id,
           p.source_continuation_cycle_recurrence_fingerprint as source_recurrence_fingerprint,
           p.plan_fingerprint,
           d.delivery_id,
           d.next_corrective_generation_package_id as package_id,
           d.next_corrective_generation_replay_key as replay_key,
           d.next_corrective_generation_package_fingerprint as package_fingerprint,
           rc.next_corrective_generation_reclosure_id as reclosure_id,
           rc.next_corrective_generation_reclosure_fingerprint as reclosure_fingerprint,
           r.next_corrective_generation_recurrence_id as terminal_recurrence_id,
           r.next_corrective_generation_recurrence_fingerprint as terminal_recurrence_fingerprint,
           r.regression_fingerprint as terminal_regression_fingerprint,
           rc.closed_at as completed_at
         from app.workspace_next_corrective_generation_plans p
         join app.workspace_reconciliation_next_corrective_generation_reclosures rc
           on rc.workspace_id=p.workspace_id
          and rc.next_corrective_generation_plan_id=p.next_corrective_generation_plan_id
         join app.workspace_next_corrective_generation_live_deliveries d
           on d.workspace_id=rc.workspace_id
          and d.delivery_id=rc.next_corrective_generation_delivery_id
          and d.status='accepted'
         left join app.workspace_reconciliation_next_corrective_generation_recurrences r
           on r.workspace_id=rc.workspace_id
          and r.next_corrective_generation_reclosure_id=rc.next_corrective_generation_reclosure_id
         where p.status='approved'

         union all

         select
           p.workspace_id,
           'legacy-following'::text as source_kind,
           2::integer as generation_number,
           p.following_corrective_generation_plan_id as plan_id,
           p.predecessor_next_corrective_generation_plan_id as predecessor_plan_id,
           p.case_id,
           p.target,
           p.next_corrective_generation_recurrence_id as source_recurrence_id,
           p.source_next_corrective_generation_recurrence_fingerprint as source_recurrence_fingerprint,
           p.plan_fingerprint,
           d.delivery_id,
           d.following_corrective_generation_package_id as package_id,
           d.following_corrective_generation_replay_key as replay_key,
           d.following_corrective_generation_package_fingerprint as package_fingerprint,
           rc.following_corrective_generation_reclosure_id as reclosure_id,
           rc.following_corrective_generation_reclosure_fingerprint as reclosure_fingerprint,
           r.following_corrective_generation_recurrence_id as terminal_recurrence_id,
           r.following_corrective_generation_recurrence_fingerprint as terminal_recurrence_fingerprint,
           r.regression_fingerprint as terminal_regression_fingerprint,
           rc.closed_at as completed_at
         from app.workspace_following_corrective_generation_plans p
         join app.workspace_reconciliation_following_cg_reclosures rc
           on rc.workspace_id=p.workspace_id
          and rc.following_corrective_generation_plan_id=p.following_corrective_generation_plan_id
         join app.workspace_following_corrective_generation_live_deliveries d
           on d.workspace_id=rc.workspace_id
          and d.delivery_id=rc.following_corrective_generation_delivery_id
          and d.status='accepted'
         left join app.workspace_reconciliation_following_cg_recurrences r
           on r.workspace_id=rc.workspace_id
          and r.following_corrective_generation_reclosure_id=rc.following_corrective_generation_reclosure_id
         where p.status='approved'
       )
       select
         l.workspace_id,
         w.name as workspace_name,
         wm.role,
         l.source_kind,
         l.generation_number,
         l.plan_id,
         l.predecessor_plan_id,
         l.case_id,
         l.target,
         l.source_recurrence_id,
         l.terminal_recurrence_id,
         reg.generation_lineage_id as registered_generation_lineage_id,
         reg.generation_state as registered_state,
         terminal.legacy_terminal_event_id as terminal_event_id,
         successor.successor_source_id,
         case
           when reg.generation_lineage_id is null then false
           else
             reg.generation_lineage_id=l.plan_id
             and reg.case_id=l.case_id
             and reg.target=l.target
             and reg.generation_number=l.generation_number
             and reg.source_kind=l.source_kind
             and reg.predecessor_generation_lineage_id is not distinct from l.predecessor_plan_id
             and reg.source_recurrence_id=l.source_recurrence_id
             and reg.source_recurrence_fingerprint=l.source_recurrence_fingerprint
             and reg.plan_fingerprint=l.plan_fingerprint
             and reg.delivery_id=l.delivery_id
             and reg.package_id=l.package_id
             and reg.replay_key=l.replay_key
             and reg.package_fingerprint=l.package_fingerprint
             and reg.reclosure_id=l.reclosure_id
             and reg.reclosure_fingerprint=l.reclosure_fingerprint
         end as registry_matches,
         case
           when l.terminal_recurrence_id is null or reg.generation_state='recurred' then true
           when terminal.legacy_terminal_event_id is null then false
           else
             terminal.terminal_recurrence_id=l.terminal_recurrence_id
             and terminal.terminal_recurrence_fingerprint=l.terminal_recurrence_fingerprint
             and terminal.terminal_regression_fingerprint=l.terminal_regression_fingerprint
         end as terminal_event_matches,
         case
           when l.source_kind<>'legacy-following' or l.terminal_recurrence_id is null then true
           when successor.successor_source_id is null then false
           else
             successor.successor_source_id=l.terminal_recurrence_id
             and successor.predecessor_generation_lineage_id=reg.generation_lineage_id
             and successor.case_id=l.case_id
             and successor.target=l.target
             and successor.generation_number=3
             and successor.source_recurrence_kind='following-corrective-generation'
             and successor.source_recurrence_id=l.terminal_recurrence_id
             and successor.source_recurrence_fingerprint=l.terminal_recurrence_fingerprint
             and successor.source_regression_fingerprint=l.terminal_regression_fingerprint
         end as successor_matches,
         l.completed_at
       from legacy l
       join app.workspaces w on w.id=l.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=l.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       left join app.workspace_corrective_generation_registry reg
         on reg.workspace_id=l.workspace_id and reg.plan_id=l.plan_id
       left join app.workspace_cg_legacy_terminal_events terminal
         on terminal.workspace_id=reg.workspace_id
        and terminal.generation_lineage_id=reg.generation_lineage_id
       left join app.workspace_corrective_generation_successors successor
         on successor.workspace_id=l.workspace_id
        and successor.case_id=l.case_id
        and successor.generation_number=3
       order by w.name,l.case_id,l.generation_number,l.completed_at`
    );
  });

  const candidates = rows.rows.map(mapCandidate);
  return {
    candidates,
    summary: {
      total: candidates.length,
      compatible: candidates.filter((item) => item.status === "compatible").length,
      missingLineage: candidates.filter((item) => item.status === "missing-lineage").length,
      lateRecurrenceUnbridged: candidates.filter(
        (item) => item.status === "late-recurrence-unbridged"
      ).length,
      missingSuccessor: candidates.filter((item) => item.status === "missing-successor").length,
      conflicts: candidates.filter((item) => item.status === "conflict").length,
      bridgeable: candidates.filter((item) => item.canBridge).length
    }
  };
}

export async function bridgeLegacyCorrectiveGenerationLineage(
  userId: string,
  input: {
    workspaceId: string;
    sourceKind: LegacyCorrectiveGenerationSourceKind;
    planId: string;
  }
) {
  if (!["legacy-next", "legacy-following"].includes(input.sourceKind)) {
    throw new Error("legacy_corrective_generation_bridge_source_kind_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    const result = await client.query<{ result: Record<string, unknown> }>(
      `select app.bridge_legacy_corrective_generation_lineage(
         $1::uuid,$2::text,$3::uuid
       ) as result`,
      [input.workspaceId, input.sourceKind, input.planId]
    );
    return result.rows[0]?.result ?? null;
  });
}
