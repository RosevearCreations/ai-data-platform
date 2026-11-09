import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  buildMasterShellContractDescriptor,
  MasterShellContractError,
  parseMasterShellEventEnvelope
} from "@/lib/master-shell-contract-v1";
import { observeApiOperation } from "@/lib/performance-observatory-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_VALIDATION_BYTES = 262_144;

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
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
    "api.master-shell-contract-v1.get",
    async () =>
      Response.json(buildMasterShellContractDescriptor(), {
        headers: { "Cache-Control": "no-store" }
      })
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
    "api.master-shell-contract-v1.post",
    async () => {
      try {
        const declaredLength = Number(
          request.headers.get("content-length") ?? ""
        );
        if (
          Number.isFinite(declaredLength) &&
          declaredLength > MAX_VALIDATION_BYTES
        ) {
          return Response.json(
            { error: "master_shell_validation_body_too_large" },
            { status: 413 }
          );
        }

        const text = await request.text();
        if (
          text.length < 2 ||
          Buffer.byteLength(text, "utf8") > MAX_VALIDATION_BYTES
        ) {
          return Response.json(
            { error: "master_shell_validation_body_invalid" },
            { status: 400 }
          );
        }

        const body = JSON.parse(text) as {
          action?: unknown;
          envelope?: unknown;
        };
        if (body.action !== "validate-event") {
          return Response.json(
            { error: "master_shell_contract_action_invalid" },
            { status: 400 }
          );
        }

        const envelope = parseMasterShellEventEnvelope(body.envelope);
        return Response.json({
          valid: true,
          persisted: false,
          sourceConnectivityInferred: false,
          envelope
        }, {
          headers: { "Cache-Control": "no-store" }
        });
      } catch (error) {
        const message =
          error instanceof MasterShellContractError
            ? error.code
            : error instanceof SyntaxError
              ? "master_shell_validation_json_invalid"
              : "master_shell_validation_failed";
        return Response.json({ error: message }, { status: 400 });
      }
    }
  );
}
