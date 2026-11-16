import {
  BUILD_405_APPLICATION_IDS
} from "./master-assurance-renewal-security-comms-recertification";
import {
  BUILD_407_DIRECTIONAL_RELATIONSHIPS
} from "./master-zero-trust-service-transport";
import type { Build402ApplicationId } from "./master-forecast-recalibration-renewal-timing-linkage-continuity";
import type { Build408GovernanceAssessment } from "./master-fine-grained-authorization-consent-independent-sync";

export const BUILD_409 = 409 as const;
export const BUILD_409_SCHEMA =
  "rosevear.ai-data-platform.cross-application-event-message-v2-durable-replay.v1" as const;
export const BUILD_409_EVENT_CONTRACT_VERSION = 2 as const;
export const BUILD_409_SUPPORTED_EVENT_VERSIONS = [1, 2] as const;
export const BUILD_409_MAX_DELIVERY_ATTEMPTS = 8 as const;
export const BUILD_409_MAX_REPLAY_AGE_HOURS = 168 as const;

export type Build409EventContract = {
  contractId: string;
  sourceAppId: Build402ApplicationId;
  targetAppId: Build402ApplicationId;
  preferredEventVersion: number;
  supportedEventVersions: number[];
  emitHighestMutuallySupportedVersion: boolean;
  correlationIdRequired: boolean;
  causationIdRequiredForDerivedEvents: boolean;
  rootEventMayHaveNullCausation: boolean;
  traceIdRequired: boolean;
  idempotencyKeyRequired: boolean;
  schemaRefRequired: boolean;
  payloadDigestSha256Required: boolean;
  capabilityNamespaceRequired: boolean;
  rawSecretsAllowed: boolean;
  rawPersonalDataInAuditEvidence: boolean;
  messageMayCreateConsent: boolean;
  messageMayGrantCapability: boolean;
  messageMayTransferAuthority: boolean;
  messageMayManufactureConnectedState: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "CERTIFIED" | "HOLD" | "REVOKED";
  observedAt: string;
};

export type Build409DurableDeliveryPolicy = {
  policyId: string;
  sourceAppId: Build402ApplicationId;
  targetAppId: Build402ApplicationId;
  deliverySemantics: "at-least-once";
  acknowledgementRequired: boolean;
  idempotencyRequired: boolean;
  duplicateSuppressionRequired: boolean;
  maxDeliveryAttempts: number;
  exponentialBackoffRequired: boolean;
  deadLetterAfterExhaustion: boolean;
  duplicateMayReapplySideEffect: boolean;
  acknowledgementMayGrantAuthority: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "ENFORCED" | "HOLD" | "FAILED";
  observedAt: string;
};

export type Build409CorrelationContinuityEvidence = {
  evidenceId: string;
  sourceAppId: Build402ApplicationId;
  targetAppId: Build402ApplicationId;
  correlationIdPreserved: boolean;
  causationChainValid: boolean;
  traceIdPreserved: boolean;
  tenantScopePreserved: boolean;
  workspaceScopePreserved: boolean;
  capabilityScopePreserved: boolean;
  consentScopePreserved: boolean;
  authorityContextPreserved: boolean;
  sourceIdentityPreserved: boolean;
  state: "VERIFIED" | "HOLD" | "FAILED";
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  observedAt: string;
};

export type Build409DeadLetterReplayPolicy = {
  policyId: string;
  sourceAppId: Build402ApplicationId;
  targetAppId: Build402ApplicationId;
  deadLetterRequired: boolean;
  replayRequiresOriginalEnvelopeDigest: boolean;
  replayCreatesNewAttemptId: boolean;
  replayPreservesOriginalEventId: boolean;
  replayPreservesCorrelationAndCausation: boolean;
  replayMaxAgeHours: number;
  replayAfterCapabilityRevocation: boolean;
  replayAfterConsentWithdrawal: boolean;
  consequentialReplayRequiresOwnerGate: boolean;
  replayMayExpandAuthority: boolean;
  replayMayChangeTenantOrWorkspace: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "ENFORCED" | "HOLD" | "FAILED";
  observedAt: string;
};

export type Build409MessageCompatibilityContract = {
  contractId: string;
  appId: Build402ApplicationId;
  synchronizationProtocol: "1.1";
  preferredEventVersion: 2;
  supportedEventVersions: number[];
  peerVersionNegotiationRequired: boolean;
  v1FallbackRequired: boolean;
  lockstepReleaseRequired: boolean;
  unavailablePeerBlocksOnlyDependentDelivery: boolean;
  unrelatedLocalOperationsContinue: boolean;
  vercelQuotaOnOneApplicationDoesNotBlockUnrelatedPeerRelease: boolean;
  ownerReviewed: boolean;
  independentlyVerified: boolean;
  state: "COMPATIBLE" | "HOLD" | "INCOMPATIBLE";
  observedAt: string;
};

function key(...parts: string[]) {
  return parts.join("::");
}

function latestByKey<T>(items: readonly T[], getKey: (item: T) => string) {
  const map = new Map<string, T>();
  for (const item of items) map.set(getKey(item), item);
  return map;
}

export function assessBuild409Governance(input: {
  build408: Build408GovernanceAssessment;
  eventContracts?: readonly Build409EventContract[];
  deliveryPolicies?: readonly Build409DurableDeliveryPolicy[];
  correlationEvidence?: readonly Build409CorrelationContinuityEvidence[];
  replayPolicies?: readonly Build409DeadLetterReplayPolicy[];
  compatibilityContracts?: readonly Build409MessageCompatibilityContract[];
}) {
  const build408Eligible =
    input.build408.governanceState ===
    "FINE_GRAINED_AUTHORIZATION_CONSENT_AND_INDEPENDENT_SYNC_RECERTIFIED";

  const relationshipKeys = BUILD_407_DIRECTIONAL_RELATIONSHIPS.map(
    ([source, target]) => key(source, target)
  );

  const events = latestByKey(
    input.eventContracts ?? [],
    (item) => key(item.sourceAppId, item.targetAppId)
  );
  const missingEventContracts = relationshipKeys.filter((item) => !events.has(item));
  const invalidEventContracts = [...events.values()].filter(
    (item) =>
      !(
        item.sourceAppId !== item.targetAppId &&
        item.preferredEventVersion === BUILD_409_EVENT_CONTRACT_VERSION &&
        item.supportedEventVersions.includes(1) &&
        item.supportedEventVersions.includes(BUILD_409_EVENT_CONTRACT_VERSION) &&
        item.emitHighestMutuallySupportedVersion &&
        item.correlationIdRequired &&
        item.causationIdRequiredForDerivedEvents &&
        item.rootEventMayHaveNullCausation &&
        item.traceIdRequired &&
        item.idempotencyKeyRequired &&
        item.schemaRefRequired &&
        item.payloadDigestSha256Required &&
        item.capabilityNamespaceRequired &&
        item.rawSecretsAllowed === false &&
        item.rawPersonalDataInAuditEvidence === false &&
        item.messageMayCreateConsent === false &&
        item.messageMayGrantCapability === false &&
        item.messageMayTransferAuthority === false &&
        item.messageMayManufactureConnectedState === false &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "CERTIFIED"
      )
  );

  const delivery = latestByKey(
    input.deliveryPolicies ?? [],
    (item) => key(item.sourceAppId, item.targetAppId)
  );
  const missingDeliveryPolicies = relationshipKeys.filter((item) => !delivery.has(item));
  const invalidDeliveryPolicies = [...delivery.values()].filter(
    (item) =>
      !(
        item.deliverySemantics === "at-least-once" &&
        item.acknowledgementRequired &&
        item.idempotencyRequired &&
        item.duplicateSuppressionRequired &&
        Number.isInteger(item.maxDeliveryAttempts) &&
        item.maxDeliveryAttempts >= 1 &&
        item.maxDeliveryAttempts <= BUILD_409_MAX_DELIVERY_ATTEMPTS &&
        item.exponentialBackoffRequired &&
        item.deadLetterAfterExhaustion &&
        item.duplicateMayReapplySideEffect === false &&
        item.acknowledgementMayGrantAuthority === false &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "ENFORCED"
      )
  );

  const correlation = latestByKey(
    input.correlationEvidence ?? [],
    (item) => key(item.sourceAppId, item.targetAppId)
  );
  const missingCorrelationEvidence = relationshipKeys.filter(
    (item) => !correlation.has(item)
  );
  const invalidCorrelationEvidence = [...correlation.values()].filter(
    (item) =>
      !(
        item.correlationIdPreserved &&
        item.causationChainValid &&
        item.traceIdPreserved &&
        item.tenantScopePreserved &&
        item.workspaceScopePreserved &&
        item.capabilityScopePreserved &&
        item.consentScopePreserved &&
        item.authorityContextPreserved &&
        item.sourceIdentityPreserved &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "VERIFIED"
      )
  );

  const replay = latestByKey(
    input.replayPolicies ?? [],
    (item) => key(item.sourceAppId, item.targetAppId)
  );
  const missingReplayPolicies = relationshipKeys.filter((item) => !replay.has(item));
  const invalidReplayPolicies = [...replay.values()].filter(
    (item) =>
      !(
        item.deadLetterRequired &&
        item.replayRequiresOriginalEnvelopeDigest &&
        item.replayCreatesNewAttemptId &&
        item.replayPreservesOriginalEventId &&
        item.replayPreservesCorrelationAndCausation &&
        Number.isInteger(item.replayMaxAgeHours) &&
        item.replayMaxAgeHours >= 1 &&
        item.replayMaxAgeHours <= BUILD_409_MAX_REPLAY_AGE_HOURS &&
        item.replayAfterCapabilityRevocation === false &&
        item.replayAfterConsentWithdrawal === false &&
        item.consequentialReplayRequiresOwnerGate &&
        item.replayMayExpandAuthority === false &&
        item.replayMayChangeTenantOrWorkspace === false &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "ENFORCED"
      )
  );

  const compatibility = latestByKey(
    input.compatibilityContracts ?? [],
    (item) => item.appId
  );
  const missingCompatibilityContracts = BUILD_405_APPLICATION_IDS.filter(
    (appId) => !compatibility.has(appId)
  );
  const invalidCompatibilityContracts = [...compatibility.values()].filter(
    (item) =>
      !(
        item.synchronizationProtocol === "1.1" &&
        item.preferredEventVersion === 2 &&
        item.supportedEventVersions.includes(1) &&
        item.supportedEventVersions.includes(2) &&
        item.peerVersionNegotiationRequired &&
        item.v1FallbackRequired &&
        item.lockstepReleaseRequired === false &&
        item.unavailablePeerBlocksOnlyDependentDelivery &&
        item.unrelatedLocalOperationsContinue &&
        item.vercelQuotaOnOneApplicationDoesNotBlockUnrelatedPeerRelease &&
        item.ownerReviewed &&
        item.independentlyVerified &&
        item.state === "COMPATIBLE"
      )
  );

  const governanceState =
    !build408Eligible
      ? ("HOLD_BUILD408_NOT_RECERTIFIED" as const)
      : missingEventContracts.length
        ? ("EVENT_CONTRACT_REQUIRED" as const)
        : invalidEventContracts.length
          ? ("EVENT_CONTRACT_INVALID" as const)
          : missingDeliveryPolicies.length
            ? ("DURABLE_DELIVERY_POLICY_REQUIRED" as const)
            : invalidDeliveryPolicies.length
              ? ("DURABLE_DELIVERY_POLICY_INVALID" as const)
              : missingCorrelationEvidence.length
                ? ("CORRELATION_CONTINUITY_REQUIRED" as const)
                : invalidCorrelationEvidence.length
                  ? ("CORRELATION_CONTINUITY_INVALID" as const)
                  : missingReplayPolicies.length
                    ? ("DEAD_LETTER_REPLAY_POLICY_REQUIRED" as const)
                    : invalidReplayPolicies.length
                      ? ("DEAD_LETTER_REPLAY_POLICY_INVALID" as const)
                      : missingCompatibilityContracts.length
                        ? ("MESSAGE_COMPATIBILITY_CONTRACT_REQUIRED" as const)
                        : invalidCompatibilityContracts.length
                          ? ("MESSAGE_COMPATIBILITY_CONTRACT_INVALID" as const)
                          : ("EVENT_MESSAGE_V2_DURABLE_DELIVERY_AND_REPLAY_GOVERNANCE_VERIFIED" as const);

  return {
    schema: BUILD_409_SCHEMA,
    build: BUILD_409,
    build408Eligible,
    governanceState,
    missingEventContracts,
    invalidEventContracts,
    missingDeliveryPolicies,
    invalidDeliveryPolicies,
    missingCorrelationEvidence,
    invalidCorrelationEvidence,
    missingReplayPolicies,
    invalidReplayPolicies,
    missingCompatibilityContracts,
    invalidCompatibilityContracts,
    counts: {
      applications: BUILD_405_APPLICATION_IDS.length,
      directionalRelationships: relationshipKeys.length,
      eventContracts: relationshipKeys.length,
      durableDeliveryPolicies: relationshipKeys.length,
      correlationContinuityEvidence: relationshipKeys.length,
      deadLetterReplayPolicies: relationshipKeys.length,
      compatibilityContracts: BUILD_405_APPLICATION_IDS.length
    },
    policy: {
      synchronizationProtocol: "1.1",
      preferredEventVersion: BUILD_409_EVENT_CONTRACT_VERSION,
      v1FallbackRequired: true,
      emitHighestMutuallySupportedVersion: true,
      lockstepReleaseRequired: false,
      unavailablePeerBlocksOnlyDependentDelivery: true,
      unrelatedLocalOperationsContinue: true,
      rawSecretsAllowed: false,
      messageMayCreateConsent: false,
      messageMayGrantCapability: false,
      messageMayTransferAuthority: false,
      messageMayManufactureConnectedState: false,
      consequentialReplayRequiresOwnerGate: true,
      productionGreenImpliesPeerRuntimeConnected: false
    }
  };
}

export type Build409GovernanceAssessment = ReturnType<
  typeof assessBuild409Governance
>;
