import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  createCorrectiveDeliveryPlan,
  createReconciliationExceptionCase,
  listReconciliationExceptionTriageForUser,
  reviewCorrectiveDeliveryPlan,
  updateReconciliationExceptionCase,
  type ExceptionCaseStatus,
  type ExceptionClassification,
  type ExceptionResolutionIntent,
  type ExceptionSeverity
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
    error.includes("closed") ||
    error.includes("not_proposed") ||
    error.includes("no_exception")
  ) return 409;
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
const severities = ["low","medium","high","critical"] as const;
const intents = ["investigate","accept-drift","plan-correction","no-action"] as const;
const caseStatuses = ["open","planned","approved","closed","dismissed"] as const;

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listReconciliationExceptionTriageForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = object(await request.json().catch(() => null));
  const action = text(body.action);
  try {
    if (action === "create-case") {
      const caseId = await createReconciliationExceptionCase(userId, {
        workspaceId: text(body.workspaceId),
        reconciliationId: text(body.reconciliationId),
        classification: oneOf<ExceptionClassification>(
          body.classification,
          classifications,
          "reconciliation_triage_classification_invalid"
        ),
        severity: oneOf<ExceptionSeverity>(
          body.severity,
          severities,
          "reconciliation_triage_severity_invalid"
        ),
        resolutionIntent: oneOf<ExceptionResolutionIntent>(
          body.resolutionIntent,
          intents,
          "reconciliation_triage_intent_invalid"
        ),
        summary: text(body.summary)
      });
      return Response.json(
        {
          caseId,
          model: await listReconciliationExceptionTriageForUser(userId)
        },
        { status: 201 }
      );
    }

    if (action === "create-plan") {
      const planId = await createCorrectiveDeliveryPlan(userId, {
        workspaceId: text(body.workspaceId),
        caseId: text(body.caseId),
        rationale: text(body.rationale)
      });
      return Response.json(
        {
          planId,
          model: await listReconciliationExceptionTriageForUser(userId)
        },
        { status: 201 }
      );
    }

    return Response.json(
      { error: "reconciliation_triage_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "reconciliation_triage_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = object(await request.json().catch(() => null));
  const action = text(body.action);

  try {
    if (action === "update-case") {
      await updateReconciliationExceptionCase(userId, {
        workspaceId: text(body.workspaceId),
        caseId: text(body.caseId),
        status: oneOf<ExceptionCaseStatus>(
          body.status,
          caseStatuses,
          "reconciliation_triage_case_status_invalid"
        ),
        classification: oneOf<ExceptionClassification>(
          body.classification,
          classifications,
          "reconciliation_triage_classification_invalid"
        ),
        severity: oneOf<ExceptionSeverity>(
          body.severity,
          severities,
          "reconciliation_triage_severity_invalid"
        ),
        resolutionIntent: oneOf<ExceptionResolutionIntent>(
          body.resolutionIntent,
          intents,
          "reconciliation_triage_intent_invalid"
        ),
        summary: text(body.summary),
        investigationNote: text(body.investigationNote)
      });
      return Response.json(await listReconciliationExceptionTriageForUser(userId));
    }

    if (action === "review-plan") {
      const decision = oneOf(
        body.decision,
        ["approved","rejected","withdrawn"] as const,
        "corrective_plan_review_invalid"
      );
      await reviewCorrectiveDeliveryPlan(userId, {
        workspaceId: text(body.workspaceId),
        planId: text(body.planId),
        decision,
        reviewNote: text(body.reviewNote)
      });
      return Response.json(await listReconciliationExceptionTriageForUser(userId));
    }

    return Response.json(
      { error: "reconciliation_triage_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "reconciliation_triage_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}
