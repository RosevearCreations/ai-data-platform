export const PROFILE_CAPABILITY_KEYS = [
  "history",
  "sourcePolicy",
  "scheduledJobs",
  "remoteExecution",
  "barcodeIntake",
  "businessIntegrations"
] as const;

export type ProfileCapabilityKey = (typeof PROFILE_CAPABILITY_KEYS)[number];

export const HIGH_RISK_CAPABILITIES = new Set<ProfileCapabilityKey>([
  "scheduledJobs",
  "remoteExecution",
  "barcodeIntake",
  "businessIntegrations"
]);

export interface CapabilityUsageInput {
  syncActivity: number;
  sourcePolicySources: number;
  scheduledJobs: number;
  scheduledAttempts: number;
  remoteJobs: number;
  remoteRuns: number;
  barcodeCaptures: number;
  integrationEvents: number;
}

export interface ConnectorInstallationEvidence {
  connectorKey: string;
  enabled: boolean;
  grantedCapabilities: string[];
  updatedAt: Date;
}

export interface ConnectorAuditEvidence {
  connectorKey: string;
  capability: string;
  status: "succeeded" | "failed" | "blocked";
  createdAt: Date;
}

function normalizedCount(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function buildProfileCapabilityOutcome(
  capabilities: Record<string, boolean>,
  usage: CapabilityUsageInput
) {
  const enabled = PROFILE_CAPABILITY_KEYS.filter(
    (key) => capabilities[key] === true
  );
  const observed = new Set<ProfileCapabilityKey>();

  if (normalizedCount(usage.syncActivity) > 0) observed.add("history");
  if (normalizedCount(usage.sourcePolicySources) > 0) observed.add("sourcePolicy");
  if (
    normalizedCount(usage.scheduledJobs) > 0 ||
    normalizedCount(usage.scheduledAttempts) > 0
  ) {
    observed.add("scheduledJobs");
  }
  if (
    normalizedCount(usage.remoteJobs) > 0 ||
    normalizedCount(usage.remoteRuns) > 0
  ) {
    observed.add("remoteExecution");
  }
  if (normalizedCount(usage.barcodeCaptures) > 0) observed.add("barcodeIntake");
  if (normalizedCount(usage.integrationEvents) > 0) {
    observed.add("businessIntegrations");
  }

  const enabledSet = new Set(enabled);
  const used = PROFILE_CAPABILITY_KEYS.filter(
    (key) => enabledSet.has(key) && observed.has(key)
  );
  const unusedEnabled = enabled.filter((key) => !observed.has(key));
  const highRiskUnused = unusedEnabled.filter((key) =>
    HIGH_RISK_CAPABILITIES.has(key)
  );
  const disabledUsed = PROFILE_CAPABILITY_KEYS.filter(
    (key) => !enabledSet.has(key) && observed.has(key)
  );

  return {
    enabled,
    used,
    unusedEnabled,
    highRiskUnused,
    disabledUsed
  };
}

export function buildConnectorGrantOutcome(
  installations: ConnectorInstallationEvidence[],
  audit: ConnectorAuditEvidence[],
  now = Date.now()
) {
  const grants = new Set<string>();
  const used = new Set<string>();

  for (const installation of installations) {
    for (const capability of installation.grantedCapabilities) {
      grants.add(installation.connectorKey + ":" + capability);
    }
  }

  for (const entry of audit) {
    if (entry.status !== "succeeded" && entry.status !== "failed") continue;
    const key = entry.connectorKey + ":" + entry.capability;
    if (grants.has(key)) used.add(key);
  }

  const unused = [...grants].filter((key) => !used.has(key)).sort();
  const stale = unused.filter((key) => {
    const separator = key.indexOf(":");
    const connectorKey = separator >= 0 ? key.slice(0, separator) : key;
    const installation = installations.find(
      (item) => item.connectorKey === connectorKey
    );
    return Boolean(
      installation &&
        now - installation.updatedAt.getTime() >= 30 * 24 * 60 * 60 * 1000
    );
  });

  return {
    installations: installations.length,
    enabledInstallations: installations.filter((item) => item.enabled).length,
    grants: [...grants].sort(),
    usedGrants: [...used].sort(),
    unusedGrants: unused,
    staleUnusedGrants: stale,
    executions: audit.filter(
      (entry) => entry.status === "succeeded" || entry.status === "failed"
    ).length,
    blockedAttempts: audit.filter((entry) => entry.status === "blocked").length
  };
}

export type PermissionOutcomeStatus = "healthy" | "watch" | "action";

export function buildPermissionOutcome(input: {
  owners: number;
  admins: number;
  members: number;
  highRiskUnusedCapabilities: number;
  connectorUnusedGrants: number;
  disabledUsedCapabilities: number;
}) {
  const recommendations: string[] = [];

  if (input.owners === 0) {
    recommendations.push(
      "Assign an accountable owner before expanding automation or connector access."
    );
  }
  if (input.disabledUsedCapabilities > 0) {
    recommendations.push(
      "Investigate observed activity on profile capabilities that are currently disabled; reconcile the profile before further use."
    );
  }
  if (input.admins > Math.max(1, input.owners)) {
    recommendations.push(
      "Review whether every admin still requires elevated workspace privileges."
    );
  }
  if (input.highRiskUnusedCapabilities > 0) {
    recommendations.push(
      "Review unused scheduled/remote/barcode/integration capability slots and keep them disabled in future profiles unless there is demonstrated need."
    );
  }
  if (input.connectorUnusedGrants > 0) {
    recommendations.push(
      "Review unused connector grants and remove them manually if they are no longer required."
    );
  }
  if (!recommendations.length) {
    recommendations.push(
      "Current measured permissions are proportionate; continue periodic least-privilege review."
    );
  }

  const status: PermissionOutcomeStatus =
    input.owners === 0 || input.disabledUsedCapabilities > 0
      ? "action"
      : input.admins > Math.max(1, input.owners) ||
          input.highRiskUnusedCapabilities > 0 ||
          input.connectorUnusedGrants > 0
        ? "watch"
        : "healthy";

  return { status, recommendations };
}
