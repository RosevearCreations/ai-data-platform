import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  sign as cryptoSign,
  verify as cryptoVerify
} from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  HOST_SESSION_ASSERTION_SCHEMA,
  HOST_SESSION_BRIDGE_SCHEMA,
  HOST_SESSION_BRIDGE_VERSION,
  HostSessionBridgeError,
  HostSessionContextBridge,
  bindAuthenticatedHostSessionToContext,
  hostSessionAssertionSigningInput,
  type HostSessionAssertionClaims,
  type HostSessionAssertionEnvelope,
  type HostSessionAuditEvent,
  type HostSubjectMappingResult
} from "../lib/host-session-context-bridge";
import { createModuleHostContext } from "../lib/module-host-adapter-pack";
import { AI_DATA_MODULE_ID } from "../lib/universal-module-contract";

const root = path.resolve(process.cwd());
const fixedNow = "2026-11-07T04:00:00.000Z";

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

const { privateKey, publicKey } = generateKeyPairSync("ed25519");

const baseClaims: HostSessionAssertionClaims = {
  issuer: "rosevear.icamp.auth",
  audience: AI_DATA_MODULE_ID,
  assertionId: "assertion_build310_001",
  hostApplicationId: "rosevear.icamp",
  hostEnvironment: "test",
  hostInstanceId: "host_build310_001",
  hostSubjectId: "host_subject_001",
  sessionId: "session_build310_001",
  issuedAt: "2026-11-07T03:55:00.000Z",
  expiresAt: "2026-11-07T04:25:00.000Z",
  auditCorrelationId: "audit_build310_001"
};

function signedAssertion(
  claims: HostSessionAssertionClaims = baseClaims
): HostSessionAssertionEnvelope {
  const unsigned = {
    schema: HOST_SESSION_ASSERTION_SCHEMA,
    algorithm: "Ed25519" as const,
    keyId: "key_build310_001",
    claims
  };
  const signature = cryptoSign(
    null,
    Buffer.from(hostSessionAssertionSigningInput(unsigned), "utf8"),
    privateKey
  ).toString("base64url");

  return {
    ...unsigned,
    signature
  };
}

function bridgeFixture(input?: {
  now?: string;
  mapping?: HostSubjectMappingResult | null;
}) {
  const consumed = new Set<string>();
  const audits: HostSessionAuditEvent[] = [];
  const mapping =
    input && "mapping" in input
      ? input.mapping ?? null
      : {
          moduleSubjectId: "module_subject_001",
          status: "active" as const
        };

  const bridge = new HostSessionContextBridge({
    signatureVerifier: {
      verify({ algorithm, keyId, signingInput, signature }) {
        if (algorithm !== "Ed25519" || keyId !== "key_build310_001") {
          return false;
        }
        return cryptoVerify(
          null,
          Buffer.from(signingInput, "utf8"),
          publicKey,
          Buffer.from(signature, "base64url")
        );
      }
    },
    subjectMapper: {
      mapSubject() {
        return mapping;
      }
    },
    replayGuard: {
      consume({ issuer, assertionId }) {
        const key = issuer + ":" + assertionId;
        if (consumed.has(key)) return false;
        consumed.add(key);
        return true;
      }
    },
    auditSink: {
      record(event) {
        audits.push(event);
      }
    },
    now: () => input?.now ?? fixedNow
  });

  return { bridge, audits };
}

const expected = {
  hostApplicationId: "rosevear.icamp",
  hostEnvironment: "test" as const,
  hostInstanceId: "host_build310_001",
  expectedHostSubjectId: "host_subject_001",
  expectedModuleSubjectId: "module_subject_001"
};

async function main() {
  assert.equal(
    HOST_SESSION_BRIDGE_SCHEMA,
    "rosevear.ai-data-platform.host-session-bridge.v1"
  );
  assert.equal(HOST_SESSION_BRIDGE_VERSION, "1.0.0");

  const valid = signedAssertion();
  const acceptedFixture = bridgeFixture();
  const accepted = await acceptedFixture.bridge.validate({
    assertion: valid,
    expected
  });

  assert.equal(accepted.status, "accepted");
  assert.ok(accepted.context);
  assert.equal(accepted.context.signatureValidated, true);
  assert.equal(accepted.context.subjectMapped, true);
  assert.equal(accepted.context.moduleSubjectId, "module_subject_001");
  assert.equal(accepted.context.authorizationGranted, false);
  assert.equal(accepted.reauthentication, null);
  assert.equal(acceptedFixture.audits.at(-1)?.status, "accepted");
  assert.equal(acceptedFixture.audits.at(-1)?.reason, "accepted");

  const hostContext = createModuleHostContext({
    hostApplicationId: "rosevear.icamp",
    environment: "test",
    hostInstanceId: "host_build310_001",
    subjectId: "placeholder_subject_001",
    tenantId: "tenant_build310_001",
    workspaceId: "workspace_build310_001",
    auditCorrelationId: "audit_build310_001",
    requestedCapabilities: ["manifest.read"]
  });

  const bound = bindAuthenticatedHostSessionToContext(
    hostContext,
    accepted.context
  );
  assert.equal(bound.subject.id, "module_subject_001");
  assert.deepEqual(bound.tenancy, hostContext.tenancy);
  assert.deepEqual(bound.requestedCapabilities, hostContext.requestedCapabilities);

  await assert.rejects(
    () =>
      acceptedFixture.bridge.validate({
        assertion: valid,
        expected
      }),
    (error: unknown) =>
      error instanceof HostSessionBridgeError &&
      error.code === "assertion_replayed"
  );
  assert.equal(acceptedFixture.audits.at(-1)?.reason, "assertion_replayed");

  const tampered = {
    ...valid,
    claims: {
      ...valid.claims,
      hostSubjectId: "host_subject_tampered"
    }
  };
  const tamperFixture = bridgeFixture();
  await assert.rejects(
    () =>
      tamperFixture.bridge.validate({
        assertion: tampered,
        expected
      }),
    (error: unknown) =>
      error instanceof HostSessionBridgeError &&
      error.code === "signature_invalid"
  );
  assert.equal(tamperFixture.audits.at(-1)?.reason, "signature_invalid");

  const wrongAudienceClaims: HostSessionAssertionClaims = {
    ...baseClaims,
    assertionId: "assertion_build310_audience",
    audience: "wrong.module" as typeof AI_DATA_MODULE_ID
  };
  const audienceFixture = bridgeFixture();
  await assert.rejects(
    () =>
      audienceFixture.bridge.validate({
        assertion: signedAssertion(wrongAudienceClaims),
        expected
      }),
    (error: unknown) =>
      error instanceof HostSessionBridgeError &&
      error.code === "audience_mismatch"
  );
  assert.equal(audienceFixture.audits.at(-1)?.reason, "audience_mismatch");

  const hostMismatchFixture = bridgeFixture();
  await assert.rejects(
    () =>
      hostMismatchFixture.bridge.validate({
        assertion: signedAssertion({
          ...baseClaims,
          assertionId: "assertion_build310_host_mismatch"
        }),
        expected: {
          ...expected,
          hostApplicationId: "rosevear.other"
        }
      }),
    (error: unknown) =>
      error instanceof HostSessionBridgeError &&
      error.code === "host_identity_mismatch"
  );

  const hostSubjectMismatchFixture = bridgeFixture();
  await assert.rejects(
    () =>
      hostSubjectMismatchFixture.bridge.validate({
        assertion: signedAssertion({
          ...baseClaims,
          assertionId: "assertion_build310_subject_mismatch"
        }),
        expected: {
          ...expected,
          expectedHostSubjectId: "host_subject_other"
        }
      }),
    (error: unknown) =>
      error instanceof HostSessionBridgeError &&
      error.code === "subject_identity_mismatch"
  );

  const missingMappingFixture = bridgeFixture({ mapping: null });
  await assert.rejects(
    () =>
      missingMappingFixture.bridge.validate({
        assertion: signedAssertion({
          ...baseClaims,
          assertionId: "assertion_build310_mapping_missing"
        }),
        expected: {
          ...expected,
          expectedModuleSubjectId: undefined
        }
      }),
    (error: unknown) =>
      error instanceof HostSessionBridgeError &&
      error.code === "subject_mapping_missing"
  );

  const disabledMappingFixture = bridgeFixture({
    mapping: {
      moduleSubjectId: "module_subject_disabled",
      status: "disabled"
    }
  });
  await assert.rejects(
    () =>
      disabledMappingFixture.bridge.validate({
        assertion: signedAssertion({
          ...baseClaims,
          assertionId: "assertion_build310_mapping_disabled"
        }),
        expected: {
          ...expected,
          expectedModuleSubjectId: undefined
        }
      }),
    (error: unknown) =>
      error instanceof HostSessionBridgeError &&
      error.code === "subject_mapping_disabled"
  );

  const moduleMismatchFixture = bridgeFixture({
    mapping: {
      moduleSubjectId: "module_subject_other",
      status: "active"
    }
  });
  await assert.rejects(
    () =>
      moduleMismatchFixture.bridge.validate({
        assertion: signedAssertion({
          ...baseClaims,
          assertionId: "assertion_build310_module_mismatch"
        }),
        expected
      }),
    (error: unknown) =>
      error instanceof HostSessionBridgeError &&
      error.code === "subject_identity_mismatch"
  );

  const expiredFixture = bridgeFixture();
  const expired = await expiredFixture.bridge.validate({
    assertion: signedAssertion({
      ...baseClaims,
      assertionId: "assertion_build310_expired",
      issuedAt: "2026-11-07T02:00:00.000Z",
      expiresAt: "2026-11-07T03:00:00.000Z"
    }),
    expected
  });
  assert.equal(expired.status, "reauthentication_required");
  assert.equal(expired.context, null);
  assert.equal(expired.reauthentication.reason, "session_expired");
  assert.equal(expired.reauthentication.carriesCredential, false);
  assert.equal(expired.reauthentication.grantsAuthorization, false);
  assert.equal(
    expired.reauthentication.instruction,
    "reauthenticate-with-host-then-submit-a-new-signed-session-assertion"
  );
  assert.equal(expiredFixture.audits.at(-1)?.reason, "session_expired");

  const futureFixture = bridgeFixture();
  const future = await futureFixture.bridge.validate({
    assertion: signedAssertion({
      ...baseClaims,
      assertionId: "assertion_build310_future",
      issuedAt: "2026-11-07T04:05:00.000Z",
      expiresAt: "2026-11-07T05:00:00.000Z"
    }),
    expected
  });
  assert.equal(future.status, "reauthentication_required");
  assert.equal(future.reauthentication.reason, "session_not_yet_valid");

  const lifetimeFixture = bridgeFixture();
  await assert.rejects(
    () =>
      lifetimeFixture.bridge.validate({
        assertion: signedAssertion({
          ...baseClaims,
          assertionId: "assertion_build310_lifetime",
          issuedAt: "2026-11-07T03:00:00.000Z",
          expiresAt: "2026-11-07T12:00:01.000Z"
        }),
        expected
      }),
    (error: unknown) =>
      error instanceof HostSessionBridgeError &&
      error.code === "session_lifetime_invalid"
  );

  const malformedFixture = bridgeFixture();
  const malformed = {
    ...signedAssertion({
      ...baseClaims,
      assertionId: "assertion_build310_malformed"
    }),
    claims: {
      ...baseClaims,
      assertionId: "assertion_build310_malformed",
      token: "raw-secret-must-not-enter-claims"
    }
  };
  await assert.rejects(
    () =>
      malformedFixture.bridge.validate({
        assertion: malformed,
        expected
      }),
    (error: unknown) =>
      error instanceof HostSessionBridgeError &&
      error.code === "malformed_assertion"
  );

  const auditText = JSON.stringify([
    ...acceptedFixture.audits,
    ...tamperFixture.audits,
    ...audienceFixture.audits,
    ...expiredFixture.audits
  ]);
  assert.ok(!auditText.includes(valid.signature));
  assert.ok(!auditText.includes("raw-secret-must-not-enter-claims"));
  assert.ok(!auditText.includes("password"));
  assert.ok(!auditText.includes("cookie"));

  const [
    bridgeSource,
    apiSource,
    manifestSource,
    docs,
    review,
    roadmap,
    webPackage
  ] = await Promise.all([
    source("lib/host-session-context-bridge.ts"),
    source("app/api/module-auth-bridge/route.ts"),
    source("lib/universal-module-contract.ts"),
    source("../../docs/BUILD_310_AUTH_USER_CONTEXT_BRIDGE.md"),
    source(
      "../../docs/integration/ql266-ai-data-platform-build310-review.json"
    ),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "HostSessionAssertionSignatureVerifier",
    "HostSessionAssertionReplayGuard",
    "HostSubjectMapper",
    "signature_invalid",
    "assertion_replayed",
    "session_expired",
    "subject_identity_mismatch",
    "authorizationGranted: false"
  ]) {
    assert.ok(bridgeSource.includes(token), "Build 310 bridge missing " + token);
  }

  for (const token of [
    "auth-context-bridge-config.v1",
    "detachedSignatureRequired: true",
    "privateKeysAcceptedByBrowser: false",
    "rawHostTokensAccepted: false",
    "replayGuardRequired: true",
    "hostSessionGrantsAuthorization: false",
    "ql266ResumedByAuthBridge: false"
  ]) {
    assert.ok(apiSource.includes(token), "Build 310 API missing " + token);
  }

  for (const token of [
    '"signed-host-session-assertions-v1"',
    '"authenticated-user-context-bridge-v1"',
    '"host-reauthentication-handoff-v1"',
    "hostSessionSignatureRequired: true",
    "hostSessionReplayGuardRequired: true",
    "hostSessionGrantsPlatformAuthority: false",
    "rawHostCredentialsAccepted: false",
    "tenantAccessInferredFromHostSession: false"
  ]) {
    assert.ok(
      manifestSource.includes(token),
      "Build 310 manifest missing " + token
    );
  }

  for (const token of [
    "Build 310",
    "Ed25519",
    "ES256",
    "Replay protection",
    "reauthentication",
    "does **not** grant AI Data Platform authorization",
    "Build 311"
  ]) {
    assert.ok(docs.includes(token), "Build 310 docs missing " + token);
  }

  for (const token of [
    '"build": 310',
    '"connectionState": "DISCONNECTED / HOLD"',
    '"ql266Resumed": false',
    '"ephemeralEd25519Verification": true',
    '"hostSessionGrantsAuthorization": false'
  ]) {
    assert.ok(review.includes(token), "Build 310 review missing " + token);
  }

  assert.ok(
    roadmap.includes("Build 310 — Authentication & User Context Bridge")
  );
  assert.ok(
    roadmap.includes(
      "Build 311 — Tenant, Workspace & Organization Context Resolution"
    )
  );
  assert.ok(
    webPackage.includes("verify-build-310-auth-user-context-bridge.ts")
  );

  console.log(
    "Build 310 verification passed: real Ed25519 signed host-session assertions are validated with host/audience/subject binding, replay protection, expiry/reauthentication and audit evidence without forwarding raw passwords, cookies or secret tokens; valid host authentication still grants no module authorization and does not resume QL-266."
  );
}

void main();
