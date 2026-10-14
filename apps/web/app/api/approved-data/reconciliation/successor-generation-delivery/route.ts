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
  validateLiveConsumerHandshake,
  type IntegrationTarget
} from "@/lib/integration-delivery";
import {
  createSuccessorGenerationCorrectiveDeliveryActivation,
  finalizeIdempotentSuccessorGenerationCorrectiveDelivery,
  getActiveSuccessorGenerationCorrectiveDeliveryActivation,
  listSuccessorGenerationCorrectiveDeliveryForUser,
  loadApprovedSuccessorGenerationCorrectivePlanContext,
  successorGenerationActivationConfirmation,
  successorGenerationExecutionConfirmation,
  reserveIdempotentSuccessorGenerationCorrectiveDelivery,
  revokeSuccessorGenerationCorrectiveDeliveryActivation
} from "@/lib/successor-generation-corrective-delivery-execution";

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
    error.includes("changed") ||
    error.includes("expired") ||
    error.includes("already_active") ||
    error.includes("identity_conflict") ||
    error.includes("retry_limit") ||
    error.includes("not_active") ||
    error.includes("manual_review") ||
    error.includes("gate_closed") ||
    error.includes("mismatch") ||
    error.includes("identity_reuse")
  ) return 409;
  return 400;
}

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function consumerToken(target: IntegrationTarget) {
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
      "user-agent": "Rosevear-AIDataPlatform-SuccessorGenerationCorrectiveDelivery/1",
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
  target: IntegrationTarget
) {
  const contract = INTEGRATION_CONTRACTS[target];
  const response = await fetchConsumer(endpoint, token, {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    kind: "handshake",
    target,
    contractVersion: 1,
    schemaId: contract.schemaId,
    requestedMode: "live",
    requestedPurpose: "successor-generation-corrective-delivery",
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

function deliveryEnvelope(
  context: Awaited<ReturnType<typeof loadApprovedSuccessorGenerationCorrectivePlanContext>>,
  dryRun: boolean
) {
  return {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    kind: "package",
    dryRun,
    package: context.successorGenerationPackage,
    correctiveContext: {
      build: 66,
      purpose: "successor-generation-corrective-delivery",
      successorGenerationPlanId: context.plan.successorGenerationPlanId,
      successorGenerationPlanFingerprint: context.plan.planFingerprint,
      secondRecurrenceRetriageId: context.plan.secondRecurrenceRetriageId,
      nextGenerationRecurrenceId: context.plan.nextGenerationRecurrenceId,
      nextGenerationReclosureId: context.plan.nextGenerationReclosureId,
      nextGenerationReclosureRegressionCheckId: context.plan.nextGenerationReclosureRegressionCheckId,
      sourceNextGenerationRecurrenceFingerprint: context.plan.sourceNextGenerationRecurrenceFingerprint,
      sourceRegressionFingerprint: context.plan.sourceRegressionFingerprint,
      sourceNextGenerationReclosureFingerprint: context.plan.sourceNextGenerationReclosureFingerprint,
      predecessorSuccessorPlanId: context.plan.predecessorSuccessorPlanId,
      predecessorNextGenerationDeliveryId: context.plan.predecessorNextGenerationDeliveryId,
      predecessorNextGenerationPackageId:
        context.predecessorNextGenerationPackage.packageId,
      predecessorNextGenerationPackageFingerprint:
        context.predecessorNextGenerationPackage.fingerprint
    }
  };
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listSuccessorGenerationCorrectiveDeliveryForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = object(await request.json().catch(() => null));
  const action = text(body.action);
  const workspaceId = text(body.workspaceId);
  const successorGenerationPlanId = text(body.successorGenerationPlanId);
  if (!workspaceId || !successorGenerationPlanId) {
    return Response.json(
      { error: "successor_generation_delivery_plan_required" },
      { status: 400 }
    );
  }

  let context;
  try {
    context = await loadApprovedSuccessorGenerationCorrectivePlanContext(userId, {
      workspaceId,
      successorGenerationPlanId
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "successor_generation_delivery_plan_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }

  const target = context.plan.target;
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
  if (config.endpointOrigin !== context.consumerId) {
    return Response.json(
      { error: "successor_generation_delivery_consumer_identity_changed" },
      { status: 409 }
    );
  }

  const token = consumerToken(target);
  const consumerId = config.endpointOrigin;
  const auditConsumerId = consumerId.slice(0, 128);

  if (action === "activate-successor-generation") {
    if (
      text(body.confirmation) !== successorGenerationActivationConfirmation(target)
    ) {
      return Response.json(
        {
          error: "successor_generation_delivery_activation_confirmation_invalid",
          expected: successorGenerationActivationConfirmation(target)
        },
        { status: 400 }
      );
    }

    try {
      const { response: handshakeResponse, handshake } =
        await fetchLiveHandshake(config.endpoint, token, target);

      await appendIntegrationDeliveryEvent(userId, {
        workspaceId,
        consumerId: auditConsumerId,
        target,
        transportMode: "live",
        eventType: "handshake-accepted",
        batchId: context.successorGenerationPackage.batchId,
        packageId: context.successorGenerationPackage.packageId,
        replayKey: context.successorGenerationPackage.replayKey,
        fingerprint: context.successorGenerationPackage.fingerprint,
        validationCode: "successor-generation-live-capability-valid",
        httpStatus: handshakeResponse.status,
        details: {
          build: 66,
          purpose: "successor-generation-corrective-delivery",
          successorGenerationPlanId,
          successorGenerationPlanFingerprint: context.plan.planFingerprint,
          sourceNextGenerationRecurrenceFingerprint: context.plan.sourceNextGenerationRecurrenceFingerprint,
          predecessorNextGenerationDeliveryId:
            context.plan.predecessorNextGenerationDeliveryId,
          idempotencyKeySource: handshake.idempotency.keySource,
          duplicateBehavior: handshake.idempotency.duplicateBehavior
        }
      });

      await appendIntegrationDeliveryEvent(userId, {
        workspaceId,
        consumerId: auditConsumerId,
        target,
        transportMode: "live",
        eventType: "delivery-attempted",
        batchId: context.successorGenerationPackage.batchId,
        packageId: context.successorGenerationPackage.packageId,
        replayKey: context.successorGenerationPackage.replayKey,
        fingerprint: context.successorGenerationPackage.fingerprint,
        validationCode: "successor-generation-dry-run-attempted",
        details: {
          build: 66,
          dryRun: true,
          successorGenerationPlanId,
          successorGenerationPlanFingerprint: context.plan.planFingerprint
        }
      });

      const dryRunResponse = await fetchConsumer(
        config.endpoint,
        token,
        deliveryEnvelope(context, true)
      );
      const dryRunBody = await dryRunResponse.json().catch(() => null);
      const acknowledgement = validateConsumerAcknowledgement(
        dryRunBody,
        context.successorGenerationPackage
      );
      if (acknowledgement.dryRun !== true) {
        throw new Error(
          "successor_generation_delivery_dry_run_acknowledgement_invalid"
        );
      }

      await appendIntegrationDeliveryEvent(userId, {
        workspaceId,
        consumerId: auditConsumerId,
        target,
        transportMode: "live",
        eventType:
          acknowledgement.status === "accepted"
            ? "delivery-accepted"
            : "delivery-rejected",
        batchId: context.successorGenerationPackage.batchId,
        packageId: context.successorGenerationPackage.packageId,
        replayKey: context.successorGenerationPackage.replayKey,
        fingerprint: context.successorGenerationPackage.fingerprint,
        validationCode: acknowledgement.code,
        httpStatus: dryRunResponse.status,
        details: {
          build: 66,
          dryRun: true,
          successorGenerationPlanId,
          successorGenerationPlanFingerprint: context.plan.planFingerprint
        }
      });

      if (acknowledgement.status !== "accepted") {
        return Response.json(
          {
            error: "successor_generation_delivery_dry_run_rejected",
            acknowledgement
          },
          { status: 409 }
        );
      }

      const activationId =
        await createSuccessorGenerationCorrectiveDeliveryActivation(userId, {
          workspaceId,
          context,
          consumerId,
          handshake,
          dryRunAcknowledgement: acknowledgement,
          dryRunHttpStatus: dryRunResponse.status
        });

      return Response.json(
        {
          activationId,
          successorGenerationPackage: {
            packageId: context.successorGenerationPackage.packageId,
            replayKey: context.successorGenerationPackage.replayKey,
            fingerprint: context.successorGenerationPackage.fingerprint
          },
          model: await listSuccessorGenerationCorrectiveDeliveryForUser(userId)
        },
        { status: 201 }
      );
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : "successor_generation_delivery_activation_failed";
      await appendIntegrationDeliveryEvent(userId, {
        workspaceId,
        consumerId: auditConsumerId,
        target,
        transportMode: "live",
        eventType: "handshake-rejected",
        batchId: context.successorGenerationPackage.batchId,
        packageId: context.successorGenerationPackage.packageId,
        replayKey: context.successorGenerationPackage.replayKey,
        fingerprint: context.successorGenerationPackage.fingerprint,
        validationCode: code.slice(0,96),
        details: {
          build: 66,
          purpose: "successor-generation-corrective-delivery",
          successorGenerationPlanId
        }
      }).catch(() => undefined);
      return Response.json(
        { error: code },
        { status: code.includes("transport") ? 502 : statusFor(code) }
      );
    }
  }

  if (action !== "execute-successor-generation") {
    return Response.json(
      { error: "successor_generation_delivery_action_invalid" },
      { status: 400 }
    );
  }

  if (text(body.confirmation) !== successorGenerationExecutionConfirmation(target)) {
    return Response.json(
      {
        error: "successor_generation_delivery_execution_confirmation_invalid",
        expected: successorGenerationExecutionConfirmation(target)
      },
      { status: 400 }
    );
  }

  let activation;
  try {
    activation = await getActiveSuccessorGenerationCorrectiveDeliveryActivation(
      userId,
      {
        workspaceId,
        successorGenerationPlanId,
        consumerId,
        successorGenerationPackage: context.successorGenerationPackage
      }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "successor_generation_delivery_activation_required";
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
      batchId: context.successorGenerationPackage.batchId,
      packageId: context.successorGenerationPackage.packageId,
      replayKey: context.successorGenerationPackage.replayKey,
      fingerprint: context.successorGenerationPackage.fingerprint,
      validationCode: "successor-generation-live-capability-revalidated",
      httpStatus: response.status,
      details: {
        build: 66,
        successorGenerationPlanId,
        activationId: activation.activationId,
        activationFingerprint: activation.activationFingerprint,
        idempotencyKeySource: handshake.idempotency.keySource,
        duplicateBehavior: handshake.idempotency.duplicateBehavior
      }
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "successor_generation_delivery_handshake_failed";
    await appendIntegrationDeliveryEvent(userId, {
      workspaceId,
      consumerId: auditConsumerId,
      target,
      transportMode: "live",
      eventType: "handshake-rejected",
      batchId: context.successorGenerationPackage.batchId,
      packageId: context.successorGenerationPackage.packageId,
      replayKey: context.successorGenerationPackage.replayKey,
      fingerprint: context.successorGenerationPackage.fingerprint,
      validationCode: code.slice(0,96),
      details: {
        build: 66,
        successorGenerationPlanId,
        activationId: activation.activationId
      }
    }).catch(() => undefined);
    return Response.json({ error: code }, { status: 502 });
  }

  let reservation;
  try {
    reservation = await reserveIdempotentSuccessorGenerationCorrectiveDelivery(
      userId,
      {
        workspaceId,
        activation,
        plan: context.plan,
        consumerId,
        successorGenerationPackage: context.successorGenerationPackage
      }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "successor_generation_delivery_reservation_failed";
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
        model: await listSuccessorGenerationCorrectiveDeliveryForUser(userId)
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
    batchId: context.successorGenerationPackage.batchId,
    packageId: context.successorGenerationPackage.packageId,
    replayKey: context.successorGenerationPackage.replayKey,
    fingerprint: context.successorGenerationPackage.fingerprint,
    validationCode:
      reservation.reason === "retry"
        ? "successor-generation-live-retry-attempted"
        : "successor-generation-live-attempted",
    details: {
      build: 66,
      dryRun: false,
      successorGenerationPlanId,
      successorGenerationPlanFingerprint: context.plan.planFingerprint,
      activationId: activation.activationId,
      activationFingerprint: activation.activationFingerprint,
      sourceNextGenerationRecurrenceFingerprint: context.plan.sourceNextGenerationRecurrenceFingerprint,
      predecessorNextGenerationDeliveryId:
        context.plan.predecessorNextGenerationDeliveryId,
      predecessorNextGenerationPackageId:
        context.predecessorNextGenerationPackage.packageId,
      attemptCount: reservation.delivery.attemptCount,
      idempotencyKey: context.successorGenerationPackage.replayKey
    }
  });

  try {
    const response = await fetchConsumer(
      config.endpoint,
      token,
      deliveryEnvelope(context, false),
      context.successorGenerationPackage.replayKey
    );
    const responseBody = await response.json().catch(() => null);
    const acknowledgement = validateConsumerAcknowledgement(
      responseBody,
      context.successorGenerationPackage
    );
    if (acknowledgement.dryRun !== false) {
      throw new Error("successor_generation_delivery_acknowledgement_invalid");
    }

    const accepted = acknowledgement.status === "accepted";
    const delivery =
      await finalizeIdempotentSuccessorGenerationCorrectiveDelivery(userId, {
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
      batchId: context.successorGenerationPackage.batchId,
      packageId: context.successorGenerationPackage.packageId,
      replayKey: context.successorGenerationPackage.replayKey,
      fingerprint: context.successorGenerationPackage.fingerprint,
      validationCode: acknowledgement.code,
      httpStatus: response.status,
      details: {
        build: 66,
        dryRun: false,
        successorGenerationPlanId,
        successorGenerationPlanFingerprint: context.plan.planFingerprint,
        activationId: activation.activationId,
        activationFingerprint: activation.activationFingerprint,
        attemptCount: delivery.attemptCount,
        idempotencyKey: context.successorGenerationPackage.replayKey
      }
    });

    if (accepted) {
      await recordIntegrationConsumerReceipt(userId, {
        workspaceId,
        consumerId: auditConsumerId,
        package: context.successorGenerationPackage
      });
    }

    return Response.json(
      {
        ok: accepted,
        idempotent: false,
        acknowledgement,
        delivery,
        model: await listSuccessorGenerationCorrectiveDeliveryForUser(userId)
      },
      { status: accepted ? 200 : 409 }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "successor_generation_delivery_transport_error";
    const delivery =
      await finalizeIdempotentSuccessorGenerationCorrectiveDelivery(userId, {
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
      batchId: context.successorGenerationPackage.batchId,
      packageId: context.successorGenerationPackage.packageId,
      replayKey: context.successorGenerationPackage.replayKey,
      fingerprint: context.successorGenerationPackage.fingerprint,
      validationCode: code.slice(0,96),
      details: {
        build: 66,
        dryRun: false,
        successorGenerationPlanId,
        activationId: activation.activationId,
        attemptCount: delivery.attemptCount,
        idempotencyKey: context.successorGenerationPackage.replayKey
      }
    }).catch(() => undefined);

    return Response.json(
      {
        error: code,
        retrySafe: true,
        idempotencyKey: context.successorGenerationPackage.replayKey,
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
  if (body.action !== "revoke-successor-generation") {
    return Response.json(
      { error: "successor_generation_delivery_action_invalid" },
      { status: 400 }
    );
  }

  try {
    await revokeSuccessorGenerationCorrectiveDeliveryActivation(userId, {
      workspaceId: text(body.workspaceId),
      activationId: text(body.activationId),
      note: text(body.note)
    });
    return Response.json(await listSuccessorGenerationCorrectiveDeliveryForUser(userId));
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "successor_generation_delivery_revoke_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}
