import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import {
  buildMediaExchangeEnvelope,
  isMediaAssetKind,
  isMediaExchangeApplication,
  isMediaType,
  normalizeMediaReference,
  safeMediaExchangeReviewReason,
  type MediaAssetKind,
  type MediaExchangeApplication,
  type MediaType,
  type NormalizedMediaReference
} from "./media-asset-exchange-core";
import {
  listWorkspacesForUser,
  withUserDatabase
} from "./database";

export interface SharedMediaAssetRecord {
  assetId: string;
  workspaceId: string;
  canonicalTenantKey: string;
  dedupeSha256: string;
  dedupeBasis: "content-sha256" | "reference-url-sha256";
  mediaType: MediaType;
  assetKind: MediaAssetKind;
  mimeType: string | null;
  byteSize: number | null;
  contentSha256: string | null;
  referenceCount: number;
  firstRecordedAt: Date;
}

export interface SharedMediaReferenceRecord {
  referenceId: string;
  workspaceId: string;
  assetId: string;
  sourceApplicationId: MediaExchangeApplication;
  canonicalTenantKey: string;
  sourceRecordId: string;
  sourceRecordVersion: string | null;
  assetKind: MediaAssetKind;
  sourceUrl: string;
  contractId: "rosevear.shared.media.v1";
  contractVersion: "1.0.0";
  portableRecord: Record<string, unknown>;
  referenceSha256: string;
  dedupeSha256: string;
  dedupeBasis: "content-sha256" | "reference-url-sha256";
  mediaType: MediaType;
  mimeType: string | null;
  byteSize: number | null;
  contentSha256: string | null;
  recordedAt: Date;
}

export interface SharedMediaPackageRecord {
  packageId: string;
  workspaceId: string;
  sourceReferenceId: string;
  sourceApplicationId: MediaExchangeApplication;
  sourceRecordId: string;
  assetKind: MediaAssetKind;
  mediaType: MediaType;
  sourceUrl: string;
  destinationApplicationId: MediaExchangeApplication;
  destinationTenantKey: string;
  payloadSha256: string;
  state: "held";
  holdReason: "media-exchange-not-authorized";
  reviewDecision: "approve" | "reject" | null;
  reviewReason: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

function asRecord(value: unknown) {
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }
  throw new Error("media_portable_record_invalid");
}

function dedupeBasis(value: unknown) {
  if (
    value === "content-sha256" ||
    value === "reference-url-sha256"
  ) {
    return value;
  }
  throw new Error("media_dedupe_basis_invalid");
}

function mediaType(value: unknown) {
  const normalized = String(value);
  if (!isMediaType(normalized)) {
    throw new Error("media_type_invalid");
  }
  return normalized;
}

function assetKind(value: unknown) {
  const normalized = String(value);
  if (!isMediaAssetKind(normalized)) {
    throw new Error("media_asset_kind_invalid");
  }
  return normalized;
}

function application(value: unknown) {
  const normalized = String(value);
  if (!isMediaExchangeApplication(normalized)) {
    throw new Error("media_application_invalid");
  }
  return normalized;
}

function optionalString(value: unknown) {
  return value === null || value === undefined
    ? null
    : String(value);
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error("media_number_invalid");
  }
  return number;
}

function assetRow(
  row: Record<string, unknown>
): SharedMediaAssetRecord {
  return {
    assetId: String(row.asset_id),
    workspaceId: String(row.workspace_id),
    canonicalTenantKey: String(row.canonical_tenant_key),
    dedupeSha256: String(row.dedupe_sha256),
    dedupeBasis: dedupeBasis(row.dedupe_basis),
    mediaType: mediaType(row.media_type),
    assetKind: assetKind(row.asset_kind),
    mimeType: optionalString(row.mime_type),
    byteSize: optionalNumber(row.byte_size),
    contentSha256: optionalString(row.content_sha256),
    referenceCount: Number(row.reference_count ?? 0),
    firstRecordedAt: new Date(String(row.first_recorded_at))
  };
}

function referenceRow(
  row: Record<string, unknown>
): SharedMediaReferenceRecord {
  const contractId = String(row.contract_id);
  if (contractId !== "rosevear.shared.media.v1") {
    throw new Error("media_contract_invalid");
  }
  return {
    referenceId: String(row.reference_id),
    workspaceId: String(row.workspace_id),
    assetId: String(row.asset_id),
    sourceApplicationId: application(row.source_application_id),
    canonicalTenantKey: String(row.canonical_tenant_key),
    sourceRecordId: String(row.source_record_id),
    sourceRecordVersion: optionalString(row.source_record_version),
    assetKind: assetKind(row.asset_kind),
    sourceUrl: String(row.source_url),
    contractId: "rosevear.shared.media.v1",
    contractVersion: "1.0.0",
    portableRecord: asRecord(row.portable_record),
    referenceSha256: String(row.reference_sha256),
    dedupeSha256: String(row.dedupe_sha256),
    dedupeBasis: dedupeBasis(row.dedupe_basis),
    mediaType: mediaType(row.media_type),
    mimeType: optionalString(row.mime_type),
    byteSize: optionalNumber(row.byte_size),
    contentSha256: optionalString(row.content_sha256),
    recordedAt: new Date(String(row.recorded_at))
  };
}

function packageRow(
  row: Record<string, unknown>
): SharedMediaPackageRecord {
  return {
    packageId: String(row.package_id),
    workspaceId: String(row.workspace_id),
    sourceReferenceId: String(row.source_reference_id),
    sourceApplicationId: application(row.source_application_id),
    sourceRecordId: String(row.source_record_id),
    assetKind: assetKind(row.asset_kind),
    mediaType: mediaType(row.media_type),
    sourceUrl: String(row.source_url),
    destinationApplicationId: application(
      row.destination_application_id
    ),
    destinationTenantKey: String(row.destination_tenant_key),
    payloadSha256: String(row.payload_sha256),
    state: "held",
    holdReason: "media-exchange-not-authorized",
    reviewDecision:
      row.decision === "approve" || row.decision === "reject"
        ? row.decision
        : null,
    reviewReason: optionalString(row.reason),
    reviewedAt:
      row.reviewed_at === null || row.reviewed_at === undefined
        ? null
        : new Date(String(row.reviewed_at)),
    createdAt: new Date(String(row.created_at))
  };
}

async function requireWorkspaceAdmin(
  client: PoolClient,
  workspaceId: string
) {
  const result = await client.query<{ role: string }>(
    `select role
     from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id',true),'')
     limit 1`,
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("workspace_admin_required");
  }
}

async function appendMediaAudit(
  client: PoolClient,
  input: {
    workspaceId: string;
    userId: string;
    action:
      | "asset-created"
      | "asset-reused"
      | "reference-recorded"
      | "package-prepared"
      | "package-approved-for-future-transport"
      | "package-rejected";
    assetId?: string | null;
    referenceId?: string | null;
    packageId?: string | null;
    details?: Record<string, unknown>;
  }
) {
  await client.query(
    `insert into app.shared_media_exchange_audit (
      audit_id,workspace_id,actor_user_id,action,
      asset_id,reference_id,package_id,details
    ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [
      randomUUID(),
      input.workspaceId,
      input.userId,
      input.action,
      input.assetId ?? null,
      input.referenceId ?? null,
      input.packageId ?? null,
      JSON.stringify(input.details ?? {})
    ]
  );
}

export async function listSharedMediaExchangeForUser(
  userId: string
) {
  const workspaces = await listWorkspacesForUser(userId);
  const state = await withUserDatabase(
    userId,
    async (client) => {
      const [assetsResult, referencesResult, packagesResult] =
        await Promise.all([
          client.query(
            `select
               a.*,
               count(r.reference_id)::int as reference_count
             from app.shared_media_assets a
             left join app.shared_media_references r
               on r.asset_id=a.asset_id
             group by a.asset_id
             order by a.first_recorded_at desc
             limit 500`
          ),
          client.query(
            `select
               r.*,
               a.dedupe_sha256,
               a.dedupe_basis,
               a.media_type,
               a.mime_type,
               a.byte_size,
               a.content_sha256
             from app.shared_media_references r
             inner join app.shared_media_assets a
               on a.asset_id=r.asset_id
             order by r.recorded_at desc
             limit 500`
          ),
          client.query(
            `select
               p.*,
               r.source_application_id,
               r.source_record_id,
               r.asset_kind,
               r.source_url,
               a.media_type,
               rv.decision,
               rv.reason,
               rv.reviewed_at
             from app.shared_media_exchange_packages p
             inner join app.shared_media_references r
               on r.reference_id=p.source_reference_id
             inner join app.shared_media_assets a
               on a.asset_id=r.asset_id
             left join app.shared_media_exchange_reviews rv
               on rv.package_id=p.package_id
             order by
               case when rv.decision is null then 0 else 1 end,
               p.created_at desc
             limit 500`
          )
        ]);

      return {
        assets: assetsResult.rows.map(assetRow),
        references: referencesResult.rows.map(referenceRow),
        packages: packagesResult.rows.map(packageRow)
      };
    }
  );

  return {
    workspaces,
    ...state,
    summary: {
      canonicalAssets: state.assets.length,
      sourceReferences: state.references.length,
      duplicateReferencesAvoided: state.references.filter(
        (reference, index, all) =>
          all.findIndex(
            (candidate) =>
              candidate.assetId === reference.assetId
          ) !== index
      ).length,
      heldPackages: state.packages.length,
      pendingReviews: state.packages.filter(
        (item) => item.reviewDecision === null
      ).length,
      approvedForFutureTransport: state.packages.filter(
        (item) => item.reviewDecision === "approve"
      ).length
    },
    policy: {
      build286MediaContractReused: true,
      contractId: "rosevear.shared.media.v1",
      binaryUploadsPerformed: false,
      binaryDownloadsPerformed: false,
      dedupeContentHashPreferred: true,
      dedupeStableUrlFallback: true,
      packageState: "held",
      peerApplicationWrites: false,
      outboundNetworkRequests: false,
      automaticDispatch: false,
      ownerAdminReviewRequired: true,
      ql266Resumed: false
    }
  };
}

export async function recordSharedMediaReference(
  userId: string,
  input: {
    workspaceId: string;
    sourceApplicationId: string;
    canonicalTenantKey: string;
    sourceRecordId: string;
    sourceRecordVersion?: string | null;
    assetKind: string;
    mediaType: string;
    url: string;
    ownerKind?: string | null;
    ownerRecordId?: string | null;
    altText?: string | null;
    caption?: string | null;
    createdAt?: string | null;
    mimeType?: string | null;
    byteSize?: number | string | null;
    contentSha256?: string | null;
  }
) {
  const normalized = normalizeMediaReference(input);

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);

    const assetId = randomUUID();
    const insertedAsset = await client.query(
      `insert into app.shared_media_assets (
        asset_id,workspace_id,canonical_tenant_key,
        dedupe_sha256,dedupe_basis,media_type,asset_kind,
        mime_type,byte_size,content_sha256,first_recorded_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      on conflict (
        workspace_id,canonical_tenant_key,dedupe_sha256
      ) do nothing
      returning *`,
      [
        assetId,
        input.workspaceId,
        normalized.canonicalTenantKey,
        normalized.dedupeSha256,
        normalized.dedupeBasis,
        normalized.mediaType,
        normalized.assetKind,
        normalized.mimeType,
        normalized.byteSize,
        normalized.contentSha256,
        userId
      ]
    );

    let resolvedAssetId = insertedAsset.rows[0]
      ? String(insertedAsset.rows[0].asset_id)
      : "";

    if (!resolvedAssetId) {
      const existing = await client.query<{
        asset_id: string;
        media_type: string;
      }>(
        `select asset_id,media_type
         from app.shared_media_assets
         where workspace_id=$1
           and canonical_tenant_key=$2
           and dedupe_sha256=$3
         limit 1`,
        [
          input.workspaceId,
          normalized.canonicalTenantKey,
          normalized.dedupeSha256
        ]
      );
      if (!existing.rows[0]) {
        throw new Error("media_asset_conflict");
      }
      if (existing.rows[0].media_type !== normalized.mediaType) {
        throw new Error("media_asset_type_conflict");
      }
      resolvedAssetId = existing.rows[0].asset_id;
    }

    const referenceId = randomUUID();
    const insertedReference = await client.query(
      `insert into app.shared_media_references (
        reference_id,workspace_id,asset_id,
        source_application_id,canonical_tenant_key,
        source_record_id,source_record_version,asset_kind,
        owner_kind,owner_record_id,source_url,
        contract_id,contract_version,portable_record,
        reference_sha256,recorded_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
        'rosevear.shared.media.v1','1.0.0',$12::jsonb,$13,$14
      )
      on conflict (
        workspace_id,source_application_id,
        canonical_tenant_key,source_record_id,reference_sha256
      ) do nothing
      returning reference_id`,
      [
        referenceId,
        input.workspaceId,
        resolvedAssetId,
        normalized.sourceApplicationId,
        normalized.canonicalTenantKey,
        normalized.sourceRecordId,
        normalized.sourceRecordVersion,
        normalized.assetKind,
        typeof normalized.portableRecord.ownerKind === "string"
          ? normalized.portableRecord.ownerKind
          : null,
        typeof normalized.portableRecord.ownerRecordId === "string"
          ? normalized.portableRecord.ownerRecordId
          : null,
        String(normalized.portableRecord.url),
        JSON.stringify(normalized.portableRecord),
        normalized.referenceSha256,
        userId
      ]
    );

    let resolvedReferenceId = insertedReference.rows[0]?.reference_id
      ? String(insertedReference.rows[0].reference_id)
      : "";

    if (!resolvedReferenceId) {
      const existing = await client.query<{ reference_id: string }>(
        `select reference_id
         from app.shared_media_references
         where workspace_id=$1
           and source_application_id=$2
           and canonical_tenant_key=$3
           and source_record_id=$4
           and reference_sha256=$5
         limit 1`,
        [
          input.workspaceId,
          normalized.sourceApplicationId,
          normalized.canonicalTenantKey,
          normalized.sourceRecordId,
          normalized.referenceSha256
        ]
      );
      resolvedReferenceId = existing.rows[0]?.reference_id ?? "";
    }
    if (!resolvedReferenceId) {
      throw new Error("media_reference_conflict");
    }

    await appendMediaAudit(client, {
      workspaceId: input.workspaceId,
      userId,
      action: insertedAsset.rows[0] ? "asset-created" : "asset-reused",
      assetId: resolvedAssetId,
      referenceId: resolvedReferenceId,
      details: {
        dedupeBasis: normalized.dedupeBasis,
        dedupeSha256: normalized.dedupeSha256,
        binaryUploadPerformed: false,
        binaryDownloadPerformed: false,
        externalRequests: 0
      }
    });

    if (insertedReference.rows[0]) {
      await appendMediaAudit(client, {
        workspaceId: input.workspaceId,
        userId,
        action: "reference-recorded",
        assetId: resolvedAssetId,
        referenceId: resolvedReferenceId,
        details: {
          sourceApplicationId: normalized.sourceApplicationId,
          sourceRecordId: normalized.sourceRecordId,
          assetKind: normalized.assetKind,
          referenceSha256: normalized.referenceSha256
        }
      });
    }

    return {
      assetId: resolvedAssetId,
      referenceId: resolvedReferenceId,
      assetCreated: Boolean(insertedAsset.rows[0]),
      referenceCreated: Boolean(insertedReference.rows[0]),
      deduplicated: !insertedAsset.rows[0],
      dedupeBasis: normalized.dedupeBasis,
      binaryUploadPerformed: false,
      binaryDownloadPerformed: false,
      outboundNetworkRequests: false
    };
  });
}

function normalizedReferenceFromRecord(
  item: SharedMediaReferenceRecord
): NormalizedMediaReference {
  return {
    sourceApplicationId: item.sourceApplicationId,
    canonicalTenantKey: item.canonicalTenantKey,
    sourceRecordId: item.sourceRecordId,
    sourceRecordVersion: item.sourceRecordVersion,
    assetKind: item.assetKind,
    mediaType: item.mediaType,
    mimeType: item.mimeType,
    byteSize: item.byteSize,
    contentSha256: item.contentSha256,
    dedupeSha256: item.dedupeSha256,
    dedupeBasis: item.dedupeBasis,
    contractId: item.contractId,
    contractVersion: item.contractVersion,
    portableRecord: item.portableRecord,
    referenceSha256: item.referenceSha256
  };
}

export async function prepareSharedMediaExchangePackage(
  userId: string,
  input: {
    sourceReferenceId: string;
    destinationApplicationId: string;
    destinationTenantKey: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    const result = await client.query(
      `select
         r.*,
         a.dedupe_sha256,
         a.dedupe_basis,
         a.media_type,
         a.mime_type,
         a.byte_size,
         a.content_sha256
       from app.shared_media_references r
       inner join app.shared_media_assets a
         on a.asset_id=r.asset_id
       where r.reference_id=$1
       limit 1`,
      [input.sourceReferenceId]
    );
    if (!result.rows[0]) {
      throw new Error("media_reference_not_found");
    }

    const reference = referenceRow(result.rows[0]);
    await requireWorkspaceAdmin(client, reference.workspaceId);

    const prepared = buildMediaExchangeEnvelope({
      reference: normalizedReferenceFromRecord(reference),
      destinationApplicationId: input.destinationApplicationId,
      destinationTenantKey: input.destinationTenantKey
    });

    const packageId = randomUUID();
    const inserted = await client.query(
      `insert into app.shared_media_exchange_packages (
        package_id,workspace_id,source_reference_id,
        destination_application_id,destination_tenant_key,
        contract_id,contract_version,payload,payload_sha256,
        state,hold_reason,created_by
      ) values (
        $1,$2,$3,$4,$5,'rosevear.shared.media.v1','1.0.0',
        $6::jsonb,$7,'held','media-exchange-not-authorized',$8
      )
      on conflict (
        source_reference_id,destination_application_id,
        destination_tenant_key,payload_sha256
      ) do nothing
      returning package_id`,
      [
        packageId,
        reference.workspaceId,
        reference.referenceId,
        prepared.envelope.destinationApplicationId,
        prepared.envelope.destinationTenantKey,
        JSON.stringify(prepared.envelope),
        prepared.payloadSha256,
        userId
      ]
    );

    let resolvedPackageId = inserted.rows[0]?.package_id
      ? String(inserted.rows[0].package_id)
      : "";

    if (!resolvedPackageId) {
      const existing = await client.query<{ package_id: string }>(
        `select package_id
         from app.shared_media_exchange_packages
         where source_reference_id=$1
           and destination_application_id=$2
           and destination_tenant_key=$3
           and payload_sha256=$4
         limit 1`,
        [
          reference.referenceId,
          prepared.envelope.destinationApplicationId,
          prepared.envelope.destinationTenantKey,
          prepared.payloadSha256
        ]
      );
      resolvedPackageId = existing.rows[0]?.package_id ?? "";
    }
    if (!resolvedPackageId) {
      throw new Error("media_package_conflict");
    }

    if (inserted.rows[0]) {
      await appendMediaAudit(client, {
        workspaceId: reference.workspaceId,
        userId,
        action: "package-prepared",
        assetId: reference.assetId,
        referenceId: reference.referenceId,
        packageId: resolvedPackageId,
        details: {
          destinationApplicationId:
            prepared.envelope.destinationApplicationId,
          destinationTenantKey:
            prepared.envelope.destinationTenantKey,
          payloadSha256: prepared.payloadSha256,
          state: "held",
          holdReason: "media-exchange-not-authorized",
          binaryTransferRequested: false,
          externalRequests: 0
        }
      });
    }

    return {
      packageId: resolvedPackageId,
      packageCreated: Boolean(inserted.rows[0]),
      state: "held" as const,
      holdReason: "media-exchange-not-authorized" as const,
      binaryTransferRequested: false,
      outboundNetworkRequests: false
    };
  });
}

export async function reviewSharedMediaExchangePackage(
  userId: string,
  input: {
    packageId: string;
    decision: "approve" | "reject";
    reason: string;
  }
) {
  if (
    input.decision !== "approve" &&
    input.decision !== "reject"
  ) {
    throw new Error("media_review_decision_invalid");
  }
  const reason = input.reason.trim();
  if (!safeMediaExchangeReviewReason(reason)) {
    throw new Error("media_review_reason_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    const packageResult = await client.query<{
      workspace_id: string;
      source_reference_id: string;
      asset_id: string;
    }>(
      `select
         p.workspace_id,
         p.source_reference_id,
         r.asset_id
       from app.shared_media_exchange_packages p
       inner join app.shared_media_references r
         on r.reference_id=p.source_reference_id
       where p.package_id=$1
       limit 1`,
      [input.packageId]
    );
    const exchangePackage = packageResult.rows[0];
    if (!exchangePackage) {
      throw new Error("media_package_not_found");
    }

    await requireWorkspaceAdmin(
      client,
      exchangePackage.workspace_id
    );

    const existing = await client.query(
      `select decision
       from app.shared_media_exchange_reviews
       where package_id=$1
       limit 1`,
      [input.packageId]
    );
    if (existing.rows[0]) {
      throw new Error("media_package_already_reviewed");
    }

    const reviewId = randomUUID();
    await client.query(
      `insert into app.shared_media_exchange_reviews (
        review_id,workspace_id,package_id,decision,
        reason,reviewed_by
      ) values ($1,$2,$3,$4,$5,$6)`,
      [
        reviewId,
        exchangePackage.workspace_id,
        input.packageId,
        input.decision,
        reason,
        userId
      ]
    );

    await appendMediaAudit(client, {
      workspaceId: exchangePackage.workspace_id,
      userId,
      action:
        input.decision === "approve"
          ? "package-approved-for-future-transport"
          : "package-rejected",
      assetId: exchangePackage.asset_id,
      referenceId: exchangePackage.source_reference_id,
      packageId: input.packageId,
      details: {
        decision: input.decision,
        reason,
        packageStateAfterReview: "held",
        binaryTransferRequested: false,
        automaticDispatch: false,
        outboundNetworkRequests: false
      }
    });

    return {
      reviewId,
      packageId: input.packageId,
      decision: input.decision,
      packageState: "held" as const,
      binaryTransferRequested: false,
      automaticDispatch: false,
      outboundNetworkRequests: false
    };
  });
}
