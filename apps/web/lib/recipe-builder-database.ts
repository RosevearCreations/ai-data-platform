import { randomUUID } from "node:crypto";

import {
  applyWorkspaceSyncMutation,
  listWorkspaceSyncRecords,
  listWorkspacesForUser
} from "./database";
import {
  cloneVisualRecipe,
  parseVisualRecipe,
  recipeCanSave,
  recipeSourceOrigin,
  type VisualExtractionRecipe
} from "./visual-recipe-builder";

export interface VisualRecipeRecord {
  workspaceId: string;
  workspaceName: string;
  recordId: string;
  serverVersion: number;
  kind: "scraper" | "template";
  revision: number;
  name: string;
  sourceUrl: string;
  sourceOrigin: string;
  createdAt: string;
  updatedAt: string;
  recipe: VisualExtractionRecipe;
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function kindValue(value: unknown): "scraper" | "template" {
  return value === "scraper" ? "scraper" : "template";
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function recipeRecord(
  workspaceId: string,
  workspaceName: string,
  serverVersion: number,
  recordId: string,
  payload: Record<string, unknown>
): VisualRecipeRecord | null {
  try {
    const recipe = parseVisualRecipe(payload.recipe);
    return {
      workspaceId,
      workspaceName,
      recordId,
      serverVersion,
      kind: kindValue(payload.kind),
      revision: Math.max(1, numberValue(payload.revision, 1)),
      name: stringValue(payload.name) || recipe.name,
      sourceUrl: stringValue(payload.sourceUrl) || recipe.sourceUrl,
      sourceOrigin:
        stringValue(payload.sourceOrigin) ||
        (recipe.sourceUrl ? recipeSourceOrigin(recipe.sourceUrl) : ""),
      createdAt: stringValue(payload.createdAt),
      updatedAt: stringValue(payload.updatedAt),
      recipe
    };
  } catch {
    return null;
  }
}

export async function listVisualRecipesForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const recipes: VisualRecipeRecord[] = [];
  for (const workspace of workspaces) {
    const records = await listWorkspaceSyncRecords(userId, workspace.id);
    for (const record of records) {
      if (record.resource !== "saved-scraper" || record.deleted) continue;
      const parsed = recipeRecord(
        workspace.id,
        workspace.name,
        record.serverVersion,
        record.recordId,
        record.payload
      );
      if (parsed) recipes.push(parsed);
    }
  }
  return {
    workspaces,
    recipes: recipes.sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    )
  };
}

export async function saveVisualRecipe(
  userId: string,
  input: {
    workspaceId: string;
    recordId?: string;
    expectedServerVersion?: number | null;
    kind?: "scraper" | "template";
    recipe: unknown;
  }
) {
  const recipe = parseVisualRecipe(input.recipe);
  if (!recipeCanSave(recipe)) throw new Error("visual_recipe_invalid");

  const records = await listWorkspaceSyncRecords(userId, input.workspaceId);
  const current =
    input.recordId
      ? records.find(
          (record) =>
            record.resource === "saved-scraper" &&
            record.recordId === input.recordId &&
            !record.deleted
        ) ?? null
      : null;

  const previousPayload = current ? objectValue(current.payload) : {};
  const recordId = current?.recordId ?? "web-recipe-" + randomUUID();
  const now = new Date().toISOString();
  const currentRevision = Math.max(
    0,
    numberValue(previousPayload.revision, current ? 1 : 0)
  );
  const currentRecipe = current
    ? (() => {
        try {
          return parseVisualRecipe(previousPayload.recipe);
        } catch {
          return null;
        }
      })()
    : null;
  const previousRevisions = Array.isArray(previousPayload.revisions)
    ? previousPayload.revisions.slice(-19)
    : [];
  const nextRevisions =
    currentRecipe
      ? [
          ...previousRevisions,
          {
            revision: currentRevision,
            savedAt:
              stringValue(previousPayload.updatedAt) ||
              current?.clientUpdatedAt ||
              now,
            sourceUrl:
              stringValue(previousPayload.sourceUrl) || currentRecipe.sourceUrl,
            revisionKind: "manual",
            structuralFingerprint: null,
            compatibility: null,
            recipe: cloneVisualRecipe(currentRecipe)
          }
        ].slice(-20)
      : previousRevisions;

  const kind = input.kind ?? kindValue(previousPayload.kind);
  const sourceUrl = recipe.sourceUrl;
  if (kind === "scraper" && !sourceUrl) {
    throw new Error("visual_recipe_scraper_source_required");
  }
  const payload: Record<string, unknown> = {
    ...previousPayload,
    version: 1,
    id: recordId,
    workspaceId: input.workspaceId,
    kind,
    name: recipe.name,
    sourceUrl,
    sourceOrigin: sourceUrl ? recipeSourceOrigin(sourceUrl) : "",
    createdAt: stringValue(previousPayload.createdAt) || now,
    updatedAt: now,
    revision: currentRevision + 1,
    revisionKind: "manual",
    structuralFingerprint: null,
    recipe: cloneVisualRecipe(recipe),
    revisions: nextRevisions,
    lastCheck: null,
    checkHistory: Array.isArray(previousPayload.checkHistory)
      ? previousPayload.checkHistory.slice(-20)
      : []
  };

  const result = await applyWorkspaceSyncMutation(userId, input.workspaceId, {
    resource: "saved-scraper",
    action: "upsert",
    recordId,
    expectedServerVersion:
      current
        ? input.expectedServerVersion ?? current.serverVersion
        : null,
    clientUpdatedAt: now,
    payload,
    kind,
    name: recipe.name,
    sourceUrl,
    sourceOrigin: sourceUrl ? recipeSourceOrigin(sourceUrl) : ""
  });

  if (result.status === "conflict") {
    return { status: "conflict" as const, record: result.record };
  }
  return {
    status: "saved" as const,
    recordId,
    serverVersion: result.record?.serverVersion ?? null,
    revision: currentRevision + 1
  };
}
