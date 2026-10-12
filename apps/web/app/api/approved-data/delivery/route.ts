import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  appendIntegrationDeliveryEvent,
  hasIntegrationConsumerReceipt,
  recordIntegrationConsumerReceipt
} from "@/lib/integration-delivery-database";
import {
  INTEGRATION_CONSUMER_PROTOCOL,
  INTEGRATION_CONTRACTS,
  integrationConsumerConfiguration,
  type IntegrationTarget,
  validateConsumerAcknowledgement,
  validateConsumerHandshake,
  validateIntegrationPackage
} from "@/lib/integration-delivery";
import {
  createPublicationDeliveryMapping,
  listPublicationDeliveryBridgeForUser,
  loadPublicationDeliveryPackage,
  recordPublicationDeliveryReceipt,
  retirePublicationDeliveryMapping
} from "@/lib/publication-delivery-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CONFORMANCE_CONSUMER_ID = "publication-bridge-conformance-v1";

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function target(value: unknown): IntegrationTarget | null {
  return value === "rosie-dazzlers" || value === "devil-n-dove" ? value : null;
}

function statusFor(error: string) {
  if (error.includes("manager_required")) return 403;
  if (error.includes("not_found")) return 404;
  if (
    error.includes("withdrawn") ||
    error.includes("retired") ||
    error.includes("duplicate")
  ) return 409;
  return 400;
}

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

async function fetchConsumer(
  endpoint: string,
  token: string,
  body: Record<string, unknown>
) {
  return fetch(endpoint, {
    method: "POST",
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: {
      authorization: "Bearer " + token,
      "content-type": "application/json",
      "user-agent": "Rosevear-AIDataPlatform-PublicationBridge/1"
    },
    body: JSON.stringify(body)
  });
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listPublicationDeliveryBridgeForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = object(await request.json().catch(() => null));
  const action = text(body.action);

  if (action === "create-mapping") {
    const selectedTarget = target(body.target);
    if (!selectedTarget) {
      return Response.json({ error: "publication_delivery_target_invalid" }, { status: 400 });
    }
    try {
      const mappingId = await createPublicationDeliveryMapping(userId, {
        workspaceId: text(body.workspaceId),
        publicationId: text(body.publicationId),
        target: selectedTarget,
        integrationKeyField: text(body.integrationKeyField),
        operationAction: body.operationAction === "update" ? "update" : "create",
        evidenceUrlField: text(body.evidenceUrlField) || null,
        evidenceTimestampField: text(body.evidenceTimestampField),
        fieldMap: body.fieldMap
      });
      return Response.json(
        {
          mappingId,
          model: await listPublicationDeliveryBridgeForUser(userId)
        },
        { status: 201 }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "publication_delivery_mapping_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  }

  const workspaceId = text(body.workspaceId);
  const mappingId = text(body.mappingId);
  if (!workspaceId || !mappingId) {
    return Response.json({ error: "publication_delivery_mapping_required" }, { status: 400 });
  }

  let bridge;
  try {
    bridge = await loadPublicationDeliveryPackage(userId, {
      workspaceId,
      mappingId
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "publication_delivery_package_failed";
    return Response.json({ error: message }, { status: statusFor(message) });
  }

  const integrationPackage = bridge.package;
  const selectedTarget = bridge.mapping.target;

  if (action === "conformance") {
    await appendIntegrationDeliveryEvent(userId, {
      workspaceId,
      consumerId: CONFORMANCE_CONSUMER_ID,
      target: selectedTarget,
      transportMode: "conformance",
      eventType: "delivery-attempted",
      batchId: integrationPackage.batchId,
      packageId: integrationPackage.packageId,
      replayKey: integrationPackage.replayKey,
      fingerprint: integrationPackage.fingerprint,
      validationCode: "attempted",
      details: {
        dryRun: true,
        publicationId: bridge.publication.publicationId,
        publicationFingerprint: bridge.publication.publicationFingerprint,
        mappingId: bridge.mapping.mappingId,
        mappingFingerprint: bridge.mapping.mappingFingerprint
      }
    });

    const preliminary = validateIntegrationPackage(integrationPackage, {
      expectedTarget: selectedTarget
    });
    const duplicate =
      preliminary.valid &&
      (await hasIntegrationConsumerReceipt(userId, {
        workspaceId,
        consumerId: CONFORMANCE_CONSUMER_ID,
        target: selectedTarget,
        packageId: preliminary.packageId
      }));
    const validation = validateIntegrationPackage(integrationPackage, {
      expectedTarget: selectedTarget,
      seenPackageIds: duplicate ? new Set([preliminary.packageId]) : undefined
    });

    if (!validation.valid) {
      await appendIntegrationDeliveryEvent(userId, {
        workspaceId,
        consumerId: CONFORMANCE_CONSUMER_ID,
        target: selectedTarget,
        transportMode: "conformance",
        eventType: "delivery-rejected",
        batchId: integrationPackage.batchId,
        packageId: integrationPackage.packageId,
        replayKey: integrationPackage.replayKey,
        fingerprint: integrationPackage.fingerprint,
        validationCode: validation.code,
        details: { dryRun: true, publicationId: bridge.publication.publicationId }
      });
      await recordPublicationDeliveryReceipt(userId, {
        workspaceId,
        mappingId,
        publicationId: bridge.publication.publicationId,
        publicationFingerprint: bridge.publication.publicationFingerprint,
        mappingFingerprint: bridge.mapping.mappingFingerprint,
        target: selectedTarget,
        transportMode: "conformance",
        consumerId: CONFORMANCE_CONSUMER_ID,
        package: integrationPackage,
        receiptStatus: "rejected",
        validationCode: validation.code,
        dryRun: true,
        consumerReceivedAt: new Date().toISOString(),
        details: { duplicate }
      });
      return Response.json(
        {
          status: "rejected",
          code: validation.code,
          packageId: integrationPackage.packageId
        },
        { status: validation.code === "duplicate" ? 409 : 422 }
      );
    }

    const inserted = await recordIntegrationConsumerReceipt(userId, {
      workspaceId,
      consumerId: CONFORMANCE_CONSUMER_ID,
      package: integrationPackage
    });
    if (!inserted) {
      return Response.json({ error: "duplicate" }, { status: 409 });
    }

    const receivedAt = new Date().toISOString();
    await appendIntegrationDeliveryEvent(userId, {
      workspaceId,
      consumerId: CONFORMANCE_CONSUMER_ID,
      target: selectedTarget,
      transportMode: "conformance",
      eventType: "delivery-accepted",
      batchId: integrationPackage.batchId,
      packageId: integrationPackage.packageId,
      replayKey: integrationPackage.replayKey,
      fingerprint: integrationPackage.fingerprint,
      validationCode: "valid",
      details: {
        dryRun: true,
        operationCount: integrationPackage.operations.length,
        publicationId: bridge.publication.publicationId,
        publicationFingerprint: bridge.publication.publicationFingerprint,
        mappingId: bridge.mapping.mappingId,
        mappingFingerprint: bridge.mapping.mappingFingerprint
      }
    });
    await recordPublicationDeliveryReceipt(userId, {
      workspaceId,
      mappingId,
      publicationId: bridge.publication.publicationId,
      publicationFingerprint: bridge.publication.publicationFingerprint,
      mappingFingerprint: bridge.mapping.mappingFingerprint,
      target: selectedTarget,
      transportMode: "conformance",
      consumerId: CONFORMANCE_CONSUMER_ID,
      package: integrationPackage,
      receiptStatus: "accepted",
      validationCode: "valid",
      dryRun: true,
      consumerReceivedAt: receivedAt,
      details: { operationCount: integrationPackage.operations.length }
    });
    return Response.json({
      status: "accepted",
      code: "valid",
      target: selectedTarget,
      packageId: integrationPackage.packageId,
      replayKey: integrationPackage.replayKey,
      fingerprint: integrationPackage.fingerprint,
      receivedAt,
      dryRun: true
    });
  }

  if (action !== "probe" && action !== "deliver") {
    return Response.json({ error: "publication_delivery_action_invalid" }, { status: 400 });
  }

  const config = integrationConsumerConfiguration(selectedTarget);
  if (!config.configured || !config.endpoint) {
    return Response.json(
      {
        error: "consumer_not_configured",
        requiredVariables: [config.urlName, config.tokenName]
      },
      { status: 503 }
    );
  }
  const token =
    selectedTarget === "rosie-dazzlers"
      ? (process.env.INTEGRATION_CONSUMER_ROSIE_DAZZLERS_TOKEN ?? "").trim()
      : (process.env.INTEGRATION_CONSUMER_DEVIL_N_DOVE_TOKEN ?? "").trim();
  const consumerId = config.endpointOrigin ?? selectedTarget;

  if (action === "probe") {
    try {
      const contract = INTEGRATION_CONTRACTS[selectedTarget];
      const response = await fetchConsumer(config.endpoint, token, {
        protocol: INTEGRATION_CONSUMER_PROTOCOL,
        kind: "handshake",
        target: selectedTarget,
        contractVersion: 1,
        schemaId: contract.schemaId
      });
      const responseBody = await response.json().catch(() => null);
      const handshake = validateConsumerHandshake(responseBody, selectedTarget);
      await appendIntegrationDeliveryEvent(userId, {
        workspaceId,
        consumerId,
        target: selectedTarget,
        transportMode: "live",
        eventType: "handshake-accepted",
        batchId: integrationPackage.batchId,
        packageId: integrationPackage.packageId,
        replayKey: integrationPackage.replayKey,
        fingerprint: integrationPackage.fingerprint,
        validationCode: "handshake-valid",
        httpStatus: response.status,
        details: {
          dryRunSupported: handshake.dryRunSupported,
          liveMutationEnabled: handshake.liveMutationEnabled,
          publicationId: bridge.publication.publicationId,
          mappingId: bridge.mapping.mappingId
        }
      });
      return Response.json({
        ok: true,
        endpointOrigin: config.endpointOrigin,
        handshake
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "handshake_failed";
      await appendIntegrationDeliveryEvent(userId, {
        workspaceId,
        consumerId,
        target: selectedTarget,
        transportMode: "live",
        eventType: "handshake-rejected",
        batchId: integrationPackage.batchId,
        packageId: integrationPackage.packageId,
        replayKey: integrationPackage.replayKey,
        fingerprint: integrationPackage.fingerprint,
        validationCode: code.slice(0, 96),
        details: { publicationId: bridge.publication.publicationId }
      }).catch(() => undefined);
      return Response.json({ error: code }, { status: 502 });
    }
  }

  await appendIntegrationDeliveryEvent(userId, {
    workspaceId,
    consumerId,
    target: selectedTarget,
    transportMode: "live",
    eventType: "delivery-attempted",
    batchId: integrationPackage.batchId,
    packageId: integrationPackage.packageId,
    replayKey: integrationPackage.replayKey,
    fingerprint: integrationPackage.fingerprint,
    validationCode: "attempted",
    details: {
      dryRun: true,
      operationCount: integrationPackage.operations.length,
      publicationId: bridge.publication.publicationId,
      publicationFingerprint: bridge.publication.publicationFingerprint,
      mappingId: bridge.mapping.mappingId,
      mappingFingerprint: bridge.mapping.mappingFingerprint
    }
  });

  try {
    const response = await fetchConsumer(config.endpoint, token, {
      protocol: INTEGRATION_CONSUMER_PROTOCOL,
      kind: "package",
      dryRun: true,
      package: integrationPackage
    });
    const responseBody = await response.json().catch(() => null);
    const acknowledgement = validateConsumerAcknowledgement(
      responseBody,
      integrationPackage
    );
    if (!acknowledgement.dryRun) {
      throw new Error("consumer_live_mutation_not_approved");
    }

    const accepted = acknowledgement.status === "accepted";
    await appendIntegrationDeliveryEvent(userId, {
      workspaceId,
      consumerId,
      target: selectedTarget,
      transportMode: "live",
      eventType: accepted ? "delivery-accepted" : "delivery-rejected",
      batchId: integrationPackage.batchId,
      packageId: integrationPackage.packageId,
      replayKey: integrationPackage.replayKey,
      fingerprint: integrationPackage.fingerprint,
      validationCode: acknowledgement.code,
      httpStatus: response.status,
      details: {
        dryRun: acknowledgement.dryRun,
        operationCount: integrationPackage.operations.length,
        publicationId: bridge.publication.publicationId,
        publicationFingerprint: bridge.publication.publicationFingerprint,
        mappingId: bridge.mapping.mappingId,
        mappingFingerprint: bridge.mapping.mappingFingerprint
      }
    });
    await recordPublicationDeliveryReceipt(userId, {
      workspaceId,
      mappingId,
      publicationId: bridge.publication.publicationId,
      publicationFingerprint: bridge.publication.publicationFingerprint,
      mappingFingerprint: bridge.mapping.mappingFingerprint,
      target: selectedTarget,
      transportMode: "live",
      consumerId,
      package: integrationPackage,
      receiptStatus: accepted ? "accepted" : "rejected",
      validationCode: acknowledgement.code,
      dryRun: acknowledgement.dryRun,
      consumerReceivedAt: acknowledgement.receivedAt,
      details: {
        httpStatus: response.status,
        operationCount: integrationPackage.operations.length
      }
    });

    return Response.json(
      {
        ok: accepted,
        endpointOrigin: config.endpointOrigin,
        acknowledgement
      },
      { status: accepted ? 200 : 409 }
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "transport_error";
    await appendIntegrationDeliveryEvent(userId, {
      workspaceId,
      consumerId,
      target: selectedTarget,
      transportMode: "live",
      eventType: "transport-error",
      batchId: integrationPackage.batchId,
      packageId: integrationPackage.packageId,
      replayKey: integrationPackage.replayKey,
      fingerprint: integrationPackage.fingerprint,
      validationCode: code.slice(0, 96),
      details: {
        dryRun: true,
        publicationId: bridge.publication.publicationId,
        mappingId: bridge.mapping.mappingId
      }
    }).catch(() => undefined);
    await recordPublicationDeliveryReceipt(userId, {
      workspaceId,
      mappingId,
      publicationId: bridge.publication.publicationId,
      publicationFingerprint: bridge.publication.publicationFingerprint,
      mappingFingerprint: bridge.mapping.mappingFingerprint,
      target: selectedTarget,
      transportMode: "live",
      consumerId,
      package: integrationPackage,
      receiptStatus: "transport-error",
      validationCode: code,
      dryRun: true,
      details: {}
    }).catch(() => undefined);
    return Response.json({ error: code }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = object(await request.json().catch(() => null));
  if (body.action !== "retire-mapping") {
    return Response.json({ error: "publication_delivery_action_invalid" }, { status: 400 });
  }

  try {
    await retirePublicationDeliveryMapping(userId, {
      workspaceId: text(body.workspaceId),
      mappingId: text(body.mappingId),
      retirementNote: text(body.retirementNote)
    });
    return Response.json(await listPublicationDeliveryBridgeForUser(userId));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "publication_delivery_retire_failed";
    return Response.json({ error: message }, { status: statusFor(message) });
  }
}
