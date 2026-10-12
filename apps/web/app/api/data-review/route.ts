import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  createDataReviewBatch,
  decideDataReviewBatch,
  listDataReviewWorkbenchForUser,
  saveDataReviewBatch
} from "@/lib/data-review-workbench";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function objectBody(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function errorStatus(message: string) {
  if (message === "data_review_admin_required") return 403;
  if (message.includes("not_found")) return 404;
  if (message.includes("terminal")) return 409;
  return 400;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listDataReviewWorkbenchForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = objectBody(await request.json().catch(() => null));

  if (body.action !== "create") {
    return Response.json({ error: "Invalid data-review action." }, { status: 400 });
  }

  try {
    const reviewId = await createDataReviewBatch(
      userId,
      text(body.workspaceId),
      text(body.datasetId)
    );
    return Response.json(
      {
        reviewId,
        model: await listDataReviewWorkbenchForUser(userId)
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "data_review_create_failed";
    return Response.json({ error: message }, { status: errorStatus(message) });
  }
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = objectBody(await request.json().catch(() => null));
  const workspaceId = text(body.workspaceId);
  const reviewId = text(body.reviewId);
  const action = text(body.action);
  const reviewNote = text(body.reviewNote);

  try {
    if (action === "save") {
      await saveDataReviewBatch(userId, {
        workspaceId,
        reviewId,
        rows: body.rows,
        reviewNote
      });
    } else if (action === "approve" || action === "reject") {
      await decideDataReviewBatch(userId, {
        workspaceId,
        reviewId,
        decision: action === "approve" ? "approved" : "rejected",
        reviewNote
      });
    } else {
      return Response.json({ error: "Invalid data-review mutation." }, { status: 400 });
    }

    return Response.json(await listDataReviewWorkbenchForUser(userId));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "data_review_mutation_failed";
    return Response.json({ error: message }, { status: errorStatus(message) });
  }
}
