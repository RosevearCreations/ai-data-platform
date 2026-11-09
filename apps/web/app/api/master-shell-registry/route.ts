import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import type { MasterShellSourceId } from "@/lib/master-shell-contract-v1";
import type {
  MasterShellSourceState
} from "@/lib/master-shell-source-registry-core";
import {
  listMasterShellSourceRegistryForUser,
  recordOperatorMasterShellSourceEvidence
} from "@/lib/master-shell-source-registry-database";
import { observeApiOperation } from "@/lib/performance-observatory-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 131_072;

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function statusForError(message: string) {
  if (message.includes("suite_admin_required")) return 403;
  if (message.includes("independent_source_ingestion_required")) return 409;
  if (message.includes("transition_invalid")) return 409;
  if (
    message.includes("_invalid") ||
    message.includes("_required") ||
    message.includes("_cannot_")
  ) return 400;
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
    "api.master-shell-registry.get",
    async () => {
      try {
        const registry =
          await listMasterShellSourceRegistryForUser(userId);
        return Response.json(registry, {
          headers: { "Cache-Control": "no-store" }
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "master_shell_registry_list_failed";
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
    "api.master-shell-registry.post",
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
            { error: "master_shell_registry_body_too_large" },
            { status: 413 }
          );
        }

        const raw = await request.text();
        if (
          raw.length < 2 ||
          Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES
        ) {
          return Response.json(
            { error: "master_shell_registry_body_invalid" },
            { status: 400 }
          );
        }

        const body = JSON.parse(raw) as Record<string, unknown>;
        if (body.action !== "record-operator-evidence") {
          return Response.json(
            { error: "master_shell_registry_action_invalid" },
            { status: 400 }
          );
        }

        const sourceId = String(body.sourceId ?? "") as MasterShellSourceId;
        const declaredStatus = String(
          body.declaredStatus ?? ""
        ) as Exclude<MasterShellSourceState, "UNKNOWN">;

        const evidence = await recordOperatorMasterShellSourceEvidence(
          userId,
          {
            sourceId,
            environment:
              body.environment === "production"
                ? "production"
                : "nonproduction",
            declaredStatus,
            statusObservedAt: String(body.statusObservedAt ?? ""),
            statusExpiresAt: String(body.statusExpiresAt ?? ""),
            evidenceURI: String(body.evidenceURI ?? ""),
            manifestURI:
              body.manifestURI === null ||
              body.manifestURI === undefined ||
              body.manifestURI === ""
                ? null
                : String(body.manifestURI),
            immutableRevision:
              body.immutableRevision === null ||
              body.immutableRevision === undefined ||
              body.immutableRevision === ""
                ? null
                : String(body.immutableRevision),
            capabilityVersion:
              body.capabilityVersion === null ||
              body.capabilityVersion === undefined ||
              body.capabilityVersion === ""
                ? null
                : String(body.capabilityVersion),
            approvedOrigin:
              body.approvedOrigin === null ||
              body.approvedOrigin === undefined ||
              body.approvedOrigin === ""
                ? null
                : String(body.approvedOrigin),
            signerKeyId:
              body.signerKeyId === null ||
              body.signerKeyId === undefined ||
              body.signerKeyId === ""
                ? null
                : String(body.signerKeyId),
            signerFingerprint:
              body.signerFingerprint === null ||
              body.signerFingerprint === undefined ||
              body.signerFingerprint === ""
                ? null
                : String(body.signerFingerprint),
            rolesAllowed: Array.isArray(body.rolesAllowed)
              ? body.rolesAllowed.map(String)
              : [],
            holdReason:
              body.holdReason === null ||
              body.holdReason === undefined ||
              body.holdReason === ""
                ? null
                : String(body.holdReason),
            testEvidenceURI: null,
            connectionEvidenceURI: null,
            ownerAuthorized: false,
            independentTestVerified: false,
            independentConnectionVerified: false
          }
        );

        return Response.json(
          {
            recorded: true,
            independentSourceVerification: false,
            testVerifiedOrConnectedCreated: false,
            evidence
          },
          {
            status: 201,
            headers: { "Cache-Control": "no-store" }
          }
        );
      } catch (error) {
        const message =
          error instanceof SyntaxError
            ? "master_shell_registry_json_invalid"
            : error instanceof Error
              ? error.message
              : "master_shell_registry_record_failed";
        return Response.json(
          { error: message },
          { status: statusForError(message) }
        );
      }
    }
  );
}
