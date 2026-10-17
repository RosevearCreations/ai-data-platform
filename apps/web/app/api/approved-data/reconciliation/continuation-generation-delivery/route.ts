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
  createContinuationGenerationCorrectiveDeliveryActivation,
  finalizeIdempotentContinuationGenerationCorrectiveDelivery,
  getActiveContinuationGenerationCorrectiveDeliveryActivation,
  listContinuationGenerationCorrectiveDeliveryForUser,
  loadApprovedContinuationGenerationCorrectivePlanContext,
  continuationGenerationActivationConfirmation,
  continuationGenerationExecutionConfirmation,
  reserveIdempotentContinuationGenerationCorrectiveDelivery,
  revokeContinuationGenerationCorrectiveDeliveryActivation
} from "@/lib/continuation-generation-corrective-delivery-execution";

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
      "user-agent": "Rosevear-AIDataPlatform-ContinuationGenerationCorrectiveDelivery/1",
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
    requestedPurpose: "continuation-generation-corrective-delivery",
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
  context: Awaited<ReturnType<typeof loadApprovedContinuationGenerationCorrectivePlanContext>>,
  dryRun: boolean
) {
  return {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    kind: "package",
    dryRun,
    package: context.continuationGenerationPackage,
    correctiveContext: {
      build: 74,
      purpose: "continuation-generation-corrective-delivery",
      continuationGenerationPlanId: context.plan.continuationGenerationPlanId,
      continuationGenerationPlanFingerprint: context.plan.planFingerprint,
      successiveGenerationRetriageId: context.plan.successiveGenerationRetriageId,
      successiveGenerationRecurrenceId: context.plan.successiveGenerationRecurrenceId,
      successiveGenerationReclosureId: context.plan.successiveGenerationReclosureId,
      successiveGenerationReclosureRegressionCheckId: context.plan.successiveGenerationReclosureRegressionCheckId,
      sourceSuccessiveGenerationRecurrenceFingerprint: context.plan.sourceSuccessiveGenerationRecurrenceFingerprint,
      sourceRegressionFingerprint: context.plan.sourceRegressionFingerprint,
      sourceSuccessiveGenerationReclosureFingerprint: context.plan.sourceSuccessiveGenerationReclosureFingerprint,
      predecessorSuccessiveGenerationPlanId: context.plan.predecessorSuccessiveGenerationPlanId,
      predecessorSuccessiveGenerationDeliveryId: context.plan.predecessorSuccessiveGenerationDeliveryId,
      predecessorSuccessiveGenerationPackageId:
        context.predecessorSuccessiveGenerationPackage.packageId,
      predecessorSuccessiveGenerationPackageFingerprint:
        context.predecessorSuccessiveGenerationPackage.fingerprint
    }
  };
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listContinuationGenerationCorrectiveDeliveryForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = object(await request.json().catch(() => null));
  const action = text(body.action);
  const workspaceId = text(body.workspaceId);
  const continuationGenerationPlanId = text(body.continuationGenerationPlanId);
  if (!workspaceId || !continuationGenerationPlanId) {
    return Response.json(
      { error: "continuation_generation_delivery_plan_required" },
      { status: 400 }
    );
  }

  let context;
  try {
    context = await loadApprovedContinuationGenerationCorrectivePlanContext(userId, {
      workspaceId,
      continuationGenerationPlanId
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "continuation_generation_delivery_plan_failed";
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
      { error: "continuation_generation_delivery_consumer_identity_changed" },
      { status: 409 }
    );
  }

  const token = consumerToken(target);
  const consumerId = config.endpointOrigin;
  const auditConsumerId = consumerId.slice(0, 128);

  if (action === "activate-continuation-generation") {
    if (
      text(body.confirmation) !== continuationGenerationActivationConfirmation(target)
    ) {
      return Response.json(
        {
          error: "continuation_generation_delivery_activation_confirmation_invalid",
          expected: continuationGenerationActivationConfirmation(target)
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
        batchId: context.continuationGenerationPackage.batchId,
        packageId: context.continuationGenerationPackage.packageId,
        replayKey: context.continuationGenerationPackage.replayKey,
        fingerprint: context.continuationGenerationPackage.fingerprint,
        validationCode: "continuation-generation-live-capability-valid",
        httpStatus: handshakeResponse.status,
        details: {
          build: 74,
          purpose: "continuation-generation-corrective-delivery",
          continuationGenerationPlanId,
          continuationGenerationPlanFingerprint: context.plan.planFingerprint,
          sourceSuccessiveGenerationRecurrenceFingerprint: context.plan.sourceSuccessiveGenerationRecurrenceFingerprint,
          predecessorSuccessiveGenerationDeliveryId:
            context.plan.predecessorSuccessiveGenerationDeliveryId,
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
        batchId: context.continuationGenerationPackage.batchId,
        packageId: context.continuationGenerationPackage.packageId,
        replayKey: context.continuationGenerationPackage.replayKey,
        fingerprint: context.continuationGenerationPackage.fingerprint,
        validationCode: "continuation-generation-dry-run-attempted",
        details: {
          build: 74,
          dryRun: true,
          continuationGenerationPlanId,
          continuationGenerationPlanFingerprint: context.plan.planFingerprint
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
        context.continuationGenerationPackage
      );
      if (acknowledgement.dryRun !== true) {
        throw new Error(
          "continuation_generation_delivery_dry_run_acknowledgement_invalid"
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
        batchId: context.continuationGenerationPackage.batchId,
        packageId: context.continuationGenerationPackage.packageId,
        replayKey: context.continuationGenerationPackage.replayKey,
        fingerprint: context.continuationGenerationPackage.fingerprint,
        validationCode: acknowledgement.code,
        httpStatus: dryRunResponse.status,
        details: {
          build: 74,
          dryRun: true,
          continuationGenerationPlanId,
          continuationGenerationPlanFingerprint: context.plan.planFingerprint
        }
      });

      if (acknowledgement.status !== "accepted") {
        return Response.json(
          {
            error: "continuation_generation_delivery_dry_run_rejected",
            acknowledgement
          },
          { status: 409 }
        );
      }

      const activationId =
        await createContinuationGenerationCorrectiveDeliveryActivation(userId, {
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
          continuationGenerationPackage: {
            packageId: context.continuationGenerationPackage.packageId,
            replayKey: context.continuationGenerationPackage.replayKey,
            fingerprint: context.continuationGenerationPackage.fingerprint
          },
          model: await listContinuationGenerationCorrectiveDeliveryForUser(userId)
        },
        { status: 201 }
      );
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : "continuation_generation_delivery_activation_failed";
      await appendIntegrationDeliveryEvent(userId, {
        workspaceId,
        consumerId: auditConsumerId,
        target,
        transportMode: "live",
        eventType: "handshake-rejected",
        batchId: context.continuationGenerationPackage.batchId,
        packageId: context.continuationGenerationPackage.packageId,
        replayKey: context.continuationGenerationPackage.replayKey,
        fingerprint: context.continuationGenerationPackage.fingerprint,
        validationCode: code.slice(0,96),
        details: {
          build: 74,
          purpose: "continuation-generation-corrective-delivery",
          continuationGenerationPlanId
        }
      }).catch(() => undefined);
      return Response.json(
        { error: code },
        { status: code.includes("transport") ? 502 : statusFor(code) }
      );
    }
  }

  if (action !== "execute-continuation-generation") {
    return Response.json(
      { error: "continuation_generation_delivery_action_invalid" },
      { status: 400 }
    );
  }

  if (text(body.confirmation) !== continuationGenerationExecutionConfirmation(target)) {
    return Response.json(
      {
        error: "continuation_generation_delivery_execution_confirmation_invalid",
        expected: continuationGenerationExecutionConfirmation(target)
      },
      { status: 400 }
    );
  }

  let activation;
  try {
    activation = await getActiveContinuationGenerationCorrectiveDeliveryActivation(
      userId,
      {
        workspaceId,
        continuationGenerationPlanId,
        consumerId,
        continuationGenerationPackage: context.continuationGenerationPackage
      }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "continuation_generation_delivery_activation_required";
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
      batchId: context.continuationGenerationPackage.batchId,
      packageId: context.continuationGenerationPackage.packageId,
      replayKey: context.continuationGenerationPackage.replayKey,
      fingerprint: context.continuationGenerationPackage.fingerprint,
      validationCode: "continuation-generation-live-capability-revalidated",
      httpStatus: response.status,
      details: {
        build: 74,
        continuationGenerationPlanId,
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
        : "continuation_generation_delivery_handshake_failed";
    await appendIntegrationDeliveryEvent(userId, {
      workspaceId,
      consumerId: auditConsumerId,
      target,
      transportMode: "live",
      eventType: "handshake-rejected",
      batchId: context.continuationGenerationPackage.batchId,
      packageId: context.continuationGenerationPackage.packageId,
      replayKey: context.continuationGenerationPackage.replayKey,
      fingerprint: context.continuationGenerationPackage.fingerprint,
      validationCode: code.slice(0,96),
      details: {
        build: 74,
        continuationGenerationPlanId,
        activationId: activation.activationId
      }
    }).catch(() => undefined);
    return Response.json({ error: code }, { status: 502 });
  }

  let reservation;
  try {
    reservation = await reserveIdempotentContinuationGenerationCorrectiveDelivery(
      userId,
      {
        workspaceId,
        activation,
        plan: context.plan,
        consumerId,
        continuationGenerationPackage: context.continuationGenerationPackage
      }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "continuation_generation_delivery_reservation_failed";
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
        model: await listContinuationGenerationCorrectiveDeliveryForUser(userId)
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
    batchId: context.continuationGenerationPackage.batchId,
    packageId: context.continuationGenerationPackage.packageId,
    replayKey: context.continuationGenerationPackage.replayKey,
    fingerprint: context.continuationGenerationPackage.fingerprint,
    validationCode:
      reservation.reason === "retry"
        ? "continuation-generation-live-retry-attempted"
        : "continuation-generation-live-attempted",
    details: {
      build: 74,
      dryRun: false,
      continuationGenerationPlanId,
      continuationGenerationPlanFingerprint: context.plan.planFingerprint,
      activationId: activation.activationId,
      activationFingerprint: activation.activationFingerprint,
      sourceSuccessiveGenerationRecurrenceFingerprint: context.plan.sourceSuccessiveGenerationRecurrenceFingerprint,
      predecessorSuccessiveGenerationDeliveryId:
        context.plan.predecessorSuccessiveGenerationDeliveryId,
      predecessorSuccessiveGenerationPackageId:
        context.predecessorSuccessiveGenerationPackage.packageId,
      attemptCount: reservation.delivery.attemptCount,
      idempotencyKey: context.continuationGenerationPackage.replayKey
    }
  });

  try {
    const response = await fetchConsumer(
      config.endpoint,
      token,
      deliveryEnvelope(context, false),
      context.continuationGenerationPackage.replayKey
    );
    const responseBody = await response.json().catch(() => null);
    const acknowledgement = validateConsumerAcknowledgement(
      responseBody,
      context.continuationGenerationPackage
    );
    if (acknowledgement.dryRun !== false) {
      throw new Error("continuation_generation_delivery_acknowledgement_invalid");
    }

    const accepted = acknowledgement.status === "accepted";
    const delivery =
      await finalizeIdempotentContinuationGenerationCorrectiveDelivery(userId, {
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
      batchId: context.continuationGenerationPackage.batchId,
      packageId: context.continuationGenerationPackage.packageId,
      replayKey: context.continuationGenerationPackage.replayKey,
      fingerprint: context.continuationGenerationPackage.fingerprint,
      validationCode: acknowledgement.code,
      httpStatus: response.status,
      details: {
        build: 74,
        dryRun: false,
        continuationGenerationPlanId,
        continuationGenerationPlanFingerprint: context.plan.planFingerprint,
        activationId: activation.activationId,
        activationFingerprint: activation.activationFingerprint,
        attemptCount: delivery.attemptCount,
        idempotencyKey: context.continuationGenerationPackage.replayKey
      }
    });

    if (accepted) {
      await recordIntegrationConsumerReceipt(userId, {
        workspaceId,
        consumerId: auditConsumerId,
        package: context.continuationGenerationPackage
      });
    }

    return Response.json(
      {
        ok: accepted,
        idempotent: false,
        acknowledgement,
        delivery,
        model: await listContinuationGenerationCorrectiveDeliveryForUser(userId)
      },
      { status: accepted ? 200 : 409 }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "continuation_generation_delivery_transport_error";
    const delivery =
      await finalizeIdempotentContinuationGenerationCorrectiveDelivery(userId, {
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
      batchId: context.continuationGenerationPackage.batchId,
      packageId: context.continuationGenerationPackage.packageId,
      replayKey: context.continuationGenerationPackage.replayKey,
      fingerprint: context.continuationGenerationPackage.fingerprint,
      validationCode: code.slice(0,96),
      details: {
        build: 74,
        dryRun: false,
        continuationGenerationPlanId,
        activationId: activation.activationId,
        attemptCount: delivery.attemptCount,
        idempotencyKey: context.continuationGenerationPackage.replayKey
      }
    }).catch(() => undefined);

    return Response.json(
      {
        error: code,
        retrySafe: true,
        idempotencyKey: context.continuationGenerationPackage.replayKey,
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
  if (body.action !== "revoke-continuation-generation") {
    return Response.json(
      { error: "continuation_generation_delivery_action_invalid" },
      { status: 400 }
    );
  }

  try {
    await revokeContinuationGenerationCorrectiveDeliveryActivation(userId, {
      workspaceId: text(body.workspaceId),
      activationId: text(body.activationId),
      note: text(body.note)
    });
    return Response.json(await listContinuationGenerationCorrectiveDeliveryForUser(userId));
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "continuation_generation_delivery_revoke_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}
