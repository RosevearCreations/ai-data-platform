import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  createSecondRecurrenceRetriage,
  createSuccessorGenerationCorrectiveDeliveryPlan,
  listSecondRecurrencePlanningForUser,
  reviewSuccessorGenerationCorrectiveDeliveryPlan,
  updateSecondRecurrenceRetriage,
  type SecondRecurrenceRetriageStatus
} from "@/lib/second-recurrence-planning";
import type {
  ExceptionClassification,
  ExceptionResolutionIntent,
  ExceptionSeverity
} from "@/lib/reconciliation-exception-triage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  error: string
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(error);
  }
  return value as T;
}

function statusFor(error: string) {
  if (error.includes("manager_required")) return 403;
  if (error.includes("not_found")) return 404;
  if (
    error.includes("required") ||
    error.includes("locked") ||
    error.includes("latest_recurrence") ||
    error.includes("open_case") ||
    error.includes("scope_empty") ||
    error.includes("no_exception")
  ) {
    return 409;
  }
  return 400;
}

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

const classifications = [
  "consumer-drift",
  "consumer-missing",
  "expected-change",
  "source-superseded",
  "mixed",
  "unknown"
] as const;
const severities = ["low", "medium", "high", "critical"] as const;
const intents = [
  "investigate",
  "accept-drift",
  "plan-correction",
  "no-action"
] as const;
const retriageStatuses = ["open", "dismissed"] as const;

export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json(await listSecondRecurrencePlanningForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = object(await request.json().catch(() => null));
  const action = text(body.action);

  try {
    if (action === "create-second-recurrence-retriage") {
      const secondRecurrenceRetriageId = await createSecondRecurrenceRetriage(
        userId,
        {
          workspaceId: text(body.workspaceId),
          nextGenerationRecurrenceId: text(body.nextGenerationRecurrenceId)
        }
      );
      return Response.json(
        {
          secondRecurrenceRetriageId,
          model: await listSecondRecurrencePlanningForUser(userId)
        },
        { status: 201 }
      );
    }

    if (action === "create-successor-generation-plan") {
      const successorGenerationPlanId =
        await createSuccessorGenerationCorrectiveDeliveryPlan(userId, {
          workspaceId: text(body.workspaceId),
          secondRecurrenceRetriageId: text(body.secondRecurrenceRetriageId),
          rationale: text(body.rationale)
        });
      return Response.json(
        {
          successorGenerationPlanId,
          model: await listSecondRecurrencePlanningForUser(userId)
        },
        { status: 201 }
      );
    }

    return Response.json(
      { error: "second_recurrence_planning_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "second_recurrence_planning_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = object(await request.json().catch(() => null));
  const action = text(body.action);

  try {
    if (action === "update-second-recurrence-retriage") {
      await updateSecondRecurrenceRetriage(userId, {
        workspaceId: text(body.workspaceId),
        secondRecurrenceRetriageId: text(body.secondRecurrenceRetriageId),
        status: oneOf<Extract<SecondRecurrenceRetriageStatus, "open" | "dismissed">>(
          body.status,
          retriageStatuses,
          "second_recurrence_planning_status_invalid"
        ),
        classification: oneOf<ExceptionClassification>(
          body.classification,
          classifications,
          "second_recurrence_planning_classification_invalid"
        ),
        severity: oneOf<ExceptionSeverity>(
          body.severity,
          severities,
          "second_recurrence_planning_severity_invalid"
        ),
        resolutionIntent: oneOf<ExceptionResolutionIntent>(
          body.resolutionIntent,
          intents,
          "second_recurrence_planning_intent_invalid"
        ),
        summary: text(body.summary),
        investigationNote: text(body.investigationNote)
      });
      return Response.json(await listSecondRecurrencePlanningForUser(userId));
    }

    if (action === "review-successor-generation-plan") {
      await reviewSuccessorGenerationCorrectiveDeliveryPlan(userId, {
        workspaceId: text(body.workspaceId),
        successorGenerationPlanId: text(body.successorGenerationPlanId),
        decision: oneOf(
          body.decision,
          ["approved", "rejected", "withdrawn"] as const,
          "successor_generation_plan_review_invalid"
        ),
        reviewNote: text(body.reviewNote)
      });
      return Response.json(await listSecondRecurrencePlanningForUser(userId));
    }

    return Response.json(
      { error: "second_recurrence_planning_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "second_recurrence_planning_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}
