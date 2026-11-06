import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import {
  buildCatalogueExchangeEnvelope,
  isCatalogueBusinessApplication,
  isCatalogueItemKind,
  normalizeCatalogueItem,
  safeCatalogueExchangeReviewReason,
  type CatalogueBusinessApplication,
  type CatalogueContractId,
  type CatalogueItemKind,
  type NormalizedCatalogueItem
} from "./catalogue-exchange-core";
import {
  listWorkspacesForUser,
  withUserDatabase
} from "./database";

export interface CatalogueExchangeItemRecord {
  itemId: string;
  workspaceId: string;
  sourceApplicationId: CatalogueBusinessApplication;
  canonicalTenantKey: string;
  sourceRecordId: string;
  sourceRecordVersion: string | null;
  itemKind: CatalogueItemKind;
  contractId: CatalogueContractId;
  contractVersion: "1.0.0";
  portableRecord: Record<string, unknown>;
  contentSha256: string;
  recordedAt: Date;
}

export interface CatalogueExchangePackageRecord {
  packageId: string;
  workspaceId: string;
  sourceItemId: string;
  sourceApplicationId: CatalogueBusinessApplication;
  sourceRecordId: string;
  itemKind: CatalogueItemKind;
  itemName: string;
  destinationApplicationId: CatalogueBusinessApplication;
  destinationTenantKey: string;
  contractId: CatalogueContractId;
  contractVersion: "1.0.0";
  payloadSha256: string;
  state: "held";
  holdReason: "catalogue-exchange-not-authorized";
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
  throw new Error("catalogue_portable_record_invalid");
}

function itemRow(
  row: Record<string, unknown>
): CatalogueExchangeItemRecord {
  const sourceApplicationId = String(
    row.source_application_id
  );
  const itemKind = String(row.item_kind);
  const contractId = String(row.contract_id);

  if (!isCatalogueBusinessApplication(sourceApplicationId)) {
    throw new Error("catalogue_source_application_invalid");
  }
  if (!isCatalogueItemKind(itemKind)) {
    throw new Error("catalogue_item_kind_invalid");
  }
  if (
    contractId !== "rosevear.shared.product.v1" &&
    contractId !== "rosevear.shared.service.v1"
  ) {
    throw new Error("catalogue_contract_invalid");
  }

  return {
    itemId: String(row.item_id),
    workspaceId: String(row.workspace_id),
    sourceApplicationId,
    canonicalTenantKey: String(row.canonical_tenant_key),
    sourceRecordId: String(row.source_record_id),
    sourceRecordVersion:
      row.source_record_version === null ||
      row.source_record_version === undefined
        ? null
        : String(row.source_record_version),
    itemKind,
    contractId,
    contractVersion: "1.0.0",
    portableRecord: asRecord(row.portable_record),
    contentSha256: String(row.content_sha256),
    recordedAt: new Date(String(row.recorded_at))
  };
}

function packageRow(
  row: Record<string, unknown>
): CatalogueExchangePackageRecord {
  const sourceApplicationId = String(
    row.source_application_id
  );
  const destinationApplicationId = String(
    row.destination_application_id
  );
  const itemKind = String(row.item_kind);
  const contractId = String(row.contract_id);

  if (
    !isCatalogueBusinessApplication(sourceApplicationId) ||
    !isCatalogueBusinessApplication(destinationApplicationId)
  ) {
    throw new Error("catalogue_application_invalid");
  }
  if (!isCatalogueItemKind(itemKind)) {
    throw new Error("catalogue_item_kind_invalid");
  }
  if (
    contractId !== "rosevear.shared.product.v1" &&
    contractId !== "rosevear.shared.service.v1"
  ) {
    throw new Error("catalogue_contract_invalid");
  }

  return {
    packageId: String(row.package_id),
    workspaceId: String(row.workspace_id),
    sourceItemId: String(row.source_item_id),
    sourceApplicationId,
    sourceRecordId: String(row.source_record_id),
    itemKind,
    itemName: String(row.item_name),
    destinationApplicationId,
    destinationTenantKey: String(
      row.destination_tenant_key
    ),
    contractId,
    contractVersion: "1.0.0",
    payloadSha256: String(row.payload_sha256),
    state: "held",
    holdReason: "catalogue-exchange-not-authorized",
    reviewDecision:
      row.decision === "approve" || row.decision === "reject"
        ? row.decision
        : null,
    reviewReason:
      row.reason === null || row.reason === undefined
        ? null
        : String(row.reason),
    reviewedAt:
      row.reviewed_at === null ||
      row.reviewed_at === undefined
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

async function appendCatalogueAudit(
  client: PoolClient,
  input: {
    workspaceId: string;
    userId: string;
    action:
      | "item-recorded"
      | "package-prepared"
      | "package-approved-for-future-transport"
      | "package-rejected";
    itemId?: string | null;
    packageId?: string | null;
    details?: Record<string, unknown>;
  }
) {
  await client.query(
    `insert into app.catalogue_exchange_audit (
      audit_id,workspace_id,actor_user_id,action,
      item_id,package_id,details
    ) values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [
      randomUUID(),
      input.workspaceId,
      input.userId,
      input.action,
      input.itemId ?? null,
      input.packageId ?? null,
      JSON.stringify(input.details ?? {})
    ]
  );
}

export async function listCatalogueExchangeForUser(
  userId: string
) {
  const workspaces = await listWorkspacesForUser(userId);
  const state = await withUserDatabase(
    userId,
    async (client) => {
      const [itemsResult, packagesResult] =
        await Promise.all([
          client.query(
            `select *
             from app.catalogue_exchange_items
             order by recorded_at desc
             limit 500`
          ),
          client.query(
            `select
               p.*,
               i.source_application_id,
               i.source_record_id,
               i.item_kind,
               coalesce(
                 i.portable_record->>'name',
                 i.source_record_id
               ) as item_name,
               r.decision,
               r.reason,
               r.reviewed_at
             from app.catalogue_exchange_packages p
             inner join app.catalogue_exchange_items i
               on i.item_id=p.source_item_id
             left join app.catalogue_exchange_reviews r
               on r.package_id=p.package_id
             order by
               case when r.decision is null then 0 else 1 end,
               p.created_at desc
             limit 500`
          )
        ]);

      return {
        items: itemsResult.rows.map(itemRow),
        packages: packagesResult.rows.map(packageRow)
      };
    }
  );

  return {
    workspaces,
    ...state,
    summary: {
      items: state.items.length,
      heldPackages: state.packages.length,
      pendingReviews: state.packages.filter(
        (item) => item.reviewDecision === null
      ).length,
      approvedForFutureTransport: state.packages.filter(
        (item) => item.reviewDecision === "approve"
      ).length,
      rejected: state.packages.filter(
        (item) => item.reviewDecision === "reject"
      ).length
    },
    policy: {
      build286ContractsReused: true,
      productContractId: "rosevear.shared.product.v1",
      serviceContractId: "rosevear.shared.service.v1",
      campgroundKindsUseServiceContract: true,
      packageState: "held",
      outboundNetworkRequests: false,
      peerApplicationWrites: false,
      automaticDispatch: false,
      ownerAdminReviewRequired: true,
      ql266Resumed: false
    }
  };
}

export async function recordCatalogueExchangeItem(
  userId: string,
  input: {
    workspaceId: string;
    sourceApplicationId: string;
    canonicalTenantKey: string;
    sourceRecordId: string;
    sourceRecordVersion?: string | null;
    itemKind: string;
    updatedAt: string;
    sku?: string | null;
    name: string;
    description?: string | null;
    category?: string | null;
    status?: string | null;
    priceCad?: number | string | null;
    durationMinutes?: number | string | null;
    serviceAreas?: string[] | string | null;
  }
) {
  const normalized = normalizeCatalogueItem(input);

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);

    const itemId = randomUUID();
    const inserted = await client.query(
      `insert into app.catalogue_exchange_items (
        item_id,workspace_id,source_application_id,
        canonical_tenant_key,source_record_id,
        source_record_version,item_kind,contract_id,
        contract_version,portable_record,content_sha256,
        recorded_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12
      )
      on conflict (
        workspace_id,source_application_id,
        canonical_tenant_key,source_record_id,
        content_sha256
      ) do nothing
      returning *`,
      [
        itemId,
        input.workspaceId,
        normalized.sourceApplicationId,
        normalized.canonicalTenantKey,
        normalized.sourceRecordId,
        normalized.sourceRecordVersion,
        normalized.itemKind,
        normalized.contractId,
        normalized.contractVersion,
        JSON.stringify(normalized.portableRecord),
        normalized.contentSha256,
        userId
      ]
    );

    let item = inserted.rows[0]
      ? itemRow(inserted.rows[0])
      : null;

    if (!item) {
      const existing = await client.query(
        `select *
         from app.catalogue_exchange_items
         where workspace_id=$1
           and source_application_id=$2
           and canonical_tenant_key=$3
           and source_record_id=$4
           and content_sha256=$5
         limit 1`,
        [
          input.workspaceId,
          normalized.sourceApplicationId,
          normalized.canonicalTenantKey,
          normalized.sourceRecordId,
          normalized.contentSha256
        ]
      );
      if (!existing.rows[0]) {
        throw new Error(
          "catalogue_item_conflict"
        );
      }
      item = itemRow(existing.rows[0]);
    }

    if (inserted.rows[0]) {
      await appendCatalogueAudit(client, {
        workspaceId: input.workspaceId,
        userId,
        action: "item-recorded",
        itemId: item.itemId,
        details: {
          sourceApplicationId:
            normalized.sourceApplicationId,
          sourceRecordId: normalized.sourceRecordId,
          itemKind: normalized.itemKind,
          contractId: normalized.contractId,
          contentSha256: normalized.contentSha256,
          externalRequests: 0
        }
      });
    }

    return {
      itemId: item.itemId,
      itemCreated: Boolean(inserted.rows[0]),
      contractId: item.contractId,
      contentSha256: item.contentSha256,
      outboundNetworkRequests: false
    };
  });
}

function normalizedItemFromRecord(
  item: CatalogueExchangeItemRecord
): NormalizedCatalogueItem {
  return {
    sourceApplicationId: item.sourceApplicationId,
    canonicalTenantKey: item.canonicalTenantKey,
    sourceRecordId: item.sourceRecordId,
    sourceRecordVersion: item.sourceRecordVersion,
    itemKind: item.itemKind,
    contractId: item.contractId,
    contractVersion: item.contractVersion,
    portableRecord: item.portableRecord,
    contentSha256: item.contentSha256
  };
}

export async function prepareCatalogueExchangePackage(
  userId: string,
  input: {
    sourceItemId: string;
    destinationApplicationId: string;
    destinationTenantKey: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    const itemResult = await client.query(
      `select *
       from app.catalogue_exchange_items
       where item_id=$1
       limit 1`,
      [input.sourceItemId]
    );
    if (!itemResult.rows[0]) {
      throw new Error("catalogue_item_not_found");
    }

    const item = itemRow(itemResult.rows[0]);
    await requireWorkspaceAdmin(client, item.workspaceId);

    const prepared = buildCatalogueExchangeEnvelope({
      item: normalizedItemFromRecord(item),
      destinationApplicationId:
        input.destinationApplicationId,
      destinationTenantKey: input.destinationTenantKey
    });

    const packageId = randomUUID();
    const inserted = await client.query(
      `insert into app.catalogue_exchange_packages (
        package_id,workspace_id,source_item_id,
        destination_application_id,destination_tenant_key,
        contract_id,contract_version,payload,payload_sha256,
        state,hold_reason,created_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,
        'held','catalogue-exchange-not-authorized',$10
      )
      on conflict (
        source_item_id,destination_application_id,
        destination_tenant_key,payload_sha256
      ) do nothing
      returning package_id`,
      [
        packageId,
        item.workspaceId,
        item.itemId,
        prepared.envelope.destinationApplicationId,
        prepared.envelope.destinationTenantKey,
        prepared.envelope.contractId,
        prepared.envelope.contractVersion,
        JSON.stringify(prepared.envelope),
        prepared.payloadSha256,
        userId
      ]
    );

    let resolvedPackageId =
      inserted.rows[0]?.package_id
        ? String(inserted.rows[0].package_id)
        : "";

    if (!resolvedPackageId) {
      const existing = await client.query<{
        package_id: string;
      }>(
        `select package_id
         from app.catalogue_exchange_packages
         where source_item_id=$1
           and destination_application_id=$2
           and destination_tenant_key=$3
           and payload_sha256=$4
         limit 1`,
        [
          item.itemId,
          prepared.envelope.destinationApplicationId,
          prepared.envelope.destinationTenantKey,
          prepared.payloadSha256
        ]
      );
      resolvedPackageId =
        existing.rows[0]?.package_id ?? "";
    }

    if (!resolvedPackageId) {
      throw new Error("catalogue_package_conflict");
    }

    if (inserted.rows[0]) {
      await appendCatalogueAudit(client, {
        workspaceId: item.workspaceId,
        userId,
        action: "package-prepared",
        itemId: item.itemId,
        packageId: resolvedPackageId,
        details: {
          destinationApplicationId:
            prepared.envelope.destinationApplicationId,
          destinationTenantKey:
            prepared.envelope.destinationTenantKey,
          payloadSha256: prepared.payloadSha256,
          state: "held",
          holdReason:
            "catalogue-exchange-not-authorized",
          externalRequests: 0
        }
      });
    }

    return {
      packageId: resolvedPackageId,
      packageCreated: Boolean(inserted.rows[0]),
      payloadSha256: prepared.payloadSha256,
      state: "held" as const,
      holdReason:
        "catalogue-exchange-not-authorized" as const,
      outboundNetworkRequests: false
    };
  });
}

export async function reviewCatalogueExchangePackage(
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
    throw new Error("catalogue_review_decision_invalid");
  }
  const reason = input.reason.trim();
  if (!safeCatalogueExchangeReviewReason(reason)) {
    throw new Error("catalogue_review_reason_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    const packageResult = await client.query<{
      workspace_id: string;
      source_item_id: string;
    }>(
      `select workspace_id,source_item_id
       from app.catalogue_exchange_packages
       where package_id=$1
       limit 1`,
      [input.packageId]
    );
    const exchangePackage = packageResult.rows[0];
    if (!exchangePackage) {
      throw new Error("catalogue_package_not_found");
    }

    await requireWorkspaceAdmin(
      client,
      exchangePackage.workspace_id
    );

    const existing = await client.query(
      `select decision
       from app.catalogue_exchange_reviews
       where package_id=$1
       limit 1`,
      [input.packageId]
    );
    if (existing.rows[0]) {
      throw new Error(
        "catalogue_package_already_reviewed"
      );
    }

    const reviewId = randomUUID();
    await client.query(
      `insert into app.catalogue_exchange_reviews (
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

    await appendCatalogueAudit(client, {
      workspaceId: exchangePackage.workspace_id,
      userId,
      action:
        input.decision === "approve"
          ? "package-approved-for-future-transport"
          : "package-rejected",
      itemId: exchangePackage.source_item_id,
      packageId: input.packageId,
      details: {
        decision: input.decision,
        reason,
        packageStateAfterReview: "held",
        automaticDispatch: false,
        outboundNetworkRequests: false
      }
    });

    return {
      reviewId,
      packageId: input.packageId,
      decision: input.decision,
      packageState: "held" as const,
      automaticDispatch: false,
      outboundNetworkRequests: false
    };
  });
}
