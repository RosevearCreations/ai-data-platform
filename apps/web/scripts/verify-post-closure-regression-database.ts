import { randomUUID } from "node:crypto";

import { auth } from "../lib/auth";
import { createApprovedDatasetPublication } from "../lib/approved-dataset-publishing";
import {
  createConsumerLiveActivation,
  finalizeIdempotentLiveDelivery,
  reserveIdempotentLiveDelivery
} from "../lib/controlled-live-delivery";
import {
  createCorrectiveDeliveryActivation,
  finalizeIdempotentCorrectiveDelivery,
  getActiveCorrectiveDeliveryActivation,
  listCorrectiveDeliveryForUser,
  loadApprovedCorrectivePlanContext,
  reserveIdempotentCorrectiveDelivery
} from "../lib/corrective-delivery-execution";
import {
  closeDatabasePools,
  listWorkspacesForUser,
  withUserDatabase
} from "../lib/database";
import {
  comparePostClosureConsumerState,
  listPostClosureRegressionForUser,
  loadPostClosureRegressionContext,
  recordPostClosureRegressionCheck,
  reopenRegressedException
} from "../lib/post-closure-regression";
import {
  createDataReviewBatch,
  decideDataReviewBatch
} from "../lib/data-review-workbench";
import {
  INTEGRATION_CONSUMER_PROTOCOL,
  INTEGRATION_CONTRACTS,
  type ConsumerAcknowledgement,
  type ConsumerStateVerificationResponse,
  type LiveConsumerHandshake
} from "../lib/integration-delivery";
import {
  compareConsumerState,
  loadAcceptedDeliveryReconciliationContext,
  recordLiveDeliveryReconciliation
} from "../lib/post-delivery-reconciliation";
import {
  createCorrectiveDeliveryPlan,
  createReconciliationExceptionCase,
  listReconciliationExceptionTriageForUser,
  reviewCorrectiveDeliveryPlan,
  updateReconciliationExceptionCase
} from "../lib/reconciliation-exception-triage";
import {
  closeVerifiedReconciliationException,
  compareCorrectiveConsumerState,
  correctiveReconciliationErrorFingerprint,
  listCorrectiveClosureForUser,
  loadAcceptedCorrectiveReconciliationContext,
  recordCorrectiveDeliveryReconciliation
} from "../lib/corrective-delivery-reconciliation";
import {
  createPublicationDeliveryMapping,
  loadPublicationDeliveryPackage,
  recordPublicationDeliveryReceipt
} from "../lib/publication-delivery-bridge";

async function existingUser(email: string) {
  const result = await auth.api.signInEmail({
    body: {
      email,
      password: "build-002-ci-fixture-password-not-a-secret"
    }
  });
  if (!result.user?.id) throw new Error("Build 055 fixture user unavailable.");
  return result.user.id;
}

async function insertDataset(
  ownerId: string,
  workspaceId: string,
  datasetId: string
) {
  const now = new Date().toISOString();
  const payload = {
    recipeName: "Build 055 corrective delivery",
    sourceUrl: "https://example.test/build-055",
    retrievedAt: now,
    rows: [
      {
        recordId: "corrective-" + datasetId.slice(-8),
        competitorBusinessName: "Build 055 Detailer",
        offeringName: "Complete",
        priceMinimumCad: 249,
        sourceUrl: "https://example.test/build-055/live",
        retrievedAt: now
      }
    ]
  };

  await withUserDatabase(ownerId, async (client) => {
    await client.query(
      `insert into app.workspace_reviewed_datasets (
        workspace_id,dataset_id,recipe_name,source_url,retrieved_at,
        client_updated_at,row_count,server_version,payload
      ) values ($1,$2,$3,$4,$5::timestamptz,now(),$6,1,$7::jsonb)`,
      [
        workspaceId,
        datasetId,
        payload.recipeName,
        payload.sourceUrl,
        payload.retrievedAt,
        payload.rows.length,
        JSON.stringify(payload)
      ]
    );
  });
}

async function main() {
  const ownerId = await existingUser("build002-owner@example.test");
  const outsiderId = await existingUser("build002-restricted@example.test");
  const workspaces = await listWorkspacesForUser(ownerId);
  const workspace =
    workspaces.find((item) => item.slug === "rosiedazzlers") ?? workspaces[0];
  if (!workspace) throw new Error("Build 055 owner workspace unavailable.");

  const datasetId = "build-055-" + randomUUID();
  await insertDataset(ownerId, workspace.id, datasetId);

  const reviewId = await createDataReviewBatch(ownerId, workspace.id, datasetId);
  await decideDataReviewBatch(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    decision: "approved",
    reviewNote: "Build 055 corrective delivery fixture"
  });

  const publicationId = await createApprovedDatasetPublication(ownerId, {
    workspaceId: workspace.id,
    reviewId,
    publicationNote: "Build 055 corrective delivery fixture"
  });

  const mappingId = await createPublicationDeliveryMapping(ownerId, {
    workspaceId: workspace.id,
    publicationId,
    target: "rosie-dazzlers",
    integrationKeyField: "recordId",
    operationAction: "create",
    evidenceUrlField: "sourceUrl",
    evidenceTimestampField: "retrievedAt",
    fieldMap: {
      competitorBusinessName: "competitorBusinessName",
      offeringName: "offeringName",
      priceMinimumCad: "priceMinimumCad",
      sourceUrl: "sourceUrl",
      retrievedAt: "retrievedAt"
    }
  });

  const bridge = await loadPublicationDeliveryPackage(ownerId, {
    workspaceId: workspace.id,
    mappingId
  });
  const consumerId = "https://consumer.example.test";

  await recordPublicationDeliveryReceipt(ownerId, {
    workspaceId: workspace.id,
    mappingId,
    publicationId,
    publicationFingerprint: bridge.publication.publicationFingerprint,
    mappingFingerprint: bridge.mapping.mappingFingerprint,
    target: "rosie-dazzlers",
    transportMode: "live",
    consumerId,
    package: bridge.package,
    receiptStatus: "accepted",
    validationCode: "dry-run-valid",
    dryRun: true,
    consumerReceivedAt: new Date().toISOString(),
    details: { build: 54, fixture: true }
  });

  const handshake: LiveConsumerHandshake = {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    target: "rosie-dazzlers",
    contractVersion: 1,
    schemaId: INTEGRATION_CONTRACTS["rosie-dazzlers"].schemaId,
    authentication: "bearer",
    dryRunSupported: true,
    liveMutationEnabled: true,
    idempotency: {
      keySource: "replayKey",
      duplicateBehavior: "return-original-ack"
    }
  };

  const sourceActivationId = await createConsumerLiveActivation(ownerId, {
    workspaceId: workspace.id,
    mappingId,
    publicationId,
    target: "rosie-dazzlers",
    consumerId,
    publicationFingerprint: bridge.publication.publicationFingerprint,
    mappingFingerprint: bridge.mapping.mappingFingerprint,
    package: bridge.package,
    handshake
  });
  const sourceActivationFingerprint = await withUserDatabase(
    ownerId,
    async (client) => {
      const result = await client.query<{ activation_fingerprint: string }>(
        `select activation_fingerprint
         from app.workspace_consumer_live_activations
         where workspace_id=$1 and activation_id=$2`,
        [workspace.id, sourceActivationId]
      );
      return result.rows[0]?.activation_fingerprint;
    }
  );
  if (!sourceActivationFingerprint) {
    throw new Error("Build 055 source activation fingerprint unavailable.");
  }

  const sourceReservation = await reserveIdempotentLiveDelivery(ownerId, {
    workspaceId: workspace.id,
    activationId: sourceActivationId,
    mappingId,
    publicationId,
    target: "rosie-dazzlers",
    consumerId,
    publicationFingerprint: bridge.publication.publicationFingerprint,
    mappingFingerprint: bridge.mapping.mappingFingerprint,
    activationFingerprint: sourceActivationFingerprint,
    package: bridge.package
  });
  if (!sourceReservation.shouldSend) {
    throw new Error("Build 055 source live delivery fixture was not reserved.");
  }

  const sourceDelivery = await finalizeIdempotentLiveDelivery(ownerId, {
    workspaceId: workspace.id,
    deliveryId: sourceReservation.delivery.deliveryId,
    status: "accepted",
    validationCode: "accepted",
    httpStatus: 200,
    consumerReceivedAt: new Date().toISOString(),
    acknowledgement: {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      status: "accepted",
      dryRun: false
    }
  });

  const sourceContext = await loadAcceptedDeliveryReconciliationContext(ownerId, {
    workspaceId: workspace.id,
    deliveryId: sourceDelivery.deliveryId
  });
  const sourceOperation = sourceContext.package.operations[0];
  if (!sourceOperation) {
    throw new Error("Build 055 source package operation unavailable.");
  }

  const driftResponse: ConsumerStateVerificationResponse = {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    kind: "state-verification",
    status: "accepted",
    code: "verified",
    target: "rosie-dazzlers",
    packageId: sourceContext.package.packageId,
    replayKey: sourceContext.package.replayKey,
    fingerprint: sourceContext.package.fingerprint,
    verifiedAt: new Date().toISOString(),
    records: [
      {
        integrationKey: sourceOperation.integrationKey,
        status: "found",
        values: {
          ...sourceOperation.values,
          priceMinimumCad: 999
        }
      }
    ]
  };
  const drift = compareConsumerState(sourceContext.package, driftResponse);
  if (drift.status !== "drift" || drift.mismatchedCount !== 1) {
    throw new Error("Build 055 fixture did not produce drift.");
  }

  const reconciliationId = await recordLiveDeliveryReconciliation(ownerId, {
    workspaceId: workspace.id,
    deliveryId: sourceDelivery.deliveryId,
    activationId: sourceActivationId,
    mappingId,
    publicationId,
    target: "rosie-dazzlers",
    consumerId,
    package: sourceContext.package,
    status: drift.status,
    expectedRecordCount: drift.expectedRecordCount,
    matchedCount: drift.matchedCount,
    mismatchedCount: drift.mismatchedCount,
    missingCount: drift.missingCount,
    validationCode: driftResponse.code,
    httpStatus: 200,
    consumerVerifiedAt: driftResponse.verifiedAt,
    verificationFingerprint: drift.verificationFingerprint,
    recordResults: drift.recordResults
  });

  const caseId = await createReconciliationExceptionCase(ownerId, {
    workspaceId: workspace.id,
    reconciliationId,
    classification: "consumer-drift",
    severity: "high",
    resolutionIntent: "plan-correction",
    summary: "Build 055 fixture requires controlled corrective execution."
  });
  const planId = await createCorrectiveDeliveryPlan(ownerId, {
    workspaceId: workspace.id,
    caseId,
    rationale: "Restore the governed price field proven to have drifted."
  });
  await reviewCorrectiveDeliveryPlan(ownerId, {
    workspaceId: workspace.id,
    planId,
    decision: "approved",
    reviewNote: "Approved for Build 055 controlled corrective execution."
  });

  const context = await loadApprovedCorrectivePlanContext(ownerId, {
    workspaceId: workspace.id,
    planId
  });
  if (
    context.correctivePackage.packageId === context.sourcePackage.packageId ||
    context.correctivePackage.replayKey === context.sourcePackage.replayKey ||
    context.correctivePackage.operations.length !== 1 ||
    context.correctivePackage.operations[0]?.values.priceMinimumCad !== 249 ||
    Object.keys(context.correctivePackage.operations[0]?.values ?? {}).join(",") !==
      "priceMinimumCad"
  ) {
    throw new Error("Build 055 corrective package identity or frozen scope is invalid.");
  }

  const dryRunAcknowledgement: ConsumerAcknowledgement = {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    status: "accepted",
    code: "corrective-dry-run-accepted",
    target: "rosie-dazzlers",
    packageId: context.correctivePackage.packageId,
    replayKey: context.correctivePackage.replayKey,
    fingerprint: context.correctivePackage.fingerprint,
    receivedAt: new Date().toISOString(),
    dryRun: true
  };

  const correctiveActivationId = await createCorrectiveDeliveryActivation(
    ownerId,
    {
      workspaceId: workspace.id,
      context,
      consumerId,
      handshake,
      dryRunAcknowledgement,
      dryRunHttpStatus: 200
    }
  );
  const duplicateActivationId = await createCorrectiveDeliveryActivation(
    ownerId,
    {
      workspaceId: workspace.id,
      context,
      consumerId,
      handshake,
      dryRunAcknowledgement,
      dryRunHttpStatus: 200
    }
  );
  if (duplicateActivationId !== correctiveActivationId) {
    throw new Error("Build 055 identical corrective activation was not canonicalized.");
  }

  const activation = await getActiveCorrectiveDeliveryActivation(ownerId, {
    workspaceId: workspace.id,
    planId,
    consumerId,
    correctivePackage: context.correctivePackage
  });
  if (
    activation.activationId !== correctiveActivationId ||
    activation.correctiveReplayKey !== context.correctivePackage.replayKey
  ) {
    throw new Error("Build 055 active corrective identity is incomplete.");
  }

  const outsiderModel = await listCorrectiveDeliveryForUser(outsiderId);
  if (
    outsiderModel.activations.some(
      (item) => item.activationId === correctiveActivationId
    )
  ) {
    throw new Error("Build 055 corrective activation leaked cross-account.");
  }

  const first = await reserveIdempotentCorrectiveDelivery(ownerId, {
    workspaceId: workspace.id,
    activation,
    plan: context.plan,
    consumerId,
    correctivePackage: context.correctivePackage
  });
  if (
    !first.shouldSend ||
    first.reason !== "initial" ||
    first.delivery.attemptCount !== 1 ||
    first.delivery.idempotencyKey !== context.correctivePackage.replayKey
  ) {
    throw new Error("Build 055 first corrective delivery was not reserved exactly once.");
  }

  await finalizeIdempotentCorrectiveDelivery(ownerId, {
    workspaceId: workspace.id,
    deliveryId: first.delivery.deliveryId,
    status: "transport-error",
    validationCode: "fixture-transport-error"
  });

  const retry = await reserveIdempotentCorrectiveDelivery(ownerId, {
    workspaceId: workspace.id,
    activation,
    plan: context.plan,
    consumerId,
    correctivePackage: context.correctivePackage
  });
  if (
    !retry.shouldSend ||
    retry.reason !== "retry" ||
    retry.delivery.attemptCount !== 2 ||
    retry.delivery.idempotencyKey !== first.delivery.idempotencyKey
  ) {
    throw new Error("Build 055 retry did not reuse the corrective idempotency key.");
  }

  await finalizeIdempotentCorrectiveDelivery(ownerId, {
    workspaceId: workspace.id,
    deliveryId: retry.delivery.deliveryId,
    status: "accepted",
    validationCode: "accepted",
    httpStatus: 200,
    consumerReceivedAt: new Date().toISOString(),
    acknowledgement: {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      status: "accepted",
      code: "accepted",
      target: "rosie-dazzlers",
      packageId: context.correctivePackage.packageId,
      replayKey: context.correctivePackage.replayKey,
      fingerprint: context.correctivePackage.fingerprint,
      dryRun: false
    }
  });

  const terminal = await reserveIdempotentCorrectiveDelivery(ownerId, {
    workspaceId: workspace.id,
    activation,
    plan: context.plan,
    consumerId,
    correctivePackage: context.correctivePackage
  });
  if (
    terminal.shouldSend ||
    terminal.reason !== "accepted" ||
    terminal.delivery.attemptCount !== 2
  ) {
    throw new Error("Build 055 accepted corrective delivery was eligible for resend.");
  }

  let immutableActivationBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_corrective_delivery_activations
         set plan_fingerprint='tampered'
         where workspace_id=$1 and activation_id=$2`,
        [workspace.id, correctiveActivationId]
      );
    });
  } catch {
    immutableActivationBlocked = true;
  }
  if (!immutableActivationBlocked) {
    throw new Error("Build 055 runtime could mutate corrective activation identity.");
  }

  let immutableDeliveryBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_corrective_live_deliveries
         set idempotency_key='tampered'
         where workspace_id=$1 and delivery_id=$2`,
        [workspace.id, first.delivery.deliveryId]
      );
    });
  } catch {
    immutableDeliveryBlocked = true;
  }
  if (!immutableDeliveryBlocked) {
    throw new Error("Build 055 runtime could mutate corrective idempotency identity.");
  }

  const correctiveContext = await loadAcceptedCorrectiveReconciliationContext(
    ownerId,
    {
      workspaceId: workspace.id,
      correctiveDeliveryId: first.delivery.deliveryId
    }
  );
  if (
    correctiveContext.package.packageId !== context.correctivePackage.packageId ||
    correctiveContext.package.replayKey !== context.correctivePackage.replayKey ||
    correctiveContext.package.fingerprint !== context.correctivePackage.fingerprint
  ) {
    throw new Error("Build 055 did not reconstruct the exact accepted corrective package.");
  }

  const correctiveOperation = correctiveContext.package.operations[0];
  if (!correctiveOperation) {
    throw new Error("Build 055 corrective verification operation unavailable.");
  }

  const driftVerification: ConsumerStateVerificationResponse = {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    kind: "state-verification",
    status: "accepted",
    code: "corrective-still-drifted",
    target: "rosie-dazzlers",
    packageId: correctiveContext.package.packageId,
    replayKey: correctiveContext.package.replayKey,
    fingerprint: correctiveContext.package.fingerprint,
    verifiedAt: new Date().toISOString(),
    records: [
      {
        integrationKey: correctiveOperation.integrationKey,
        status: "found",
        values: Object.fromEntries(
          Object.entries(correctiveOperation.values).map(([key, value]) => [
            key,
            key === "priceMinimumCad" ? 998 : value
          ])
        )
      }
    ]
  };
  const driftAfterCorrection = compareCorrectiveConsumerState(
    correctiveContext.package,
    driftVerification
  );
  if (
    driftAfterCorrection.status !== "drift" ||
    driftAfterCorrection.mismatchedCount !== 1
  ) {
    throw new Error("Build 055 did not preserve remaining corrective drift.");
  }
  const driftCorrectiveReconciliationId =
    await recordCorrectiveDeliveryReconciliation(ownerId, {
      workspaceId: workspace.id,
      context: correctiveContext,
      status: driftAfterCorrection.status,
      expectedRecordCount: driftAfterCorrection.expectedRecordCount,
      matchedCount: driftAfterCorrection.matchedCount,
      mismatchedCount: driftAfterCorrection.mismatchedCount,
      missingCount: driftAfterCorrection.missingCount,
      validationCode: driftVerification.code,
      httpStatus: 200,
      consumerVerifiedAt: driftVerification.verifiedAt,
      verificationFingerprint: driftAfterCorrection.verificationFingerprint,
      recordResults: driftAfterCorrection.recordResults
    });

  let driftClosureBlocked = false;
  try {
    await closeVerifiedReconciliationException(ownerId, {
      workspaceId: workspace.id,
      caseId,
      correctiveDeliveryId: first.delivery.deliveryId,
      correctiveReconciliationId: driftCorrectiveReconciliationId,
      closureNote: "Drift must not close."
    });
  } catch (error) {
    driftClosureBlocked =
      error instanceof Error &&
      error.message === "corrective_closure_verified_match_required";
  }
  if (!driftClosureBlocked) {
    throw new Error("Build 055 allowed drift evidence to close the exception.");
  }

  let directClosureBlocked = false;
  const triageBeforeClosure = await listReconciliationExceptionTriageForUser(ownerId);
  const caseBeforeClosure = triageBeforeClosure.cases.find((item) => item.caseId === caseId);
  if (!caseBeforeClosure) {
    throw new Error("Build 055 case disappeared before verified closure.");
  }
  try {
    await updateReconciliationExceptionCase(ownerId, {
      workspaceId: workspace.id,
      caseId,
      status: "closed",
      classification: caseBeforeClosure.classification,
      severity: caseBeforeClosure.severity,
      resolutionIntent: caseBeforeClosure.resolutionIntent,
      summary: caseBeforeClosure.summary,
      investigationNote: caseBeforeClosure.investigationNote
    });
  } catch (error) {
    directClosureBlocked =
      error instanceof Error &&
      error.message === "reconciliation_triage_verified_closure_required";
  }
  if (!directClosureBlocked) {
    throw new Error("Build 055 allowed generic triage closure without verified evidence.");
  }

  let databaseClosureGuardBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_reconciliation_exception_cases
         set status='closed',updated_by=$3,updated_at=now(),closed_by=$3,closed_at=now()
         where workspace_id=$1 and case_id=$2`,
        [workspace.id, caseId, ownerId]
      );
    });
  } catch (error) {
    databaseClosureGuardBlocked =
      error instanceof Error &&
      error.message.includes("reconciliation_triage_verified_closure_required");
  }
  if (!databaseClosureGuardBlocked) {
    throw new Error("Build 055 database trigger allowed closure without verified closure evidence.");
  }

  const matchedVerification: ConsumerStateVerificationResponse = {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    kind: "state-verification",
    status: "accepted",
    code: "corrective-match",
    target: "rosie-dazzlers",
    packageId: correctiveContext.package.packageId,
    replayKey: correctiveContext.package.replayKey,
    fingerprint: correctiveContext.package.fingerprint,
    verifiedAt: new Date().toISOString(),
    records: correctiveContext.package.operations.map((operation) => ({
      integrationKey: operation.integrationKey,
      status: "found",
      values: { ...operation.values }
    }))
  };
  const matchedCorrection = compareCorrectiveConsumerState(
    correctiveContext.package,
    matchedVerification
  );
  if (
    matchedCorrection.status !== "matched" ||
    matchedCorrection.matchedCount !== correctiveContext.package.operations.length
  ) {
    throw new Error("Build 055 matched corrective read-back did not pass.");
  }
  const staleMatchedId = await recordCorrectiveDeliveryReconciliation(ownerId, {
    workspaceId: workspace.id,
    context: correctiveContext,
    status: matchedCorrection.status,
    expectedRecordCount: matchedCorrection.expectedRecordCount,
    matchedCount: matchedCorrection.matchedCount,
    mismatchedCount: matchedCorrection.mismatchedCount,
    missingCount: matchedCorrection.missingCount,
    validationCode: matchedVerification.code,
    httpStatus: 200,
    consumerVerifiedAt: matchedVerification.verifiedAt,
    verificationFingerprint: matchedCorrection.verificationFingerprint,
    recordResults: matchedCorrection.recordResults
  });

  const errorOccurredAt = new Date().toISOString();
  await recordCorrectiveDeliveryReconciliation(ownerId, {
    workspaceId: workspace.id,
    context: correctiveContext,
    status: "transport-error",
    expectedRecordCount: correctiveContext.package.operations.length,
    matchedCount: 0,
    mismatchedCount: 0,
    missingCount: 0,
    validationCode: "fixture-readback-transport-error",
    httpStatus: null,
    consumerVerifiedAt: null,
    verificationFingerprint: correctiveReconciliationErrorFingerprint({
      correctivePackageId: correctiveContext.package.packageId,
      correctiveReplayKey: correctiveContext.package.replayKey,
      correctivePackageFingerprint: correctiveContext.package.fingerprint,
      status: "transport-error",
      validationCode: "fixture-readback-transport-error",
      occurredAt: errorOccurredAt
    }),
    recordResults: []
  });

  let staleMatchedBlocked = false;
  try {
    await closeVerifiedReconciliationException(ownerId, {
      workspaceId: workspace.id,
      caseId,
      correctiveDeliveryId: first.delivery.deliveryId,
      correctiveReconciliationId: staleMatchedId,
      closureNote: "Old match must not outrank newer error."
    });
  } catch (error) {
    staleMatchedBlocked =
      error instanceof Error &&
      error.message === "corrective_closure_latest_verification_required";
  }
  if (!staleMatchedBlocked) {
    throw new Error("Build 055 allowed stale matched evidence to close after newer verification.");
  }

  const finalMatchedVerification = {
    ...matchedVerification,
    code: "corrective-match-final",
    verifiedAt: new Date(Date.now() + 1).toISOString()
  };
  const finalMatched = compareCorrectiveConsumerState(
    correctiveContext.package,
    finalMatchedVerification
  );
  const finalMatchedId = await recordCorrectiveDeliveryReconciliation(ownerId, {
    workspaceId: workspace.id,
    context: correctiveContext,
    status: finalMatched.status,
    expectedRecordCount: finalMatched.expectedRecordCount,
    matchedCount: finalMatched.matchedCount,
    mismatchedCount: finalMatched.mismatchedCount,
    missingCount: finalMatched.missingCount,
    validationCode: finalMatchedVerification.code,
    httpStatus: 200,
    consumerVerifiedAt: finalMatchedVerification.verifiedAt,
    verificationFingerprint: finalMatched.verificationFingerprint,
    recordResults: finalMatched.recordResults
  });

  const closureId = await closeVerifiedReconciliationException(ownerId, {
    workspaceId: workspace.id,
    caseId,
    correctiveDeliveryId: first.delivery.deliveryId,
    correctiveReconciliationId: finalMatchedId,
    closureNote: "Latest independent corrective read-back matches the frozen corrective scope."
  });
  const duplicateClosureId = await closeVerifiedReconciliationException(ownerId, {
    workspaceId: workspace.id,
    caseId,
    correctiveDeliveryId: first.delivery.deliveryId,
    correctiveReconciliationId: finalMatchedId,
    closureNote: "Idempotent duplicate closure request."
  });
  if (duplicateClosureId !== closureId) {
    throw new Error("Build 055 did not canonicalize one verified closure per case.");
  }

  const ownerClosureModel = await listCorrectiveClosureForUser(ownerId);
  const storedClosure = ownerClosureModel.closures.find(
    (item) => item.closureId === closureId
  );
  const closedCase = ownerClosureModel.corrective.triage.cases.find(
    (item) => item.caseId === caseId
  );
  if (
    !storedClosure ||
    storedClosure.correctiveReconciliationId !== finalMatchedId ||
    closedCase?.status !== "closed" ||
    !closedCase.closedAt
  ) {
    throw new Error("Build 055 verified closure evidence did not persist atomically.");
  }

  let directReopenBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_reconciliation_exception_cases
         set status='open',updated_by=$3,updated_at=now(),closed_by=null,closed_at=null
         where workspace_id=$1 and case_id=$2`,
        [workspace.id, caseId, ownerId]
      );
    });
  } catch (error) {
    directReopenBlocked =
      error instanceof Error &&
      error.message.includes("reconciliation_exception_governed_reopen_required");
  }
  if (!directReopenBlocked) {
    throw new Error("Build 056 database trigger allowed a closed exception to reopen without governed evidence.");
  }

  const regressionContext = await loadPostClosureRegressionContext(ownerId, {
    workspaceId: workspace.id,
    closureId
  });
  const stablePostClosure = comparePostClosureConsumerState(
    regressionContext.package,
    {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      kind: "state-verification",
      status: "accepted",
      code: "post-closure-stable",
      target: "rosie-dazzlers",
      packageId: regressionContext.package.packageId,
      replayKey: regressionContext.package.replayKey,
      fingerprint: regressionContext.package.fingerprint,
      verifiedAt: new Date().toISOString(),
      records: regressionContext.package.operations.map((operation) => ({
        integrationKey: operation.integrationKey,
        status: "found",
        values: { ...operation.values }
      }))
    }
  );
  if (stablePostClosure.status !== "stable") {
    throw new Error("Build 056 stable post-closure state did not remain stable.");
  }
  await recordPostClosureRegressionCheck(ownerId, {
    workspaceId: workspace.id,
    context: regressionContext,
    status: stablePostClosure.status,
    expectedRecordCount: stablePostClosure.expectedRecordCount,
    matchedCount: stablePostClosure.matchedCount,
    mismatchedCount: stablePostClosure.mismatchedCount,
    missingCount: stablePostClosure.missingCount,
    validationCode: "post-closure-stable",
    httpStatus: 200,
    consumerVerifiedAt: new Date().toISOString(),
    verificationFingerprint: stablePostClosure.verificationFingerprint,
    recordResults: stablePostClosure.recordResults
  });

  const regressedPostClosure = comparePostClosureConsumerState(
    regressionContext.package,
    {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      kind: "state-verification",
      status: "accepted",
      code: "post-closure-regressed",
      target: "rosie-dazzlers",
      packageId: regressionContext.package.packageId,
      replayKey: regressionContext.package.replayKey,
      fingerprint: regressionContext.package.fingerprint,
      verifiedAt: new Date(Date.now() + 1).toISOString(),
      records: regressionContext.package.operations.map((operation, index) => ({
        integrationKey: operation.integrationKey,
        status: "found",
        values:
          index === 0
            ? Object.fromEntries(
                Object.entries(operation.values).map(([key, value]) => [
                  key,
                  key === "priceMinimumCad" ? 997 : value
                ])
              )
            : { ...operation.values }
      }))
    }
  );
  if (
    regressedPostClosure.status !== "regressed" ||
    regressedPostClosure.mismatchedCount < 1
  ) {
    throw new Error("Build 056 post-closure regression was not detected.");
  }
  const staleRegressionId = await recordPostClosureRegressionCheck(ownerId, {
    workspaceId: workspace.id,
    context: regressionContext,
    status: regressedPostClosure.status,
    expectedRecordCount: regressedPostClosure.expectedRecordCount,
    matchedCount: regressedPostClosure.matchedCount,
    mismatchedCount: regressedPostClosure.mismatchedCount,
    missingCount: regressedPostClosure.missingCount,
    validationCode: "post-closure-regressed",
    httpStatus: 200,
    consumerVerifiedAt: new Date(Date.now() + 1).toISOString(),
    verificationFingerprint: regressedPostClosure.verificationFingerprint,
    recordResults: regressedPostClosure.recordResults
  });

  const newerStable = comparePostClosureConsumerState(
    regressionContext.package,
    {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      kind: "state-verification",
      status: "accepted",
      code: "post-closure-stable-newer",
      target: "rosie-dazzlers",
      packageId: regressionContext.package.packageId,
      replayKey: regressionContext.package.replayKey,
      fingerprint: regressionContext.package.fingerprint,
      verifiedAt: new Date(Date.now() + 2).toISOString(),
      records: regressionContext.package.operations.map((operation) => ({
        integrationKey: operation.integrationKey,
        status: "found",
        values: { ...operation.values }
      }))
    }
  );
  await recordPostClosureRegressionCheck(ownerId, {
    workspaceId: workspace.id,
    context: regressionContext,
    status: newerStable.status,
    expectedRecordCount: newerStable.expectedRecordCount,
    matchedCount: newerStable.matchedCount,
    mismatchedCount: newerStable.mismatchedCount,
    missingCount: newerStable.missingCount,
    validationCode: "post-closure-stable-newer",
    httpStatus: 200,
    consumerVerifiedAt: new Date(Date.now() + 2).toISOString(),
    verificationFingerprint: newerStable.verificationFingerprint,
    recordResults: newerStable.recordResults
  });

  let staleRegressionBlocked = false;
  try {
    await reopenRegressedException(ownerId, {
      workspaceId: workspace.id,
      closureId,
      regressionCheckId: staleRegressionId,
      reopenReason: "Stale regression must not outrank newer stable evidence."
    });
  } catch (error) {
    staleRegressionBlocked =
      error instanceof Error &&
      error.message === "post_closure_reopen_latest_regression_required";
  }
  if (!staleRegressionBlocked) {
    throw new Error("Build 056 allowed stale regression evidence to reopen after a newer stable check.");
  }

  const finalRegression = comparePostClosureConsumerState(
    regressionContext.package,
    {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      kind: "state-verification",
      status: "accepted",
      code: "post-closure-regressed-final",
      target: "rosie-dazzlers",
      packageId: regressionContext.package.packageId,
      replayKey: regressionContext.package.replayKey,
      fingerprint: regressionContext.package.fingerprint,
      verifiedAt: new Date(Date.now() + 3).toISOString(),
      records: regressionContext.package.operations.map((operation, index) => ({
        integrationKey: operation.integrationKey,
        status: "found",
        values:
          index === 0
            ? Object.fromEntries(
                Object.entries(operation.values).map(([key, value]) => [
                  key,
                  key === "priceMinimumCad" ? 996 : value
                ])
              )
            : { ...operation.values }
      }))
    }
  );
  const finalRegressionId = await recordPostClosureRegressionCheck(ownerId, {
    workspaceId: workspace.id,
    context: regressionContext,
    status: finalRegression.status,
    expectedRecordCount: finalRegression.expectedRecordCount,
    matchedCount: finalRegression.matchedCount,
    mismatchedCount: finalRegression.mismatchedCount,
    missingCount: finalRegression.missingCount,
    validationCode: "post-closure-regressed-final",
    httpStatus: 200,
    consumerVerifiedAt: new Date(Date.now() + 3).toISOString(),
    verificationFingerprint: finalRegression.verificationFingerprint,
    recordResults: finalRegression.recordResults
  });

  const reopenId = await reopenRegressedException(ownerId, {
    workspaceId: workspace.id,
    closureId,
    regressionCheckId: finalRegressionId,
    reopenReason: "Newest independent post-closure read-back proves governed state regressed."
  });
  const duplicateReopenId = await reopenRegressedException(ownerId, {
    workspaceId: workspace.id,
    closureId,
    regressionCheckId: finalRegressionId,
    reopenReason: "Idempotent duplicate reopen request."
  });
  if (duplicateReopenId !== reopenId) {
    throw new Error("Build 056 did not canonicalize one reopen per verified closure.");
  }

  const regressionModel = await listPostClosureRegressionForUser(ownerId);
  const reopenedCase = regressionModel.closure.corrective.triage.cases.find(
    (item) => item.caseId === caseId
  );
  const storedReopen = regressionModel.reopens.find(
    (item) => item.reopenId === reopenId
  );
  if (
    reopenedCase?.status !== "open" ||
    reopenedCase.closedAt !== null ||
    !storedReopen ||
    storedReopen.regressionCheckId !== finalRegressionId
  ) {
    throw new Error("Build 056 governed reopen evidence and case transition did not persist atomically.");
  }

  let staleClosureReuseBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_reconciliation_exception_cases
         set status='closed',updated_by=$3,updated_at=now(),closed_by=$3,closed_at=now()
         where workspace_id=$1 and case_id=$2`,
        [workspace.id, caseId, ownerId]
      );
    });
  } catch (error) {
    staleClosureReuseBlocked =
      error instanceof Error &&
      (
        error.message.includes("reconciliation_triage_verified_closure_required") ||
        error.message.includes("reconciliation_triage_verified_successor_reclosure_required")
      );
  }
  if (!staleClosureReuseBlocked) {
    throw new Error("Build 056 allowed the superseded Build 055 closure to silently re-close a reopened case.");
  }

  const outsiderRegressionModel = await listPostClosureRegressionForUser(outsiderId);
  if (
    outsiderRegressionModel.checks.some(
      (item) => item.closureId === closureId
    ) ||
    outsiderRegressionModel.reopens.some((item) => item.reopenId === reopenId)
  ) {
    throw new Error("Build 056 regression or reopen evidence leaked cross-account.");
  }

  let regressionMutationBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_post_closure_regression_checks
         set verification_fingerprint='tampered'
         where workspace_id=$1 and regression_check_id=$2`,
        [workspace.id, finalRegressionId]
      );
    });
  } catch {
    regressionMutationBlocked = true;
  }
  if (!regressionMutationBlocked) {
    throw new Error("Build 056 runtime could mutate regression evidence.");
  }

  let reopenMutationBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_reconciliation_exception_reopens
         set reopen_reason='tampered'
         where workspace_id=$1 and reopen_id=$2`,
        [workspace.id, reopenId]
      );
    });
  } catch {
    reopenMutationBlocked = true;
  }
  if (!reopenMutationBlocked) {
    throw new Error("Build 056 runtime could mutate reopen evidence.");
  }

  const outsiderClosureModel = await listCorrectiveClosureForUser(outsiderId);
  if (
    outsiderClosureModel.reconciliations.some(
      (item) => item.correctiveDeliveryId === first.delivery.deliveryId
    ) ||
    outsiderClosureModel.closures.some((item) => item.closureId === closureId)
  ) {
    throw new Error("Build 055 corrective reconciliation or closure evidence leaked cross-account.");
  }

  let reconciliationMutationBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_corrective_delivery_reconciliations
         set verification_fingerprint='tampered'
         where workspace_id=$1 and corrective_reconciliation_id=$2`,
        [workspace.id, finalMatchedId]
      );
    });
  } catch {
    reconciliationMutationBlocked = true;
  }
  if (!reconciliationMutationBlocked) {
    throw new Error("Build 055 runtime could mutate corrective reconciliation evidence.");
  }

  let closureMutationBlocked = false;
  try {
    await withUserDatabase(ownerId, async (client) => {
      await client.query(
        `update app.workspace_reconciliation_exception_closures
         set closure_note='tampered'
         where workspace_id=$1 and closure_id=$2`,
        [workspace.id, closureId]
      );
    });
  } catch {
    closureMutationBlocked = true;
  }
  if (!closureMutationBlocked) {
    throw new Error("Build 055 runtime could mutate verified closure evidence.");
  }

  const finalTriage = await listReconciliationExceptionTriageForUser(ownerId);
  if (
    !finalTriage.plans.some((item) => item.planId === planId && item.status === "approved") ||
    !finalTriage.cases.some((item) => item.caseId === caseId && item.status === "open")
  ) {
    throw new Error("Build 056 reopen rewrote approved plan evidence or failed to return the case to open.");
  }

  console.log(
    "Build 056 verified closure plus stable/regressed monitoring, latest-regression reopen governance, stale-closure blocking, RLS and immutable evidence passed."
  );
}

main().finally(() => closeDatabasePools());
