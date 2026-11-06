import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listCatalogueExchangeForUser,
  prepareCatalogueExchangePackage,
  recordCatalogueExchangeItem,
  reviewCatalogueExchangePackage
} from "@/lib/catalogue-exchange-database";

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
    message.includes("required") ||
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

  const model =
    await listCatalogueExchangeForUser(userId);
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

    if (action === "record-item") {
      const result = await recordCatalogueExchangeItem(
        userId,
        {
          workspaceId: String(body.workspaceId ?? ""),
          sourceApplicationId: String(
            body.sourceApplicationId ?? ""
          ),
          canonicalTenantKey: String(
            body.canonicalTenantKey ?? ""
          ),
          sourceRecordId: String(
            body.sourceRecordId ?? ""
          ),
          sourceRecordVersion:
            typeof body.sourceRecordVersion === "string"
              ? body.sourceRecordVersion
              : null,
          itemKind: String(body.itemKind ?? ""),
          updatedAt: String(body.updatedAt ?? ""),
          sku:
            typeof body.sku === "string"
              ? body.sku
              : null,
          name: String(body.name ?? ""),
          description:
            typeof body.description === "string"
              ? body.description
              : null,
          category:
            typeof body.category === "string"
              ? body.category
              : null,
          status:
            typeof body.status === "string"
              ? body.status
              : null,
          priceCad:
            typeof body.priceCad === "number" ||
            typeof body.priceCad === "string"
              ? body.priceCad
              : null,
          durationMinutes:
            typeof body.durationMinutes === "number" ||
            typeof body.durationMinutes === "string"
              ? body.durationMinutes
              : null,
          serviceAreas:
            Array.isArray(body.serviceAreas)
              ? body.serviceAreas
              : typeof body.serviceAreas === "string"
                ? body.serviceAreas
                : null
        }
      );
      return Response.json({ result });
    }

    if (action === "prepare-package") {
      const result =
        await prepareCatalogueExchangePackage(
          userId,
          {
            sourceItemId: String(
              body.sourceItemId ?? ""
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
          { error: "catalogue_review_decision_invalid" },
          { status: 400 }
        );
      }

      const result =
        await reviewCatalogueExchangePackage(
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
      { error: "catalogue_exchange_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "catalogue_exchange_request_failed";
    return Response.json(
      { error: message },
      { status: statusForError(message) }
    );
  }
}
