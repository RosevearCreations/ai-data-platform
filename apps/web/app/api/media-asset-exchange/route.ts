import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listSharedMediaExchangeForUser,
  prepareSharedMediaExchangePackage,
  recordSharedMediaReference,
  reviewSharedMediaExchangePackage
} from "@/lib/media-asset-exchange-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  return session?.user.id ?? null;
}

function statusForError(message: string) {
  if (message === "workspace_admin_required") return 403;
  if (message.includes("not_found")) return 404;
  if (
    message.includes("invalid") ||
    message.includes("denied") ||
    message.includes("validation_failed")
  ) {
    return 400;
  }
  return 409;
}

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

  const model = await listSharedMediaExchangeForUser(userId);
  return Response.json(model, {
    headers: { "Cache-Control": "no-store" }
  });
}

export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const action = String(body.action ?? "");

    if (action === "record-reference") {
      const result = await recordSharedMediaReference(
        userId,
        {
          workspaceId: String(body.workspaceId ?? ""),
          sourceApplicationId: String(
            body.sourceApplicationId ?? ""
          ),
          canonicalTenantKey: String(
            body.canonicalTenantKey ?? ""
          ),
          sourceRecordId: String(body.sourceRecordId ?? ""),
          sourceRecordVersion:
            typeof body.sourceRecordVersion === "string"
              ? body.sourceRecordVersion
              : null,
          updatedAt: String(body.updatedAt ?? ""),
          assetKind: String(body.assetKind ?? ""),
          mediaType: String(body.mediaType ?? ""),
          url: String(body.url ?? ""),
          ownerKind:
            typeof body.ownerKind === "string"
              ? body.ownerKind
              : null,
          ownerRecordId:
            typeof body.ownerRecordId === "string"
              ? body.ownerRecordId
              : null,
          altText:
            typeof body.altText === "string"
              ? body.altText
              : null,
          caption:
            typeof body.caption === "string"
              ? body.caption
              : null,
          createdAt:
            typeof body.createdAt === "string"
              ? body.createdAt
              : null,
          mimeType:
            typeof body.mimeType === "string"
              ? body.mimeType
              : null,
          byteSize:
            typeof body.byteSize === "number" ||
            typeof body.byteSize === "string"
              ? body.byteSize
              : null,
          contentSha256:
            typeof body.contentSha256 === "string"
              ? body.contentSha256
              : null
        }
      );
      return Response.json({ result });
    }

    if (action === "prepare-package") {
      const result = await prepareSharedMediaExchangePackage(
        userId,
        {
          sourceReferenceId: String(
            body.sourceReferenceId ?? ""
          ),
          destinationApplicationId: String(
            body.destinationApplicationId ?? ""
          ),
          destinationTenantKey: String(
            body.destinationTenantKey ?? ""
          )
        }
      );
      return Response.json({ result });
    }

    if (action === "review-package") {
      const decision =
        body.decision === "approve"
          ? "approve"
          : body.decision === "reject"
            ? "reject"
            : null;
      if (!decision) {
        return Response.json(
          { error: "media_review_decision_invalid" },
          { status: 400 }
        );
      }

      const result = await reviewSharedMediaExchangePackage(
        userId,
        {
          packageId: String(body.packageId ?? ""),
          decision,
          reason: String(body.reason ?? "")
        }
      );
      return Response.json({ result });
    }

    return Response.json(
      { error: "media_exchange_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "media_exchange_request_failed";
    return Response.json(
      { error: message },
      { status: statusForError(message) }
    );
  }
}
