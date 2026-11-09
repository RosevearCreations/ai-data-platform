import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  claimMasterSysopOwner,
  grantMasterSysopByEmail,
  listMasterSysopShellForUser,
  prepareMasterSysopHandoff,
  revokeMasterSysop
} from "@/lib/master-sysop-database";
import type {
  MasterSysopDestinationKey,
  MasterSysopRole
} from "@/lib/master-sysop-core";
import { observeApiOperation } from "@/lib/performance-observatory-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32_768;

async function currentSession() {
  return auth.api.getSession({ headers: await headers() });
}

function statusForError(message: string) {
  if (
    message.includes("_authorization_required") ||
    message.includes("_owner_required")
  ) {
    return 403;
  }
  if (message.includes("_not_found")) return 404;
  if (
    message.includes("_not_eligible") ||
    message.includes("_last_owner")
  ) {
    return 409;
  }
  if (message.includes("_invalid")) return 400;
  return 500;
}

export async function GET() {
  const session = await currentSession();
  if (!session) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

  return observeApiOperation(
    session.user.id,
    "api.master-sysop.get",
    async () => {
      try {
        return Response.json(
          await listMasterSysopShellForUser(
            session.user.id,
            {
              name: session.user.name,
              email: session.user.email
            }
          ),
          { headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "master_sysop_list_failed";
        return Response.json(
          { error: message },
          { status: statusForError(message) }
        );
      }
    }
  );
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

  return observeApiOperation(
    session.user.id,
    "api.master-sysop.post",
    async () => {
      try {
        const raw = await request.text();
        if (
          raw.length < 2 ||
          Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES
        ) {
          return Response.json(
            { error: "master_sysop_body_invalid" },
            { status: 400 }
          );
        }
        const body = JSON.parse(raw) as Record<string, unknown>;
        const action = String(body.action ?? "");

        if (action === "claim") {
          return Response.json(
            {
              claimed: true,
              member: await claimMasterSysopOwner(session.user.id)
            },
            { status: 201 }
          );
        }

        if (action === "grant") {
          const role = String(body.role ?? "") as MasterSysopRole;
          const result = await grantMasterSysopByEmail(
            session.user.id,
            {
              email: String(body.email ?? ""),
              role,
              note:
                body.note === undefined || body.note === null
                  ? null
                  : String(body.note)
            }
          );
          return Response.json(
            { granted: true, member: result },
            { status: 201 }
          );
        }

        if (action === "revoke") {
          return Response.json(
            await revokeMasterSysop(
              session.user.id,
              String(body.userId ?? "")
            )
          );
        }

        if (action === "prepare-handoff") {
          return Response.json(
            await prepareMasterSysopHandoff(
              session.user.id,
              {
                name: session.user.name,
                email: session.user.email
              },
              String(body.destinationKey ?? "") as MasterSysopDestinationKey
            ),
            { headers: { "Cache-Control": "no-store" } }
          );
        }

        return Response.json(
          { error: "master_sysop_action_invalid" },
          { status: 400 }
        );
      } catch (error) {
        const message =
          error instanceof SyntaxError
            ? "master_sysop_json_invalid"
            : error instanceof Error
              ? error.message
              : "master_sysop_operation_failed";
        return Response.json(
          { error: message },
          { status: statusForError(message) }
        );
      }
    }
  );
}
