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
  createSubsequentCycleCorrectiveDeliveryActivation,
  finalizeIdempotentSubsequentCycleCorrectiveDelivery,
  getActiveSubsequentCycleCorrectiveDeliveryActivation,
  listSubsequentCycleCorrectiveDeliveryForUser,
  loadApprovedSubsequentCycleCorrectivePlanContext,
  subsequentCycleActivationConfirmation,
  subsequentCycleExecutionConfirmation,
  reserveIdempotentSubsequentCycleCorrectiveDelivery,
  revokeSubsequentCycleCorrectiveDeliveryActivation
} from "@/lib/subsequent-cycle-corrective-delivery-execution";

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
      "user-agent": "Rosevear-AIDataPlatform-SubsequentCycleCorrectiveDelivery/1",
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
    requestedPurpose: "subsequent-cycle-corrective-delivery",
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
  context: Awaited<ReturnType<typeof loadApprovedSubsequentCycleCorrectivePlanContext>>,
  dryRun: boolean
) {
  return {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    kind: "package",
    dryRun,
    package: context.subsequentCyclePackage,
    correctiveContext: {
      build: 74,
      purpose: "subsequent-cycle-corrective-delivery",
      subsequentCyclePlanId: context.plan.subsequentCyclePlanId,
      subsequentCyclePlanFingerprint: context.plan.planFingerprint,
      followingCycleRetriageId: context.plan.followingCycleRetriageId,
      followingCycleRecurrenceId: context.plan.followingCycleRecurrenceId,
      followingCycleReclosureId: context.plan.followingCycleReclosureId,
      followingCycleReclosureRegressionCheckId: context.plan.followingCycleReclosureRegressionCheckId,
      sourceFollowingCycleRecurrenceFingerprint: context.plan.sourceFollowingCycleRecurrenceFingerprint,
      sourceRegressionFingerprint: context.plan.sourceRegressionFingerprint,
      sourceFollowingCycleReclosureFingerprint: context.plan.sourceFollowingCycleReclosureFingerprint,
      predecessorFollowingCyclePlanId: context.plan.predecessorFollowingCyclePlanId,
      predecessorFollowingCycleDeliveryId: context.plan.predecessorFollowingCycleDeliveryId,
      predecessorFollowingCyclePackageId:
        context.predecessorFollowingCyclePackage.packageId,
      predecessorFollowingCyclePackageFingerprint:
        context.predecessorFollowingCyclePackage.fingerprint
    }
  };
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listSubsequentCycleCorrectiveDeliveryForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = object(await request.json().catch(() => null));
  const action = text(body.action);
  const workspaceId = text(body.workspaceId);
  const subsequentCyclePlanId = text(body.subsequentCyclePlanId);
  if (!workspaceId || !subsequentCyclePlanId) {
    return Response.json(
      { error: "subsequent_cycle_delivery_plan_required" },
      { status: 400 }
    );
  }

  let context;
  try {
    context = await loadApprovedSubsequentCycleCorrectivePlanContext(userId, {
      workspaceId,
      subsequentCyclePlanId
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "subsequent_cycle_delivery_plan_failed";
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
      { error: "subsequent_cycle_delivery_consumer_identity_changed" },
      { status: 409 }
    );
  }

  const token = consumerToken(target);
  const consumerId = config.endpointOrigin;
  const auditConsumerId = consumerId.slice(0, 128);

  if (action === "activate-subsequent-cycle") {
    if (
      text(body.confirmation) !== subsequentCycleActivationConfirmation(target)
    ) {
      return Response.json(
        {
          error: "subsequent_cycle_delivery_activation_confirmation_invalid",
          expected: subsequentCycleActivationConfirmation(target)
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
        batchId: context.subsequentCyclePackage.batchId,
        packageId: context.subsequentCyclePackage.packageId,
        replayKey: context.subsequentCyclePackage.replayKey,
        fingerprint: context.subsequentCyclePackage.fingerprint,
        validationCode: "subsequent-cycle-live-capability-valid",
        httpStatus: handshakeResponse.status,
        details: {
          build: 74,
          purpose: "subsequent-cycle-corrective-delivery",
          subsequentCyclePlanId,
          subsequentCyclePlanFingerprint: context.plan.planFingerprint,
          sourceFollowingCycleRecurrenceFingerprint: context.plan.sourceFollowingCycleRecurrenceFingerprint,
          predecessorFollowingCycleDeliveryId:
            context.plan.predecessorFollowingCycleDeliveryId,
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
        batchId: context.subsequentCyclePackage.batchId,
        packageId: context.subsequentCyclePackage.packageId,
        replayKey: context.subsequentCyclePackage.replayKey,
        fingerprint: context.subsequentCyclePackage.fingerprint,
        validationCode: "subsequent-cycle-dry-run-attempted",
        details: {
          build: 74,
          dryRun: true,
          subsequentCyclePlanId,
          subsequentCyclePlanFingerprint: context.plan.planFingerprint
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
        context.subsequentCyclePackage
      );
      if (acknowledgement.dryRun !== true) {
        throw new Error(
          "subsequent_cycle_delivery_dry_run_acknowledgement_invalid"
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
        batchId: context.subsequentCyclePackage.batchId,
        packageId: context.subsequentCyclePackage.packageId,
        replayKey: context.subsequentCyclePackage.replayKey,
        fingerprint: context.subsequentCyclePackage.fingerprint,
        validationCode: acknowledgement.code,
        httpStatus: dryRunResponse.status,
        details: {
          build: 74,
          dryRun: true,
          subsequentCyclePlanId,
          subsequentCyclePlanFingerprint: context.plan.planFingerprint
        }
      });

      if (acknowledgement.status !== "accepted") {
        return Response.json(
          {
            error: "subsequent_cycle_delivery_dry_run_rejected",
            acknowledgement
          },
          { status: 409 }
        );
      }

      const activationId =
        await createSubsequentCycleCorrectiveDeliveryActivation(userId, {
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
          subsequentCyclePackage: {
            packageId: context.subsequentCyclePackage.packageId,
            replayKey: context.subsequentCyclePackage.replayKey,
            fingerprint: context.subsequentCyclePackage.fingerprint
          },
          model: await listSubsequentCycleCorrectiveDeliveryForUser(userId)
        },
        { status: 201 }
      );
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : "subsequent_cycle_delivery_activation_failed";
      await appendIntegrationDeliveryEvent(userId, {
        workspaceId,
        consumerId: auditConsumerId,
        target,
        transportMode: "live",
        eventType: "handshake-rejected",
        batchId: context.subsequentCyclePackage.batchId,
        packageId: context.subsequentCyclePackage.packageId,
        replayKey: context.subsequentCyclePackage.replayKey,
        fingerprint: context.subsequentCyclePackage.fingerprint,
        validationCode: code.slice(0,96),
        details: {
          build: 74,
          purpose: "subsequent-cycle-corrective-delivery",
          subsequentCyclePlanId
        }
      }).catch(() => undefined);
      return Response.json(
        { error: code },
        { status: code.includes("transport") ? 502 : statusFor(code) }
      );
    }
  }

  if (action !== "execute-subsequent-cycle") {
    return Response.json(
      { error: "subsequent_cycle_delivery_action_invalid" },
      { status: 400 }
    );
  }

  if (text(body.confirmation) !== subsequentCycleExecutionConfirmation(target)) {
    return Response.json(
      {
        error: "subsequent_cycle_delivery_execution_confirmation_invalid",
        expected: subsequentCycleExecutionConfirmation(target)
      },
      { status: 400 }
    );
  }

  let activation;
  try {
    activation = await getActiveSubsequentCycleCorrectiveDeliveryActivation(
      userId,
      {
        workspaceId,
        subsequentCyclePlanId,
        consumerId,
        subsequentCyclePackage: context.subsequentCyclePackage
      }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "subsequent_cycle_delivery_activation_required";
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
      batchId: context.subsequentCyclePackage.batchId,
      packageId: context.subsequentCyclePackage.packageId,
      replayKey: context.subsequentCyclePackage.replayKey,
      fingerprint: context.subsequentCyclePackage.fingerprint,
      validationCode: "subsequent-cycle-live-capability-revalidated",
      httpStatus: response.status,
      details: {
        build: 74,
        subsequentCyclePlanId,
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
        : "subsequent_cycle_delivery_handshake_failed";
    await appendIntegrationDeliveryEvent(userId, {
      workspaceId,
      consumerId: auditConsumerId,
      target,
      transportMode: "live",
      eventType: "handshake-rejected",
      batchId: context.subsequentCyclePackage.batchId,
      packageId: context.subsequentCyclePackage.packageId,
      replayKey: context.subsequentCyclePackage.replayKey,
      fingerprint: context.subsequentCyclePackage.fingerprint,
      validationCode: code.slice(0,96),
      details: {
        build: 74,
        subsequentCyclePlanId,
        activationId: activation.activationId
      }
    }).catch(() => undefined);
    return Response.json({ error: code }, { status: 502 });
  }

  let reservation;
  try {
    reservation = await reserveIdempotentSubsequentCycleCorrectiveDelivery(
      userId,
      {
        workspaceId,
        activation,
        plan: context.plan,
        consumerId,
        subsequentCyclePackage: context.subsequentCyclePackage
      }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "subsequent_cycle_delivery_reservation_failed";
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
        model: await listSubsequentCycleCorrectiveDeliveryForUser(userId)
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
    batchId: context.subsequentCyclePackage.batchId,
    packageId: context.subsequentCyclePackage.packageId,
    replayKey: context.subsequentCyclePackage.replayKey,
    fingerprint: context.subsequentCyclePackage.fingerprint,
    validationCode:
      reservation.reason === "retry"
        ? "subsequent-cycle-live-retry-attempted"
        : "subsequent-cycle-live-attempted",
    details: {
      build: 74,
      dryRun: false,
      subsequentCyclePlanId,
      subsequentCyclePlanFingerprint: context.plan.planFingerprint,
      activationId: activation.activationId,
      activationFingerprint: activation.activationFingerprint,
      sourceFollowingCycleRecurrenceFingerprint: context.plan.sourceFollowingCycleRecurrenceFingerprint,
      predecessorFollowingCycleDeliveryId:
        context.plan.predecessorFollowingCycleDeliveryId,
      predecessorFollowingCyclePackageId:
        context.predecessorFollowingCyclePackage.packageId,
      attemptCount: reservation.delivery.attemptCount,
      idempotencyKey: context.subsequentCyclePackage.replayKey
    }
  });

  try {
    const response = await fetchConsumer(
      config.endpoint,
      token,
      deliveryEnvelope(context, false),
      context.subsequentCyclePackage.replayKey
    );
    const responseBody = await response.json().catch(() => null);
    const acknowledgement = validateConsumerAcknowledgement(
      responseBody,
      context.subsequentCyclePackage
    );
    if (acknowledgement.dryRun !== false) {
      throw new Error("subsequent_cycle_delivery_acknowledgement_invalid");
    }

    const accepted = acknowledgement.status === "accepted";
    const delivery =
      await finalizeIdempotentSubsequentCycleCorrectiveDelivery(userId, {
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
      batchId: context.subsequentCyclePackage.batchId,
      packageId: context.subsequentCyclePackage.packageId,
      replayKey: context.subsequentCyclePackage.replayKey,
      fingerprint: context.subsequentCyclePackage.fingerprint,
      validationCode: acknowledgement.code,
      httpStatus: response.status,
      details: {
        build: 74,
        dryRun: false,
        subsequentCyclePlanId,
        subsequentCyclePlanFingerprint: context.plan.planFingerprint,
        activationId: activation.activationId,
        activationFingerprint: activation.activationFingerprint,
        attemptCount: delivery.attemptCount,
        idempotencyKey: context.subsequentCyclePackage.replayKey
      }
    });

    if (accepted) {
      await recordIntegrationConsumerReceipt(userId, {
        workspaceId,
        consumerId: auditConsumerId,
        package: context.subsequentCyclePackage
      });
    }

    return Response.json(
      {
        ok: accepted,
        idempotent: false,
        acknowledgement,
        delivery,
        model: await listSubsequentCycleCorrectiveDeliveryForUser(userId)
      },
      { status: accepted ? 200 : 409 }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "subsequent_cycle_delivery_transport_error";
    const delivery =
      await finalizeIdempotentSubsequentCycleCorrectiveDelivery(userId, {
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
      batchId: context.subsequentCyclePackage.batchId,
      packageId: context.subsequentCyclePackage.packageId,
      replayKey: context.subsequentCyclePackage.replayKey,
      fingerprint: context.subsequentCyclePackage.fingerprint,
      validationCode: code.slice(0,96),
      details: {
        build: 74,
        dryRun: false,
        subsequentCyclePlanId,
        activationId: activation.activationId,
        attemptCount: delivery.attemptCount,
        idempotencyKey: context.subsequentCyclePackage.replayKey
      }
    }).catch(() => undefined);

    return Response.json(
      {
        error: code,
        retrySafe: true,
        idempotencyKey: context.subsequentCyclePackage.replayKey,
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
  if (body.action !== "revoke-subsequent-cycle") {
    return Response.json(
      { error: "subsequent_cycle_delivery_action_invalid" },
      { status: 400 }
    );
  }

  try {
    await revokeSubsequentCycleCorrectiveDeliveryActivation(userId, {
      workspaceId: text(body.workspaceId),
      activationId: text(body.activationId),
      note: text(body.note)
    });
    return Response.json(await listSubsequentCycleCorrectiveDeliveryForUser(userId));
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "subsequent_cycle_delivery_revoke_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}
