import { buildAdoptionReview } from "./adoption-database";
import { listCollectionProjectsForUser } from "./collection-project-database";
import { listCorrectiveGenerationStateMachineForUser } from "./corrective-generation-state-machine";
import { listIntegrationDeliveryOverviewForUser } from "./integration-delivery-database";
import { listRemotePilotOverviewForUser } from "./remote-pilot-database";
import { listRetentionOverviewForUser } from "./retention-database";

type CommandCenterSources = {
  adoption: Awaited<ReturnType<typeof buildAdoptionReview>>;
  remote: Awaited<ReturnType<typeof listRemotePilotOverviewForUser>>;
  retention: Awaited<ReturnType<typeof listRetentionOverviewForUser>>;
  delivery: Awaited<ReturnType<typeof listIntegrationDeliveryOverviewForUser>>;
  collectionProjects?: Awaited<ReturnType<typeof listCollectionProjectsForUser>>;
  corrective?: Awaited<ReturnType<typeof listCorrectiveGenerationStateMachineForUser>>;
};

export type CommandCenterAttentionSeverity = "critical" | "attention" | "info";
export type CommandCenterHealthState = "healthy" | "attention" | "critical";

export interface CommandCenterAttentionItem {
  id: string;
  severity: CommandCenterAttentionSeverity;
  workspaceId: string | null;
  workspaceName: string;
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
}

export interface CommandCenterHealthSignal {
  id: string;
  label: string;
  state: CommandCenterHealthState;
  detail: string;
  count: number;
  href: string;
}

export interface CommandCenterQuickAction {
  id: string;
  label: string;
  description: string;
  href: string;
  group: "collect" | "review" | "correct" | "integrate" | "admin";
}

export interface CommandCenterRecentWorkItem {
  id: string;
  kind: "Remote" | "Delivery" | "Collection";
  workspaceName: string;
  label: string;
  detail: string;
  at: Date;
  href: string;
}

const QUICK_ACTIONS: CommandCenterQuickAction[] = [
  {
    id: "collection-projects",
    label: "Collection Projects",
    description: "Review source readiness, policy pins and project status.",
    href: "/collection-projects",
    group: "collect"
  },
  {
    id: "collection-runs",
    label: "Collection Runs",
    description: "Inspect local and remote collection execution evidence.",
    href: "/collection-runs",
    group: "collect"
  },
  {
    id: "data-review",
    label: "Review Data",
    description: "Move extracted records through governed operator review.",
    href: "/data-review",
    group: "review"
  },
  {
    id: "corrective-operations",
    label: "Corrective Operations",
    description: "Open current cases, state-machine standing and invariant findings.",
    href: "/approved-data/reconciliation/corrective-generation-operations",
    group: "correct"
  },
  {
    id: "integration-delivery",
    label: "Integration Delivery",
    description: "Review downstream delivery readiness and transport evidence.",
    href: "/integration-delivery",
    group: "integrate"
  },
  {
    id: "workspace-administration",
    label: "Workspace Administration",
    description: "Review profiles, permissions, adoption and retention controls.",
    href: "/workspace-profiles",
    group: "admin"
  }
];

const severityOrder: Record<CommandCenterAttentionSeverity, number> = {
  critical: 0,
  attention: 1,
  info: 2
};

function emptyCorrectiveSummary() {
  return {
    cycles: 0,
    activeCycles: 0,
    completedCycles: 0,
    recurrentCycles: 0,
    criticalViolations: 0,
    warnings: 0
  };
}

export function buildCommandCenterSummary(sources: CommandCenterSources) {
  const collectionProjects = sources.collectionProjects ?? [];
  const corrective = sources.corrective ?? {
    cycles: [],
    violations: [],
    summary: emptyCorrectiveSummary()
  };

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
              kind: "Remote" as const,
              label: latestRemote.eventType,
              at: latestRemote.createdAt
            }
          : {
              kind: "Delivery" as const,
              label: latestDelivery.eventType,
              at: latestDelivery.occurredAt
            }
        : latestRemote
          ? {
              kind: "Remote" as const,
              label: latestRemote.eventType,
              at: latestRemote.createdAt
            }
          : latestDelivery
            ? {
                kind: "Delivery" as const,
                label: latestDelivery.eventType,
                at: latestDelivery.occurredAt
              }
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

  const attentionWorkspaces = workspaces.filter(
    (workspace) => workspace.attention.length > 0
  );
  const latestEvents = workspaces
    .flatMap((workspace) =>
      workspace.latest
        ? [{ ...workspace.latest, workspaceName: workspace.workspaceName }]
        : []
    )
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  const activeProjects = collectionProjects.filter(
    (project) => project.status === "active"
  );
  const blockedProjects = collectionProjects.filter(
    (project) => project.status !== "archived" && project.readiness === "blocked"
  );
  const incompleteProjects = collectionProjects.filter(
    (project) => project.status !== "archived" && project.readiness === "incomplete"
  );
  const readyProjects = collectionProjects.filter(
    (project) => project.status !== "archived" && project.readiness === "ready"
  );
  const blockedSources = collectionProjects.reduce(
    (sum, project) =>
      sum +
      project.sources.filter(
        (source) => source.status !== "retired" && source.readiness === "blocked"
      ).length,
    0
  );

  const attentionQueue: CommandCenterAttentionItem[] = [];
  for (const workspace of workspaces) {
    for (const condition of workspace.attention) {
      if (condition === "Permission review") {
        attentionQueue.push({
          id: workspace.workspaceId + ":permissions",
          severity: "attention",
          workspaceId: workspace.workspaceId,
          workspaceName: workspace.workspaceName,
          title: "Permission review required",
          detail: "Measured workspace permission evidence is not currently healthy.",
          href: "/adoption",
          actionLabel: "Review permissions"
        });
      } else if (condition === "Profile mismatch") {
        attentionQueue.push({
          id: workspace.workspaceId + ":profile",
          severity: "attention",
          workspaceId: workspace.workspaceId,
          workspaceName: workspace.workspaceName,
          title: "Workspace profile mismatch",
          detail: "A capability has durable use evidence but is disabled in the workspace profile.",
          href: "/workspace-profiles",
          actionLabel: "Review profile"
        });
      } else if (condition === "Storage budget") {
        attentionQueue.push({
          id: workspace.workspaceId + ":retention",
          severity: "attention",
          workspaceId: workspace.workspaceId,
          workspaceName: workspace.workspaceName,
          title: "Storage budget needs review",
          detail: workspace.budgetBreaches + " measured retention budget condition(s) are active.",
          href: "/retention",
          actionLabel: "Review retention"
        });
      } else if (condition === "Remote failures") {
        attentionQueue.push({
          id: workspace.workspaceId + ":remote",
          severity: "critical",
          workspaceId: workspace.workspaceId,
          workspaceName: workspace.workspaceName,
          title: "Remote execution failures",
          detail: "Recent remote-provider evidence includes failed execution attempts.",
          href: "/remote-execution",
          actionLabel: "Inspect remote runs"
        });
      } else if (condition === "Delivery transport") {
        attentionQueue.push({
          id: workspace.workspaceId + ":delivery",
          severity: "critical",
          workspaceId: workspace.workspaceId,
          workspaceName: workspace.workspaceName,
          title: "Delivery transport errors",
          detail: "Recent integration-delivery evidence includes transport errors.",
          href: "/integration-delivery",
          actionLabel: "Inspect delivery"
        });
      }
    }
  }

  if (blockedProjects.length > 0 || blockedSources > 0) {
    attentionQueue.push({
      id: "collection:blocked",
      severity: "attention",
      workspaceId: null,
      workspaceName: "Collection",
      title: "Collection readiness blocked",
      detail:
        blockedProjects.length +
        " project(s) and " +
        blockedSources +
        " source(s) have measured readiness blockers.",
      href: "/collection-projects",
      actionLabel: "Review collection readiness"
    });
  }

  if (corrective.summary.criticalViolations > 0) {
    attentionQueue.push({
      id: "corrective:critical",
      severity: "critical",
      workspaceId: null,
      workspaceName: "Corrective Operations",
      title: "Critical corrective invariant findings",
      detail:
        corrective.summary.criticalViolations +
        " critical cross-generation invariant finding(s) require review.",
      href: "/approved-data/reconciliation/corrective-generation-state-machine",
      actionLabel: "Review invariant findings"
    });
  } else if (corrective.summary.warnings > 0) {
    attentionQueue.push({
      id: "corrective:warnings",
      severity: "attention",
      workspaceId: null,
      workspaceName: "Corrective Operations",
      title: "Corrective state warnings",
      detail:
        corrective.summary.warnings +
        " state-machine warning(s) require operator review.",
      href: "/approved-data/reconciliation/corrective-generation-state-machine",
      actionLabel: "Review warnings"
    });
  }

  attentionQueue.sort((left, right) => {
    const severityDelta =
      severityOrder[left.severity] - severityOrder[right.severity];
    if (severityDelta !== 0) return severityDelta;
    return left.workspaceName.localeCompare(right.workspaceName);
  });

  const permissionProfileCount = workspaces.filter((workspace) =>
    workspace.attention.some(
      (item) => item === "Permission review" || item === "Profile mismatch"
    )
  ).length;
  const storageCount = workspaces.filter((workspace) =>
    workspace.attention.includes("Storage budget")
  ).length;
  const remoteFailureCount = workspaces.filter((workspace) =>
    workspace.attention.includes("Remote failures")
  ).length;
  const deliveryFailureCount = workspaces.filter((workspace) =>
    workspace.attention.includes("Delivery transport")
  ).length;

  const healthSignals: CommandCenterHealthSignal[] = [
    {
      id: "workspace-governance",
      label: "Workspace governance",
      state: permissionProfileCount > 0 ? "attention" : "healthy",
      detail:
        permissionProfileCount > 0
          ? permissionProfileCount + " workspace(s) need permission or profile review."
          : "Permission and profile evidence is healthy across authorized workspaces.",
      count: permissionProfileCount,
      href: "/adoption"
    },
    {
      id: "collection-readiness",
      label: "Collection readiness",
      state: blockedProjects.length > 0 ? "attention" : "healthy",
      detail:
        blockedProjects.length > 0
          ? blockedProjects.length + " collection project(s) have blockers."
          : "No collection project readiness blocker is measured.",
      count: blockedProjects.length,
      href: "/collection-projects"
    },
    {
      id: "remote-execution",
      label: "Remote execution",
      state: remoteFailureCount > 0 ? "critical" : "healthy",
      detail:
        remoteFailureCount > 0
          ? remoteFailureCount + " workspace(s) include remote execution failures."
          : "No remote execution failure condition is measured.",
      count: remoteFailureCount,
      href: "/remote-execution"
    },
    {
      id: "integration-delivery",
      label: "Integration delivery",
      state: deliveryFailureCount > 0 ? "critical" : "healthy",
      detail:
        deliveryFailureCount > 0
          ? deliveryFailureCount + " workspace(s) include delivery transport errors."
          : "No delivery transport error condition is measured.",
      count: deliveryFailureCount,
      href: "/integration-delivery"
    },
    {
      id: "corrective-invariants",
      label: "Corrective invariants",
      state:
        corrective.summary.criticalViolations > 0
          ? "critical"
          : corrective.summary.warnings > 0
            ? "attention"
            : "healthy",
      detail:
        corrective.summary.criticalViolations > 0
          ? corrective.summary.criticalViolations + " critical invariant finding(s)."
          : corrective.summary.warnings > 0
            ? corrective.summary.warnings + " corrective warning(s)."
            : "No corrective invariant finding is measured.",
      count:
        corrective.summary.criticalViolations > 0
          ? corrective.summary.criticalViolations
          : corrective.summary.warnings,
      href: "/approved-data/reconciliation/corrective-generation-state-machine"
    },
    {
      id: "retention",
      label: "Retention & storage",
      state: storageCount > 0 ? "attention" : "healthy",
      detail:
        storageCount > 0
          ? storageCount + " workspace(s) have retention budget conditions."
          : "No retention budget breach is measured.",
      count: storageCount,
      href: "/retention"
    }
  ];

  const overallHealth: CommandCenterHealthState = healthSignals.some(
    (signal) => signal.state === "critical"
  )
    ? "critical"
    : healthSignals.some((signal) => signal.state === "attention")
      ? "attention"
      : "healthy";

  const projectRecent: CommandCenterRecentWorkItem[] = [...collectionProjects]
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, 6)
    .map((project) => ({
      id: "collection:" + project.projectId,
      kind: "Collection" as const,
      workspaceName: project.workspaceName,
      label: project.name,
      detail:
        project.status +
        " · " +
        project.readiness +
        " · " +
        project.sources.length +
        " source(s)",
      at: project.updatedAt,
      href: "/collection-projects"
    }));

  const eventRecent: CommandCenterRecentWorkItem[] = latestEvents.map(
    (event, index) => ({
      id:
        event.kind.toLowerCase() +
        ":" +
        event.workspaceName +
        ":" +
        event.at.toISOString() +
        ":" +
        index,
      kind: event.kind,
      workspaceName: event.workspaceName,
      label: event.label,
      detail:
        event.kind === "Remote"
          ? "Remote execution evidence"
          : "Integration delivery evidence",
      at: event.at,
      href: event.kind === "Remote" ? "/remote-execution" : "/integration-delivery"
    })
  );

  const recentWork = [...eventRecent, ...projectRecent]
    .sort((left, right) => right.at.getTime() - left.at.getTime())
    .slice(0, 8);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      workspaces: sources.adoption.totals.workspaces,
      activeWorkspaces: sources.adoption.totals.activeWorkspaces,
      attentionWorkspaces: attentionWorkspaces.length,
      activityEvents: workspaces.reduce(
        (sum, workspace) => sum + workspace.activityEvents,
        0
      ),
      sync: workspaces.reduce(
        (sum, workspace) => sum + workspace.activity.sync,
        0
      ),
      barcodeCaptures: workspaces.reduce(
        (sum, workspace) => sum + workspace.activity.barcodeCaptures,
        0
      ),
      scheduledAttempts: workspaces.reduce(
        (sum, workspace) => sum + workspace.activity.scheduledAttempts,
        0
      ),
      remoteRuns: workspaces.reduce(
        (sum, workspace) => sum + workspace.activity.remoteRuns,
        0
      ),
      integrationEvents: workspaces.reduce(
        (sum, workspace) => sum + workspace.activity.integrationEvents,
        0
      ),
      measuredBytes: workspaces.reduce(
        (sum, workspace) => sum + workspace.measuredBytes,
        0
      )
    },
    workspaces,
    latestEvents,
    dashboard: {
      overallHealth,
      attentionQueue,
      healthSignals,
      quickActions: QUICK_ACTIONS,
      recentWork,
      collection: {
        projects: collectionProjects.length,
        activeProjects: activeProjects.length,
        readyProjects: readyProjects.length,
        blockedProjects: blockedProjects.length,
        incompleteProjects: incompleteProjects.length,
        blockedSources
      },
      corrective: {
        cycles: corrective.summary.cycles,
        activeCycles: corrective.summary.activeCycles,
        criticalViolations: corrective.summary.criticalViolations,
        warnings: corrective.summary.warnings
      }
    }
  };
}

export async function buildCommandCenterHome(userId: string) {
  const [
    adoption,
    remote,
    retention,
    delivery,
    collectionProjects,
    corrective
  ] = await Promise.all([
    buildAdoptionReview(userId),
    listRemotePilotOverviewForUser(userId),
    listRetentionOverviewForUser(userId),
    listIntegrationDeliveryOverviewForUser(userId),
    listCollectionProjectsForUser(userId),
    listCorrectiveGenerationStateMachineForUser(userId)
  ]);

  return buildCommandCenterSummary({
    adoption,
    remote,
    retention,
    delivery,
    collectionProjects,
    corrective
  });
}
