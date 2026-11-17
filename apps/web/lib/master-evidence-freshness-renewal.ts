import {
  BUILD_405_APPLICATION_IDS
} from "./master-assurance-renewal-security-comms-recertification";

export const BUILD_415 = 415 as const;
export const BUILD_415_SCHEMA =
  "rosevear.ai-data-platform.build415-evidence-freshness-renewal.v1" as const;
export const BUILD_415_DELIVERY_AUTHORITY = "rosevear-comms-hub" as const;

export const BUILD_415_EVIDENCE_DOMAINS = [
  "SOURCE_RUNTIME",
  "COMPLETION",
  "SECURITY",
  "COMMUNICATIONS",
  "ACCESSIBILITY_DEVICE",
  "PERFORMANCE_UX",
  "PRIVILEGED_RECOVERY"
] as const;

export type Build415ApplicationId = (typeof BUILD_405_APPLICATION_IDS)[number];
export type Build415EvidenceDomain = (typeof BUILD_415_EVIDENCE_DOMAINS)[number];

export type Build415SlaPolicy = {
  maxFreshHours: number;
  renewalLeadHours: number;
  urgentLeadHours: number;
};

export const BUILD_415_SLA_POLICIES: Readonly<
  Record<Build415EvidenceDomain, Build415SlaPolicy>
> = Object.freeze({
  SOURCE_RUNTIME: { maxFreshHours: 2, renewalLeadHours: 1, urgentLeadHours: 0.25 },
  COMPLETION: { maxFreshHours: 168, renewalLeadHours: 24, urgentLeadHours: 6 },
  SECURITY: { maxFreshHours: 24, renewalLeadHours: 6, urgentLeadHours: 1 },
  COMMUNICATIONS: { maxFreshHours: 4, renewalLeadHours: 1, urgentLeadHours: 0.25 },
  ACCESSIBILITY_DEVICE: { maxFreshHours: 168, renewalLeadHours: 24, urgentLeadHours: 6 },
  PERFORMANCE_UX: { maxFreshHours: 24, renewalLeadHours: 6, urgentLeadHours: 1 },
  PRIVILEGED_RECOVERY: { maxFreshHours: 24, renewalLeadHours: 6, urgentLeadHours: 1 }
});

export type Build415FreshnessObservation = {
  observationId: string;
  appId: Build415ApplicationId;
  evidenceDomain: Build415EvidenceDomain;
  sourceEvidenceId: string;
  evidenceDigest: string;
  observedAt: string;
  expiresAt: string;
  independentlyVerified: boolean;
  authorityPreserved: boolean;
};

export type Build415RenewalRequest = {
  requestId: string;
  appId: Build415ApplicationId;
  evidenceDomain: Build415EvidenceDomain;
  reasonDigest: string;
  requestedAt: string;
  requesterRole: "owner" | "operator";
};

export type Build415FreshnessState =
  | "MISSING"
  | "INVALID"
  | "EXPIRED"
  | "DUE_NOW"
  | "DUE_SOON"
  | "FRESH";

function validDigest(value: string) {
  return /^sha256:[a-f0-9]{64}$/.test(value);
}
function validIso(value: string) {
  return (
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}
function slotKey(appId: string, domain: string) {
  return appId + "::" + domain;
}

export function evaluateBuild415Observation(
  observation: Build415FreshnessObservation | null,
  nowIso: string
) {
  if (!observation) {
    return {
      state: "MISSING" as const,
      ageHours: null,
      hoursRemaining: null,
      policy: null
    };
  }

  const policy = BUILD_415_SLA_POLICIES[observation.evidenceDomain];
  const observedMs = Date.parse(observation.observedAt);
  const expiresMs = Date.parse(observation.expiresAt);
  const nowMs = Date.parse(nowIso);
  const maxExpiryMs = observedMs + policy.maxFreshHours * 60 * 60 * 1000;

  const structurallyValid =
    validIso(observation.observedAt) &&
    validIso(observation.expiresAt) &&
    validIso(nowIso) &&
    expiresMs > observedMs &&
    expiresMs <= maxExpiryMs &&
    validDigest(observation.evidenceDigest) &&
    observation.sourceEvidenceId.length > 0 &&
    observation.independentlyVerified &&
    observation.authorityPreserved;

  if (!structurallyValid) {
    return {
      state: "INVALID" as const,
      ageHours: Number.isFinite(nowMs - observedMs)
        ? (nowMs - observedMs) / 3_600_000
        : null,
      hoursRemaining: null,
      policy
    };
  }

  const ageHours = (nowMs - observedMs) / 3_600_000;
  const hoursRemaining = (expiresMs - nowMs) / 3_600_000;

  const state: Build415FreshnessState =
    hoursRemaining <= 0
      ? "EXPIRED"
      : hoursRemaining <= policy.urgentLeadHours
        ? "DUE_NOW"
        : hoursRemaining <= policy.renewalLeadHours
          ? "DUE_SOON"
          : "FRESH";

  return { state, ageHours, hoursRemaining, policy };
}

export function evaluateBuild415Freshness(input: {
  build414SoftwareReleasePresent: boolean;
  observations?: readonly Build415FreshnessObservation[];
  renewalRequests?: readonly Build415RenewalRequest[];
  nowIso: string;
}) {
  const latest = new Map<string, Build415FreshnessObservation>();
  for (const item of [...(input.observations ?? [])].sort((a,b) =>
    b.observedAt.localeCompare(a.observedAt)
  )) {
    const key = slotKey(item.appId,item.evidenceDomain);
    if (!latest.has(key)) latest.set(key,item);
  }

  const slots = BUILD_405_APPLICATION_IDS.flatMap((appId) =>
    BUILD_415_EVIDENCE_DOMAINS.map((evidenceDomain) => {
      const observation = latest.get(slotKey(appId,evidenceDomain)) ?? null;
      return {
        appId,
        evidenceDomain,
        observation,
        ...evaluateBuild415Observation(observation,input.nowIso)
      };
    })
  );

  const counts = {
    required: slots.length,
    fresh: slots.filter((item)=>item.state === "FRESH").length,
    dueSoon: slots.filter((item)=>item.state === "DUE_SOON").length,
    dueNow: slots.filter((item)=>item.state === "DUE_NOW").length,
    expired: slots.filter((item)=>item.state === "EXPIRED").length,
    missing: slots.filter((item)=>item.state === "MISSING").length,
    invalid: slots.filter((item)=>item.state === "INVALID").length,
    renewalRequests: (input.renewalRequests ?? []).length
  };

  const governanceState =
    !input.build414SoftwareReleasePresent
      ? ("HOLD_BUILD414_SOFTWARE_RELEASE_REQUIRED" as const)
      : counts.invalid > 0
        ? ("FRESHNESS_EVIDENCE_INVALID" as const)
        : counts.expired > 0
          ? ("EVIDENCE_EXPIRED_RENEWAL_REQUIRED" as const)
          : counts.missing > 0
            ? ("FRESHNESS_OBSERVATIONS_REQUIRED" as const)
            : counts.dueNow > 0
              ? ("EVIDENCE_RENEWAL_DUE_NOW" as const)
              : counts.dueSoon > 0
                ? ("EVIDENCE_RENEWAL_DUE_SOON" as const)
                : ("LIVE_EVIDENCE_FRESHNESS_ASSURED" as const);

  return {
    schema: BUILD_415_SCHEMA,
    build: BUILD_415,
    governanceState,
    slots,
    counts,
    policy: {
      missingEvidenceMayBeFresh: false,
      expiredEvidenceMayBeFresh: false,
      renewalRequestMayMakeEvidenceFresh: false,
      sourceOwnsRenewedEvidence: true,
      deliveryAuthority: BUILD_415_DELIVERY_AUTHORITY,
      directPeerDatabaseWritesAllowed: false,
      productionGreenImpliesFreshEvidence: false,
      protocolVersion: "1.1"
    }
  };
}

export function build415FreshnessSummary() {
  return {
    applications: [...BUILD_405_APPLICATION_IDS],
    evidenceDomains: [...BUILD_415_EVIDENCE_DOMAINS],
    policies: BUILD_415_EVIDENCE_DOMAINS.map((evidenceDomain) => ({
      evidenceDomain,
      ...BUILD_415_SLA_POLICIES[evidenceDomain]
    })),
    requiredFreshnessSlots:
      BUILD_405_APPLICATION_IDS.length * BUILD_415_EVIDENCE_DOMAINS.length,
    deliveryAuthority: BUILD_415_DELIVERY_AUTHORITY
  };
}
