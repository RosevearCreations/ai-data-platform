import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  archiveCollectionProject,
  collectionProjectOptionsForUser,
  createCollectionProject,
  createCollectionProjectSource,
  listCollectionProjectsForUser,
  retireCollectionProjectSource,
  updateCollectionProject,
  updateCollectionProjectSource
} from "@/lib/collection-project-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function userId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function objectBody(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function errorStatus(message: string) {
  if (message === "collection_project_admin_required") return 403;
  if (message.includes("not_found")) return 404;
  return 400;
}

export async function GET() {
  const id = await userId();
  if (!id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const [projects, options] = await Promise.all([
    listCollectionProjectsForUser(id),
    collectionProjectOptionsForUser(id)
  ]);
  return Response.json({ projects, options });
}

export async function POST(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = objectBody(await request.json().catch(() => null));
  const workspaceId = text(body.workspaceId);
  const projectId = text(body.projectId);
  try {
    if (body.action === "create-project") {
      return Response.json(
        { project: await createCollectionProject(id, workspaceId, body.project) },
        { status: 201 }
      );
    }
    if (body.action === "create-source") {
      return Response.json(
        {
          source: await createCollectionProjectSource(
            id,
            workspaceId,
            projectId,
            body.source
          )
        },
        { status: 201 }
      );
    }
    return Response.json({ error: "Invalid collection-project action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "collection_project_invalid";
    return Response.json({ error: message }, { status: errorStatus(message) });
  }
}

export async function PATCH(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = objectBody(await request.json().catch(() => null));
  const workspaceId = text(body.workspaceId);
  const projectId = text(body.projectId);
  const sourceId = text(body.sourceId);
  try {
    if (body.action === "update-project") {
      return Response.json({
        project: await updateCollectionProject(id, workspaceId, projectId, body.project)
      });
    }
    if (body.action === "archive-project") {
      return Response.json({
        project: await archiveCollectionProject(id, workspaceId, projectId)
      });
    }
    if (body.action === "update-source") {
      return Response.json({
        source: await updateCollectionProjectSource(
          id,
          workspaceId,
          projectId,
          sourceId,
          body.source
        )
      });
    }
    if (body.action === "retire-source") {
      return Response.json({
        source: await retireCollectionProjectSource(
          id,
          workspaceId,
          projectId,
          sourceId
        )
      });
    }
    return Response.json({ error: "Invalid collection-project mutation." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "collection_project_invalid";
    return Response.json({ error: message }, { status: errorStatus(message) });
  }
}
