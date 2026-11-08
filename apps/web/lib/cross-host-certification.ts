export const CROSS_HOST_CERTIFICATION_VERSION = "1.0.0" as const;
export const CROSS_HOST_CERTIFICATION_SCHEMA =
  "rosevear.ai-data-platform.cross-host-certification.v1" as const;

export const HOST_CERTIFICATION_DIMENSIONS = [
  "compatibility",
  "authentication",
  "tenant",
  "capability",
  "event",
  "workflow",
  "data",
  "search",
  "recovery",
  "offline"
] as const;

export type HostCertificationDimension =
  (typeof HOST_CERTIFICATION_DIMENSIONS)[number];

export type HostEvidenceKind =
  | "synthetic-fixture"
  | "live-evidence";

export type CertificationOutcome =
  | "pass"
  | "fail"
  | "blocked";

export type HostCertificationCheckInput = {
  state: CertificationOutcome;
  evidenceRefs: string[];
  detail: string;
};

export type HostTelemetryInput = {
  sampleCount: number;
  latencyMsP95: number | null;
  errorCount: number;
  retryCount: number;
};

export type HostCertificationEvidenceInput = {
  sourceKind: HostEvidenceKind;
  observedModuleVersion: string;
  hostContractVersion: number;
  protocolVersion: number;
  adapterKind: "react" | "nextjs" | "vite" | "vanilla" | "electron";
  compatibilityEvidenceRefs: string[];
  checks: Record<
    Exclude<HostCertificationDimension, "compatibility">,
    HostCertificationCheckInput
  >;
  telemetry: HostTelemetryInput;
  observedAt: string;
};

export type ExpectedHostCertificationContext = {
  currentModuleVersion: string;
  hostContractVersion: number;
  protocolVersion: number;
  adapterKind: "react" | "nextjs" | "vite" | "vanilla" | "electron";
};

export type HostCertificationAssertion = {
  dimension: HostCertificationDimension;
  outcome: CertificationOutcome;
  evidenceRefs: string[];
  detail: string;
  synthetic: boolean;
};

export type UniversalHostCertification = {
  schema: typeof CROSS_HOST_CERTIFICATION_SCHEMA;
  suiteVersion: typeof CROSS_HOST_CERTIFICATION_VERSION;
  sourceKind: HostEvidenceKind;
  observedAt: string;
  compatibility: {
    state: CertificationOutcome;
    moduleVersionMatch: boolean;
    hostContractMatch: boolean;
    protocolMatch: boolean;
    adapterMatch: boolean;
  };
  assertions: HostCertificationAssertion[];
  summary: {
    passed: number;
    failed: number;
    blocked: number;
    overallOutcome: "passed" | "failed" | "blocked";
  };
  telemetry: {
    sampleCount: number;
    latencyMsP95: number | null;
    errorCount: number;
    retryCount: number;
  };
  health: "healthy" | "degraded" | "unhealthy" | "unknown";
  certificationClass:
    | "live-certified"
    | "fixture-certified"
    | "not-certified";
  liveCertified: boolean;
  fixtureCertified: boolean;
};

export type CertificationRegression = {
  dimension:
    | HostCertificationDimension
    | "health"
    | "live-certification";
  previous: string;
  current: string;
  detail: string;
};

function cleanText(value: unknown, code: string, max = 700) {
  const text = String(value ?? "").trim();
  if (
    text.length < 3 ||
    text.length > max ||
    /[\u0000-\u001F\u007F]/.test(text)
  ) {
    throw new Error(code);
  }
  return text;
}

function refs(value: unknown, code: string) {
  if (!Array.isArray(value) || value.length > 20) {
    throw new Error(code);
  }
  const normalized = value.map((item) => {
    const text = String(item ?? "").trim();
    if (
      text.length < 3 ||
      text.length > 240 ||
      /[\u0000-\u001F\u007F]/.test(text)
    ) {
      throw new Error(code);
    }
    return text;
  });
  return [...new Set(normalized)];
}

function integer(
  value: unknown,
  code: string,
  minimum: number,
  maximum: number
) {
  const number = Number(value);
  if (
    !Number.isInteger(number) ||
    number < minimum ||
    number > maximum
  ) {
    throw new Error(code);
  }
  return number;
}

function telemetry(input: HostTelemetryInput) {
  const sampleCount = integer(
    input.sampleCount,
    "cross_host_telemetry_sample_count_invalid",
    0,
    1_000_000_000
  );
  const errorCount = integer(
    input.errorCount,
    "cross_host_telemetry_error_count_invalid",
    0,
    1_000_000_000
  );
  const retryCount = integer(
    input.retryCount,
    "cross_host_telemetry_retry_count_invalid",
    0,
    1_000_000_000
  );
  const latencyMsP95 =
    input.latencyMsP95 === null
      ? null
      : Number(input.latencyMsP95);
  if (
    latencyMsP95 !== null &&
    (!Number.isFinite(latencyMsP95) ||
      latencyMsP95 < 0 ||
      latencyMsP95 > 86_400_000)
  ) {
    throw new Error("cross_host_telemetry_latency_invalid");
  }
  if (sampleCount === 0 && latencyMsP95 !== null) {
    throw new Error(
      "cross_host_telemetry_latency_requires_samples"
    );
  }
  return {
    sampleCount,
    latencyMsP95,
    errorCount,
    retryCount
  };
}

function normalizeCheck(
  dimension: Exclude<HostCertificationDimension, "compatibility">,
  input: HostCertificationCheckInput,
  sourceKind: HostEvidenceKind
): HostCertificationAssertion {
  if (
    input.state !== "pass" &&
    input.state !== "fail" &&
    input.state !== "blocked"
  ) {
    throw new Error(
      "cross_host_certification_check_state_invalid"
    );
  }
  const evidenceRefs = refs(
    input.evidenceRefs,
    "cross_host_certification_evidence_refs_invalid"
  );
  const detail = cleanText(
    input.detail,
    "cross_host_certification_check_detail_invalid"
  );
  if (
    sourceKind === "live-evidence" &&
    input.state === "pass" &&
    evidenceRefs.length === 0
  ) {
    return {
      dimension,
      outcome: "blocked",
      evidenceRefs,
      detail:
        "Live PASS requires at least one concrete evidence reference. " +
        detail,
      synthetic: false
    };
  }
  return {
    dimension,
    outcome: input.state,
    evidenceRefs,
    detail,
    synthetic: sourceKind === "synthetic-fixture"
  };
}

function compatibilityAssertion(
  expected: ExpectedHostCertificationContext,
  evidence: HostCertificationEvidenceInput
) {
  const moduleVersionMatch =
    evidence.observedModuleVersion ===
    expected.currentModuleVersion;
  const hostContractMatch =
    evidence.hostContractVersion ===
    expected.hostContractVersion;
  const protocolMatch =
    evidence.protocolVersion === expected.protocolVersion;
  const adapterMatch =
    evidence.adapterKind === expected.adapterKind;
  const evidenceRefs = refs(
    evidence.compatibilityEvidenceRefs,
    "cross_host_compatibility_evidence_refs_invalid"
  );
  const all =
    moduleVersionMatch &&
    hostContractMatch &&
    protocolMatch &&
    adapterMatch;
  let outcome: CertificationOutcome = all ? "pass" : "fail";
  let detail = all
    ? "Observed host/module versions and adapter match the registered installed-host contract."
    : [
        !moduleVersionMatch ? "module version mismatch" : "",
        !hostContractMatch ? "host contract mismatch" : "",
        !protocolMatch ? "protocol mismatch" : "",
        !adapterMatch ? "adapter mismatch" : ""
      ]
        .filter(Boolean)
        .join(", ");

  if (
    evidence.sourceKind === "live-evidence" &&
    outcome === "pass" &&
    evidenceRefs.length === 0
  ) {
    outcome = "blocked";
    detail =
      "Live compatibility PASS requires at least one concrete evidence reference.";
  }

  return {
    assertion: {
      dimension: "compatibility" as const,
      outcome,
      evidenceRefs,
      detail,
      synthetic:
        evidence.sourceKind === "synthetic-fixture"
    },
    compatibility: {
      state: outcome,
      moduleVersionMatch,
      hostContractMatch,
      protocolMatch,
      adapterMatch
    }
  };
}

function healthFor(input: {
  sourceKind: HostEvidenceKind;
  assertions: HostCertificationAssertion[];
  telemetry: ReturnType<typeof telemetry>;
}) {
  if (input.sourceKind !== "live-evidence") {
    return "unknown" as const;
  }
  if (
    input.assertions.some((item) => item.outcome === "fail")
  ) {
    return "unhealthy" as const;
  }
  if (
    input.assertions.some((item) => item.outcome === "blocked") ||
    input.telemetry.sampleCount === 0
  ) {
    return "unknown" as const;
  }
  if (
    input.telemetry.errorCount > 0 ||
    input.telemetry.retryCount > 0 ||
    (input.telemetry.latencyMsP95 !== null &&
      input.telemetry.latencyMsP95 > 2000)
  ) {
    return "degraded" as const;
  }
  return "healthy" as const;
}

export function runUniversalHostCertification(input: {
  expected: ExpectedHostCertificationContext;
  evidence: HostCertificationEvidenceInput;
}): UniversalHostCertification {
  if (
    input.evidence.sourceKind !== "synthetic-fixture" &&
    input.evidence.sourceKind !== "live-evidence"
  ) {
    throw new Error(
      "cross_host_certification_source_kind_invalid"
    );
  }

  const observedAt = new Date(input.evidence.observedAt);
  if (!Number.isFinite(observedAt.getTime())) {
    throw new Error(
      "cross_host_certification_observed_at_invalid"
    );
  }

  const compatibility = compatibilityAssertion(
    input.expected,
    input.evidence
  );
  const dimensions = HOST_CERTIFICATION_DIMENSIONS.filter(
    (item) => item !== "compatibility"
  ) as Exclude<
    HostCertificationDimension,
    "compatibility"
  >[];

  const assertions = [
    compatibility.assertion,
    ...dimensions.map((dimension) =>
      normalizeCheck(
        dimension,
        input.evidence.checks[dimension],
        input.evidence.sourceKind
      )
    )
  ];

  const passed = assertions.filter(
    (item) => item.outcome === "pass"
  ).length;
  const failed = assertions.filter(
    (item) => item.outcome === "fail"
  ).length;
  const blocked = assertions.filter(
    (item) => item.outcome === "blocked"
  ).length;
  const overallOutcome =
    failed > 0
      ? ("failed" as const)
      : blocked > 0
        ? ("blocked" as const)
        : ("passed" as const);

  const normalizedTelemetry = telemetry(
    input.evidence.telemetry
  );
  const health = healthFor({
    sourceKind: input.evidence.sourceKind,
    assertions,
    telemetry: normalizedTelemetry
  });

  const allLiveEvidenceReferenced =
    input.evidence.sourceKind === "live-evidence" &&
    assertions.every(
      (item) =>
        item.outcome === "pass" &&
        item.evidenceRefs.length > 0
    );

  const liveCertified =
    allLiveEvidenceReferenced &&
    overallOutcome === "passed" &&
    normalizedTelemetry.sampleCount > 0 &&
    health !== "unhealthy" &&
    health !== "unknown";

  const fixtureCertified =
    input.evidence.sourceKind === "synthetic-fixture" &&
    overallOutcome === "passed";

  return Object.freeze({
    schema: CROSS_HOST_CERTIFICATION_SCHEMA,
    suiteVersion: CROSS_HOST_CERTIFICATION_VERSION,
    sourceKind: input.evidence.sourceKind,
    observedAt: observedAt.toISOString(),
    compatibility: compatibility.compatibility,
    assertions,
    summary: {
      passed,
      failed,
      blocked,
      overallOutcome
    },
    telemetry: normalizedTelemetry,
    health,
    certificationClass: liveCertified
      ? ("live-certified" as const)
      : fixtureCertified
        ? ("fixture-certified" as const)
        : ("not-certified" as const),
    liveCertified,
    fixtureCertified
  });
}

export function compareHostCertifications(
  current: UniversalHostCertification,
  previous: UniversalHostCertification | null
): CertificationRegression[] {
  if (!previous) return [];

  const regressions: CertificationRegression[] = [];
  const previousByDimension = new Map(
    previous.assertions.map((item) => [
      item.dimension,
      item
    ])
  );

  for (const assertion of current.assertions) {
    const prior = previousByDimension.get(assertion.dimension);
    if (!prior) continue;
    if (
      prior.outcome === "pass" &&
      assertion.outcome !== "pass"
    ) {
      regressions.push({
        dimension: assertion.dimension,
        previous: prior.outcome,
        current: assertion.outcome,
        detail:
          assertion.dimension +
          " regressed from PASS to " +
          assertion.outcome.toUpperCase() +
          "."
      });
    }
  }

  const healthRank = {
    healthy: 3,
    degraded: 2,
    unknown: 1,
    unhealthy: 0
  } as const;
  if (
    healthRank[current.health] <
    healthRank[previous.health]
  ) {
    regressions.push({
      dimension: "health",
      previous: previous.health,
      current: current.health,
      detail:
        "Per-host health regressed from " +
        previous.health +
        " to " +
        current.health +
        "."
    });
  }

  if (previous.liveCertified && !current.liveCertified) {
    regressions.push({
      dimension: "live-certification",
      previous: "live-certified",
      current: current.certificationClass,
      detail:
        "Host lost live-certified status in the newest evidence run."
    });
  }

  return regressions;
}

export const crossHostCertificationDescriptor = Object.freeze({
  version: CROSS_HOST_CERTIFICATION_VERSION,
  dimensions: HOST_CERTIFICATION_DIMENSIONS,
  supportedAdapters: [
    "react",
    "nextjs",
    "vite",
    "vanilla",
    "electron"
  ] as const,
  policy: {
    syntheticFixtureMayLiveCertify: false,
    livePassRequiresEvidenceReference: true,
    liveCertificationRequiresTelemetrySamples: true,
    liveCertificationRequiresAllDimensionsPass: true,
    missingLiveEvidenceBlocks: true,
    contradictoryEvidenceFails: true,
    certificationActivatesConnection: false,
    certificationGrantsCapabilities: false,
    certificationExecutesHostAction: false,
    certificationMutatesHost: false
  }
});
