import { browserlessPilotReadiness } from "./browserless-provider";
import { listIntelligenceOverviewForUser } from "./database";
import {
  buildProviderPilotBaseline,
  type ProviderPilotWorkspaceInput
} from "./provider-pilot-baseline";
import { listRemotePilotOverviewForUser } from "./remote-pilot-database";

function approvedPublicSourceCount(payload: unknown, at = Date.now()) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return 0;
  const entries = (payload as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) return 0;

  return entries.filter((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const policy = entry as Record<string, unknown>;
    const expires =
      typeof policy.reviewExpiresAt === "string"
        ? Date.parse(policy.reviewExpiresAt)
        : Number.NaN;
    return (
      policy.status === "approved" &&
      policy.collectionMethod === "public-webpage" &&
      policy.dataSensitivity === "public-facts" &&
      policy.publicOrAuthorized === true &&
      policy.termsReviewed === true &&
      policy.noAccessControlBypass === true &&
      policy.robotsDecision === "allowed" &&
      Number.isFinite(expires) &&
      expires > at
    );
  }).length;
}

export async function buildProviderPilotBaselineForUser(userId: string) {
  const [pilot, intelligence] = await Promise.all([
    listRemotePilotOverviewForUser(userId),
    listIntelligenceOverviewForUser(userId)
  ]);
  const readiness = browserlessPilotReadiness();

  const workspaces: ProviderPilotWorkspaceInput[] = pilot.map((entry) => {
    const intelligenceWorkspace = intelligence.find(
      (item) => item.workspace.id === entry.workspace.id
    );
    const sourcePolicy = intelligenceWorkspace?.modules.find(
      (module) => module.moduleKey === "source-policy"
    );

    return {
      workspace: {
        id: entry.workspace.id,
        name: entry.workspace.name,
        role: entry.workspace.role
      },
      control: entry.control
        ? {
            enabled: entry.control.enabled,
            killSwitch: entry.control.killSwitch
          }
        : null,
      allowlist: entry.allowlist.map((item) => ({ enabled: item.enabled })),
      events: entry.events,
      report: entry.report,
      approvedPublicSources: approvedPublicSourceCount(sourcePolicy?.payload)
    };
  });

  return buildProviderPilotBaseline(readiness, workspaces);
}
