import {
  composeCommsComplementaryPlane,
  type CommsComplementaryPlaneModel
} from "./comms-complementary-plane";
import {
  listCommsComplementaryPlaneForUser
} from "./comms-complementary-plane-database";
import {
  listMasterApplicationInventoryForUser
} from "./master-application-inventory-database";
import {
  buildIntegrationHealthCommandCenter,
  type IntegrationHealthState
} from "./integration-health-command-center";

export const MASTER_SHELL_COMMAND_CENTER_BUILD = 340 as const;

export type MasterCommandAttentionState =
  | "critical"
  | "attention"
  | "held"
  | "unmeasured";

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 10000) / 100;
}

function applicationAttentionState(
  effectiveStatus: string,
  freshness: string
): "healthy" | MasterCommandAttentionState {
  if (
    effectiveStatus === "ERROR" ||
    effectiveStatus === "REVOKED" ||
    effectiveStatus === "DISCONNECTED" ||
    effectiveStatus === "DEGRADED"
  ) {
    return "critical";
  }
  if (effectiveStatus === "AUTHORIZATION_HELD") {
    return "held";
  }
  if (
    freshness === "STALE" ||
    effectiveStatus === "STALE" ||
    effectiveStatus === "UNKNOWN"
  ) {
    return "unmeasured";
  }
  if (
    effectiveStatus !== "CONNECTED"
  ) {
    return "attention";
  }
  return "healthy";
}

function rank(value: MasterCommandAttentionState) {
  return value === "critical"
    ? 4
    : value === "held"
      ? 3
      : value === "attention"
        ? 2
        : 1;
}

export function composeMasterShellCommandCenter(input: {
  inventory: Awaited<
    ReturnType<typeof listMasterApplicationInventoryForUser>
  >;
  integrationHealth: Awaited<
    ReturnType<typeof buildIntegrationHealthCommandCenter>
  >;
  commsPlane?: CommsComplementaryPlaneModel;
  now?: Date;
}) {
  const inventory = input.inventory;
  const integrationHealth = input.integrationHealth;
  const now = input.now ?? new Date();
  const commsPlane =
    input.commsPlane ?? composeCommsComplementaryPlane({ now });

  const applications = inventory.applications.map((app) => {
    const attentionState = applicationAttentionState(
      app.applicationState.effectiveStatus,
      app.applicationState.freshness
    );
    const appCompletion = app.masterCompletion?.completion ?? null;
    const appEvidenceCoverage =
      app.masterCompletion?.evidenceCoverage ?? null;

    return {
      sourceId: app.sourceId,
      displayName: app.displayName,
      shellId: app.shellId,
      repository: app.repository,
      shellBoundary: app.shellBoundary,
      effectiveStatus: app.applicationState.effectiveStatus,
      freshness: app.applicationState.freshness,
      attentionState,
      latestRelease: app.versionEvidence.latestRelease,
      modules: app.moduleSummary.modules,
      modulesFresh: app.moduleSummary.freshSourceReadiness,
      modulesStale: app.moduleSummary.staleSourceReadiness,
      modulesUnmeasured: app.moduleSummary.unmeasuredSourceReadiness,
      modulesWithApprovedCompletionScope:
        app.moduleSummary.withApprovedCompletionScope,
      modulesWithCalculableCompletion:
        app.moduleSummary.withCalculableCompletion,
      completion: appCompletion,
      evidenceCoverage: appEvidenceCoverage,
      completionState:
        app.masterCompletion?.evidenceState ?? "UNSCOPED",
      ownershipState: app.ownership.state,
      ownerRoles: app.ownership.rolesAllowed,
      capabilityDiscoveryState: app.capabilities.discoveryState,
      href: "/master-application-inventory"
    };
  });

  const sourceStateCounts = Object.fromEntries(
    [
      "UNKNOWN",
      "DISCOVERED",
      "CONFIGURED",
      "AUTHORIZATION_HELD",
      "TEST_VERIFIED",
      "CONNECTED",
      "STALE",
      "DEGRADED",
      "DISCONNECTED",
      "REVOKED",
      "ERROR"
    ].map((state) => [
      state,
      applications.filter((app) => app.effectiveStatus === state)
        .length
    ])
  ) as Record<string, number>;

  const sourceWideScopes = applications.filter(
    (app) => app.completion !== null
  );
  const sourceWideCalculable = applications.filter(
    (app) =>
      app.completion !== null &&
      app.completion.percent !== null
  );
  const allSixSourceWideCalculable =
    sourceWideCalculable.length === applications.length &&
    applications.length === 6;

  const portfolioNumerator = sourceWideCalculable.reduce(
    (sum, app) => sum + (app.completion?.numerator ?? 0),
    0
  );
  const portfolioDenominator = sourceWideCalculable.reduce(
    (sum, app) => sum + (app.completion?.denominator ?? 0),
    0
  );
  const portfolioCompletionPercent =
    allSixSourceWideCalculable
      ? percent(portfolioNumerator, portfolioDenominator)
      : null;

  const attentionQueue: Array<{
    id: string;
    area: "Applications" | "IT" | "Management" | "Comms";
    state: MasterCommandAttentionState;
    title: string;
    detail: string;
    href: string;
  }> = [];

  for (const app of applications) {
    if (app.attentionState !== "healthy") {
      attentionQueue.push({
        id: "application:" + app.sourceId,
        area: "Applications",
        state: app.attentionState,
        title: app.displayName + " · " + app.effectiveStatus,
        detail:
          "Source registry freshness is " +
          app.freshness +
          "; module inventory has " +
          app.modulesStale +
          " stale and " +
          app.modulesUnmeasured +
          " unmeasured readiness signal(s).",
        href: "/master-application-inventory"
      });
    }

    if (
      app.completionState === "EVIDENCE_INCOMPLETE" ||
      app.completionState === "UNSCOPED"
    ) {
      attentionQueue.push({
        id: "completion:" + app.sourceId,
        area: "Management",
        state: "unmeasured",
        title:
          app.displayName +
          (app.completionState === "UNSCOPED"
            ? " · completion scope not approved"
            : " · completion evidence incomplete"),
        detail:
          app.completionState === "UNSCOPED"
            ? "No approved source-wide Master Completion denominator exists."
            : "UNKNOWN or STALE required evidence prevents a calculable source-wide completion percentage.",
        href: "/master-completion"
      });
    }
  }

  for (const signal of integrationHealth.signals) {
    if (
      signal.state === "critical" ||
      signal.state === "attention"
    ) {
      attentionQueue.push({
        id: "it:" + signal.id,
        area: "IT",
        state:
          signal.state === "critical"
            ? "critical"
            : "attention",
        title: signal.label + " · " + signal.value,
        detail: signal.detail,
        href: signal.href
      });
    }
  }

  if (commsPlane.projectionState !== "AUTHORIZED_READ_ONLY") {
    attentionQueue.push({
      id: "comms:projection",
      area: "Comms",
      state:
        commsPlane.projectionState === "HOLD_INVALID"
          ? "critical"
          : "unmeasured",
      title:
        "Rosevear Comms Hub · " +
        commsPlane.projectionState,
      detail:
        commsPlane.projectionState === "STALE"
          ? "The last independently verified Comms projection has expired. Current incident and follow-up counts are unknown."
          : commsPlane.projectionState === "HOLD_INVALID"
            ? "Recorded Comms projection evidence failed validation and is held from the Master Shell read model."
            : "QL-392 production preview capability exists, but no independently verified Comms incident/follow-up projection is currently accepted.",
      href: "/comms-complementary-plane"
    });
  } else if (commsPlane.summary.attentionGroups > 0) {
    attentionQueue.push({
      id: "comms:attention",
      area: "Comms",
      state:
        commsPlane.summary.reviewNow > 0
          ? "critical"
          : "attention",
      title:
        "Rosevear Comms Hub · " +
        commsPlane.summary.attentionGroups +
        " evidence-aware group(s) need review",
      detail:
        "These are read-only Comms projections. AI Data Platform cannot acknowledge, route, assign, close or create communications work.",
      href: "/comms-complementary-plane"
    });
  }

  attentionQueue.sort(
    (a, b) =>
      rank(b.state) - rank(a.state) ||
      a.area.localeCompare(b.area) ||
      a.title.localeCompare(b.title)
  );

  const credentialCritical = integrationHealth.credentials.filter(
    (item) =>
      item.riskState === "expired" ||
      item.riskState === "revoked" ||
      item.riskState === "rotation-due"
  ).length;

  const security = {
    state:
      credentialCritical > 0 ||
      integrationHealth.summary.deliveryFailures24h > 0
        ? "critical"
        : integrationHealth.summary.staleCredentials > 0 ||
            integrationHealth.summary.webhookDenied24h > 0
          ? "attention"
          : "healthy",
    credentialReferences: integrationHealth.credentials.length,
    credentialReferencesNeedingAttention:
      integrationHealth.summary.staleCredentials,
    criticalCredentialReferences: credentialCritical,
    webhookDenied24h:
      integrationHealth.summary.webhookDenied24h,
    deliveryFailures24h:
      integrationHealth.summary.deliveryFailures24h,
    deadLetters: integrationHealth.queues.deadLetters,
    evidenceScope: integrationHealth.evidenceScope,
    credentialValuesRead: false,
    remoteAvailabilityInferred: false
  } as const;

  const it = {
    state: integrationHealth.summary.state,
    databaseLatencyMs:
      integrationHealth.summary.databaseLatencyMs,
    connectorAverageLatencyMs:
      integrationHealth.summary.connectorAverageLatencyMs,
    connectorMaxLatencyMs:
      integrationHealth.summary.connectorMaxLatencyMs,
    registeredPeers: integrationHealth.summary.registeredPeers,
    disconnectedPeers:
      integrationHealth.summary.disconnectedPeers,
    unmeasuredPeers: integrationHealth.summary.unmeasuredPeers,
    queuedEvents: integrationHealth.summary.queuedEvents,
    degradedServices:
      integrationHealth.summary.degradedServices,
    webhookEndpoints:
      integrationHealth.summary.webhookEndpoints,
    webhookDenied24h:
      integrationHealth.summary.webhookDenied24h,
    signals: integrationHealth.signals,
    security
  };

  const management = {
    applications: applications.length,
    connectedApplications:
      sourceStateCounts.CONNECTED ?? 0,
    applicationsRequiringAttention:
      applications.filter(
        (app) => app.attentionState !== "healthy"
      ).length,
    sourceWideCompletionScopes: sourceWideScopes.length,
    sourceWideCompletionCalculable:
      sourceWideCalculable.length,
    sourceWideCompletionCoveragePercent: percent(
      sourceWideScopes.length,
      applications.length
    ),
    sourceWideCalculableCoveragePercent: percent(
      sourceWideCalculable.length,
      applications.length
    ),
    portfolioCompletionPercent,
    portfolioCompletionNumerator:
      allSixSourceWideCalculable ? portfolioNumerator : null,
    portfolioCompletionDenominator:
      allSixSourceWideCalculable ? portfolioDenominator : null,
    portfolioCompletionBlocked:
      !allSixSourceWideCalculable,
    portfolioCompletionBlockReason:
      allSixSourceWideCalculable
        ? null
        : "All six applications require approved, calculable source-wide Master Completion scopes before a suite-wide percentage is shown.",
    attentionItems: attentionQueue.length,
    criticalAttentionItems: attentionQueue.filter(
      (item) => item.state === "critical"
    ).length,
    heldAttentionItems: attentionQueue.filter(
      (item) => item.state === "held"
    ).length,
    unmeasuredAttentionItems: attentionQueue.filter(
      (item) => item.state === "unmeasured"
    ).length
  };

  const statistics = {
    sourceStates: sourceStateCounts,
    sourceFreshness: {
      fresh:
        inventory.summary.applicationsWithFreshRegistryEvidence,
      stale:
        inventory.summary.applicationsWithStaleRegistryEvidence,
      unmeasured:
        inventory.summary
          .applicationsWithUnmeasuredRegistryEvidence,
      freshPercent: percent(
        inventory.summary.applicationsWithFreshRegistryEvidence,
        applications.length
      ),
      stalePercent: percent(
        inventory.summary.applicationsWithStaleRegistryEvidence,
        applications.length
      ),
      unmeasuredPercent: percent(
        inventory.summary
          .applicationsWithUnmeasuredRegistryEvidence,
        applications.length
      )
    },
    modules: {
      total: inventory.summary.modules,
      freshReadiness:
        inventory.summary.modulesWithFreshSourceReadiness,
      staleReadiness:
        inventory.summary.modulesWithStaleSourceReadiness,
      unmeasuredReadiness:
        inventory.summary.modulesWithUnmeasuredSourceReadiness,
      approvedCompletionScopes:
        inventory.summary.modulesWithApprovedCompletionScope,
      calculableCompletion:
        inventory.summary.modulesWithCalculableCompletion,
      freshReadinessPercent: percent(
        inventory.summary.modulesWithFreshSourceReadiness,
        inventory.summary.modules
      ),
      approvedCompletionScopePercent: percent(
        inventory.summary.modulesWithApprovedCompletionScope,
        inventory.summary.modules
      ),
      calculableCompletionPercent: percent(
        inventory.summary.modulesWithCalculableCompletion,
        inventory.summary.modules
      )
    },
    it: {
      degradedServices:
        integrationHealth.summary.degradedServices,
      queuedEvents: integrationHealth.summary.queuedEvents,
      deliveryFailures24h:
        integrationHealth.summary.deliveryFailures24h,
      webhookDenied24h:
        integrationHealth.summary.webhookDenied24h,
      staleCredentials:
        integrationHealth.summary.staleCredentials
    }
  };

  return {
    schema: "ai-data-platform.master-shell-command-center.v1",
    build: MASTER_SHELL_COMMAND_CENTER_BUILD,
    generatedAt: now.toISOString(),
    views: {
      applications,
      comms: commsPlane,
      it,
      management,
      statistics
    },
    attentionQueue,
    navigation: {
      applications: "/master-application-inventory",
      comms: "/comms-complementary-plane",
      it: "/integration-health",
      management: "/master-completion",
      statistics: "/master-shell-command-center#statistics"
    },
    policy: {
      readOnlyCommandCenter: true,
      exactSixApplications: applications.length === 6,
      sourceEvidencePreserved: true,
      masterCompletionPreserved: true,
      cataloguePresenceImpliesAcceptance: false,
      discoveryImpliesAuthorization: false,
      greenReleaseImpliesFunctionalAcceptance: false,
      sourceAcceptedImpliesMasterAcceptance: false,
      commsHubIsComplementaryPlane: true,
      commsHubApplicationCountContribution: 0,
      commsHubSourceCountContribution: 0,
      commsProjectionReadOnly: true,
      commsMessageAuthorityRetainedByCommsHub: true,
      commsIncidentAuthorityRetainedByCommsHub: true,
      commsFollowUpAuthorityRetainedByCommsHub: true,
      portfolioPercentageRequiresAllSixCalculable: true,
      missingEvidenceRemainsUnknownOrUnmeasured: true,
      externalHealthProbePerformed:
        integrationHealth.policy.externalHealthProbePerformed,
      remoteAvailabilityInferred:
        integrationHealth.policy.remoteAvailabilityInferred,
      credentialValuesRead:
        integrationHealth.policy.credentialValuesRead,
      automaticRecoveryTriggered:
        integrationHealth.policy.automaticRecoveryTriggered,
      automaticConnectionActivation:
        integrationHealth.policy.automaticConnectionActivation
    }
  };
}

export async function buildMasterShellCommandCenter(
  userId: string,
  now = new Date()
) {
  const [inventory, integrationHealth, commsPlane] = await Promise.all([
    listMasterApplicationInventoryForUser(userId, now),
    buildIntegrationHealthCommandCenter(userId),
    listCommsComplementaryPlaneForUser(userId, now)
  ]);
  return composeMasterShellCommandCenter({
    inventory,
    integrationHealth,
    commsPlane,
    now
  });
}

export type MasterShellCommandCenterModel =
  Awaited<ReturnType<typeof buildMasterShellCommandCenter>>;

export type MasterShellCommandCenterItState =
  IntegrationHealthState;
