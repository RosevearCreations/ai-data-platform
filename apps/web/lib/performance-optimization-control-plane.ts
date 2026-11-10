export const PERFORMANCE_OPTIMIZATION_CONTROL_PLANE_BUILD = 355 as const;
export const PERFORMANCE_OPTIMIZATION_CONTROL_PLANE_SCHEMA =
  "rosevear.ai-data-platform.performance-optimization-control-plane.v1" as const;

export const OPTIMIZATION_AREAS = [
  "CACHE",
  "QUERY",
  "RENDER",
  "DEPENDENCY"
] as const;

export type OptimizationArea = (typeof OPTIMIZATION_AREAS)[number];

export const OPTIMIZATION_STATES = [
  "DRAFT",
  "APPROVED",
  "APPLIED",
  "REJECTED",
  "REVERTED"
] as const;

export type OptimizationState = (typeof OPTIMIZATION_STATES)[number];

type BaselineInput = {
  live: {
    overallState: string;
    budgetResults: Array<{
      metricKey: string;
      status: string;
    }>;
    regressions: Array<{
      metricKey: string;
      regressed: boolean;
      comparable: boolean;
    }>;
  };
};

type RoutePerformanceInput = {
  routes: Array<{
    routeFamily: string;
    status: string;
    lcpP75: number | null;
    clsP75: number | null;
    inpP75: number | null;
    routeTransitionP75: number | null;
    hydrationReadyP75: number | null;
    longTaskP95: number | null;
  }>;
};

type PerformanceObservatoryInput = {
  api: Array<{
    operationKey: string;
    state: string;
    p95Ms: number | null;
    failureRatePct: number | null;
  }>;
  database: Array<{
    operationKey: string;
    state: string;
    p95Ms: number | null;
    failureRatePct: number | null;
    maxPoolWaiting: number;
  }>;
  dependencies: Array<{
    connectorKey: string;
    state: string;
    p95Ms: number | null;
    failureRatePct: number | null;
  }>;
  pools: {
    maxObservedAppWaiting: number;
  };
};

export type OptimizationCandidate = {
  id: string;
  area: OptimizationArea;
  state: OptimizationState;
  severity: "INFO" | "ATTENTION" | "CRITICAL";
  target: string;
  evidence: string;
  recommendation: string;
  validation: string;
  rollback: string;
  approvalRequired: true;
  automaticApply: false;
};

function severity(state: string): OptimizationCandidate["severity"] {
  return state === "critical" || state === "poor"
    ? "CRITICAL"
    : state === "warning" || state === "needs-attention"
      ? "ATTENTION"
      : "INFO";
}

function rounded(value: number | null, unit = "ms") {
  return value === null ? "unmeasured" : Math.round(value * 100) / 100 + " " + unit;
}

export function composePerformanceOptimizationControlPlane(input: {
  baseline: BaselineInput;
  routes: RoutePerformanceInput;
  observatory: PerformanceObservatoryInput;
  generatedAt?: Date;
}) {
  const generatedAt = input.generatedAt ?? new Date();
  const candidates: OptimizationCandidate[] = [];

  for (const result of input.baseline.live.budgetResults) {
    if (result.status !== "warning" && result.status !== "critical") continue;

    if (result.metricKey === "database_probe_ms") {
      candidates.push({
        id: "baseline:database-probe",
        area: "QUERY",
        state: "DRAFT",
        severity: severity(result.status),
        target: "database probe and query path",
        evidence: "Performance baseline budget is " + result.status + ".",
        recommendation:
          "Review query shape, pagination, index eligibility and connection usage before proposing a database change.",
        validation:
          "Compare database P95, pool waiting and the next measured baseline before approval.",
        rollback:
          "Revert only the approved query/index/configuration change and retain the prior measured baseline.",
        approvalRequired: true,
        automaticApply: false
      });
    }

    if (result.metricKey === "connector_p95_ms") {
      candidates.push({
        id: "baseline:connector-p95",
        area: "DEPENDENCY",
        state: "DRAFT",
        severity: severity(result.status),
        target: "connector latency",
        evidence: "Connector P95 budget is " + result.status + ".",
        recommendation:
          "Review dependency call frequency, duplicate reads, bounded metadata caching and upstream latency before changing transport behavior.",
        validation:
          "Require fresh connector P95 and failure-rate evidence after any supervised change.",
        rollback:
          "Restore the previous connector/caching policy if latency, failures or freshness worsen.",
        approvalRequired: true,
        automaticApply: false
      });
    }
  }

  for (const regression of input.baseline.live.regressions) {
    if (!regression.comparable || !regression.regressed) continue;
    candidates.push({
      id: "regression:" + regression.metricKey,
      area:
        regression.metricKey.includes("database")
          ? "QUERY"
          : regression.metricKey.includes("connector")
            ? "DEPENDENCY"
            : "CACHE",
      state: "DRAFT",
      severity: "ATTENTION",
      target: regression.metricKey,
      evidence: "Measured performance regressed against the previous baseline.",
      recommendation:
        "Keep the regression visible and prepare one reversible optimization at a time.",
      validation:
        "Capture a new baseline after the supervised change and compare against both the prior and regression baseline.",
      rollback:
        "Revert the supervised change if the measured regression remains or another budget worsens.",
      approvalRequired: true,
      automaticApply: false
    });
  }

  for (const route of input.routes.routes) {
    if (route.status !== "poor" && route.status !== "needs-attention") continue;

    const evidence = [
      "LCP " + rounded(route.lcpP75),
      "INP " + rounded(route.inpP75),
      "route transition " + rounded(route.routeTransitionP75),
      "hydration " + rounded(route.hydrationReadyP75),
      "long task P95 " + rounded(route.longTaskP95)
    ].join(" · ");

    candidates.push({
      id: "render:" + route.routeFamily,
      area: "RENDER",
      state: "DRAFT",
      severity: severity(route.status),
      target: route.routeFamily,
      evidence,
      recommendation:
        "Review server/client component boundaries, unnecessary client hydration, route bundle size, prefetch eligibility and rendering waterfalls.",
      validation:
        "Require fresh route-level RUM after the supervised rendering change; do not substitute synthetic timing for real-user evidence.",
      rollback:
        "Restore the prior rendering boundary or route behavior if LCP, INP, hydration or transition timing regresses.",
      approvalRequired: true,
      automaticApply: false
    });

    if (
      (route.routeTransitionP75 !== null && route.routeTransitionP75 > 500) ||
      (route.lcpP75 !== null && route.lcpP75 > 2500)
    ) {
      candidates.push({
        id: "cache:" + route.routeFamily,
        area: "CACHE",
        state: "DRAFT",
        severity: severity(route.status),
        target: route.routeFamily,
        evidence:
          "Measured route latency suggests cache/prefetch eligibility should be reviewed.",
        recommendation:
          "Review only non-secret, correctly scoped data for short-lived caching, request deduplication or safe prefetch. Preserve tenant/user authorization boundaries and explicit invalidation.",
        validation:
          "Confirm freshness, authorization isolation and route timing after the approved cache policy change.",
        rollback:
          "Disable the approved cache/prefetch rule and return to the previous no-cache or prior TTL behavior if freshness or isolation is affected.",
        approvalRequired: true,
        automaticApply: false
      });
    }
  }

  for (const operation of input.observatory.api) {
    if (
      operation.state !== "poor" &&
      operation.state !== "needs-attention"
    ) {
      continue;
    }
    candidates.push({
      id: "api:" + operation.operationKey,
      area: "CACHE",
      state: "DRAFT",
      severity: severity(operation.state),
      target: operation.operationKey,
      evidence:
        "API P95 " +
        rounded(operation.p95Ms) +
        " · failure rate " +
        rounded(operation.failureRatePct, "%"),
      recommendation:
        "Review request deduplication, read-result cache eligibility and expensive downstream work. Never cache credential-bearing or authorization-sensitive responses without an explicit identity/tenant key and invalidation rule.",
      validation:
        "Compare API P95, failure rate and freshness after a supervised change.",
      rollback:
        "Restore the previous cache/request policy if latency, correctness, isolation or failure rate worsens.",
      approvalRequired: true,
      automaticApply: false
    });
  }

  for (const operation of input.observatory.database) {
    if (
      operation.state !== "poor" &&
      operation.state !== "needs-attention" &&
      operation.maxPoolWaiting <= 0
    ) {
      continue;
    }
    candidates.push({
      id: "database:" + operation.operationKey,
      area: "QUERY",
      state: "DRAFT",
      severity: severity(operation.state),
      target: operation.operationKey,
      evidence:
        "Database P95 " +
        rounded(operation.p95Ms) +
        " · failure rate " +
        rounded(operation.failureRatePct, "%") +
        " · max pool waiting " +
        operation.maxPoolWaiting,
      recommendation:
        "Review query count, pagination, index eligibility, repeated round trips and transaction scope. Do not auto-create indexes or resize pools.",
      validation:
        "Require measured database P95 and pool-wait evidence after the approved change.",
      rollback:
        "Revert the exact query/index/configuration change if database latency, write cost or pool pressure worsens.",
      approvalRequired: true,
      automaticApply: false
    });
  }

  for (const dependency of input.observatory.dependencies) {
    if (
      dependency.state !== "poor" &&
      dependency.state !== "needs-attention"
    ) {
      continue;
    }
    candidates.push({
      id: "dependency:" + dependency.connectorKey,
      area: "DEPENDENCY",
      state: "DRAFT",
      severity: severity(dependency.state),
      target: dependency.connectorKey,
      evidence:
        "Dependency P95 " +
        rounded(dependency.p95Ms) +
        " · failure rate " +
        rounded(dependency.failureRatePct, "%"),
      recommendation:
        "Review call frequency, retry amplification, timeout policy and bounded metadata caching without changing source authority or connection trust.",
      validation:
        "Require fresh connector latency/failure evidence and confirm no duplicate side effects.",
      rollback:
        "Return to the prior timeout/retry/cache policy if reliability or freshness worsens.",
      approvalRequired: true,
      automaticApply: false
    });
  }

  if (input.observatory.pools.maxObservedAppWaiting > 0) {
    candidates.push({
      id: "database:pool-wait",
      area: "QUERY",
      state: "DRAFT",
      severity:
        input.observatory.pools.maxObservedAppWaiting >= 5
          ? "CRITICAL"
          : "ATTENTION",
      target: "application database pool",
      evidence:
        "Observed application pool waiting reached " +
        input.observatory.pools.maxObservedAppWaiting +
        ".",
      recommendation:
        "Review slow/duplicate queries and transaction duration before considering any pool-size change.",
      validation:
        "Require lower pool waiting without increasing database saturation or query latency.",
      rollback:
        "Restore prior query/configuration behavior if pool pressure shifts or worsens.",
      approvalRequired: true,
      automaticApply: false
    });
  }

  const deduplicated = Array.from(
    new Map(candidates.map((candidate) => [candidate.id, candidate])).values()
  );

  return {
    schema: PERFORMANCE_OPTIMIZATION_CONTROL_PLANE_SCHEMA,
    build: PERFORMANCE_OPTIMIZATION_CONTROL_PLANE_BUILD,
    generatedAt: generatedAt.toISOString(),
    baselineState: input.baseline.live.overallState,
    candidates: deduplicated,
    summary: {
      total: deduplicated.length,
      critical: deduplicated.filter((item) => item.severity === "CRITICAL").length,
      attention: deduplicated.filter((item) => item.severity === "ATTENTION").length,
      cache: deduplicated.filter((item) => item.area === "CACHE").length,
      query: deduplicated.filter((item) => item.area === "QUERY").length,
      render: deduplicated.filter((item) => item.area === "RENDER").length,
      dependency: deduplicated.filter((item) => item.area === "DEPENDENCY").length
    },
    controls: {
      cache: {
        defaultAuthenticatedResponse: "NO_STORE",
        explicitIdentityTenantKeyRequired: true,
        explicitInvalidationRequired: true,
        secretCachingAllowed: false
      },
      query: {
        automaticIndexCreation: false,
        automaticPoolResize: false,
        paginationReviewRequired: true,
        measuredBeforeAfterRequired: true
      },
      render: {
        automaticStaticConversion: false,
        authorizationBoundaryMustBePreserved: true,
        realUserValidationRequired: true,
        hydrationMetricIsCoreWebVital: false
      },
      dependency: {
        automaticRetryPolicyChange: false,
        automaticTimeoutChange: false,
        sourceAuthorityPreserved: true,
        duplicateSideEffectsMustBeExcluded: true
      }
    },
    policy: {
      measuredEvidenceOnly: true,
      missingEvidenceIsSuccess: false,
      recommendationsAreChanges: false,
      automaticOptimization: false,
      automaticCacheActivation: false,
      automaticQueryRewrite: false,
      automaticIndexCreation: false,
      automaticRenderingRewrite: false,
      automaticPoolResize: false,
      automaticReleaseBlocking: false,
      ownerOrOperatorApprovalRequired: true,
      rollbackRequired: true
    }
  };
}

export type PerformanceOptimizationControlPlaneModel = ReturnType<
  typeof composePerformanceOptimizationControlPlane
>;
