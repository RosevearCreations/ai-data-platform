import {
  evaluateSourcePolicyEntry,
  normalizeSourcePolicyOrigin,
  sourcePolicyFingerprint
} from "../../extension/src/source-policy-governance";
import type { SourcePolicyEntry } from "../../extension/src/types";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const now = new Date("2026-10-07T20:00:00.000Z");
const base: SourcePolicyEntry = {
  version: 1,
  id: "source-policy-test",
  workspaceId: "11111111-1111-4111-8111-111111111111",
  origin: "https://example.com",
  displayName: "Example",
  purpose: "Collect public product facts for reviewed comparison.",
  collectionMethod: "public-webpage",
  publicOrAuthorized: true,
  termsReviewed: true,
  termsUrl: "https://example.com/terms",
  robotsDecision: "allowed",
  robotsUrl: "https://example.com/robots.txt",
  noAccessControlBypass: true,
  dataSensitivity: "public-facts",
  minimumDelayMs: 1500,
  maxPagesPerRun: 10,
  maxRecordsPerRun: 500,
  reviewExpiresAt: "2027-01-01T00:00:00.000Z",
  status: "approved",
  notes: "Facts only.",
  revision: 1,
  fingerprint: "",
  createdAt: "2026-10-07T19:00:00.000Z",
  updatedAt: "2026-10-07T19:00:00.000Z"
};

assert(
  normalizeSourcePolicyOrigin("https://example.com/catalog?q=1") ===
    "https://example.com",
  "Build 025 origin normalization failed."
);

const fingerprintInput = Object.fromEntries(
  Object.entries(base).filter(([key]) => key !== "fingerprint")
) as Omit<SourcePolicyEntry, "fingerprint">;
const fingerprint = sourcePolicyFingerprint(fingerprintInput);
assert(/^sp1-[0-9a-f]{8}$/.test(fingerprint), "Build 025 fingerprint format failed.");

const approved = { ...base, fingerprint };
assert(
  evaluateSourcePolicyEntry(approved, now).allowed,
  "Build 025 approved policy should be runnable."
);

const changed = {
  ...fingerprintInput,
  revision: 2,
  minimumDelayMs: 2500
};
assert(
  sourcePolicyFingerprint(changed) !== fingerprint,
  "Build 025 material policy changes must change the fingerprint."
);

for (const [label, candidate, expected] of [
  [
    "unknown robots",
    { ...approved, robotsDecision: "unknown" as const },
    "Robots/crawl directives have not been resolved"
  ],
  [
    "robots disallowed",
    { ...approved, robotsDecision: "disallowed" as const },
    "disallow"
  ],
  [
    "expired review",
    { ...approved, reviewExpiresAt: "2026-10-01T00:00:00.000Z" },
    "expired"
  ],
  [
    "restricted data",
    { ...approved, dataSensitivity: "restricted" as const },
    "Restricted/private data"
  ],
  [
    "blocked policy",
    { ...approved, status: "blocked" as const },
    "blocked"
  ],
  [
    "access-control bypass",
    { ...approved, noAccessControlBypass: false },
    "bypassing login"
  ]
] as const) {
  const evaluation = evaluateSourcePolicyEntry(candidate, now);
  assert(!evaluation.allowed, "Build 025 " + label + " should fail closed.");
  assert(
    evaluation.reasons.some((reason) => reason.includes(expected)),
    "Build 025 " + label + " did not return the expected reason."
  );
}

const apiPolicy: SourcePolicyEntry = {
  ...approved,
  collectionMethod: "official-api",
  robotsDecision: "not-applicable"
};
assert(
  evaluateSourcePolicyEntry(apiPolicy, now).allowed,
  "Build 025 official API policies should not require webpage robots approval."
);

console.log(
  "Build 025 source policy origin, fingerprint, expiry, robots, sensitivity and fail-closed governance verification passed."
);
