import { listApprovedDatasetPublishingForUser } from "./approved-dataset-publishing";
import { listCollectionRunConsoleForUser } from "./collection-runs";
import { listDataReviewWorkbenchForUser } from "./data-review-workbench";
import { listPublicationDeliveryBridgeForUser } from "./publication-delivery-bridge";

export type LineageStageState = "complete" | "pending" | "not-applicable";

export interface ProvenanceStage {
  id: "source" | "capture" | "recipe" | "collection" | "review" | "approval" | "publication" | "delivery";
  label: string;
  state: LineageStageState;
  timestamp: string | null;
  title: string;
  detail: string;
  evidenceId: string | null;
  fingerprint: string | null;
  href: string;
}

export interface ProvenanceLineageRecord {
  id: string;
  workspaceId: string;
  workspaceName: string;
  datasetId: string;
  title: string;
  sourceUrl: string;
  recipeName: string;
  sourceVersion: number;
  sourceFingerprint: string;
  status: "delivered" | "published" | "approved" | "reviewed" | "captured";
  transforms: number;
  stages: ProvenanceStage[];
}

function latestAttempt(source: Awaited<ReturnType<typeof listCollectionRunConsoleForUser>>["sources"][number] | undefined) {
  if (!source) return null;
  const attempts = [...source.local.attempts, ...source.remote.attempts];
  return attempts
    .filter((item) => item.startedAt || item.finishedAt)
    .sort((a, b) => Date.parse(b.finishedAt ?? b.startedAt ?? "") - Date.parse(a.finishedAt ?? a.startedAt ?? ""))[0] ?? null;
}

export async function buildProvenanceLineageExplorer(userId: string) {
  const [review, approved, bridge, collection] = await Promise.all([
    listDataReviewWorkbenchForUser(userId),
    listApprovedDatasetPublishingForUser(userId),
    listPublicationDeliveryBridgeForUser(userId),
    listCollectionRunConsoleForUser(userId)
  ]);

  const records: ProvenanceLineageRecord[] = review.candidates.map((candidate) => {
    const batch = review.batches
      .filter((item) =>
        item.workspaceId === candidate.workspaceId &&
        item.sourceDatasetId === candidate.datasetId &&
        item.sourceServerVersion === candidate.serverVersion
      )
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];

    const publication = batch
      ? approved.publications.find((item) => item.reviewId === batch.reviewId)
      : undefined;
    const mappings = publication
      ? bridge.mappings.filter((item) => item.publicationId === publication.publicationId)
      : [];
    const receipts = publication
      ? bridge.receipts
          .filter((item) => item.publicationId === publication.publicationId)
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      : [];
    const acceptedReceipt = receipts.find((item) => item.receiptStatus === "accepted");
    const collectionSource = collection.sources.find((item) =>
      item.workspaceId === candidate.workspaceId && item.sourceUrl === candidate.sourceUrl
    );
    const attempt = latestAttempt(collectionSource);
    const transforms = batch?.rows.reduce((sum, row) => sum + row.changedFields, 0) ?? 0;

    const status: ProvenanceLineageRecord["status"] =
      acceptedReceipt ? "delivered" :
      publication ? "published" :
      batch?.status === "approved" ? "approved" :
      batch ? "reviewed" : "captured";

    const stages: ProvenanceStage[] = [
      {
        id: "source",
        label: "Source",
        state: "complete",
        timestamp: candidate.retrievedAt,
        title: candidate.sourceUrl,
        detail: "Original governed source reference retained with the dataset snapshot.",
        evidenceId: candidate.datasetId,
        fingerprint: candidate.sourceFingerprint,
        href: "/data-library"
      },
      {
        id: "capture",
        label: "Capture",
        state: "complete",
        timestamp: candidate.retrievedAt,
        title: candidate.recipeName || candidate.datasetId,
        detail: "Durable reviewed-dataset snapshot v" + candidate.serverVersion + ".",
        evidenceId: candidate.datasetId,
        fingerprint: candidate.sourceFingerprint,
        href: "/data-library"
      },
      {
        id: "recipe",
        label: "Recipe",
        state: candidate.recipeName ? "complete" : "pending",
        timestamp: candidate.retrievedAt,
        title: candidate.recipeName || "Recipe evidence not linked",
        detail: candidate.recipeName
          ? "Extraction recipe identity recorded on the source snapshot."
          : "No recipe name is attached to this snapshot.",
        evidenceId: candidate.recipeName || null,
        fingerprint: null,
        href: "/recipe-builder"
      },
      {
        id: "collection",
        label: "Collection run",
        state: attempt ? "complete" : "pending",
        timestamp: attempt?.finishedAt ?? attempt?.startedAt ?? null,
        title: attempt ? (collectionSource?.displayName ?? "Collection evidence") : "No matching run evidence",
        detail: attempt
          ? attempt.mode + " · " + attempt.status + " · " + attempt.recordCount + " record(s)"
          : "No collection-run source with the same workspace and source URL is currently linked.",
        evidenceId: attempt?.id ?? collectionSource?.sourceId ?? null,
        fingerprint: collectionSource?.policyPin?.fingerprint ?? null,
        href: "/collection-runs"
      },
      {
        id: "review",
        label: "Review",
        state: batch ? "complete" : "pending",
        timestamp: batch?.updatedAt ?? null,
        title: batch ? "Data Review · " + batch.status : "Review not started",
        detail: batch
          ? batch.includedCount + "/" + batch.rowCount + " rows included · " + transforms + " transformed field(s)"
          : "No durable Data Review batch is linked to this source version.",
        evidenceId: batch?.reviewId ?? null,
        fingerprint: batch?.sourceFingerprint ?? null,
        href: batch ? "/data-review?review=" + encodeURIComponent(batch.reviewId) : "/data-review"
      },
      {
        id: "approval",
        label: "Approval",
        state: batch?.status === "approved" ? "complete" : "pending",
        timestamp: batch?.approvedAt ?? null,
        title: batch?.status === "approved" ? "Approved review decision" : "Approval pending",
        detail: batch?.status === "approved"
          ? "Governed approval recorded" + (batch.approvedBy ? " by " + batch.approvedBy : "") + "."
          : "Approval remains inside Data Review; lineage never approves automatically.",
        evidenceId: batch?.reviewId ?? null,
        fingerprint: batch?.sourceFingerprint ?? null,
        href: "/data-review"
      },
      {
        id: "publication",
        label: "Approved publication",
        state: publication ? "complete" : "pending",
        timestamp: publication?.publishedAt ?? null,
        title: publication ? publication.title : "Publication not created",
        detail: publication
          ? publication.status + " · " + publication.rowCount + " row(s) · " + publication.fieldOrder.length + " field(s)"
          : "No immutable Approved Data publication is linked to this review.",
        evidenceId: publication?.publicationId ?? null,
        fingerprint: publication?.publicationFingerprint ?? null,
        href: "/approved-data"
      },
      {
        id: "delivery",
        label: "Integration delivery",
        state: acceptedReceipt ? "complete" : mappings.length || receipts.length ? "pending" : "not-applicable",
        timestamp: acceptedReceipt?.consumerReceivedAt ?? acceptedReceipt?.createdAt ?? receipts[0]?.createdAt ?? null,
        title: acceptedReceipt
          ? "Accepted by " + acceptedReceipt.consumerId
          : mappings.length
            ? "Delivery mapping exists"
            : "No downstream delivery",
        detail: acceptedReceipt
          ? acceptedReceipt.target + " · " + acceptedReceipt.transportMode + " · " + acceptedReceipt.validationCode
          : receipts.length
            ? "Latest receipt: " + receipts[0].receiptStatus + " · " + receipts[0].validationCode
            : mappings.length
              ? mappings.length + " active/retained mapping record(s), no accepted receipt."
              : "This publication has no delivery mapping or receipt.",
        evidenceId: acceptedReceipt?.receiptId ?? receipts[0]?.receiptId ?? mappings[0]?.mappingId ?? null,
        fingerprint: acceptedReceipt?.packageFingerprint ?? mappings[0]?.mappingFingerprint ?? null,
        href: "/approved-data/delivery"
      }
    ];

    return {
      id: candidate.workspaceId + ":" + candidate.datasetId + ":" + candidate.serverVersion,
      workspaceId: candidate.workspaceId,
      workspaceName: candidate.workspaceName,
      datasetId: candidate.datasetId,
      title: candidate.recipeName || candidate.datasetId,
      sourceUrl: candidate.sourceUrl,
      recipeName: candidate.recipeName,
      sourceVersion: candidate.serverVersion,
      sourceFingerprint: candidate.sourceFingerprint,
      status,
      transforms,
      stages
    };
  });

  const statusCounts = {
    captured: records.filter((item) => item.status === "captured").length,
    reviewed: records.filter((item) => item.status === "reviewed").length,
    approved: records.filter((item) => item.status === "approved").length,
    published: records.filter((item) => item.status === "published").length,
    delivered: records.filter((item) => item.status === "delivered").length
  };

  return {
    generatedAt: new Date().toISOString(),
    records,
    workspaces: review.workspaces,
    totals: {
      records: records.length,
      ...statusCounts,
      transforms: records.reduce((sum, item) => sum + item.transforms, 0),
      acceptedReceipts: bridge.receipts.filter((item) => item.receiptStatus === "accepted").length
    }
  };
}
