export const BUILD_390 = 390 as const;
export const BUILD_390_SCHEMA =
  "rosevear.ai-data-platform.master-theme-adoption-parity-certification.v1" as const;
export const BUILD_390_THEME_VERSION = "rosevear-master-instrument.v1" as const;

export type ThemeAdoptionReceipt = {
  shellId: "ai-data-platform" | "rosevear-comms-hub" | "rosevear-ai-hub" | "yw" | "icamp";
  themeVersion: string;
  navigationAccepted: boolean;
  instrumentKpisAccepted: boolean;
  semanticStatusesAccepted: boolean;
  desktopAccepted: boolean;
  tabletAccepted: boolean;
  mobileAccepted: boolean;
  authorityBoundaryPreserved: boolean;
  independentlyVerified: boolean;
};

export function certifyBuild390ThemeAdoption(
  receipts: readonly ThemeAdoptionReceipt[]
) {
  const requiredShells = [
    "ai-data-platform",
    "rosevear-comms-hub",
    "rosevear-ai-hub",
    "yw",
    "icamp"
  ] as const;

  const byShell = new Map(receipts.map((receipt) => [receipt.shellId, receipt]));
  const missingShells = requiredShells.filter((shellId) => !byShell.has(shellId));

  const accepted = receipts.filter(
    (receipt) =>
      receipt.themeVersion === BUILD_390_THEME_VERSION &&
      receipt.navigationAccepted &&
      receipt.instrumentKpisAccepted &&
      receipt.semanticStatusesAccepted &&
      receipt.desktopAccepted &&
      receipt.tabletAccepted &&
      receipt.mobileAccepted &&
      receipt.authorityBoundaryPreserved &&
      receipt.independentlyVerified
  );

  const yw = byShell.get("yw");
  const icamp = byShell.get("icamp");
  const visualParityCertified =
    Boolean(yw && icamp) &&
    yw!.themeVersion === icamp!.themeVersion &&
    yw!.navigationAccepted &&
    icamp!.navigationAccepted &&
    yw!.instrumentKpisAccepted &&
    icamp!.instrumentKpisAccepted &&
    yw!.semanticStatusesAccepted &&
    icamp!.semanticStatusesAccepted &&
    yw!.desktopAccepted &&
    icamp!.desktopAccepted &&
    yw!.tabletAccepted &&
    icamp!.tabletAccepted &&
    yw!.mobileAccepted &&
    icamp!.mobileAccepted &&
    yw!.authorityBoundaryPreserved &&
    icamp!.authorityBoundaryPreserved &&
    yw!.independentlyVerified &&
    icamp!.independentlyVerified;

  const allAccepted =
    missingShells.length === 0 &&
    accepted.length === requiredShells.length &&
    visualParityCertified;

  return {
    schema: BUILD_390_SCHEMA,
    build: BUILD_390,
    themeVersion: BUILD_390_THEME_VERSION,
    requiredShells,
    receiptsReviewed: receipts.length,
    acceptedShells: accepted.map((receipt) => receipt.shellId),
    missingShells,
    masterNavigationAccepted:
      ["ai-data-platform", "rosevear-comms-hub", "rosevear-ai-hub"].every((id) =>
        accepted.some((receipt) => receipt.shellId === id)
      ),
    visualParityCertified,
    certificationState: allAccepted
      ? ("CERTIFIED" as const)
      : ("HOLD" as const),
    blockers: [
      ...(missingShells.length
        ? ["Missing theme adoption receipts for: " + missingShells.join(", ")]
        : []),
      ...(!visualParityCertified
        ? ["YW/iCamp visual parity is not independently certified across desktop, tablet and mobile."]
        : []),
      ...(accepted.length !== receipts.length
        ? ["One or more supplied theme receipts fail the shared instrument acceptance contract."]
        : [])
    ],
    policy: {
      allFiveShellReceiptsRequired: true,
      independentVerificationRequired: true,
      masterNavigationAcceptanceRequired: true,
      ywIcampVisualParityRequired: true,
      responsiveParityRequired: true,
      authorityBoundaryPreservationRequired: true,
      deploymentGreenCannotFabricateAcceptance: true
    }
  };
}

export type Build390ThemeAdoptionCertification = ReturnType<
  typeof certifyBuild390ThemeAdoption
>;
