import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { BUILD_405_APPLICATION_IDS } from "../lib/master-assurance-renewal-security-comms-recertification";
import {
  BUILD_415,
  BUILD_415_DELIVERY_AUTHORITY,
  BUILD_415_EVIDENCE_DOMAINS,
  BUILD_415_SLA_POLICIES,
  evaluateBuild415Freshness,
  evaluateBuild415Observation,
  type Build415FreshnessObservation,
  type Build415RenewalRequest
} from "../lib/master-evidence-freshness-renewal";

const nowIso = "2026-11-17T12:00:00.000Z";
const observedAt = "2026-11-17T11:54:00.000Z";

function observation(
  appId:(typeof BUILD_405_APPLICATION_IDS)[number],
  evidenceDomain:(typeof BUILD_415_EVIDENCE_DOMAINS)[number]
): Build415FreshnessObservation {
  const observedMs = Date.parse(observedAt);
  const maxHours = BUILD_415_SLA_POLICIES[evidenceDomain].maxFreshHours;
  return {
    observationId:"b415-"+appId+"-"+evidenceDomain,
    appId,
    evidenceDomain,
    sourceEvidenceId:"source-"+appId+"-"+evidenceDomain,
    evidenceDigest:"sha256:"+"a".repeat(64),
    observedAt,
    expiresAt:new Date(observedMs + maxHours * 3_600_000).toISOString(),
    independentlyVerified:true,
    authorityPreserved:true
  };
}

const observations = BUILD_405_APPLICATION_IDS.flatMap((appId)=>
  BUILD_415_EVIDENCE_DOMAINS.map((domain)=>observation(appId,domain))
);

const assured = evaluateBuild415Freshness({
  build414SoftwareReleasePresent:true,
  observations,
  renewalRequests:[],
  nowIso
});
assert.equal(BUILD_415,415);
assert.equal(assured.counts.required,49);
assert.equal(assured.counts.fresh,49);
assert.equal(assured.governanceState,"LIVE_EVIDENCE_FRESHNESS_ASSURED");
assert.equal(assured.policy.renewalRequestMayMakeEvidenceFresh,false);
assert.equal(assured.policy.directPeerDatabaseWritesAllowed,false);
assert.equal(assured.policy.deliveryAuthority,BUILD_415_DELIVERY_AUTHORITY);

const source = observation("ai-data-platform","SOURCE_RUNTIME");
const dueSoon: Build415FreshnessObservation = {
  ...source,
  observedAt:"2026-11-17T11:00:00.000Z",
  expiresAt:"2026-11-17T12:30:00.000Z"
};
assert.equal(evaluateBuild415Observation(dueSoon,nowIso).state,"DUE_SOON");

const dueNow: Build415FreshnessObservation = {
  ...source,
  observedAt:"2026-11-17T10:30:00.000Z",
  expiresAt:"2026-11-17T12:10:00.000Z"
};
assert.equal(evaluateBuild415Observation(dueNow,nowIso).state,"DUE_NOW");

const expired: Build415FreshnessObservation = {
  ...source,
  observedAt:"2026-11-17T09:30:00.000Z",
  expiresAt:"2026-11-17T11:30:00.000Z"
};
assert.equal(evaluateBuild415Observation(expired,nowIso).state,"EXPIRED");

const invalidExtended: Build415FreshnessObservation = {
  ...source,
  observedAt:"2026-11-17T11:00:00.000Z",
  expiresAt:"2026-11-17T14:00:00.000Z"
};
assert.equal(evaluateBuild415Observation(invalidExtended,nowIso).state,"INVALID");
assert.equal(evaluateBuild415Observation(null,nowIso).state,"MISSING");

const renewal: Build415RenewalRequest = {
  requestId:"renewal-1",
  appId:"ai-data-platform",
  evidenceDomain:"SOURCE_RUNTIME",
  reasonDigest:"sha256:"+"b".repeat(64),
  requestedAt:nowIso,
  requesterRole:"owner"
};
const expiredWithRequest = evaluateBuild415Freshness({
  build414SoftwareReleasePresent:true,
  observations:observations.map((item)=>
    item.appId === "ai-data-platform" && item.evidenceDomain === "SOURCE_RUNTIME"
      ? expired
      : item
  ),
  renewalRequests:[renewal],
  nowIso
});
assert.equal(expiredWithRequest.governanceState,"EVIDENCE_EXPIRED_RENEWAL_REQUIRED");
assert.equal(expiredWithRequest.counts.renewalRequests,1);

const root = path.resolve(process.cwd(),"../..");
const read = (relative:string) => fs.readFileSync(path.join(root,relative),"utf8");

const migration = read("db/migrations/0178_master_evidence_freshness_renewal.sql");
for (const token of [
  "master_build415_evidence_freshness_observations",
  "master_build415_renewal_requests",
  "master_build415_renewal_receipts",
  "master_build415_expiry_alerts",
  "force row level security",
  "rosevear-comms-hub",
  "direct_peer_database_write=false",
  "revoke update,delete",
  "interval '2 hours'",
  "interval '168 hours'"
]) assert.ok(migration.includes(token),"migration token missing: "+token);

const page = read("apps/web/app/evidence-freshness/page.tsx");
for (const token of [
  "Build 415 · Live Evidence Freshness",
  "Expiry SLA, Evidence Aging & Cross-Application Renewal",
  "Live aging matrix",
  "EvidenceFreshnessRenewalActions"
]) assert.ok(page.includes(token),"page token missing: "+token);

const action = read("apps/web/components/evidence-freshness-renewal-actions.tsx");
for (const token of [
  "Queue evidence renewal",
  "/api/evidence-freshness/renewal",
  "No renewal request changes evidence freshness"
]) assert.ok(action.includes(token),"action token missing: "+token);

const database = read("apps/web/lib/build415-evidence-freshness-database.ts");
for (const token of [
  "master_build415_evidence_freshness_observations",
  "master_build415_renewal_requests",
  "ALREADY_QUEUED",
  "source application retains evidence authority"
]) assert.ok(database.includes(token),"database token missing: "+token);

const manifest = JSON.parse(
  read(".github/rosevear-build415-evidence-freshness-renewal.v1.json")
);
assert.equal(manifest.build,415);
assert.equal(manifest.applications.length,7);
assert.equal(manifest.evidenceDomains.length,7);
assert.equal(manifest.requiredFreshnessSlots,49);
assert.equal(manifest.policy.renewalRequestMayMakeEvidenceFresh,false);
assert.equal(manifest.policy.productionGreenImpliesFreshEvidence,false);

const roadmap = read("docs/NEXT_BUILDS_415_424.md");
assert.ok(roadmap.includes("Implemented in Build 415"));

console.log(
  "Build 415 Live Evidence Freshness, Expiry SLA & Cross-Application Renewal Control verification passed."
);
