import type { WorkspaceBridgeState, WorkspaceSummary } from "./types";

const SESSION_KEY = "ai-data-platform:workspace-session:v1";
const ACTIVE_WORKSPACE_KEY = "ai-data-platform:active-workspace:v1";
const PLATFORM_ORIGIN_KEY = "ai-data-platform:platform-origin:v1";
const SAVED_SCRAPERS_KEY = "ai-data-platform-saved-scrapers-v1";
const REVIEWED_DATASETS_KEY = "ai-data-platform:reviewed-datasets:v1";

interface StoredSession {
  token: string;
  expiresAt: string;
  platformOrigin: string;
}

function defaultPlatformOrigin() {
  return (
    String(import.meta.env.VITE_PLATFORM_ORIGIN ?? "").trim() ||
    "http://localhost:3000"
  );
}

export function normalizePlatformOrigin(value: string) {
  const parsed = new URL(value.trim());
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Platform URL must use http or https.");
  }
  return parsed.origin;
}

async function storedSession() {
  const result = await chrome.storage.local.get(SESSION_KEY);
  const value = result[SESSION_KEY];

  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<StoredSession>;
  if (
    typeof candidate.token !== "string" ||
    typeof candidate.expiresAt !== "string" ||
    typeof candidate.platformOrigin !== "string"
  ) {
    return null;
  }

  return candidate as StoredSession;
}

async function clearStoredSession() {
  await chrome.storage.local.remove([SESSION_KEY, ACTIVE_WORKSPACE_KEY]);
}

export async function getPlatformOrigin() {
  const result = await chrome.storage.local.get(PLATFORM_ORIGIN_KEY);
  const configured = result[PLATFORM_ORIGIN_KEY];

  if (typeof configured === "string" && configured.trim()) {
    return normalizePlatformOrigin(configured);
  }

  return normalizePlatformOrigin(defaultPlatformOrigin());
}

export async function setPlatformOrigin(origin: string) {
  const normalized = normalizePlatformOrigin(origin);
  await chrome.storage.local.set({ [PLATFORM_ORIGIN_KEY]: normalized });
  return normalized;
}

function platformPermissionPattern(origin: string) {
  const url = new URL(origin);
  return url.protocol + "//" + url.hostname + "/*";
}

async function requestPlatformAccess(origin: string) {
  const granted = await chrome.permissions.request({
    origins: [platformPermissionPattern(origin)]
  });

  if (!granted) {
    throw new Error(
      "Site access to the AI Data Platform was not granted, so the extension cannot load your authorized workspaces."
    );
  }
}

function stateNonce() {
  return crypto.randomUUID();
}

function parseBridgeRedirect(urlValue: string, expectedState: string) {
  const url = new URL(urlValue);
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
  const state = fragment.get("state") ?? "";
  const token = fragment.get("token") ?? "";
  const expiresAt = fragment.get("expires_at") ?? "";

  if (!state || state !== expectedState) {
    throw new Error("The extension sign-in response failed state verification.");
  }
  if (!token || !expiresAt) {
    throw new Error("The extension sign-in response did not include a session.");
  }

  return { token, expiresAt };
}

export async function connectWorkspaceSession(
  requestedOrigin?: string
): Promise<WorkspaceBridgeState> {
  const platformOrigin = requestedOrigin
    ? normalizePlatformOrigin(requestedOrigin)
    : await getPlatformOrigin();

  await requestPlatformAccess(platformOrigin);
  if (requestedOrigin) {
    await chrome.storage.local.set({ [PLATFORM_ORIGIN_KEY]: platformOrigin });
  }

  const state = stateNonce();
  const redirectUri = chrome.identity.getRedirectURL("workspace-session");
  const connectUrl = new URL("/api/extension/connect", platformOrigin);
  connectUrl.searchParams.set("redirect_uri", redirectUri);
  connectUrl.searchParams.set("state", state);

  const redirectResult = await chrome.identity.launchWebAuthFlow({
    url: connectUrl.href,
    interactive: true
  });

  if (!redirectResult) {
    throw new Error("The AI Data Platform sign-in flow was cancelled.");
  }

  const bridge = parseBridgeRedirect(redirectResult, state);
  await chrome.storage.local.set({
    [SESSION_KEY]: {
      token: bridge.token,
      expiresAt: bridge.expiresAt,
      platformOrigin
    } satisfies StoredSession
  });

  return refreshWorkspaceSession();
}

function signedOutState(
  platformOrigin: string,
  status: WorkspaceBridgeState["status"],
  message: string
): WorkspaceBridgeState {
  return {
    status,
    platformOrigin,
    user: null,
    workspaces: [],
    activeWorkspaceId: null,
    expiresAt: null,
    message
  };
}

export async function refreshWorkspaceSession(): Promise<WorkspaceBridgeState> {
  const platformOrigin = await getPlatformOrigin();
  const session = await storedSession();

  if (!session) {
    return signedOutState(
      platformOrigin,
      "signed-out",
      "Connect the extension to your signed-in AI Data Platform account."
    );
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await clearStoredSession();
    return signedOutState(
      platformOrigin,
      "expired",
      "The extension session expired. Sign in again to restore workspace access."
    );
  }

  try {
    const response = await fetch(
      new URL("/api/extension/session", session.platformOrigin),
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: "Bearer " + session.token
        }
      }
    );

    if (response.status === 401) {
      await clearStoredSession();
      return signedOutState(
        session.platformOrigin,
        "expired",
        "The extension session is no longer valid. Sign in again."
      );
    }

    if (!response.ok) {
      throw new Error("Workspace bridge returned HTTP " + response.status + ".");
    }

    const payload = (await response.json()) as {
      session: { expiresAt: string };
      user: { id: string; name: string; email: string };
      workspaces: WorkspaceSummary[];
    };

    const stored = await chrome.storage.local.get(ACTIVE_WORKSPACE_KEY);
    const savedActiveId =
      typeof stored[ACTIVE_WORKSPACE_KEY] === "string"
        ? stored[ACTIVE_WORKSPACE_KEY]
        : "";
    const authorizedIds = new Set(payload.workspaces.map((workspace) => workspace.id));
    const preferred =
      savedActiveId && authorizedIds.has(savedActiveId)
        ? savedActiveId
        : payload.workspaces.find((workspace) => workspace.slug === "rosiedazzlers")
            ?.id ??
          payload.workspaces[0]?.id ??
          null;

    if (preferred) {
      await chrome.storage.local.set({ [ACTIVE_WORKSPACE_KEY]: preferred });
    } else {
      await chrome.storage.local.remove(ACTIVE_WORKSPACE_KEY);
    }

    return {
      status: payload.workspaces.length ? "connected" : "no-access",
      platformOrigin: session.platformOrigin,
      user: payload.user,
      workspaces: payload.workspaces,
      activeWorkspaceId: preferred,
      expiresAt: payload.session.expiresAt,
      message: payload.workspaces.length
        ? "Authenticated workspace access is active."
        : "This account is authenticated but has no workspace memberships."
    };
  } catch (reason) {
    return {
      status: "unavailable",
      platformOrigin: session.platformOrigin,
      user: null,
      workspaces: [],
      activeWorkspaceId: null,
      expiresAt: session.expiresAt,
      message:
        reason instanceof Error
          ? reason.message
          : "The AI Data Platform backend is temporarily unavailable."
    };
  }
}

export async function disconnectWorkspaceSession() {
  const session = await storedSession();

  if (session) {
    try {
      await fetch(new URL("/api/extension/session", session.platformOrigin), {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + session.token
        }
      });
    } catch {
      // Local disconnect must still succeed if the backend is unavailable.
    }
  }

  await clearStoredSession();
}

export async function setActiveWorkspace(
  workspaceId: string,
  authorizedWorkspaces: WorkspaceSummary[]
) {
  if (!authorizedWorkspaces.some((workspace) => workspace.id === workspaceId)) {
    throw new Error("That workspace is not authorized for the current account.");
  }

  await chrome.storage.local.set({ [ACTIVE_WORKSPACE_KEY]: workspaceId });
}

export async function getActiveWorkspaceId() {
  const result = await chrome.storage.local.get(ACTIVE_WORKSPACE_KEY);
  const value = result[ACTIVE_WORKSPACE_KEY];
  return typeof value === "string" && value ? value : null;
}

export async function getWorkspaceSyncCredentials() {
  const session = await storedSession();

  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    await clearStoredSession();
    throw new Error(
      "Connect the extension to an authenticated AI Data Platform session before synchronizing."
    );
  }

  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) {
    throw new Error("Select an authorized workspace before synchronizing.");
  }

  return {
    token: session.token,
    platformOrigin: session.platformOrigin,
    workspaceId,
    expiresAt: session.expiresAt
  };
}

export async function requireActiveWorkspaceId() {
  const session = await storedSession();
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    await clearStoredSession();
    throw new Error(
      "Connect the extension to an authenticated AI Data Platform session before saving workspace data."
    );
  }

  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) {
    throw new Error(
      "Connect the extension and select an authorized workspace before saving workspace data."
    );
  }
  return workspaceId;
}

export async function countUnscopedMigrationCandidates() {
  let savedScrapers = 0;
  const stored = await chrome.storage.local.get(SAVED_SCRAPERS_KEY);
  const scraperEnvelope = stored[SAVED_SCRAPERS_KEY];

  if (scraperEnvelope && typeof scraperEnvelope === "object") {
    const items = (scraperEnvelope as { items?: unknown }).items;
    if (Array.isArray(items)) {
      savedScrapers = items.filter((item) => {
        if (!item || typeof item !== "object") return false;
        const value = item as { workspaceId?: unknown };
        return typeof value.workspaceId !== "string" || !value.workspaceId;
      }).length;
    }
  }

  let reviewedDatasets = 0;
  try {
    const raw = localStorage.getItem(REVIEWED_DATASETS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(parsed)) {
      reviewedDatasets = parsed.filter((item) => {
        if (!item || typeof item !== "object") return false;
        const value = item as { workspaceId?: unknown };
        return typeof value.workspaceId !== "string" || !value.workspaceId;
      }).length;
    }
  } catch {
    reviewedDatasets = 0;
  }

  return {
    savedScrapers,
    reviewedDatasets,
    total: savedScrapers + reviewedDatasets
  };
}
