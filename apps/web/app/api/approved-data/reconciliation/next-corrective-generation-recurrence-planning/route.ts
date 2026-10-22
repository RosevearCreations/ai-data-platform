import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  createNextCorrectiveGenerationRecurrenceRetriage,
  createFollowingCorrectiveGenerationPlan,
  listNextCorrectiveGenerationRecurrencePlanningForUser,
  reviewFollowingCorrectiveGenerationPlan,
  updateNextCorrectiveGenerationRecurrenceRetriage,
  type NextCorrectiveGenerationRecurrenceRetriageStatus
} from "@/lib/next-corrective-generation-recurrence-planning";
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
  return Response.json(await listNextCorrectiveGenerationRecurrencePlanningForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = object(await request.json().catch(() => null));
  const action = text(body.action);

  try {
    if (action === "create-next-corrective-generation-recurrence-retriage") {
      const nextCorrectiveGenerationRetriageId = await createNextCorrectiveGenerationRecurrenceRetriage(
        userId,
        {
          workspaceId: text(body.workspaceId),
          nextCorrectiveGenerationRecurrenceId: text(body.nextCorrectiveGenerationRecurrenceId)
        }
      );
      return Response.json(
        {
          nextCorrectiveGenerationRetriageId,
          model: await listNextCorrectiveGenerationRecurrencePlanningForUser(userId)
        },
        { status: 201 }
      );
    }

    if (action === "create-following-corrective-generation-plan") {
      const followingCorrectiveGenerationPlanId =
        await createFollowingCorrectiveGenerationPlan(userId, {
          workspaceId: text(body.workspaceId),
          nextCorrectiveGenerationRetriageId: text(body.nextCorrectiveGenerationRetriageId),
          rationale: text(body.rationale)
        });
      return Response.json(
        {
          followingCorrectiveGenerationPlanId,
          model: await listNextCorrectiveGenerationRecurrencePlanningForUser(userId)
        },
        { status: 201 }
      );
    }

    return Response.json(
      { error: "next_corrective_generation_recurrence_planning_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "next_corrective_generation_recurrence_planning_failed";
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
    if (action === "update-next-corrective-generation-recurrence-retriage") {
      await updateNextCorrectiveGenerationRecurrenceRetriage(userId, {
        workspaceId: text(body.workspaceId),
        nextCorrectiveGenerationRetriageId: text(body.nextCorrectiveGenerationRetriageId),
        status: oneOf<Extract<NextCorrectiveGenerationRecurrenceRetriageStatus, "open" | "dismissed">>(
          body.status,
          retriageStatuses,
          "next_corrective_generation_recurrence_planning_status_invalid"
        ),
        classification: oneOf<ExceptionClassification>(
          body.classification,
          classifications,
          "next_corrective_generation_recurrence_planning_classification_invalid"
        ),
        severity: oneOf<ExceptionSeverity>(
          body.severity,
          severities,
          "next_corrective_generation_recurrence_planning_severity_invalid"
        ),
        resolutionIntent: oneOf<ExceptionResolutionIntent>(
          body.resolutionIntent,
          intents,
          "next_corrective_generation_recurrence_planning_intent_invalid"
        ),
        summary: text(body.summary),
        investigationNote: text(body.investigationNote)
      });
      return Response.json(await listNextCorrectiveGenerationRecurrencePlanningForUser(userId));
    }

    if (action === "review-following-corrective-generation-plan") {
      await reviewFollowingCorrectiveGenerationPlan(userId, {
        workspaceId: text(body.workspaceId),
        followingCorrectiveGenerationPlanId: text(body.followingCorrectiveGenerationPlanId),
        decision: oneOf(
          body.decision,
          ["approved", "rejected", "withdrawn"] as const,
          "following_corrective_generation_plan_review_invalid"
        ),
        reviewNote: text(body.reviewNote)
      });
      return Response.json(await listNextCorrectiveGenerationRecurrencePlanningForUser(userId));
    }

    return Response.json(
      { error: "next_corrective_generation_recurrence_planning_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "next_corrective_generation_recurrence_planning_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}
