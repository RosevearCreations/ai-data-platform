import type { ProductionLearningEvidence, ProductionLearningWorkspaceEvidence } from "./production-learning";

export type CapacityScenarioId = "baseline" | "growth" | "high-growth";

export type CapacityScenario = {
  id: CapacityScenarioId;
  label: string;
  multiplier: number;
  description: string;
};

export type CapacityMetric = {
  key: "storage" | "records" | "provider-units" | "collection-frequency" | "integration-volume" | "retention";
  label: string;
  current: number;
  forecast: number;
  unit: "bytes" | "records" | "units" | "attempts" | "events";
  detail: string;
  sourceHref: string;
};

export type WorkspaceCapacityPlan = {
  workspaceId: string;
  workspaceName: string;
  role: "owner" | "admin" | "member";
  metrics: CapacityMetric[];
};

export type CapacityPlanningModel = {
  schema: "ai-data-platform.capacity-planning.v1";
  generatedAt: string;
  scenario: CapacityScenario;
  scenarios: CapacityScenario[];
  workspaces: WorkspaceCapacityPlan[];
  totals: {
    storageBytes: number;
    recordVolume: number;
    providerUnits: number;
    collectionAttempts: number;
    integrationEvents: number;
    retentionRows: number;
  };
  forecastTotals: {
    storageBytes: number;
    recordVolume: number;
    providerUnits: number;
    collectionAttempts: number;
    integrationEvents: number;
    retentionRows: number;
  };
  billingBoundary: {
    actualBillingImported: false;
    currencyPricingApplied: false;
    estimatesAreOperationalProxies: true;
  };
};

export const CAPACITY_SCENARIOS: CapacityScenario[] = [
  {
    id: "baseline",
    label: "Current pace",
    multiplier: 1,
    description: "Projects current measured usage forward without adding growth."
  },
  {
    id: "growth",
    label: "Moderate growth",
    multiplier: 1.5,
    description: "Plans for approximately 50% more measured operational usage."
  },
  {
    id: "high-growth",
    label: "High growth",
    multiplier: 2,
    description: "Plans for approximately double the current measured operational usage."
  }
];

function roundForecast(value: number, multiplier: number) {
  return Math.ceil(Math.max(0, value) * multiplier);
}

function workspaceCurrent(workspace: ProductionLearningWorkspaceEvidence) {
  const storageBytes =
    workspace.sync.storageBytes +
    workspace.outcomes.storageBytes +
    workspace.intelligence.storageBytes +
    workspace.integrations.storageBytes +
    workspace.barcode.storageBytes +
    workspace.remote.storageBytes +
    workspace.connectors.storageBytes;

  const recordVolume =
    workspace.sync.activeScrapers +
    workspace.sync.reviewedDatasets +
    workspace.sync.reviewedRows +
    workspace.barcode.captures +
    workspace.remote.jobs +
    workspace.connectors.installations;

  const collectionAttempts =
    workspace.intelligence.scheduled.attempts +
    workspace.outcomes.sync.events +
    workspace.remote.providerRuns;

  const integrationEvents =
    workspace.integrations.deliveryAttempts +
    workspace.integrations.handshakeAccepted +
    workspace.integrations.handshakeRejected +
    workspace.integrations.deliveryRejected +
    workspace.integrations.transportErrors;

  const retentionRows =
    workspace.retention.archiveEligibleRows +
    workspace.retention.deleteEligibleRows;

  return {
    storageBytes,
    recordVolume,
    providerUnits: workspace.remote.providerUnits,
    collectionAttempts,
    integrationEvents,
    retentionRows
  };
}

export function buildCapacityPlanningModel(
  evidence: ProductionLearningEvidence,
  requestedScenario: string | undefined
): CapacityPlanningModel {
  const scenario =
    CAPACITY_SCENARIOS.find((item) => item.id === requestedScenario) ??
    CAPACITY_SCENARIOS[0];

  const workspaces = evidence.workspaces.map((workspace) => {
    const current = workspaceCurrent(workspace);
    const metrics: CapacityMetric[] = [
      {
        key: "storage",
        label: "Measured storage footprint",
        current: current.storageBytes,
        forecast: roundForecast(current.storageBytes, scenario.multiplier),
        unit: "bytes",
        detail: "Measured durable payload and evidence bytes already recorded across governed workspace systems.",
        sourceHref: "/production-learning"
      },
      {
        key: "records",
        label: "Operational record volume",
        current: current.recordVolume,
        forecast: roundForecast(current.recordVolume, scenario.multiplier),
        unit: "records",
        detail: "Planning proxy from reviewed rows, active assets, captures, remote jobs and connector installations.",
        sourceHref: "/data-library"
      },
      {
        key: "provider-units",
        label: "Provider units",
        current: current.providerUnits,
        forecast: roundForecast(current.providerUnits, scenario.multiplier),
        unit: "units",
        detail: "Existing remote-provider units; this remains a usage proxy and is not converted into currency billing.",
        sourceHref: "/remote-execution"
      },
      {
        key: "collection-frequency",
        label: "Collection frequency",
        current: current.collectionAttempts,
        forecast: roundForecast(current.collectionAttempts, scenario.multiplier),
        unit: "attempts",
        detail: "Planning proxy from scheduled attempts, sync activity and measured remote-provider runs.",
        sourceHref: "/collection-runs"
      },
      {
        key: "integration-volume",
        label: "Integration volume",
        current: current.integrationEvents,
        forecast: roundForecast(current.integrationEvents, scenario.multiplier),
        unit: "events",
        detail: "Measured delivery, handshake, rejection and transport-error evidence used as an integration-volume proxy.",
        sourceHref: "/integration-delivery"
      },
      {
        key: "retention",
        label: "Retention workload",
        current: current.retentionRows,
        forecast: roundForecast(current.retentionRows, scenario.multiplier),
        unit: "records",
        detail: "Archive-eligible and delete-eligible rows used to plan retention workload, not to authorize cleanup.",
        sourceHref: "/retention"
      }
    ];

    return {
      workspaceId: workspace.workspaceId,
      workspaceName: workspace.workspaceName,
      role: workspace.role,
      metrics
    };
  });

  const totals = workspaces.reduce(
    (sum, workspace) => {
      for (const metric of workspace.metrics) {
        if (metric.key === "storage") sum.storageBytes += metric.current;
        if (metric.key === "records") sum.recordVolume += metric.current;
        if (metric.key === "provider-units") sum.providerUnits += metric.current;
        if (metric.key === "collection-frequency") sum.collectionAttempts += metric.current;
        if (metric.key === "integration-volume") sum.integrationEvents += metric.current;
        if (metric.key === "retention") sum.retentionRows += metric.current;
      }
      return sum;
    },
    {
      storageBytes: 0,
      recordVolume: 0,
      providerUnits: 0,
      collectionAttempts: 0,
      integrationEvents: 0,
      retentionRows: 0
    }
  );

  return {
    schema: "ai-data-platform.capacity-planning.v1",
    generatedAt: evidence.generatedAt,
    scenario,
    scenarios: CAPACITY_SCENARIOS,
    workspaces,
    totals,
    forecastTotals: {
      storageBytes: roundForecast(totals.storageBytes, scenario.multiplier),
      recordVolume: roundForecast(totals.recordVolume, scenario.multiplier),
      providerUnits: roundForecast(totals.providerUnits, scenario.multiplier),
      collectionAttempts: roundForecast(totals.collectionAttempts, scenario.multiplier),
      integrationEvents: roundForecast(totals.integrationEvents, scenario.multiplier),
      retentionRows: roundForecast(totals.retentionRows, scenario.multiplier)
    },
    billingBoundary: {
      actualBillingImported: false,
      currencyPricingApplied: false,
      estimatesAreOperationalProxies: true
    }
  };
}
