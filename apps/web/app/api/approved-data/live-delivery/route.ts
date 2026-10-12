import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  appendIntegrationDeliveryEvent,
  recordIntegrationConsumerReceipt
} from "@/lib/integration-delivery-database";
import {
  INTEGRATION_CONSUMER_PROTOCOL,
  INTEGRATION_CONTRACTS,
  integrationConsumerConfiguration,
  validateConsumerAcknowledgement,
  validateLiveConsumerHandshake
} from "@/lib/integration-delivery";
import {
  createConsumerLiveActivation,
  finalizeIdempotentLiveDelivery,
  getActiveConsumerLiveActivation,
  listControlledLiveDeliveryForUser,
  liveActivationConfirmation,
  liveDeliveryConfirmation,
  reserveIdempotentLiveDelivery,
  revokeConsumerLiveActivation
} from "@/lib/controlled-live-delivery";
import {
  loadPublicationDeliveryPackage,
  recordPublicationDeliveryReceipt
} from "@/lib/publication-delivery-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function statusFor(error: string) {
  if (error.includes("manager_required")) return 403;
  if (error.includes("not_found")) return 404;
  if (
    error.includes("required") ||
    error.includes("in_progress") ||
    error.includes("already_active") ||
    error.includes("identity_conflict") ||
    error.includes("retry_limit") ||
    error.includes("not_active")
  ) return 409;
  return 400;
}

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function consumerToken(target: "rosie-dazzlers" | "devil-n-dove") {
  return target === "rosie-dazzlers"
    ? (process.env.INTEGRATION_CONSUMER_ROSIE_DAZZLERS_TOKEN ?? "").trim()
    : (process.env.INTEGRATION_CONSUMER_DEVIL_N_DOVE_TOKEN ?? "").trim();
}

async function fetchConsumer(
  endpoint: string,
  token: string,
  body: Record<string, unknown>,
  idempotencyKey?: string
) {
  return fetch(endpoint, {
    method: "POST",
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: {
      authorization: "Bearer " + token,
      "content-type": "application/json",
      "user-agent": "Rosevear-AIDataPlatform-LiveDelivery/1",
      ...(idempotencyKey
        ? {
            "idempotency-key": idempotencyKey,
            "x-rosevear-replay-key": idempotencyKey
          }
        : {})
    },
    body: JSON.stringify(body)
  });
}

async function fetchLiveHandshake(
  endpoint: string,
  token: string,
  target: "rosie-dazzlers" | "devil-n-dove"
) {
  const contract = INTEGRATION_CONTRACTS[target];
  const response = await fetchConsumer(endpoint, token, {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    kind: "handshake",
    target,
    contractVersion: 1,
    schemaId: contract.schemaId,
    requestedMode: "live",
    requiredIdempotency: {
      keySource: "replayKey",
      duplicateBehavior: "return-original-ack"
    }
  });
  const body = await response.json().catch(() => null);
  return {
    response,
    handshake: validateLiveConsumerHandshake(body, target)
  };
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listControlledLiveDeliveryForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = object(await request.json().catch(() => null));
  const action = text(body.action);
  const workspaceId = text(body.workspaceId);
  const mappingId = text(body.mappingId);
  if (!workspaceId || !mappingId) {
    return Response.json({ error: "consumer_live_mapping_required" }, { status: 400 });
  }

  let bridge;
  try {
    bridge = await loadPublicationDeliveryPackage(userId, {
      workspaceId,
      mappingId
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "consumer_live_package_failed";
    return Response.json({ error: message }, { status: statusFor(message) });
  }

  const target = bridge.mapping.target;
  const config = integrationConsumerConfiguration(target);
  if (!config.configured || !config.endpoint || !config.endpointOrigin) {
    return Response.json(
      {
        error: "consumer_not_configured",
        requiredVariables: [config.urlName, config.tokenName]
      },
      { status: 503 }
    );
  }
  const token = consumerToken(target);
  const consumerId = config.endpointOrigin;
  const auditConsumerId = consumerId.slice(0, 128);

  if (action === "activate-live") {
    if (text(body.confirmation) !== liveActivationConfirmation(target)) {
      return Response.json(
        {
          error: "consumer_live_confirmation_invalid",
          expected: liveActivationConfirmation(target)
        },
        { status: 400 }
      );
    }

    try {
      const { response, handshake } = await fetchLiveHandshake(
        config.endpoint,
        token,
        target
      );
      await appendIntegrationDeliveryEvent(userId, {
        workspaceId,
        consumerId: auditConsumerId,
        target,
        transportMode: "live",
        eventType: "handshake-accepted",
        batchId: bridge.package.batchId,
        packageId: bridge.package.packageId,
        replayKey: bridge.package.replayKey,
        fingerprint: bridge.package.fingerprint,
        validationCode: "live-capability-valid",
        httpStatus: response.status,
        details: {
          build: 51,
          liveMutationEnabled: true,
          idempotencyKeySource: handshake.idempotency.keySource,
          duplicateBehavior: handshake.idempotency.duplicateBehavior,
          mappingId,
          publicationId: bridge.publication.publicationId
        }
      });

      const activationId = await createConsumerLiveActivation(userId, {
        workspaceId,
        mappingId,
        publicationId: bridge.publication.publicationId,
        target,
        consumerId,
        publicationFingerprint: bridge.publication.publicationFingerprint,
        mappingFingerprint: bridge.mapping.mappingFingerprint,
        package: bridge.package,
        handshake
      });
      return Response.json(
        {
          activationId,
          model: await listControlledLiveDeliveryForUser(userId)
        },
        { status: 201 }
      );
    } catch (error) {
      const code =
        error instanceof Error ? error.message : "consumer_live_activation_failed";
      await appendIntegrationDeliveryEvent(userId, {
        workspaceId,
        consumerId: auditConsumerId,
        target,
        transportMode: "live",
        eventType: "handshake-rejected",
        batchId: bridge.package.batchId,
        packageId: bridge.package.packageId,
        replayKey: bridge.package.replayKey,
        fingerprint: bridge.package.fingerprint,
        validationCode: code.slice(0, 96),
        details: {
          build: 51,
          mappingId,
          publicationId: bridge.publication.publicationId
        }
      }).catch(() => undefined);
      return Response.json({ error: code }, { status: statusFor(code) || 502 });
    }
  }

  if (action !== "live-deliver") {
    return Response.json({ error: "consumer_live_action_invalid" }, { status: 400 });
  }

  if (text(body.confirmation) !== liveDeliveryConfirmation(target)) {
    return Response.json(
      {
        error: "consumer_live_delivery_confirmation_invalid",
        expected: liveDeliveryConfirmation(target)
      },
      { status: 400 }
    );
  }

  let activation;
  try {
    activation = await getActiveConsumerLiveActivation(userId, {
      workspaceId,
      mappingId,
      consumerId,
      package: bridge.package
    });
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "consumer_live_activation_required";
    return Response.json({ error: code }, { status: statusFor(code) });
  }

  try {
    const { response, handshake } = await fetchLiveHandshake(
      config.endpoint,
      token,
      target
    );
    await appendIntegrationDeliveryEvent(userId, {
      workspaceId,
      consumerId: auditConsumerId,
      target,
      transportMode: "live",
      eventType: "handshake-accepted",
      batchId: bridge.package.batchId,
      packageId: bridge.package.packageId,
      replayKey: bridge.package.replayKey,
      fingerprint: bridge.package.fingerprint,
      validationCode: "live-capability-revalidated",
      httpStatus: response.status,
      details: {
        build: 51,
        activationId: activation.activationId,
        activationFingerprint: activation.activationFingerprint,
        idempotencyKeySource: handshake.idempotency.keySource,
        duplicateBehavior: handshake.idempotency.duplicateBehavior
      }
    });
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "consumer_live_handshake_failed";
    await appendIntegrationDeliveryEvent(userId, {
      workspaceId,
      consumerId: auditConsumerId,
      target,
      transportMode: "live",
      eventType: "handshake-rejected",
      batchId: bridge.package.batchId,
      packageId: bridge.package.packageId,
      replayKey: bridge.package.replayKey,
      fingerprint: bridge.package.fingerprint,
      validationCode: code.slice(0, 96),
      details: {
        build: 51,
        activationId: activation.activationId
      }
    }).catch(() => undefined);
    return Response.json({ error: code }, { status: 502 });
  }

  let reservation;
  try {
    reservation = await reserveIdempotentLiveDelivery(userId, {
      workspaceId,
      activationId: activation.activationId,
      mappingId,
      publicationId: bridge.publication.publicationId,
      target,
      consumerId,
      publicationFingerprint: bridge.publication.publicationFingerprint,
      mappingFingerprint: bridge.mapping.mappingFingerprint,
      activationFingerprint: activation.activationFingerprint,
      package: bridge.package
    });
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "consumer_live_reservation_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }

  if (!reservation.shouldSend) {
    const accepted = reservation.delivery.status === "accepted";
    return Response.json(
      {
        ok: accepted,
        idempotent: true,
        status: reservation.delivery.status,
        delivery: reservation.delivery,
        model: await listControlledLiveDeliveryForUser(userId)
      },
      { status: accepted ? 200 : 409 }
    );
  }

  await appendIntegrationDeliveryEvent(userId, {
    workspaceId,
    consumerId: auditConsumerId,
    target,
    transportMode: "live",
    eventType: "delivery-attempted",
    batchId: bridge.package.batchId,
    packageId: bridge.package.packageId,
    replayKey: bridge.package.replayKey,
    fingerprint: bridge.package.fingerprint,
    validationCode:
      reservation.reason === "retry" ? "live-retry-attempted" : "live-attempted",
    details: {
      build: 51,
      dryRun: false,
      activationId: activation.activationId,
      activationFingerprint: activation.activationFingerprint,
      mappingId,
      mappingFingerprint: bridge.mapping.mappingFingerprint,
      publicationId: bridge.publication.publicationId,
      publicationFingerprint: bridge.publication.publicationFingerprint,
      attemptCount: reservation.delivery.attemptCount,
      idempotencyKey: bridge.package.replayKey
    }
  });

  try {
    const response = await fetchConsumer(
      config.endpoint,
      token,
      {
        protocol: INTEGRATION_CONSUMER_PROTOCOL,
        kind: "package",
        dryRun: false,
        package: bridge.package
      },
      bridge.package.replayKey
    );
    const responseBody = await response.json().catch(() => null);
    const acknowledgement = validateConsumerAcknowledgement(
      responseBody,
      bridge.package
    );
    if (acknowledgement.dryRun !== false) {
      throw new Error("consumer_live_acknowledgement_invalid");
    }

    const accepted = acknowledgement.status === "accepted";
    const delivery = await finalizeIdempotentLiveDelivery(userId, {
      workspaceId,
      deliveryId: reservation.delivery.deliveryId,
      status: accepted ? "accepted" : "rejected",
      validationCode: acknowledgement.code,
      httpStatus: response.status,
      consumerReceivedAt: acknowledgement.receivedAt,
      acknowledgement: object(responseBody)
    });

    await appendIntegrationDeliveryEvent(userId, {
      workspaceId,
      consumerId: auditConsumerId,
      target,
      transportMode: "live",
      eventType: accepted ? "delivery-accepted" : "delivery-rejected",
      batchId: bridge.package.batchId,
      packageId: bridge.package.packageId,
      replayKey: bridge.package.replayKey,
      fingerprint: bridge.package.fingerprint,
      validationCode: acknowledgement.code,
      httpStatus: response.status,
      details: {
        build: 51,
        dryRun: false,
        activationId: activation.activationId,
        activationFingerprint: activation.activationFingerprint,
        mappingId,
        publicationId: bridge.publication.publicationId,
        attemptCount: delivery.attemptCount,
        idempotencyKey: bridge.package.replayKey
      }
    });

    await recordPublicationDeliveryReceipt(userId, {
      workspaceId,
      mappingId,
      publicationId: bridge.publication.publicationId,
      publicationFingerprint: bridge.publication.publicationFingerprint,
      mappingFingerprint: bridge.mapping.mappingFingerprint,
      target,
      transportMode: "live",
      consumerId,
      package: bridge.package,
      receiptStatus: accepted ? "accepted" : "rejected",
      validationCode: acknowledgement.code,
      dryRun: false,
      consumerReceivedAt: acknowledgement.receivedAt,
      details: {
        build: 51,
        activationId: activation.activationId,
        activationFingerprint: activation.activationFingerprint,
        attemptCount: delivery.attemptCount,
        idempotencyKey: bridge.package.replayKey,
        httpStatus: response.status
      }
    });

    if (accepted) {
      await recordIntegrationConsumerReceipt(userId, {
        workspaceId,
        consumerId: auditConsumerId,
        package: bridge.package
      });
    }

    return Response.json(
      {
        ok: accepted,
        idempotent: false,
        acknowledgement,
        delivery,
        model: await listControlledLiveDeliveryForUser(userId)
      },
      { status: accepted ? 200 : 409 }
    );
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "consumer_live_transport_error";
    const delivery = await finalizeIdempotentLiveDelivery(userId, {
      workspaceId,
      deliveryId: reservation.delivery.deliveryId,
      status: "transport-error",
      validationCode: code,
      acknowledgement: {}
    }).catch(() => reservation.delivery);

    await appendIntegrationDeliveryEvent(userId, {
      workspaceId,
      consumerId: auditConsumerId,
      target,
      transportMode: "live",
      eventType: "transport-error",
      batchId: bridge.package.batchId,
      packageId: bridge.package.packageId,
      replayKey: bridge.package.replayKey,
      fingerprint: bridge.package.fingerprint,
      validationCode: code.slice(0, 96),
      details: {
        build: 51,
        dryRun: false,
        activationId: activation.activationId,
        mappingId,
        publicationId: bridge.publication.publicationId,
        attemptCount: delivery.attemptCount,
        idempotencyKey: bridge.package.replayKey
      }
    }).catch(() => undefined);

    await recordPublicationDeliveryReceipt(userId, {
      workspaceId,
      mappingId,
      publicationId: bridge.publication.publicationId,
      publicationFingerprint: bridge.publication.publicationFingerprint,
      mappingFingerprint: bridge.mapping.mappingFingerprint,
      target,
      transportMode: "live",
      consumerId,
      package: bridge.package,
      receiptStatus: "transport-error",
      validationCode: code,
      dryRun: false,
      details: {
        build: 51,
        activationId: activation.activationId,
        attemptCount: delivery.attemptCount,
        idempotencyKey: bridge.package.replayKey
      }
    }).catch(() => undefined);

    return Response.json(
      {
        error: code,
        retrySafe: true,
        idempotencyKey: bridge.package.replayKey,
        delivery
      },
      { status: 502 }
    );
  }
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = object(await request.json().catch(() => null));
  if (body.action !== "revoke-live") {
    return Response.json({ error: "consumer_live_action_invalid" }, { status: 400 });
  }

  try {
    await revokeConsumerLiveActivation(userId, {
      workspaceId: text(body.workspaceId),
      activationId: text(body.activationId),
      note: text(body.note)
    });
    return Response.json(await listControlledLiveDeliveryForUser(userId));
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "consumer_live_revoke_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}
