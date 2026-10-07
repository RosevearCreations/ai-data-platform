import { randomUUID } from "node:crypto";
import { headers } from "next/headers";

import {
  barcodeProvenance,
  matchBarcodeAgainstIntelligence,
  normalizeBarcode,
  parseBarcodeCaptureInput
} from "@/lib/barcodes";
import {
  createWorkspaceBarcodeCapture,
  listWorkspaceBarcodeCaptures,
  reviewWorkspaceBarcodeCapture
} from "@/lib/database";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeCapture(
  capture: Awaited<ReturnType<typeof createWorkspaceBarcodeCapture>>
) {
  return {
    ...capture,
    capturedAt: capture.capturedAt.toISOString(),
    reviewedAt: capture.reviewedAt?.toISOString() ?? null,
    createdAt: capture.createdAt.toISOString(),
    updatedAt: capture.updatedAt.toISOString()
  };
}

async function currentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function GET(request: Request) {
  const session = await currentSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? "";
  if (!workspaceId) {
    return Response.json({ error: "workspaceId is required." }, { status: 400 });
  }

  try {
    const captures = await listWorkspaceBarcodeCaptures(
      session.user.id,
      workspaceId
    );
    return Response.json({
      captures: captures.map(serializeCapture)
    });
  } catch (reason) {
    if (
      reason instanceof Error &&
      reason.message === "workspace_access_denied"
    ) {
      return Response.json({ error: "Workspace access denied." }, { status: 403 });
    }
    throw reason;
  }
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = parseBarcodeCaptureInput(await request.json());
  } catch (reason) {
    return Response.json(
      {
        error:
          reason instanceof Error
            ? reason.message
            : "Invalid barcode capture request."
      },
      { status: 400 }
    );
  }

  const normalized = normalizeBarcode(parsed.rawCode, parsed.formatHint);

  try {
    const capture = await createWorkspaceBarcodeCapture(session.user.id, {
      workspaceId: parsed.workspaceId,
      captureId: randomUUID(),
      target: parsed.target,
      rawCode: normalized.rawDigits,
      normalizedCode: normalized.normalizedCode,
      barcodeFormat: normalized.format,
      captureMethod: parsed.captureMethod,
      capturedAt: parsed.capturedAt,
      provenance: barcodeProvenance(parsed),
      matchSuggestion: (payload) =>
        matchBarcodeAgainstIntelligence({
          target: parsed.target,
          normalizedCode: normalized.normalizedCode,
          intelligencePayload: payload
        })
    });

    return Response.json(
      {
        capture: serializeCapture(capture),
        normalization: normalized,
        warning:
          normalized.validChecksum === false
            ? "Barcode length is valid, but its standard GTIN checksum did not validate. Review the digits before approving."
            : null
      },
      { status: 201 }
    );
  } catch (reason) {
    if (
      reason instanceof Error &&
      (reason.message === "workspace_access_denied" ||
        reason.message === "barcode_target_workspace_mismatch")
    ) {
      return Response.json(
        { error: "The selected target does not belong to this workspace." },
        { status: 403 }
      );
    }
    throw reason;
  }
}

export async function PATCH(request: Request) {
  const session = await currentSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.json();
    body =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const workspaceId =
    typeof body.workspaceId === "string" ? body.workspaceId : "";
  const captureId =
    typeof body.captureId === "string" ? body.captureId : "";
  const reviewStatus = body.reviewStatus;

  if (
    !workspaceId ||
    !captureId ||
    (reviewStatus !== "approved" && reviewStatus !== "rejected")
  ) {
    return Response.json(
      { error: "workspaceId, captureId and approved/rejected status are required." },
      { status: 400 }
    );
  }

  try {
    const capture = await reviewWorkspaceBarcodeCapture(session.user.id, {
      workspaceId,
      captureId,
      reviewStatus
    });
    return Response.json({ capture: serializeCapture(capture) });
  } catch (reason) {
    if (reason instanceof Error) {
      if (reason.message === "workspace_access_denied") {
        return Response.json({ error: "Workspace access denied." }, { status: 403 });
      }
      if (reason.message === "barcode_capture_not_found") {
        return Response.json({ error: "Barcode capture not found." }, { status: 404 });
      }
      if (reason.message === "duplicate_barcode_cannot_be_approved") {
        return Response.json(
          { error: "Duplicate barcode captures cannot be approved. Reject this duplicate instead." },
          { status: 409 }
        );
      }
      if (reason.message === "barcode_target_workspace_mismatch") {
        return Response.json(
          { error: "The barcode target no longer matches this workspace." },
          { status: 403 }
        );
      }
    }
    throw reason;
  }
}
