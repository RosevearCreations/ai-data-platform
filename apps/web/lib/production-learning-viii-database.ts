import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import { withUserDatabase } from "./database";
import { listMasterProductionReadinessForUser } from "./master-production-readiness-database";
import {
  PRODUCTION_LEARNING_VIII_AREAS,
  PRODUCTION_LEARNING_VIII_PRIORITIES,
  buildProductionLearningVIII,
  type ProductionLearningVIIIArea,
  type ProductionLearningVIIICandidate,
  type ProductionLearningVIIIPriority
} from "./production-learning-viii";
import type { MasterShellSourceId } from "./master-shell-contract-v1";

type SnapshotRow = {
  snapshot_id: string;
  owner_user_id: string;
  suite_acceptance: string;
  accepted_sources: number;
  ready_for_owner_sources: number;
  hold_sources: number;
  failed_sources: number;
  stale_sources: number;
  unresolved_sources: number;
  candidate_count: number;
  evidence_snapshot: Record<string, unknown>;
  model_snapshot: Record<string, unknown>;
  generated_by: string;
  generated_at: Date;
};

type CandidateRow = {
  candidate_id: string;
  snapshot_id: string;
  owner_user_id: string;
  priority: ProductionLearningVIIIPriority;
  area: ProductionLearningVIIIArea;
  source_id: MasterShellSourceId | null;
  title: string;
  rationale: string;
  evidence: string;
  source_href: string;
  numbered_build: null;
  created_at: Date;
};

async function requireSuiteAdmin(client: PoolClient) {
  const result = await client.query<{ allowed: boolean }>(
    `select exists (
       select 1
       from app.workspace_members wm
       where wm.user_id=nullif(current_setting('app.user_id',true),'')
         and wm.role in ('owner','admin')
     ) as allowed`
  );
  if (!result.rows[0]?.allowed) {
    throw new Error("production_learning_viii_suite_admin_required");
  }
}

function snapshotRow(row: SnapshotRow) {
  return {
    snapshotId: row.snapshot_id,
    ownerUserId: row.owner_user_id,
    suiteAcceptance: row.suite_acceptance,
    acceptedSources: row.accepted_sources,
    readyForOwnerSources: row.ready_for_owner_sources,
    holdSources: row.hold_sources,
    failedSources: row.failed_sources,
    staleSources: row.stale_sources,
    unresolvedSources: row.unresolved_sources,
    candidateCount: row.candidate_count,
    evidenceSnapshot: row.evidence_snapshot,
    modelSnapshot: row.model_snapshot,
    generatedBy: row.generated_by,
    generatedAt: row.generated_at.toISOString()
  };
}

function candidateRow(row: CandidateRow) {
  return {
    candidateId: row.candidate_id,
    snapshotId: row.snapshot_id,
    ownerUserId: row.owner_user_id,
    priority: row.priority,
    area: row.area,
    sourceId: row.source_id,
    title: row.title,
    rationale: row.rationale,
    evidence: row.evidence,
    sourceHref: row.source_href,
    numberedBuild: row.numbered_build,
    createdAt: row.created_at.toISOString()
  };
}

function assertCandidate(candidate: ProductionLearningVIIICandidate) {
  if (!PRODUCTION_LEARNING_VIII_PRIORITIES.includes(candidate.priority)) {
    throw new Error("production_learning_viii_candidate_priority_invalid");
  }
  if (!PRODUCTION_LEARNING_VIII_AREAS.includes(candidate.area)) {
    throw new Error("production_learning_viii_candidate_area_invalid");
  }
}

export async function buildLiveProductionLearningVIIIForUser(
  userId: string
) {
  const readiness = await listMasterProductionReadinessForUser(userId);
  return buildProductionLearningVIII({ readiness });
}

export async function listProductionLearningVIIIForUser(
  userId: string
) {
  const [live, persisted] = await Promise.all([
    buildLiveProductionLearningVIIIForUser(userId),
    withUserDatabase(userId, async (client) => {
      await requireSuiteAdmin(client);

      const [snapshots, candidates] = await Promise.all([
        client.query<SnapshotRow>(
          `select snapshot_id,owner_user_id,suite_acceptance,
                  accepted_sources,ready_for_owner_sources,hold_sources,
                  failed_sources,stale_sources,unresolved_sources,
                  candidate_count,evidence_snapshot,model_snapshot,
                  generated_by,generated_at
           from app.production_learning_viii_snapshots
           where owner_user_id=$1
           order by generated_at desc
           limit 60`,
          [userId]
        ),
        client.query<CandidateRow>(
          `select candidate_id,snapshot_id,owner_user_id,priority,area,
                  source_id,title,rationale,evidence,source_href,
                  numbered_build,created_at
           from app.production_learning_viii_candidates
           where owner_user_id=$1
           order by created_at desc
           limit 720`,
          [userId]
        )
      ]);

      return {
        snapshots: snapshots.rows.map(snapshotRow),
        candidates: candidates.rows.map(candidateRow)
      };
    })
  ]);

  const latestSnapshot = persisted.snapshots[0] ?? null;
  const latestCandidates = latestSnapshot
    ? persisted.candidates.filter(
        (item) => item.snapshotId === latestSnapshot.snapshotId
      )
    : [];

  return {
    live,
    snapshots: persisted.snapshots,
    latestSnapshot,
    latestCandidates,
    boundaries: {
      refreshIsEvidenceCaptureOnly: true as const,
      candidateExecutesWork: false as const,
      candidateAssignsBuildNumber: false as const,
      ownerAuthorizationRequiredForBuild351Plus: true as const,
      nextBuildNumber: null
    }
  };
}

export async function refreshProductionLearningVIII(userId: string) {
  const live = await buildLiveProductionLearningVIIIForUser(userId);

  for (const candidate of live.candidates) {
    assertCandidate(candidate);
  }

  return withUserDatabase(userId, async (client) => {
    await requireSuiteAdmin(client);
    await client.query(
      "select pg_advisory_xact_lock(hashtext($1))",
      ["production-learning-viii:" + userId]
    );

    const snapshotId = randomUUID();
    await client.query(
      `insert into app.production_learning_viii_snapshots (
         snapshot_id,owner_user_id,suite_acceptance,accepted_sources,
         ready_for_owner_sources,hold_sources,failed_sources,stale_sources,
         unresolved_sources,candidate_count,evidence_snapshot,model_snapshot,
         generated_by
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13
       )`,
      [
        snapshotId,
        userId,
        live.summary.suiteAcceptance,
        live.summary.accepted,
        live.summary.readyForOwner,
        live.summary.hold,
        live.summary.failed,
        live.summary.stale,
        live.summary.unresolvedSources,
        live.summary.candidateCount,
        JSON.stringify({
          sourceOutcomes: live.sourceOutcomes,
          build349SourceOfTruth: live.acceptance.build349RemainsSourceOfTruth
        }),
        JSON.stringify(live),
        userId
      ]
    );

    for (const candidate of live.candidates) {
      await client.query(
        `insert into app.production_learning_viii_candidates (
           candidate_id,snapshot_id,owner_user_id,priority,area,source_id,
           title,rationale,evidence,source_href,numbered_build
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,null)`,
        [
          randomUUID(),
          snapshotId,
          userId,
          candidate.priority,
          candidate.area,
          candidate.sourceId,
          candidate.title,
          candidate.rationale,
          candidate.evidence,
          candidate.sourceHref
        ]
      );
    }

    return { snapshotId, live };
  });
}
