import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  createReopenedExceptionRetriage,
  createSuccessorCorrectiveDeliveryPlan,
  listReopenedExceptionPlanningForUser,
  reviewSuccessorCorrectiveDeliveryPlan,
  updateReopenedExceptionRetriage,
  type ReopenedRetriageStatus
} from "@/lib/reopened-exception-planning";
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
function oneOf<T extends string>(value: unknown, allowed: readonly T[], error: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new Error(error);
  return value as T;
}
function statusFor(error: string) {
  if (error.includes("manager_required")) return 403;
  if (error.includes("not_found")) return 404;
  if (
    error.includes("required") ||
    error.includes("approved") ||
    error.includes("unavailable") ||
    error.includes("not_proposed") ||
    error.includes("not_accepted") ||
    error.includes("no_exception") ||
    error.includes("scope_empty")
  ) return 409;
  return 400;
}
async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

const classifications = [
  "consumer-drift","consumer-missing","expected-change",
  "source-superseded","mixed","unknown"
] as const;
const severities = ["low","medium","high","critical"] as const;
const intents = ["investigate","accept-drift","plan-correction","no-action"] as const;
const retriageStatuses = ["open","dismissed"] as const;

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listReopenedExceptionPlanningForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = object(await request.json().catch(() => null));
  const action = text(body.action);
  try {
    if (action === "create-retriage") {
      const retriageId = await createReopenedExceptionRetriage(userId, {
        workspaceId: text(body.workspaceId),
        reopenId: text(body.reopenId)
      });
      return Response.json(
        { retriageId, model: await listReopenedExceptionPlanningForUser(userId) },
        { status: 201 }
      );
    }
    if (action === "create-successor-plan") {
      const successorPlanId = await createSuccessorCorrectiveDeliveryPlan(userId, {
        workspaceId: text(body.workspaceId),
        retriageId: text(body.retriageId),
        rationale: text(body.rationale)
      });
      return Response.json(
        { successorPlanId, model: await listReopenedExceptionPlanningForUser(userId) },
        { status: 201 }
      );
    }
    return Response.json({ error: "reopened_planning_action_invalid" }, { status: 400 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "reopened_planning_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = object(await request.json().catch(() => null));
  const action = text(body.action);
  try {
    if (action === "update-retriage") {
      await updateReopenedExceptionRetriage(userId, {
        workspaceId: text(body.workspaceId),
        retriageId: text(body.retriageId),
        status: oneOf<Extract<ReopenedRetriageStatus,"open"|"dismissed">>(
          body.status,
          retriageStatuses,
          "reopened_planning_status_invalid"
        ),
        classification: oneOf<ExceptionClassification>(
          body.classification,
          classifications,
          "reopened_planning_classification_invalid"
        ),
        severity: oneOf<ExceptionSeverity>(
          body.severity,
          severities,
          "reopened_planning_severity_invalid"
        ),
        resolutionIntent: oneOf<ExceptionResolutionIntent>(
          body.resolutionIntent,
          intents,
          "reopened_planning_intent_invalid"
        ),
        summary: text(body.summary),
        investigationNote: text(body.investigationNote)
      });
      return Response.json(await listReopenedExceptionPlanningForUser(userId));
    }
    if (action === "review-successor-plan") {
      await reviewSuccessorCorrectiveDeliveryPlan(userId, {
        workspaceId: text(body.workspaceId),
        successorPlanId: text(body.successorPlanId),
        decision: oneOf(
          body.decision,
          ["approved","rejected","withdrawn"] as const,
          "successor_plan_review_invalid"
        ),
        reviewNote: text(body.reviewNote)
      });
      return Response.json(await listReopenedExceptionPlanningForUser(userId));
    }
    return Response.json({ error: "reopened_planning_action_invalid" }, { status: 400 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "reopened_planning_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}
