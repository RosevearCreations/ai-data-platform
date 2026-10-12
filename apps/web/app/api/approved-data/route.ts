import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  createApprovedDatasetPublication,
  listApprovedDatasetPublishingForUser,
  withdrawApprovedDatasetPublication
} from "@/lib/approved-dataset-publishing";

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
  if (message === "approved_publication_manager_required") return 403;
  if (message.includes("not_found") || message.includes("not_approved")) return 404;
  if (message.includes("withdrawn") || message.includes("already")) return 409;
  return 400;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listApprovedDatasetPublishingForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = objectBody(await request.json().catch(() => null));

  if (body.action !== "publish") {
    return Response.json({ error: "Invalid approved-data action." }, { status: 400 });
  }

  try {
    const publicationId = await createApprovedDatasetPublication(userId, {
      workspaceId: text(body.workspaceId),
      reviewId: text(body.reviewId),
      publicationNote: text(body.publicationNote)
    });
    return Response.json(
      {
        publicationId,
        model: await listApprovedDatasetPublishingForUser(userId)
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "approved_publication_create_failed";
    return Response.json({ error: message }, { status: errorStatus(message) });
  }
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = objectBody(await request.json().catch(() => null));

  if (body.action !== "withdraw") {
    return Response.json({ error: "Invalid approved-data mutation." }, { status: 400 });
  }

  try {
    await withdrawApprovedDatasetPublication(userId, {
      workspaceId: text(body.workspaceId),
      publicationId: text(body.publicationId),
      withdrawalNote: text(body.withdrawalNote)
    });
    return Response.json(await listApprovedDatasetPublishingForUser(userId));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "approved_publication_withdraw_failed";
    return Response.json({ error: message }, { status: errorStatus(message) });
  }
}
