import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  createApprovedDatasetExport,
  type PublicationExportFormat
} from "@/lib/approved-dataset-publishing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function objectBody(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function statusFor(message: string) {
  if (message.includes("not_found")) return 404;
  if (message.includes("withdrawn")) return 409;
  return 400;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = objectBody(await request.json().catch(() => null));
  const format = text(body.format) as PublicationExportFormat;

  try {
    const artifact = await createApprovedDatasetExport(session.user.id, {
      workspaceId: text(body.workspaceId),
      publicationId: text(body.publicationId),
      format
    });

    return new Response(artifact.body, {
      status: 200,
      headers: {
        "content-type": artifact.contentType,
        "content-disposition": 'attachment; filename="' + artifact.filename + '"',
        "cache-control": "no-store",
        "x-publication-fingerprint": artifact.publication.publicationFingerprint
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "approved_publication_export_failed";
    return Response.json({ error: message }, { status: statusFor(message) });
  }
}
