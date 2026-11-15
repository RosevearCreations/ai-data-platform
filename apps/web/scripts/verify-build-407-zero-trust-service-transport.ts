import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_405_APPLICATION_IDS,
  BUILD_405_COMMUNICATION_CHANNELS,
  BUILD_405_COMMUNICATION_RELATIONSHIPS
} from "../lib/master-assurance-renewal-security-comms-recertification";
import {
  BUILD_407_APPROVED_BRANCHES,
  BUILD_407_DIRECTIONAL_RELATIONSHIPS,
  BUILD_407_DIRECT_MASTER_APPS,
  BUILD_407_MASTER_APPLICATIONS,
  BUILD_407_MASTER_THEME_ID,
  BUILD_407_SLAVE_SHELL_LABEL,
  assessBuild407Governance,
  type Build407TransportPolicy
} from "../lib/master-zero-trust-service-transport";
import type { Build406GovernanceAssessment } from "../lib/master-unified-security-trust-completion-baseline";
import {
  DATABASE_TLS_POLICY,
  enforceStrictPostgresTls
} from "../lib/database-ssl-policy";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const build406Verified = {
  governanceState: "UNIFIED_SECURITY_TRUST_AND_COMPLETION_BASELINE_VERIFIED"
} as unknown as Build406GovernanceAssessment;

assert.deepEqual(BUILD_407_APPROVED_BRANCHES, ["dev", "main"]);
assert.equal(BUILD_407_MASTER_THEME_ID, "rosevear-master-instrument.v1");
assert.equal(BUILD_407_SLAVE_SHELL_LABEL, "SLAVE APPLICATION SHELL");
assert.equal(BUILD_405_APPLICATION_IDS.length, 7);
assert.equal(BUILD_405_COMMUNICATION_RELATIONSHIPS.length, 14);
assert.equal(BUILD_407_DIRECTIONAL_RELATIONSHIPS.length, 28);
assert.equal(BUILD_407_MASTER_APPLICATIONS.length, 3);
assert.equal(BUILD_407_DIRECT_MASTER_APPS.length, 2);

const servicePrincipals = BUILD_405_APPLICATION_IDS.map((appId) => ({
  principalId: "principal-" + appId,
  appId,
  issuer: "urn:rosevear:" + appId,
  subject: "service:" + appId,
  audienceNamespace: "urn:rosevear:service:" + appId,
  algorithm: "Ed25519" as const,
  keyId: "key-" + appId + "-01",
  publicKeyReference: "config://public-keys/" + appId + "/current",
  privateKeyIncluded: false as const,
  sourceIdentityBound: true,
  tenantBoundaryBound: true,
  ownerReviewed: true,
  independentlyVerified: true,
  state: "ENROLLED" as const,
  observedAt: "2026-11-15T16:00:00.000Z"
}));

const keyRotations = BUILD_405_APPLICATION_IDS.map((appId) => ({
  receiptId: "rotation-" + appId,
  appId,
  currentKeyId: "key-" + appId + "-01",
  previousKeyId: null,
  pinDigestSha256: "a".repeat(64),
  publicKeyReference: "config://public-keys/" + appId + "/current",
  secretReferenceName: "SERVICE_SIGNING_KEY_REF_" + appId.toUpperCase().replaceAll("-", "_"),
  rawSecretIncluded: false as const,
  rotationIntervalDays: 60,
  overlapWindowHours: 24,
  revokedPreviousKey: false,
  ownerReviewed: true,
  independentlyVerified: true,
  state: "ROTATION_VERIFIED" as const,
  observedAt: "2026-11-15T16:01:00.000Z"
}));

const transportPolicies = BUILD_407_DIRECTIONAL_RELATIONSHIPS.map(
  ([sourceAppId, targetAppId]) => ({
    policyId: "transport-" + sourceAppId + "-" + targetAppId,
    sourceAppId,
    targetAppId,
    allowedChannels: [...BUILD_405_COMMUNICATION_CHANNELS],
    transportKind:
      sourceAppId === "rosevear-ai-hub" || targetAppId === "rosevear-ai-hub"
        ? ("trusted-local-relay" as const)
        : ("direct-https" as const),
    minimumTlsVersion: "TLSv1.2" as const,
    certificateValidation: "verify-full" as const,
    signedRequestsRequired: true as const,
    issuerBindingRequired: true as const,
    audienceBindingRequired: true as const,
    bodyDigestRequired: true as const,
    nonceRequired: true as const,
    replayProtectionRequired: true as const,
    maxRequestAgeSeconds: 300,
    secretlessRouting: true as const,
    rawSecretsAllowed: false as const,
    t5Allowed: false as const,
    directPeerDatabaseWrite: false as const,
    delegatedAuthority: false as const,
    consequentialWritesRequireOwnerGate: true as const,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "ENFORCED" as const,
    observedAt: "2026-11-15T16:02:00.000Z"
  })
);

const signedRequestEvidence = BUILD_407_DIRECTIONAL_RELATIONSHIPS.map(
  ([sourceAppId, targetAppId]) => ({
    evidenceId: "request-" + sourceAppId + "-" + targetAppId,
    sourceAppId,
    targetAppId,
    channel: "SECURITY_EVIDENCE" as const,
    keyId: "key-" + sourceAppId + "-01",
    issuer: "urn:rosevear:" + sourceAppId,
    audience: "urn:rosevear:service:" + targetAppId,
    nonceDigestSha256: "b".repeat(64),
    bodyDigestSha256: "c".repeat(64),
    signatureVerified: true,
    issuerVerified: true,
    audienceVerified: true,
    nonceAcceptedOnce: true,
    requestAgeSeconds: 12,
    tlsVerified: true,
    secretlessRouteVerified: true,
    authorityPreserved: true,
    state: "VERIFIED" as const,
    observedAt: "2026-11-15T16:03:00.000Z"
  })
);

assert.equal(servicePrincipals.length, 7);
assert.equal(keyRotations.length, 7);
assert.equal(transportPolicies.length, 28);
assert.equal(signedRequestEvidence.length, 28);

assert.equal(
  assessBuild407Governance({
    build406: { governanceState: "HOLD" } as unknown as Build406GovernanceAssessment,
    servicePrincipals,
    keyRotations,
    transportPolicies,
    signedRequestEvidence
  }).governanceState,
  "HOLD_BUILD406_NOT_VERIFIED"
);

assert.equal(
  assessBuild407Governance({ build406: build406Verified }).governanceState,
  "SERVICE_PRINCIPAL_ENROLLMENT_REQUIRED"
);

const invalidPrincipal = servicePrincipals.map((item) =>
  item.appId === "rosiedazzlers"
    ? { ...item, sourceIdentityBound: false, state: "HOLD" as const }
    : item
);
assert.equal(
  assessBuild407Governance({
    build406: build406Verified,
    servicePrincipals: invalidPrincipal
  }).governanceState,
  "SERVICE_PRINCIPAL_INVALID"
);

const invalidRotation = keyRotations.map((item) =>
  item.appId === "devilndove"
    ? { ...item, rotationIntervalDays: 120, state: "EXPIRED" as const }
    : item
);
assert.equal(
  assessBuild407Governance({
    build406: build406Verified,
    servicePrincipals,
    keyRotations: invalidRotation
  }).governanceState,
  "KEY_ROTATION_INVALID"
);

const invalidPolicy = transportPolicies.map((item) =>
  item.sourceAppId === "rosiedazzlers" &&
  item.targetAppId === "rosevear-comms-hub"
    ? { ...item, rawSecretsAllowed: true as const, state: "FAILED" as const }
    : item
);
assert.equal(
  assessBuild407Governance({
    build406: build406Verified,
    servicePrincipals,
    keyRotations,
    transportPolicies: invalidPolicy as unknown as Build407TransportPolicy[]
  }).governanceState,
  "TRANSPORT_POLICY_INVALID"
);

const invalidEvidence = signedRequestEvidence.map((item) =>
  item.sourceAppId === "devilndove" &&
  item.targetAppId === "ai-data-platform"
    ? { ...item, nonceAcceptedOnce: false, state: "REJECTED" as const }
    : item
);
assert.equal(
  assessBuild407Governance({
    build406: build406Verified,
    servicePrincipals,
    keyRotations,
    transportPolicies,
    signedRequestEvidence: invalidEvidence
  }).governanceState,
  "SIGNED_REQUEST_EVIDENCE_INVALID"
);

const verified = assessBuild407Governance({
  build406: build406Verified,
  servicePrincipals,
  keyRotations,
  transportPolicies,
  signedRequestEvidence
});
assert.equal(verified.governanceState, "ZERO_TRUST_SERVICE_TRANSPORT_ENFORCED");
assert.equal(verified.directAppsReachAllMasters, true);
assert.equal(verified.counts.directionalTransportPolicies, 28);
assert.equal(verified.counts.directApplicationMasterRoutes, 6);
assert.deepEqual(verified.policy.approvedBranches, ["dev", "main"]);
assert.equal(verified.policy.masterThemeId, "rosevear-master-instrument.v1");
assert.equal(verified.policy.slaveShellLabel, "SLAVE APPLICATION SHELL");
assert.equal(verified.policy.postgresSslMode, "verify-full");
assert.equal(verified.policy.rawSecretsMayCrossApplications, false);
assert.equal(verified.policy.t5MayTraverseOrdinaryTransport, false);

assert.equal(DATABASE_TLS_POLICY.sslmode, "verify-full");
assert.equal(
  new URL(
    enforceStrictPostgresTls("postgresql://u:p@db.example.com/app?sslmode=require")
  ).searchParams.get("sslmode"),
  "verify-full"
);
assert.equal(
  new URL(
    enforceStrictPostgresTls("postgres://u:p@db.example.com/app")
  ).searchParams.get("sslmode"),
  "verify-full"
);
assert.throws(
  () =>
    enforceStrictPostgresTls(
      "postgresql://u:p@db.example.com/app?sslmode=disable"
    ),
  /database_sslmode_not_verify_full/
);

const manifest = JSON.parse(
  source("../../.github/rosevear-zero-trust-service-transport.v1.json")
);
assert.deepEqual(manifest.approvedBranches, ["dev", "main"]);
assert.equal(manifest.masterTheme.id, "rosevear-master-instrument.v1");
assert.equal(manifest.shellPresentation.requiredLabel, "SLAVE APPLICATION SHELL");
assert.deepEqual(
  manifest.communications.directAppsMustReachAllMasters,
  ["devilndove", "rosiedazzlers"]
);
assert.equal(manifest.transport.postgresSslMode, "verify-full");
assert.equal(manifest.transport.rawSecretsAllowed, false);

const migration = source(
  "../../db/migrations/0170_master_zero_trust_service_transport.sql"
);
for (const token of [
  "master_build407_service_principals",
  "master_build407_key_rotation_receipts",
  "master_build407_transport_policies",
  "master_build407_signed_request_evidence",
  "algorithm='Ed25519'",
  "certificate_validation='verify-full'",
  "raw_secrets_allowed=false",
  "t5_allowed=false",
  "force row level security",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const migrate = source("scripts/migrate.ts");
assert.ok(migrate.includes("enforceStrictPostgresTls"));
assert.ok(migrate.includes("strictDatabaseUrl"));

const database = source("lib/database.ts");
assert.ok(database.includes('import { enforceStrictPostgresTls } from "./database-ssl-policy";'));
assert.ok(database.includes("return enforceStrictPostgresTls(databaseUrl);"));

const docs = source("../../docs/BUILD_407_ZERO_TRUST_SERVICE_TRANSPORT.md");
for (const token of [
  "Only `dev` and `main`",
  "rosevear-master-instrument.v1",
  "Slave Application Shells",
  "Devil n Dove and Rosie Dazzlers",
  "sslmode=verify-full",
  "ZERO_TRUST_SERVICE_TRANSPORT_ENFORCED"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
for (const token of [
  "Build 407 zero-trust transport",
  "Ed25519 service identity",
  "28 directional transport policies",
  "Devil n Dove + Rosie → all three Masters",
  "SLAVE APPLICATION SHELL",
  "dev / main only"
]) assert.ok(masterPage.includes(token), "Master Suite token " + token);

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build407_service_principals"',
  '"master_build407_key_rotation_receipts"',
  '"master_build407_transport_policies"',
  '"master_build407_signed_request_evidence"',
  '"0170_master_zero_trust_service_transport.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-407-zero-trust-service-transport.ts";
assert.equal(String(pkg.scripts["verify:build407"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 407 Zero-Trust Service-to-Service Authentication, Key Rotation, Secretless Routing & Transport Policy Enforcement verification passed."
);
