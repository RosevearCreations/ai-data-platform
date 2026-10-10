import {
  buildConnectorGrantOutcome,
  buildPermissionOutcome,
  buildProfileCapabilityOutcome
} from "../lib/adoption";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const capability = buildProfileCapabilityOutcome(
  {
    history: true,
    sourcePolicy: true,
    scheduledJobs: true,
    remoteExecution: true,
    barcodeIntake: false,
    businessIntegrations: true
  },
  {
    syncActivity: 3,
    sourcePolicySources: 1,
    scheduledJobs: 0,
    scheduledAttempts: 0,
    remoteJobs: 2,
    remoteRuns: 1,
    barcodeCaptures: 4,
    integrationEvents: 2
  }
);

assert(
  capability.used.join(",") ===
    "history,sourcePolicy,remoteExecution,businessIntegrations",
  "Build 035 did not classify enabled capability usage correctly."
);
assert(
  capability.highRiskUnused.join(",") === "scheduledJobs",
  "Build 035 did not classify high-risk unused capability slots correctly."
);
assert(
  capability.disabledUsed.join(",") === "barcodeIntake",
  "Build 035 must surface observed use that conflicts with a disabled profile capability."
);

const now = Date.parse("2026-10-10T12:00:00.000Z");
const connector = buildConnectorGrantOutcome(
  [
    {
      connectorKey: "fixture",
      enabled: true,
      grantedCapabilities: ["import", "export"],
      updatedAt: new Date("2026-08-01T12:00:00.000Z")
    }
  ],
  [
    {
      connectorKey: "fixture",
      capability: "import",
      status: "succeeded",
      createdAt: new Date("2026-10-09T12:00:00.000Z")
    },
    {
      connectorKey: "fixture",
      capability: "enrichment",
      status: "blocked",
      createdAt: new Date("2026-10-09T12:00:00.000Z")
    }
  ],
  now
);

assert(connector.grants.length === 2, "Connector grant count is incorrect.");
assert(
  connector.usedGrants.join(",") === "fixture:import",
  "Successful/failed connector execution must count as durable grant use."
);
assert(
  connector.unusedGrants.join(",") === "fixture:export" &&
    connector.staleUnusedGrants.join(",") === "fixture:export",
  "Unused old connector grants must become least-privilege review candidates."
);
assert(
  connector.blockedAttempts === 1,
  "Blocked connector attempts must remain visible without being counted as used grants."
);

const permission = buildPermissionOutcome({
  owners: 1,
  admins: 0,
  members: 0,
  highRiskUnusedCapabilities: 1,
  connectorUnusedGrants: 1,
  disabledUsedCapabilities: 0
});
assert(
  permission.status === "watch" && permission.recommendations.length >= 2,
  "Build 035 least-privilege review must recommend manual review without changing permissions."
);

const mismatch = buildPermissionOutcome({
  owners: 1,
  admins: 0,
  members: 0,
  highRiskUnusedCapabilities: 0,
  connectorUnusedGrants: 0,
  disabledUsedCapabilities: 1
});
assert(
  mismatch.status === "action",
  "Observed activity on a disabled profile capability must require action."
);

console.log(
  "Build 035 capability adoption, connector grant use/staleness and least-privilege recommendation logic passed."
);
