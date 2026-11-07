import type { PeerApplicationId } from "./app-connection-registry";

export const INTEGRATION_CERTIFICATION_DIMENSIONS = [
  "authentication",
  "approved-exchange",
  "event-handling",
  "failure-recovery",
  "tenant-isolation"
] as const;

export type IntegrationCertificationDimension =
  (typeof INTEGRATION_CERTIFICATION_DIMENSIONS)[number];

export type IntegrationCertificationOutcome = "pass" | "fail" | "blocked";

export type IntegrationCertificationEvidence = {
  applicationId: PeerApplicationId;
  authentication: {
    acceptedVerified: number;
    acceptedUnverified: number;
    deniedAuthentication: number;
  };
  approvedExchange: {
    approvedHeldIntents: number;
    invalidUnheldIntents: number;
  };
  eventHandling: {
    publishedFromAcceptedReceipt: number;
    publicationReceiptMismatch: number;
  };
  failureRecovery: {
    heldReplayRoutes: number;
    successfulSafeRecoveryAttempts: number;
    invalidReleasedReplayRoutes: number;
  };
  tenantIsolation: {
    matchedTenantAccepted: number;
    acceptedTenantMismatch: number;
    tenantMismatchDenied: number;
    uniqueCanonicalTenantKey: boolean;
  };
};

export type IntegrationCertificationAssertion = {
  applicationId: PeerApplicationId;
  dimension: IntegrationCertificationDimension;
  outcome: IntegrationCertificationOutcome;
  evidenceCode: string;
  evidenceRefs: string[];
  detail: string;
};

function assertion(
  applicationId: PeerApplicationId,
  dimension: IntegrationCertificationDimension,
  outcome: IntegrationCertificationOutcome,
  evidenceCode: string,
  detail: string,
  evidenceRefs: string[] = []
): IntegrationCertificationAssertion {
  return {
    applicationId,
    dimension,
    outcome,
    evidenceCode,
    evidenceRefs: [...new Set(evidenceRefs)].slice(0, 20),
    detail
  };
}

export function evaluateApplicationCertification(
  evidence: IntegrationCertificationEvidence,
  refs: Partial<Record<IntegrationCertificationDimension, string[]>> = {}
): IntegrationCertificationAssertion[] {
  const app = evidence.applicationId;
  const results: IntegrationCertificationAssertion[] = [];

  if (evidence.authentication.acceptedUnverified > 0) {
    results.push(assertion(
      app,
      "authentication",
      "fail",
      "accepted-identity-unverified",
      "Accepted authentication evidence exists without verified identity. Certification fails closed.",
      refs.authentication
    ));
  } else if (evidence.authentication.acceptedVerified > 0) {
    results.push(assertion(
      app,
      "authentication",
      "pass",
      "verified-authentication-observed",
      `Observed ${evidence.authentication.acceptedVerified} accepted request(s) with verified application identity.`,
      refs.authentication
    ));
  } else {
    results.push(assertion(
      app,
      "authentication",
      "blocked",
      "verified-authentication-not-proven",
      "No accepted verified authentication evidence is available in the certification window.",
      refs.authentication
    ));
  }

  if (evidence.approvedExchange.invalidUnheldIntents > 0) {
    results.push(assertion(
      app,
      "approved-exchange",
      "fail",
      "approved-exchange-escaped-hold",
      "A governed workflow intent was observed outside the required held state.",
      refs["approved-exchange"]
    ));
  } else if (evidence.approvedExchange.approvedHeldIntents > 0) {
    results.push(assertion(
      app,
      "approved-exchange",
      "pass",
      "approved-held-exchange-observed",
      `Observed ${evidence.approvedExchange.approvedHeldIntents} approved cross-app intent(s), all retained behind the destination authorization hold.`,
      refs["approved-exchange"]
    ));
  } else {
    results.push(assertion(
      app,
      "approved-exchange",
      "blocked",
      "approved-exchange-not-proven",
      "No approved future-event rule has produced a governed held cross-app action intent for this application.",
      refs["approved-exchange"]
    ));
  }

  if (evidence.eventHandling.publicationReceiptMismatch > 0) {
    results.push(assertion(
      app,
      "event-handling",
      "fail",
      "event-publication-receipt-mismatch",
      "Event-bus publication identity does not match its authenticated webhook receipt.",
      refs["event-handling"]
    ));
  } else if (evidence.eventHandling.publishedFromAcceptedReceipt > 0) {
    results.push(assertion(
      app,
      "event-handling",
      "pass",
      "authenticated-event-published",
      `Observed ${evidence.eventHandling.publishedFromAcceptedReceipt} authenticated receipt(s) published into the governed internal event bus.`,
      refs["event-handling"]
    ));
  } else {
    results.push(assertion(
      app,
      "event-handling",
      "blocked",
      "event-handling-not-proven",
      "No authenticated webhook receipt has been published into the event bus for this application.",
      refs["event-handling"]
    ));
  }

  if (evidence.failureRecovery.invalidReleasedReplayRoutes > 0) {
    results.push(assertion(
      app,
      "failure-recovery",
      "fail",
      "recovery-route-escaped-hold",
      "A replay/recovery route was observed outside the required held recovery state.",
      refs["failure-recovery"]
    ));
  } else if (
    evidence.failureRecovery.heldReplayRoutes > 0 ||
    evidence.failureRecovery.successfulSafeRecoveryAttempts > 0
  ) {
    results.push(assertion(
      app,
      "failure-recovery",
      "pass",
      "governed-recovery-evidence-observed",
      `Observed governed recovery evidence: ${evidence.failureRecovery.heldReplayRoutes} held replay route(s) and ${evidence.failureRecovery.successfulSafeRecoveryAttempts} successful bounded safe recovery attempt(s).`,
      refs["failure-recovery"]
    ));
  } else {
    results.push(assertion(
      app,
      "failure-recovery",
      "blocked",
      "failure-recovery-not-proven",
      "No held replay route or successful bounded safe recovery attempt is available for this application.",
      refs["failure-recovery"]
    ));
  }

  if (!evidence.tenantIsolation.uniqueCanonicalTenantKey) {
    results.push(assertion(
      app,
      "tenant-isolation",
      "fail",
      "canonical-tenant-key-not-unique",
      "The registered application does not have a unique canonical tenant key.",
      refs["tenant-isolation"]
    ));
  } else if (evidence.tenantIsolation.acceptedTenantMismatch > 0) {
    results.push(assertion(
      app,
      "tenant-isolation",
      "fail",
      "tenant-mismatch-was-accepted",
      "An accepted request/receipt crossed the configured tenant boundary.",
      refs["tenant-isolation"]
    ));
  } else if (
    evidence.tenantIsolation.matchedTenantAccepted > 0 &&
    evidence.tenantIsolation.tenantMismatchDenied > 0
  ) {
    results.push(assertion(
      app,
      "tenant-isolation",
      "pass",
      "tenant-positive-and-negative-proof-observed",
      `Observed ${evidence.tenantIsolation.matchedTenantAccepted} accepted tenant-matched request(s) plus ${evidence.tenantIsolation.tenantMismatchDenied} explicit tenant-mismatch denial(s).`,
      refs["tenant-isolation"]
    ));
  } else {
    results.push(assertion(
      app,
      "tenant-isolation",
      "blocked",
      "tenant-isolation-runtime-proof-incomplete",
      "Canonical tenant identity is unique, but runtime proof requires both a tenant-matched acceptance and an explicit wrong-tenant denial.",
      refs["tenant-isolation"]
    ));
  }

  return results;
}

export function summarizeIntegrationCertification(
  assertions: readonly IntegrationCertificationAssertion[]
) {
  const passed = assertions.filter(item => item.outcome === "pass").length;
  const failed = assertions.filter(item => item.outcome === "fail").length;
  const blocked = assertions.filter(item => item.outcome === "blocked").length;
  return {
    checks: assertions.length,
    passed,
    failed,
    blocked,
    overallOutcome: (
      failed > 0 ? "failed" : blocked > 0 ? "blocked" : "passed"
    ) as "passed" | "failed" | "blocked"
  };
}

export function assertSixAppCertificationShape(
  applications: readonly PeerApplicationId[],
  assertions: readonly IntegrationCertificationAssertion[]
) {
  if (applications.length !== 6 || new Set(applications).size !== 6) {
    throw new Error("integration_certification_requires_exactly_six_apps");
  }
  if (assertions.length !== 30) {
    throw new Error("integration_certification_requires_exactly_thirty_checks");
  }
  for (const applicationId of applications) {
    const rows = assertions.filter(item => item.applicationId === applicationId);
    const dimensions = new Set(rows.map(item => item.dimension));
    if (rows.length !== 5 || dimensions.size !== 5) {
      throw new Error("integration_certification_app_dimension_matrix_invalid");
    }
  }
}
