import { getWorkspaceSyncCredentials } from "./workspace-session";

export async function recordRecipeRepairInteraction(input: {
  workspaceId: string;
  eventType: "repair-proposed" | "repair-rejected";
  recordId: string;
  revision: number;
  details?: Record<string, string | number | boolean | null>;
}) {
  const credentials = await getWorkspaceSyncCredentials();
  if (credentials.workspaceId !== input.workspaceId) {
    throw new Error("The active workspace changed before repair telemetry was recorded.");
  }

  const response = await fetch(
    new URL("/api/extension/operational-outcomes", credentials.platformOrigin),
    {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: "Bearer " + credentials.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    }
  );

  if (response.status === 401) {
    throw new Error("The extension session expired while recording repair telemetry.");
  }
  if (response.status === 403) {
    throw new Error("Workspace access was revoked while recording repair telemetry.");
  }
  if (!response.ok) {
    throw new Error("Unable to record the bounded repair outcome.");
  }
}

export async function recordRecipeRepairInteractionBestEffort(
  input: Parameters<typeof recordRecipeRepairInteraction>[0]
) {
  try {
    await recordRecipeRepairInteraction(input);
    return true;
  } catch (reason) {
    console.warn("Repair telemetry could not be recorded.", reason);
    return false;
  }
}
