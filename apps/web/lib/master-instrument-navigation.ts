export const BUILD_388 = 388 as const;
export const MASTER_INSTRUMENT_THEME_VERSION = "rosevear-master-instrument.v1" as const;

export const MASTER_INSTRUMENT_MODULES = [
  {
    id: "ai-data-platform",
    label: "Intelligence",
    displayName: "AI Data Platform",
    href: "/master-shell-command-center",
    role: "Master intelligence, evidence, analytics and readiness coordination",
    authorityBoundary: "Does not inherit message authority or local host authority"
  },
  {
    id: "rosevear-comms-hub",
    label: "Communications",
    displayName: "Rosevear Comms Hub",
    href: "/comms-complementary-plane",
    role: "Communications, incident, follow-up and operator control plane",
    authorityBoundary: "Remains the source of authority for communications and operator actions"
  },
  {
    id: "rosevear-ai-hub",
    label: "Runtime",
    displayName: "Rosevear AI Hub",
    href: "/master-application-inventory",
    role: "Original Windows local runtime, device and support host",
    authorityBoundary: "Remains independently authenticated and locally authoritative"
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
