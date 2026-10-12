import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { listWorkspacesForUser, withUserDatabase } from "./database";
import {
  INTEGRATION_CONTRACTS,
  INTEGRATION_PACKAGE_TTL_MS,
  integrationConsumerConfiguration,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  type IntegrationOperation,
  type IntegrationPackageV1,
  type IntegrationScalar,
  type IntegrationTarget,
  validateIntegrationPackage
} from "./integration-delivery";

type JsonRecord = Record<string, unknown>;
type WorkspaceRole = "owner" | "admin" | "member";
export type PublicationBridgeTransport = "conformance" | "live";
export type PublicationBridgeReceiptStatus =
  | "accepted"
  | "rejected"
  | "transport-error";

export interface PublicationBridgePublication {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  publicationId: string;
  title: string;
  sourceUrl: string;
  status: "published" | "withdrawn";
  publicationFingerprint: string;
  rowCount: number;
  fieldOrder: string[];
  publishedRows: JsonRecord[];
  reviewApprovedAt: string;
  publishedAt: string;
}

export interface PublicationDeliveryMapping {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  mappingId: string;
  publicationId: string;
  target: IntegrationTarget;
  status: "active" | "retired";
  integrationKeyField: string;
  operationAction: "create" | "update";
  evidenceUrlField: string | null;
  evidenceTimestampField: string;
  fieldMap: Record<string, string>;
  mappingFingerprint: string;
  createdBy: string;
  createdAt: string;
  retiredBy: string | null;
  retiredAt: string | null;
  retirementNote: string;
  canManage: boolean;
  readiness: {
    ready: boolean;
    blockers: string[];
  };
}

export interface PublicationDeliveryReceipt {
  workspaceId: string;
  workspaceName: string;
  receiptId: string;
  mappingId: string;
  publicationId: string;
  publicationFingerprint: string;
  mappingFingerprint: string;
  target: IntegrationTarget;
  transportMode: PublicationBridgeTransport;
  consumerId: string;
  packageId: string;
  replayKey: string;
  packageFingerprint: string;
  receiptStatus: PublicationBridgeReceiptStatus;
  validationCode: string;
  dryRun: boolean;
  consumerReceivedAt: string | null;
  actorUserId: string;
  details: JsonRecord;
  createdAt: string;
}

export interface PublicationDeliveryBridgeModel {
  workspaces: Array<{ id: string; name: string; role: WorkspaceRole }>;
  publications: PublicationBridgePublication[];
  mappings: PublicationDeliveryMapping[];
  receipts: PublicationDeliveryReceipt[];
  contracts: Array<{
    target: IntegrationTarget;
    allowedFields: string[];
    configured: boolean;
    endpointOrigin: string | null;
  }>;
  totals: {
    published: number;
    activeMappings: number;
    readyMappings: number;
    acceptedReceipts: number;
  };
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonRecord)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, canonical(nested)])
    );
  }
  return value;
}

function sha256(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

function isScalar(value: unknown): value is IntegrationScalar {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isHttpUrl(value: unknown) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isDate(value: unknown) {
  return typeof value === "string" && Boolean(value) && !Number.isNaN(Date.parse(value));
}

export function publicationDeliveryAllowedFields(target: IntegrationTarget) {
  return [...(INTEGRATION_CONTRACTS[target].allowedFields as ReadonlySet<string>)].sort();
}

function mappingFingerprint(input: {
  publicationFingerprint: string;
  target: IntegrationTarget;
  integrationKeyField: string;
  operationAction: "create" | "update";
  evidenceUrlField: string | null;
  evidenceTimestampField: string;
  fieldMap: Record<string, string>;
}) {
  return "map1-" + sha256(input);
}

function normalizeMappingFieldMap(
  target: IntegrationTarget,
  fieldOrder: string[],
  raw: unknown
) {
  const object = asRecord(raw);
  const allowedTargets = new Set(publicationDeliveryAllowedFields(target));
  const availableSources = new Set(fieldOrder);
  const entries = Object.entries(object);
  if (!entries.length || entries.length > 60) {
    throw new Error("publication_delivery_field_map_invalid");
  }

  const normalized: Record<string, string> = {};
  for (const [targetField, sourceValue] of entries) {
    const sourceField = typeof sourceValue === "string" ? sourceValue.trim() : "";
    if (!allowedTargets.has(targetField) || !availableSources.has(sourceField)) {
      throw new Error("publication_delivery_field_map_invalid");
    }
    normalized[targetField] = sourceField;
  }
  return Object.fromEntries(Object.entries(normalized).sort(([a], [b]) => a.localeCompare(b)));
}

function integrationKeySuffix(value: IntegrationScalar) {
  if (value === null) throw new Error("publication_delivery_key_missing");
  const raw = String(value).trim();
  if (!raw) throw new Error("publication_delivery_key_missing");
  return encodeURIComponent(raw.toLowerCase()).slice(0, 180);
}

export function buildPublicationBridgePackage(
  publication: PublicationBridgePublication,
  mapping: Pick<
    PublicationDeliveryMapping,
    | "mappingId"
    | "target"
    | "integrationKeyField"
    | "operationAction"
    | "evidenceUrlField"
    | "evidenceTimestampField"
    | "fieldMap"
    | "mappingFingerprint"
    | "status"
  >,
  now = new Date()
): IntegrationPackageV1 {
  if (publication.status !== "published") {
    throw new Error("publication_delivery_publication_withdrawn");
  }
  if (mapping.status !== "active") {
    throw new Error("publication_delivery_mapping_retired");
  }
  if (!publication.publishedRows.length || publication.publishedRows.length > 500) {
    throw new Error("publication_delivery_rows_invalid");
  }

  const contract = INTEGRATION_CONTRACTS[mapping.target];
  const keys = new Set<string>();
  const operations: IntegrationOperation[] = publication.publishedRows.map((row) => {
    const keyValue = row[mapping.integrationKeyField];
    if (!isScalar(keyValue)) throw new Error("publication_delivery_key_invalid");
    const integrationKey =
      contract.integrationKeyPrefix + integrationKeySuffix(keyValue);
    if (keys.has(integrationKey)) {
      throw new Error("publication_delivery_duplicate_key");
    }
    keys.add(integrationKey);

    const evidenceUrl = mapping.evidenceUrlField
      ? row[mapping.evidenceUrlField]
      : publication.sourceUrl;
    const evidenceTimestamp = row[mapping.evidenceTimestampField];
    if (!isHttpUrl(evidenceUrl) || !isDate(evidenceTimestamp)) {
      throw new Error("publication_delivery_source_evidence_invalid");
    }

    const values: Record<string, IntegrationScalar> = {};
    for (const [targetField, sourceField] of Object.entries(mapping.fieldMap)) {
      const value = row[sourceField] ?? null;
      if (!isScalar(value)) {
        throw new Error("publication_delivery_non_scalar_value");
      }
      values[targetField] = value;
    }

    return {
      action: mapping.operationAction,
      integrationKey,
      values,
      sourceEvidence: {
        sourceUrl: String(evidenceUrl),
        retrievedAt: String(evidenceTimestamp)
      }
    };
  });

  const batchId = [
    "publication-bridge",
    publication.publicationId,
    publication.publicationFingerprint.slice(0, 24),
    mapping.mappingId,
    mapping.mappingFingerprint.slice(0, 24)
  ].join("::");
  const approvedAt = publication.reviewApprovedAt;
  const sourceDatasetUpdatedAt = publication.publishedAt;
  const fingerprint = integrationFingerprint({
    target: mapping.target,
    adapterContract: contract.adapterContract,
    contractVersion: 1,
    batchId,
    approvedAt,
    sourceDatasetUpdatedAt,
    operations
  });
  const packageId = integrationPackageId({
    target: mapping.target,
    batchId,
    approvedAt,
    fingerprint
  });
  const replayKey = integrationReplayKey({
    target: mapping.target,
    packageId,
    fingerprint
  });
  const generatedAt = now.toISOString();
  const result: IntegrationPackageV1 = {
    version: 1,
    schemaId: contract.schemaId,
    target: mapping.target,
    adapterContract: contract.adapterContract,
    contractVersion: 1,
    packageId,
    replayKey,
    batchId,
    approvedAt,
    sourceDatasetUpdatedAt,
    generatedAt,
    expiresAt: new Date(now.getTime() + INTEGRATION_PACKAGE_TTL_MS).toISOString(),
    fingerprint,
    operations
  };

  const validation = validateIntegrationPackage(result, {
    now,
    expectedTarget: mapping.target
  });
  if (!validation.valid) {
    throw new Error("publication_delivery_package_invalid:" + validation.code);
  }
  return result;
}

async function requireManager(client: PoolClient, workspaceId: string) {
  const result = await client.query<{ role: WorkspaceRole }>(
    `select role from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id', true),'')
     limit 1`,
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("publication_delivery_manager_required");
  }
  return role;
}

type PublicationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  publication_id: string;
  title: string;
  source_url: string;
  status: "published" | "withdrawn";
  publication_fingerprint: string;
  row_count: string | number;
  field_order: string[];
  published_rows: JsonRecord[];
  review_approved_at: Date;
  published_at: Date;
};

type MappingRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  mapping_id: string;
  publication_id: string;
  target: IntegrationTarget;
  status: "active" | "retired";
  integration_key_field: string;
  operation_action: "create" | "update";
  evidence_url_field: string | null;
  evidence_timestamp_field: string;
  field_map: Record<string, string>;
  mapping_fingerprint: string;
  created_by: string;
  created_at: Date;
  retired_by: string | null;
  retired_at: Date | null;
  retirement_note: string;
};

type ReceiptRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  receipt_id: string;
  mapping_id: string;
  publication_id: string;
  publication_fingerprint: string;
  mapping_fingerprint: string;
  target: IntegrationTarget;
  transport_mode: PublicationBridgeTransport;
  consumer_id: string;
  package_id: string;
  replay_key: string;
  package_fingerprint: string;
  receipt_status: PublicationBridgeReceiptStatus;
  validation_code: string;
  dry_run: boolean;
  consumer_received_at: Date | null;
  actor_user_id: string;
  details: JsonRecord;
  created_at: Date;
};

function publicationFromRow(
  row: PublicationRow,
  role: WorkspaceRole
): PublicationBridgePublication {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    publicationId: row.publication_id,
    title: row.title,
    sourceUrl: row.source_url,
    status: row.status,
    publicationFingerprint: row.publication_fingerprint,
    rowCount: Number(row.row_count),
    fieldOrder: Array.isArray(row.field_order) ? row.field_order : [],
    publishedRows: Array.isArray(row.published_rows) ? row.published_rows : [],
    reviewApprovedAt: row.review_approved_at.toISOString(),
    publishedAt: row.published_at.toISOString()
  };
}

function mappingBlockers(
  mapping: Omit<PublicationDeliveryMapping, "readiness">,
  publication: PublicationBridgePublication | undefined
) {
  const blockers: string[] = [];
  if (!publication) blockers.push("Publication evidence is unavailable.");
  else {
    if (publication.status !== "published") blockers.push("Publication is withdrawn.");
    if (!publication.fieldOrder.includes(mapping.integrationKeyField)) {
      blockers.push("Integration-key source field is not in the publication.");
    }
    if (!publication.fieldOrder.includes(mapping.evidenceTimestampField)) {
      blockers.push("Evidence timestamp field is not in the publication.");
    }
    if (
      mapping.evidenceUrlField &&
      !publication.fieldOrder.includes(mapping.evidenceUrlField)
    ) {
      blockers.push("Evidence URL field is not in the publication.");
    }
  }
  if (mapping.status !== "active") blockers.push("Mapping is retired.");
  try {
    if (publication && !blockers.length) {
      buildPublicationBridgePackage(publication, mapping);
    }
  } catch (error) {
    blockers.push(error instanceof Error ? error.message : "Package validation failed.");
  }
  return { ready: blockers.length === 0, blockers };
}

export async function listPublicationDeliveryBridgeForUser(
  userId: string
): Promise<PublicationDeliveryBridgeModel> {
  const workspaces = await listWorkspacesForUser(userId);
  const roles = new Map(workspaces.map((workspace) => [workspace.id, workspace.role as WorkspaceRole]));

  const data = await withUserDatabase(userId, async (client) => {
    const publications = await client.query<PublicationRow>(
      `select p.*, w.name as workspace_name
       from app.workspace_dataset_publications p
       join app.workspaces w on w.id=p.workspace_id
       order by p.published_at desc
       limit 200`
    );
    const mappings = await client.query<MappingRow>(
      `select m.*, w.name as workspace_name
       from app.workspace_publication_delivery_mappings m
       join app.workspaces w on w.id=m.workspace_id
       order by m.created_at desc
       limit 250`
    );
    const receipts = await client.query<ReceiptRow>(
      `select r.*, w.name as workspace_name
       from app.workspace_publication_delivery_receipts r
       join app.workspaces w on w.id=r.workspace_id
       order by r.created_at desc
       limit 250`
    );
    return {
      publications: publications.rows,
      mappings: mappings.rows,
      receipts: receipts.rows
    };
  });

  const publications = data.publications.map((row) =>
    publicationFromRow(row, roles.get(row.workspace_id) ?? "member")
  );
  const publicationById = new Map(
    publications.map((publication) => [
      publication.workspaceId + ":" + publication.publicationId,
      publication
    ])
  );

  const mappings = data.mappings.map((row): PublicationDeliveryMapping => {
    const role = roles.get(row.workspace_id) ?? "member";
    const base = {
      workspaceId: row.workspace_id,
      workspaceName: row.workspace_name,
      role,
      mappingId: row.mapping_id,
      publicationId: row.publication_id,
      target: row.target,
      status: row.status,
      integrationKeyField: row.integration_key_field,
      operationAction: row.operation_action,
      evidenceUrlField: row.evidence_url_field,
      evidenceTimestampField: row.evidence_timestamp_field,
      fieldMap: asRecord(row.field_map) as Record<string, string>,
      mappingFingerprint: row.mapping_fingerprint,
      createdBy: row.created_by,
      createdAt: row.created_at.toISOString(),
      retiredBy: row.retired_by,
      retiredAt: row.retired_at?.toISOString() ?? null,
      retirementNote: row.retirement_note ?? "",
      canManage: role === "owner" || role === "admin"
    };
    return {
      ...base,
      readiness: mappingBlockers(
        base,
        publicationById.get(row.workspace_id + ":" + row.publication_id)
      )
    };
  });

  const receipts = data.receipts.map((row): PublicationDeliveryReceipt => ({
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    receiptId: row.receipt_id,
    mappingId: row.mapping_id,
    publicationId: row.publication_id,
    publicationFingerprint: row.publication_fingerprint,
    mappingFingerprint: row.mapping_fingerprint,
    target: row.target,
    transportMode: row.transport_mode,
    consumerId: row.consumer_id,
    packageId: row.package_id,
    replayKey: row.replay_key,
    packageFingerprint: row.package_fingerprint,
    receiptStatus: row.receipt_status,
    validationCode: row.validation_code,
    dryRun: row.dry_run,
    consumerReceivedAt: row.consumer_received_at?.toISOString() ?? null,
    actorUserId: row.actor_user_id,
    details: asRecord(row.details),
    createdAt: row.created_at.toISOString()
  }));

  const contracts = (["rosie-dazzlers", "devil-n-dove"] as const).map((target) => {
    const config = integrationConsumerConfiguration(target);
    return {
      target,
      allowedFields: publicationDeliveryAllowedFields(target),
      configured: config.configured,
      endpointOrigin: config.endpointOrigin
    };
  });

  return {
    workspaces: workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      role: workspace.role as WorkspaceRole
    })),
    publications,
    mappings,
    receipts,
    contracts,
    totals: {
      published: publications.filter((publication) => publication.status === "published").length,
      activeMappings: mappings.filter((mapping) => mapping.status === "active").length,
      readyMappings: mappings.filter((mapping) => mapping.readiness.ready).length,
      acceptedReceipts: receipts.filter((receipt) => receipt.receiptStatus === "accepted").length
    }
  };
}

export async function createPublicationDeliveryMapping(
  userId: string,
  input: {
    workspaceId: string;
    publicationId: string;
    target: IntegrationTarget;
    integrationKeyField: string;
    operationAction: "create" | "update";
    evidenceUrlField?: string | null;
    evidenceTimestampField: string;
    fieldMap: unknown;
  }
) {
  return withUserDatabase(userId, async (client) => {
    const role = await requireManager(client, input.workspaceId);
    const publicationResult = await client.query<PublicationRow>(
      `select p.*, w.name as workspace_name
       from app.workspace_dataset_publications p
       join app.workspaces w on w.id=p.workspace_id
       where p.workspace_id=$1 and p.publication_id=$2
       limit 1`,
      [input.workspaceId, input.publicationId]
    );
    const row = publicationResult.rows[0];
    if (!row) throw new Error("publication_delivery_publication_not_found");
    const publication = publicationFromRow(row, role);
    if (publication.status !== "published") {
      throw new Error("publication_delivery_publication_withdrawn");
    }

    const integrationKeyField = input.integrationKeyField.trim();
    const evidenceTimestampField = input.evidenceTimestampField.trim();
    const evidenceUrlField = input.evidenceUrlField?.trim() || null;
    const fields = new Set(publication.fieldOrder);
    if (
      !fields.has(integrationKeyField) ||
      !fields.has(evidenceTimestampField) ||
      (evidenceUrlField && !fields.has(evidenceUrlField))
    ) {
      throw new Error("publication_delivery_mapping_source_field_invalid");
    }
    if (input.operationAction !== "create" && input.operationAction !== "update") {
      throw new Error("publication_delivery_action_invalid");
    }

    const fieldMap = normalizeMappingFieldMap(
      input.target,
      publication.fieldOrder,
      input.fieldMap
    );
    const fingerprint = mappingFingerprint({
      publicationFingerprint: publication.publicationFingerprint,
      target: input.target,
      integrationKeyField,
      operationAction: input.operationAction,
      evidenceUrlField,
      evidenceTimestampField,
      fieldMap
    });

    const existing = await client.query<{ mapping_id: string }>(
      `select mapping_id
       from app.workspace_publication_delivery_mappings
       where workspace_id=$1
         and publication_id=$2
         and target=$3
         and mapping_fingerprint=$4
       limit 1`,
      [input.workspaceId, input.publicationId, input.target, fingerprint]
    );
    if (existing.rows[0]) return existing.rows[0].mapping_id;

    const mappingId = randomUUID();
    const candidate: PublicationDeliveryMapping = {
      workspaceId: input.workspaceId,
      workspaceName: publication.workspaceName,
      role,
      mappingId,
      publicationId: publication.publicationId,
      target: input.target,
      status: "active",
      integrationKeyField,
      operationAction: input.operationAction,
      evidenceUrlField,
      evidenceTimestampField,
      fieldMap,
      mappingFingerprint: fingerprint,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      retiredBy: null,
      retiredAt: null,
      retirementNote: "",
      canManage: true,
      readiness: { ready: true, blockers: [] }
    };

    buildPublicationBridgePackage(publication, candidate);

    await client.query(
      `insert into app.workspace_publication_delivery_mappings (
        workspace_id,mapping_id,publication_id,target,status,
        integration_key_field,operation_action,evidence_url_field,
        evidence_timestamp_field,field_map,mapping_fingerprint,created_by
      ) values ($1,$2,$3,$4,'active',$5,$6,$7,$8,$9::jsonb,$10,$11)`,
      [
        input.workspaceId,
        mappingId,
        input.publicationId,
        input.target,
        integrationKeyField,
        input.operationAction,
        evidenceUrlField,
        evidenceTimestampField,
        JSON.stringify(fieldMap),
        fingerprint,
        userId
      ]
    );
    return mappingId;
  });
}

export async function retirePublicationDeliveryMapping(
  userId: string,
  input: {
    workspaceId: string;
    mappingId: string;
    retirementNote?: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const result = await client.query(
      `update app.workspace_publication_delivery_mappings
       set status='retired',
           retired_by=$3,
           retired_at=now(),
           retirement_note=$4
       where workspace_id=$1 and mapping_id=$2 and status='active'`,
      [
        input.workspaceId,
        input.mappingId,
        userId,
        (input.retirementNote ?? "").trim().slice(0, 4000)
      ]
    );
    if (!result.rowCount) throw new Error("publication_delivery_mapping_not_active");
  });
}

export async function loadPublicationDeliveryPackage(
  userId: string,
  input: {
    workspaceId: string;
    mappingId: string;
    now?: Date;
  }
) {
  return withUserDatabase(userId, async (client) => {
    const role = await requireManager(client, input.workspaceId);
    const result = await client.query<PublicationRow & MappingRow>(
      `select
        p.workspace_id,
        w.name as workspace_name,
        p.publication_id,
        p.title,
        p.source_url,
        p.status as publication_status,
        p.publication_fingerprint,
        p.row_count,
        p.field_order,
        p.published_rows,
        p.review_approved_at,
        p.published_at,
        m.mapping_id,
        m.target,
        m.status as mapping_status,
        m.integration_key_field,
        m.operation_action,
        m.evidence_url_field,
        m.evidence_timestamp_field,
        m.field_map,
        m.mapping_fingerprint,
        m.created_by,
        m.created_at,
        m.retired_by,
        m.retired_at,
        m.retirement_note
       from app.workspace_publication_delivery_mappings m
       join app.workspace_dataset_publications p
         on p.workspace_id=m.workspace_id and p.publication_id=m.publication_id
       join app.workspaces w on w.id=m.workspace_id
       where m.workspace_id=$1 and m.mapping_id=$2
       limit 1`,
      [input.workspaceId, input.mappingId]
    );
    const row = result.rows[0] as (PublicationRow & MappingRow & {
      publication_status: "published" | "withdrawn";
      mapping_status: "active" | "retired";
    }) | undefined;
    if (!row) throw new Error("publication_delivery_mapping_not_found");

    const publication = publicationFromRow(
      {
        ...row,
        status: row.publication_status
      } as PublicationRow,
      role
    );
    const mapping: PublicationDeliveryMapping = {
      workspaceId: row.workspace_id,
      workspaceName: row.workspace_name,
      role,
      mappingId: row.mapping_id,
      publicationId: row.publication_id,
      target: row.target,
      status: row.mapping_status,
      integrationKeyField: row.integration_key_field,
      operationAction: row.operation_action,
      evidenceUrlField: row.evidence_url_field,
      evidenceTimestampField: row.evidence_timestamp_field,
      fieldMap: asRecord(row.field_map) as Record<string, string>,
      mappingFingerprint: row.mapping_fingerprint,
      createdBy: row.created_by,
      createdAt: row.created_at.toISOString(),
      retiredBy: row.retired_by,
      retiredAt: row.retired_at?.toISOString() ?? null,
      retirementNote: row.retirement_note ?? "",
      canManage: true,
      readiness: { ready: true, blockers: [] }
    };
    const packageValue = buildPublicationBridgePackage(
      publication,
      mapping,
      input.now ?? new Date()
    );
    return { publication, mapping, package: packageValue };
  });
}

export async function recordPublicationDeliveryReceipt(
  userId: string,
  input: {
    workspaceId: string;
    mappingId: string;
    publicationId: string;
    publicationFingerprint: string;
    mappingFingerprint: string;
    target: IntegrationTarget;
    transportMode: PublicationBridgeTransport;
    consumerId: string;
    package: IntegrationPackageV1;
    receiptStatus: PublicationBridgeReceiptStatus;
    validationCode: string;
    dryRun: boolean;
    consumerReceivedAt?: string | null;
    details?: JsonRecord;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    await client.query(
      `insert into app.workspace_publication_delivery_receipts (
        workspace_id,receipt_id,mapping_id,publication_id,
        publication_fingerprint,mapping_fingerprint,target,transport_mode,
        consumer_id,package_id,replay_key,package_fingerprint,receipt_status,
        validation_code,dry_run,consumer_received_at,actor_user_id,details
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb
      )`,
      [
        input.workspaceId,
        randomUUID(),
        input.mappingId,
        input.publicationId,
        input.publicationFingerprint,
        input.mappingFingerprint,
        input.target,
        input.transportMode,
        input.consumerId.slice(0, 256),
        input.package.packageId,
        input.package.replayKey,
        input.package.fingerprint,
        input.receiptStatus,
        input.validationCode.slice(0, 96),
        input.dryRun,
        input.consumerReceivedAt && isDate(input.consumerReceivedAt)
          ? input.consumerReceivedAt
          : null,
        userId,
        JSON.stringify(input.details ?? {})
      ]
    );
  });
}
