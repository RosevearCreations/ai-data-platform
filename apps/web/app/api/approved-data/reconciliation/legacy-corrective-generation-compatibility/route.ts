import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  bridgeLegacyCorrectiveGenerationLineage,
  listLegacyCorrectiveGenerationCompatibilityForUser,
  type LegacyCorrectiveGenerationSourceKind
} from "@/lib/legacy-corrective-generation-compatibility";

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

function statusFor(error: string) {
  if (error.includes("manager_required")) return 403;
  if (error.includes("not_found") || error.includes("evidence_required")) return 404;
  if (
    error.includes("conflict") ||
    error.includes("predecessor_required") ||
    error.includes("source_kind_invalid")
  ) return 409;
  return 400;
}

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listLegacyCorrectiveGenerationCompatibilityForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = object(await request.json().catch(() => null));
  if (text(body.action) !== "bridge-legacy-corrective-generation") {
    return Response.json(
      { error: "legacy_corrective_generation_bridge_action_invalid" },
      { status: 400 }
    );
  }

  const sourceKind = text(body.sourceKind);
  if (!["legacy-next", "legacy-following"].includes(sourceKind)) {
    return Response.json(
      { error: "legacy_corrective_generation_bridge_source_kind_invalid" },
      { status: 400 }
    );
  }

  try {
    const bridgeResult = await bridgeLegacyCorrectiveGenerationLineage(userId, {
      workspaceId: text(body.workspaceId),
      sourceKind: sourceKind as LegacyCorrectiveGenerationSourceKind,
      planId: text(body.planId)
    });
    return Response.json({
      bridgeResult,
      model: await listLegacyCorrectiveGenerationCompatibilityForUser(userId)
    });
  } catch (error) {
    const code = error instanceof Error
      ? error.message
      : "legacy_corrective_generation_bridge_failed";
    return Response.json({ error: code }, { status: statusFor(code) });
  }
}
