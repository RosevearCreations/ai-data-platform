import type { Build390ThemeAdoptionCertification } from "./master-theme-adoption-certification";

export const BUILD_391 = 391 as const;
export const BUILD_391_SCHEMA =
  "rosevear.ai-data-platform.master-theme-drift-governance-closure.v1" as const;
export const BUILD_391_THEME_VERSION = "rosevear-master-instrument.v1" as const;

export type Build391ShellId =
  | "ai-data-platform"
  | "rosevear-comms-hub"
  | "rosevear-ai-hub"
  | "yw"
  | "icamp";

export type Build391ThemeObservation = {
  observationId: string;
  shellId: Build391ShellId;
  observedAt: string;
  themeVersion: string;
  navigationAccepted: boolean;
  instrumentKpisAccepted: boolean;
  semanticStatusesAccepted: boolean;
  authorityBoundaryPreserved: boolean;
  independentlyObserved: boolean;
};

export type Build391ResponsiveObservation = {
  observationId: string;
  shellId: "yw" | "icamp";
  observedAt: string;
  desktopAccepted: boolean;
  tabletAccepted: boolean;
  mobileAccepted: boolean;
};

export type Build391ClosureReview = {
  aiDataPlatformAcknowledged: boolean;
  commsHubAcknowledged: boolean;
  aiHubAcknowledged: boolean;
  ownerAccepted: boolean;
  independentlyVerified: boolean;
};

const REQUIRED_SHELLS: readonly Build391ShellId[] = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
];

export function assessBuild391ThemeDriftGovernance(input: {
  build390: Build390ThemeAdoptionCertification;
  themeObservations?: readonly Build391ThemeObservation[];
  responsiveObservations?: readonly Build391ResponsiveObservation[];
  closureReview?: Build391ClosureReview | null;
}) {
  const observations = [...(input.themeObservations ?? [])];
  const responsive = [...(input.responsiveObservations ?? [])];
  const latestByShell = new Map<Build391ShellId, Build391ThemeObservation>();

  for (const observation of observations.sort((a,b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    if (!latestByShell.has(observation.shellId)) {
      latestByShell.set(observation.shellId, observation);
    }
  }

  const missingShells = REQUIRED_SHELLS.filter(
    (shellId) => !latestByShell.has(shellId)
  );

  const driftedShells = REQUIRED_SHELLS.filter((shellId) => {
    const item = latestByShell.get(shellId);
    if (!item) return false;
    return (
      item.themeVersion !== BUILD_391_THEME_VERSION ||
      !item.navigationAccepted ||
      !item.instrumentKpisAccepted ||
      !item.semanticStatusesAccepted ||
      !item.authorityBoundaryPreserved ||
      !item.independentlyObserved
    );
  });

  const latestResponsive = new Map<"yw" | "icamp", Build391ResponsiveObservation>();
  for (const observation of responsive.sort((a,b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    if (!latestResponsive.has(observation.shellId)) {
      latestResponsive.set(observation.shellId, observation);
    }
  }

  const responsiveEvidenceComplete =
    latestResponsive.has("yw") && latestResponsive.has("icamp");

  const responsiveRegressionShells = (["yw","icamp"] as const).filter(
    (shellId) => {
      const item = latestResponsive.get(shellId);
      return Boolean(
        item &&
        (!item.desktopAccepted || !item.tabletAccepted || !item.mobileAccepted)
      );
    }
  );

  const yw = latestResponsive.get("yw");
  const icamp = latestResponsive.get("icamp");
  const ywIcampResponsiveParity =
    Boolean(yw && icamp) &&
    yw!.desktopAccepted === icamp!.desktopAccepted &&
    yw!.tabletAccepted === icamp!.tabletAccepted &&
    yw!.mobileAccepted === icamp!.mobileAccepted &&
    responsiveRegressionShells.length === 0;

  const closure = input.closureReview ?? null;
  const closureEvidenceComplete =
    Boolean(closure) &&
    closure!.aiDataPlatformAcknowledged &&
    closure!.commsHubAcknowledged &&
    closure!.aiHubAcknowledged &&
    closure!.ownerAccepted &&
    closure!.independentlyVerified;

  const build390Certified = input.build390.certificationState === "CERTIFIED";

  const governanceState =
    !build390Certified
      ? ("HOLD_BUILD390_NOT_CERTIFIED" as const)
      : missingShells.length > 0
        ? ("OBSERVATION_EVIDENCE_INCOMPLETE" as const)
        : driftedShells.length > 0
          ? ("THEME_DRIFT_DETECTED" as const)
          : !responsiveEvidenceComplete
            ? ("RESPONSIVE_EVIDENCE_INCOMPLETE" as const)
            : responsiveRegressionShells.length > 0 || !ywIcampResponsiveParity
              ? ("RESPONSIVE_PARITY_REGRESSION" as const)
              : !closureEvidenceComplete
                ? ("CLOSURE_EVIDENCE_REQUIRED" as const)
                : ("VISUAL_GOVERNANCE_CLOSED_VERIFIED" as const);

  return {
    schema: BUILD_391_SCHEMA,
    build: BUILD_391,
    themeVersion: BUILD_391_THEME_VERSION,
    build390Certified,
    missingShells,
    driftedShells,
    responsiveEvidenceComplete,
    responsiveRegressionShells,
    ywIcampResponsiveParity,
    closureEvidenceComplete,
    governanceState,
    blockers: [
      ...(!build390Certified
        ? ["Build 390 theme adoption certification must be CERTIFIED before drift closure."]
        : []),
      ...(missingShells.length
        ? ["Missing current theme observations for: " + missingShells.join(", ")]
        : []),
      ...(driftedShells.length
        ? ["Theme drift detected for: " + driftedShells.join(", ")]
        : []),
      ...(!responsiveEvidenceComplete
        ? ["Current YW and iCamp desktop/tablet/mobile observations are both required."]
        : []),
      ...(responsiveRegressionShells.length
        ? ["Responsive regression detected for: " + responsiveRegressionShells.join(", ")]
        : []),
      ...(responsiveEvidenceComplete && !ywIcampResponsiveParity
        ? ["YW/iCamp responsive parity does not match the certified baseline."]
        : []),
      ...(!closureEvidenceComplete &&
        driftedShells.length === 0 &&
        responsiveEvidenceComplete &&
        responsiveRegressionShells.length === 0
        ? ["Visual-governance closure requires three-Master acknowledgement, owner acceptance and independent verification."]
        : [])
    ],
    policy: {
      allFiveCurrentThemeObservationsRequired: true,
      independentlyObservedThemeStateRequired: true,
      ywIcampDesktopTabletMobileParityRequired: true,
      allThreeMastersRequiredForClosure: true,
      ownerAcceptanceRequiredForClosure: true,
      independentClosureVerificationRequired: true,
      deploymentGreenCannotCloseVisualGovernance: true
    }
  };
}

export type Build391ThemeDriftGovernance = ReturnType<
  typeof assessBuild391ThemeDriftGovernance
>;
