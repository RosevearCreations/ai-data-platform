import type {
  Build391ShellId,
  Build391ThemeDriftGovernance
} from "./master-theme-drift-governance";

export const BUILD_392 = 392 as const;
export const BUILD_392_SCHEMA =
  "rosevear.ai-data-platform.visual-governance-remediation-recertification.v1" as const;
export const BUILD_392_THEME_VERSION = "rosevear-master-instrument.v1" as const;

export type Build392ExceptionSource =
  | "THEME_DRIFT"
  | "RESPONSIVE_PARITY_REGRESSION";

export type Build392VisualGovernanceException = {
  exceptionId: string;
  shellId: Build391ShellId;
  source: Build392ExceptionSource;
  detectedAt: string;
  dueAt: string;
  ownerAssigned: boolean;
  routingState: "ROUTED" | "HOLD";
  remediationState: "OPEN" | "IN_REMEDIATION" | "RESOLVED";
};

export type Build392RecertificationAudit = {
  auditId: string;
  exceptionId: string;
  shellId: Build391ShellId;
  observedAt: string;
  themeVersion: string;
  themeContractRestored: boolean;
  responsiveParityRestored: boolean;
  ownerAccepted: boolean;
  independentlyVerified: boolean;
  recertificationState: "RECERTIFIED" | "HOLD" | "REJECTED";
};

function uniqueShells(values: readonly Build391ShellId[]) {
  return [...new Set(values)];
}

export function assessBuild392VisualGovernanceRemediation(input: {
  build391: Build391ThemeDriftGovernance;
  exceptions?: readonly Build392VisualGovernanceException[];
  recertificationAudits?: readonly Build392RecertificationAudit[];
  now: string;
}) {
  const detectedShells = uniqueShells([
    ...input.build391.driftedShells,
    ...input.build391.responsiveRegressionShells
  ]);

  const build391EvidenceUsable =
    input.build391.governanceState === "THEME_DRIFT_DETECTED" ||
    input.build391.governanceState === "RESPONSIVE_PARITY_REGRESSION" ||
    input.build391.governanceState === "VISUAL_GOVERNANCE_CLOSED_VERIFIED";

  const latestExceptionByShell = new Map<
    Build391ShellId,
    Build392VisualGovernanceException
  >();
  for (const exception of [...(input.exceptions ?? [])].sort((a, b) =>
    b.detectedAt.localeCompare(a.detectedAt)
  )) {
    if (!latestExceptionByShell.has(exception.shellId)) {
      latestExceptionByShell.set(exception.shellId, exception);
    }
  }

  const missingRoutedShells = detectedShells.filter((shellId) => {
    const exception = latestExceptionByShell.get(shellId);
    return !exception || exception.routingState !== "ROUTED" || !exception.ownerAssigned;
  });

  const activeExceptions = detectedShells
    .map((shellId) => latestExceptionByShell.get(shellId))
    .filter(
      (item): item is Build392VisualGovernanceException => Boolean(item)
    );

  const overdueShells = activeExceptions
    .filter(
      (item) =>
        item.routingState === "ROUTED" &&
        item.remediationState !== "RESOLVED" &&
        item.dueAt.localeCompare(input.now) < 0
    )
    .map((item) => item.shellId);

  const remediationInProgressShells = activeExceptions
    .filter((item) => item.remediationState !== "RESOLVED")
    .map((item) => item.shellId);

  const latestAuditByException = new Map<string, Build392RecertificationAudit>();
  for (const audit of [...(input.recertificationAudits ?? [])].sort((a, b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    if (!latestAuditByException.has(audit.exceptionId)) {
      latestAuditByException.set(audit.exceptionId, audit);
    }
  }

  const recertificationRequiredShells = activeExceptions
    .filter((exception) => {
      if (exception.remediationState !== "RESOLVED") return false;
      const audit = latestAuditByException.get(exception.exceptionId);
      return !(
        audit &&
        audit.shellId === exception.shellId &&
        audit.observedAt.localeCompare(exception.detectedAt) >= 0 &&
        audit.themeVersion === BUILD_392_THEME_VERSION &&
        audit.themeContractRestored &&
        audit.responsiveParityRestored &&
        audit.ownerAccepted &&
        audit.independentlyVerified &&
        audit.recertificationState === "RECERTIFIED"
      );
    })
    .map((exception) => exception.shellId);

  const governanceState =
    !build391EvidenceUsable
      ? ("HOLD_BUILD391_EVIDENCE_INCOMPLETE" as const)
      : detectedShells.length === 0
        ? ("VISUAL_GOVERNANCE_STABLE" as const)
        : missingRoutedShells.length > 0
          ? ("EXCEPTION_ROUTING_REQUIRED" as const)
          : overdueShells.length > 0
            ? ("REMEDIATION_SLA_BREACH" as const)
            : remediationInProgressShells.length > 0
              ? ("REMEDIATION_IN_PROGRESS" as const)
              : recertificationRequiredShells.length > 0
                ? ("RECERTIFICATION_REQUIRED" as const)
                : ("VISUAL_GOVERNANCE_RECERTIFIED" as const);

  return {
    schema: BUILD_392_SCHEMA,
    build: BUILD_392,
    themeVersion: BUILD_392_THEME_VERSION,
    build391EvidenceUsable,
    detectedShells,
    missingRoutedShells,
    overdueShells,
    remediationInProgressShells,
    recertificationRequiredShells,
    governanceState,
    blockers: [
      ...(!build391EvidenceUsable
        ? ["Build 391 must provide current drift/parity evidence before Build 392 can route remediation."]
        : []),
      ...(missingRoutedShells.length
        ? ["Owner-routed visual exceptions required for: " + missingRoutedShells.join(", ")]
        : []),
      ...(overdueShells.length
        ? ["Visual remediation SLA breached for: " + overdueShells.join(", ")]
        : []),
      ...(remediationInProgressShells.length && overdueShells.length === 0
        ? ["Visual remediation remains open for: " + remediationInProgressShells.join(", ")]
        : []),
      ...(recertificationRequiredShells.length
        ? ["Independent owner-accepted re-certification required for: " + recertificationRequiredShells.join(", ")]
        : [])
    ],
    policy: {
      everyDetectedShellRequiresOwnerRouting: true,
      remediationSlaMustRemainCurrent: true,
      resolvedExceptionsRequireFreshRecertification: true,
      recertificationMustUseCurrentThemeVersion: true,
      ownerAcceptanceRequired: true,
      independentVerificationRequired: true,
      deploymentGreenCannotResolveVisualException: true
    }
  };
}

export type Build392VisualGovernanceRemediation = ReturnType<
  typeof assessBuild392VisualGovernanceRemediation
>;
