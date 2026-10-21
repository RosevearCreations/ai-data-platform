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
  createContinuationCycleCorrectiveDeliveryActivation,
  finalizeIdempotentContinuationCycleCorrectiveDelivery,
  getActiveContinuationCycleCorrectiveDeliveryActivation,
  listContinuationCycleCorrectiveDeliveryForUser,
  loadApprovedContinuationCycleCorrectivePlanContext,
  continuationCycleActivationConfirmation,
  continuationCycleExecutionConfirmation,
  reserveIdempotentContinuationCycleCorrectiveDelivery,
  revokeContinuationCycleCorrectiveDeliveryActivation
} from "@/lib/continuation-cycle-corrective-delivery-execution";

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
      "user-agent": "Rosevear-AIDataPlatform-ContinuationCycleCorrectiveDelivery/1",
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
    requestedPurpose: "continuation-cycle-corrective-delivery",
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
  context: Awaited<ReturnType<typeof loadApprovedContinuationCycleCorrectivePlanContext>>,
  dryRun: boolean
) {
  return {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    kind: "package",
    dryRun,
    package: context.continuationCyclePackage,
    correctiveContext: {
      build: 74,
      purpose: "continuation-cycle-corrective-delivery",
      continuationCyclePlanId: context.plan.continuationCyclePlanId,
      continuationCyclePlanFingerprint: context.plan.planFingerprint,
      successiveCycleRetriageId: context.plan.successiveCycleRetriageId,
      successiveCycleRecurrenceId: context.plan.successiveCycleRecurrenceId,
      successiveCycleReclosureId: context.plan.successiveCycleReclosureId,
      successiveCycleReclosureRegressionCheckId: context.plan.successiveCycleReclosureRegressionCheckId,
      sourceSuccessiveCycleRecurrenceFingerprint: context.plan.sourceSuccessiveCycleRecurrenceFingerprint,
      sourceRegressionFingerprint: context.plan.sourceRegressionFingerprint,
      sourceSuccessiveCycleReclosureFingerprint: context.plan.sourceSuccessiveCycleReclosureFingerprint,
      predecessorSuccessiveCyclePlanId: context.plan.predecessorSuccessiveCyclePlanId,
      predecessorSuccessiveCycleDeliveryId: context.plan.predecessorSuccessiveCycleDeliveryId,
      predecessorSuccessiveCyclePackageId:
        context.predecessorSuccessiveCyclePackage.packageId,
      predecessorSuccessiveCyclePackageFingerprint:
        context.predecessorSuccessiveCyclePackage.fingerprint
    }
  };
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listContinuationCycleCorrectiveDeliveryForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = object(await request.json().catch(() => null));
  const action = text(body.action);
  const workspaceId = text(body.workspaceId);
  const continuationCyclePlanId = text(body.continuationCyclePlanId);
  if (!workspaceId || !continuationCyclePlanId) {
    return Response.json(
      { error: "continuation_cycle_delivery_plan_required" },
      { status: 400 }
    );
  }

  let context;
  try {
    context = await loadApprovedContinuationCycleCorrectivePlanContext(userId, {
      workspaceId,
      continuationCyclePlanId
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "continuation_cycle_delivery_plan_failed";
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
      { error: "continuation_cycle_delivery_consumer_identity_changed" },
      { status: 409 }
    );
  }

  const token = consumerToken(target);
  const consumerId = config.endpointOrigin;
  const auditConsumerId = consumerId.slice(0, 128);

  if (action === "activate-continuation-cycle") {
    if (
      text(body.confirmation) !== continuationCycleActivationConfirmation(target)
    ) {
      return Response.json(
        {
          error: "continuation_cycle_delivery_activation_confirmation_invalid",
          expected: continuationCycleActivationConfirmation(target)
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
        batchId: context.continuationCyclePackage.batchId,
        packageId: context.continuationCyclePackage.packageId,
        replayKey: context.continuationCyclePackage.replayKey,
        fingerprint: context.continuationCyclePackage.fingerprint,
        validationCode: "continuation-cycle-live-capability-valid",
        httpStatus: handshakeResponse.status,
        details: {
          build: 74,
          purpose: "continuation-cycle-corrective-delivery",
          continuationCyclePlanId,
          continuationCyclePlanFingerprint: context.plan.planFingerprint,
          sourceSuccessiveCycleRecurrenceFingerprint: context.plan.sourceSuccessiveCycleRecurrenceFingerprint,
          predecessorSuccessiveCycleDeliveryId:
            context.plan.predecessorSuccessiveCycleDeliveryId,
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
        batchId: context.continuationCyclePackage.batchId,
        packageId: context.continuationCyclePackage.packageId,
        replayKey: context.continuationCyclePackage.replayKey,
        fingerprint: context.continuationCyclePackage.fingerprint,
        validationCode: "continuation-cycle-dry-run-attempted",
        details: {
          build: 74,
          dryRun: true,
          continuationCyclePlanId,
          continuationCyclePlanFingerprint: context.plan.planFingerprint
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
        context.continuationCyclePackage
      );
      if (acknowledgement.dryRun !== true) {
        throw new Error(
          "continuation_cycle_delivery_dry_run_acknowledgement_invalid"
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
        batchId: context.continuationCyclePackage.batchId,
        packageId: context.continuationCyclePackage.packageId,
        replayKey: context.continuationCyclePackage.replayKey,
        fingerprint: context.continuationCyclePackage.fingerprint,
        validationCode: acknowledgement.code,
        httpStatus: dryRunResponse.status,
        details: {
          build: 74,
          dryRun: true,
          continuationCyclePlanId,
          continuationCyclePlanFingerprint: context.plan.planFingerprint
        }
      });

      if (acknowledgement.status !== "accepted") {
        return Response.json(
          {
            error: "continuation_cycle_delivery_dry_run_rejected",
            acknowledgement
          },
          { status: 409 }
        );
      }

      const activationId =
        await createContinuationCycleCorrectiveDeliveryActivation(userId, {
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
          continuationCyclePackage: {
            packageId: context.continuationCyclePackage.packageId,
            replayKey: context.continuationCyclePackage.replayKey,
            fingerprint: context.continuationCyclePackage.fingerprint
          },
          model: await listContinuationCycleCorrectiveDeliveryForUser(userId)
        },
        { status: 201 }
      );
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : "continuation_cycle_delivery_activation_failed";
      await appendIntegrationDeliveryEvent(userId, {
        workspaceId,
        consumerId: auditConsumerId,
        target,
        transportMode: "live",
        eventType: "handshake-rejected",
        batchId: context.continuationCyclePackage.batchId,
        packageId: context.continuationCyclePackage.packageId,
        replayKey: context.continuationCyclePackage.replayKey,
        fingerprint: context.continuationCyclePackage.fingerprint,
        validationCode: code.slice(0,96),
        details: {
          build: 74,
          purpose: "continuation-cycle-corrective-delivery",
          continuationCyclePlanId
        }
      }).catch(() => undefined);
      return Response.json(
        { error: code },
        { status: code.includes("transport") ? 502 : statusFor(code) }
      );
    }
  }

  if (action !== "execute-continuation-cycle") {
    return Response.json(
      { error: "continuation_cycle_delivery_action_invalid" },
      { status: 400 }
    );
  }

  if (text(body.confirmation) !== continuationCycleExecutionConfirmation(target)) {
    return Response.json(
      {
        error: "continuation_cycle_delivery_execution_confirmation_invalid",
        expected: continuationCycleExecutionConfirmation(target)
      },
      { status: 400 }
    );
  }

  let activation;
  try {
    activation = await getActiveContinuationCycleCorrectiveDeliveryActivation(
      userId,
      {
        workspaceId,
        continuationCyclePlanId,
        consumerId,
        continuationCyclePackage: context.continuationCyclePackage
      }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "continuation_cycle_delivery_activation_required";
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
      batchId: context.continuationCyclePackage.batchId,
      packageId: context.continuationCyclePackage.packageId,
      replayKey: context.continuationCyclePackage.replayKey,
      fingerprint: context.continuationCyclePackage.fingerprint,
      validationCode: "continuation-cycle-live-capability-revalidated",
      httpStatus: response.status,
      details: {
        build: 74,
        continuationCyclePlanId,
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
        : "continuation_cycle_delivery_handshake_failed";
    await appendIntegrationDeliveryEvent(userId, {
      workspaceId,
      consumerId: auditConsumerId,
      target,
      transportMode: "live",
      eventType: "handshake-rejected",
      batchId: context.continuationCyclePackage.batchId,
      packageId: context.continuationCyclePackage.packageId,
      replayKey: context.continuationCyclePackage.replayKey,
      fingerprint: context.continuationCyclePackage.fingerprint,
      validationCode: code.slice(0,96),
      details: {
        build: 74,
        continuationCyclePlanId,
        activationId: activation.activationId
      }
    }).catch(() => undefined);
    return Response.json({ error: code }, { status: 502 });
  }

  let reservation;
  try {
    reservation = await reserveIdempotentContinuationCycleCorrectiveDelivery(
      userId,
      {
        workspaceId,
        activation,
        plan: context.plan,
        consumerId,
        continuationCyclePackage: context.continuationCyclePackage
      }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "continuation_cycle_delivery_reservation_failed";
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
        model: await listContinuationCycleCorrectiveDeliveryForUser(userId)
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
    batchId: context.continuationCyclePackage.batchId,
    packageId: context.continuationCyclePackage.packageId,
    replayKey: context.continuationCyclePackage.replayKey,
    fingerprint: context.continuationCyclePackage.fingerprint,
    validationCode:
      reservation.reason === "retry"
        ? "continuation-cycle-live-retry-attempted"
        : "continuation-cycle-live-attempted",
    details: {
      build: 74,
      dryRun: false,
      continuationCyclePlanId,
      continuationCyclePlanFingerprint: context.plan.planFingerprint,
      activationId: activation.activationId,
      activationFingerprint: activation.activationFingerprint,
      sourceSuccessiveCycleRecurrenceFingerprint: context.plan.sourceSuccessiveCycleRecurrenceFingerprint,
      predecessorSuccessiveCycleDeliveryId:
        context.plan.predecessorSuccessiveCycleDeliveryId,
      predecessorSuccessiveCyclePackageId:
        context.predecessorSuccessiveCyclePackage.packageId,
      attemptCount: reservation.delivery.attemptCount,
      idempotencyKey: context.continuationCyclePackage.replayKey
    }
  });

  try {
    const response = await fetchConsumer(
      config.endpoint,
      token,
      deliveryEnvelope(context, false),
      context.continuationCyclePackage.replayKey
    );
    const responseBody = await response.json().catch(() => null);
    const acknowledgement = validateConsumerAcknowledgement(
      responseBody,
      context.continuationCyclePackage
    );
    if (acknowledgement.dryRun !== false) {
      throw new Error("continuation_cycle_delivery_acknowledgement_invalid");
    }

    const accepted = acknowledgement.status === "accepted";
    const delivery =
      await finalizeIdempotentContinuationCycleCorrectiveDelivery(userId, {
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
      batchId: context.continuationCyclePackage.batchId,
      packageId: context.continuationCyclePackage.packageId,
      replayKey: context.continuationCyclePackage.replayKey,
      fingerprint: context.continuationCyclePackage.fingerprint,
      validationCode: acknowledgement.code,
      httpStatus: response.status,
      details: {
        build: 74,
        dryRun: false,
        continuationCyclePlanId,
        continuationCyclePlanFingerprint: context.plan.planFingerprint,
        activationId: activation.activationId,
        activationFingerprint: activation.activationFingerprint,
        attemptCount: delivery.attemptCount,
        idempotencyKey: context.continuationCyclePackage.replayKey
      }
    });

    if (accepted) {
      await recordIntegrationConsumerReceipt(userId, {
        workspaceId,
        consumerId: auditConsumerId,
        package: context.continuationCyclePackage
      });
    }

    return Response.json(
      {
        ok: accepted,
        idempotent: false,
        acknowledgement,
        delivery,
        model: await listContinuationCycleCorrectiveDeliveryForUser(userId)
      },
      { status: accepted ? 200 : 409 }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "continuation_cycle_delivery_transport_error";
    const delivery =
      await finalizeIdempotentContinuationCycleCorrectiveDelivery(userId, {
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
      batchId: context.continuationCyclePackage.batchId,
      packageId: context.continuationCyclePackage.packageId,
      replayKey: context.continuationCyclePackage.replayKey,
      fingerprint: context.continuationCyclePackage.fingerprint,
      validationCode: code.slice(0,96),
      details: {
        build: 74,
        dryRun: false,
        continuationCyclePlanId,
        activationId: activation.activationId,
        attemptCount: delivery.attemptCount,
        idempotencyKey: context.continuationCyclePackage.replayKey
      }
    }).catch(() => undefined);

    return Response.json(
      {
        error: code,
        retrySafe: true,
        idempotencyKey: context.continuationCyclePackage.replayKey,
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
  if (body.action !== "revoke-continuation-cycle") {
    return Response.json(
      { error: "continuation_cycle_delivery_action_invalid" },
      { status: 400 }
    );
  }

  try {
    await revokeContinuationCycleCorrectiveDeliveryActivation(userId, {
      workspaceId: text(body.workspaceId),
      activationId: text(body.activationId),
      note: text(body.note)
    });
    return Response.json(await listContinuationCycleCorrectiveDeliveryForUser(userId));
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "continuation_cycle_delivery_revoke_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}
