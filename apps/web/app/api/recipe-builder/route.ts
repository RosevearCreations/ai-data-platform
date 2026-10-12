import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listVisualRecipesForUser,
  saveVisualRecipe
} from "@/lib/recipe-builder-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function objectBody(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listVisualRecipesForUser(userId));
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = objectBody(await request.json().catch(() => null));
  try {
    const result = await saveVisualRecipe(userId, {
      workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : "",
      recordId: typeof body.recordId === "string" ? body.recordId : undefined,
      expectedServerVersion:
        typeof body.expectedServerVersion === "number"
          ? body.expectedServerVersion
          : body.expectedServerVersion === null
            ? null
            : undefined,
      kind: body.kind === "scraper" ? "scraper" : "template",
      recipe: body.recipe
    });
    return Response.json(result, {
      status: result.status === "conflict" ? 409 : 200
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "visual_recipe_invalid";
    return Response.json(
      { error: message },
      { status: message === "workspace_access_denied" ? 403 : 400 }
    );
  }
}
