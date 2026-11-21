export const BUILD_388 = 388 as const;
export const MASTER_INSTRUMENT_THEME_VERSION = "rosevear-master-instrument.v1" as const;
export const SERVER_SHELL_ID = "rosevear-server-shell" as const;
export const SERVER_SHELL_PRIMARY_AUTOMATION_HOST =
  "rosevear-ai-hub-windows-server" as const;
export const SERVER_SHELL_THEME_PROFILES = [
  "instrument","nebula","meadow","high-contrast","copper","arctic",
  "solar","graphite","crimson","emerald","ultraviolet","steel",
  "aurora","amber-night","orchid","daylight"
] as const;

export const MASTER_INSTRUMENT_MODULES = [
  {
    id: "ai-data-platform",
    label: "Data & Intelligence",
    displayName: "AI Data Platform",
    href: "/master-shell-command-center",
    role: "Server Shell data, evidence, analytics, validation and readiness coordination",
    authorityBoundary: "Does not inherit message authority or local host authority",
    serverShellId: SERVER_SHELL_ID,
    independentlyDisableable: true,
    ownerSwitchRequired: true,
    primaryAutomationHostRole: SERVER_SHELL_PRIMARY_AUTOMATION_HOST,
    themeProfiles: SERVER_SHELL_THEME_PROFILES
  },
  {
    id: "rosevear-comms-hub",
    label: "Communications & Operations",
    displayName: "Rosevear Comms Hub",
    href: "/comms-complementary-plane",
    role: "Server Shell communications, incident, follow-up and operator control plane",
    authorityBoundary: "Remains the source of authority for communications and operator actions",
    serverShellId: SERVER_SHELL_ID,
    independentlyDisableable: true,
    ownerSwitchRequired: true,
    primaryAutomationHostRole: SERVER_SHELL_PRIMARY_AUTOMATION_HOST,
    themeProfiles: SERVER_SHELL_THEME_PROFILES
  },
  {
    id: "rosevear-ai-hub",
    label: "AI, Home & Automation",
    displayName: "Rosevear AI Hub",
    href: "/master-application-inventory",
    role: "Primary 24/7 Windows runtime for local AI, Home Assistant, MQTT, cameras and deterministic automation",
    authorityBoundary: "Remains independently authenticated and locally authoritative for physical-device automation",
    serverShellId: SERVER_SHELL_ID,
    independentlyDisableable: true,
    ownerSwitchRequired: true,
    primaryAutomationHostRole: SERVER_SHELL_PRIMARY_AUTOMATION_HOST,
    themeProfiles: SERVER_SHELL_THEME_PROFILES
  }
] as const;

export const MASTER_INSTRUMENT_CHILD_SHELLS = [
  {
    id: "yw",
    displayName: "Yard Workers",
    href: "/source-shell-onboarding",
    tenancyNote: "Product shell; child businesses remain tenants"
  },
  {
    id: "icamp",
    displayName: "iCamp",
    href: "/source-shell-onboarding",
    tenancyNote: "Product shell; campgrounds remain tenants"
  }
] as const;

const MASTER_INSTRUMENT_PREFIXES = [
  "/master-suite",
  "/master-sysop",
  "/master-shell",
  "/master-application-inventory",
  "/master-completion",
  "/master-security-certification",
  "/master-production-readiness",
  "/master-control-readiness-certification",
  "/master-activation-reconciliation",
  "/comms-complementary-plane",
  "/cross-application-control-center",
  "/cross-application-interaction-trace",
  "/module-health-intelligence",
  "/role-device-acceptance",
  "/acceptance-advancement",
  "/acceleration-closure",
  "/evidence-freshness",
  "/original-host-continuity",
  "/communications-delivery-operations",
  "/recovery-rollback-certification",
  "/performance-capacity-guardrails",
  "/accessibility-device-network-recertification",
  "/tenant-consent-capability-renewal",
  "/data-lifecycle-dlp-renewal",
  "/operator-production-ceremony",
  "/operational-maturity-closure",
  "/live-operational-evidence",
  "/live-runtime-operations",
  "/master-health",
  "/source-signer-activation",
  "/seven-source-health",
  "/sweep-challenge-reliability",
  "/genuine-signer-expansion",
  "/relationship-certification",
  "/source-onboarding-pilot",
  "/source-shell-onboarding",
  "/source-convergence",
  "/source-owner-review",
  "/source-trust-ledger",
  "/source-signer-enrollment",
  "/source-refresh-evidence",
  "/convergence-receipt-intake",
  "/adaptive-master-control",
  "/incident-runbook-recovery",
  "/capacity-workload-forecasting"
] as const;

export function isMasterInstrumentPath(pathname: string) {
  return MASTER_INSTRUMENT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

export type MasterThemeEvidence = {
  shellId: string;
  themeVersion: string;
  persistentNavigation: boolean;
  moduleRail: boolean;
  instrumentKpis: boolean;
  responsiveDesktop: boolean;
  responsiveTablet: boolean;
  responsiveMobile: boolean;
  semanticStatusColors: boolean;
  authorityBoundariesPreserved: boolean;
};

export function evaluateMasterThemeGovernance(
  evidence: readonly MasterThemeEvidence[]
) {
  const compliant = evidence.filter(
    (item) =>
      item.themeVersion === MASTER_INSTRUMENT_THEME_VERSION &&
      item.persistentNavigation &&
      item.moduleRail &&
      item.instrumentKpis &&
      item.responsiveDesktop &&
      item.responsiveTablet &&
      item.responsiveMobile &&
      item.semanticStatusColors &&
      item.authorityBoundariesPreserved
  );

  return {
    build: BUILD_388,
    themeVersion: MASTER_INSTRUMENT_THEME_VERSION,
    shellsReviewed: evidence.length,
    compliantShells: compliant.length,
    allCompliant: evidence.length > 0 && compliant.length === evidence.length,
    nonCompliantShellIds: evidence
      .filter((item) => !compliant.includes(item))
      .map((item) => item.shellId),
    policy: {
      sharedTokensRequired: true,
      sharedNavigationLanguageRequired: true,
      responsiveParityRequired: true,
      semanticStatusParityRequired: true,
      authorityBoundariesCannotBeMergedByTheme: true,
      childTenantsCannotBecomeMasterSources: true
    }
  };
}
