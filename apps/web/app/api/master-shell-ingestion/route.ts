import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  ingestMasterShellWebhookReceipt,
  listMasterShellSourceIngestionForUser
} from "@/lib/master-shell-source-ingestion-database";
import { observeApiOperation } from "@/lib/performance-observatory-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32_768;

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function statusForError(message: string) {
  if (message.includes("workspace_admin_required")) return 403;
  if (message.includes("receipt_not_found")) return 404;
  if (
    message.includes("duplicate_suppressed") ||
    message.includes("source_mismatch") ||
    message.includes("tenant_mismatch") ||
    message.includes("audience_denied") ||
    message.includes("transition_invalid")
  ) {
    return 409;
  }
  if (
    message.includes("_invalid") ||
    message.includes("_unsupported") ||
    message.includes("_required") ||
    message.includes("_not_source")
  ) {
    return 400;
  }
  if (message.includes("secret_unavailable")) return 503;
  return 500;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

  return observeApiOperation(
    userId,
    "api.master-shell-ingestion.get",
    async () => {
      try {
        return Response.json(
          await listMasterShellSourceIngestionForUser(userId),
          { headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "master_shell_ingestion_list_failed";
        return Response.json(
          { error: message },
          { status: statusForError(message) }
        );
      }
    }
  );
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

  return observeApiOperation(
    userId,
    "api.master-shell-ingestion.post",
    async () => {
      try {
        const declaredLength = Number(
          request.headers.get("content-length") ?? ""
        );
        if (
          Number.isFinite(declaredLength) &&
          declaredLength > MAX_BODY_BYTES
        ) {
          return Response.json(
            { error: "master_shell_ingestion_body_too_large" },
            { status: 413 }
          );
        }

        const raw = await request.text();
        if (
          raw.length < 2 ||
          Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES
        ) {
          return Response.json(
            { error: "master_shell_ingestion_body_invalid" },
            { status: 400 }
          );
        }

        const body = JSON.parse(raw) as Record<string, unknown>;
        if (body.action !== "ingest-webhook-receipt") {
          return Response.json(
            { error: "master_shell_ingestion_action_invalid" },
            { status: 400 }
          );
        }

        const result = await ingestMasterShellWebhookReceipt(
          userId,
          {
            receiptId: String(body.receiptId ?? ""),
            acceptRegistryState:
              body.acceptRegistryState === true
          }
        );

        return Response.json(result, {
          status: 201,
          headers: { "Cache-Control": "no-store" }
        });
      } catch (error) {
        const message =
          error instanceof SyntaxError
            ? "master_shell_ingestion_json_invalid"
            : error instanceof Error
              ? error.message
              : "master_shell_ingestion_failed";
        return Response.json(
          { error: message },
          { status: statusForError(message) }
        );
      }
    }
  );
}
