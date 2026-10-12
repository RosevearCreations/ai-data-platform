import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  buildPublicationBridgePackage,
  type PublicationBridgePublication,
  type PublicationDeliveryMapping
} from "./publication-delivery-bridge";
import {
  type ConsumerStateVerificationResponse,
  type IntegrationPackageV1,
  type IntegrationScalar,
  type IntegrationTarget
} from "./integration-delivery";
import {
  listControlledLiveDeliveryForUser,
  type ControlledLiveDelivery,
  type ControlledLiveDeliveryModel
} from "./controlled-live-delivery";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export type ReconciliationStatus =
  | "matched"
  | "drift"
  | "rejected"
  | "transport-error";

export interface ReconciliationRecordResult {
  integrationKey: string;
  status: "matched" | "mismatched" | "missing";
  expectedFingerprint: string;
  observedFingerprint: string | null;
  differingFields: string[];
}

export interface LiveDeliveryReconciliation {
  workspaceId: string;
  workspaceName: string;
  reconciliationId: string;
  deliveryId: string;
  activationId: string;
  mappingId: string;
  publicationId: string;
  target: IntegrationTarget;
  consumerId: string;
  packageId: string;
  replayKey: string;
  packageFingerprint: string;
  status: ReconciliationStatus;
  expectedRecordCount: number;
  matchedCount: number;
  mismatchedCount: number;
  missingCount: number;
  validationCode: string;
  httpStatus: number | null;
  consumerVerifiedAt: string | null;
  verificationFingerprint: string;
  recordResults: ReconciliationRecordResult[];
  actorUserId: string;
  createdAt: string;
}

export interface PostDeliveryReconciliationModel {
  live: ControlledLiveDeliveryModel;
  reconciliations: LiveDeliveryReconciliation[];
  totals: {
    acceptedLiveDeliveries: number;
    neverVerified: number;
    matchedLatest: number;
    driftLatest: number;
    verificationErrors: number;
  };
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonRecord)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonical(nested)])
    );
  }
  return value;
}

function fingerprint(prefix: string, value: unknown) {
  return (
    prefix +
    createHash("sha256")
      .update(JSON.stringify(canonical(value)))
      .digest("hex")
  );
}

function scalarEqual(left: IntegrationScalar, right: IntegrationScalar) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function valuesFingerprint(values: Record<string, IntegrationScalar>) {
  return fingerprint("state1-", values);
}

export function reconciliationErrorFingerprint(input: {
  packageId: string;
  replayKey: string;
  packageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("verify1-", input);
}

export function compareConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  if (response.status === "rejected") {
    return {
      status: "rejected" as const,
      expectedRecordCount: integrationPackage.operations.length,
      matchedCount: 0,
      mismatchedCount: 0,
      missingCount: 0,
      recordResults: [] as ReconciliationRecordResult[],
      verificationFingerprint: fingerprint("verify1-", {
        packageId: integrationPackage.packageId,
        replayKey: integrationPackage.replayKey,
        packageFingerprint: integrationPackage.fingerprint,
        status: response.status,
        code: response.code,
        verifiedAt: response.verifiedAt
      })
    };
  }

  const observedByKey = new Map(
    response.records.map((record) => [record.integrationKey, record])
  );
  const recordResults: ReconciliationRecordResult[] =
    integrationPackage.operations.map((operation) => {
      const expected = operation.values;
      const expectedFingerprint = valuesFingerprint(expected);
      const observed = observedByKey.get(operation.integrationKey);

      if (!observed || observed.status === "missing") {
        return {
          integrationKey: operation.integrationKey,
          status: "missing" as const,
          expectedFingerprint,
          observedFingerprint: null,
          differingFields: Object.keys(expected).sort()
        };
      }

      const observedSubset: Record<string, IntegrationScalar> = {};
      const differingFields: string[] = [];
      for (const [field, expectedValue] of Object.entries(expected)) {
        const hasField = Object.prototype.hasOwnProperty.call(
          observed.values,
          field
        );
        const observedValue = hasField ? observed.values[field] : null;
        observedSubset[field] = observedValue;
        if (!hasField || !scalarEqual(expectedValue, observedValue)) {
          differingFields.push(field);
        }
      }

      return {
        integrationKey: operation.integrationKey,
        status:
          differingFields.length === 0
            ? ("matched" as const)
            : ("mismatched" as const),
        expectedFingerprint,
        observedFingerprint: valuesFingerprint(observedSubset),
        differingFields: differingFields.sort()
      };
    });

  const matchedCount = recordResults.filter(
    (record) => record.status === "matched"
  ).length;
  const mismatchedCount = recordResults.filter(
    (record) => record.status === "mismatched"
  ).length;
  const missingCount = recordResults.filter(
    (record) => record.status === "missing"
  ).length;
  const status =
    mismatchedCount === 0 && missingCount === 0
      ? ("matched" as const)
      : ("drift" as const);

  return {
    status,
    expectedRecordCount: integrationPackage.operations.length,
    matchedCount,
    mismatchedCount,
    missingCount,
    recordResults,
    verificationFingerprint: fingerprint("verify1-", {
      packageId: integrationPackage.packageId,
      replayKey: integrationPackage.replayKey,
      packageFingerprint: integrationPackage.fingerprint,
      status,
      code: response.code,
      verifiedAt: response.verifiedAt,
      recordResults
    })
  };
}

async function requireManager(client: PoolClient, workspaceId: string) {
  const result = await client.query<{ role: WorkspaceRole }>(
    `select role
     from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id', true),'')
     limit 1`,
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("delivery_reconciliation_manager_required");
  }
  return role;
}

type ReconciliationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  reconciliation_id: string;
  delivery_id: string;
  activation_id: string;
  mapping_id: string;
  publication_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  package_id: string;
  replay_key: string;
  package_fingerprint: string;
  status: ReconciliationStatus;
  expected_record_count: string | number;
  matched_count: string | number;
  mismatched_count: string | number;
  missing_count: string | number;
  validation_code: string;
  http_status: string | number | null;
  consumer_verified_at: Date | null;
  verification_fingerprint: string;
  record_results: ReconciliationRecordResult[];
  actor_user_id: string;
  created_at: Date;
};

function rowToReconciliation(
  row: ReconciliationRow
): LiveDeliveryReconciliation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    reconciliationId: row.reconciliation_id,
    deliveryId: row.delivery_id,
    activationId: row.activation_id,
    mappingId: row.mapping_id,
    publicationId: row.publication_id,
    target: row.target,
    consumerId: row.consumer_id,
    packageId: row.package_id,
    replayKey: row.replay_key,
    packageFingerprint: row.package_fingerprint,
    status: row.status,
    expectedRecordCount: Number(row.expected_record_count),
    matchedCount: Number(row.matched_count),
    mismatchedCount: Number(row.mismatched_count),
    missingCount: Number(row.missing_count),
    validationCode: row.validation_code,
    httpStatus: row.http_status === null ? null : Number(row.http_status),
    consumerVerifiedAt: row.consumer_verified_at?.toISOString() ?? null,
    verificationFingerprint: row.verification_fingerprint,
    recordResults: Array.isArray(row.record_results)
      ? row.record_results
      : [],
    actorUserId: row.actor_user_id,
    createdAt: row.created_at.toISOString()
  };
}

export async function listPostDeliveryReconciliationForUser(
  userId: string
): Promise<PostDeliveryReconciliationModel> {
  const live = await listControlledLiveDeliveryForUser(userId);
  const rows = await withUserDatabase(userId, async (client) => {
    const result = await client.query<ReconciliationRow>(
      `select r.*, w.name as workspace_name
       from app.workspace_live_delivery_reconciliations r
       join app.workspaces w on w.id=r.workspace_id
       order by r.created_at desc
       limit 500`
    );
    return result.rows;
  });
  const reconciliations = rows.map(rowToReconciliation);

  const latestByDelivery = new Map<string, LiveDeliveryReconciliation>();
  for (const reconciliation of reconciliations) {
    const key =
      reconciliation.workspaceId + ":" + reconciliation.deliveryId;
    if (!latestByDelivery.has(key)) {
      latestByDelivery.set(key, reconciliation);
    }
  }

  const accepted = live.deliveries.filter(
    (delivery) => delivery.status === "accepted"
  );
  let neverVerified = 0;
  let matchedLatest = 0;
  let driftLatest = 0;
  let verificationErrors = 0;
  for (const delivery of accepted) {
    const latest = latestByDelivery.get(
      delivery.workspaceId + ":" + delivery.deliveryId
    );
    if (!latest) {
      neverVerified += 1;
    } else if (latest.status === "matched") {
      matchedLatest += 1;
    } else if (latest.status === "drift") {
      driftLatest += 1;
    } else {
      verificationErrors += 1;
    }
  }

  return {
    live,
    reconciliations,
    totals: {
      acceptedLiveDeliveries: accepted.length,
      neverVerified,
      matchedLatest,
      driftLatest,
      verificationErrors
    }
  };
}

export async function loadAcceptedDeliveryReconciliationContext(
  userId: string,
  input: {
    workspaceId: string;
    deliveryId: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    const role = await requireManager(client, input.workspaceId);
    const result = await client.query<QueryResultRow & {
      workspace_id: string;
      workspace_name: string;
      delivery_id: string;
      activation_id: string;
      mapping_id: string;
      publication_id: string;
      target: IntegrationTarget;
      consumer_id: string;
      delivery_status: "accepted" | "rejected" | "transport-error" | "reserved";
      package_id: string;
      replay_key: string;
      package_fingerprint: string;
      delivery_created_at: Date;
      title: string;
      source_url: string;
      publication_fingerprint: string;
      row_count: string | number;
      field_order: string[];
      published_rows: JsonRecord[];
      review_approved_at: Date;
      published_at: Date;
      integration_key_field: string;
      operation_action: "create" | "update";
      evidence_url_field: string | null;
      evidence_timestamp_field: string;
      field_map: Record<string, string>;
      mapping_fingerprint: string;
      mapping_created_by: string;
      mapping_created_at: Date;
    }>(
      `select
        d.workspace_id,
        w.name as workspace_name,
        d.delivery_id,
        d.activation_id,
        d.mapping_id,
        d.publication_id,
        d.target,
        d.consumer_id,
        d.status as delivery_status,
        d.package_id,
        d.replay_key,
        d.package_fingerprint,
        d.created_at as delivery_created_at,
        p.title,
        p.source_url,
        p.publication_fingerprint,
        p.row_count,
        p.field_order,
        p.published_rows,
        p.review_approved_at,
        p.published_at,
        m.integration_key_field,
        m.operation_action,
        m.evidence_url_field,
        m.evidence_timestamp_field,
        m.field_map,
        m.mapping_fingerprint,
        m.created_by as mapping_created_by,
        m.created_at as mapping_created_at
       from app.workspace_publication_live_deliveries d
       join app.workspace_dataset_publications p
         on p.workspace_id=d.workspace_id and p.publication_id=d.publication_id
       join app.workspace_publication_delivery_mappings m
         on m.workspace_id=d.workspace_id and m.mapping_id=d.mapping_id
       join app.workspaces w on w.id=d.workspace_id
       where d.workspace_id=$1 and d.delivery_id=$2
       limit 1`,
      [input.workspaceId, input.deliveryId]
    );
    const row = result.rows[0];
    if (!row) throw new Error("delivery_reconciliation_delivery_not_found");
    if (row.delivery_status !== "accepted") {
      throw new Error("delivery_reconciliation_accepted_delivery_required");
    }

    const publication: PublicationBridgePublication = {
      workspaceId: row.workspace_id,
      workspaceName: row.workspace_name,
      role,
      publicationId: row.publication_id,
      title: row.title,
      sourceUrl: row.source_url,
      status: "published",
      publicationFingerprint: row.publication_fingerprint,
      rowCount: Number(row.row_count),
      fieldOrder: Array.isArray(row.field_order) ? row.field_order : [],
      publishedRows: Array.isArray(row.published_rows) ? row.published_rows : [],
      reviewApprovedAt: row.review_approved_at.toISOString(),
      publishedAt: row.published_at.toISOString()
    };

    const mapping: PublicationDeliveryMapping = {
      workspaceId: row.workspace_id,
      workspaceName: row.workspace_name,
      role,
      mappingId: row.mapping_id,
      publicationId: row.publication_id,
      target: row.target,
      status: "active",
      integrationKeyField: row.integration_key_field,
      operationAction: row.operation_action,
      evidenceUrlField: row.evidence_url_field,
      evidenceTimestampField: row.evidence_timestamp_field,
      fieldMap: row.field_map ?? {},
      mappingFingerprint: row.mapping_fingerprint,
      createdBy: row.mapping_created_by,
      createdAt: row.mapping_created_at.toISOString(),
      retiredBy: null,
      retiredAt: null,
      retirementNote: "",
      canManage: true,
      readiness: { ready: true, blockers: [] }
    };

    const integrationPackage = buildPublicationBridgePackage(
      publication,
      mapping,
      row.delivery_created_at
    );
    if (
      integrationPackage.packageId !== row.package_id ||
      integrationPackage.replayKey !== row.replay_key ||
      integrationPackage.fingerprint !== row.package_fingerprint
    ) {
      throw new Error("delivery_reconciliation_package_identity_changed");
    }

    const delivery: ControlledLiveDelivery = {
      workspaceId: row.workspace_id,
      workspaceName: row.workspace_name,
      deliveryId: row.delivery_id,
      activationId: row.activation_id,
      mappingId: row.mapping_id,
      publicationId: row.publication_id,
      target: row.target,
      consumerId: row.consumer_id,
      publicationFingerprint: row.publication_fingerprint,
      mappingFingerprint: row.mapping_fingerprint,
      activationFingerprint: "",
      packageId: row.package_id,
      replayKey: row.replay_key,
      packageFingerprint: row.package_fingerprint,
      idempotencyKey: row.replay_key,
      status: "accepted",
      attemptCount: 1,
      validationCode: "accepted",
      httpStatus: null,
      consumerReceivedAt: null,
      acknowledgement: {},
      createdBy: "",
      createdAt: row.delivery_created_at.toISOString(),
      lastAttemptAt: row.delivery_created_at.toISOString(),
      updatedAt: row.delivery_created_at.toISOString()
    };

    return {
      delivery,
      publication,
      mapping,
      package: integrationPackage
    };
  });
}

export async function recordLiveDeliveryReconciliation(
  userId: string,
  input: {
    workspaceId: string;
    deliveryId: string;
    activationId: string;
    mappingId: string;
    publicationId: string;
    target: IntegrationTarget;
    consumerId: string;
    package: IntegrationPackageV1;
    status: ReconciliationStatus;
    expectedRecordCount: number;
    matchedCount: number;
    mismatchedCount: number;
    missingCount: number;
    validationCode: string;
    httpStatus?: number | null;
    consumerVerifiedAt?: string | null;
    verificationFingerprint: string;
    recordResults: ReconciliationRecordResult[];
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const reconciliationId = randomUUID();
    await client.query(
      `insert into app.workspace_live_delivery_reconciliations (
        workspace_id,reconciliation_id,delivery_id,activation_id,mapping_id,
        publication_id,target,consumer_id,package_id,replay_key,
        package_fingerprint,status,expected_record_count,matched_count,
        mismatched_count,missing_count,validation_code,http_status,
        consumer_verified_at,verification_fingerprint,record_results,
        actor_user_id
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19::timestamptz,$20,$21::jsonb,$22
      )`,
      [
        input.workspaceId,
        reconciliationId,
        input.deliveryId,
        input.activationId,
        input.mappingId,
        input.publicationId,
        input.target,
        input.consumerId,
        input.package.packageId,
        input.package.replayKey,
        input.package.fingerprint,
        input.status,
        input.expectedRecordCount,
        input.matchedCount,
        input.mismatchedCount,
        input.missingCount,
        input.validationCode.slice(0, 96),
        input.httpStatus ?? null,
        input.consumerVerifiedAt ?? null,
        input.verificationFingerprint,
        JSON.stringify(input.recordResults),
        userId
      ]
    );
    return reconciliationId;
  });
}
