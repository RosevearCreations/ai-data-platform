import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {\n  appendIntegrationDeliveryEvent,\n  recordIntegrationConsumerReceipt\n} from "@/lib/integration-delivery-database";
import {
  INTEGRATION_CONSUMER_PROTOCOL,
  INTEGRATION_CONTRACTS,
  integrationConsumerConfiguration,
  validateConsumerAcknowledgement,
  validateLiveConsumerHandshake,
  type IntegrationTarget
} from "@/lib/integration-delivery";
import {
  createUnifiedCorrectiveGenerationDeliveryActivation,
  finalizeIdempotentUnifiedCorrectiveGenerationDelivery,
  getActiveUnifiedCorrectiveGenerationDeliveryActivation,
  listUnifiedCorrectiveGenerationDeliveryForUser,
  loadApprovedUnifiedCorrectiveGenerationPlanContext,
  reserveIdempotentUnifiedCorrectiveGenerationDelivery,
  revokeUnifiedCorrectiveGenerationDeliveryActivation,
  unifiedCorrectiveGenerationActivationConfirmation,
  unifiedCorrectiveGenerationExecutionConfirmation
} from "@/lib/unified-corrective-generation-delivery-execution";

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
    error.includes("mismatch") ||
    error.includes("identity_reuse") ||
    error.includes("reconstruction") ||
    error.includes("not_accepted")
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
      "user-agent": "Rosevear-AIDataPlatform-UnifiedCorrectiveGenerationDelivery/1",
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
    requestedPurpose: "unified-corrective-generation-delivery",
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
  context: Awaited<ReturnType<typeof loadApprovedUnifiedCorrectiveGenerationPlanContext>>,
  dryRun: boolean
) {
  return {
    protocol: INTEGRATION_CONSUMER_PROTOCOL,
    kind: "package",
    dryRun,
    package: context.unifiedPackage,
    correctiveContext: {
      build: 111,
      purpose: "unified-corrective-generation-delivery",
      generationNumber: context.plan.generationNumber,
      correctiveGenerationPlanId: context.plan.correctiveGenerationPlanId,
      correctiveGenerationPlanFingerprint: context.plan.planFingerprint,
      correctiveGenerationRetriageId: context.plan.correctiveGenerationRetriageId,
      successorSourceId: context.plan.successorSourceId,
      sourceRecurrenceId: context.plan.sourceRecurrenceId,
      sourceRecurrenceFingerprint: context.plan.sourceRecurrenceFingerprint,
      sourceRegressionFingerprint: context.plan.sourceRegressionFingerprint,
      sourceSuccessorFingerprint: context.plan.sourceSuccessorFingerprint,
      predecessorGenerationLineageId: context.plan.predecessorGenerationLineageId,
      predecessorRegistryFingerprint: context.predecessorRegistry.registryFingerprint,
      predecessorPlanId: context.plan.predecessorPlanId,
      predecessorDeliveryId: context.plan.predecessorDeliveryId,
      predecessorPackageId: context.predecessorPackage.packageId,
      predecessorPackageFingerprint: context.predecessorPackage.fingerprint
    }
  };
}

async function audit(
  userId: string,
  input: {
    workspaceId: string;
    consumerId: string;
    target: IntegrationTarget;
    eventType:
      | "handshake-accepted"
      | "handshake-rejected"
      | "delivery-attempted"
      | "delivery-accepted"
      | "delivery-rejected"
      | "transport-error";
    context: Awaited<ReturnType<typeof loadApprovedUnifiedCorrectiveGenerationPlanContext>>;
    validationCode: string;
    httpStatus?: number | null;
    details?: Record<string, unknown>;
  }
) {
  await appendIntegrationDeliveryEvent(userId, {
    workspaceId: input.workspaceId,
    consumerId: input.consumerId.slice(0, 128),
    target: input.target,
    transportMode: "live",
    eventType: input.eventType,
    batchId: input.context.unifiedPackage.batchId,
    packageId: input.context.unifiedPackage.packageId,
    replayKey: input.context.unifiedPackage.replayKey,
    fingerprint: input.context.unifiedPackage.fingerprint,
    validationCode: input.validationCode.slice(0, 96),
    httpStatus: input.httpStatus ?? null,
    details: {
      build: 111,
      generationNumber: input.context.plan.generationNumber,
      correctiveGenerationPlanId: input.context.plan.correctiveGenerationPlanId,
      correctiveGenerationPlanFingerprint: input.context.plan.planFingerprint,
      predecessorGenerationLineageId: input.context.plan.predecessorGenerationLineageId,
      predecessorRegistryFingerprint: input.context.predecessorRegistry.registryFingerprint,
      predecessorDeliveryId: input.context.plan.predecessorDeliveryId,
      ...input.details
    }
  });
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listUnifiedCorrectiveGenerationDeliveryForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = object(await request.json().catch(() => null));
  const action = text(body.action);
  const workspaceId = text(body.workspaceId);
  const correctiveGenerationPlanId = text(body.correctiveGenerationPlanId);
  if (!workspaceId || !correctiveGenerationPlanId) {
    return Response.json(
      { error: "unified_corrective_generation_delivery_plan_required" },
      { status: 400 }
    );
  }

  let context;
  try {
    context = await loadApprovedUnifiedCorrectiveGenerationPlanContext(userId, {
      workspaceId,
      correctiveGenerationPlanId
    });
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "unified_corrective_generation_delivery_plan_failed";
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
      { error: "unified_corrective_generation_delivery_consumer_identity_changed" },
      { status: 409 }
    );
  }

  const token = consumerToken(target);
  const consumerId = config.endpointOrigin;

  if (action === "activate-unified-corrective-generation") {
    if (
      text(body.confirmation) !== unifiedCorrectiveGenerationActivationConfirmation(target)
    ) {
      return Response.json(
        {
          error: "unified_corrective_generation_delivery_activation_confirmation_invalid",
          expected: unifiedCorrectiveGenerationActivationConfirmation(target)
        },
        { status: 400 }
      );
    }

    try {
      const { response: handshakeResponse, handshake } =
        await fetchLiveHandshake(config.endpoint, token, target);

      await audit(userId, {
        workspaceId,
        consumerId,
        target,
        eventType: "handshake-accepted",
        context,
        validationCode: "unified-corrective-generation-live-capability-valid",
        httpStatus: handshakeResponse.status,
        details: {
          idempotencyKeySource: handshake.idempotency.keySource,
          duplicateBehavior: handshake.idempotency.duplicateBehavior
        }
      });

      await audit(userId, {
        workspaceId,
        consumerId,
        target,
        eventType: "delivery-attempted",
        context,
        validationCode: "unified-corrective-generation-dry-run-attempted",
        details: { dryRun: true }
      });

      const dryRunResponse = await fetchConsumer(
        config.endpoint,
        token,
        deliveryEnvelope(context, true)
      );
      const dryRunBody = await dryRunResponse.json().catch(() => null);
      const acknowledgement = validateConsumerAcknowledgement(
        dryRunBody,
        context.unifiedPackage
      );
      if (acknowledgement.dryRun !== true) {
        throw new Error(
          "unified_corrective_generation_delivery_dry_run_acknowledgement_invalid"
        );
      }

      await audit(userId, {
        workspaceId,
        consumerId,
        target,
        eventType:
          acknowledgement.status === "accepted"
            ? "delivery-accepted"
            : "delivery-rejected",
        context,
        validationCode: acknowledgement.code,
        httpStatus: dryRunResponse.status,
        details: { dryRun: true }
      });

      if (acknowledgement.status !== "accepted") {
        return Response.json(
          {
            error: "unified_corrective_generation_delivery_dry_run_rejected",
            acknowledgement
          },
          { status: 409 }
        );
      }

      const activationId =
        await createUnifiedCorrectiveGenerationDeliveryActivation(userId, {
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
          unifiedPackage: {
            packageId: context.unifiedPackage.packageId,
            replayKey: context.unifiedPackage.replayKey,
            fingerprint: context.unifiedPackage.fingerprint
          },
          model: await listUnifiedCorrectiveGenerationDeliveryForUser(userId)
        },
        { status: 201 }
      );
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : "unified_corrective_generation_delivery_activation_failed";
      await audit(userId, {
        workspaceId,
        consumerId,
        target,
        eventType: "handshake-rejected",
        context,
        validationCode: code
      }).catch(() => undefined);
      return Response.json(
        { error: code },
        { status: code.includes("fetch") || code.includes("transport") ? 502 : statusFor(code) }
      );
    }
  }

  if (action !== "execute-unified-corrective-generation") {
    return Response.json(
      { error: "unified_corrective_generation_delivery_action_invalid" },
      { status: 400 }
    );
  }

  if (text(body.confirmation) !== unifiedCorrectiveGenerationExecutionConfirmation(target)) {
    return Response.json(
      {
        error: "unified_corrective_generation_delivery_execution_confirmation_invalid",
        expected: unifiedCorrectiveGenerationExecutionConfirmation(target)
      },
      { status: 400 }
    );
  }

  let activation;
  try {
    activation = await getActiveUnifiedCorrectiveGenerationDeliveryActivation(
      userId,
      {
        workspaceId,
        correctiveGenerationPlanId,
        consumerId,
        unifiedPackage: context.unifiedPackage
      }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "unified_corrective_generation_delivery_activation_required";
    return Response.json({ error: code }, { status: statusFor(code) });
  }

  try {
    const { response, handshake } = await fetchLiveHandshake(
      config.endpoint,
      token,
      target
    );
    await audit(userId, {
      workspaceId,
      consumerId,
      target,
      eventType: "handshake-accepted",
      context,
      validationCode: "unified-corrective-generation-live-capability-revalidated",
      httpStatus: response.status,
      details: {
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
        : "unified_corrective_generation_delivery_handshake_failed";
    await audit(userId, {
      workspaceId,
      consumerId,
      target,
      eventType: "handshake-rejected",
      context,
      validationCode: code,
      details: { activationId: activation.activationId }
    }).catch(() => undefined);
    return Response.json({ error: code }, { status: 502 });
  }

  let reservation;
  try {
    reservation = await reserveIdempotentUnifiedCorrectiveGenerationDelivery(
      userId,
      {
        workspaceId,
        activation,
        plan: context.plan,
        consumerId,
        unifiedPackage: context.unifiedPackage
      }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "unified_corrective_generation_delivery_reservation_failed";
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
        model: await listUnifiedCorrectiveGenerationDeliveryForUser(userId)
      },
      { status: accepted ? 200 : 409 }
    );
  }

  await audit(userId, {
    workspaceId,
    consumerId,
    target,
    eventType: "delivery-attempted",
    context,
    validationCode:
      reservation.reason === "retry"
        ? "unified-corrective-generation-live-retry-attempted"
        : "unified-corrective-generation-live-attempted",
    details: {
      dryRun: false,
      activationId: activation.activationId,
      activationFingerprint: activation.activationFingerprint,
      attemptCount: reservation.delivery.attemptCount,
      idempotencyKey: context.unifiedPackage.replayKey
    }
  });

  try {
    const response = await fetchConsumer(
      config.endpoint,
      token,
      deliveryEnvelope(context, false),
      context.unifiedPackage.replayKey
    );
    const responseBody = await response.json().catch(() => null);
    const acknowledgement = validateConsumerAcknowledgement(
      responseBody,
      context.unifiedPackage
    );
    if (acknowledgement.dryRun !== false) {
      throw new Error("unified_corrective_generation_delivery_acknowledgement_invalid");
    }

    const accepted = acknowledgement.status === "accepted";
    const delivery =
      await finalizeIdempotentUnifiedCorrectiveGenerationDelivery(userId, {
        workspaceId,
        deliveryId: reservation.delivery.deliveryId,
        status: accepted ? "accepted" : "rejected",
        validationCode: acknowledgement.code,
        httpStatus: response.status,
        consumerReceivedAt: acknowledgement.receivedAt,
        acknowledgement
      });

    await audit(userId, {
      workspaceId,
      consumerId,
      target,
      eventType: accepted ? "delivery-accepted" : "delivery-rejected",
      context,
      validationCode: acknowledgement.code,
      httpStatus: response.status,
      details: {
        dryRun: false,
        deliveryId: delivery.deliveryId,
        attemptCount: delivery.attemptCount
      }
    });

    if (accepted) {
      await recordIntegrationConsumerReceipt(userId, {
        workspaceId,
        consumerId: consumerId.slice(0, 128),
        package: context.unifiedPackage
      });
    }

    return Response.json(
      {
        ok: accepted,
        idempotent: false,
        delivery,
        model: await listUnifiedCorrectiveGenerationDeliveryForUser(userId)
      },
      { status: accepted ? 200 : 409 }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "unified_corrective_generation_delivery_transport_failed";
    const delivery =
      await finalizeIdempotentUnifiedCorrectiveGenerationDelivery(userId, {
        workspaceId,
        deliveryId: reservation.delivery.deliveryId,
        status: "transport-error",
        validationCode: code
      }).catch(() => reservation.delivery);

    await audit(userId, {
      workspaceId,
      consumerId,
      target,
      eventType: "transport-error",
      context,
      validationCode: code,
      details: {
        dryRun: false,
        deliveryId: delivery.deliveryId,
        attemptCount: delivery.attemptCount
      }
    }).catch(() => undefined);

    return Response.json(
      {
        error: code,
        delivery,
        model: await listUnifiedCorrectiveGenerationDeliveryForUser(userId)
      },
      { status: 502 }
    );
  }
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = object(await request.json().catch(() => null));
  const action = text(body.action);
  if (action !== "revoke-unified-corrective-generation") {
    return Response.json(
      { error: "unified_corrective_generation_delivery_action_invalid" },
      { status: 400 }
    );
  }

  try {
    await revokeUnifiedCorrectiveGenerationDeliveryActivation(userId, {
      workspaceId: text(body.workspaceId),
      activationId: text(body.activationId),
      note: text(body.note)
    });
    return Response.json(await listUnifiedCorrectiveGenerationDeliveryForUser(userId));
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "unified_corrective_generation_delivery_revoke_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}
