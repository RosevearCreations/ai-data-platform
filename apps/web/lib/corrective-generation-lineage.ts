import { createHash } from "node:crypto";
import type { QueryResultRow } from "pg";

import { withUserDatabase, type WorkspaceRole } from "./database";

export type CorrectiveGenerationState = "reclosed" | "recurred";
export type CorrectiveGenerationSourceKind = "legacy-next" | "legacy-following" | "generic";
export type CorrectiveGenerationSuccessorStatus = "ready-for-planning" | "consumed";

export interface CorrectiveGenerationLineageEntry {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  generationLineageId: string;
  caseId: string;
  target: "rosie-dazzlers" | "devil-n-dove";
  generationNumber: number;
  generationLabel: string;
  generationState: CorrectiveGenerationState;
  registeredGenerationState: CorrectiveGenerationState;
  sourceKind: CorrectiveGenerationSourceKind;
  predecessorGenerationLineageId: string | null;
  sourceRecurrenceId: string;
  sourceRecurrenceFingerprint: string;
  planId: string;
  planFingerprint: string;
  deliveryId: string;
  packageId: string;
  replayKey: string;
  packageFingerprint: string;
  reclosureId: string;
  reclosureFingerprint: string;
  terminalRecurrenceId: string | null;
  terminalRecurrenceFingerprint: string | null;
  terminalRegressionFingerprint: string | null;
  registryFingerprint: string;
  registeredAt: string;
}

export interface CorrectiveGenerationSuccessorSource {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  successorSourceId: string;
  predecessorGenerationLineageId: string;
  caseId: string;
  target: "rosie-dazzlers" | "devil-n-dove";
  generationNumber: number;
  sourceRecurrenceKind: "following-corrective-generation" | "generic-corrective-generation";
  sourceRecurrenceId: string;
  sourceRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  status: CorrectiveGenerationSuccessorStatus;
  successorFingerprint: string;
  createdAt: string;
}

export interface CorrectiveGenerationLineageModel {
  generations: CorrectiveGenerationLineageEntry[];
  successors: CorrectiveGenerationSuccessorSource[];
  summary: {
    registeredGenerations: number;
    reclosedGenerations: number;
    recurredGenerations: number;
    readySuccessors: number;
    highestGeneration: number;
  };
}

interface RegistryRow extends QueryResultRow {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  generation_lineage_id: string;
  case_id: string;
  target: "rosie-dazzlers" | "devil-n-dove";
  generation_number: number;
  generation_label: string;
  generation_state: CorrectiveGenerationState;
  registered_generation_state: CorrectiveGenerationState;
  effective_generation_state: CorrectiveGenerationState;
  source_kind: CorrectiveGenerationSourceKind;
  predecessor_generation_lineage_id: string | null;
  source_recurrence_id: string;
  source_recurrence_fingerprint: string;
  plan_id: string;
  plan_fingerprint: string;
  delivery_id: string;
  package_id: string;
  replay_key: string;
  package_fingerprint: string;
  reclosure_id: string;
  reclosure_fingerprint: string;
  terminal_recurrence_id: string | null;
  terminal_recurrence_fingerprint: string | null;
  terminal_regression_fingerprint: string | null;
  registry_fingerprint: string;
  registered_at: Date;
}

interface SuccessorRow extends QueryResultRow {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  successor_source_id: string;
  predecessor_generation_lineage_id: string;
  case_id: string;
  target: "rosie-dazzlers" | "devil-n-dove";
  generation_number: number;
  source_recurrence_kind: "following-corrective-generation" | "generic-corrective-generation";
  source_recurrence_id: string;
  source_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  status: CorrectiveGenerationSuccessorStatus;
  successor_fingerprint: string;
  created_at: Date;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)])
    );
  }
  return value;
}

function fingerprint(prefix: string, value: unknown) {
  return prefix + createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

export function correctiveGenerationLineageFingerprint(input: {
  generationNumber: number;
  predecessorRegistryFingerprint: string | null;
  sourceRecurrenceFingerprint: string;
  planFingerprint: string;
  packageFingerprint: string;
  reclosureFingerprint: string;
  terminalRecurrenceFingerprint: string | null;
}) {
  return fingerprint("corrective-generation-lineage1-", input);
}

export function correctiveGenerationSuccessorFingerprint(input: {
  generationNumber: number;
  predecessorRegistryFingerprint: string;
  sourceRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
}) {
  return fingerprint("corrective-generation-successor1-", input);
}

function mapRegistry(row: RegistryRow): CorrectiveGenerationLineageEntry {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    generationLineageId: row.generation_lineage_id,
    caseId: row.case_id,
    target: row.target,
    generationNumber: row.generation_number,
    generationLabel: row.generation_label,
    generationState: row.effective_generation_state,
    registeredGenerationState: row.registered_generation_state,
    sourceKind: row.source_kind,
    predecessorGenerationLineageId: row.predecessor_generation_lineage_id,
    sourceRecurrenceId: row.source_recurrence_id,
    sourceRecurrenceFingerprint: row.source_recurrence_fingerprint,
    planId: row.plan_id,
    planFingerprint: row.plan_fingerprint,
    deliveryId: row.delivery_id,
    packageId: row.package_id,
    replayKey: row.replay_key,
    packageFingerprint: row.package_fingerprint,
    reclosureId: row.reclosure_id,
    reclosureFingerprint: row.reclosure_fingerprint,
    terminalRecurrenceId: row.terminal_recurrence_id,
    terminalRecurrenceFingerprint: row.terminal_recurrence_fingerprint,
    terminalRegressionFingerprint: row.terminal_regression_fingerprint,
    registryFingerprint: row.registry_fingerprint,
    registeredAt: row.registered_at.toISOString()
  };
}

function mapSuccessor(row: SuccessorRow): CorrectiveGenerationSuccessorSource {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    successorSourceId: row.successor_source_id,
    predecessorGenerationLineageId: row.predecessor_generation_lineage_id,
    caseId: row.case_id,
    target: row.target,
    generationNumber: row.generation_number,
    sourceRecurrenceKind: row.source_recurrence_kind,
    sourceRecurrenceId: row.source_recurrence_id,
    sourceRecurrenceFingerprint: row.source_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    status: row.status,
    successorFingerprint: row.successor_fingerprint,
    createdAt: row.created_at.toISOString()
  };
}

export async function listCorrectiveGenerationLineageForUser(
  userId: string
): Promise<CorrectiveGenerationLineageModel> {
  return withUserDatabase(userId, async (client) => {
    const generations = await client.query<RegistryRow>(
      `select
         r.*,
         r.generation_state as registered_generation_state,
         case
           when r.generation_state='recurred'
             or exists (
               select 1
               from app.workspace_cg_legacy_terminal_events le
               where le.workspace_id=r.workspace_id
                 and le.generation_lineage_id=r.generation_lineage_id
             )
           then 'recurred'
           else r.generation_state
         end as effective_generation_state,
         w.name as workspace_name,
         wm.role
       from app.workspace_corrective_generation_registry r
       join app.workspaces w on w.id=r.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=r.workspace_id and wm.user_id=$1
       order by w.name,r.case_id,r.generation_number,r.registered_at`,
      [userId]
    );

    const successors = await client.query<SuccessorRow>(
      `select s.*,w.name as workspace_name,wm.role
       from app.workspace_corrective_generation_successors s
       join app.workspaces w on w.id=s.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=s.workspace_id and wm.user_id=$1
       order by w.name,s.case_id,s.generation_number,s.created_at`,
      [userId]
    );

    const mappedGenerations = generations.rows.map(mapRegistry);
    const mappedSuccessors = successors.rows.map(mapSuccessor);

    return {
      generations: mappedGenerations,
      successors: mappedSuccessors,
      summary: {
        registeredGenerations: mappedGenerations.length,
        reclosedGenerations: mappedGenerations.filter((x) => x.generationState === "reclosed").length,
        recurredGenerations: mappedGenerations.filter((x) => x.generationState === "recurred").length,
        readySuccessors: mappedSuccessors.filter((x) => x.status === "ready-for-planning").length,
        highestGeneration: mappedGenerations.reduce((max, x) => Math.max(max, x.generationNumber), 0)
      }
    };
  });
}
