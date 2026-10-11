import { buildAdoptionReview } from "./adoption-database";
import { listIntegrationDeliveryOverviewForUser } from "./integration-delivery-database";
import { listRemotePilotOverviewForUser } from "./remote-pilot-database";
import { listRetentionOverviewForUser } from "./retention-database";

type CommandCenterSources = {
  adoption: Awaited<ReturnType<typeof buildAdoptionReview>>;
  remote: Awaited<ReturnType<typeof listRemotePilotOverviewForUser>>;
  retention: Awaited<ReturnType<typeof listRetentionOverviewForUser>>;
  delivery: Awaited<ReturnType<typeof listIntegrationDeliveryOverviewForUser>>;
};

export function buildCommandCenterSummary(sources: CommandCenterSources) {
  const remoteByWorkspace = new Map(
    sources.remote.map((entry) => [entry.workspace.id, entry])
  );
  const retentionByWorkspace = new Map(
    sources.retention.map((entry) => [entry.workspace.id, entry])
  );
  const deliveryByWorkspace = new Map(
    sources.delivery.map((entry) => [entry.workspace.id, entry])
  );

  const workspaces = sources.adoption.workspaces.map((workspace) => {
    const remote = remoteByWorkspace.get(workspace.workspaceId);
    const retention = retentionByWorkspace.get(workspace.workspaceId);
    const delivery = deliveryByWorkspace.get(workspace.workspaceId);
    const attention: string[] = [];

    if (workspace.permissions.status !== "healthy") {
      attention.push("Permission review");
    }
    if (workspace.capabilities.disabledUsed.length > 0) {
      attention.push("Profile mismatch");
    }
    if ((retention?.budgetBreaches.length ?? 0) > 0) {
      attention.push("Storage budget");
    }
    if ((remote?.report.failures ?? 0) > 0) {
      attention.push("Remote failures");
    }
    if ((delivery?.counts["transport-error"] ?? 0) > 0) {
      attention.push("Delivery transport");
    }

    const latestRemote = remote?.events[0] ?? null;
    const latestDelivery = delivery?.recent[0] ?? null;
    const latest =
      latestRemote && latestDelivery
        ? latestRemote.createdAt > latestDelivery.occurredAt
          ? {
              kind: "Remote",
              label: latestRemote.eventType,
              at: latestRemote.createdAt
            }
          : {
              kind: "Delivery",
              label: latestDelivery.eventType,
              at: latestDelivery.occurredAt
            }
        : latestRemote
          ? { kind: "Remote", label: latestRemote.eventType, at: latestRemote.createdAt }
          : latestDelivery
            ? { kind: "Delivery", label: latestDelivery.eventType, at: latestDelivery.occurredAt }
            : null;

    return {
      workspaceId: workspace.workspaceId,
      workspaceName: workspace.workspaceName,
      profileName: workspace.profileName,
      role: workspace.role,
      activityEvents: workspace.activityEvents,
      activity: workspace.activity,
      attention,
      measuredBytes: retention?.measuredBytes ?? 0,
      budgetBreaches: retention?.budgetBreaches.length ?? 0,
      latest
    };
  });

  const attentionWorkspaces = workspaces.filter((workspace) => workspace.attention.length > 0);
  const latestEvents = workspaces
    .flatMap((workspace) =>
      workspace.latest
        ? [{ ...workspace.latest, workspaceName: workspace.workspaceName }]
        : []
    )
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      workspaces: sources.adoption.totals.workspaces,
      activeWorkspaces: sources.adoption.totals.activeWorkspaces,
      attentionWorkspaces: attentionWorkspaces.length,
      activityEvents: workspaces.reduce((sum, workspace) => sum + workspace.activityEvents, 0),
      sync: workspaces.reduce((sum, workspace) => sum + workspace.activity.sync, 0),
      barcodeCaptures: workspaces.reduce(
        (sum, workspace) => sum + workspace.activity.barcodeCaptures,
        0
      ),
      scheduledAttempts: workspaces.reduce(
        (sum, workspace) => sum + workspace.activity.scheduledAttempts,
        0
      ),
      remoteRuns: workspaces.reduce((sum, workspace) => sum + workspace.activity.remoteRuns, 0),
      integrationEvents: workspaces.reduce(
        (sum, workspace) => sum + workspace.activity.integrationEvents,
        0
      ),
      measuredBytes: workspaces.reduce((sum, workspace) => sum + workspace.measuredBytes, 0)
    },
    workspaces,
    latestEvents
  };
}

export async function buildCommandCenterHome(userId: string) {
  const [adoption, remote, retention, delivery] = await Promise.all([
    buildAdoptionReview(userId),
    listRemotePilotOverviewForUser(userId),
    listRetentionOverviewForUser(userId),
    listIntegrationDeliveryOverviewForUser(userId)
  ]);

  return buildCommandCenterSummary({ adoption, remote, retention, delivery });
}
