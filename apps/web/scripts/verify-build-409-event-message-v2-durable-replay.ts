import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";

import {
  BUILD_405_APPLICATION_IDS
} from "../lib/master-assurance-renewal-security-comms-recertification";
import {
  BUILD_407_DIRECTIONAL_RELATIONSHIPS
} from "../lib/master-zero-trust-service-transport";
import {
  BUILD_409,
  BUILD_409_EVENT_CONTRACT_VERSION,
  BUILD_409_MAX_DELIVERY_ATTEMPTS,
  BUILD_409_MAX_REPLAY_AGE_HOURS,
  assessBuild409Governance,
  type Build409CorrelationContinuityEvidence,
  type Build409DeadLetterReplayPolicy,
  type Build409DurableDeliveryPolicy,
  type Build409EventContract,
  type Build409MessageCompatibilityContract
} from "../lib/master-event-message-v2-durable-replay";
import type { Build408GovernanceAssessment } from "../lib/master-fine-grained-authorization-consent-independent-sync";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  readFileSync(path.resolve(root, relative), "utf8");

assert.equal(BUILD_409, 409);
assert.equal(BUILD_405_APPLICATION_IDS.length, 7);
assert.equal(BUILD_407_DIRECTIONAL_RELATIONSHIPS.length, 28);
assert.equal(BUILD_409_EVENT_CONTRACT_VERSION, 2);
assert.equal(BUILD_409_MAX_DELIVERY_ATTEMPTS, 8);
assert.equal(BUILD_409_MAX_REPLAY_AGE_HOURS, 168);

const observedAt = "2026-11-16T08:30:00.000Z";
const build408Verified = {
  governanceState:
    "FINE_GRAINED_AUTHORIZATION_CONSENT_AND_INDEPENDENT_SYNC_RECERTIFIED"
} as unknown as Build408GovernanceAssessment;

const eventContracts: Build409EventContract[] =
  BUILD_407_DIRECTIONAL_RELATIONSHIPS.map(([sourceAppId, targetAppId]) => ({
    contractId: "event-" + sourceAppId + "-" + targetAppId,
    sourceAppId,
    targetAppId,
    preferredEventVersion: 2,
    supportedEventVersions: [1, 2],
    emitHighestMutuallySupportedVersion: true,
    correlationIdRequired: true,
    causationIdRequiredForDerivedEvents: true,
    rootEventMayHaveNullCausation: true,
    traceIdRequired: true,
    idempotencyKeyRequired: true,
    schemaRefRequired: true,
    payloadDigestSha256Required: true,
    capabilityNamespaceRequired: true,
    rawSecretsAllowed: false,
    rawPersonalDataInAuditEvidence: false,
    messageMayCreateConsent: false,
    messageMayGrantCapability: false,
    messageMayTransferAuthority: false,
    messageMayManufactureConnectedState: false,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "CERTIFIED",
    observedAt
  }));

const deliveryPolicies: Build409DurableDeliveryPolicy[] =
  BUILD_407_DIRECTIONAL_RELATIONSHIPS.map(([sourceAppId, targetAppId]) => ({
    policyId: "delivery-" + sourceAppId + "-" + targetAppId,
    sourceAppId,
    targetAppId,
    deliverySemantics: "at-least-once",
    acknowledgementRequired: true,
    idempotencyRequired: true,
    duplicateSuppressionRequired: true,
    maxDeliveryAttempts: BUILD_409_MAX_DELIVERY_ATTEMPTS,
    exponentialBackoffRequired: true,
    deadLetterAfterExhaustion: true,
    duplicateMayReapplySideEffect: false,
    acknowledgementMayGrantAuthority: false,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "ENFORCED",
    observedAt
  }));

const correlationEvidence: Build409CorrelationContinuityEvidence[] =
  BUILD_407_DIRECTIONAL_RELATIONSHIPS.map(([sourceAppId, targetAppId]) => ({
    evidenceId: "correlation-" + sourceAppId + "-" + targetAppId,
    sourceAppId,
    targetAppId,
    correlationIdPreserved: true,
    causationChainValid: true,
    traceIdPreserved: true,
    tenantScopePreserved: true,
    workspaceScopePreserved: true,
    capabilityScopePreserved: true,
    consentScopePreserved: true,
    authorityContextPreserved: true,
    sourceIdentityPreserved: true,
    state: "VERIFIED",
    ownerReviewed: true,
    independentlyVerified: true,
    observedAt
  }));

const replayPolicies: Build409DeadLetterReplayPolicy[] =
  BUILD_407_DIRECTIONAL_RELATIONSHIPS.map(([sourceAppId, targetAppId]) => ({
    policyId: "replay-" + sourceAppId + "-" + targetAppId,
    sourceAppId,
    targetAppId,
    deadLetterRequired: true,
    replayRequiresOriginalEnvelopeDigest: true,
    replayCreatesNewAttemptId: true,
    replayPreservesOriginalEventId: true,
    replayPreservesCorrelationAndCausation: true,
    replayMaxAgeHours: BUILD_409_MAX_REPLAY_AGE_HOURS,
    replayAfterCapabilityRevocation: false,
    replayAfterConsentWithdrawal: false,
    consequentialReplayRequiresOwnerGate: true,
    replayMayExpandAuthority: false,
    replayMayChangeTenantOrWorkspace: false,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "ENFORCED",
    observedAt
  }));

const compatibilityContracts: Build409MessageCompatibilityContract[] =
  BUILD_405_APPLICATION_IDS.map((appId) => ({
    contractId: "message-compat-" + appId,
    appId,
    synchronizationProtocol: "1.1",
    preferredEventVersion: 2,
    supportedEventVersions: [1, 2],
    peerVersionNegotiationRequired: true,
    v1FallbackRequired: true,
    lockstepReleaseRequired: false,
    unavailablePeerBlocksOnlyDependentDelivery: true,
    unrelatedLocalOperationsContinue: true,
    vercelQuotaOnOneApplicationDoesNotBlockUnrelatedPeerRelease: true,
    ownerReviewed: true,
    independentlyVerified: true,
    state: "COMPATIBLE",
    observedAt
  }));

assert.equal(eventContracts.length, 28);
assert.equal(deliveryPolicies.length, 28);
assert.equal(correlationEvidence.length, 28);
assert.equal(replayPolicies.length, 28);
assert.equal(compatibilityContracts.length, 7);

assert.equal(
  assessBuild409Governance({
    build408: { governanceState: "HOLD" } as unknown as Build408GovernanceAssessment,
    eventContracts,
    deliveryPolicies,
    correlationEvidence,
    replayPolicies,
    compatibilityContracts
  }).governanceState,
  "HOLD_BUILD408_NOT_RECERTIFIED"
);

assert.equal(
  assessBuild409Governance({
    build408: build408Verified,
    eventContracts: eventContracts.slice(1),
    deliveryPolicies,
    correlationEvidence,
    replayPolicies,
    compatibilityContracts
  }).governanceState,
  "EVENT_CONTRACT_REQUIRED"
);

const badEvent = eventContracts.map((item, index) =>
  index === 0 ? { ...item, messageMayTransferAuthority: true } : item
);
assert.equal(
  assessBuild409Governance({
    build408: build408Verified,
    eventContracts: badEvent,
    deliveryPolicies,
    correlationEvidence,
    replayPolicies,
    compatibilityContracts
  }).governanceState,
  "EVENT_CONTRACT_INVALID"
);

const badDelivery = deliveryPolicies.map((item, index) =>
  index === 0 ? { ...item, duplicateMayReapplySideEffect: true } : item
);
assert.equal(
  assessBuild409Governance({
    build408: build408Verified,
    eventContracts,
    deliveryPolicies: badDelivery,
    correlationEvidence,
    replayPolicies,
    compatibilityContracts
  }).governanceState,
  "DURABLE_DELIVERY_POLICY_INVALID"
);

const badCorrelation = correlationEvidence.map((item, index) =>
  index === 0 ? { ...item, consentScopePreserved: false } : item
);
assert.equal(
  assessBuild409Governance({
    build408: build408Verified,
    eventContracts,
    deliveryPolicies,
    correlationEvidence: badCorrelation,
    replayPolicies,
    compatibilityContracts
  }).governanceState,
  "CORRELATION_CONTINUITY_INVALID"
);

const badReplay = replayPolicies.map((item, index) =>
  index === 0 ? { ...item, replayAfterConsentWithdrawal: true } : item
);
assert.equal(
  assessBuild409Governance({
    build408: build408Verified,
    eventContracts,
    deliveryPolicies,
    correlationEvidence,
    replayPolicies: badReplay,
    compatibilityContracts
  }).governanceState,
  "DEAD_LETTER_REPLAY_POLICY_INVALID"
);

const badCompatibility = compatibilityContracts.map((item, index) =>
  index === 0 ? { ...item, lockstepReleaseRequired: true } : item
);
assert.equal(
  assessBuild409Governance({
    build408: build408Verified,
    eventContracts,
    deliveryPolicies,
    correlationEvidence,
    replayPolicies,
    compatibilityContracts: badCompatibility
  }).governanceState,
  "MESSAGE_COMPATIBILITY_CONTRACT_INVALID"
);

const verified = assessBuild409Governance({
  build408: build408Verified,
  eventContracts,
  deliveryPolicies,
  correlationEvidence,
  replayPolicies,
  compatibilityContracts
});
assert.equal(
  verified.governanceState,
  "EVENT_MESSAGE_V2_DURABLE_DELIVERY_AND_REPLAY_GOVERNANCE_VERIFIED"
);
assert.equal(verified.counts.directionalRelationships, 28);
assert.equal(verified.counts.eventContracts, 28);
assert.equal(verified.counts.durableDeliveryPolicies, 28);
assert.equal(verified.counts.correlationContinuityEvidence, 28);
assert.equal(verified.counts.deadLetterReplayPolicies, 28);
assert.equal(verified.counts.compatibilityContracts, 7);
assert.equal(verified.policy.synchronizationProtocol, "1.1");
assert.equal(verified.policy.preferredEventVersion, 2);
assert.equal(verified.policy.v1FallbackRequired, true);
assert.equal(verified.policy.lockstepReleaseRequired, false);
assert.equal(verified.policy.messageMayTransferAuthority, false);
assert.equal(verified.policy.messageMayManufactureConnectedState, false);

const manifest = JSON.parse(
  source("../../.github/rosevear-event-message-v2-durable-replay.v1.json")
);
assert.equal(manifest.eventContract.preferredVersion, 2);
assert.deepEqual(manifest.eventContract.supportedVersions, [1, 2]);
assert.equal(manifest.eventContract.emitHighestMutuallySupportedVersion, true);
assert.equal(manifest.durableDelivery.maxDeliveryAttempts, 8);
assert.equal(manifest.deadLetterReplay.replayMaxAgeHours, 168);
assert.equal(manifest.independentRelease.lockstepReleaseRequired, false);
assert.equal(manifest.independentRelease.v1FallbackRequired, true);

const migration = source(
  "../../db/migrations/0172_master_event_message_v2_durable_replay.sql"
);
for (const token of [
  "master_build409_event_contracts",
  "master_build409_durable_delivery_policies",
  "master_build409_correlation_continuity_evidence",
  "master_build409_dead_letter_replay_policies",
  "master_build409_message_compatibility_contracts",
  "preferred_event_version=2",
  "max_delivery_attempts between 1 and 8",
  "replay_max_age_hours between 1 and 168",
  "message_may_transfer_authority=false",
  "force row level security",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source("../../docs/BUILD_409_EVENT_MESSAGE_V2_DURABLE_REPLAY.md");
for (const token of [
  "Event/message contract V2",
  "All 28 directional relationships use at-least-once delivery",
  "Duplicate delivery cannot repeat a side effect",
  "Replay is bounded to 168 hours",
  "Existing V1 peers remain supported",
  "EVENT_MESSAGE_V2_DURABLE_DELIVERY_AND_REPLAY_GOVERNANCE_VERIFIED"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
for (const token of [
  "Build 409 event/message V2",
  "28 V2/V1-negotiated routes",
  "Durable ACK + dedupe",
  "Correlation continuity",
  "DLQ + bounded replay"
]) assert.ok(masterPage.includes(token), "Master Suite token " + token);

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build409_event_contracts"',
  '"master_build409_durable_delivery_policies"',
  '"master_build409_correlation_continuity_evidence"',
  '"master_build409_dead_letter_replay_policies"',
  '"master_build409_message_compatibility_contracts"',
  '"0172_master_event_message_v2_durable_replay.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command = "tsx scripts/verify-build-409-event-message-v2-durable-replay.ts";
assert.equal(String(pkg.scripts["verify:build409"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 409 Cross-Application Event/Message Contract V2, Correlation Continuity, Durable Delivery & Replay Governance verification passed."
);
