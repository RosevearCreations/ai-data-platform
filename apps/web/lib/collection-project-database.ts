import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { listWorkspacesForUser, withUserDatabase } from "./database";
import {
  aggregateProjectReadiness,
  deriveCollectionReadiness,
  parseCollectionProjectDraft,
  parseCollectionSourceDraft,
  type CollectionMethod,
  type CollectionProjectStatus,
  type CollectionSourceStatus
} from "./collection-projects";

type PolicyEvidence = {
  id: string;
  origin: string;
  collectionMethod: string;
  status: string;
  reviewExpiresAt: string;
};

type ScraperEvidence = {
  workspaceId: string;
  scraperId: string;
  sourceOrigin: string;
  deleted: boolean;
};

export interface CollectionProjectSourceRecord {
  sourceId: string;
  displayName: string;
  sourceUrl: string;
  sourceOrigin: string;
  collectionMethod: CollectionMethod;
  sourcePolicyId: string;
  savedScraperId: string;
  cadence: string;
  status: CollectionSourceStatus;
  notes: string;
  readiness: "ready" | "blocked" | "incomplete";
  blockers: string[];
  policy: {
    linked: boolean;
    approved: boolean;
    current: boolean;
    originMatches: boolean;
    methodMatches: boolean;
  };
  scraper: {
    requested: boolean;
    present: boolean;
    originMatches: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionProjectRecord {
  workspaceId: string;
  workspaceName: string;
  workspaceProfile: string;
  role: "owner" | "admin" | "member";
  canManage: boolean;
  projectId: string;
  name: string;
  purpose: string;
  status: CollectionProjectStatus;
  cadence: string;
  ownerLabel: string;
  notes: string;
  readiness: "ready" | "blocked" | "incomplete";
  sources: CollectionProjectSourceRecord[];
  createdAt: Date;
  updatedAt: Date;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function policiesFromPayload(value: unknown): PolicyEvidence[] {
  const payload = record(value);
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  return entries.flatMap((entry) => {
    const item = record(entry);
    if (!item) return [];
    const id = typeof item.id === "string" ? item.id : "";
    const origin = typeof item.origin === "string" ? item.origin.toLowerCase() : "";
    const collectionMethod =
      typeof item.collectionMethod === "string" ? item.collectionMethod : "";
    const status = typeof item.status === "string" ? item.status : "";
    const reviewExpiresAt =
      typeof item.reviewExpiresAt === "string" ? item.reviewExpiresAt : "";
    return id && origin
      ? [{ id, origin, collectionMethod, status, reviewExpiresAt }]
      : [];
  });
}

function policyIsCurrent(value: string) {
  const time = Date.parse(value);
  return Number.isFinite(time) && time > Date.now();
}

async function requireWorkspaceManager(client: PoolClient, workspaceId: string) {
  const result = await client.query<{ role: string }>(
    "select role from app.workspace_members where workspace_id=$1 and user_id=nullif(current_setting('app.user_id', true),'') limit 1",
    [workspaceId]
  );
  if (result.rows[0]?.role !== "owner" && result.rows[0]?.role !== "admin") {
    throw new Error("collection_project_admin_required");
  }
}

async function requireProjectManager(
  client: PoolClient,
  workspaceId: string,
  projectId: string
) {
  await requireWorkspaceManager(client, workspaceId);
  const result = await client.query(
    "select 1 from app.workspace_collection_projects where workspace_id=$1 and project_id=$2",
    [workspaceId, projectId]
  );
  if (!result.rowCount) throw new Error("collection_project_not_found");
}

export async function listCollectionProjectsForUser(userId: string) {
  return withUserDatabase(userId, async (client) => {
    const projects = await client.query<QueryResultRow>(`
      select
        cp.*,
        w.name as workspace_name,
        p.name as workspace_profile,
        wm.role
      from app.workspace_collection_projects cp
      join app.workspaces w on w.id=cp.workspace_id
      join app.workspace_profiles p on p.profile_key=w.profile_key
      join app.workspace_members wm
        on wm.workspace_id=cp.workspace_id
       and wm.user_id=nullif(current_setting('app.user_id', true),'')
      order by
        case cp.status when 'active' then 0 when 'planning' then 1 when 'paused' then 2 when 'complete' then 3 else 4 end,
        cp.updated_at desc,
        cp.name
    `);
    const sources = await client.query<QueryResultRow>(`
      select *
      from app.workspace_collection_project_sources
      order by updated_at desc, display_name
    `);
    const policyModules = await client.query<QueryResultRow>(`
      select workspace_id,payload
      from app.workspace_intelligence_modules
      where module_key='source-policy'
    `);
    const scrapers = await client.query<QueryResultRow>(`
      select workspace_id,scraper_id,source_origin,deleted_at
      from app.workspace_saved_scrapers
    `);

    const policiesByWorkspace = new Map<string, PolicyEvidence[]>();
    for (const row of policyModules.rows) {
      policiesByWorkspace.set(String(row.workspace_id), policiesFromPayload(row.payload));
    }
    const scraperEvidence: ScraperEvidence[] = scrapers.rows.map((row) => ({
      workspaceId: String(row.workspace_id),
      scraperId: String(row.scraper_id),
      sourceOrigin: String(row.source_origin ?? "").toLowerCase(),
      deleted: Boolean(row.deleted_at)
    }));

    return projects.rows.map((row): CollectionProjectRecord => {
      const workspaceId = String(row.workspace_id);
      const projectId = String(row.project_id);
      const projectSources = sources.rows
        .filter(
          (source) =>
            String(source.workspace_id) === workspaceId &&
            String(source.project_id) === projectId
        )
        .map((source): CollectionProjectSourceRecord => {
          const sourcePolicyId = String(source.source_policy_id ?? "");
          const sourceOrigin = String(source.source_origin).toLowerCase();
          const method = String(source.collection_method) as CollectionMethod;
          const linkedPolicy = sourcePolicyId
            ? (policiesByWorkspace.get(workspaceId) ?? []).find(
                (policy) => policy.id === sourcePolicyId
              ) ?? null
            : null;
          const savedScraperId = String(source.saved_scraper_id ?? "");
          const linkedScraper = savedScraperId
            ? scraperEvidence.find(
                (scraper) =>
                  scraper.workspaceId === workspaceId &&
                  scraper.scraperId === savedScraperId &&
                  !scraper.deleted
              ) ?? null
            : null;
          const policyLinked = Boolean(linkedPolicy);
          const policyApproved = linkedPolicy?.status === "approved";
          const policyCurrent = linkedPolicy
            ? policyIsCurrent(linkedPolicy.reviewExpiresAt)
            : false;
          const policyOriginMatches = linkedPolicy?.origin === sourceOrigin;
          const policyMethodMatches = linkedPolicy?.collectionMethod === method;
          const scraperRequested = Boolean(savedScraperId);
          const scraperPresent = Boolean(linkedScraper);
          const scraperOriginMatches =
            linkedScraper?.sourceOrigin === sourceOrigin;
          const readiness = deriveCollectionReadiness({
            lifecycleStatus: String(source.status) as CollectionSourceStatus,
            policyLinked,
            policyApproved,
            policyCurrent,
            policyOriginMatches,
            policyMethodMatches,
            scraperRequested,
            scraperPresent,
            scraperOriginMatches
          });
          return {
            sourceId: String(source.source_id),
            displayName: String(source.display_name),
            sourceUrl: String(source.source_url),
            sourceOrigin,
            collectionMethod: method,
            sourcePolicyId,
            savedScraperId,
            cadence: String(source.cadence ?? ""),
            status: String(source.status) as CollectionSourceStatus,
            notes: String(source.notes ?? ""),
            readiness: readiness.readiness,
            blockers: readiness.blockers,
            policy: {
              linked: policyLinked,
              approved: policyApproved,
              current: policyCurrent,
              originMatches: policyOriginMatches,
              methodMatches: policyMethodMatches
            },
            scraper: {
              requested: scraperRequested,
              present: scraperPresent,
              originMatches: scraperOriginMatches
            },
            createdAt: new Date(source.created_at),
            updatedAt: new Date(source.updated_at)
          };
        });
      const role = String(row.role) as "owner" | "admin" | "member";
      return {
        workspaceId,
        workspaceName: String(row.workspace_name),
        workspaceProfile: String(row.workspace_profile),
        role,
        canManage: role === "owner" || role === "admin",
        projectId,
        name: String(row.name),
        purpose: String(row.purpose ?? ""),
        status: String(row.status) as CollectionProjectStatus,
        cadence: String(row.cadence ?? ""),
        ownerLabel: String(row.owner_label ?? ""),
        notes: String(row.notes ?? ""),
        readiness: aggregateProjectReadiness(projectSources.filter((source) => source.status !== "retired")),
        sources: projectSources,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    });
  });
}

export async function collectionProjectOptionsForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const evidence = await withUserDatabase(userId, async (client) => {
    const policies = await client.query<QueryResultRow>(`
      select workspace_id,payload
      from app.workspace_intelligence_modules
      where module_key='source-policy'
    `);
    const scrapers = await client.query<QueryResultRow>(`
      select workspace_id,scraper_id,name,kind,source_origin,deleted_at
      from app.workspace_saved_scrapers
      where deleted_at is null
      order by name
    `);
    return {
      policies: policies.rows.flatMap((row) =>
        policiesFromPayload(row.payload).map((policy) => ({
          workspaceId: String(row.workspace_id),
          ...policy
        }))
      ),
      scrapers: scrapers.rows.map((row) => ({
        workspaceId: String(row.workspace_id),
        scraperId: String(row.scraper_id),
        name: String(row.name),
        kind: String(row.kind),
        sourceOrigin: String(row.source_origin ?? "")
      }))
    };
  });
  return { workspaces, ...evidence };
}

export async function createCollectionProject(
  userId: string,
  workspaceId: string,
  value: unknown
) {
  const draft = parseCollectionProjectDraft(value);
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceManager(client, workspaceId);
    const projectId = randomUUID();
    await client.query(
      `insert into app.workspace_collection_projects (
        workspace_id,project_id,name,purpose,status,cadence,owner_label,notes,created_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        workspaceId,
        projectId,
        draft.name,
        draft.purpose,
        draft.status,
        draft.cadence,
        draft.ownerLabel,
        draft.notes,
        userId
      ]
    );
    return { workspaceId, projectId };
  });
}

export async function updateCollectionProject(
  userId: string,
  workspaceId: string,
  projectId: string,
  value: unknown
) {
  const draft = parseCollectionProjectDraft(value);
  return withUserDatabase(userId, async (client) => {
    await requireProjectManager(client, workspaceId, projectId);
    const result = await client.query(
      `update app.workspace_collection_projects
       set name=$3,purpose=$4,status=$5,cadence=$6,owner_label=$7,notes=$8,updated_at=now()
       where workspace_id=$1 and project_id=$2 and status<>'archived'
       returning project_id`,
      [
        workspaceId,
        projectId,
        draft.name,
        draft.purpose,
        draft.status,
        draft.cadence,
        draft.ownerLabel,
        draft.notes
      ]
    );
    if (!result.rowCount) throw new Error("collection_project_not_editable");
    return { workspaceId, projectId };
  });
}

export async function archiveCollectionProject(
  userId: string,
  workspaceId: string,
  projectId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireProjectManager(client, workspaceId, projectId);
    const result = await client.query(
      `update app.workspace_collection_projects
       set status='archived',updated_at=now()
       where workspace_id=$1 and project_id=$2
       returning project_id`,
      [workspaceId, projectId]
    );
    if (!result.rowCount) throw new Error("collection_project_not_found");
    return { workspaceId, projectId, archived: true as const };
  });
}

export async function createCollectionProjectSource(
  userId: string,
  workspaceId: string,
  projectId: string,
  value: unknown
) {
  const draft = parseCollectionSourceDraft(value);
  return withUserDatabase(userId, async (client) => {
    await requireProjectManager(client, workspaceId, projectId);
    const sourceId = randomUUID();
    await client.query(
      `insert into app.workspace_collection_project_sources (
        workspace_id,project_id,source_id,display_name,source_url,source_origin,
        collection_method,source_policy_id,saved_scraper_id,cadence,status,notes,created_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        workspaceId,
        projectId,
        sourceId,
        draft.displayName,
        draft.sourceUrl,
        draft.sourceOrigin,
        draft.collectionMethod,
        draft.sourcePolicyId,
        draft.savedScraperId,
        draft.cadence,
        draft.status,
        draft.notes,
        userId
      ]
    );
    return { workspaceId, projectId, sourceId };
  });
}

export async function updateCollectionProjectSource(
  userId: string,
  workspaceId: string,
  projectId: string,
  sourceId: string,
  value: unknown
) {
  const draft = parseCollectionSourceDraft(value);
  return withUserDatabase(userId, async (client) => {
    await requireProjectManager(client, workspaceId, projectId);
    const result = await client.query(
      `update app.workspace_collection_project_sources
       set display_name=$4,source_url=$5,source_origin=$6,collection_method=$7,
           source_policy_id=$8,saved_scraper_id=$9,cadence=$10,status=$11,notes=$12,updated_at=now()
       where workspace_id=$1 and project_id=$2 and source_id=$3 and status<>'retired'
       returning source_id`,
      [
        workspaceId,
        projectId,
        sourceId,
        draft.displayName,
        draft.sourceUrl,
        draft.sourceOrigin,
        draft.collectionMethod,
        draft.sourcePolicyId,
        draft.savedScraperId,
        draft.cadence,
        draft.status,
        draft.notes
      ]
    );
    if (!result.rowCount) throw new Error("collection_source_not_editable");
    return { workspaceId, projectId, sourceId };
  });
}

export async function retireCollectionProjectSource(
  userId: string,
  workspaceId: string,
  projectId: string,
  sourceId: string
) {
  return withUserDatabase(userId, async (client) => {
    await requireProjectManager(client, workspaceId, projectId);
    const result = await client.query(
      `update app.workspace_collection_project_sources
       set status='retired',updated_at=now()
       where workspace_id=$1 and project_id=$2 and source_id=$3
       returning source_id`,
      [workspaceId, projectId, sourceId]
    );
    if (!result.rowCount) throw new Error("collection_source_not_found");
    return { workspaceId, projectId, sourceId, retired: true as const };
  });
}
